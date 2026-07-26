import * as THREE from 'three';
import { FOG_CELL } from '@/data/balance';
import type { Biome } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { biomeFogColor } from './Renderer';
import { SKIRT_OVERHANG } from './TerrainView';

/**
 * Fog overlay: a map-sized plane just above the ground carrying a DataTexture
 * (R channel = fog value) and a small shader mapping 0→unexplored, 1→explored
 * but not currently visible, 2→clear.
 *
 * Two things matter for this to read well rather than as a black void:
 *  - Unexplored is a *heavy haze in the biome's own horizon colour*, not near-
 *    black. The map should look like land under cloud, not like a hole.
 *  - The value texture is blurred on upload and sampled with smoothstep, so
 *    cell boundaries don't show up as a blocky grid.
 *
 * The plane sits at ground level. It used to float at y=2.5 — exactly hut-roof
 * height — which is why anything taller than a hut appeared to punch through
 * the fog and hover on top of it.
 */
export class FogView {
  readonly mesh: THREE.Mesh;
  private texture: THREE.DataTexture;
  private data: Uint8Array;
  private blurred: Uint8Array;
  private state: MatchState;
  private lastVersion = -1;

  constructor(state: MatchState, biome: Biome) {
    this.state = state;
    const fog = state.fog;
    this.data = new Uint8Array(fog.width * fog.height);
    this.blurred = new Uint8Array(fog.width * fog.height);
    this.texture = new THREE.DataTexture(this.blurred, fog.width, fog.height, THREE.RedFormat);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.flipY = true; // fog row 0 = world z 0, plane v=1 = world z 0
    // Sampling past the map bounds must reuse the border cell, not repeat.
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    // The plane deliberately overhangs the map by SKIRT_OVERHANG so it also
    // covers TerrainView's surrounding apron. UVs are derived from world
    // position rather than the default plane UVs, so everything past the map
    // bounds clamps to the border texel — the land outside the playable area
    // then carries the same fog state as the map edge beside it, instead of the
    // map reading as a sharply-outlined dark rectangle sitting on lit ground.
    const mapW = fog.width * FOG_CELL;
    const mapH = fog.height * FOG_CELL;
    const geo = new THREE.PlaneGeometry(mapW + SKIRT_OVERHANG * 2, mapH + SKIRT_OVERHANG * 2);
    geo.rotateX(-Math.PI / 2);
    geo.translate(mapW / 2, 0.12, mapH / 2);

    const haze = new THREE.Color(biomeFogColor(biome));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        fogMap: { value: this.texture },
        mapSize: { value: new THREE.Vector2(mapW, mapH) },
        hazeColor: { value: new THREE.Vector3(haze.r * 0.42, haze.g * 0.44, haze.b * 0.5) },
        dimColor: { value: new THREE.Vector3(haze.r * 0.3, haze.g * 0.32, haze.b * 0.4) },
      },
      vertexShader: `
        uniform vec2 mapSize;
        varying vec2 vUv;
        void main() {
          // Object space equals world space here (the geometry is pre-translated),
          // so position.xz maps straight onto the fog grid. v is flipped to match
          // the DataTexture's flipY.
          vUv = vec2(position.x / mapSize.x, 1.0 - position.z / mapSize.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D fogMap;
        uniform vec3 hazeColor;
        uniform vec3 dimColor;
        varying vec2 vUv;
        void main() {
          // Source is stored as v*127 so the blur survives 8-bit quantization;
          // decode back to a continuous 0..2.
          float v = texture2D(fogMap, vUv).r * (255.0 / 127.0);
          // 0 -> unexplored haze, 1 -> explored-but-dark, 2 -> clear.
          float unexplored = 1.0 - smoothstep(0.0, 1.0, v);
          float dim = (1.0 - smoothstep(1.0, 2.0, v)) * smoothstep(0.0, 1.0, v);
          float alpha = unexplored * 0.78 + dim * 0.34;
          vec3 col = mix(dimColor, hazeColor, unexplored);
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(col, alpha);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
  }

  update(): void {
    const fog = this.state.fog;
    if (fog.version === this.lastVersion) return;
    this.lastVersion = fog.version;
    // Player 0's fog. UV v=0 is texture row 0; plane maps v across +z.
    this.data.set(fog.grids[0]);
    this.blur();
    this.texture.needsUpdate = true;
  }

  /**
   * 3x3 box blur on upload, stored as `value * 127` so the fractional result
   * survives 8-bit quantization (rounding a 0/1/2 grid straight back to
   * integers would discard the blur entirely). The grid is only width*height
   * bytes and refreshes a few times a second, so smoothing here is far cheaper
   * than a multi-tap fragment shader — and it removes the blocky cell edges.
   */
  private blur(): void {
    const { width: w, height: h } = this.state.fog;
    const src = this.data;
    const dst = this.blurred;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            sum += src[yy * w + xx];
            n++;
          }
        }
        dst[y * w + x] = Math.round((sum / n) * 127);
      }
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
  }
}
