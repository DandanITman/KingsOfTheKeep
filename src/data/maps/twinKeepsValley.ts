import type { MapDef } from '../types';
import { baseResources, mirrored, mirroredBlockers } from './mapHelpers';

const SIZE: [number, number] = [128, 128];

/** Symmetrical valley: forest and stone right beside each base, cliffs channel a center lane. */
export const twinKeepsValley: MapDef = {
  id: 'twinKeepsValley',
  name: 'Twin Keeps Valley',
  size: 'small',
  description: 'Symmetrical map with forest and stone near each base.',
  worldSize: SIZE,
  spawns: [
    { x: 24, y: 64 },
    { x: 104, y: 64 },
  ],
  terrain: { seed: 202, biome: 'grass' },
  resources: [
    ...mirrored(baseResources({ x: 24, y: 64 }, { x: -0.9, y: 0 }), SIZE),
    ...mirrored(
      [
        { type: 'stone', pos: { x: 34, y: 42 }, amount: 3000 },
        { type: 'forest', pos: { x: 40, y: 88 }, amount: 5000 },
        { type: 'gold', pos: { x: 58, y: 30 }, amount: 3500 },
      ],
      SIZE,
    ),
  ],
  objectives: [{ type: 'shrine', pos: { x: 64, y: 64 } }],
  blockers: mirroredBlockers(
    [
      { pos: { x: 56, y: 12 }, radius: 12, kind: 'cliff' },
      { pos: { x: 50, y: 116 }, radius: 12, kind: 'cliff' },
    ],
    SIZE,
  ),
};
