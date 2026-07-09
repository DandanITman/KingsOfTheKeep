import * as THREE from 'three';
import { dist, lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';

const MAX_PROJECTILES = 300;
const MAX_SPARKS = 120;

interface Spark {
  vx: number;
  vy: number;
  vz: number;
  x: number;
  y: number;
  z: number;
  bornMs: number;
  lifeMs: number;
  color: number;
}

/**
 * Projectile rendering: instanced arrows (shallow arcs, pitched along their
 * flight) and tumbling stones (high lobs), plus impact rings and spark bursts.
 */
export class EffectsView {
  readonly root = new THREE.Group();
  private arrows: THREE.InstancedMesh;
  private stones: THREE.InstancedMesh;
  private sparkMesh: THREE.InstancedMesh;
  private sparks: Spark[] = [];
  private sparkColor = new THREE.Color();
  private dummy = new THREE.Object3D();
  private state: MatchState;
  private impacts: { pos: { x: number; y: number }; bornMs: number; mesh: THREE.Mesh; scaleBase: number }[] = [];
  private impactGeo = new THREE.RingGeometry(0.3, 0.5, 12);
  private impactMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, side: THREE.DoubleSide, depthWrite: false });

  constructor(state: MatchState) {
    this.state = state;
    // Arrow: shaft + a hint of fletching baked into one geometry.
    const shaft = new THREE.BoxGeometry(0.55, 0.035, 0.035);
    const arrowGeo = shaft;
    this.arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xe4d7b0 }), MAX_PROJECTILES);
    const stoneGeo = new THREE.DodecahedronGeometry(0.22, 0);
    this.stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshLambertMaterial({ color: 0x6f685e }), MAX_PROJECTILES);
    const sparkGeo = new THREE.PlaneGeometry(0.14, 0.14);
    this.sparkMesh = new THREE.InstancedMesh(
      sparkGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
      MAX_SPARKS,
    );
    for (const m of [this.arrows, this.stones, this.sparkMesh]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.root.add(m);
    }
    state.bus.on('projectileHit', ({ pos }) => {
      this.spawnImpact(pos);
      this.spawnSparks(pos, 5);
    });
    state.bus.on('abilityCast', ({ pos }) => {
      if (pos) {
        this.spawnImpact(pos, 0xd4af37, 3);
        this.spawnSparks(pos, 10, 0xffe08a);
      }
    });
    state.bus.on('buildingDestroyed', ({ pos }) => {
      this.spawnImpact(pos, 0x998877, 4);
      this.spawnSparks(pos, 14, 0xb0a494);
    });
    state.bus.on('unitDied', ({ pos }) => this.spawnSparks(pos, 4, 0x9a9a92));
  }

  private spawnImpact(pos: { x: number; y: number }, color = 0xffaa44, scale = 1): void {
    if (this.impacts.length > 20) return;
    const material = this.impactMat.clone();
    material.color.setHex(color);
    const mesh = new THREE.Mesh(this.impactGeo, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.15, pos.y);
    mesh.scale.setScalar(scale);
    this.root.add(mesh);
    this.impacts.push({ pos, bornMs: performance.now(), mesh, scaleBase: scale });
  }

  /** Small debris burst flying up and out from a hit. */
  private spawnSparks(pos: { x: number; y: number }, count: number, color = 0xffc66a): void {
    const now = performance.now();
    for (let i = 0; i < count && this.sparks.length < MAX_SPARKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3.5;
      this.sparks.push({
        x: pos.x,
        y: 0.5,
        z: pos.y,
        vx: Math.cos(a) * speed,
        vz: Math.sin(a) * speed,
        vy: 2.5 + Math.random() * 3,
        bornMs: now,
        lifeMs: 350 + Math.random() * 250,
        color,
      });
    }
  }

  private lastMs = performance.now();

  update(alpha: number): void {
    let arrowCount = 0;
    let stoneCount = 0;
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.lastMs) / 1000);
    this.lastMs = nowMs;

    for (const p of this.state.projectiles) {
      if (p.dead) continue;
      const x = lerp(p.prevPos.x, p.pos.x, alpha);
      const z = lerp(p.prevPos.y, p.pos.y, alpha);
      const total = Math.max(0.5, dist(p.startPos, p.targetPos));
      const traveled = dist(p.startPos, { x, y: z });
      const progress = Math.min(1, traveled / total);
      if (p.arc === 'lob') {
        if (stoneCount >= MAX_PROJECTILES) continue;
        const y = 0.6 + Math.sin(progress * Math.PI) * Math.min(9, total * 0.3);
        this.dummy.position.set(x, y, z);
        // Tumble in flight.
        this.dummy.rotation.set(progress * 9 + p.id, p.id * 1.3, progress * 5);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.stones.setMatrixAt(stoneCount++, this.dummy.matrix);
      } else {
        if (arrowCount >= MAX_PROJECTILES) continue;
        const dx = p.targetPos.x - x;
        const dz = p.targetPos.y - z;
        // Shallow arc: rise then dip, with the shaft pitched along the path.
        const arcH = Math.min(1.6, total * 0.12);
        const y = 1.0 + Math.sin(progress * Math.PI) * arcH;
        const pitch = Math.cos(progress * Math.PI) * Math.atan2(arcH * 2.4, total);
        this.dummy.position.set(x, y, z);
        this.dummy.rotation.set(0, -Math.atan2(dz, dx), pitch);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.arrows.setMatrixAt(arrowCount++, this.dummy.matrix);
      }
    }
    this.arrows.count = arrowCount;
    this.stones.count = stoneCount;
    this.arrows.instanceMatrix.needsUpdate = true;
    this.stones.instanceMatrix.needsUpdate = true;

    // Impact rings expand and fade over 400 ms.
    this.impacts = this.impacts.filter((imp) => {
      const age = (nowMs - imp.bornMs) / 400;
      if (age >= 1) {
        imp.mesh.removeFromParent();
        return false;
      }
      imp.mesh.scale.setScalar(imp.scaleBase * (1 + age * 3));
      (imp.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age;
      return true;
    });

    // Sparks: simple ballistic debris, shrinking as they die.
    let sparkCount = 0;
    this.sparks = this.sparks.filter((s) => {
      const age = (nowMs - s.bornMs) / s.lifeMs;
      if (age >= 1) return false;
      s.vy -= 14 * dt;
      s.x += s.vx * dt;
      s.y = Math.max(0.05, s.y + s.vy * dt);
      s.z += s.vz * dt;
      if (sparkCount < MAX_SPARKS) {
        this.dummy.position.set(s.x, s.y, s.z);
        this.dummy.rotation.set(0, age * 7, age * 5);
        this.dummy.scale.setScalar(1 - age * 0.7);
        this.dummy.updateMatrix();
        this.sparkMesh.setColorAt(sparkCount, this.sparkColor.setHex(s.color));
        this.sparkMesh.setMatrixAt(sparkCount++, this.dummy.matrix);
      }
      return true;
    });
    this.sparkMesh.count = sparkCount;
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
