import type { UnitDef } from '../types';
import { EUROPEAN_UNITS } from './european';

const ALL_UNITS: UnitDef[] = [...EUROPEAN_UNITS];

export const UNIT_DB = new Map<string, UnitDef>(ALL_UNITS.map((u) => [u.id, u]));

export function getUnit(id: string): UnitDef {
  const u = UNIT_DB.get(id);
  if (!u) throw new Error(`Unknown unit: ${id}`);
  return u;
}

export function registerUnits(units: UnitDef[]): void {
  for (const u of units) {
    if (UNIT_DB.has(u.id)) throw new Error(`Duplicate unit id: ${u.id}`);
    UNIT_DB.set(u.id, u);
  }
}
