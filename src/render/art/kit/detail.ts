import * as THREE from 'three';
import type { Node } from './node';
import { measure } from './node';

/**
 * Baked ambient occlusion.
 *
 * The single highest value-per-line item in the art system: it costs nothing at
 * runtime (it is just vertex colours, computed once at build time and merged
 * into the same buffer the geometry already carries) and it is most of what
 * separates flat untextured primitives from something that looks hand-painted.
 *
 * Two cheap cues, both of which match how light actually behaves on a building:
 *  - Contact darkening. Surfaces near the ground receive less sky light, so
 *    everything gets progressively darker toward y = 0. This is what visually
 *    "sits" a mesh on the terrain.
 *  - Downward-facing darkening. Undersides of eaves, overhangs and ledges see
 *    almost no sky, so they darken by surface normal.
 */
export interface AoOptions {
  /** Height over which contact darkening fades out. */
  falloff?: number;
  /** How dark the very bottom gets. 0 = none, 1 = black. */
  strength?: number;
  /** Extra darkening for downward-facing faces. */
  underside?: number;
}

/**
 * Compute a per-vertex AO multiplier for one geometry, given the overall height
 * of the object it belongs to. Returns a Float32Array of one value per vertex.
 */
export function aoFactors(geo: THREE.BufferGeometry, totalHeight: number, opts: AoOptions = {}): Float32Array {
  const falloff = opts.falloff ?? Math.max(0.35, totalHeight * 0.42);
  const strength = opts.strength ?? 0.42;
  const underside = opts.underside ?? 0.2;

  const pos = geo.attributes.position as THREE.BufferAttribute;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute;

  const out = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // 0 at the ground, 1 once clear of it.
    const lift = Math.min(1, Math.max(0, y) / falloff);
    let factor = 1 - strength * (1 - lift) * (1 - lift);

    // Downward-facing surfaces see no sky.
    const ny = nrm.getY(i);
    if (ny < 0) factor *= 1 - underside * Math.min(1, -ny);

    out[i] = factor;
  }
  return out;
}

/**
 * Write a flat colour into a geometry's vertex colours, modulated by baked AO.
 * This is how a slot colour becomes per-vertex data the merged buffer carries.
 */
export function applyVertexColor(
  geo: THREE.BufferGeometry,
  hex: number,
  totalHeight: number,
  opts: AoOptions = {},
): void {
  const color = new THREE.Color(hex);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ao = aoFactors(geo, totalHeight, opts);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const f = ao[i];
    colors[i * 3] = color.r * f;
    colors[i * 3 + 1] = color.g * f;
    colors[i * 3 + 2] = color.b * f;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Bake AO into every node of a set, using the set's own height as the falloff
 * reference so a wall and a watchtower each darken over a sensible distance.
 */
export function bakeAo(nodes: Node[], palette: Readonly<Record<string, number>>, opts: AoOptions = {}): void {
  const box = measure(nodes);
  const height = Math.max(0.2, box.max.y - box.min.y);
  for (const n of nodes) {
    applyVertexColor(n.geo, palette[n.slot] ?? 0xffffff, height, opts);
  }
}
