import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FactionStyle } from './factions';
import { styleFor } from './factions';
import { artFaction, type ArtFactionId, type Slot } from './palette';
import { unitHeight } from './scale';
import { at, clone, ground, mirrorX, type Node } from './kit/node';
import { ball, plate, post, slab, spike } from './kit/forms';
import { bakeAo } from './kit/detail';

/**
 * Faction-aware unit construction.
 *
 * 136 units share only 29 mesh archetypes, and `UnitDef.mesh` carries no
 * faction — so a European serf, an Asian rice farmer, an African hearth worker
 * and a Middle Eastern town worker were all literally the same mesh. Units are
 * now compiled per (archetype x faction), with the faction supplying headgear,
 * shield shape, blade curvature and palette, so the four cultures read apart on
 * the battlefield without authoring 116 meshes by hand.
 *
 * Output keeps the existing three-layer instancing contract exactly:
 *   body   — vertex-coloured, fixed
 *   team   — recoloured per player
 *   action — weapon/tool layer, swung by UnitView about `pivot`
 */

export interface ArchetypeGeometry {
  body: THREE.BufferGeometry | null;
  team: THREE.BufferGeometry | null;
  action: THREE.BufferGeometry | null;
  pivot: { x: number; y: number; z: number };
}

type Ctx = { style: FactionStyle; p: Readonly<Record<Slot, number>> };

const A: Node['layer'] = 'action';
const T: Node['layer'] = 'team';

// ---------------------------------------------------------------------------
// Shared sub-assemblies
// ---------------------------------------------------------------------------

/** Headgear. The clearest per-faction tell at RTS distance after colour. */
function head(c: Ctx, y: number, elite: boolean): Node[] {
  const kind = elite ? c.style.helmElite : c.style.helm;
  const out: Node[] = [...ball({ r: 0.115, segments: 6, slot: 'skin', y })];
  switch (kind) {
    case 'kettle': // wide brimmed war hat
      out.push(...post({ r: 0.17, h: 0.035, slot: 'iron', y: y + 0.06, sides: 8 }));
      out.push(...ball({ r: 0.1, segments: 6, slot: 'iron', y: y + 0.09 }));
      break;
    case 'great': // full helm, flat topped
      out.push(...slab({ w: 0.2, h: 0.2, d: 0.2, slot: 'steel', y: y + 0.03 }));
      out.push(...slab({ w: 0.07, h: 0.13, d: 0.02, slot: 'team', z: 0.11, y: y + 0.04, layer: T }));
      break;
    case 'cap':
      out.push(...spike({ r: 0.15, h: 0.13, sides: 7, slot: 'cloth', y: y + 0.11 }));
      break;
    case 'kabuto': // wide flared neck guard + crest
      out.push(...spike({ r: 0.19, h: 0.1, sides: 7, slot: 'darkIron', y: y + 0.07 }));
      out.push(...slab({ w: 0.03, h: 0.16, d: 0.09, slot: 'gold', y: y + 0.19, z: 0.03 }));
      break;
    case 'bare':
      out.push(...ball({ r: 0.12, segments: 6, slot: 'hair', y: y + 0.04 }));
      break;
    case 'featherCrown':
      out.push(...ball({ r: 0.12, segments: 6, slot: 'hair', y: y + 0.04 }));
      for (const dx of [-0.06, 0, 0.06]) {
        out.push(...slab({ w: 0.02, h: 0.22, d: 0.05, slot: 'team', x: dx, y: y + 0.2, rz: dx * 3, layer: T }));
      }
      break;
    case 'conical':
      out.push(...spike({ r: 0.13, h: 0.19, sides: 7, slot: 'iron', y: y + 0.13 }));
      break;
    case 'turban':
      out.push(...ball({ r: 0.16, segments: 7, slot: 'cloth', y: y + 0.07 }));
      out.push(...spike({ r: 0.05, h: 0.12, sides: 6, slot: 'gold', y: y + 0.2 }));
      break;
  }
  return out;
}

/** Shield, in the faction's shape, carried on the off arm. */
function shield(c: Ctx, x: number, y: number): Node[] {
  switch (c.style.shield) {
    case 'kite':
      return [
        ...plate({ w: 0.26, h: 0.42, thickness: 0.05, slot: 'team', x, y, z: 0.14, layer: T }),
        ...spike({ r: 0.13, h: 0.16, sides: 3, slot: 'team', x, y: y - 0.26, z: 0.14, rx: Math.PI, layer: T }),
      ];
    case 'buckler':
      return [...post({ r: 0.15, h: 0.05, slot: 'team', x, y, z: 0.14, sides: 8, rx: Math.PI / 2, layer: T })];
    case 'hideOval':
      return [
        ...plate({ w: 0.26, h: 0.5, thickness: 0.05, slot: 'team', x, y, z: 0.14, layer: T }),
        ...slab({ w: 0.03, h: 0.44, d: 0.02, slot: 'wood', x, y, z: 0.18 }),
      ];
    case 'round':
      return [...post({ r: 0.19, h: 0.05, slot: 'team', x, y, z: 0.14, sides: 9, rx: Math.PI / 2, layer: T })];
  }
}

/** Foot-soldier body: torso, legs, off arm, and a head. */
function footBody(c: Ctx, o: { armor?: 'cloth' | 'leather' | 'mail' | 'plate'; elite?: boolean } = {}): Node[] {
  const armor = o.armor ?? 'cloth';
  const torsoSlot: Slot = armor === 'plate' ? 'steel' : armor === 'mail' ? 'iron' : armor === 'leather' ? 'leather' : c.style.clothSlot;
  const armSlot: Slot = armor === 'plate' || armor === 'mail' ? 'iron' : 'skin';
  return [
    ...post({ r: 0.17, h: 0.5, slot: torsoSlot, y: 0.52, sides: 6, taper: 0.85 }),
    ...slab({ w: 0.1, h: 0.3, d: 0.1, slot: 'clothDark', x: -0.08, y: 0.15 }),
    ...slab({ w: 0.1, h: 0.3, d: 0.1, slot: 'clothDark', x: 0.08, y: 0.15 }),
    ...post({ r: 0.055, h: 0.34, slot: armSlot, x: -0.21, y: 0.55, sides: 5 }),
    ...head(c, 0.85, o.elite ?? false),
  ];
}

/** The weapon arm plus a weapon, tagged into the action layer. */
function weaponArm(c: Ctx, weapon: Node[]): Node[] {
  return [...post({ r: 0.055, h: 0.34, slot: 'skin', x: 0.21, y: 0.55, sides: 5, layer: A }), ...at(weapon, { x: 0.21 })];
}

/** A blade whose curvature comes from the faction (straight sword .. scimitar). */
function blade(c: Ctx, len: number, slotHilt: Slot = 'woodDark'): Node[] {
  const curve = c.style.bladeCurve;
  const out: Node[] = [...slab({ w: 0.05, h: 0.14, d: 0.05, slot: slotHilt, y: 0.72 })];
  const segments = curve > 0.05 ? 3 : 1;
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    out.push(
      ...slab({
        w: 0.05,
        h: len / segments + 0.01,
        d: 0.02,
        slot: 'steel',
        y: 0.79 + t * len,
        x: curve * len * t * t,
        rz: -curve * t * 1.6,
      }),
    );
  }
  return out;
}

function spearShaft(len: number): Node[] {
  return [
    ...post({ r: 0.022, h: len, slot: 'wood', y: 0.62 + len / 2, sides: 5 }),
    ...spike({ r: 0.045, h: 0.16, sides: 4, slot: 'steel', y: 0.62 + len + 0.06 }),
  ];
}

function bow(): Node[] {
  return [
    ...post({ r: 0.02, h: 0.62, slot: 'wood', y: 0.78, sides: 5, rz: 0.16 }),
    ...slab({ w: 0.012, h: 0.6, d: 0.012, slot: 'rope', y: 0.78, z: 0.05 }),
  ];
}

/** Four-legged mount. `humped` gives a camel its distinctive back line. */
function mount(c: Ctx, kind: 'horse' | 'camel' | 'elephant'): Node[] {
  if (kind === 'elephant') {
    return [
      ...post({ r: 0.42, h: 0.85, slot: 'hide', y: 0.95, sides: 7, rz: Math.PI / 2 }),
      ...ball({ r: 0.3, segments: 6, slot: 'hide', y: 1.0, z: 0.62 }),
      ...post({ r: 0.07, h: 0.5, slot: 'hide', y: 0.75, z: 0.85, sides: 5, rx: 0.6 }),
      ...plate({ w: 0.34, h: 0.3, thickness: 0.05, slot: 'hide', x: 0.3, y: 1.1, z: 0.55, ry: 0.4 }),
      ...plate({ w: 0.34, h: 0.3, thickness: 0.05, slot: 'hide', x: -0.3, y: 1.1, z: 0.55, ry: -0.4 }),
      ...legs(4, 0.52, 0.11, 0.3, 0.34),
    ];
  }
  const humped = kind === 'camel';
  const body: Node[] = [
    ...post({ r: 0.2, h: 0.78, slot: 'hide', y: humped ? 0.86 : 0.72, sides: 6, rz: Math.PI / 2 }),
    ...post({ r: 0.1, h: 0.36, slot: 'hide', y: humped ? 1.06 : 0.92, z: 0.32, sides: 5, rx: -0.5 }),
    ...ball({ r: 0.13, segments: 5, slot: 'hide', y: humped ? 1.24 : 1.06, z: 0.48 }),
  ];
  if (humped) body.push(...ball({ r: 0.18, segments: 6, slot: 'hide', y: 1.06, z: -0.05 }));
  body.push(...legs(4, humped ? 0.52 : 0.42, 0.055, 0.18, 0.24));
  return body;
}

function legs(count: number, height: number, r: number, spanX: number, spanZ: number): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < count; i++) {
    const x = i % 2 === 0 ? -spanX : spanX;
    const z = i < 2 ? spanZ : -spanZ;
    out.push(...post({ r, h: height, slot: 'hide', x, y: height / 2, z, sides: 5 }));
  }
  return out;
}

/** Rider torso seated on a mount. */
function rider(c: Ctx, seatY: number, elite: boolean): Node[] {
  return [
    ...post({ r: 0.15, h: 0.4, slot: 'iron', y: seatY + 0.2, sides: 6, taper: 0.85 }),
    ...post({ r: 0.05, h: 0.28, slot: 'iron', x: -0.19, y: seatY + 0.22, sides: 5 }),
    ...head(c, seatY + 0.52, elite),
  ];
}

/** Wheeled chassis shared by carts and siege engines. */
function chassis(w: number, d: number, wheelR: number): Node[] {
  const out: Node[] = [
    ...slab({ w, h: 0.14, d, slot: 'woodDark', y: wheelR + 0.07 }),
    ...slab({ w: w * 0.9, h: 0.1, d: 0.06, slot: 'wood', y: wheelR + 0.16, z: d / 2 - 0.04 }),
  ];
  for (const x of [-w / 2, w / 2]) {
    for (const z of [-d / 2 + 0.1, d / 2 - 0.1]) {
      out.push(...post({ r: wheelR, h: 0.07, slot: 'wood', x, y: wheelR, z, sides: 8, rz: Math.PI / 2 }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

type Builder = (c: Ctx) => Node[];

const ARCHETYPES: Record<string, Builder> = {
  worker: (c) => [
    ...footBody(c),
    ...weaponArm(c, [
      ...post({ r: 0.025, h: 0.5, slot: 'wood', y: 0.82, sides: 5, rz: 0.25 }),
      ...slab({ w: 0.16, h: 0.1, d: 0.04, slot: 'iron', y: 1.06, x: 0.1 }),
    ]),
  ],
  swordsman: (c) => [...footBody(c, { armor: 'mail' }), ...shield(c, -0.26, 0.55), ...weaponArm(c, blade(c, 0.34))],
  spearman: (c) => [...footBody(c, { armor: 'leather' }), ...weaponArm(c, spearShaft(0.62))],
  shieldman: (c) => [...footBody(c, { armor: 'plate' }), ...shield(c, -0.28, 0.56), ...weaponArm(c, blade(c, 0.28))],
  champion: (c) => [
    ...footBody(c, { armor: 'plate', elite: true }),
    ...shield(c, -0.28, 0.58),
    ...weaponArm(c, blade(c, 0.46)),
  ],
  archer: (c) => [...footBody(c, { armor: 'leather' }), ...quiver(), ...weaponArm(c, bow())],
  crossbow: (c) => [
    ...footBody(c, { armor: 'leather' }),
    ...quiver(),
    ...weaponArm(c, [
      ...slab({ w: 0.06, h: 0.4, d: 0.06, slot: 'woodDark', y: 0.8, rx: 1.2 }),
      ...slab({ w: 0.36, h: 0.04, d: 0.04, slot: 'iron', y: 0.86 }),
    ]),
  ],
  support: (c) => [
    ...footBody(c),
    ...weaponArm(c, [...post({ r: 0.02, h: 0.66, slot: 'wood', y: 0.9, sides: 5 }), ...ball({ r: 0.08, segments: 5, slot: 'accent', y: 1.24 })]),
  ],
  monk: (c) => [
    ...post({ r: 0.2, h: 0.72, slot: 'canvas', y: 0.4, sides: 7, taper: 0.6 }),
    ...head(c, 0.85, false),
    ...weaponArm(c, [...post({ r: 0.02, h: 0.7, slot: 'woodDark', y: 0.9, sides: 5 })]),
  ],
  banner: (c) => [
    ...footBody(c, { armor: 'leather' }),
    ...weaponArm(c, [
      ...post({ r: 0.025, h: 0.9, slot: 'woodDark', y: 1.0, sides: 5 }),
      ...plate({ w: 0.3, h: 0.42, thickness: 0.03, slot: 'team', x: 0.16, y: 1.26, layer: T }),
    ]),
  ],
  drum: (c) => [
    ...footBody(c),
    ...post({ r: 0.19, h: 0.26, slot: 'wood', y: 0.5, z: 0.24, sides: 9 }),
    ...weaponArm(c, [...post({ r: 0.02, h: 0.26, slot: 'wood', y: 0.76, rz: 0.7 })]),
  ],

  // Mounted
  lightCavalry: (c) => [...mount(c, 'horse'), ...rider(c, 0.94, false), ...weaponArm2(c, 0.94, blade(c, 0.3))],
  cavalry: (c) => [...mount(c, 'horse'), ...rider(c, 0.94, false), ...weaponArm2(c, 0.94, spearShaft(0.5))],
  knight: (c) => [...mount(c, 'horse'), ...caparison(), ...rider(c, 0.94, true), ...weaponArm2(c, 0.94, lance())],
  paladin: (c) => [...mount(c, 'horse'), ...caparison(), ...rider(c, 0.94, true), ...weaponArm2(c, 0.94, blade(c, 0.44))],
  horseArcher: (c) => [...mount(c, 'horse'), ...rider(c, 0.94, false), ...weaponArm2(c, 0.94, bow())],
  camelRider: (c) => [...mount(c, 'camel'), ...rider(c, 1.1, false), ...weaponArm2(c, 1.1, blade(c, 0.34))],
  camelArcher: (c) => [...mount(c, 'camel'), ...rider(c, 1.1, false), ...weaponArm2(c, 1.1, bow())],

  // Beasts
  elephant: (c) => [
    ...mount(c, 'elephant'),
    ...slab({ w: 0.5, h: 0.34, d: 0.5, slot: 'wood', y: 1.55 }),
    ...rider(c, 1.7, false),
    ...weaponArm2(c, 1.7, spearShaft(0.5)),
  ],
  beast: (c) => [
    ...post({ r: 0.24, h: 0.8, slot: 'hide', y: 0.66, sides: 6, rz: Math.PI / 2 }),
    ...ball({ r: 0.2, segments: 6, slot: 'hide', y: 0.72, z: 0.5 }),
    ...spike({ r: 0.06, h: 0.28, sides: 4, slot: 'steel', y: 0.78, z: 0.74, rx: 1.35, layer: A }),
    ...legs(4, 0.42, 0.075, 0.22, 0.28),
  ],
  golem: (c) => [
    ...slab({ w: 0.46, h: 0.6, d: 0.34, slot: 'stone', y: 0.72 }),
    ...ball({ r: 0.17, segments: 5, slot: 'stone', y: 1.14 }),
    ...ball({ r: 0.07, segments: 5, slot: 'ember', y: 1.16, z: 0.13 }),
    ...slab({ w: 0.16, h: 0.42, d: 0.16, slot: 'stone', x: -0.32, y: 0.72 }),
    ...slab({ w: 0.16, h: 0.34, d: 0.16, slot: 'stone', x: -0.12, y: 0.2 }),
    ...slab({ w: 0.16, h: 0.34, d: 0.16, slot: 'stone', x: 0.12, y: 0.2 }),
    ...at(slab({ w: 0.18, h: 0.46, d: 0.18, slot: 'stone', layer: A }), { x: 0.32, y: 0.72 }),
  ],

  // Siege and vehicles
  cart: () => [...chassis(0.6, 0.86, 0.15), ...slab({ w: 0.54, h: 0.26, d: 0.7, slot: 'wood', y: 0.4 })],
  ram: () => [
    ...chassis(0.66, 1.0, 0.16),
    ...post({ r: 0.05, h: 0.6, slot: 'woodDark', x: -0.26, y: 0.6, sides: 5 }),
    ...post({ r: 0.05, h: 0.6, slot: 'woodDark', x: 0.26, y: 0.6, sides: 5 }),
    ...slab({ w: 0.72, h: 0.12, d: 0.9, slot: 'thatch', y: 0.94 }),
    ...at(post({ r: 0.11, h: 0.86, slot: 'wood', sides: 7, rx: Math.PI / 2, layer: A }), { y: 0.62 }),
    ...at(spike({ r: 0.13, h: 0.2, sides: 6, slot: 'darkIron', rx: Math.PI / 2, layer: A }), { y: 0.62, z: 0.52 }),
  ],
  catapult: () => [
    ...chassis(0.66, 0.9, 0.17),
    ...slab({ w: 0.1, h: 0.44, d: 0.1, slot: 'woodDark', x: -0.24, y: 0.62, rz: 0.2 }),
    ...slab({ w: 0.1, h: 0.44, d: 0.1, slot: 'woodDark', x: 0.24, y: 0.62, rz: -0.2 }),
    ...at(post({ r: 0.035, h: 0.86, slot: 'wood', sides: 5, rx: 0.9, layer: A }), { y: 0.86 }),
    ...at(ball({ r: 0.11, segments: 5, slot: 'stone', layer: A }), { y: 1.2, z: -0.3 }),
  ],
  trebuchet: () => [
    ...chassis(0.8, 1.0, 0.18),
    ...slab({ w: 0.1, h: 1.3, d: 0.1, slot: 'woodDark', x: -0.3, y: 0.95, rz: 0.16 }),
    ...slab({ w: 0.1, h: 1.3, d: 0.1, slot: 'woodDark', x: 0.3, y: 0.95, rz: -0.16 }),
    ...slab({ w: 0.7, h: 0.1, d: 0.1, slot: 'wood', y: 1.6 }),
    ...at(post({ r: 0.04, h: 1.5, slot: 'wood', sides: 5, rx: 0.7, layer: A }), { y: 1.6 }),
    ...at(slab({ w: 0.2, h: 0.2, d: 0.2, slot: 'stone', layer: A }), { y: 1.05, z: -0.5 }),
  ],
  ballista: () => [
    ...chassis(0.6, 0.76, 0.15),
    ...slab({ w: 0.12, h: 0.36, d: 0.12, slot: 'woodDark', y: 0.5 }),
    ...at(slab({ w: 0.66, h: 0.06, d: 0.06, slot: 'wood', layer: A }), { y: 0.74 }),
    ...at(post({ r: 0.03, h: 0.6, slot: 'darkIron', sides: 4, rx: Math.PI / 2, layer: A }), { y: 0.74, z: 0.1 }),
  ],
  bombard: () => [
    ...chassis(0.6, 0.8, 0.15),
    ...slab({ w: 0.3, h: 0.2, d: 0.3, slot: 'woodDark', y: 0.44 }),
    ...at(post({ r: 0.13, h: 0.66, slot: 'darkIron', sides: 8, rx: 1.15, layer: A }), { y: 0.66 }),
  ],
  rocketCart: () => [
    ...chassis(0.66, 0.86, 0.16),
    ...at(slab({ w: 0.5, h: 0.34, d: 0.44, slot: 'wood', layer: A }), { y: 0.62, rx: -0.4 }),
    ...at(post({ r: 0.035, h: 0.3, slot: 'ember', sides: 5, rx: -0.4, layer: A }), { y: 0.86, z: 0.14 }),
  ],
  siegeTower: () => [
    ...chassis(0.86, 0.86, 0.18),
    ...slab({ w: 0.76, h: 1.9, d: 0.7, slot: 'wood', y: 1.3 }),
    ...slab({ w: 0.8, h: 0.12, d: 0.16, slot: 'woodDark', y: 2.3, z: 0.3 }),
    ...at(slab({ w: 0.62, h: 0.08, d: 0.7, slot: 'woodDark', layer: A }), { y: 2.2, z: 0.5, rx: 0.5 }),
  ],
};

/** Quiver on the back — the ranged silhouette cue. */
function quiver(): Node[] {
  return [
    ...post({ r: 0.06, h: 0.28, slot: 'leather', x: -0.12, y: 0.68, z: -0.14, sides: 5, rz: 0.3 }),
    ...slab({ w: 0.02, h: 0.14, d: 0.02, slot: 'wood', x: -0.14, y: 0.86, z: -0.14 }),
  ];
}

/** Weapon arm for a seated rider. */
function weaponArm2(c: Ctx, seatY: number, weapon: Node[]): Node[] {
  return [
    ...post({ r: 0.05, h: 0.28, slot: 'iron', x: 0.19, y: seatY + 0.22, sides: 5, layer: A }),
    ...at(weapon, { x: 0.19, y: seatY - 0.5 }),
  ];
}

function lance(): Node[] {
  return [
    ...post({ r: 0.028, h: 0.95, slot: 'wood', y: 0.9, sides: 5, rx: 1.35 }),
    ...spike({ r: 0.05, h: 0.16, sides: 4, slot: 'steel', y: 0.9, z: 0.5, rx: Math.PI / 2 }),
  ];
}

/** Team-coloured horse drape, which is what makes heavy cavalry read as elite. */
function caparison(): Node[] {
  return [
    ...plate({ w: 0.42, h: 0.42, thickness: 0.04, slot: 'team', x: 0.21, y: 0.72, ry: Math.PI / 2, layer: T }),
    ...plate({ w: 0.42, h: 0.42, thickness: 0.04, slot: 'team', x: -0.21, y: 0.72, ry: Math.PI / 2, layer: T }),
  ];
}

const RIDER_PIVOT = (s: number) => ({ x: 0, y: 1.32 * s, z: 0.16 });

const ACTION_PIVOTS: Record<string, { x: number; y: number; z: number }> = {
  lightCavalry: RIDER_PIVOT(0.9),
  cavalry: RIDER_PIVOT(1),
  knight: RIDER_PIVOT(1),
  paladin: RIDER_PIVOT(1.1),
  horseArcher: RIDER_PIVOT(0.9),
  camelRider: { x: 0, y: 1.5, z: 0.16 },
  camelArcher: { x: 0, y: 1.5, z: 0.16 },
  ram: { x: 0, y: 0.9, z: 0 },
  catapult: { x: 0.25, y: 0.45, z: 0 },
  trebuchet: { x: 0, y: 1.6, z: 0 },
  ballista: { x: 0.15, y: 0.62, z: 0 },
  bombard: { x: 0, y: 0.5, z: 0 },
  rocketCart: { x: 0, y: 0.5, z: 0 },
  siegeTower: { x: 0, y: 2.2, z: 0.2 },
  golem: { x: 0.5, y: 1.05, z: 0 },
  elephant: { x: 0, y: 1.9, z: 0.16 },
  beast: { x: 0.55, y: 0.75, z: 0 },
  champion: { x: 0, y: 0.83, z: 0.23 },
};

const DEFAULT_PIVOT = { x: 0, y: 0.72, z: 0.2 };

export function hasArchetype(meshKey: string): boolean {
  return meshKey in ARCHETYPES;
}

export function archetypeKeys(): string[] {
  return Object.keys(ARCHETYPES);
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

const cache = new Map<string, ArchetypeGeometry>();

/**
 * Build (or fetch) the baked geometry for an archetype in a faction's style.
 *
 * Unknown keys throw in dev rather than silently falling back to `swordsman`,
 * which is what previously let a typo'd mesh key render as the wrong unit
 * forever without anyone noticing.
 */
export function getArchetypeGeometry(meshKey: string, faction: string): ArchetypeGeometry {
  const art = artFaction(faction);
  const cacheKey = `${meshKey}:${art}`;
  let cached = cache.get(cacheKey);
  if (cached) return cached;

  const builder = ARCHETYPES[meshKey];
  if (!builder) {
    if (import.meta.env?.DEV) console.error(`[art] no unit archetype for mesh key "${meshKey}"`);
    cached = { body: null, team: null, action: null, pivot: DEFAULT_PIVOT };
    cache.set(cacheKey, cached);
    return cached;
  }

  const style = styleFor(art);
  const ctx: Ctx = { style, p: style.palette };
  const nodes = builder(ctx);

  ground(nodes);
  // Fit on the *static* layers only. Including the action layer would make a
  // unit's declared height depend on where its swinging part happens to rest —
  // a catapult would measure differently with its arm cocked than released.
  fitStaticHeight(nodes, unitHeight(meshKey));
  // Softer contact darkening than buildings — a unit is small on screen and
  // heavy AO reads as dirt rather than shading.
  bakeAo(nodes, style.palette, { strength: 0.3, underside: 0.16 });

  const pivotBase = ACTION_PIVOTS[meshKey] ?? DEFAULT_PIVOT;
  // The pivot was authored against the pre-fit geometry, so it has to travel
  // through the same scale the fit applied.
  const scale = unitHeight(meshKey) / Math.max(1e-4, authoredHeight(builder, ctx));
  const pivot = { x: pivotBase.x * scale, y: pivotBase.y * scale, z: pivotBase.z * scale };

  cached = bake(nodes, pivot);
  cache.set(cacheKey, cached);
  return cached;
}

/**
 * Scale the whole set so that its non-action layers stand exactly `height`
 * tall, then re-ground. The action layer scales along with everything else but
 * does not get a vote on what the height is.
 */
function fitStaticHeight(nodes: Node[], height: number): void {
  const statics = nodes.filter((n) => n.layer !== 'action');
  const h = staticHeight(statics.length ? statics : nodes);
  if (h < 1e-6) return;
  for (const n of nodes) n.geo.scale(height / h, height / h, height / h);
  ground(nodes);
}

function staticHeight(nodes: Node[]): number {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    n.geo.computeBoundingBox();
    const bb = n.geo.boundingBox;
    if (!bb) continue;
    minY = Math.min(minY, bb.min.y);
    maxY = Math.max(maxY, bb.max.y);
  }
  return Number.isFinite(minY) ? maxY - minY : 0;
}

/** Height of the archetype as authored, before the contract fit is applied. */
const authoredCache = new Map<Builder, number>();
function authoredHeight(builder: Builder, ctx: Ctx): number {
  let h = authoredCache.get(builder);
  if (h === undefined) {
    const probe = builder(ctx).filter((n) => n.layer !== 'action');
    h = staticHeight(probe) || 1;
    authoredCache.set(builder, h);
  }
  return h;
}

/** Merge nodes into the three instancing layers. */
function bake(nodes: Node[], pivot: { x: number; y: number; z: number }): ArchetypeGeometry {
  const body: THREE.BufferGeometry[] = [];
  const team: THREE.BufferGeometry[] = [];
  const action: THREE.BufferGeometry[] = [];
  for (const n of nodes) {
    if (n.layer === 'action') {
      // Re-origin around the pivot so the layer swings rather than orbits.
      n.geo.translate(-pivot.x, -pivot.y, -pivot.z);
      action.push(n.geo);
    } else if (n.layer === 'team' || n.slot === 'team') {
      team.push(n.geo);
    } else {
      body.push(n.geo);
    }
  }
  return {
    body: body.length ? mergeGeometries(body) : null,
    team: team.length ? mergeGeometries(team) : null,
    action: action.length ? mergeGeometries(action) : null,
    pivot,
  };
}

export { clone as cloneNodes, mirrorX };
export type { ArtFactionId };
