import * as THREE from 'three';
import type { Slot } from '../palette';
import { node, type Node, type Transform } from './node';

/**
 * Dimensioned primitives. Everything takes absolute world-unit sizes rather
 * than scale factors, so a blueprint reads as a description of a real object.
 *
 * Segment counts are deliberately low — this is a low-poly game seen from a
 * fixed RTS distance, and the faceting is part of the look.
 */

type Opts = Transform & { slot: Slot; layer?: Node['layer'] };

/** Box. */
export function slab(o: Opts & { w: number; h: number; d: number }): Node[] {
  return [node(new THREE.BoxGeometry(o.w, o.h, o.d), o.slot, o)];
}

/** Cylinder or tapered post. `taper` < 1 narrows the top. */
export function post(o: Opts & { r: number; h: number; sides?: number; taper?: number }): Node[] {
  const rTop = o.r * (o.taper ?? 1);
  return [node(new THREE.CylinderGeometry(rTop, o.r, o.h, o.sides ?? 6), o.slot, o)];
}

/** Cone. */
export function spike(o: Opts & { r: number; h: number; sides?: number }): Node[] {
  return [node(new THREE.ConeGeometry(o.r, o.h, o.sides ?? 6), o.slot, o)];
}

/** Sphere. */
export function ball(o: Opts & { r: number; segments?: number }): Node[] {
  const s = o.segments ?? 6;
  return [node(new THREE.SphereGeometry(o.r, s, Math.max(3, s - 2)), o.slot, o)];
}

/**
 * Gable wedge — a triangular prism, the classic pitched roof, with the ridge
 * running along z.
 *
 * Built as an explicit indexed geometry rather than via `ExtrudeGeometry`.
 * Extrude produces *non-indexed* geometry, and `mergeGeometries` returns null
 * when asked to merge a mix of indexed and non-indexed inputs — one extruded
 * roof silently emptied every other part of the building it belonged to.
 * Corner vertices are duplicated per face so the facets stay flat-shaded.
 */
export function prism(o: Opts & { w: number; h: number; d: number }): Node[] {
  const hw = o.w / 2;
  const hd = o.d / 2;
  // Six corners: back triangle (z-) then front triangle (z+).
  const c: [number, number, number][] = [
    [-hw, 0, -hd],
    [hw, 0, -hd],
    [0, o.h, -hd],
    [-hw, 0, hd],
    [hw, 0, hd],
    [0, o.h, hd],
  ];
  // Faces, each with its own vertex copies so normals stay per-face.
  const faces: [number, number, number][] = [
    [0, 2, 1], // back gable
    [3, 4, 5], // front gable
    [0, 3, 5], [0, 5, 2], // left pitch
    [1, 2, 5], [1, 5, 4], // right pitch
    [0, 1, 4], [0, 4, 3], // underside
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [a, b, cc] of faces) {
    const base = positions.length / 3;
    for (const idx of [a, b, cc]) positions.push(c[idx][0], c[idx][1], c[idx][2]);
    indices.push(base, base + 1, base + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // A uv attribute is required so this merges with the primitive geometries,
  // which all carry one.
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return [node(geo, o.slot, o)];
}

/**
 * Hemisphere or onion dome. `onion` > 0 bulges the profile outward before it
 * closes, which is what separates a Middle Eastern dome from a plain cap.
 */
export function dome(o: Opts & { r: number; h: number; onion?: number; segments?: number }): Node[] {
  const seg = o.segments ?? 10;
  const onion = o.onion ?? 0;
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; // 0 at base, 1 at apex
    const bulge = 1 + onion * Math.sin(t * Math.PI) * 0.6;
    const radius = Math.cos((t * Math.PI) / 2) * o.r * bulge;
    points.push(new THREE.Vector2(Math.max(0.0001, radius), t * o.h));
  }
  const geo = new THREE.LatheGeometry(points, 8);
  return [node(geo, o.slot, o)];
}

/**
 * A frustum — wider at the base than the top. The workhorse for battered
 * (inward-leaning) mudbrick and sandstone walls.
 */
export function batteredBox(o: Opts & { w: number; h: number; d: number; taper?: number }): Node[] {
  const t = o.taper ?? 0.85;
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1);
  geo.rotateY(Math.PI / 4); // square-on rather than diamond-on
  // Squash the top ring inward by scaling the upper vertices.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * t);
      pos.setZ(i, pos.getZ(i) * t);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.scale(o.w * Math.SQRT2, o.h, o.d * Math.SQRT2);
  geo.translate(0, o.h / 2, 0);
  return [node(geo, o.slot, o)];
}

/** A flat plate — floors, banners, shield faces, awnings. */
export function plate(o: Opts & { w: number; h: number; thickness?: number }): Node[] {
  return [node(new THREE.BoxGeometry(o.w, o.h, o.thickness ?? 0.04), o.slot, o)];
}

/**
 * Crenellations: merlons stepped around the top of a rectangular wall. The
 * single most legible "this is a castle" cue at distance.
 */
export function crenellation(o: {
  halfW: number;
  halfD: number;
  y: number;
  step: number;
  slot: Slot;
  size?: number;
}): Node[] {
  const out: Node[] = [];
  const s = o.size ?? o.step * 0.5;
  const place = (x: number, z: number): void => {
    out.push(...slab({ w: s, h: s * 1.1, d: s, x, y: o.y + s * 0.55, z, slot: o.slot }));
  };
  for (let x = -o.halfW; x <= o.halfW + 1e-6; x += o.step) {
    place(x, -o.halfD);
    place(x, o.halfD);
  }
  for (let z = -o.halfD + o.step; z <= o.halfD - o.step + 1e-6; z += o.step) {
    place(-o.halfW, z);
    place(o.halfW, z);
  }
  return out;
}
