/**
 * Procedural low-poly unit archetype geometry. Each archetype bakes into two
 * merged BufferGeometries: `body` (fixed colors, vertex-colored) and `team`
 * (team-tinted parts rendered with per-instance color). UnitView draws each
 * archetype as two InstancedMeshes — a handful of draw calls for whole armies.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Part {
  geo: THREE.BufferGeometry;
  color: number;
  team?: boolean;
}

function P(
  geo: THREE.BufferGeometry,
  color: number,
  t: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; team?: boolean } = {},
): Part {
  if (t.rx) geo.rotateX(t.rx);
  if (t.ry) geo.rotateY(t.ry);
  if (t.rz) geo.rotateZ(t.rz);
  geo.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  return { geo, color, team: t.team };
}

const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const C = (rt: number, rb: number, h: number, seg = 5) => new THREE.CylinderGeometry(rt, rb, h, seg);
const S = (r: number) => new THREE.SphereGeometry(r, 5, 4);
const CO = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg);

// Palette
const SKIN = 0xd9a066;
const CLOTH = 0x8a7a5a;
const LEATHER = 0x6b4a2a;
const IRON = 0x9aa2ad;
const STEEL = 0xc8d0da;
const DARKIRON = 0x5a6068;
const WOODC = 0x8a6a3a;
const DARKWOOD = 0x5d4526;
const HORSE = 0x7a5230;
const GOLD = 0xd4af37;

// --- shared sub-assemblies (return Part[]) ---

function humanoid(opts: { cloth?: number; armored?: boolean; scale?: number } = {}): Part[] {
  const s = opts.scale ?? 1;
  const bodyColor = opts.armored ? IRON : (opts.cloth ?? CLOTH);
  return [
    P(C(0.16 * s, 0.2 * s, 0.55 * s), bodyColor, { y: 0.5 * s }), // torso
    P(S(0.13 * s), SKIN, { y: 0.92 * s }), // head
    P(B(0.3 * s, 0.3 * s, 0.18 * s), bodyColor, { y: 0.16 * s }), // legs block
    P(B(0.12 * s, 0.1 * s, 0.34 * s), bodyColor, { y: 0.98 * s, team: true }), // helm/cap plume strip
  ];
}

function horse(color = HORSE, scale = 1): Part[] {
  const s = scale;
  return [
    P(B(0.9 * s, 0.42 * s, 0.36 * s), color, { y: 0.62 * s }), // body
    P(B(0.26 * s, 0.3 * s, 0.22 * s), color, { x: 0.52 * s, y: 0.88 * s }), // head
    P(B(0.1 * s, 0.34 * s, 0.16 * s), color, { x: 0.42 * s, y: 0.78 * s, rz: -0.5 }), // neck
    P(B(0.09 * s, 0.42 * s, 0.09 * s), color, { x: 0.32 * s, y: 0.21 * s, z: 0.12 * s }),
    P(B(0.09 * s, 0.42 * s, 0.09 * s), color, { x: 0.32 * s, y: 0.21 * s, z: -0.12 * s }),
    P(B(0.09 * s, 0.42 * s, 0.09 * s), color, { x: -0.32 * s, y: 0.21 * s, z: 0.12 * s }),
    P(B(0.09 * s, 0.42 * s, 0.09 * s), color, { x: -0.32 * s, y: 0.21 * s, z: -0.12 * s }),
  ];
}

function rider(scale = 1): Part[] {
  const s = scale;
  return [
    P(C(0.13 * s, 0.16 * s, 0.42 * s), IRON, { y: 1.05 * s }),
    P(S(0.11 * s), SKIN, { y: 1.36 * s }),
    P(B(0.1 * s, 0.08 * s, 0.28 * s), IRON, { y: 1.42 * s, team: true }),
  ];
}

function wheels(n: 2 | 4, radius: number, y: number, spanX: number, spanZ: number): Part[] {
  const parts: Part[] = [];
  const xs = n === 2 ? [0] : [-spanX, spanX];
  for (const x of xs) {
    for (const z of [-spanZ, spanZ]) {
      parts.push(P(C(radius, radius, 0.08, 8), DARKWOOD, { x, y, z, rx: Math.PI / 2 }));
    }
  }
  return parts;
}

// --- archetype definitions ---

const ARCHETYPES: Record<string, () => Part[]> = {
  worker: () => [
    ...humanoid({ cloth: LEATHER }),
    P(B(0.05, 0.4, 0.05), WOODC, { x: 0.2, y: 0.62, rz: -0.5 }), // tool haft
    P(B(0.12, 0.1, 0.04), DARKIRON, { x: 0.3, y: 0.8, rz: -0.5 }), // tool head
  ],
  swordsman: () => [
    ...humanoid(),
    P(B(0.05, 0.62, 0.1), STEEL, { x: 0.24, y: 0.75, rz: -0.35 }), // sword
    P(B(0.05, 0.34, 0.3), LEATHER, { x: -0.24, y: 0.6, team: true }), // small shield
  ],
  spearman: () => [
    ...humanoid({ cloth: LEATHER }),
    P(C(0.025, 0.025, 1.7, 4), WOODC, { x: 0.22, y: 0.9, rz: -0.12 }), // long spear
    P(CO(0.05, 0.2, 4), STEEL, { x: 0.32, y: 1.78 }),
  ],
  shieldman: () => [
    ...humanoid({ armored: true }),
    P(B(0.08, 0.72, 0.5), 0x7a6134, { x: -0.26, y: 0.55, team: true }), // tower shield
    P(B(0.04, 0.4, 0.08), STEEL, { x: 0.24, y: 0.66, rz: -0.3 }),
  ],
  champion: () => [
    ...humanoid({ armored: true, scale: 1.15 }),
    P(B(0.06, 0.75, 0.12), GOLD, { x: 0.27, y: 0.85, rz: -0.3 }),
    P(B(0.06, 0.4, 0.34), GOLD, { x: -0.27, y: 0.66, team: true }),
    P(CO(0.06, 0.3, 4), 0xc23b2e, { y: 1.28 }), // crest
  ],
  archer: () => [
    ...humanoid({ cloth: 0x5d6b3a }),
    P(B(0.04, 0.9, 0.04), DARKWOOD, { x: -0.24, y: 0.72, rz: 0.15 }), // bow stave
    P(B(0.05, 0.3, 0.12), LEATHER, { x: 0.14, y: 0.7, z: -0.16 }), // quiver
  ],
  crossbow: () => [
    ...humanoid({ cloth: 0x4a5568 }),
    P(B(0.5, 0.05, 0.08), DARKWOOD, { x: 0.1, y: 0.85 }), // stock
    P(B(0.06, 0.05, 0.45), STEEL, { x: 0.3, y: 0.85 }), // bow arms
  ],
  support: () => [
    P(CO(0.28, 0.85, 6), 0xd9cdb0, { y: 0.45 }), // robe
    P(S(0.13), SKIN, { y: 0.98 }),
    P(B(0.1, 0.08, 0.3), 0xd9cdb0, { y: 1.05, team: true }),
    P(C(0.02, 0.02, 1.2, 4), WOODC, { x: 0.24, y: 0.7 }), // staff
    P(S(0.06), GOLD, { x: 0.24, y: 1.32 }),
  ],
  banner: () => [
    ...humanoid({ armored: true }),
    P(C(0.03, 0.03, 1.9, 4), DARKWOOD, { x: -0.22, y: 1.0 }),
    P(B(0.04, 0.5, 0.62), 0xffffff, { x: -0.22, y: 1.72, z: 0.3, team: true }), // large banner
  ],
  lightCavalry: () => [...horse(0x8a6a4a, 0.9), ...rider(0.9)],
  cavalry: () => [
    ...horse(),
    ...rider(),
    P(B(0.04, 0.5, 0.09), STEEL, { x: 0.3, y: 1.3, rz: -0.4 }),
  ],
  knight: () => [
    ...horse(0x6a625a),
    P(B(0.95, 0.2, 0.42), 0xffffff, { y: 0.5, team: true }), // caparison
    ...rider(),
    P(C(0.025, 0.025, 1.6, 4), WOODC, { x: 0.45, y: 1.25, rz: -1.2 }), // lance
    P(CO(0.05, 0.18, 4), STEEL, { x: 1.15, y: 1.62, rz: -1.2 }),
  ],
  paladin: () => [
    ...horse(0xe8e2d4, 1.1),
    P(B(1.0, 0.22, 0.46), GOLD, { y: 0.56, team: true }),
    ...rider(1.1),
    P(B(0.07, 0.8, 0.14), GOLD, { x: 0.34, y: 1.5, rz: -0.4 }),
  ],
  cart: () => [
    P(B(0.9, 0.3, 0.6), WOODC, { y: 0.45 }),
    ...wheels(4, 0.22, 0.22, 0.35, 0.34),
    P(B(0.55, 0.35, 0.4), 0x8a8a6a, { x: 0.75, y: 0.4 }), // ox
    P(B(0.18, 0.2, 0.24), 0x8a8a6a, { x: 1.1, y: 0.55 }),
  ],
  ram: () => [
    P(B(1.4, 0.08, 0.7), DARKWOOD, { y: 0.95 }), // roof
    P(B(1.3, 0.5, 0.06), WOODC, { y: 0.6, z: 0.34 }),
    P(B(1.3, 0.5, 0.06), WOODC, { y: 0.6, z: -0.34 }),
    P(C(0.12, 0.12, 1.5, 6), 0x4a3a20, { y: 0.55, rz: Math.PI / 2 }), // log
    P(CO(0.14, 0.25, 5), DARKIRON, { x: 0.85, y: 0.55, rz: -Math.PI / 2 }),
    ...wheels(4, 0.18, 0.18, 0.55, 0.38),
  ],
  catapult: () => [
    P(B(1.1, 0.18, 0.7), WOODC, { y: 0.3 }),
    ...wheels(4, 0.2, 0.2, 0.42, 0.38),
    P(B(0.08, 0.08, 1.1), DARKWOOD, { x: -0.1, y: 0.75, rx: 0, rz: 0.5 }), // arm
    P(B(0.22, 0.1, 0.22), LEATHER, { x: -0.5, y: 1.05 }), // basket
    P(B(0.4, 0.35, 0.5), DARKWOOD, { x: 0.35, y: 0.45 }), // frame
  ],
  trebuchet: () => [
    P(B(1.2, 0.18, 0.9), WOODC, { y: 0.25 }),
    P(B(0.09, 1.3, 0.09), DARKWOOD, { x: 0, y: 0.9, z: 0.3, rz: 0.15 }),
    P(B(0.09, 1.3, 0.09), DARKWOOD, { x: 0, y: 0.9, z: -0.3, rz: 0.15 }),
    P(B(0.08, 0.08, 2.2), DARKWOOD, { y: 1.5, rz: 0, rx: 0, ry: Math.PI / 2, team: false, x: -0.3 }),
    P(B(0.35, 0.35, 0.35), DARKIRON, { x: 0.75, y: 1.2 }), // counterweight
  ],
  ballista: () => [
    P(B(0.9, 0.15, 0.6), WOODC, { y: 0.35 }),
    ...wheels(4, 0.18, 0.18, 0.32, 0.32),
    P(B(0.7, 0.08, 0.08), DARKWOOD, { y: 0.6, rz: 0.1 }),
    P(B(0.06, 0.06, 0.9), DARKWOOD, { x: 0.15, y: 0.62 }), // bow arms
    P(B(0.5, 0.05, 0.05), STEEL, { x: 0.3, y: 0.63 }), // bolt
  ],
  bombard: () => [
    P(C(0.2, 0.26, 1.3, 8), 0x3a3f45, { y: 0.55, rz: Math.PI / 2, x: 0.1 }), // barrel
    P(B(0.9, 0.3, 0.7), DARKWOOD, { y: 0.3 }),
    ...wheels(4, 0.26, 0.26, 0.35, 0.42),
  ],
  siegeTower: () => [
    P(B(0.9, 2.0, 0.9), WOODC, { y: 1.1 }),
    P(B(1.0, 0.15, 1.0), DARKWOOD, { y: 2.2 }),
    P(B(0.2, 0.4, 0.9), DARKWOOD, { y: 2.4 }),
    ...wheels(4, 0.24, 0.24, 0.4, 0.46),
    P(B(0.1, 0.5, 0.5), 0xffffff, { y: 2.5, x: 0.4, team: true }),
  ],
  monk: () => [
    P(CO(0.26, 0.8, 6), 0xc98a3d, { y: 0.42 }), // saffron robe
    P(S(0.13), SKIN, { y: 0.95 }),
    P(C(0.02, 0.02, 1.3, 4), WOODC, { x: 0.24, y: 0.7 }),
    P(S(0.07), GOLD, { x: 0.24, y: 1.38 }),
    P(B(0.1, 0.06, 0.28, ), 0xc98a3d, { y: 1.04, team: true }),
  ],
  horseArcher: () => [
    ...horse(0x8a6a4a, 0.95),
    ...rider(0.9),
    P(B(0.04, 0.8, 0.04), DARKWOOD, { x: 0.3, y: 1.25, rz: 0.2 }), // bow
    P(B(0.05, 0.28, 0.1), LEATHER, { x: -0.3, y: 1.0, z: -0.14 }), // quiver
  ],
  camelRider: () => [
    // Camel: taller, humped, long neck.
    P(B(0.85, 0.4, 0.32), 0xc9a55a, { y: 0.75 }),
    P(S(0.24), 0xc9a55a, { y: 1.0 }), // hump
    P(B(0.1, 0.5, 0.14), 0xc9a55a, { x: 0.5, y: 1.05, rz: -0.35 }), // neck
    P(B(0.2, 0.18, 0.16), 0xc9a55a, { x: 0.68, y: 1.32 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: 0.32, y: 0.28, z: 0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: 0.32, y: 0.28, z: -0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: -0.32, y: 0.28, z: 0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: -0.32, y: 0.28, z: -0.12 }),
    P(C(0.12, 0.15, 0.4, 5), IRON, { y: 1.35 }),
    P(S(0.1), SKIN, { y: 1.62 }),
    P(B(0.09, 0.07, 0.26), 0xffffff, { y: 1.68, team: true }),
    P(B(0.04, 0.5, 0.08), STEEL, { x: 0.26, y: 1.5, rz: -0.4 }), // scimitar
  ],
  camelArcher: () => [
    P(B(0.85, 0.4, 0.32), 0xc9a55a, { y: 0.75 }),
    P(S(0.24), 0xc9a55a, { y: 1.0 }),
    P(B(0.1, 0.5, 0.14), 0xc9a55a, { x: 0.5, y: 1.05, rz: -0.35 }),
    P(B(0.2, 0.18, 0.16), 0xc9a55a, { x: 0.68, y: 1.32 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: 0.32, y: 0.28, z: 0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: 0.32, y: 0.28, z: -0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: -0.32, y: 0.28, z: 0.12 }),
    P(B(0.08, 0.55, 0.08), 0xc9a55a, { x: -0.32, y: 0.28, z: -0.12 }),
    P(C(0.12, 0.15, 0.4, 5), CLOTH, { y: 1.35 }),
    P(S(0.1), SKIN, { y: 1.62 }),
    P(B(0.09, 0.07, 0.26), 0xffffff, { y: 1.68, team: true }),
    P(B(0.04, 0.75, 0.04), DARKWOOD, { x: 0.28, y: 1.45, rz: 0.15 }), // bow
  ],
  elephant: () => [
    P(B(1.5, 0.9, 0.8), 0x8a8578, { y: 0.95 }),
    P(B(0.55, 0.55, 0.5), 0x8a8578, { x: 0.9, y: 1.15 }),
    P(C(0.07, 0.1, 0.8, 5), 0x8a8578, { x: 1.25, y: 0.7, rz: 0.4 }), // trunk
    P(CO(0.06, 0.4, 4), 0xe8e2d4, { x: 1.15, y: 0.85, z: 0.2, rz: -1.2 }), // tusks
    P(CO(0.06, 0.4, 4), 0xe8e2d4, { x: 1.15, y: 0.85, z: -0.2, rz: -1.2 }),
    P(B(0.18, 0.65, 0.18), 0x8a8578, { x: 0.55, y: 0.32, z: 0.26 }),
    P(B(0.18, 0.65, 0.18), 0x8a8578, { x: 0.55, y: 0.32, z: -0.26 }),
    P(B(0.18, 0.65, 0.18), 0x8a8578, { x: -0.55, y: 0.32, z: 0.26 }),
    P(B(0.18, 0.65, 0.18), 0x8a8578, { x: -0.55, y: 0.32, z: -0.26 }),
    P(B(0.7, 0.3, 0.6), 0xc23b2e, { y: 1.55, team: true }), // howdah
    P(S(0.1), SKIN, { y: 1.85 }),
  ],
  rocketCart: () => [
    P(B(1.0, 0.25, 0.7), WOODC, { y: 0.4 }),
    ...wheels(4, 0.2, 0.2, 0.38, 0.38),
    // Rocket tube rack angled skyward.
    P(B(0.7, 0.1, 0.5), DARKWOOD, { x: -0.1, y: 0.68, rz: 0.5 }),
    P(C(0.05, 0.05, 0.8, 5), 0xc23b2e, { x: -0.05, y: 0.85, z: 0.15, rz: 1.05 }),
    P(C(0.05, 0.05, 0.8, 5), 0xc23b2e, { x: -0.05, y: 0.85, z: 0, rz: 1.05 }),
    P(C(0.05, 0.05, 0.8, 5), 0xc23b2e, { x: -0.05, y: 0.85, z: -0.15, rz: 1.05 }),
  ],
  golem: () => [
    P(B(0.7, 0.9, 0.5), 0x8a8a82, { y: 0.75 }), // stone torso
    P(B(0.45, 0.4, 0.4), 0x9a958c, { y: 1.45 }), // head block
    P(B(0.25, 0.7, 0.25), 0x8a8a82, { x: -0.5, y: 0.7, rz: 0.15 }),
    P(B(0.25, 0.7, 0.25), 0x8a8a82, { x: 0.5, y: 0.7, rz: -0.15 }),
    P(B(0.3, 0.45, 0.3), 0x7a756c, { x: -0.2, y: 0.22 }),
    P(B(0.3, 0.45, 0.3), 0x7a756c, { x: 0.2, y: 0.22 }),
    P(S(0.06), 0x7ec8a9, { x: 0.12, y: 1.5, z: 0.2 }), // glowing eyes
    P(S(0.06), 0x7ec8a9, { x: -0.12, y: 1.5, z: 0.2 }),
    P(B(0.5, 0.12, 0.4), 0xd4af37, { y: 1.14, team: true }), // rune band
  ],
  drum: () => [
    ...humanoid({ cloth: 0xc07820 }),
    P(C(0.22, 0.26, 0.35, 8), 0x8a4b26, { x: 0.3, y: 0.45 }), // big drum
    P(C(0.24, 0.24, 0.05, 8), 0xe8d9b0, { x: 0.3, y: 0.65 }),
  ],
  beast: () => [
    P(B(1.2, 0.7, 0.62), 0x8a8578, { y: 0.75 }), // massive body
    P(B(0.4, 0.42, 0.4), 0x8a8578, { x: 0.75, y: 0.85 }),
    P(CO(0.08, 0.5, 5), 0xe8e2d4, { x: 1.05, y: 0.9, rz: -Math.PI / 2 }), // horn
    P(B(0.14, 0.5, 0.14), 0x8a8578, { x: 0.45, y: 0.25, z: 0.2 }),
    P(B(0.14, 0.5, 0.14), 0x8a8578, { x: 0.45, y: 0.25, z: -0.2 }),
    P(B(0.14, 0.5, 0.14), 0x8a8578, { x: -0.45, y: 0.25, z: 0.2 }),
    P(B(0.14, 0.5, 0.14), 0x8a8578, { x: -0.45, y: 0.25, z: -0.2 }),
    P(B(0.5, 0.12, 0.55), 0xc23b2e, { y: 1.16, team: true }), // war blanket
  ],
};

export interface ArchetypeGeometry {
  body: THREE.BufferGeometry | null;
  team: THREE.BufferGeometry | null;
}

const geoCache = new Map<string, ArchetypeGeometry>();

function bake(parts: Part[]): ArchetypeGeometry {
  const bodyGeos: THREE.BufferGeometry[] = [];
  const teamGeos: THREE.BufferGeometry[] = [];
  const color = new THREE.Color();
  for (const part of parts) {
    const geo = part.geo;
    color.setHex(part.color);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (part.team ? teamGeos : bodyGeos).push(geo);
  }
  return {
    body: bodyGeos.length ? mergeGeometries(bodyGeos) : null,
    team: teamGeos.length ? mergeGeometries(teamGeos) : null,
  };
}

export function getArchetypeGeometry(meshKey: string): ArchetypeGeometry {
  let cached = geoCache.get(meshKey);
  if (!cached) {
    const factory = ARCHETYPES[meshKey] ?? ARCHETYPES.swordsman;
    cached = bake(factory());
    geoCache.set(meshKey, cached);
  }
  return cached;
}

export function registerArchetypes(defs: Record<string, () => Part[]>): void {
  Object.assign(ARCHETYPES, defs);
}

export type { Part };
export { P, B, C, S, CO, humanoid, horse, rider, wheels };
