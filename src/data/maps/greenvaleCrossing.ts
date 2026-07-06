import type { MapDef } from '../types';
import { baseResources, mirrored } from './mapHelpers';

const SIZE: [number, number] = [128, 128];

/** Beginner map: open center, two contested gold deposits. */
export const greenvaleCrossing: MapDef = {
  id: 'greenvaleCrossing',
  name: 'Greenvale Crossing',
  size: 'small',
  description: 'Beginner map with an open center and two contested gold deposits.',
  worldSize: SIZE,
  spawns: [
    { x: 26, y: 26 },
    { x: 102, y: 102 },
  ],
  terrain: { seed: 101, biome: 'grass' },
  resources: [
    ...mirrored(baseResources({ x: 26, y: 26 }, { x: -0.7, y: -0.7 }), SIZE),
    // Contested center gold
    { type: 'gold', pos: { x: 52, y: 76 }, amount: 4000 },
    { type: 'gold', pos: { x: 76, y: 52 }, amount: 4000 },
    // Mid forests
    ...mirrored([{ type: 'forest', pos: { x: 46, y: 58 }, amount: 5000 }], SIZE),
    ...mirrored([{ type: 'berries', pos: { x: 58, y: 40 }, amount: 1500 }], SIZE),
  ],
  objectives: [{ type: 'watchHill', pos: { x: 64, y: 64 } }],
  blockers: [
    { pos: { x: 20, y: 108 }, radius: 10, kind: 'rocks' },
    { pos: { x: 108, y: 20 }, radius: 10, kind: 'rocks' },
  ],
};
