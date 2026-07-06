import type { MapDef, MapBlocker } from '../types';
import { baseResources, mirrored, mirroredBlockers, mirroredObjectives } from './mapHelpers';

const SIZE: [number, number] = [208, 208];

// Mountain ridges forming three lanes across the map.
function ridges(): MapBlocker[] {
  const blockers: MapBlocker[] = [];
  // Two long diagonal ridges with gaps forming lanes.
  for (let i = 0; i < 8; i++) {
    blockers.push({ pos: { x: 52 + i * 12, y: 150 - i * 6 }, radius: 9, kind: 'cliff' });
  }
  return blockers;
}

/** Mountain lanes and high-ground siege positions. */
export const ashenRidge: MapDef = {
  id: 'ashenRidge',
  name: 'Ashen Ridge',
  size: 'large',
  description: 'Mountain lanes and high-ground siege positions.',
  worldSize: SIZE,
  spawns: [
    { x: 36, y: 36 },
    { x: 172, y: 172 },
  ],
  terrain: { seed: 505, biome: 'mountain' },
  resources: [
    ...mirrored(baseResources({ x: 36, y: 36 }, { x: -0.7, y: -0.7 }), SIZE),
    ...mirrored(
      [
        { type: 'gold', pos: { x: 96, y: 44 }, amount: 5000 },
        { type: 'stone', pos: { x: 60, y: 96 }, amount: 5000 },
        { type: 'forest', pos: { x: 110, y: 70 }, amount: 6000 },
        { type: 'berries', pos: { x: 76, y: 60 }, amount: 2000 },
      ],
      SIZE,
    ),
  ],
  objectives: mirroredObjectives(
    [
      { type: 'watchHill', pos: { x: 104, y: 84 } },
      { type: 'shrine', pos: { x: 60, y: 148 } },
    ],
    SIZE,
  ),
  blockers: mirroredBlockers(ridges(), SIZE),
};
