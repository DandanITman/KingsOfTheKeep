import * as THREE from 'three';
import type { Slot } from '../palette';

/**
 * A single piece of geometry tagged with the material slot it should take and
 * which render layer it belongs to.
 *
 * `layer` matches the existing three-layer instancing model that `UnitView`
 * draws with, and must be preserved:
 *   body   — fixed colours, baked into vertex colours
 *   team   — recoloured per player via per-instance colour
 *   action — weapon / tool parts the renderer swings around a pivot
 */
export interface Node {
  geo: THREE.BufferGeometry;
  slot: Slot;
  layer?: 'body' | 'team' | 'action';
}

export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/** Build a node from a geometry, applying rotation then translation. */
export function node(geo: THREE.BufferGeometry, slot: Slot, t: Transform & { layer?: Node['layer'] } = {}): Node {
  if (t.rx) geo.rotateX(t.rx);
  if (t.ry) geo.rotateY(t.ry);
  if (t.rz) geo.rotateZ(t.rz);
  if (t.x || t.y || t.z) geo.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  return { geo, slot, layer: t.layer };
}

/** Move a group of nodes. Mutates in place — nodes are build-time scratch. */
export function at(nodes: Node[], t: Transform): Node[] {
  for (const n of nodes) {
    if (t.rx) n.geo.rotateX(t.rx);
    if (t.ry) n.geo.rotateY(t.ry);
    if (t.rz) n.geo.rotateZ(t.rz);
    if (t.x || t.y || t.z) n.geo.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  }
  return nodes;
}

/** Scale a group of nodes about the origin. */
export function scaled(nodes: Node[], s: number | [number, number, number]): Node[] {
  const [sx, sy, sz] = typeof s === 'number' ? [s, s, s] : s;
  for (const n of nodes) n.geo.scale(sx, sy, sz);
  return nodes;
}

/** Mirror a group across x, e.g. to make a left arm from a right one. */
export function mirrorX(nodes: Node[]): Node[] {
  for (const n of nodes) {
    n.geo.scale(-1, 1, 1);
    // Flipping one axis inverts winding; fix normals so lighting stays correct.
    n.geo.computeVertexNormals();
  }
  return nodes;
}

/** Deep-copy nodes so a shared sub-assembly can be placed more than once. */
export function clone(nodes: Node[]): Node[] {
  return nodes.map((n) => ({ geo: n.geo.clone(), slot: n.slot, layer: n.layer }));
}

/** Place `n` copies of something evenly around a circle of radius `r`. */
export function ring(n: number, r: number, fn: (index: number, angle: number) => Node[]): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(...at(fn(i, a), { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a }));
  }
  return out;
}

/** Measured bounds of a node set. */
export function measure(nodes: Node[]): THREE.Box3 {
  const box = new THREE.Box3();
  box.makeEmpty();
  const v = new THREE.Vector3();
  for (const n of nodes) {
    const pos = n.geo.attributes.position;
    if (!pos) continue;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos as THREE.BufferAttribute, i);
      box.expandByPoint(v);
    }
  }
  return box;
}

/**
 * Lift or drop the whole set so its lowest point sits exactly at y = 0.
 * Called by both compilers, so "grounded" is structural rather than something
 * each blueprint has to remember.
 */
export function ground(nodes: Node[]): Node[] {
  const box = measure(nodes);
  if (!Number.isFinite(box.min.y)) return nodes;
  if (Math.abs(box.min.y) > 1e-6) at(nodes, { y: -box.min.y });
  return nodes;
}

/**
 * Scale the set uniformly so its height matches `height` exactly.
 *
 * This is the one place normalization is allowed, and it is intentional: a
 * blueprint is authored at whatever proportions read best, then pinned to its
 * declared contract height. It differs from the bug it replaces in that the
 * target is a *declared height* rather than a measured horizontal footprint,
 * and `tests/art.test.ts` re-measures afterwards to prove it took.
 */
export function fitHeight(nodes: Node[], height: number): Node[] {
  const box = measure(nodes);
  const h = box.max.y - box.min.y;
  if (!Number.isFinite(h) || h < 1e-6) return nodes;
  scaled(nodes, height / h);
  return ground(nodes);
}
