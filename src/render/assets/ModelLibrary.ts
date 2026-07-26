/**
 * Manifest-driven model library (GDD asset pipeline).
 *
 * Loads /assets/asset_manifest.json and resolves models by manifest ID —
 * never by hardcoded path. Every caller must tolerate a null result and
 * fall back to the procedural placeholder meshes in ./meshes/*; imported
 * GLBs are a progressive visual upgrade, not a gameplay dependency.
 *
 * Imported GLB rendering is enabled by default. Use `?models=procedural` or
 * `localStorage.kotk_use_glb = '0'` to force the procedural-only fallback.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface AssetEntry {
  id: string;
  displayName: string;
  faction: string;
  category: string;
  sourceName: string;
  sourceUrl: string | null;
  creator: string | null;
  license: string;
  attributionRequired: boolean;
  originalFormat: string;
  runtimeFormat: string;
  rawPath: string | null;
  runtimePath: string | null;
  intendedUse: string;
  triangleEstimate: number | null;
  textureSize: string | null;
  scale: number;
  rotation: number;
  yOffset: number;
  materialOverrides: Record<string, string>;
  teamColorSlots: string[];
  notes: string;
  status: 'imported' | 'stubbed' | 'planned';
  phase: number;
  /** True when the GLB is a pack of sibling variants — pick one per instance. */
  variantPick?: boolean;
}

interface Manifest {
  version: number;
  assets: AssetEntry[];
}

/**
 * Game mesh keys (BuildingDef.mesh) → manifest model IDs, per faction.
 * The manifest owns paths/licenses/transforms; this table only bridges the
 * sim's mesh vocabulary to asset IDs. Unmapped keys stay procedural.
 */
const BUILDING_MESH_TO_MODEL: Record<string, Partial<Record<string, string>>> = {
  keepEuropean: { european: 'european_crown_keep' },
  guildHall: { european: 'european_guild_hall' },
  fortressTower: { european: 'european_stone_bastion' },
  cathedral: { european: 'european_cathedral_banner' },
  stable: { european: 'european_royal_stable' },
  stoneWall: { european: 'european_stone_wall', middle_eastern: 'middle_eastern_sandstone_wall', african: 'african_mudbrick_wall' },
  woodenWall: { european: 'european_wooden_wall', asian: 'asian_bamboo_wall' },
  gate: { european: 'european_gatehouse', middle_eastern: 'middle_eastern_arch_gate', asian: 'asian_curved_roof_gate' },
  watchTower: { european: 'european_watch_tower' },
  house: { '*': 'universal_house', african: 'african_round_hut' },
  farm: { '*': 'universal_farm_plot' },
  lumberCamp: { '*': 'universal_lumber_camp' },
  miningCamp: { '*': 'universal_mining_camp' },
  storehouse: { '*': 'universal_storehouse' },
  market: { '*': 'universal_market_stall', middle_eastern: 'middle_eastern_grand_bazaar' },
  keepMiddleEastern: { middle_eastern: 'middle_eastern_crescent_citadel' },
  bazaar: { middle_eastern: 'middle_eastern_grand_bazaar' },
  caravanserai: { middle_eastern: 'middle_eastern_caravanserai' },
  fireOilFoundry: { middle_eastern: 'middle_eastern_fire_oil_foundry' },
  domeTower: { middle_eastern: 'middle_eastern_dome_tower' },
  keepAsian: { asian: 'asian_jade_palace_keep' },
  temple: { asian: 'asian_temple' },
  fireworkFoundry: { asian: 'asian_firework_foundry' },
  bambooWatchpost: { asian: 'asian_bamboo_watchpost' },
  imperialAcademy: { asian: 'asian_imperial_academy' },
  keepAfrican: { african: 'african_golden_hearth_citadel' },
  drumCircle: { african: 'african_drum_circle' },
  herdingGrounds: { african: 'african_herding_grounds' },
  warriorLodge: { african: 'african_warrior_lodge' },
  sunfireYard: { african: 'african_sunfire_yard' },
};

/** Exact UnitDef.id -> manifest model ID. These are the curated art matches. */
const UNIT_ID_TO_MODEL: Record<string, string> = {
  eu_serf_worker: 'european_serf_worker',
  eu_guild_laborer: 'european_serf_worker',
  eu_ox_cart: 'european_ox_cart',
  eu_mason_crew: 'european_serf_worker',
  eu_levy_spearman: 'european_levy_spearman',
  eu_militia_swordsman: 'european_militia_swordsman',
  eu_longsword_guard: 'european_militia_swordsman',
  eu_halberdier: 'european_levy_spearman',
  eu_royal_footman: 'european_militia_swordsman',
  eu_crusader_champion: 'european_militia_swordsman',
  eu_shortbow_archer: 'european_shortbow_archer',
  eu_crossbowman: 'european_crossbowman',
  eu_longbowman: 'european_shortbow_archer',
  eu_pavise_crossbowman: 'european_crossbowman',
  eu_arbalestier: 'european_crossbowman',
  eu_castle_marksman: 'european_crossbowman',
  eu_scout_rider: 'european_scout_rider',
  eu_mounted_sergeant: 'european_knight',
  eu_knight: 'european_knight',
  eu_royal_lancer: 'european_knight',
  eu_paladin: 'european_knight',
  eu_catapult: 'european_catapult',
  eu_bombard_cart: 'middle_eastern_great_bombard',

  me_town_worker: 'middle_eastern_town_worker',
  me_caravan_driver: 'middle_eastern_trade_caravan',
  me_oasis_tender: 'middle_eastern_town_worker',
  me_stone_mason: 'middle_eastern_town_worker',
  me_spear_levy: 'middle_eastern_spear_levy',
  me_scimitar_militia: 'middle_eastern_scimitar_militia',
  me_dervish_fighter: 'middle_eastern_scimitar_militia',
  me_golden_spearman: 'middle_eastern_spear_levy',
  me_desert_archer: 'middle_eastern_desert_archer',
  me_composite_bowman: 'middle_eastern_desert_archer',
  me_camel_archer: 'middle_eastern_camel_rider',
  me_palace_marksman: 'middle_eastern_desert_archer',
  me_desert_scout: 'middle_eastern_horse_raider',
  me_camel_rider: 'middle_eastern_camel_rider',
  me_horse_raider: 'middle_eastern_horse_raider',
  me_mamluk_cavalry: 'middle_eastern_horse_raider',
  me_royal_cataphract: 'middle_eastern_horse_raider',
  me_sand_reaver: 'middle_eastern_horse_raider',
  me_mangonel: 'middle_eastern_mangonel',
  me_great_bombard: 'middle_eastern_great_bombard',
  me_siege_camel_team: 'middle_eastern_camel_rider',
  me_oil_cauldron_wagon: 'middle_eastern_trade_caravan',

  as_village_worker: 'asian_village_worker',
  as_rice_farmer: 'asian_rice_farmer',
  as_bamboo_cutter: 'asian_village_worker',
  as_artisan_builder: 'asian_village_worker',
  as_ashigaru_spearman: 'asian_ashigaru_spearman',
  as_dao_militia: 'asian_dao_militia',
  as_samurai_retainer: 'asian_samurai_retainer',
  as_naginata_guard: 'asian_ashigaru_spearman',
  as_dragon_blade_master: 'asian_samurai_retainer',
  as_bamboo_archer: 'asian_bamboo_archer',
  as_repeating_crossbowman: 'asian_repeating_crossbowman',
  as_fire_arrow_archer: 'asian_bamboo_archer',
  as_mounted_archer: 'asian_mounted_archer',
  as_horse_archer: 'asian_mounted_archer',
  as_imperial_marksman: 'asian_repeating_crossbowman',
  as_rocket_cart_crew: 'asian_rocket_cart',
  as_steppe_scout: 'asian_mounted_archer',
  as_samurai_rider: 'asian_mounted_archer',
  as_jade_lancer: 'asian_mounted_archer',
  as_wind_cavalry: 'asian_mounted_archer',
  as_imperial_guard_rider: 'asian_mounted_archer',
  as_fire_pot_thrower: 'asian_rocket_cart',
  as_traction_trebuchet: 'asian_rocket_cart',
  as_rocket_cart: 'asian_rocket_cart',
  as_dragon_cannon: 'asian_dragon_cannon',
  as_bamboo_shield_cart: 'asian_rocket_cart',

  af_hearth_worker: 'african_hearth_worker',
  af_forager: 'african_forager',
  af_gold_washer: 'african_hearth_worker',
  af_herd_keeper: 'african_hearth_worker',
  af_drum_caller: 'african_war_drum_prop',
  af_village_spearman: 'african_village_spearman',
  af_shield_warrior: 'african_shield_warrior',
  af_throwing_spear_warrior: 'african_throwing_spear_warrior',
  af_iron_guard: 'african_shield_warrior',
  af_leopard_warrior: 'african_throwing_spear_warrior',
  af_royal_spear_guard: 'african_village_spearman',
  af_sunblade_champion: 'african_shield_warrior',
  af_ancestral_guard: 'african_shield_warrior',
  af_sling_hunter: 'african_bow_hunter',
  af_bow_hunter: 'african_bow_hunter',
  af_poison_dart_skirmisher: 'african_poison_dart_skirmisher',
  af_royal_archer: 'african_bow_hunter',
  af_savannah_marksman: 'african_bow_hunter',
  af_fire_gourd_thrower: 'african_forager',
  af_scout_runner: 'african_throwing_spear_warrior',
  af_light_horse_raider: 'african_light_horse_raider',
  af_camel_skirmisher: 'middle_eastern_camel_rider',
  af_war_zebra_rider: 'african_light_horse_raider',
  af_rhino_breaker: 'african_rhino_breaker',
  af_war_elephant_guard: 'african_war_elephant_guard',
  af_ram_crew: 'african_ram_crew',
  af_fire_pot_crew: 'african_sunfire_engine',
  af_stone_slinger_team: 'african_sunfire_engine',
  af_rhino_ram: 'african_rhino_breaker',
  af_great_drum_platform: 'african_great_drum_platform',
  af_sunfire_engine: 'african_sunfire_engine',
};

/** Coarse mesh fallback when a specific unit ID is not curated yet. */
const UNIT_MESH_TO_MODEL: Record<string, Partial<Record<string, string>>> = {
  worker: {
    european: 'european_serf_worker',
    middle_eastern: 'middle_eastern_town_worker',
    asian: 'asian_village_worker',
    african: 'african_hearth_worker',
  },
  support: {
    middle_eastern: 'middle_eastern_town_worker',
    asian: 'asian_village_worker',
    african: 'african_forager',
  },
  cart: {
    european: 'european_ox_cart',
    middle_eastern: 'middle_eastern_trade_caravan',
    asian: 'asian_rocket_cart',
  },
  spearman: {
    european: 'european_levy_spearman',
    middle_eastern: 'middle_eastern_spear_levy',
    asian: 'asian_ashigaru_spearman',
    african: 'african_village_spearman',
  },
  swordsman: {
    european: 'european_militia_swordsman',
    middle_eastern: 'middle_eastern_scimitar_militia',
    asian: 'asian_dao_militia',
    african: 'african_throwing_spear_warrior',
  },
  shieldman: {
    european: 'european_militia_swordsman',
    middle_eastern: 'middle_eastern_scimitar_militia',
    asian: 'asian_samurai_retainer',
    african: 'african_shield_warrior',
  },
  champion: {
    european: 'european_militia_swordsman',
    middle_eastern: 'middle_eastern_scimitar_militia',
    asian: 'asian_samurai_retainer',
    african: 'african_shield_warrior',
  },
  archer: {
    european: 'european_shortbow_archer',
    middle_eastern: 'middle_eastern_desert_archer',
    asian: 'asian_bamboo_archer',
    african: 'african_bow_hunter',
  },
  crossbow: {
    european: 'european_crossbowman',
    middle_eastern: 'middle_eastern_desert_archer',
    asian: 'asian_repeating_crossbowman',
    african: 'african_bow_hunter',
  },
  lightCavalry: {
    european: 'european_scout_rider',
    middle_eastern: 'middle_eastern_horse_raider',
    asian: 'asian_mounted_archer',
    african: 'african_light_horse_raider',
  },
  cavalry: {
    european: 'european_knight',
    middle_eastern: 'middle_eastern_horse_raider',
    asian: 'asian_mounted_archer',
    african: 'african_light_horse_raider',
  },
  knight: {
    european: 'european_knight',
    middle_eastern: 'middle_eastern_horse_raider',
    asian: 'asian_mounted_archer',
    african: 'african_light_horse_raider',
  },
  paladin: {
    european: 'european_knight',
    middle_eastern: 'middle_eastern_horse_raider',
    asian: 'asian_mounted_archer',
    african: 'african_light_horse_raider',
  },
  horseArcher: { asian: 'asian_mounted_archer' },
  camelRider: {
    middle_eastern: 'middle_eastern_camel_rider',
    african: 'middle_eastern_camel_rider',
  },
  camelArcher: { middle_eastern: 'middle_eastern_camel_rider' },
  catapult: {
    european: 'european_catapult',
    middle_eastern: 'middle_eastern_mangonel',
    asian: 'asian_rocket_cart',
    african: 'african_sunfire_engine',
  },
  bombard: {
    middle_eastern: 'middle_eastern_great_bombard',
    asian: 'asian_dragon_cannon',
    african: 'african_sunfire_engine',
  },
  rocketCart: {
    middle_eastern: 'middle_eastern_trade_caravan',
    asian: 'asian_rocket_cart',
    african: 'african_sunfire_engine',
  },
  beast: { african: 'african_rhino_breaker' },
  elephant: { african: 'african_war_elephant_guard' },
  drum: { african: 'african_war_drum_prop' },
};

const RESOURCE_NODE_TO_MODEL: Record<string, Partial<Record<string, string>>> = {
  forest: {
    desert: 'env_tree_acacia',
    savanna: 'env_tree_acacia',
    mountain: 'env_tree_pine',
    '*': 'env_tree_oak',
  },
  gold: { '*': 'env_gold_ore' },
  stone: { '*': 'env_rock_large' },
  berries: { '*': 'env_berry_bush' },
  farm: { '*': 'universal_farm_plot' },
};

let manifest: Manifest | null = null;
let manifestPromise: Promise<Manifest | null> | null = null;
const loader = new GLTFLoader();

interface CachedModel {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  skinned: boolean;
}
const modelCache = new Map<string, Promise<CachedModel | null>>();

/**
 * Donor clip sources for models that ship a skeleton but no animation clips
 * (several Quaternius packs share the same `CharacterArmature` rig). Clips are
 * borrowed from a fully-animated sibling and filtered to the bones that
 * actually exist on the target — a poor match simply stays unanimated.
 */
const HUMANOID_CLIP_DONORS = [
  'european_serf_worker',
  'asian_village_worker',
  'middle_eastern_town_worker',
  'african_hearth_worker',
];

export function glbModelsEnabled(): boolean {
  try {
    const modelParam = new URLSearchParams(location.search).get('models');
    if (modelParam === 'procedural' || modelParam === 'off' || modelParam === '0') return false;
    if (modelParam === 'glb' || modelParam === 'on' || modelParam === '1') return true;
    const stored = localStorage.getItem('kotk_use_glb');
    if (stored === '0' || stored === 'false' || stored === 'off') return false;
    if (stored === '1' || stored === 'true' || stored === 'on') return true;
    return true;
  } catch {
    return false;
  }
}

export function loadManifest(): Promise<Manifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch('/assets/asset_manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .then((m) => (manifest = m))
      .catch(() => null);
  }
  return manifestPromise;
}

export function getEntry(id: string): AssetEntry | null {
  return manifest?.assets.find((a) => a.id === id) ?? null;
}

/** Game faction ids (camelCase) → manifest faction slugs (snake_case). */
const FACTION_SLUG: Record<string, string> = { middleEastern: 'middle_eastern' };

export function factionSlug(faction: string): string {
  return FACTION_SLUG[faction] ?? faction;
}

/** Manifest model ID for a sim mesh key + faction, or null (→ procedural). */
export function modelIdForMesh(meshKey: string, faction: string): string | null {
  const byFaction = BUILDING_MESH_TO_MODEL[meshKey];
  const slug = factionSlug(faction);
  return byFaction?.[slug] ?? byFaction?.['*'] ?? null;
}

/** Manifest model ID for a unit definition, or null for procedural. */
export function modelIdForUnit(unitId: string, meshKey: string, faction: string): string | null {
  const specific = UNIT_ID_TO_MODEL[unitId];
  if (specific) return specific;
  const byFaction = UNIT_MESH_TO_MODEL[meshKey];
  const slug = factionSlug(faction);
  return byFaction?.[slug] ?? byFaction?.['*'] ?? null;
}

/** Manifest model ID for a resource-node type, or null for procedural. */
export function modelIdForResourceNode(nodeType: string, biome: string): string | null {
  const byBiome = RESOURCE_NODE_TO_MODEL[nodeType];
  return byBiome?.[biome] ?? byBiome?.['*'] ?? null;
}

/**
 * Low-poly packs frequently export metallicFactor > 0, which renders
 * near-black under pure analytic lights (no env map). These are stylized
 * flat-colored models — force a matte response.
 */
function neutralizeMetalness(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        std.metalness = 0;
        std.roughness = Math.max(std.roughness, 0.8);
      }
    }
  });
}

function cloneMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone())
      : mesh.material.clone();
  });
}

function applyTeamColor(root: THREE.Object3D, slots: string[], teamColor: number): void {
  if (!slots.length) return;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (slots.includes(m.name) && std.color) std.color.setHex(teamColor);
    }
  });
}

/**
 * Load a model by manifest ID. Returns a fresh clone fitted to `fitHeight`
 * (units — height in world units) or `fitWidth` (footprint-driven buildings
 * and resource nodes — largest XZ dimension), with manifest
 * scale/rotation/yOffset applied. Returns null when the entry is missing,
 * stubbed, or fails to load — callers keep their procedural placeholder.
 */
/**
 * Variant packs (e.g. a GLB holding five trees side by side) keep exactly one
 * sibling: descend past single-child wrappers, keep `index % count`, and zero
 * its pack offset so it sits at the model origin.
 */
function pickVariant(clone: THREE.Object3D, index: number): void {
  let node: THREE.Object3D = clone;
  while (node.children.length === 1) node = node.children[0];
  if (node.children.length < 2) return;
  const keep = node.children[Math.abs(index) % node.children.length];
  for (const child of [...node.children]) {
    if (child !== keep) node.remove(child);
  }
  keep.position.set(0, 0, 0);
}

/**
 * World-space bounds for fitting. Skinned packs often ship near-zero-scale
 * bind geometry with the true size baked into the bone bind matrices, so
 * plain geometry bounds are garbage — use the precise (per-vertex, skeleton
 * aware) path for those.
 */
function measureBounds(root: THREE.Object3D, skinned: boolean): THREE.Box3 {
  root.updateMatrixWorld(true);
  if (skinned) {
    root.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) sm.skeleton.update();
    });
  }
  return new THREE.Box3().setFromObject(root, skinned);
}

function hasSkinnedMesh(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

/** True when a clip is a usable loop (some packs export junk camera/pose actions). */
function usableClips(clips: THREE.AnimationClip[]): THREE.AnimationClip[] {
  return clips.filter((c) => c.duration > 0.1 && c.tracks.length > 0);
}

/**
 * Borrow clips from a donor model, keeping only tracks whose target node
 * exists on `target`. Returns [] when the skeletons clearly don't match.
 */
function retargetClips(clips: THREE.AnimationClip[], target: THREE.Object3D): THREE.AnimationClip[] {
  const names = new Set<string>();
  target.traverse((o) => {
    if (o.name) names.add(o.name);
  });
  const out: THREE.AnimationClip[] = [];
  for (const clip of clips) {
    const tracks = clip.tracks.filter((t) => {
      const node = t.name.split('.')[0];
      return names.has(node);
    });
    // Require most of the clip to bind, otherwise it plays as broken half-poses.
    if (tracks.length >= clip.tracks.length * 0.5 && tracks.length > 3) {
      out.push(new THREE.AnimationClip(clip.name, clip.duration, tracks));
    }
  }
  return out;
}

function fetchModel(id: string): Promise<CachedModel | null> {
  const entry = getEntry(id);
  if (!entry || entry.status !== 'imported' || !entry.runtimePath) return Promise.resolve(null);
  if (!modelCache.has(id)) {
    const url = entry.runtimePath.replace(/^public/, '');
    modelCache.set(
      id,
      loader
        .loadAsync(url)
        .then((gltf) => {
          neutralizeMetalness(gltf.scene);
          return {
            scene: gltf.scene,
            clips: usableClips(gltf.animations ?? []),
            skinned: hasSkinnedMesh(gltf.scene),
          };
        })
        .catch(() => null),
    );
  }
  return modelCache.get(id)!;
}

/** Donor clips shared by the common humanoid rig, for skinned-but-clipless models. */
async function donorClips(): Promise<THREE.AnimationClip[]> {
  for (const donorId of HUMANOID_CLIP_DONORS) {
    const donor = await fetchModel(donorId);
    if (donor && donor.clips.length > 0) return donor.clips;
  }
  return [];
}

export async function loadModelById(
  id: string,
  opts: { teamColor?: number; fitHeight?: number; fitWidth?: number; variantIndex?: number } = {},
): Promise<THREE.Group | null> {
  await loadManifest();
  const entry = getEntry(id);
  if (!entry || entry.status !== 'imported' || !entry.runtimePath) return null;

  const base = await fetchModel(id);
  if (!base) return null;

  const entryScale = entry.scale || 1;
  // SkinnedMesh trees must be cloned with their skeleton bindings intact.
  const clone = (base.skinned ? cloneSkinned(base.scene) : base.scene.clone(true)) as THREE.Group;
  if (entry.variantPick) pickVariant(clone, opts.variantIndex ?? 0);
  cloneMaterials(clone);

  // Animation clips ride along on userData so callers can drive an
  // AnimationMixer. Rigged models with no shipped clips borrow the shared
  // humanoid set when the bone names line up.
  let clips = base.clips;
  if (base.skinned && clips.length === 0) {
    clips = retargetClips(await donorClips(), clone);
  }
  const group = new THREE.Group();
  group.add(clone);

  clone.scale.setScalar(entryScale);
  clone.rotation.y = entry.rotation || 0;

  // Two distinct fitting semantics, deliberately separate:
  //   fitHeight — units. A unit's size is how tall it stands, and fitting a
  //     humanoid by its horizontal extent (shoulder width, or an arms-out
  //     pose) produces wildly inconsistent and usually oversized characters.
  //   fitWidth  — buildings and resource nodes, whose size is dictated by the
  //     sim's footprint, so the horizontal extent is the meaningful axis.
  if (opts.fitHeight || opts.fitWidth) {
    const size = new THREE.Vector3();
    measureBounds(clone, base.skinned).getSize(size);
    const measured = opts.fitHeight ? size.y : Math.max(size.x, size.z);
    const target = opts.fitHeight ?? opts.fitWidth ?? 0;
    if (measured > 1e-4) clone.scale.multiplyScalar(target / measured);
    // Re-ground after fitting so the base sits at y=0.
    const fitted = measureBounds(clone, base.skinned);
    clone.position.y -= fitted.min.y;
    clone.position.x -= (fitted.min.x + fitted.max.x) / 2;
    clone.position.z -= (fitted.min.z + fitted.max.z) / 2;
  }
  group.position.y += entry.yOffset || 0;

  if (opts.teamColor !== undefined) applyTeamColor(group, entry.teamColorSlots, opts.teamColor);
  group.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
    // Skinned bounds are bind-pose only; never let animation cull the mesh.
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false;
  });
  group.userData.clips = clips;
  group.userData.skinned = base.skinned;
  return group;
}

/** Convenience: resolve a sim mesh key + faction straight to a model. */
export async function loadModelForMesh(
  meshKey: string,
  faction: string,
  opts: { teamColor?: number; fitWidth?: number } = {},
): Promise<THREE.Group | null> {
  const id = modelIdForMesh(meshKey, faction);
  return id ? loadModelById(id, opts) : null;
}

/** Convenience: resolve a unit definition straight to a model. */
export async function loadModelForUnit(
  unitId: string,
  meshKey: string,
  faction: string,
  opts: { teamColor?: number; fitHeight?: number } = {},
): Promise<THREE.Group | null> {
  const id = modelIdForUnit(unitId, meshKey, faction);
  return id ? loadModelById(id, opts) : null;
}

/** Convenience: resolve a resource-node type straight to a model. */
export async function loadModelForResourceNode(
  nodeType: string,
  biome: string,
  opts: { fitWidth?: number; variantIndex?: number } = {},
): Promise<THREE.Group | null> {
  const id = modelIdForResourceNode(nodeType, biome);
  return id ? loadModelById(id, opts) : null;
}
