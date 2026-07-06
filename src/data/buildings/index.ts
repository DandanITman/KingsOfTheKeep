import type { BuildingDef } from '../types';
import { UNIVERSAL_BUILDINGS } from './universal';
import { EUROPEAN_BUILDINGS } from './european';

const ALL_BUILDINGS: BuildingDef[] = [...UNIVERSAL_BUILDINGS, ...EUROPEAN_BUILDINGS];

export const BUILDING_DB = new Map<string, BuildingDef>(ALL_BUILDINGS.map((b) => [b.id, b]));

export function getBuilding(id: string): BuildingDef {
  const b = BUILDING_DB.get(id);
  if (!b) throw new Error(`Unknown building: ${id}`);
  return b;
}

export function registerBuildings(buildings: BuildingDef[]): void {
  for (const b of buildings) {
    if (BUILDING_DB.has(b.id)) throw new Error(`Duplicate building id: ${b.id}`);
    BUILDING_DB.set(b.id, b);
  }
}
