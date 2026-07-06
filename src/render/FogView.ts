import * as THREE from 'three';
import { FOG_CELL } from '@/data/balance';
import type { MatchState } from '@/sim/MatchState';

/**
 * Fog overlay: a map-sized plane with a DataTexture (R channel = fog value)
 * and a tiny shader mapping 0→black, 1→dark, 2→clear. Texture uploads only
 * when the fog version changes.
 */
export class FogView {
  readonly mesh: THREE.Mesh;
  private texture: THREE.DataTexture;
  private data: Uint8Array;
  private state: MatchState;
  private lastVersion = -1;

  constructor(state: MatchState) {
    this.state = state;
    const fog = state.fog;
    this.data = new Uint8Array(fog.width * fog.height);
    this.texture = new THREE.DataTexture(this.data, fog.width, fog.height, THREE.RedFormat);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.flipY = true; // fog row 0 = world z 0, plane v=1 = world z 0

    const [w, h] = state.map.worldSize;
    const geo = new THREE.PlaneGeometry(fog.width * FOG_CELL, fog.height * FOG_CELL);
    geo.rotateX(-Math.PI / 2);
    geo.translate((fog.width * FOG_CELL) / 2, 2.5, (fog.height * FOG_CELL) / 2);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { fogMap: { value: this.texture } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D fogMap;
        varying vec2 vUv;
        void main() {
          float v = texture2D(fogMap, vUv).r * 255.0;
          float alpha = v < 0.5 ? 0.94 : (v < 1.5 ? 0.5 : 0.0);
          gl_FragColor = vec4(0.01, 0.008, 0.02, alpha);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
    void w;
    void h;
  }

  update(): void {
    const fog = this.state.fog;
    if (fog.version === this.lastVersion) return;
    this.lastVersion = fog.version;
    // Player 0's fog. UV v=0 is texture row 0; plane maps v across +z.
    this.data.set(fog.grids[0]);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
  }
}
