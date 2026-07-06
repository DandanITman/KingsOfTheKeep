import type { MapDef } from '../types';
import { greenvaleCrossing } from './greenvaleCrossing';
import { twinKeepsValley } from './twinKeepsValley';
import { sunscarDunes } from './sunscarDunes';
import { riverCrown } from './riverCrown';
import { ashenRidge } from './ashenRidge';
import { fourKingsBasin } from './fourKingsBasin';

export const MAPS: MapDef[] = [
  greenvaleCrossing,
  twinKeepsValley,
  sunscarDunes,
  riverCrown,
  ashenRidge,
  fourKingsBasin,
];

export const MAP_DB = new Map<string, MapDef>(MAPS.map((m) => [m.id, m]));

export function getMap(id: string): MapDef {
  const map = MAP_DB.get(id);
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}
