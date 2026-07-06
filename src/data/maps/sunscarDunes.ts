import type { MapDef } from '../types';
import { baseResources, mirrored, mirroredObjectives } from './mapHelpers';

const SIZE: [number, number] = [160, 160];

/** Desert map with exposed resources and wide attack lanes. */
export const sunscarDunes: MapDef = {
  id: 'sunscarDunes',
  name: 'Sunscar Dunes',
  size: 'medium',
  description: 'Desert map with exposed resources and wide attack lanes.',
  worldSize: SIZE,
  spawns: [
    { x: 30, y: 30 },
    { x: 130, y: 130 },
  ],
  terrain: { seed: 303, biome: 'desert' },
  resources: [
    ...mirrored(baseResources({ x: 30, y: 30 }, { x: -0.7, y: -0.7 }), SIZE),
    // Exposed riches in the open — worth fighting over
    { type: 'gold', pos: { x: 80, y: 56 }, amount: 5000 },
    { type: 'gold', pos: { x: 80, y: 104 }, amount: 5000 },
    { type: 'stone', pos: { x: 56, y: 80 }, amount: 4000 },
    { type: 'stone', pos: { x: 104, y: 80 }, amount: 4000 },
    ...mirrored(
      [
        { type: 'forest', pos: { x: 54, y: 24 }, amount: 3500 },
        { type: 'berries', pos: { x: 66, y: 44 }, amount: 1800 },
      ],
      SIZE,
    ),
  ],
  objectives: mirroredObjectives([{ type: 'tradePost', pos: { x: 48, y: 112 } }], SIZE),
  blockers: [{ pos: { x: 80, y: 80 }, radius: 7, kind: 'rocks' }],
};
