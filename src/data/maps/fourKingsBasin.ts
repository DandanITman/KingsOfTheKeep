import type { MapDef } from '../types';
import { baseResources, mirrored } from './mapHelpers';

const SIZE: [number, number] = [208, 208];

/** Large open basin designed for future 2v2/FFA; plays as a rich 1v1 for now. */
export const fourKingsBasin: MapDef = {
  id: 'fourKingsBasin',
  name: 'Four Kings Basin',
  size: 'large',
  description: 'A vast basin with riches at its heart. Built for future team battles.',
  worldSize: SIZE,
  spawns: [
    { x: 40, y: 104 },
    { x: 168, y: 104 },
    { x: 104, y: 40 },
    { x: 104, y: 168 },
  ],
  terrain: { seed: 606, biome: 'savanna' },
  resources: [
    ...mirrored(baseResources({ x: 40, y: 104 }, { x: -0.9, y: 0 }), SIZE),
    ...mirrored(baseResources({ x: 104, y: 40 }, { x: 0, y: -0.9 }), SIZE),
    // Central treasure basin
    { type: 'gold', pos: { x: 96, y: 96 }, amount: 6000 },
    { type: 'gold', pos: { x: 112, y: 112 }, amount: 6000 },
    { type: 'stone', pos: { x: 112, y: 96 }, amount: 5000 },
    { type: 'berries', pos: { x: 96, y: 112 }, amount: 2500 },
  ],
  objectives: [
    { type: 'relic', pos: { x: 104, y: 104 } },
    { type: 'shrine', pos: { x: 66, y: 66 } },
    { type: 'shrine', pos: { x: 142, y: 142 } },
    { type: 'shrine', pos: { x: 142, y: 66 } },
    { type: 'shrine', pos: { x: 66, y: 142 } },
  ],
  blockers: [
    { pos: { x: 34, y: 34 }, radius: 12, kind: 'rocks' },
    { pos: { x: 174, y: 174 }, radius: 12, kind: 'rocks' },
    { pos: { x: 174, y: 34 }, radius: 12, kind: 'rocks' },
    { pos: { x: 34, y: 174 }, radius: 12, kind: 'rocks' },
  ],
};
