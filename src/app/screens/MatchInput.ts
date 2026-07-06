import * as THREE from 'three';
import type { Vec2 } from '@/core/mathUtils';
import { getBuilding } from '@/data/buildings';
import type { Card } from '@/data/types';
import type { MatchSim } from '@/sim/MatchSim';
import { validatePlacement } from '@/sim/systems/CardSystem';
import type { GhostPlacementView } from '@/render/GhostPlacementView';

export type InputMode =
  | { kind: 'normal' }
  | { kind: 'placing'; card: Card; rotation: number; dragging: boolean; lastPlacedCell: string | null }
  | { kind: 'targeting'; card: Card }
  | { kind: 'flagPlacing'; flagType: import('@/sim/commands').FlagType };

/**
 * Pointer interaction for the match: ground raycasting, building placement
 * (with wall drag-runs and R-rotation), and ability targeting. Selection and
 * direct orders are layered on by MatchSelection.
 */
export class MatchInput {
  mode: InputMode = { kind: 'normal' };
  /** Current pointer world position on the ground plane. */
  ground: Vec2 = { x: 0, y: 0 };
  pointerClient = { x: 0, y: 0 };

  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hit = new THREE.Vector3();
  private camera: THREE.PerspectiveCamera;
  private el: HTMLElement;
  private sim: MatchSim;
  private ghost: GhostPlacementView;
  private onModeChange: (mode: InputMode) => void;
  private disposers: (() => void)[] = [];
  /** Optional hooks set by MatchSelection. */
  onNormalClick: ((world: Vec2, e: PointerEvent) => void) | null = null;
  onNormalRightClick: ((world: Vec2, e: PointerEvent) => void) | null = null;
  onNormalDrag: ((start: { x: number; y: number }, end: { x: number; y: number }, done: boolean) => void) | null = null;
  onFlagPlace: ((flagType: import('@/sim/commands').FlagType, world: Vec2) => void) | null = null;

  private dragStart: { x: number; y: number } | null = null;
  private dragMoved = false;

  constructor(
    el: HTMLElement,
    camera: THREE.PerspectiveCamera,
    sim: MatchSim,
    ghost: GhostPlacementView,
    onModeChange: (mode: InputMode) => void,
  ) {
    this.el = el;
    this.camera = camera;
    this.sim = sim;
    this.ghost = ghost;
    this.onModeChange = onModeChange;

    const on = (type: string, fn: (e: never) => void, target: HTMLElement | Window = el) => {
      target.addEventListener(type, fn as EventListener);
      this.disposers.push(() => target.removeEventListener(type, fn as EventListener));
    };

    on('pointermove', (e: PointerEvent) => this.handleMove(e));
    on('pointerdown', (e: PointerEvent) => this.handleDown(e));
    on('pointerup', (e: PointerEvent) => this.handleUp(e));
    on('contextmenu', (e: MouseEvent) => e.preventDefault());
    on(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.code === 'KeyR' && this.mode.kind === 'placing') {
          this.mode.rotation = this.mode.rotation === 0 ? 1 : 0;
        }
        if (e.code === 'Escape' && this.mode.kind !== 'normal') {
          this.setMode({ kind: 'normal' });
        }
      },
      window,
    );
  }

  setMode(mode: InputMode): void {
    this.mode = mode;
    if (mode.kind !== 'placing') this.ghost.hide();
    this.onModeChange(mode);
  }

  startPlacing(card: Card): void {
    const def = getBuilding(card.buildingId!);
    this.ghost.show(def, this.sim.state.players[0].faction.colorPrimary);
    this.setMode({ kind: 'placing', card, rotation: 0, dragging: false, lastPlacedCell: null });
  }

  startTargeting(card: Card): void {
    this.setMode({ kind: 'targeting', card });
  }

  startFlagPlacing(flagType: import('@/sim/commands').FlagType): void {
    this.setMode({ kind: 'flagPlacing', flagType });
  }

  private updateGround(e: PointerEvent): void {
    const rect = this.el.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) {
      this.ground = { x: this.hit.x, y: this.hit.z };
    }
    this.pointerClient = { x: e.clientX, y: e.clientY };
  }

  private handleMove(e: PointerEvent): void {
    this.updateGround(e);
    if (this.mode.kind === 'placing') {
      this.updateGhost();
      if (this.mode.dragging) this.tryPlaceAtCursor();
    } else if (this.mode.kind === 'normal' && this.dragStart) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) this.dragMoved = true;
      if (this.dragMoved) this.onNormalDrag?.(this.dragStart, { x: e.clientX, y: e.clientY }, false);
    }
  }

  private updateGhost(): void {
    if (this.mode.kind !== 'placing') return;
    const def = getBuilding(this.mode.card.buildingId!);
    let [w, h] = def.footprint;
    if (this.mode.rotation === 1) [w, h] = [h, w];
    const cellX = Math.round(this.ground.x - w / 2);
    const cellY = Math.round(this.ground.y - h / 2);
    const result = validatePlacement(this.sim.state, def, cellX, cellY);
    this.ghost.update(cellX + w / 2, cellY + h / 2, w, h, result, this.mode.rotation);
  }

  private handleDown(e: PointerEvent): void {
    this.updateGround(e);
    if (e.button === 0) {
      if (this.mode.kind === 'placing') {
        this.mode.dragging = true;
        this.tryPlaceAtCursor();
      } else if (this.mode.kind === 'targeting') {
        this.sim.enqueue({ kind: 'playCard', player: 0, cardId: this.mode.card.id, target: { ...this.ground } });
        this.setMode({ kind: 'normal' });
      } else if (this.mode.kind === 'flagPlacing') {
        this.onFlagPlace?.(this.mode.flagType, { ...this.ground });
        this.setMode({ kind: 'normal' });
      } else {
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.dragMoved = false;
      }
    } else if (e.button === 2) {
      if (this.mode.kind !== 'normal') {
        this.setMode({ kind: 'normal' });
      } else {
        this.onNormalRightClick?.({ ...this.ground }, e);
      }
    }
  }

  private handleUp(e: PointerEvent): void {
    this.updateGround(e);
    if (e.button === 0) {
      if (this.mode.kind === 'placing') {
        this.mode.dragging = false;
        this.mode.lastPlacedCell = null;
        // Non-wall buildings exit placement after one placement (Shift keeps placing).
        const def = getBuilding(this.mode.card.buildingId!);
        if (!def.isWall && !e.shiftKey) this.setMode({ kind: 'normal' });
      } else if (this.mode.kind === 'normal' && this.dragStart) {
        if (this.dragMoved) {
          this.onNormalDrag?.(this.dragStart, { x: e.clientX, y: e.clientY }, true);
        } else {
          this.onNormalClick?.({ ...this.ground }, e);
        }
        this.dragStart = null;
        this.dragMoved = false;
      }
    }
  }

  private tryPlaceAtCursor(): void {
    if (this.mode.kind !== 'placing') return;
    const def = getBuilding(this.mode.card.buildingId!);
    let [w, h] = def.footprint;
    if (this.mode.rotation === 1) [w, h] = [h, w];
    const cellX = Math.round(this.ground.x - w / 2);
    const cellY = Math.round(this.ground.y - h / 2);
    const cellKey = `${cellX}:${cellY}`;
    if (this.mode.lastPlacedCell === cellKey) return;
    const result = validatePlacement(this.sim.state, def, cellX, cellY);
    if (result === 'blocked') return;
    this.mode.lastPlacedCell = cellKey;
    this.sim.enqueue({
      kind: 'playCard',
      player: 0,
      cardId: this.mode.card.id,
      target: { x: cellX + w / 2, y: cellY + h / 2 },
      rotation: this.mode.rotation,
    });
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
  }
}
