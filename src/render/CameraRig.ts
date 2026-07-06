import * as THREE from 'three';
import { clamp } from '@/core/mathUtils';
import type { Vec2 } from '@/core/mathUtils';
import type { DisplayOptions } from '@/data/types';

/**
 * RTS camera: a ground-plane target with orbit yaw, fixed pitch band, and
 * zoom. WASD/arrow pan, edge scroll, Q/E + middle-drag rotate, wheel zoom,
 * Space jumps home.
 */
export class CameraRig {
  target = new THREE.Vector3();
  yaw = -Math.PI / 4;
  zoom = 42; // distance
  private pitch = 0.92; // radians above horizon
  private keys = new Set<string>();
  private middleDrag = false;
  private lastMouse = { x: 0, y: 0 };
  private mouseOnEdge = { x: 0, y: 0 };
  private home: Vec2;
  private bounds: { w: number; h: number };
  private el: HTMLElement;
  private display: DisplayOptions;
  private disposers: (() => void)[] = [];

  constructor(el: HTMLElement, home: Vec2, bounds: { w: number; h: number }, display: DisplayOptions) {
    this.el = el;
    this.home = home;
    this.bounds = bounds;
    this.display = display;
    this.target.set(home.x, 0, home.y);

    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: K | string, fn: (e: never) => void) => {
      target.addEventListener(type as string, fn as EventListener);
      this.disposers.push(() => target.removeEventListener(type as string, fn as EventListener));
    };

    on(window, 'keydown', (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpTo(this.home);
      }
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    on(window, 'blur', () => this.keys.clear());

    on(el, 'wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 1.12 : 0.89), 14, 95);
    });

    on(el, 'pointerdown', (e: PointerEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        this.middleDrag = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    on(window, 'pointerup', (e: PointerEvent) => {
      if (e.button === 1) this.middleDrag = false;
    });
    on(window, 'pointermove', (e: PointerEvent) => {
      if (this.middleDrag) {
        this.yaw -= (e.clientX - this.lastMouse.x) * 0.005;
        this.pitch = clamp(this.pitch + (e.clientY - this.lastMouse.y) * 0.003, 0.55, 1.25);
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
      const rect = this.el.getBoundingClientRect();
      const edge = 14;
      this.mouseOnEdge.x = e.clientX < rect.left + edge ? -1 : e.clientX > rect.right - edge ? 1 : 0;
      this.mouseOnEdge.y = e.clientY < rect.top + edge ? -1 : e.clientY > rect.bottom - edge ? 1 : 0;
    });
    on(el, 'pointerleave', () => {
      this.mouseOnEdge.x = 0;
      this.mouseOnEdge.y = 0;
    });
  }

  jumpTo(pos: Vec2): void {
    this.target.set(pos.x, 0, pos.y);
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    const speed = 32 * this.display.cameraSpeed * (this.zoom / 42) * dt;
    let mx = 0;
    let mz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.display.edgeScroll) {
      mx += this.mouseOnEdge.x;
      mz += this.mouseOnEdge.y;
    }
    if (this.keys.has('KeyQ')) this.yaw += 1.6 * dt;
    if (this.keys.has('KeyE')) this.yaw -= 1.6 * dt;

    if (mx !== 0 || mz !== 0) {
      const cos = Math.cos(this.yaw);
      const sin = Math.sin(this.yaw);
      this.target.x += (mx * cos - mz * sin) * speed;
      this.target.z += (mx * sin + mz * cos) * speed;
    }
    this.target.x = clamp(this.target.x, 4, this.bounds.w - 4);
    this.target.z = clamp(this.target.z, 4, this.bounds.h - 4);

    const horiz = Math.cos(this.pitch) * this.zoom;
    const up = Math.sin(this.pitch) * this.zoom;
    camera.position.set(
      this.target.x - Math.sin(this.yaw) * horiz,
      up,
      this.target.z - Math.cos(this.yaw) * horiz,
    );
    camera.lookAt(this.target);
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
  }
}
