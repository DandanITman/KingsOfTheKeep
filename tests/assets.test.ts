import { describe, expect, it } from 'vitest';
import { modelIdForMesh, modelIdForResourceNode, modelIdForUnit } from '@/render/assets/ModelLibrary';
import manifest from '../public/assets/asset_manifest.json';

interface ManifestEntry {
  id: string;
  status: 'imported' | 'stubbed' | 'planned';
  runtimeFormat: string;
  runtimePath: string | null;
}

const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));
const originalLaunchList = {
  middleEastern: [
    'middle_eastern_crescent_citadel',
    'middle_eastern_grand_bazaar',
    'middle_eastern_caravanserai',
    'middle_eastern_fire_oil_foundry',
    'middle_eastern_dome_tower',
    'middle_eastern_town_worker',
    'middle_eastern_desert_archer',
    'middle_eastern_spear_levy',
    'middle_eastern_scimitar_militia',
    'middle_eastern_camel_rider',
    'middle_eastern_horse_raider',
    'middle_eastern_mangonel',
    'middle_eastern_great_bombard',
    'middle_eastern_trade_caravan',
    'middle_eastern_fire_pot_prop',
    'middle_eastern_sandstone_wall',
    'middle_eastern_arch_gate',
  ],
  asian: [
    'asian_jade_palace_keep',
    'asian_temple',
    'asian_firework_foundry',
    'asian_bamboo_watchpost',
    'asian_imperial_academy',
    'asian_village_worker',
    'asian_rice_farmer',
    'asian_ashigaru_spearman',
    'asian_dao_militia',
    'asian_bamboo_archer',
    'asian_repeating_crossbowman',
    'asian_samurai_retainer',
    'asian_mounted_archer',
    'asian_rocket_cart',
    'asian_dragon_cannon',
    'asian_lantern_prop',
    'asian_bamboo_wall',
    'asian_curved_roof_gate',
  ],
  african: [
    'african_golden_hearth_citadel',
    'african_drum_circle',
    'african_herding_grounds',
    'african_warrior_lodge',
    'african_sunfire_yard',
    'african_hearth_worker',
    'african_forager',
    'african_village_spearman',
    'african_shield_warrior',
    'african_throwing_spear_warrior',
    'african_bow_hunter',
    'african_poison_dart_skirmisher',
    'african_light_horse_raider',
    'african_rhino_breaker',
    'african_war_elephant_guard',
    'african_ram_crew',
    'african_great_drum_platform',
    'african_sunfire_engine',
    'african_round_hut',
    'african_mudbrick_wall',
    'african_banner_textile',
    'african_war_drum_prop',
  ],
};

const expectedOriginalListStubs = new Set([
  'middle_eastern_spear_levy',
  'asian_dragon_cannon',
  'african_poison_dart_skirmisher',
  'african_ram_crew',
]);

function expectImported(id: string | null): void {
  expect(id).toBeTruthy();
  const asset = assetsById.get(id!);
  expect(asset, `${id} missing from manifest`).toBeDefined();
  expect(asset!.status, `${id} should be imported`).toBe('imported');
  expect(asset!.runtimePath, `${id} runtime path`).toBeTruthy();
}

describe('asset model resolvers', () => {
  it('tracks every ID from the original launch-faction asset list', () => {
    for (const ids of Object.values(originalLaunchList)) {
      for (const id of ids) {
        const asset = assetsById.get(id);
        expect(asset, `${id} missing from manifest`).toBeDefined();
        expect(asset!.status, `${id} status`).toBe(expectedOriginalListStubs.has(id) ? 'stubbed' : 'imported');
      }
    }
  });

  it('resolves launch faction buildings to imported manifest models', () => {
    expectImported(modelIdForMesh('keepEuropean', 'european'));
    expectImported(modelIdForMesh('keepMiddleEastern', 'middleEastern'));
    expectImported(modelIdForMesh('keepAsian', 'asian'));
    expectImported(modelIdForMesh('keepAfrican', 'african'));
    expectImported(modelIdForMesh('market', 'middleEastern'));
  });

  it('resolves curated unit IDs to imported manifest models', () => {
    expectImported(modelIdForUnit('eu_serf_worker', 'worker', 'european'));
    expectImported(modelIdForUnit('me_camel_rider', 'camelRider', 'middleEastern'));
    expectImported(modelIdForUnit('as_rocket_cart', 'rocketCart', 'asian'));
    expectImported(modelIdForUnit('af_war_elephant_guard', 'elephant', 'african'));
  });

  it('falls back from generic unit mesh keys to faction models', () => {
    expect(modelIdForUnit('unknown_asian_archer', 'archer', 'asian')).toBe('asian_bamboo_archer');
    expect(modelIdForUnit('unknown_african_beast', 'beast', 'african')).toBe('african_rhino_breaker');
  });

  it('keeps known unsafe or missing art as manifest stubs', () => {
    const dragonCannon = assetsById.get(modelIdForUnit('as_dragon_cannon', 'bombard', 'asian')!);
    const ramCrew = assetsById.get(modelIdForUnit('af_ram_crew', 'ram', 'african')!);
    expect(dragonCannon?.status).toBe('stubbed');
    expect(ramCrew?.status).toBe('stubbed');
  });

  it('resolves resource nodes to imported environment models', () => {
    expectImported(modelIdForResourceNode('forest', 'grass'));
    expectImported(modelIdForResourceNode('forest', 'savanna'));
    expectImported(modelIdForResourceNode('gold', 'grass'));
    expectImported(modelIdForResourceNode('stone', 'mountain'));
    expectImported(modelIdForResourceNode('berries', 'grass'));
  });
});
