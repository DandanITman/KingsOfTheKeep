import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FactionStyle } from './factions';
import { styleFor } from './factions';
import type { ArtFactionId, Slot } from './palette';
import { artFaction } from './palette';
import { BUILDING_HEIGHT, houseHeight, keepHeight } from './scale';
import { at, fitHeight, ground, measure, type Node } from './kit/node';
import { ball, batteredBox, crenellation, plate, post, slab, spike } from './kit/forms';
import { finial, roof, towerCap } from './kit/roofs';
import { prop, type PropName, type PropOpts } from './kit/props';
import { bakeAo } from './kit/detail';

/**
 * Faction-aware building construction.
 *
 * The key structural fact this is built around: **24 of the buildings are
 * shared by all four factions** (`src/data/buildings/universal.ts`), so a
 * European barracks and an Asian barracks are literally the same `mesh` key.
 * Faction identity therefore cannot come from the mesh key — it has to be
 * supplied at build time. That is why `buildBuildingMesh` now takes a faction,
 * and why blueprints call `c.mass()` / `c.roof()` rather than raw forms: the
 * context substitutes the faction's own materials and shapes underneath them.
 */

export interface BuildCtx {
  style: FactionStyle;
  /** Usable extents, derived from the sim footprint. */
  w: number;
  d: number;
  /** Contract height for this building. */
  h: number;

  /** The main mass, in the faction's wall material and plan shape. */
  mass(o: { w: number; d: number; h: number; x?: number; z?: number; y?: number; slot?: Slot }): Node[];
  /** A roof sized to cover a mass, in the faction's roof shape. */
  roof(o: { w: number; d: number; h: number; y: number; kind?: Parameters<typeof roof>[0]; tiers?: number }): Node[];
  /** A tower with the faction's cap. */
  tower(o: { r: number; h: number; x: number; z: number; cap?: Parameters<typeof towerCap>[0] }): Node[];
  /** A doorway, in the faction's opening style. */
  door(o: { x?: number; z: number; w: number; h: number }): Node[];
  /** A foundation skirt. Grounds the building and hides terrain slope. */
  plinth(o?: { inset?: number; h?: number }): Node[];
  /** The faction's signature ornament at a given apex height. */
  finial(y: number, scale?: number): Node[];
  /** A prop, pre-wired to the faction's material slots. */
  prop(name: PropName, o: Omit<Partial<PropOpts>, keyof PropSlots>): Node[];
  /** A team-coloured banner on a pole. */
  banner(o: { x: number; z: number; h: number }): Node[];
}

type PropSlots = Pick<PropOpts, 'wood' | 'darkWood' | 'metal' | 'stone' | 'cloth' | 'accent'>;

export interface BuildingBlueprint {
  /** Nav footprint in cells. Asserted against the data layer by the tests. */
  footprint: [number, number];
  build(c: BuildCtx): Node[];
}

function makeCtx(style: FactionStyle, w: number, d: number, h: number): BuildCtx {
  const propSlots: PropSlots = {
    wood: 'wood',
    darkWood: 'woodDark',
    metal: 'iron',
    stone: 'stone',
    cloth: 'cloth',
    accent: 'accent',
  };

  const ctx: BuildCtx = {
    style,
    w,
    d,
    h,

    mass(o) {
      const slot = o.slot ?? style.wallSlot;
      const nodes =
        style.plan === 'round'
          ? post({ r: Math.min(o.w, o.d) / 2, h: o.h, slot, sides: 9, taper: style.battered ? 0.88 : 1, y: o.h / 2 })
          : style.battered
            ? batteredBox({ w: o.w, h: o.h, d: o.d, slot, taper: 0.9 })
            : slab({ w: o.w, h: o.h, d: o.d, slot, y: o.h / 2 });
      return at(nodes, { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0 });
    },

    roof(o) {
      const kind = o.kind ?? style.roof;
      const nodes = roof(kind, {
        w: o.w,
        d: o.d,
        // Pitch nudges the requested height rather than dominating it — a
        // multiplier wide enough to swing 0.6x..1.4x made every steep-roofed
        // faction's buildings read as a roof with a building under it.
        h: o.h * (0.8 + style.roofPitch * 0.35),
        y: o.y,
        slot: style.roofSlot,
        trim: style.trimSlot,
        eaves: style.eaves,
        tiers: o.tiers,
      });
      return nodes;
    },

    tower(o) {
      const cap = o.cap ?? style.towerCap;
      const body = post({
        r: o.r,
        h: o.h,
        slot: style.wallSlot,
        sides: style.plan === 'round' ? 9 : 6,
        taper: style.battered ? 0.9 : 1,
        y: o.h / 2,
      });
      const capH = o.r * 1.5;
      return at([...body, ...towerCap(cap, { r: o.r, h: capH, y: o.h, slot: style.roofSlot, trim: style.trimSlot })], {
        x: o.x,
        z: o.z,
      });
    },

    door(o) {
      const nodes: Node[] = [];
      // Arched cultures get a rounded head on the opening; the others a lintel.
      if (style.plan === 'rectArched') {
        nodes.push(...slab({ w: o.w, h: o.h * 0.75, d: 0.1, slot: 'woodDark', y: o.h * 0.375 }));
        nodes.push(...ball({ r: o.w / 2, segments: 6, slot: 'woodDark', y: o.h * 0.75 }));
      } else {
        nodes.push(...slab({ w: o.w, h: o.h, d: 0.1, slot: 'woodDark', y: o.h / 2 }));
        nodes.push(...slab({ w: o.w * 1.18, h: 0.08, d: 0.13, slot: style.trimSlot, y: o.h }));
      }
      return at(nodes, { x: o.x ?? 0, z: o.z });
    },

    plinth(o = {}) {
      const inset = o.inset ?? -0.12; // negative = wider than the mass
      const ph = o.h ?? 0.16;
      const pw = w - inset * 2;
      const pd = d - inset * 2;
      const nodes =
        style.plan === 'round'
          ? post({ r: Math.min(pw, pd) / 2, h: ph, slot: 'stoneDark', sides: 9, y: ph / 2 })
          : slab({ w: pw, h: ph, d: pd, slot: 'stoneDark', y: ph / 2 });
      return nodes;
    },

    finial(y, scale = 1) {
      return finial(style.finial, { y, slot: style.id === 'european' ? 'gold' : style.trimSlot, scale });
    },

    prop(name, o) {
      return prop(name, { ...propSlots, ...o });
    },

    banner(o) {
      return [
        ...post({ r: 0.035, h: o.h, slot: 'woodDark', x: o.x, y: o.h / 2, z: o.z }),
        ...plate({ w: 0.34, h: 0.44, thickness: 0.04, slot: 'team', x: o.x + 0.18, y: o.h - 0.28, z: o.z, layer: 'team' }),
      ];
    },
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

/** A work camp: shed, lean-to roof, doorway, and a distinctive prop cluster. */
function camp(footprint: [number, number], height: number, props: (c: BuildCtx) => Node[]): BuildingBlueprint {
  return {
    footprint,
    build: (c) => [
      ...c.plinth(),
      ...c.mass({ w: c.w * 0.66, d: c.d * 0.6, h: c.h * 0.44, z: -c.d * 0.14, y: 0.16 }),
      ...c.roof({ w: c.w * 0.76, d: c.d * 0.68, h: c.h * 0.2, y: c.h * 0.44 + 0.16, kind: 'lean' }),
      ...c.door({ z: c.d * 0.17, w: 0.42, h: c.h * 0.3 }),
      ...props(c),
    ],
  };
}

/** A hall: main mass, faction roof, door, and a finial. */
function hall(footprint: [number, number], height: number, extra?: (c: BuildCtx) => Node[]): BuildingBlueprint {
  return {
    footprint,
    build: (c) => {
      const bodyH = c.h * 0.6;
      const out = [
        ...c.plinth(),
        ...c.mass({ w: c.w * 0.82, d: c.d * 0.78, h: bodyH, y: 0.16 }),
        ...c.roof({ w: c.w * 0.82, d: c.d * 0.78, h: c.h * 0.4, y: bodyH + 0.16 }),
        ...c.door({ z: c.d * 0.4, w: 0.5, h: bodyH * 0.6 }),
        ...c.finial(c.h * 0.98, 1),
      ];
      if (extra) out.push(...extra(c));
      return out;
    },
  };
}

const BLUEPRINTS: Record<string, BuildingBlueprint> = {
  // --- Economy: three visually distinct camps ------------------------------
  // Vertical headframe.
  miningCamp: camp([2, 2], BUILDING_HEIGHT.miningCamp, (c) => [
    ...c.prop('mineheadFrame', { x: c.w * 0.28, z: c.d * 0.24, s: 1.15 }),
    ...c.prop('oreCart', { x: -c.w * 0.26, z: c.d * 0.3, ry: 0.5 }),
    ...c.prop('oreHeap', { x: c.w * 0.06, z: c.d * 0.42, s: 1.1 }),
  ]),
  // Diagonal boom.
  quarry: camp([2, 2], BUILDING_HEIGHT.quarry, (c) => [
    ...c.prop('derrick', { x: c.w * 0.24, z: -c.d * 0.08, s: 1.2 }),
    ...c.prop('stoneBlockPile', { x: -c.w * 0.28, z: c.d * 0.28 }),
    ...c.prop('rubble', { x: c.w * 0.12, z: c.d * 0.42, s: 1.2 }),
  ]),
  // Low horizontal stacks.
  lumberCamp: camp([2, 2], BUILDING_HEIGHT.lumberCamp, (c) => [
    ...c.prop('logPile', { x: c.w * 0.3, z: c.d * 0.26, ry: 0.15 }),
    ...c.prop('logPile', { x: c.w * 0.3, z: -c.d * 0.14, ry: 1.4, s: 0.85 }),
    ...c.prop('sawhorse', { x: -c.w * 0.28, z: c.d * 0.3 }),
    ...c.prop('axeStump', { x: -c.w * 0.05, z: c.d * 0.42 }),
  ]),
  storehouse: camp([2, 2], BUILDING_HEIGHT.storehouse, (c) => [
    ...c.prop('crate', { x: c.w * 0.28, z: c.d * 0.3 }),
    ...c.prop('barrel', { x: -c.w * 0.28, z: c.d * 0.28 }),
    ...c.prop('sack', { x: c.w * 0.05, z: c.d * 0.42 }),
  ]),

  farm: {
    footprint: [3, 3],
    build: (c) => [
      ...c.prop('cropRow', { x: -c.w * 0.2, z: 0, s: 1.5 }),
      ...c.prop('cropRow', { x: c.w * 0.2, z: 0, s: 1.5 }),
      ...c.mass({ w: c.w * 0.34, d: c.d * 0.3, h: c.h * 0.5, x: c.w * 0.3, z: -c.d * 0.3, y: 0 }),
      ...c.roof({ w: c.w * 0.34, d: c.d * 0.3, h: c.h * 0.42, y: c.h * 0.5, kind: 'lean' }),
      ...c.prop('hayBale', { x: -c.w * 0.32, z: -c.d * 0.32 }),
    ],
  },

  house: hall([2, 2], BUILDING_HEIGHT.house),
  market: hall([3, 3], BUILDING_HEIGHT.market, (c) => [
    ...c.prop('marketStall', { x: -c.w * 0.28, z: c.d * 0.3 }),
    ...c.prop('barrel', { x: c.w * 0.3, z: c.d * 0.3 }),
  ]),
  bazaar: hall([3, 3], BUILDING_HEIGHT.bazaar, (c) => [
    ...c.prop('marketStall', { x: -c.w * 0.3, z: c.d * 0.28, s: 1.1 }),
    ...c.prop('marketStall', { x: c.w * 0.3, z: c.d * 0.28, s: 1.1, ry: 0.3 }),
  ]),
  caravanserai: hall([3, 3], BUILDING_HEIGHT.caravanserai, (c) => [
    ...c.prop('trough', { x: -c.w * 0.3, z: c.d * 0.3 }),
    ...c.prop('crate', { x: c.w * 0.3, z: c.d * 0.3 }),
  ]),
  herdingGrounds: {
    footprint: [3, 3],
    build: (c) => [
      ...c.plinth(),
      ...c.mass({ w: c.w * 0.4, d: c.d * 0.4, h: c.h * 0.5, x: -c.w * 0.24, y: 0.16 }),
      ...c.roof({ w: c.w * 0.44, d: c.d * 0.44, h: c.h * 0.4, y: c.h * 0.5 + 0.16 }),
      ...c.prop('trough', { x: c.w * 0.25, z: c.d * 0.2, s: 1.2 }),
      ...c.prop('hayBale', { x: c.w * 0.28, z: -c.d * 0.25 }),
    ],
  },
  drumCircle: {
    footprint: [2, 2],
    build: (c) => [
      ...c.plinth({ inset: 0.1, h: 0.2 }),
      ...c.prop('drum', { x: 0, y: 0.2, z: 0, s: 1.6 }),
      ...c.prop('drum', { x: c.w * 0.28, y: 0.2, z: c.d * 0.22, s: 1.1 }),
      ...c.prop('drum', { x: -c.w * 0.28, y: 0.2, z: c.d * 0.22, s: 1.1 }),
      ...c.banner({ x: 0, z: -c.d * 0.3, h: c.h }),
    ],
  },

  // --- Military -----------------------------------------------------------
  barracks: hall([3, 3], BUILDING_HEIGHT.barracks, (c) => [
    ...c.prop('weaponRack', { x: -c.w * 0.3, z: c.d * 0.32 }),
    ...c.banner({ x: c.w * 0.32, z: c.d * 0.3, h: c.h * 0.8 }),
  ]),
  archeryRange: {
    footprint: [3, 3],
    build: (c) => [
      ...c.plinth(),
      ...c.mass({ w: c.w * 0.76, d: c.d * 0.42, h: c.h * 0.52, z: -c.d * 0.2, y: 0.16 }),
      ...c.roof({ w: c.w * 0.8, d: c.d * 0.48, h: c.h * 0.34, y: c.h * 0.52 + 0.16 }),
      ...c.prop('targetButt', { x: -c.w * 0.24, z: c.d * 0.34, s: 1.2 }),
      ...c.prop('targetButt', { x: c.w * 0.24, z: c.d * 0.34, s: 1.2 }),
    ],
  },
  stable: {
    footprint: [3, 3],
    build: (c) => [
      ...c.plinth(),
      ...c.mass({ w: c.w * 0.78, d: c.d * 0.5, h: c.h * 0.5, z: -c.d * 0.16, y: 0.16 }),
      ...c.roof({ w: c.w * 0.82, d: c.d * 0.56, h: c.h * 0.38, y: c.h * 0.5 + 0.16 }),
      ...c.prop('trough', { x: 0, z: c.d * 0.34, s: 1.2 }),
      ...c.prop('hayBale', { x: c.w * 0.32, z: c.d * 0.3 }),
    ],
  },
  siegeWorkshop: hall([3, 3], BUILDING_HEIGHT.siegeWorkshop, (c) => [
    ...c.prop('cartWheel', { x: -c.w * 0.32, z: c.d * 0.3 }),
    ...c.prop('logPile', { x: c.w * 0.3, z: c.d * 0.3, ry: 1.2 }),
  ]),
  forge: hall([3, 3], BUILDING_HEIGHT.forge, (c) => [
    ...c.prop('forgeHearth', { x: c.w * 0.28, z: c.d * 0.3 }),
    ...c.prop('anvil', { x: -c.w * 0.28, z: c.d * 0.3 }),
  ]),
  blacksmith: hall([3, 3], BUILDING_HEIGHT.blacksmith, (c) => [
    ...c.prop('anvil', { x: c.w * 0.28, z: c.d * 0.32, s: 1.2 }),
    ...c.prop('forgeHearth', { x: -c.w * 0.28, z: c.d * 0.3, s: 0.9 }),
  ]),
  warAcademy: hall([3, 3], BUILDING_HEIGHT.warAcademy, (c) => [
    ...c.banner({ x: -c.w * 0.32, z: c.d * 0.3, h: c.h * 0.8 }),
    ...c.banner({ x: c.w * 0.32, z: c.d * 0.3, h: c.h * 0.8 }),
  ]),
  guildHall: hall([3, 3], BUILDING_HEIGHT.guildHall, (c) => [...c.prop('barrel', { x: -c.w * 0.3, z: c.d * 0.3 })]),
  temple: hall([3, 3], BUILDING_HEIGHT.temple, (c) => [...c.prop('lantern', { x: -c.w * 0.3, z: c.d * 0.32 }), ...c.prop('lantern', { x: c.w * 0.3, z: c.d * 0.32 })]),
  imperialAcademy: hall([3, 3], BUILDING_HEIGHT.imperialAcademy, (c) => [...c.prop('lantern', { x: 0, z: c.d * 0.36, s: 1.2 })]),
  warriorLodge: hall([3, 3], BUILDING_HEIGHT.warriorLodge, (c) => [...c.prop('weaponRack', { x: c.w * 0.3, z: c.d * 0.3 })]),
  fireworkFoundry: hall([3, 3], BUILDING_HEIGHT.fireworkFoundry, (c) => [...c.prop('brazier', { x: -c.w * 0.3, z: c.d * 0.3, s: 1.2 })]),
  fireOilFoundry: hall([3, 3], BUILDING_HEIGHT.fireOilFoundry, (c) => [...c.prop('brazier', { x: c.w * 0.3, z: c.d * 0.3, s: 1.2 }), ...c.prop('barrel', { x: -c.w * 0.3, z: c.d * 0.3 })]),
  sunfireYard: hall([3, 3], BUILDING_HEIGHT.sunfireYard, (c) => [...c.prop('brazier', { x: 0, z: c.d * 0.36, s: 1.4 })]),
  cathedral: {
    footprint: [4, 4],
    build: (c) => [
      ...c.plinth(),
      ...c.mass({ w: c.w * 0.6, d: c.d * 0.8, h: c.h * 0.44, y: 0.16 }),
      ...c.roof({ w: c.w * 0.6, d: c.d * 0.8, h: c.h * 0.22, y: c.h * 0.44 + 0.16 }),
      ...c.tower({ r: c.w * 0.16, h: c.h * 0.78, x: -c.w * 0.3, z: -c.d * 0.28 }),
      ...c.finial(c.h * 0.98, 1.4),
    ],
  },

  // --- Defence ------------------------------------------------------------
  watchTower: {
    footprint: [2, 2],
    build: (c) => [...c.plinth(), ...c.tower({ r: c.w * 0.3, h: c.h * 0.78, x: 0, z: 0 })],
  },
  bambooWatchpost: {
    footprint: [2, 2],
    build: (c) => [...c.plinth(), ...c.tower({ r: c.w * 0.26, h: c.h * 0.8, x: 0, z: 0 })],
  },
  ballistaTower: {
    footprint: [2, 2],
    build: (c) => [
      ...c.plinth(),
      ...c.tower({ r: c.w * 0.32, h: c.h * 0.7, x: 0, z: 0, cap: 'crenellated' }),
      ...at(slab({ w: 0.7, h: 0.08, d: 0.1, slot: 'woodDark' }), { y: c.h * 0.78 }),
    ],
  },
  domeTower: {
    footprint: [2, 2],
    build: (c) => [...c.plinth(), ...c.tower({ r: c.w * 0.3, h: c.h * 0.72, x: 0, z: 0, cap: 'onionDome' })],
  },
  fortressTower: {
    footprint: [3, 3],
    build: (c) => [
      ...c.plinth(),
      ...c.tower({ r: c.w * 0.32, h: c.h * 0.74, x: 0, z: 0, cap: 'crenellated' }),
      ...c.banner({ x: c.w * 0.28, z: c.d * 0.28, h: c.h * 0.5 }),
    ],
  },
  woodenWall: {
    footprint: [1, 1],
    build: (c) => [
      ...at(slab({ w: c.w * 0.92, h: c.h * 0.88, d: c.d * 0.42, slot: 'wood' }), { y: (c.h * 0.88) / 2 }),
      ...at(spike({ r: c.w * 0.46, h: c.h * 0.16, sides: 4, slot: 'woodDark' }), { y: c.h * 0.92 }),
    ],
  },
  stoneWall: {
    footprint: [1, 1],
    build: (c) => [
      ...at(slab({ w: c.w * 0.94, h: c.h * 0.84, d: c.d * 0.44, slot: c.style.wallSlot }), { y: (c.h * 0.84) / 2 }),
      ...crenellation({ halfW: c.w * 0.34, halfD: 0, y: c.h * 0.84, step: c.w * 0.34, size: 0.16, slot: c.style.wallSlot }),
    ],
  },
  gate: {
    footprint: [2, 1],
    build: (c) => [
      ...at(slab({ w: c.w * 0.26, h: c.h * 0.86, d: c.d * 0.5, slot: c.style.wallSlot }), { x: -c.w * 0.36, y: (c.h * 0.86) / 2 }),
      ...at(slab({ w: c.w * 0.26, h: c.h * 0.86, d: c.d * 0.5, slot: c.style.wallSlot }), { x: c.w * 0.36, y: (c.h * 0.86) / 2 }),
      ...at(slab({ w: c.w * 0.5, h: c.h * 0.2, d: c.d * 0.5, slot: c.style.wallSlot }), { y: c.h * 0.76 }),
      ...at(slab({ w: c.w * 0.44, h: c.h * 0.56, d: 0.1, slot: 'woodDark' }), { y: (c.h * 0.56) / 2 }),
    ],
  },
  alarmBell: {
    footprint: [1, 1],
    build: (c) => [
      ...post({ r: 0.05, h: c.h * 0.8, slot: 'woodDark', x: -0.18, y: (c.h * 0.8) / 2 }),
      ...post({ r: 0.05, h: c.h * 0.8, slot: 'woodDark', x: 0.18, y: (c.h * 0.8) / 2 }),
      ...at(slab({ w: 0.5, h: 0.07, d: 0.1, slot: 'wood' }), { y: c.h * 0.8 }),
      ...at(ball({ r: 0.15, segments: 6, slot: 'copper' }), { y: c.h * 0.64 }),
    ],
  },
};

/** Keeps: a walled enclosure with corner towers and a central hall. */
function keepBlueprint(): BuildingBlueprint {
  return {
    footprint: [5, 5],
    build: (c) => {
      const wallH = c.h * 0.4;
      const half = c.w * 0.44;
      const out: Node[] = [...c.plinth({ inset: -0.16, h: 0.2 })];
      // Curtain walls.
      for (const [x, z, w, d] of [
        [0, -half, c.w * 0.9, 0.24],
        [0, half, c.w * 0.9, 0.24],
        [-half, 0, 0.24, c.d * 0.9],
        [half, 0, 0.24, c.d * 0.9],
      ] as const) {
        out.push(...at(slab({ w, h: wallH, d, slot: c.style.wallSlot }), { x, z, y: wallH / 2 + 0.2 }));
      }
      out.push(
        ...crenellation({ halfW: half, halfD: half, y: wallH + 0.2, step: c.w * 0.22, size: 0.18, slot: c.style.wallSlot }),
      );
      // Corner towers — thick enough to read as towers rather than posts, and
      // tall enough to break the wall line.
      for (const [x, z] of [
        [-half, -half],
        [half, -half],
        [-half, half],
        [half, half],
      ] as const) {
        out.push(...c.tower({ r: 0.44, h: wallH * 1.7, x, z }));
      }
      // Central hall + roof. The roof is kept to a modest share of the total:
      // a keep should read as masonry with a roof on it, not as a giant gable.
      const hallH = c.h * 0.5;
      out.push(...c.mass({ w: c.w * 0.52, d: c.d * 0.52, h: hallH, y: 0.2 }));
      out.push(...c.roof({ w: c.w * 0.52, d: c.d * 0.52, h: c.h * 0.19, y: hallH + 0.2, kind: c.style.keepRoof }));
      out.push(...c.finial(c.h * 0.94, 1.5));
      out.push(...c.banner({ x: -c.w * 0.3, z: c.d * 0.3, h: c.h * 0.5 }));
      // Gate.
      out.push(...at(slab({ w: 0.7, h: wallH * 0.7, d: 0.12, slot: 'woodDark' }), { z: half + 0.08, y: (wallH * 0.7) / 2 + 0.2 }));
      return out;
    },
  };
}

for (const key of ['keepEuropean', 'keepAsian', 'keepAfrican', 'keepMiddleEastern']) {
  BLUEPRINTS[key] = keepBlueprint();
}

export function hasBuildingBlueprint(meshKey: string): boolean {
  return meshKey in BLUEPRINTS;
}

export function buildingBlueprintKeys(): string[] {
  return Object.keys(BLUEPRINTS);
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

export interface BuildingMeshOpts {
  tier?: number;
  level?: number;
  /** Footprint from the sim, so the mesh matches the space it occupies. */
  footprint?: [number, number];
}

/** Height this key should build to, accounting for tier and level. */
export function buildingHeight(meshKey: string, opts: BuildingMeshOpts = {}): number {
  if (meshKey.startsWith('keep')) return keepHeight(opts.tier ?? 1);
  if (meshKey === 'house') return houseHeight(opts.level ?? 1);
  return BUILDING_HEIGHT[meshKey] ?? 2.2;
}

/**
 * Compile a building to a THREE.Group.
 *
 * Unlike the old `buildBuildingMesh`, an unknown key throws in dev rather than
 * silently substituting a generic hut — a silent fallback is exactly what let
 * art gaps sit unnoticed. Production still returns a marker so a typo can never
 * blank the battlefield mid-match.
 */
export function buildBuildingMesh(
  meshKey: string,
  faction: string,
  teamColor: number,
  opts: BuildingMeshOpts = {},
): THREE.Group {
  const bp = BLUEPRINTS[meshKey];
  if (!bp) {
    if (import.meta.env?.DEV) {
      console.error(`[art] no building blueprint for mesh key "${meshKey}"`);
    }
    return missingMarker();
  }

  const style = styleFor(artFaction(faction));
  const [fw, fd] = opts.footprint ?? bp.footprint;
  const h = buildingHeight(meshKey, opts);
  const ctx = makeCtx(style, fw * 0.86, fd * 0.86, h);

  const nodes = bp.build(ctx);
  ground(nodes);
  fitHeight(nodes, h);
  bakeAo(nodes, style.palette);

  return mergeToGroup(nodes, teamColor);
}

/** Merge nodes into at most two meshes: fixed-colour body and team-coloured. */
function mergeToGroup(nodes: Node[], teamColor: number): THREE.Group {
  const group = new THREE.Group();
  const body: THREE.BufferGeometry[] = [];
  const team: THREE.BufferGeometry[] = [];
  for (const n of nodes) {
    (n.slot === 'team' || n.layer === 'team' ? team : body).push(n.geo);
  }
  if (body.length) {
    const geo = mergeGeometries(body);
    if (geo) {
      const mesh = new THREE.Mesh(geo, sharedBodyMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  if (team.length) {
    const geo = mergeGeometries(team);
    if (geo) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: teamColor }));
      mesh.castShadow = true;
      mesh.userData.bannerCloth = true;
      mesh.userData.flutterPhase = 0;
      group.add(mesh);
    }
  }
  return group;
}

let bodyMaterial: THREE.MeshLambertMaterial | null = null;
function sharedBodyMaterial(): THREE.MeshLambertMaterial {
  if (!bodyMaterial) bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  return bodyMaterial;
}

function missingMarker(): THREE.Group {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.6, 1),
    new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }),
  );
  mesh.position.y = 0.8;
  g.add(mesh);
  return g;
}

/**
 * Construction scaffold shown while a building is going up. Lives here rather
 * than with the buildings so nothing outside the art system needs the old mesh
 * modules.
 */
export function buildScaffoldMesh(footprint: [number, number]): THREE.Group {
  const [w, d] = footprint;
  const nodes: Node[] = [
    ...slab({ w: w * 0.9, h: 0.25, d: d * 0.9, slot: 'wood', y: 0.12 }),
  ];
  for (const x of [-w * 0.35, w * 0.35]) {
    for (const z of [-d * 0.35, d * 0.35]) {
      nodes.push(...post({ r: 0.06, h: 1.0, slot: 'woodDark', x, y: 0.5, z, sides: 4 }));
    }
  }
  bakeAo(nodes, styleFor('neutral').palette);
  return mergeToGroup(nodes, 0xffffff);
}

export { measure as measureNodes };
export type { Node, ArtFactionId };
