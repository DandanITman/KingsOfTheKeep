import type { Slot } from '../palette';
import { at, clone, type Node } from './node';
import { ball, plate, post, prism, slab, spike } from './forms';

/**
 * Small objects placed around a building. These carry most of the burden of
 * telling similar buildings apart.
 *
 * The three gathering camps used to be the same two boxes with a differently
 * coloured cube on top, which is why Lumber Camp, Mining Camp and Stone Quarry
 * were indistinguishable in the card bar. The fix is not colour, it is
 * **dominant axis**: the mine gets a tall vertical headframe, the quarry a
 * diagonal derrick boom, the lumber camp low horizontal log stacks. Three
 * different shapes read instantly even in pure silhouette.
 */
export type PropName =
  | 'logPile'
  | 'sawhorse'
  | 'axeStump'
  | 'mineheadFrame'
  | 'oreCart'
  | 'oreHeap'
  | 'derrick'
  | 'stoneBlockPile'
  | 'rubble'
  | 'barrel'
  | 'crate'
  | 'sack'
  | 'anvil'
  | 'forgeHearth'
  | 'weaponRack'
  | 'targetButt'
  | 'trough'
  | 'hayBale'
  | 'cropRow'
  | 'wellHead'
  | 'brazier'
  | 'lantern'
  | 'marketStall'
  | 'cookingPot'
  | 'drum'
  | 'cartWheel';

export interface PropOpts {
  x?: number;
  z?: number;
  y?: number;
  ry?: number;
  /** Uniform size multiplier. */
  s?: number;
  wood: Slot;
  darkWood: Slot;
  metal: Slot;
  stone: Slot;
  cloth: Slot;
  accent: Slot;
}

export function prop(name: PropName, o: PropOpts): Node[] {
  const s = o.s ?? 1;
  const nodes = build(name, o, s);
  return at(nodes, { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0, ry: o.ry ?? 0 });
}

function build(name: PropName, o: PropOpts, s: number): Node[] {
  switch (name) {
    case 'logPile': {
      // Low, horizontal, rolling — the lumber camp's signature axis.
      const log = (y: number, x: number) =>
        post({ r: 0.11 * s, h: 0.8 * s, slot: o.wood, sides: 7, rz: Math.PI / 2, x, y });
      return [...log(0.11 * s, 0), ...log(0.11 * s, 0), ...at(log(0.11 * s, 0), { z: 0.24 * s }), ...at(log(0.32 * s, 0), { z: 0.12 * s })];
    }
    case 'sawhorse':
      return [
        ...post({ r: 0.03 * s, h: 0.34 * s, slot: o.darkWood, x: -0.14 * s, y: 0.17 * s, rz: 0.3 }),
        ...post({ r: 0.03 * s, h: 0.34 * s, slot: o.darkWood, x: 0.14 * s, y: 0.17 * s, rz: -0.3 }),
        ...slab({ w: 0.5 * s, h: 0.05 * s, d: 0.09 * s, slot: o.wood, y: 0.34 * s }),
      ];
    case 'axeStump':
      return [
        ...post({ r: 0.14 * s, h: 0.26 * s, slot: o.darkWood, y: 0.13 * s }),
        ...slab({ w: 0.04 * s, h: 0.3 * s, d: 0.03 * s, slot: o.wood, y: 0.4 * s, rz: 0.35 }),
        ...slab({ w: 0.14 * s, h: 0.1 * s, d: 0.03 * s, slot: o.metal, y: 0.53 * s, x: 0.05 * s, rz: 0.35 }),
      ];

    case 'mineheadFrame': {
      // Tall A-frame: the mine's vertical silhouette, readable at any distance.
      const leg = (x: number, rz: number) => post({ r: 0.035 * s, h: 0.95 * s, slot: o.darkWood, x, y: 0.47 * s, rz });
      return [
        ...leg(-0.2 * s, 0.22),
        ...leg(0.2 * s, -0.22),
        ...slab({ w: 0.34 * s, h: 0.05 * s, d: 0.05 * s, slot: o.wood, y: 0.9 * s }),
        ...post({ r: 0.09 * s, h: 0.06 * s, slot: o.metal, y: 0.9 * s, rz: Math.PI / 2 }),
        ...slab({ w: 0.03 * s, h: 0.28 * s, d: 0.03 * s, slot: o.metal, y: 0.74 * s }),
      ];
    }
    case 'oreCart':
      return [
        ...slab({ w: 0.34 * s, h: 0.2 * s, d: 0.26 * s, slot: o.darkWood, y: 0.16 * s }),
        ...post({ r: 0.07 * s, h: 0.04 * s, slot: o.metal, rz: Math.PI / 2, x: -0.15 * s, y: 0.07 * s }),
        ...post({ r: 0.07 * s, h: 0.04 * s, slot: o.metal, rz: Math.PI / 2, x: 0.15 * s, y: 0.07 * s }),
        ...ball({ r: 0.09 * s, segments: 5, slot: o.accent, y: 0.28 * s }),
      ];
    case 'oreHeap':
      return [
        ...ball({ r: 0.16 * s, segments: 5, slot: o.stone, y: 0.08 * s }),
        ...ball({ r: 0.1 * s, segments: 5, slot: o.accent, y: 0.14 * s, x: 0.13 * s }),
      ];

    case 'derrick': {
      // Diagonal boom — the quarry's signature, and the only diagonal in the set.
      return [
        ...post({ r: 0.05 * s, h: 0.7 * s, slot: o.darkWood, y: 0.35 * s }),
        ...post({ r: 0.04 * s, h: 0.8 * s, slot: o.wood, y: 0.6 * s, x: 0.24 * s, rz: -0.75 }),
        ...slab({ w: 0.02 * s, h: 0.3 * s, d: 0.02 * s, slot: o.metal, y: 0.55 * s, x: 0.5 * s }),
        ...slab({ w: 0.16 * s, h: 0.14 * s, d: 0.16 * s, slot: o.stone, y: 0.32 * s, x: 0.5 * s }),
      ];
    }
    case 'stoneBlockPile':
      return [
        ...slab({ w: 0.3 * s, h: 0.16 * s, d: 0.3 * s, slot: o.stone, y: 0.08 * s }),
        ...slab({ w: 0.24 * s, h: 0.15 * s, d: 0.24 * s, slot: o.stone, y: 0.23 * s, ry: 0.4 }),
      ];
    case 'rubble':
      return [
        ...ball({ r: 0.11 * s, segments: 5, slot: o.stone, y: 0.05 * s }),
        ...ball({ r: 0.08 * s, segments: 5, slot: o.stone, y: 0.04 * s, x: 0.15 * s, z: 0.1 * s }),
      ];

    case 'barrel':
      return [
        ...post({ r: 0.13 * s, h: 0.32 * s, slot: o.wood, y: 0.16 * s, sides: 8 }),
        ...post({ r: 0.135 * s, h: 0.04 * s, slot: o.metal, y: 0.24 * s, sides: 8 }),
      ];
    case 'crate':
      return slab({ w: 0.28 * s, h: 0.26 * s, d: 0.28 * s, slot: o.wood, y: 0.13 * s });
    case 'sack':
      return [...ball({ r: 0.13 * s, segments: 5, slot: o.cloth, y: 0.12 * s }), ...ball({ r: 0.06 * s, segments: 5, slot: o.cloth, y: 0.24 * s })];

    case 'anvil':
      return [
        ...slab({ w: 0.12 * s, h: 0.14 * s, d: 0.12 * s, slot: o.darkWood, y: 0.07 * s }),
        ...slab({ w: 0.3 * s, h: 0.1 * s, d: 0.12 * s, slot: o.metal, y: 0.19 * s }),
      ];
    case 'forgeHearth':
      return [
        ...slab({ w: 0.36 * s, h: 0.26 * s, d: 0.3 * s, slot: o.stone, y: 0.13 * s }),
        ...ball({ r: 0.11 * s, segments: 5, slot: 'ember', y: 0.3 * s }),
      ];
    case 'weaponRack': {
      const spear = (x: number) => slab({ w: 0.025 * s, h: 0.6 * s, d: 0.025 * s, slot: o.wood, x, y: 0.3 * s });
      return [
        ...slab({ w: 0.44 * s, h: 0.05 * s, d: 0.08 * s, slot: o.darkWood, y: 0.42 * s }),
        ...spear(-0.14 * s),
        ...spear(0),
        ...spear(0.14 * s),
      ];
    }
    case 'targetButt':
      return [
        ...post({ r: 0.02 * s, h: 0.5 * s, slot: o.wood, x: -0.14 * s, y: 0.25 * s }),
        ...post({ r: 0.02 * s, h: 0.5 * s, slot: o.wood, x: 0.14 * s, y: 0.25 * s }),
        ...plate({ w: 0.36 * s, h: 0.36 * s, thickness: 0.05 * s, slot: o.cloth, y: 0.42 * s }),
        ...plate({ w: 0.14 * s, h: 0.14 * s, thickness: 0.06 * s, slot: o.accent, y: 0.42 * s, z: 0.01 * s }),
      ];

    case 'trough':
      return [
        ...slab({ w: 0.5 * s, h: 0.14 * s, d: 0.2 * s, slot: o.wood, y: 0.09 * s }),
        ...slab({ w: 0.44 * s, h: 0.04 * s, d: 0.14 * s, slot: o.darkWood, y: 0.16 * s }),
      ];
    case 'hayBale':
      return post({ r: 0.16 * s, h: 0.3 * s, slot: 'crop', y: 0.15 * s, rz: Math.PI / 2, sides: 8 });
    case 'cropRow': {
      const out: Node[] = [];
      for (let i = 0; i < 4; i++) {
        out.push(...slab({ w: 0.5 * s, h: 0.1 * s, d: 0.08 * s, slot: 'crop', y: 0.05 * s, z: (i - 1.5) * 0.16 * s }));
      }
      return out;
    }
    case 'wellHead':
      return [
        ...post({ r: 0.2 * s, h: 0.22 * s, slot: o.stone, y: 0.11 * s, sides: 8 }),
        ...post({ r: 0.02 * s, h: 0.4 * s, slot: o.wood, x: -0.18 * s, y: 0.4 * s }),
        ...post({ r: 0.02 * s, h: 0.4 * s, slot: o.wood, x: 0.18 * s, y: 0.4 * s }),
        ...at(prism({ w: 0.46 * s, h: 0.16 * s, d: 0.3 * s, slot: o.darkWood }), { y: 0.6 * s }),
      ];

    case 'brazier':
      return [
        ...post({ r: 0.07 * s, h: 0.3 * s, slot: o.metal, y: 0.15 * s, taper: 1.6 }),
        ...ball({ r: 0.09 * s, segments: 5, slot: 'ember', y: 0.34 * s }),
      ];
    case 'lantern':
      return [
        ...post({ r: 0.02 * s, h: 0.5 * s, slot: o.darkWood, y: 0.25 * s }),
        ...slab({ w: 0.16 * s, h: 0.2 * s, d: 0.16 * s, slot: o.accent, y: 0.56 * s }),
      ];
    case 'marketStall':
      return [
        ...post({ r: 0.02 * s, h: 0.5 * s, slot: o.wood, x: -0.24 * s, y: 0.25 * s }),
        ...post({ r: 0.02 * s, h: 0.5 * s, slot: o.wood, x: 0.24 * s, y: 0.25 * s }),
        ...at(slab({ w: 0.58 * s, h: 0.05 * s, d: 0.42 * s, slot: o.cloth }), { y: 0.52 * s, rx: -0.25 }),
        ...slab({ w: 0.5 * s, h: 0.05 * s, d: 0.28 * s, slot: o.wood, y: 0.3 * s }),
      ];
    case 'cookingPot':
      return [
        ...ball({ r: 0.13 * s, segments: 6, slot: o.metal, y: 0.14 * s }),
        ...ball({ r: 0.07 * s, segments: 5, slot: 'ember', y: 0.03 * s }),
      ];
    case 'drum':
      return [
        ...post({ r: 0.17 * s, h: 0.28 * s, slot: o.wood, y: 0.14 * s, sides: 9 }),
        ...post({ r: 0.175 * s, h: 0.04 * s, slot: o.cloth, y: 0.28 * s, sides: 9 }),
      ];
    case 'cartWheel':
      return post({ r: 0.18 * s, h: 0.05 * s, slot: o.darkWood, sides: 8, rz: Math.PI / 2, y: 0.18 * s });
  }
}

/** Convenience: the same prop repeated with slight variation. */
export function props(name: PropName, placements: Partial<PropOpts>[], base: PropOpts): Node[] {
  const out: Node[] = [];
  for (const p of placements) out.push(...clone(prop(name, { ...base, ...p })));
  return out;
}

/** Re-export so blueprints can build one-off shapes without another import. */
export { spike, prism };
