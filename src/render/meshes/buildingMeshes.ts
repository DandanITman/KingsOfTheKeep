/**
 * Procedural building meshes. Buildings are few (dozens), so each is a
 * THREE.Group of primitive meshes with cached materials — no instancing.
 * Factories are keyed by BuildingDef.mesh and receive the team color.
 */

import * as THREE from 'three';
import { box, cone, cylinder, group, banner, mat } from './primitives';

const WOOD = 0x8a6a3a;
const DARKWOOD = 0x5d4526;
const STONE = 0x9a958c;
const DARKSTONE = 0x6e6a62;
const THATCH = 0xc2a45a;
const ROOF_RED = 0x9a4a3a;

type Factory = (team: number) => THREE.Group;

const FACTORIES: Record<string, Factory> = {
  keepEuropean: (team) => {
    const g = group(
      box(4.2, 2.6, 4.2, STONE, 0, 1.3),
      box(4.6, 0.5, 4.6, DARKSTONE, 0, 2.85),
      cylinder(0.7, 0.8, 3.8, STONE, -1.9, 1.9, -1.9, 8),
      cylinder(0.7, 0.8, 3.8, STONE, 1.9, 1.9, -1.9, 8),
      cylinder(0.7, 0.8, 3.8, STONE, -1.9, 1.9, 1.9, 8),
      cylinder(0.7, 0.8, 3.8, STONE, 1.9, 1.9, 1.9, 8),
      cone(0.85, 0.9, ROOF_RED, -1.9, 4.2, -1.9, 8),
      cone(0.85, 0.9, ROOF_RED, 1.9, 4.2, -1.9, 8),
      cone(0.85, 0.9, ROOF_RED, -1.9, 4.2, 1.9, 8),
      cone(0.85, 0.9, ROOF_RED, 1.9, 4.2, 1.9, 8),
      box(1.6, 1.9, 2.4, DARKSTONE, 0, 0.95, 2.2), // gate block
      box(1.0, 1.2, 0.2, 0x2a2018, 0, 0.6, 3.42), // gate door
      banner(team, 4.6, 0, 0),
    );
    return g;
  },
  house: (team) => group(
    box(1.5, 0.9, 1.3, 0xb59a6a, 0, 0.45),
    cone(1.25, 0.8, ROOF_RED, 0, 1.7, 0, 4),
    banner(team, 1.4, 0.6, 0.5),
  ),
  farm: () => {
    const g = group(box(1.2, 0.8, 1.0, 0xb59a6a, -0.8, 0.4, -0.8), cone(1.0, 0.6, THATCH, -0.8, 1.1, -0.8, 4));
    // Crop rows
    for (let i = 0; i < 3; i++) {
      g.add(box(2.0, 0.12, 0.4, 0x7a8a3a, 0.4, 0.06, -0.5 + i * 0.7));
    }
    return g;
  },
  lumberCamp: () => group(
    box(1.4, 0.8, 1.2, WOOD, 0, 0.4),
    box(1.7, 0.15, 1.5, DARKWOOD, 0, 0.9),
    cylinder(0.16, 0.16, 1.2, 0x6a4a26, 0.7, 0.3, 0.8, 5),
    cylinder(0.16, 0.16, 1.2, 0x6a4a26, 0.4, 0.3, 0.95, 5),
  ),
  miningCamp: () => group(
    box(1.4, 0.8, 1.2, WOOD, 0, 0.4),
    box(1.7, 0.15, 1.5, DARKWOOD, 0, 0.9),
    box(0.5, 0.4, 0.5, 0xd4af37, 0.7, 0.2, 0.7),
  ),
  quarry: () => group(
    box(1.4, 0.8, 1.2, WOOD, 0, 0.4),
    box(1.7, 0.15, 1.5, DARKWOOD, 0, 0.9),
    box(0.55, 0.45, 0.5, STONE, 0.7, 0.22, 0.7),
  ),
  storehouse: () => group(
    box(1.6, 1.0, 1.4, WOOD, 0, 0.5),
    cone(1.3, 0.7, DARKWOOD, 0, 1.35, 0, 4),
    box(0.5, 0.5, 0.5, 0xb59a6a, 0.9, 0.25, 0.7),
  ),
  market: (team) => group(
    box(2.2, 0.2, 2.2, WOOD, 0, 0.1),
    box(0.1, 1.1, 0.1, DARKWOOD, -0.9, 0.65, -0.9),
    box(0.1, 1.1, 0.1, DARKWOOD, 0.9, 0.65, -0.9),
    box(0.1, 1.1, 0.1, DARKWOOD, -0.9, 0.65, 0.9),
    box(0.1, 1.1, 0.1, DARKWOOD, 0.9, 0.65, 0.9),
    box(2.4, 0.15, 2.4, team, 0, 1.3),
    box(0.6, 0.5, 0.6, 0xc2a45a, -0.4, 0.45, 0.3),
    box(0.5, 0.4, 0.5, 0x9a4a3a, 0.45, 0.4, -0.3),
  ),
  barracks: (team) => group(
    box(2.4, 1.2, 2.0, DARKSTONE, 0, 0.6),
    box(2.6, 0.7, 2.2, ROOF_RED, 0, 1.55),
    box(0.8, 1.0, 0.2, 0x2a2018, 0, 0.5, 1.05),
    banner(team, 2.4, 1.0, 0.8),
  ),
  archeryRange: (team) => {
    const g = group(
      box(1.8, 1.0, 1.4, WOOD, -0.6, 0.5, -0.4),
      cone(1.4, 0.7, THATCH, -0.6, 1.35, -0.4, 4),
      banner(team, 1.8, -1.2, 0.4),
    );
    // Target
    g.add(cylinder(0.4, 0.4, 0.12, 0xe8e2d4, 1.0, 0.7, 0.6, 8));
    g.add(cylinder(0.22, 0.22, 0.14, 0xc23b2e, 1.0, 0.7, 0.6, 8));
    return g;
  },
  stable: (team) => group(
    box(2.6, 1.0, 1.8, WOOD, 0, 0.5),
    box(2.8, 0.6, 2.0, DARKWOOD, 0, 1.3),
    box(0.9, 0.8, 0.1, 0x2a2018, 0, 0.4, 0.95),
    box(0.55, 0.4, 0.3, 0x7a5230, 0.8, 0.6, 0.6),
    banner(team, 2.2, -1.1, 0.7),
  ),
  siegeWorkshop: (team) => group(
    box(2.8, 1.2, 2.4, DARKWOOD, 0, 0.6),
    box(3.0, 0.5, 2.6, DARKIRON_ROOF, 0, 1.45),
    cylinder(0.18, 0.18, 1.4, WOOD, 1.0, 0.7, 0.9, 5),
    box(0.8, 0.1, 0.8, WOOD, -0.8, 1.0, 0.8),
    banner(team, 2.4, 1.2, -0.9),
  ),
  forge: (team) => group(
    box(1.9, 1.0, 1.7, DARKSTONE, 0, 0.5),
    box(2.1, 0.5, 1.9, 0x4a3f35, 0, 1.25),
    cylinder(0.25, 0.3, 1.0, DARKSTONE, 0.6, 1.9, -0.4, 6), // chimney
    box(0.5, 0.3, 0.5, 0xe86a2a, -0.5, 0.2, 0.75), // glow
    banner(team, 1.8, -0.8, 0.7),
  ),
  blacksmith: (team) => group(
    box(1.9, 1.0, 1.7, STONE, 0, 0.5),
    box(2.1, 0.5, 1.9, 0x4a3f35, 0, 1.25),
    cylinder(0.22, 0.26, 0.9, DARKSTONE, -0.6, 1.8, -0.4, 6),
    box(0.4, 0.35, 0.4, 0x3a3f45, 0.55, 0.18, 0.7), // anvil
    banner(team, 1.8, -0.8, 0.7),
  ),
  warAcademy: (team) => group(
    box(2.4, 1.4, 2.0, STONE, 0, 0.7),
    box(2.6, 0.3, 2.2, DARKSTONE, 0, 1.55),
    cylinder(0.3, 0.35, 2.2, STONE, -1.0, 1.1, -0.8, 6),
    cone(0.4, 0.5, ROOF_RED, -1.0, 2.45, -0.8, 6),
    banner(team, 2.6, 1.0, 0.8),
  ),
  watchTower: (team) => group(
    cylinder(0.55, 0.7, 2.6, WOOD, 0, 1.3, 0, 6),
    box(1.5, 0.5, 1.5, DARKWOOD, 0, 2.85),
    cone(1.1, 0.8, THATCH, 0, 3.6, 0, 4),
    banner(team, 3.4, 0.5, 0.5),
  ),
  ballistaTower: (team) => group(
    cylinder(0.6, 0.75, 2.8, STONE, 0, 1.4, 0, 6),
    box(1.6, 0.5, 1.6, DARKSTONE, 0, 3.05),
    box(0.7, 0.1, 0.1, DARKWOOD, 0, 3.4),
    box(0.08, 0.08, 0.9, DARKWOOD, 0.1, 3.42),
    banner(team, 3.6, 0.55, 0.55),
  ),
  fortressTower: (team) => group(
    cylinder(0.9, 1.1, 3.6, STONE, 0, 1.8, 0, 8),
    cylinder(1.15, 1.15, 0.5, DARKSTONE, 0, 3.85, 0, 8),
    cone(1.0, 1.0, ROOF_RED, 0, 4.6, 0, 8),
    banner(team, 4.4, 0.7, 0.7),
  ),
  woodenWall: () => group(
    box(0.95, 1.2, 0.3, WOOD, 0, 0.6),
    box(0.95, 0.15, 0.36, DARKWOOD, 0, 1.25),
  ),
  stoneWall: () => group(
    box(0.95, 1.5, 0.4, STONE, 0, 0.75),
    box(0.95, 0.2, 0.5, DARKSTONE, 0, 1.6),
  ),
  gate: (team) => group(
    box(0.5, 1.8, 0.5, STONE, -0.7, 0.9),
    box(0.5, 1.8, 0.5, STONE, 0.7, 0.9),
    box(1.9, 0.4, 0.5, DARKSTONE, 0, 1.9),
    box(1.0, 1.3, 0.15, 0x3a2c18, 0, 0.65),
    banner(team, 2.6, 0, 0),
  ),
  alarmBell: () => group(
    box(0.15, 1.6, 0.15, DARKWOOD, 0, 0.8),
    box(0.7, 0.15, 0.15, DARKWOOD, 0, 1.6),
    cone(0.2, 0.3, 0xd4af37, 0, 1.35),
  ),
  guildHall: (team) => group(
    box(2.2, 1.3, 1.8, 0xb59a6a, 0, 0.65),
    box(2.4, 0.6, 2.0, ROOF_RED, 0, 1.6),
    box(0.6, 0.6, 0.1, 0xd4af37, 0, 1.0, 0.95),
    banner(team, 2.2, 1.0, 0.7),
  ),
  cathedral: (team) => group(
    box(1.4, 1.6, 1.4, 0xe8e2d4, 0, 0.8),
    cone(1.1, 1.4, 0x6a7a9a, 0, 2.3, 0, 4),
    box(0.12, 0.6, 0.12, 0xd4af37, 0, 3.2),
    banner(team, 2.0, 0.6, 0.6),
  ),
};

const DARKIRON_ROOF = 0x555a62;

/** Simple hut fallback so unknown mesh keys never crash. */
function fallback(team: number): THREE.Group {
  return group(box(1.4, 1.0, 1.4, 0xb59a6a, 0, 0.5), cone(1.2, 0.8, ROOF_RED, 0, 1.4, 0, 4), banner(team, 1.6, 0.5, 0.5));
}

export function buildBuildingMesh(meshKey: string, teamColor: number): THREE.Group {
  const factory = FACTORIES[meshKey];
  const g = factory ? factory(teamColor) : fallback(teamColor);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function registerBuildingMeshes(defs: Record<string, Factory>): void {
  Object.assign(FACTORIES, defs);
}

/** Scaffold shown while a building is under construction. */
export function buildScaffoldMesh(footprint: [number, number]): THREE.Group {
  const w = footprint[0];
  const d = footprint[1];
  const g = group(
    box(w * 0.9, 0.25, d * 0.9, 0x8a6a3a, 0, 0.12),
    box(0.1, 1.0, 0.1, 0x6a4a26, -w * 0.35, 0.5, -d * 0.35),
    box(0.1, 1.0, 0.1, 0x6a4a26, w * 0.35, 0.5, -d * 0.35),
    box(0.1, 1.0, 0.1, 0x6a4a26, -w * 0.35, 0.5, d * 0.35),
    box(0.1, 1.0, 0.1, 0x6a4a26, w * 0.35, 0.5, d * 0.35),
  );
  return g;
}

export { mat };
