import type * as THREE from 'three';
import { buildBuildingMesh, buildingHeight as newBuildingHeight } from './buildings';

export { buildingBlueprintKeys, hasBuildingBlueprint } from './buildings';
export { BUILDING_HEIGHT, UNIT_HEIGHT, unitHeight, unitRadius, keepHeight, houseHeight, wallWalkHeight, barHeight } from './scale';
export { artFaction } from './palette';

/** The one entry point the render layer uses to build a building. */
export function buildBuilding(
  meshKey: string,
  faction: string,
  teamColor: number,
  opts: { tier?: number; level?: number; footprint?: [number, number] } = {},
): THREE.Group {
  return buildBuildingMesh(meshKey, faction, teamColor, opts);
}

/** Declared height for a building, used to place health bars and props. */
export function buildingHeightFor(meshKey: string, opts: { tier?: number; level?: number } = {}): number {
  return newBuildingHeight(meshKey, opts);
}
