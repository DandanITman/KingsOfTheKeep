/**
 * Art contract tests.
 *
 * These replace `tests/assets.test.ts`, which validated the imported-model
 * manifest. They exist because the bug that made units float and render
 * oversized was a *scale* bug that nothing checked: sizes were opaque
 * multipliers with no declared meaning. Here every builder's real measured
 * geometry is compared against the height it claims, and against y = 0.
 *
 * Runs headless under vitest's node environment — Three.js geometry
 * construction needs no DOM or WebGL context, which is why the art modules are
 * kept DOM-free at import time.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildBuildingMesh, buildingBlueprintKeys, buildingHeight, hasBuildingBlueprint } from '@/render/art/buildings';
import { GROUND_EPS, HEIGHT_TOL, UNIT_HEIGHT, unitHeight, unitRadius } from '@/render/art/scale';
import { ART_FACTIONS, styleFor } from '@/render/art/factions';
import { BASE_PALETTE, paletteFor, type Slot } from '@/render/art/palette';
import { BUILDING_DB } from '@/data/buildings';
import { UNIT_DB } from '@/data/units';

const PLAYABLE = ART_FACTIONS.filter((f) => f !== 'neutral');

function measure(group: THREE.Object3D): { h: number; minY: number; w: number; d: number } {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { h: size.y, minY: box.min.y, w: size.x, d: size.z };
}

describe('building art contract', () => {
  it('every building blueprint builds for every faction', () => {
    for (const key of buildingBlueprintKeys()) {
      for (const faction of PLAYABLE) {
        const g = buildBuildingMesh(key, faction, 0x3366cc, { tier: 1, level: 1 });
        expect(g.children.length, `${key}/${faction} produced no geometry`).toBeGreaterThan(0);
      }
    }
  });

  it('every building matches its declared height and sits on the ground', () => {
    for (const key of buildingBlueprintKeys()) {
      const want = buildingHeight(key, { tier: 1, level: 1 });
      for (const faction of PLAYABLE) {
        const m = measure(buildBuildingMesh(key, faction, 0x3366cc, { tier: 1, level: 1 }));
        const err = Math.abs(m.h - want) / want;
        expect(err, `${key}/${faction} height ${m.h.toFixed(2)} vs declared ${want}`).toBeLessThan(HEIGHT_TOL);
        expect(Math.abs(m.minY), `${key}/${faction} floats/sinks at y=${m.minY.toFixed(3)}`).toBeLessThan(GROUND_EPS);
      }
    }
  });

  it('keeps grow with each fortress tier', () => {
    let previous = 0;
    for (const tier of [1, 2, 3, 4]) {
      const m = measure(buildBuildingMesh('keepEuropean', 'european', 0x3366cc, { tier }));
      expect(m.h, `tier ${tier} is not taller than tier ${tier - 1}`).toBeGreaterThan(previous);
      previous = m.h;
    }
  });

  it('the gathering camps are distinguishable by shape, not just colour', () => {
    // Lumber / mining / quarry were previously the same two boxes with a
    // differently coloured cube, which is why they were unreadable in the card
    // bar. Each now has a different dominant axis; assert the proportions
    // actually differ rather than trusting that by eye.
    const shape = (key: string) => {
      const m = measure(buildBuildingMesh(key, 'european', 0x3366cc, {}));
      return m.h / Math.max(m.w, m.d);
    };
    const mine = shape('miningCamp');
    const quarry = shape('quarry');
    const lumber = shape('lumberCamp');
    expect(Math.abs(mine - lumber)).toBeGreaterThan(0.05);
    expect(Math.abs(quarry - lumber)).toBeGreaterThan(0.05);
  });

  it('an unknown mesh key does not silently substitute another building', () => {
    // The old builder quietly returned a generic hut for any unknown key, so a
    // typo was invisible. Resolution is now explicit.
    expect(hasBuildingBlueprint('definitelyNotABuilding')).toBe(false);
    expect(hasBuildingBlueprint('barracks')).toBe(true);
  });

  it('blueprint footprints agree with the sim data they are built for', () => {
    for (const def of BUILDING_DB.values()) {
      if (!hasBuildingBlueprint(def.mesh)) continue;
      const m = measure(
        buildBuildingMesh(def.mesh, 'european', 0x3366cc, {
          tier: 1,
          level: 1,
          footprint: def.footprint as [number, number],
        }),
      );
      // Buildings may overhang their nav footprint (eaves, props) but must not
      // sprawl so far that they visually occupy a neighbour's plot.
      const limit = Math.max(def.footprint[0], def.footprint[1]) * 1.6;
      expect(Math.max(m.w, m.d), `${def.id} (${def.mesh}) is ${m.w.toFixed(1)}x${m.d.toFixed(1)} on a ${def.footprint} plot`).toBeLessThan(limit);
    }
  });
});

describe('faction identity', () => {
  it('each faction resolves a distinct silhouette grammar', () => {
    const signatures = PLAYABLE.map((f) => {
      const s = styleFor(f);
      return `${s.plan}|${s.roof}|${s.towerCap}|${s.finial}`;
    });
    expect(new Set(signatures).size, 'two factions share a silhouette grammar').toBe(PLAYABLE.length);
  });

  it('the same blueprint produces measurably different geometry per faction', () => {
    // If this ever collapses to one shape, the "one blueprint, four cultures"
    // property has been lost and every faction's base looks the same again.
    const shapes = PLAYABLE.map((f) => {
      const m = measure(buildBuildingMesh('barracks', f, 0x3366cc, {}));
      return `${m.w.toFixed(2)}x${m.d.toFixed(2)}`;
    });
    expect(new Set(shapes).size).toBeGreaterThan(1);
  });

  it('every faction palette defines every slot a builder can name', () => {
    for (const faction of ART_FACTIONS) {
      const palette = paletteFor(faction);
      for (const slot of Object.keys(BASE_PALETTE) as Slot[]) {
        expect(palette[slot], `${faction} is missing slot ${slot}`).toBeTypeOf('number');
      }
    }
  });
});

describe('unit scale contract', () => {
  it('every unit mesh key in the data layer has a declared height', () => {
    const missing: string[] = [];
    for (const def of UNIT_DB.values()) {
      if (!(def.mesh in UNIT_HEIGHT)) missing.push(`${def.id} -> ${def.mesh}`);
    }
    expect(missing, `unit mesh keys with no declared height: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('mounted and siege units stand clear of infantry', () => {
    // Silhouette separation is a gameplay concern, not just a visual one: you
    // have to be able to tell cavalry from infantry in a mixed blob.
    const infantry = unitHeight('swordsman');
    for (const key of ['knight', 'cavalry', 'camelRider', 'elephant', 'trebuchet']) {
      expect(unitHeight(key), `${key} does not read as taller than infantry`).toBeGreaterThan(infantry * 1.25);
    }
  });

  it('ground radius scales with the unit', () => {
    expect(unitRadius('elephant')).toBeGreaterThan(unitRadius('knight'));
    expect(unitRadius('knight')).toBeGreaterThan(unitRadius('worker'));
  });
});
