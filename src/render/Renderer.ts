import * as THREE from 'three';
import type { DisplayOptions, Biome } from '@/data/types';

const BIOME_SKY: Record<Biome, { sky: number; fogColor: number; ambient: number }> = {
  grass: { sky: 0x87a8c8, fogColor: 0x9db8cf, ambient: 0xb8c4d0 },
  desert: { sky: 0xd8b888, fogColor: 0xe0c9a0, ambient: 0xd0c0a0 },
  savanna: { sky: 0xc8b088, fogColor: 0xd0bf9a, ambient: 0xc8bca0 },
  mountain: { sky: 0x8898a8, fogColor: 0xa0abb8, ambient: 0xa8b0bc },
};

/** Owns the WebGL renderer, scene, camera, and lights for a match. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, biome: Biome, display: DisplayOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: display.quality !== 'low',
      powerPreference: 'high-performance',
    });
    const pixelRatio = display.quality === 'low' ? 1 : Math.min(window.devicePixelRatio, display.quality === 'medium' ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);

    const palette = BIOME_SKY[biome];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.sky);
    this.scene.fog = new THREE.Fog(palette.fogColor, 120, 320);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 600);

    const hemi = new THREE.HemisphereLight(palette.ambient, 0x4a4238, 0.85);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
    this.sun.position.set(60, 90, 30);
    if (display.shadows !== 'off') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.sun.castShadow = true;
      const size = display.shadows === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.camera.left = -80;
      this.sun.shadow.camera.right = 80;
      this.sun.shadow.camera.top = 80;
      this.sun.shadow.camera.bottom = -80;
      this.sun.shadow.camera.far = 250;
      this.sun.shadow.bias = -0.0008;
    }
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth || 1;
    const h = parent.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Keep the shadow camera centered on the view target. */
  followShadow(target: THREE.Vector3): void {
    this.sun.position.set(target.x + 60, 90, target.z + 30);
    this.sun.target.position.copy(target);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
