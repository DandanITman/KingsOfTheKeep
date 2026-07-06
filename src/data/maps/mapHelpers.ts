import type { MapBlocker, MapObjective, MapResourceSpot } from '../types';
import type { Vec2 } from '@/core/mathUtils';

/** Point-mirror a position through the map center (for symmetric 1v1 maps). */
export function mirrorPos(pos: Vec2, worldSize: [number, number]): Vec2 {
  return { x: worldSize[0] - pos.x, y: worldSize[1] - pos.y };
}

/** Duplicate resource spots mirrored through center so both spawns are fair. */
export function mirrored(spots: MapResourceSpot[], worldSize: [number, number]): MapResourceSpot[] {
  return [
    ...spots,
    ...spots.map((s) => ({ ...s, pos: mirrorPos(s.pos, worldSize) })),
  ];
}

export function mirroredObjectives(
  objectives: MapObjective[],
  worldSize: [number, number],
): MapObjective[] {
  return [
    ...objectives,
    ...objectives.map((o) => ({ ...o, pos: mirrorPos(o.pos, worldSize) })),
  ];
}

export function mirroredBlockers(
  blockers: MapBlocker[],
  worldSize: [number, number],
): MapBlocker[] {
  return [...blockers, ...blockers.map((b) => ({ ...b, pos: mirrorPos(b.pos, worldSize) }))];
}

/** Standard base resource kit around a spawn point, angled toward map edge. */
export function baseResources(spawn: Vec2, edgeDir: Vec2): MapResourceSpot[] {
  const behind = (d: number, side: number): Vec2 => ({
    x: spawn.x + edgeDir.x * d + edgeDir.y * side,
    y: spawn.y + edgeDir.y * d - edgeDir.x * side,
  });
  return [
    { type: 'forest', pos: behind(14, 10), amount: 4000 },
    { type: 'forest', pos: behind(16, -8), amount: 4000 },
    { type: 'berries', pos: behind(10, 0), amount: 1500 },
    { type: 'gold', pos: behind(6, 16), amount: 3000 },
    { type: 'stone', pos: behind(6, -16), amount: 2500 },
  ];
}
