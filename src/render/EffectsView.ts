import * as THREE from 'three';
import { dist, lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';

const MAX_PROJECTILES = 300;

/**
 * Projectile rendering: instanced arrows (flat shots) and stones (lobbed,
 * parabolic arc), plus short-lived impact rings.
 */
export class EffectsView {
  readonly root = new THREE.Group();
  private arrows: THREE.InstancedMesh;
  private stones: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private state: MatchState;
  private impacts: { pos: { x: number; y: number }; bornMs: number; mesh: THREE.Mesh; scaleBase: number }[] = [];
  private impactGeo = new THREE.RingGeometry(0.3, 0.5, 12);
  private impactMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, side: THREE.DoubleSide, depthWrite: false });

  constructor(state: MatchState) {
    this.state = state;
    const arrowGeo = new THREE.BoxGeometry(0.5, 0.04, 0.04);
    this.arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xd8cba8 }), MAX_PROJECTILES);
    const stoneGeo = new THREE.SphereGeometry(0.2, 5, 4);
    this.stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshBasicMaterial({ color: 0x777066 }), MAX_PROJECTILES);
    for (const m of [this.arrows, this.stones]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.root.add(m);
    }
    state.bus.on('projectileHit', ({ pos }) => this.spawnImpact(pos));
    state.bus.on('abilityCast', ({ pos }) => {
      if (pos) this.spawnImpact(pos, 0xd4af37, 3);
    });
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

  update(alpha: number): void {
    let arrowCount = 0;
    let stoneCount = 0;
    for (const p of this.state.projectiles) {
      if (p.dead) continue;
      const x = lerp(p.prevPos.x, p.pos.x, alpha);
      const z = lerp(p.prevPos.y, p.pos.y, alpha);
      if (p.arc === 'lob') {
        if (stoneCount >= MAX_PROJECTILES) continue;
        const total = Math.max(0.5, dist(p.startPos, p.targetPos));
        const traveled = dist(p.startPos, { x, y: z });
        const progress = Math.min(1, traveled / total);
        const y = 0.6 + Math.sin(progress * Math.PI) * Math.min(9, total * 0.3);
        this.dummy.position.set(x, y, z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.stones.setMatrixAt(stoneCount++, this.dummy.matrix);
      } else {
        if (arrowCount >= MAX_PROJECTILES) continue;
        const dx = p.targetPos.x - x;
        const dz = p.targetPos.y - z;
        this.dummy.position.set(x, 1.1, z);
        this.dummy.rotation.set(0, -Math.atan2(dz, dx), 0);
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
    const now = performance.now();
    this.impacts = this.impacts.filter((imp) => {
      const age = (now - imp.bornMs) / 400;
      if (age >= 1) {
        imp.mesh.removeFromParent();
        return false;
      }
      imp.mesh.scale.setScalar(imp.scaleBase * (1 + age * 3));
      (imp.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age;
      return true;
    });
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
