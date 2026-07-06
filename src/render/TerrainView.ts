import * as THREE from 'three';
import { Rng } from '@/core/Rng';
import type { Biome, MapDef } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { ResourceNode } from '@/sim/entities/Entity';
import { box, cone, cylinder, group, mat, sphere } from './meshes/primitives';

const BIOME_GROUND: Record<Biome, { base: number; vary: number[] }> = {
  grass: { base: 0x5f8a3d, vary: [0x557d36, 0x6a9445, 0x4f7331, 0x74a04e] },
  desert: { base: 0xcaa963, vary: [0xc09a55, 0xd4b573, 0xb8935a, 0xdcbf80] },
  savanna: { base: 0xa89a4e, vary: [0x9a8c44, 0xb5a75c, 0x8f8340, 0xc0b068] },
  mountain: { base: 0x7d8471, vary: [0x6f7663, 0x8a9180, 0x646b58, 0x969d8b] },
};

/**
 * Static terrain: vertex-colored ground plane (visual noise only — the sim is
 * flat), blocker doodads, and resource node meshes. Nodes shrink as they
 * deplete and are removed when exhausted.
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

    // Ground: segmented plane, per-vertex color variation + tiny height noise.
    const segs = Math.min(96, Math.floor(w / 2));
    const geo = new THREE.PlaneGeometry(w, h, segs, segs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(w / 2, 0, h / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      color.setHex(rng.chance(0.6) ? palette.base : rng.pick(palette.vary));
      // Slight brightness jitter
      const jitter = 0.96 + rng.next() * 0.08;
      colors[i * 3] = color.r * jitter;
      colors[i * 3 + 1] = color.g * jitter;
      colors[i * 3 + 2] = color.b * jitter;
      pos.setY(i, rng.next() * 0.15 - 0.075);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    this.root.add(ground);

    // Blockers.
    for (const blocker of map.blockers ?? []) {
      const g = new THREE.Group();
      if (blocker.kind === 'water') {
        const waterGeo = new THREE.CircleGeometry(blocker.radius, 12);
        waterGeo.rotateX(-Math.PI / 2);
        const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ color: 0x3d6f9a, transparent: true, opacity: 0.85 }));
        water.position.set(blocker.pos.x, 0.08, blocker.pos.y);
        g.add(water);
      } else {
        const rocks = blocker.kind === 'cliff' ? 5 : 3;
        for (let i = 0; i < rocks; i++) {
          const angle = rng.next() * Math.PI * 2;
          const r = rng.next() * blocker.radius * 0.7;
          const size = blocker.radius * (0.35 + rng.next() * 0.4);
          const rock = cone(
            size * 0.8,
            size * (blocker.kind === 'cliff' ? 2.2 : 1.2),
            map.terrain.biome === 'desert' ? 0xb09468 : 0x8a8a82,
            blocker.pos.x + Math.cos(angle) * r,
            0,
            blocker.pos.y + Math.sin(angle) * r,
            5,
          );
          rock.position.y = (size * (blocker.kind === 'cliff' ? 2.2 : 1.2)) / 2 - 0.2;
          rock.rotation.y = rng.next() * Math.PI;
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

  private buildNodeMesh(node: ResourceNode, rng: Rng, biome: Biome): THREE.Group {
    const g = new THREE.Group();
    if (node.nodeType === 'forest') {
      const trees = 5;
      const treeColor = biome === 'desert' ? 0x7a8a4a : biome === 'savanna' ? 0x6f8a3d : 0x3d6b2a;
      for (let i = 0; i < trees; i++) {
        const a = rng.next() * Math.PI * 2;
        const r = rng.next() * 1.6;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const height = 1.6 + rng.next() * 1.2;
        g.add(cylinder(0.12, 0.16, height * 0.5, 0x6a4a26, x, height * 0.25, z, 5));
        g.add(cone(0.7 + rng.next() * 0.3, height, treeColor, x, height * 0.5 + height * 0.5, z, 6));
      }
    } else if (node.nodeType === 'gold') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const rock = box(0.9, 0.7, 0.8, 0x9a8a6a, Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7);
        rock.rotation.y = rng.next();
        g.add(rock);
        g.add(sphere(0.18, 0xd4af37, Math.cos(a) * 0.7, 0.72, Math.sin(a) * 0.7));
      }
    } else if (node.nodeType === 'stone') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const rock = box(1.0, 0.8, 0.9, 0x9a958c, Math.cos(a) * 0.7, 0.35, Math.sin(a) * 0.7);
        rock.rotation.y = rng.next();
        g.add(rock);
      }
    } else {
      // Berries / farm plot
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.add(sphere(0.4, 0x4a7a2a, Math.cos(a) * 0.8, 0.32, Math.sin(a) * 0.8));
        g.add(sphere(0.09, 0xc23b5e, Math.cos(a) * 0.8 + 0.15, 0.55, Math.sin(a) * 0.8));
      }
    }
    g.traverse((o) => o instanceof THREE.Mesh && (o.castShadow = true));
    return g;
  }

  /** Shrink depleting nodes; remove exhausted ones. */
  update(): void {
    for (const node of this.state.nodes) {
      const mesh = this.nodeMeshes.get(node.id);
      if (!mesh) continue;
      if (node.dead || node.amount <= 0) {
        mesh.removeFromParent();
        this.nodeMeshes.delete(node.id);
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
