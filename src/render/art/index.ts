import type * as THREE from 'three';
import { buildBuildingMesh as buildNewBuilding, buildingHeight as newBuildingHeight, hasBuildingBlueprint } from './buildings';
import { buildBuildingMesh as buildLegacyBuilding } from '../meshes/buildingMeshes';
import { artMode } from './switch';

export { artMode } from './switch';
export { buildingBlueprintKeys, hasBuildingBlueprint } from './buildings';
export { BUILDING_HEIGHT, UNIT_HEIGHT, unitHeight, unitRadius, keepHeight, houseHeight, wallWalkHeight, barHeight } from './scale';
export { artFaction } from './palette';

/**
 * The one entry point the render layer uses to build a building.
 *
 * Routes through the art-mode switch so the new and legacy systems can be
 * compared on the same save, and falls back to the legacy builder for any key
 * the new system doesn't cover yet — which keeps the migration incremental
 * instead of all-or-nothing.
 */
export function buildBuilding(
  meshKey: string,
  faction: string,
  teamColor: number,
  opts: { tier?: number; level?: number; footprint?: [number, number] } = {},
): THREE.Group {
  if (artMode() === 'new' && hasBuildingBlueprint(meshKey)) {
    return buildNewBuilding(meshKey, faction, teamColor, opts);
  }
  return buildLegacyBuilding(meshKey, teamColor, { tier: opts.tier, level: opts.level });
}

/** Declared height for a building, used to place health bars and props. */
export function buildingHeightFor(meshKey: string, opts: { tier?: number; level?: number } = {}): number {
  return newBuildingHeight(meshKey, opts);
}
