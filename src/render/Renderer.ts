import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { DisplayOptions, Biome } from '@/data/types';

interface BiomeSky {
  /** Sky gradient: overhead and horizon colors for the dome. */
  zenith: number;
  horizon: number;
  fogColor: number;
  ambient: number;
  groundBounce: number;
  sun: number;
  sunIntensity: number;
}

const BIOME_SKY: Record<Biome, BiomeSky> = {
  grass: {
    zenith: 0x4d7fb8,
    horizon: 0xd9e6ec,
    fogColor: 0xaec6d4,
    ambient: 0xbcccdc,
    groundBounce: 0x4f5a3c,
    sun: 0xffeecb,
    sunIntensity: 1.5,
  },
  desert: {
    zenith: 0x6f9ecb,
    horizon: 0xf2ddae,
    fogColor: 0xe4cfa4,
    ambient: 0xdcc9a4,
    groundBounce: 0x8a6f48,
    sun: 0xffe9b8,
    sunIntensity: 1.65,
  },
  savanna: {
    zenith: 0x7aa2c4,
    horizon: 0xe9d5a5,
    fogColor: 0xd6c49c,
    ambient: 0xd0c4a4,
    groundBounce: 0x6f6438,
    sun: 0xffe4a8,
    sunIntensity: 1.55,
  },
  mountain: {
    zenith: 0x53708f,
    horizon: 0xc7d2da,
    fogColor: 0xa6b2bd,
    ambient: 0xaeb8c4,
    groundBounce: 0x4a4f48,
    sun: 0xf4ecdc,
    sunIntensity: 1.4,
  },
};

/** Owns the WebGL renderer, scene, camera, and lights for a match. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, biome: Biome, display: DisplayOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: display.quality !== 'low',
      powerPreference: 'high-performance',
      // Dev-only: lets tooling read the canvas back after present for screenshots.
      preserveDrawingBuffer: import.meta.env.DEV,
    });
    const pixelRatio = display.quality === 'low' ? 1 : Math.min(window.devicePixelRatio, display.quality === 'medium' ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);
    // Filmic tone mapping keeps the saturated low-poly palette from clipping.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    const palette = BIOME_SKY[biome];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(palette.zenith);
    this.scene.fog = new THREE.Fog(palette.fogColor, 140, 340);

    // Soft image-based fill so PBR materials from imported GLBs get ambient
    // specular response instead of going flat/dark under analytic lights only.
    if (display.quality !== 'low') {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.35;
      pmrem.dispose();
    }

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 900);

    // Gradient sky dome (fog-exempt, drawn behind everything).
    this.sky = buildSkyDome(palette);
    this.scene.add(this.sky);

    const hemi = new THREE.HemisphereLight(palette.ambient, palette.groundBounce, 0.95);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(palette.sun, palette.sunIntensity);
    this.sun.position.set(60, 90, 30);
    if (display.shadows !== 'off') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.sun.castShadow = true;
      const size = display.shadows === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.camera.left = -80;
      this.sun.shadow.camera.right = 80;
      this.sun.shadow.camera.top = 80;
      this.sun.shadow.camera.bottom = -80;
      this.sun.shadow.camera.far = 250;
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.radius = 4;
    }
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Cool counter-light from the opposite side keeps shaded faces readable.
    const fill = new THREE.DirectionalLight(0x9ab4d4, 0.28);
    fill.position.set(-50, 40, -60);
    this.scene.add(fill);

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

  /** Keep the shadow camera (and sky dome) centered on the view target. */
  followShadow(target: THREE.Vector3): void {
    this.sun.position.set(target.x + 60, 90, target.z + 30);
    this.sun.target.position.copy(target);
    this.sky.position.set(target.x, 0, target.z);
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

/** Vertex-colored dome: horizon haze blending up into the zenith blue. */
function buildSkyDome(palette: BiomeSky): THREE.Mesh {
  const geo = new THREE.SphereGeometry(520, 24, 12);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(palette.zenith);
  const horizon = new THREE.Color(palette.horizon);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // 0 at/below the horizon, 1 straight up; bias toward a low, wide haze band.
    const t = Math.max(0, pos.getY(i) / 520);
    c.copy(horizon).lerp(zenith, Math.pow(t, 0.55));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
