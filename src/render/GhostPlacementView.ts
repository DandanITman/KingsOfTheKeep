import * as THREE from 'three';
import type { BuildingDef } from '@/data/types';
import type { PlacementResult } from '@/sim/systems/CardSystem';
import { buildBuilding } from './art';

const TINT: Record<PlacementResult, number> = {
  ok: 0x44ff66,
  inefficient: 0xffdd44,
  blocked: 0xff4433,
};

/** Transparent ghost preview for building placement (GDD §14.4). */
export class GhostPlacementView {
  readonly root = new THREE.Group();
  private ghost: THREE.Group | null = null;
  private footprintPlane: THREE.Mesh;
  private radiusRing: THREE.Mesh;
  private currentMeshKey: string | null = null;

  constructor() {
    this.footprintPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.footprintPlane.rotation.x = -Math.PI / 2;
    this.footprintPlane.position.y = 0.06;

    this.radiusRing = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1.0, 48),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.radiusRing.rotation.x = -Math.PI / 2;
    this.radiusRing.position.y = 0.08;

    this.root.add(this.footprintPlane, this.radiusRing);
    this.root.visible = false;
  }

  show(def: BuildingDef, teamColor: number, faction = ''): void {
    if (this.currentMeshKey !== def.mesh) {
      if (this.ghost) this.ghost.removeFromParent();
      this.ghost = buildBuilding(def.mesh, faction, teamColor, { footprint: def.footprint as [number, number] });
      this.ghost.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = (o.material as THREE.MeshLambertMaterial).clone();
          m.transparent = true;
          m.opacity = 0.55;
          m.depthWrite = false;
          o.material = m;
          o.castShadow = false;
        }
      });
      this.root.add(this.ghost);
      this.currentMeshKey = def.mesh;
    }
    this.root.visible = true;
    this.radiusRing.visible = !!def.gatherRadius;
    if (def.gatherRadius) {
      this.radiusRing.scale.set(def.gatherRadius, def.gatherRadius, 1);
    }
  }

  /** Position at world coords with footprint w×h and validity tint. */
  update(x: number, y: number, w: number, h: number, result: PlacementResult, rotation: number): void {
    this.root.position.set(x, 0, y);
    if (this.ghost) this.ghost.rotation.y = rotation === 1 ? Math.PI / 2 : 0;
    this.footprintPlane.scale.set(w, h, 1);
    (this.footprintPlane.material as THREE.MeshBasicMaterial).color.setHex(TINT[result]);
  }

  hide(): void {
    this.root.visible = false;
    if (this.ghost) {
      this.ghost.removeFromParent();
      this.ghost = null;
      this.currentMeshKey = null;
    }
  }
}
