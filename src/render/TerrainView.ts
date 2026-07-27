import * as THREE from 'three';
import { Rng } from '@/core/Rng';
import type { Biome, MapDef } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { ResourceNode } from '@/sim/entities/Entity';
import { FOG_BLACK } from '@/sim/systems/FogSystem';
import { box, cone, cylinder, group, mat, sphere } from './meshes/primitives';
import { biomeFogColor } from './Renderer';

interface BiomeGround {
  /** Dark→light gradient the color noise blends across. */
  low: number;
  base: number;
  high: number;
  /** Occasional accent patches (moss, sand ripples, scree). */
  accent: number;
  grassTuft: number;
  tuftCount: number;
  flower: number | null;
  pebble: number;
}

const BIOME_GROUND: Record<Biome, BiomeGround> = {
  grass: { low: 0x4c7030, base: 0x5f8a3d, high: 0x79a352, accent: 0x8fae4e, grassTuft: 0x6d9c44, tuftCount: 900, flower: 0xe8e06a, pebble: 0x8f9187 },
  desert: { low: 0xb08e50, base: 0xcaa963, high: 0xe0c184, accent: 0xd9b06a, grassTuft: 0xb3a05c, tuftCount: 300, flower: null, pebble: 0xa98f62 },
  savanna: { low: 0x8d7f3d, base: 0xa89a4e, high: 0xc2b364, accent: 0xb5975a, grassTuft: 0xa2924a, tuftCount: 700, flower: null, pebble: 0x9a8f74 },
  mountain: { low: 0x67705c, base: 0x7d8471, high: 0x99a08c, accent: 0x8b9382, grassTuft: 0x74895c, tuftCount: 350, flower: null, pebble: 0x8b8b85 },
};

/**
 * Procedural ground detail texture: fine grain + short blade strokes drawn to
 * a canvas, tiled across the map and multiplied under the vertex colors. Adds
 * the close-up texture the flat vertex-colored plane lacks.
 */
function makeGroundDetailTexture(seed: number, blades: boolean): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = new Rng(seed ^ 0x9e3779b9);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Broad soft mottling.
  for (let i = 0; i < 260; i++) {
    const r = 8 + rng.next() * 26;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    const dark = rng.chance(0.55);
    g.addColorStop(0, dark ? 'rgba(52,64,38,0.10)' : 'rgba(255,252,225,0.09)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.save();
    ctx.translate(rng.next() * size, rng.next() * size);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // Fine grain speckle.
  for (let i = 0; i < 5200; i++) {
    const v = rng.chance(0.5);
    ctx.fillStyle = v ? 'rgba(30,40,22,0.10)' : 'rgba(255,255,235,0.08)';
    ctx.fillRect(rng.next() * size, rng.next() * size, 1 + rng.next() * 1.6, 1 + rng.next() * 1.6);
  }
  // Short blade strokes (grass-like biomes only).
  if (blades) {
    ctx.lineWidth = 1;
    for (let i = 0; i < 2400; i++) {
      const x = rng.next() * size;
      const y = rng.next() * size;
      const len = 2 + rng.next() * 4;
      const lean = (rng.next() - 0.5) * 2.2;
      ctx.strokeStyle = rng.chance(0.5) ? 'rgba(38,54,26,0.14)' : 'rgba(214,232,160,0.12)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + lean, y - len);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Cheap deterministic 2D value noise (two octaves), used for ground tinting. */
/** How far past the map bounds the surrounding land extends, in world units. */
const SKIRT_MARGIN = 320;

/**
 * How far the fog-of-war plane overhangs the map to cover the near apron.
 * Kept well inside SKIRT_MARGIN so the flat fog plane never floats noticeably
 * above the apron as it falls away.
 */
export const SKIRT_OVERHANG = 90;

/**
 * The playable plane used to stop dead at the map bounds, so at max zoom-out you
 * saw the geometry end and the empty void beyond it. This apron continues the
 * land outward and slopes it gently away, reading as a raised tableland whose
 * surroundings fall off into the distance. Combined with `fogColor === horizon`
 * in `Renderer`, the far edge dissolves into the sky instead of terminating.
 *
 * Deliberately a low-resolution grid with no detail texture and no shadow
 * participation — it is scenery, never walked on, and costs a few hundred
 * triangles.
 */
function buildSkirt(
  w: number,
  h: number,
  palette: BiomeGround,
  noise: (x: number, y: number) => number,
  hazeColor: number,
): THREE.Mesh {
  const outerW = w + SKIRT_MARGIN * 2;
  const outerH = h + SKIRT_MARGIN * 2;
  const geo = new THREE.PlaneGeometry(outerW, outerH, 40, 40);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, 0, h / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const low = new THREE.Color(palette.low);
  const base = new THREE.Color(palette.base);
  const haze = new THREE.Color(hazeColor);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Distance outside the map rectangle: 0 within bounds, growing outward.
    const outX = Math.max(0, Math.max(-x, x - w));
    const outZ = Math.max(0, Math.max(-z, z - h));
    const out = Math.hypot(outX, outZ);
    const t = Math.min(1, out / SKIRT_MARGIN);
    // Sit just below the playable ground inside the bounds so it never z-fights
    // with it, then fall away. The curve stays near-flat for the first stretch
    // (so the fog plane overhanging it doesn't visibly hover) and only drops
    // steeply far out, where nothing but the horizon is left to see.
    pos.setY(i, -0.35 - Math.pow(t, 2.2) * 26);
    // Aerial perspective: wash toward the horizon colour with distance. Without
    // this the apron reads as a bright green field that the (hazed) playable map
    // sits on top of, which looks worse than the void it replaced.
    c.copy(base).lerp(low, 0.3);
    c.lerp(haze, 0.3 + Math.pow(t, 0.8) * 0.65);
    const shade = 1 + (noise(x * 0.35 + 19, z * 0.35 + 61) - 0.5) * 0.06;
    colors[i * 3] = c.r * shade;
    colors[i * 3 + 1] = c.g * shade;
    colors[i * 3 + 2] = c.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  // Draw before everything else so the playable ground always wins the overlap.
  mesh.renderOrder = -1;
  return mesh;
}

function makeNoise(seed: number): (x: number, y: number) => number {
  const hash = (ix: number, iy: number): number => {
    let h = (ix * 374761393 + iy * 668265263 + seed * 144665) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return (((h ^ (h >> 16)) >>> 0) % 1024) / 1024;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const layer = (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => layer(x * 0.08, y * 0.08) * 0.65 + layer(x * 0.25, y * 0.25) * 0.35;
}

/**
 * Static terrain: noise-tinted ground plane (visual only — the sim is flat),
 * scattered doodads (grass tufts, flowers, pebbles), blockers, and resource
 * node meshes. Nodes shrink as they deplete and are removed when exhausted.
 */
export class TerrainView {
  readonly root = new THREE.Group();
  private nodeMeshes = new Map<number, THREE.Group>();
  private state: MatchState;

  constructor(state: MatchState) {
    this.state = state;
    const map = state.map;
    const [w, h] = map.worldSize;
    const rng = new Rng(map.terrain.seed);
    const palette = BIOME_GROUND[map.terrain.biome];
    const noise = makeNoise(map.terrain.seed);

    // Ground: rolling color patches from smooth noise instead of speckle.
    const segs = Math.min(128, Math.floor(w / 1.5));
    const geo = new THREE.PlaneGeometry(w, h, segs, segs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(w / 2, 0, h / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(palette.low);
    const base = new THREE.Color(palette.base);
    const high = new THREE.Color(palette.high);
    const accent = new THREE.Color(palette.accent);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = noise(x, z);
      if (n < 0.45) c.copy(low).lerp(base, n / 0.45);
      else c.copy(base).lerp(high, (n - 0.45) / 0.55);
      // Sparse accent patches from a second noise band.
      const n2 = noise(x + 311, z + 97);
      if (n2 > 0.78) c.lerp(accent, (n2 - 0.78) * 2.2);
      const jitter = 0.985 + (noise(x + 777, z + 555) - 0.5) * 0.05;
      colors[i * 3] = c.r * jitter;
      colors[i * 3 + 1] = c.g * jitter;
      colors[i * 3 + 2] = c.b * jitter;
      pos.setY(i, (noise(x + 47, z + 23) - 0.5) * 0.22);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const detail = makeGroundDetailTexture(map.terrain.seed, map.terrain.biome === 'grass' || map.terrain.biome === 'savanna');
    detail.repeat.set(w / 9, h / 9);
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: detail }));
    ground.receiveShadow = true;
    this.root.add(ground);

    this.root.add(buildSkirt(w, h, palette, noise, biomeFogColor(map.terrain.biome)));

    this.addGroundAccents(map, palette);
    this.scatterDoodads(map, rng, palette);
    this.scatterLandscapeClusters(map, rng, palette);

    // Blockers.
    for (const blocker of map.blockers ?? []) {
      const g = new THREE.Group();
      if (blocker.kind === 'water') {
        // Sandy shore ring under a translucent pool with a lighter shallows rim.
        const shoreGeo = new THREE.CircleGeometry(blocker.radius * 1.12, 20);
        shoreGeo.rotateX(-Math.PI / 2);
        const shore = new THREE.Mesh(shoreGeo, mat(0xc9b88a));
        shore.position.set(blocker.pos.x, 0.04, blocker.pos.y);
        g.add(shore);
        const shallowGeo = new THREE.CircleGeometry(blocker.radius, 20);
        shallowGeo.rotateX(-Math.PI / 2);
        const shallow = new THREE.Mesh(shallowGeo, new THREE.MeshLambertMaterial({ color: 0x5a95b8, transparent: true, opacity: 0.8 }));
        shallow.position.set(blocker.pos.x, 0.07, blocker.pos.y);
        g.add(shallow);
        const deepGeo = new THREE.CircleGeometry(blocker.radius * 0.62, 16);
        deepGeo.rotateX(-Math.PI / 2);
        const deep = new THREE.Mesh(deepGeo, new THREE.MeshLambertMaterial({ color: 0x2e5f8a, transparent: true, opacity: 0.85 }));
        deep.position.set(blocker.pos.x, 0.1, blocker.pos.y);
        g.add(deep);
      } else {
        const rocks = blocker.kind === 'cliff' ? 6 : 4;
        const rockColor = map.terrain.biome === 'desert' ? 0xb09468 : 0x8a8a82;
        const darkRock = map.terrain.biome === 'desert' ? 0x97794f : 0x6f6f68;
        for (let i = 0; i < rocks; i++) {
          const angle = rng.next() * Math.PI * 2;
          const r = rng.next() * blocker.radius * 0.7;
          const size = blocker.radius * (0.3 + rng.next() * 0.4);
          const height = size * (blocker.kind === 'cliff' ? 2.2 : 1.2);
          const rock = cone(size * 0.8, height, rng.chance(0.5) ? rockColor : darkRock, blocker.pos.x + Math.cos(angle) * r, 0, blocker.pos.y + Math.sin(angle) * r, 5);
          rock.position.y = height / 2 - 0.2;
          rock.rotation.y = rng.next() * Math.PI;
          rock.rotation.z = (rng.next() - 0.5) * 0.16;
          rock.castShadow = true;
          g.add(rock);
        }
      }
      this.root.add(g);
    }

    // Resource nodes.
    for (const node of state.nodes) {
      const g = this.buildNodeMesh(node, rng, map.terrain.biome);
      g.position.set(node.pos.x, 0, node.pos.y);
      this.root.add(g);
      this.nodeMeshes.set(node.id, g);
    }

    // Objective markers (simple for now; FlagView adds player flags).
    for (const obj of state.objectives) {
      const marker = group(
        cylinder(0.9, 1.1, 0.3, 0xbab2a0, 0, 0.15, 0, 8),
        obj.objType === 'shrine'
          ? cone(0.45, 1.3, 0xd4af37, 0, 0.95, 0, 6)
          : obj.objType === 'tradePost'
            ? box(0.9, 0.8, 0.9, 0x8a6a3a, 0, 0.7)
            : obj.objType === 'relic'
              ? sphere(0.45, 0xd4af37, 0, 1.0)
              : cylinder(0.2, 0.2, 1.6, 0x6b5426, 0, 0.9, 0, 5),
      );
      marker.position.set(obj.pos.x, 0, obj.pos.y);
      marker.traverse((o) => o instanceof THREE.Mesh && (o.castShadow = true));
      this.root.add(marker);
    }
  }

  /** Instanced grass tufts, flowers, and pebbles strewn across the map. */
  private scatterDoodads(map: MapDef, rng: Rng, palette: BiomeGround): void {
    const [w, h] = map.worldSize;
    const dummy = new THREE.Object3D();

    const place = (mesh: THREE.InstancedMesh, count: number, scaleMin: number, scaleMax: number, yAt: (s: number) => number): void => {
      for (let i = 0; i < count; i++) {
        const x = 2 + rng.next() * (w - 4);
        const z = 2 + rng.next() * (h - 4);
        const s = scaleMin + rng.next() * (scaleMax - scaleMin);
        dummy.position.set(x, yAt(s), z);
        dummy.rotation.set(0, rng.next() * Math.PI * 2, (rng.next() - 0.5) * 0.2);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      this.root.add(mesh);
    };

    // Grass tufts: short wide wedges that read as grass, not saplings.
    const tuftGeo = new THREE.ConeGeometry(0.22, 0.3, 4);
    tuftGeo.translate(0, 0.13, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, mat(palette.grassTuft), palette.tuftCount);
    place(tufts, palette.tuftCount, 0.6, 1.4, () => 0);

    // Pebbles.
    const pebbleGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const pebbles = new THREE.InstancedMesh(pebbleGeo, mat(palette.pebble), 220);
    place(pebbles, 220, 0.5, 1.6, (s) => 0.08 * s);

    // Flowers (grass biome only): bright dots on short stems.
    if (palette.flower !== null) {
      const flowerGeo = new THREE.SphereGeometry(0.09, 5, 4);
      flowerGeo.translate(0, 0.28, 0);
      const colorsPool = [0xe8e06a, 0xd86a6a, 0xe8e8ee, 0xc879c8];
      const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial(), 140);
      const dummyF = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < 140; i++) {
        const x = 2 + rng.next() * (w - 4);
        const z = 2 + rng.next() * (h - 4);
        dummyF.position.set(x, 0, z);
        dummyF.scale.setScalar(0.8 + rng.next() * 0.8);
        dummyF.updateMatrix();
        flowers.setMatrixAt(i, dummyF.matrix);
        col.setHex(colorsPool[Math.floor(rng.next() * colorsPool.length)]);
        flowers.setColorAt(i, col);
      }
      flowers.instanceMatrix.needsUpdate = true;
      if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
      flowers.frustumCulled = false;
      this.root.add(flowers);
    }
  }

  /** Soft settlement clearings and dirt trails give bases a lived-in RTS read. */
  private addGroundAccents(map: MapDef, palette: BiomeGround): void {
    const clearingColor =
      map.terrain.biome === 'grass' ? 0x8b7b4a : map.terrain.biome === 'desert' ? 0xe2c17a : map.terrain.biome === 'savanna' ? 0xb99b55 : 0x8c8370;
    const clearingMat = new THREE.MeshLambertMaterial({
      color: clearingColor,
      transparent: true,
      opacity: map.terrain.biome === 'desert' ? 0.32 : 0.24,
      depthWrite: false,
    });
    const pathMat = new THREE.MeshLambertMaterial({
      color: palette.low,
      transparent: true,
      opacity: map.terrain.biome === 'grass' ? 0.26 : 0.2,
      depthWrite: false,
    });

    const addDisc = (x: number, z: number, sx: number, sz: number, rot = 0): void => {
      const geo = new THREE.CircleGeometry(1, 40);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, clearingMat);
      mesh.position.set(x, 0.08, z);
      mesh.scale.set(sx, 1, sz);
      mesh.rotation.y = rot;
      mesh.renderOrder = 1;
      this.root.add(mesh);
    };

    const addTrail = (a: { x: number; y: number }, b: { x: number; y: number }, width: number): void => {
      const dx = b.x - a.x;
      const dz = b.y - a.y;
      const length = Math.hypot(dx, dz);
      if (length < 8 || length > 42) return;
      const geo = new THREE.PlaneGeometry(length, width, 1, 1);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, pathMat);
      mesh.position.set((a.x + b.x) / 2, 0.09, (a.y + b.y) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.renderOrder = 1;
      this.root.add(mesh);
    };

    for (const spawn of map.spawns) {
      addDisc(spawn.x, spawn.y, 9.5, 7.2, (spawn.x + spawn.y) * 0.07);
      const nearby = [...map.resources]
        .map((r) => ({ spot: r, d: Math.hypot(r.pos.x - spawn.x, r.pos.y - spawn.y) }))
        .filter((r) => r.d < 38)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      for (const { spot } of nearby) {
        const mid = { x: spawn.x * 0.62 + spot.pos.x * 0.38, y: spawn.y * 0.62 + spot.pos.y * 0.38 };
        addTrail(spawn, mid, 1.8);
      }
    }
  }

  /** Low-cost border trees, shrubs, flower patches, and boulders. */
  private scatterLandscapeClusters(map: MapDef, rng: Rng, palette: BiomeGround): void {
    const [w, h] = map.worldSize;
    const dummy = new THREE.Object3D();
    const canopyColor = map.terrain.biome === 'desert' ? 0x8a9659 : map.terrain.biome === 'savanna' ? 0x81953f : 0x47823a;
    const canopyLight = map.terrain.biome === 'desert' ? 0xa8b06e : map.terrain.biome === 'savanna' ? 0x9da851 : 0x5e9c48;

    const treeCount = Math.min(180, Math.floor((w + h) * 0.95));
    const trunkGeo = new THREE.CylinderGeometry(0.13, 0.19, 1.2, 5);
    trunkGeo.translate(0, 0.6, 0);
    // Blobby low-poly canopy for leafy biomes; conifer cone for mountains.
    const crownGeo =
      map.terrain.biome === 'mountain'
        ? new THREE.ConeGeometry(0.85, 1.9, 6)
        : new THREE.DodecahedronGeometry(0.95, 0);
    if (map.terrain.biome === 'mountain') crownGeo.translate(0, 1.75, 0);
    else {
      crownGeo.scale(1, 0.85, 1);
      crownGeo.translate(0, 1.65, 0);
    }
    const trunks = new THREE.InstancedMesh(trunkGeo, mat(0x7a5530), treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: canopyColor }), treeCount);
    const crownColors = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      // Keep decoration trees out of the playable middle: cluster near edges.
      const edge = Math.floor(rng.next() * 4);
      const inset = rng.next() * rng.next() * 12;
      const along = rng.next();
      const x = edge === 0 ? inset : edge === 1 ? w - inset : along * w;
      const z = edge === 0 || edge === 1 ? along * h : edge === 2 ? inset : h - inset;
      const s = 0.85 + rng.next() * 0.9;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rng.next() * Math.PI * 2, (rng.next() - 0.5) * 0.12);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      crowns.setMatrixAt(i, dummy.matrix);
      crownColors.setHex(rng.chance(0.35) ? canopyLight : canopyColor);
      crowns.setColorAt(i, crownColors);
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    trunks.castShadow = true;
    crowns.castShadow = true;
    trunks.frustumCulled = false;
    crowns.frustumCulled = false;
    this.root.add(trunks, crowns);

    const boulderCount = Math.min(90, Math.floor((w * h) / 85));
    const boulderGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const boulders = new THREE.InstancedMesh(boulderGeo, new THREE.MeshLambertMaterial({ color: palette.pebble }), boulderCount);
    for (let i = 0; i < boulderCount; i++) {
      const nearEdge = rng.chance(0.45);
      const x = nearEdge ? (rng.chance(0.5) ? rng.next() * 11 : w - rng.next() * 11) : 3 + rng.next() * (w - 6);
      const z = nearEdge ? 3 + rng.next() * (h - 6) : 3 + rng.next() * (h - 6);
      const s = 0.45 + rng.next() * 1.2;
      dummy.position.set(x, 0.16 * s, z);
      dummy.rotation.set(rng.next() * 0.4, rng.next() * Math.PI * 2, rng.next() * 0.4);
      dummy.scale.set(s * (0.75 + rng.next() * 0.35), s * 0.55, s);
      dummy.updateMatrix();
      boulders.setMatrixAt(i, dummy.matrix);
    }
    boulders.instanceMatrix.needsUpdate = true;
    boulders.castShadow = true;
    boulders.frustumCulled = false;
    this.root.add(boulders);

    if (palette.flower !== null) {
      const patchMat = new THREE.MeshLambertMaterial({ color: 0xd9c34b, transparent: true, opacity: 0.18, depthWrite: false });
      for (let i = 0; i < 42; i++) {
        const geo = new THREE.CircleGeometry(0.45 + rng.next() * 0.7, 10);
        geo.rotateX(-Math.PI / 2);
        const patch = new THREE.Mesh(geo, patchMat);
        patch.position.set(3 + rng.next() * (w - 6), 0.1, 3 + rng.next() * (h - 6));
        patch.scale.set(1.1 + rng.next() * 1.2, 1, 0.35 + rng.next() * 0.45);
        patch.rotation.y = rng.next() * Math.PI;
        patch.renderOrder = 1;
        this.root.add(patch);
      }
    }
  }

  private buildNodeMesh(node: ResourceNode, rng: Rng, biome: Biome): THREE.Group {
    const g = new THREE.Group();
    if (node.nodeType === 'forest') {
      const trees = 5;
      const canopy = biome === 'desert' ? 0x7a8a4a : biome === 'savanna' ? 0x6f8a3d : 0x3d6b2a;
      const canopyLight = biome === 'desert' ? 0x93a35e : biome === 'savanna' ? 0x87a34e : 0x4f8236;
      for (let i = 0; i < trees; i++) {
        const a = rng.next() * Math.PI * 2;
        const r = rng.next() * 1.6;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const height = 1.6 + rng.next() * 1.3;
        const tree = group(
          cylinder(0.12, 0.17, height * 0.5, 0x6a4a26, 0, height * 0.25, 0, 5),
          // Two-layer canopy with a lighter crown reads much fuller.
          cone(0.75 + rng.next() * 0.3, height * 0.85, canopy, 0, height * 0.72, 0, 6),
          cone(0.5 + rng.next() * 0.2, height * 0.6, canopyLight, 0, height * 1.12, 0, 6),
        );
        tree.position.set(x, 0, z);
        tree.rotation.y = rng.next() * Math.PI;
        tree.rotation.z = (rng.next() - 0.5) * 0.08;
        g.add(tree);
      }
    } else if (node.nodeType === 'gold') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const rock = box(0.9, 0.7, 0.8, 0x9a8a6a, Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7);
        rock.rotation.y = rng.next();
        g.add(rock);
        // Veins of gold catching the light.
        g.add(sphere(0.18, 0xf0c445, Math.cos(a) * 0.7, 0.72, Math.sin(a) * 0.7));
        g.add(sphere(0.1, 0xd4af37, Math.cos(a) * 0.7 + 0.3, 0.45, Math.sin(a) * 0.7 - 0.2));
      }
      g.add(box(0.7, 0.5, 0.6, 0x8a7a5a, 0, 0.22, 0));
    } else if (node.nodeType === 'stone') {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.5;
        const rock = box(0.8 + rng.next() * 0.4, 0.6 + rng.next() * 0.4, 0.9, rng.chance(0.5) ? 0x9a958c : 0x84807a, Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7);
        rock.rotation.y = rng.next();
        rock.rotation.z = (rng.next() - 0.5) * 0.2;
        g.add(rock);
      }
    } else {
      // Berries / farm plot
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.add(sphere(0.4, 0x4a7a2a, Math.cos(a) * 0.8, 0.32, Math.sin(a) * 0.8));
        g.add(sphere(0.09, 0xc23b5e, Math.cos(a) * 0.8 + 0.15, 0.55, Math.sin(a) * 0.8));
        g.add(sphere(0.07, 0xd84a6e, Math.cos(a) * 0.8 - 0.12, 0.5, Math.sin(a) * 0.8 + 0.1));
      }
    }
    g.traverse((o) => o instanceof THREE.Mesh && (o.castShadow = true));
    return g;
  }

  /** Shrink depleting nodes; remove exhausted ones; hide unexplored ones. */
  update(): void {
    const fog = this.state.fog;
    for (const node of this.state.nodes) {
      const mesh = this.nodeMeshes.get(node.id);
      if (!mesh) continue;
      if (node.dead || node.amount <= 0) {
        mesh.removeFromParent();
        this.nodeMeshes.delete(node.id);
        continue;
      }
      // Resource nodes are tall enough to stand proud of the fog plane, so
      // hide the ones the player has never seen rather than let them advertise
      // themselves through the haze.
      mesh.visible = fog.valueAt(node.pos, 0) !== FOG_BLACK;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
