/**
 * Shared 3D preview rendering for card art, hover popups, and shop packs.
 * A single offscreen WebGLRenderer serves every preview canvas: registered
 * canvases receive slowly spinning renders (blitted via drawImage), with
 * priority canvases (hover popups) refreshed every frame and the rest
 * round-robin so a full collection grid stays cheap.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getArchetypeGeometry } from '@/render/meshes/unitMeshes';
import { buildBuilding } from '@/render/art';
import { getUnit } from '@/data/units';
import { getBuilding } from '@/data/buildings';
import { FACTIONS } from '@/data/factions';
import type { Card, FactionId } from '@/data/types';

const RENDER_W = 480;
const RENDER_H = 360;
/** Non-priority canvases refreshed per frame (round-robin). */
const BUDGET_PER_FRAME = 6;

interface SpinnerEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  model: THREE.Object3D;
  priority: boolean;
  speed: number;
  bob: boolean;
  phase: number;
  disconnectedFrames: number;
}

class SpinnerHub {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, RENDER_W / RENDER_H, 0.1, 50);
  private entries = new Set<SpinnerEntry>();
  private rafId = 0;
  private cursor = 0;

  private ensureRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setSize(RENDER_W, RENDER_H, false);
      this.renderer.setClearColor(0x000000, 0);

      this.camera.position.set(0, 1.05, 3.4);
      this.camera.lookAt(0, 0.05, 0);

      const hemi = new THREE.HemisphereLight(0xfff4dd, 0x3a3226, 1.0);
      const key = new THREE.DirectionalLight(0xfff2dd, 1.6);
      key.position.set(2.5, 4, 3);
      const rim = new THREE.DirectionalLight(0x8ab8ff, 0.7);
      rim.position.set(-3, 2, -2.5);
      this.scene.add(hemi, key, rim);

      // Environment map so reflective materials (booster packs) look foil-like.
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    return this.renderer;
  }

  register(
    canvas: HTMLCanvasElement,
    model: THREE.Object3D,
    opts: { priority?: boolean; speed?: number; bob?: boolean } = {},
  ): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    const entry: SpinnerEntry = {
      canvas,
      ctx,
      model,
      priority: opts.priority ?? false,
      speed: opts.speed ?? 0.55,
      bob: opts.bob ?? false,
      phase: Math.random() * Math.PI * 2,
      disconnectedFrames: 0,
    };
    this.entries.add(entry);
    this.draw(entry, performance.now());
    this.start();
    return () => this.entries.delete(entry);
  }

  private start(): void {
    if (this.rafId) return;
    const loop = (now: number): void => {
      if (this.entries.size === 0) {
        this.rafId = 0;
        return;
      }
      this.rafId = requestAnimationFrame(loop);
      const list = [...this.entries];
      // Purge canvases that left the DOM (screen switched without cleanup).
      for (const e of list) {
        if (!e.canvas.isConnected) {
          if (++e.disconnectedFrames > 60) this.entries.delete(e);
        } else {
          e.disconnectedFrames = 0;
        }
      }
      const live = list.filter((e) => e.canvas.isConnected);
      for (const e of live) if (e.priority) this.draw(e, now);
      const rest = live.filter((e) => !e.priority);
      for (let i = 0; i < Math.min(BUDGET_PER_FRAME, rest.length); i++) {
        this.cursor = (this.cursor + 1) % rest.length;
        this.draw(rest[this.cursor], now);
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private draw(e: SpinnerEntry, now: number): void {
    const renderer = this.ensureRenderer();
    const t = now / 1000;
    e.model.rotation.y = e.phase + t * e.speed;
    e.model.position.y = e.bob ? Math.sin(t * 1.4 + e.phase) * 0.08 : 0;
    this.scene.add(e.model);
    renderer.render(this.scene, this.camera);
    this.scene.remove(e.model);
    e.ctx.clearRect(0, 0, e.canvas.width, e.canvas.height);
    e.ctx.drawImage(renderer.domElement, 0, 0, e.canvas.width, e.canvas.height);
  }
}

export const spinnerHub = new SpinnerHub();

// ---------------------------------------------------------------------------
// Model builders
// ---------------------------------------------------------------------------

/** Wrap `obj` so it is centered on the origin and fits `targetSize`. */
function fitModel(obj: THREE.Object3D, targetSize: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  obj.position.set(-center.x, -center.y, -center.z);
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.scale.setScalar(targetSize / maxDim);
  return wrap;
}

function factionColor(faction: FactionId): number {
  return faction === 'neutral' ? 0xb9a777 : FACTIONS[faction].colorPrimary;
}

const cardModelCache = new Map<string, THREE.Object3D | null>();

/**
 * The 3D model shown on a card: the unit archetype or the building mesh.
 * Ability/power cards have no model (callers fall back to the icon glyph).
 */
export function buildCardModel(card: Card, viewerFaction?: string): THREE.Object3D | null {
  // Universal cards carry faction 'neutral', but in a match they are built in
  // the player's own style — so the preview has to be keyed on who is looking
  // at it, or the card shows art the player will never see.
  const faction = card.faction === 'neutral' && viewerFaction ? viewerFaction : card.faction;
  const cacheKey = `${card.id}:${faction}`;
  let model = cardModelCache.get(cacheKey);
  if (model !== undefined) return model;
  model = null;
  if (card.unitId) {
    const unit = getUnit(card.unitId);
    const geo = getArchetypeGeometry(unit.mesh);
    const g = new THREE.Group();
    if (geo.body) g.add(new THREE.Mesh(geo.body, new THREE.MeshLambertMaterial({ vertexColors: true })));
    if (geo.team) g.add(new THREE.Mesh(geo.team, new THREE.MeshLambertMaterial({ color: factionColor(card.faction) })));
    if (geo.action) {
      // Action layer is baked around its swing pivot; restore its rest pose.
      const action = new THREE.Mesh(geo.action, new THREE.MeshLambertMaterial({ vertexColors: true }));
      action.position.set(geo.pivot.x, geo.pivot.y, geo.pivot.z);
      g.add(action);
    }
    model = fitModel(g, 1.9);
  } else if (card.buildingId) {
    const def = getBuilding(card.buildingId);
    model = fitModel(buildBuilding(def.mesh, faction, factionColor(card.faction), { footprint: def.footprint as [number, number] }), 2.3);
  }
  cardModelCache.set(cacheKey, model);
  return model;
}

// ---------------------------------------------------------------------------
// Booster pack models (shop)
// ---------------------------------------------------------------------------

const packModelCache = new Map<string, THREE.Object3D>();

/** A foil booster-pack pouch: crimped top/bottom, emblem plate, glossy wrap. */
export function buildPackModel(baseColor: number, accentColor: number): THREE.Object3D {
  const key = `${baseColor}:${accentColor}`;
  const cached = packModelCache.get(key);
  if (cached) return cached;
  const g = new THREE.Group();
  const foil = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    metalness: 0.7,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 2.4,
  });
  const foilDark = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.55),
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: 1.2,
  });
  const accent = new THREE.MeshPhysicalMaterial({
    color: accentColor,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 1.0,
    envMapIntensity: 2.0,
  });

  // Body slab with a slight belly (cards inside).
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.85, 0.28), foil);
  g.add(body);
  // Crimped seals.
  const crimpTop = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.22, 0.1), foilDark);
  crimpTop.position.y = 1.02;
  const crimpBottom = crimpTop.clone();
  crimpBottom.position.y = -1.02;
  g.add(crimpTop, crimpBottom);
  // Zigzag teeth along the top seal.
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 4), foilDark);
    tooth.position.set(-0.55 + i * 0.22, 1.17, 0);
    g.add(tooth);
  }
  // Emblem plate + gem.
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), accent);
  plate.rotation.x = Math.PI / 2;
  plate.position.set(0, 0.28, 0.17);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshPhysicalMaterial({
    color: accentColor,
    metalness: 0.2,
    roughness: 0.05,
    transmission: 0.4,
    envMapIntensity: 2.4,
  }));
  gem.position.set(0, 0.28, 0.26);
  // Title band.
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.34, 0.29), foilDark);
  band.position.y = -0.45;
  g.add(plate, gem, band);
  // Tilt toward the camera so the emblem face reads while it spins.
  g.rotation.x = 0.22;
  const model = fitModel(g, 2.2);
  packModelCache.set(key, model);
  return model;
}
