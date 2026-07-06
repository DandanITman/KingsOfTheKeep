import type { MapDef, MapBlocker } from '../types';
import { baseResources, mirrored } from './mapHelpers';

const SIZE: [number, number] = [160, 160];

// A river running across the middle with two crossings (choke points).
// Built as a row of water blockers with gaps at the fords.
function riverBlockers(): MapBlocker[] {
  const blockers: MapBlocker[] = [];
  for (let x = 6; x <= 154; x += 9) {
    // Fords at x≈46 and x≈114
    if (Math.abs(x - 46) < 10 || Math.abs(x - 114) < 10) continue;
    blockers.push({ pos: { x, y: 80 + Math.sin(x * 0.15) * 6 }, radius: 7, kind: 'water' });
  }
  return blockers;
}

/** River crossings and choke points. */
export const riverCrown: MapDef = {
  id: 'riverCrown',
  name: 'River Crown',
  size: 'medium',
  description: 'A great river splits the field — hold the crossings.',
  worldSize: SIZE,
  spawns: [
    { x: 80, y: 28 },
    { x: 80, y: 132 },
  ],
  terrain: { seed: 404, biome: 'grass' },
  resources: [
    ...mirrored(baseResources({ x: 80, y: 28 }, { x: 0, y: -0.9 }), SIZE),
    ...mirrored(
      [
        { type: 'gold', pos: { x: 34, y: 48 }, amount: 3500 },
        { type: 'forest', pos: { x: 124, y: 44 }, amount: 4500 },
        { type: 'stone', pos: { x: 46, y: 64 }, amount: 3000 },
      ],
      SIZE,
    ),
  ],
  objectives: [
    { type: 'shrine', pos: { x: 46, y: 80 } },
    { type: 'shrine', pos: { x: 114, y: 80 } },
  ],
  blockers: riverBlockers(),
};
