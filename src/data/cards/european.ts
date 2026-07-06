/** European faction cards (GDD §24). */

import type { Card } from '../types';
import { abilityCard, buildingCard, unitCard } from './_builders';

const F = 'european' as const;

export const EUROPEAN_CARDS: Card[] = [
  // --- Fortress ---
  buildingCard({
    buildingId: 'eu_crown_keep',
    name: 'Crown Keep',
    faction: F,
    type: 'fortress',
    deckPoints: 0,
    rarity: 'common',
    description: 'Balanced starting fortress. Fires arrows and bolsters nearby morale.',
    icon: 'keep',
  }),

  // --- Civilians & economy units ---
  unitCard({ unitId: 'eu_serf_worker', name: 'Serf Worker', faction: F, type: 'civilian', deckPoints: 0, rarity: 'common', description: 'Basic builder and gatherer.', icon: 'worker' }),
  unitCard({ unitId: 'eu_guild_laborer', name: 'Guild Laborer', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Builds faster and mines gold with skill.', icon: 'worker' }),
  unitCard({ unitId: 'eu_ox_cart', name: 'Ox Cart', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Hauls triple loads between camps.', icon: 'cart' }),
  unitCard({ unitId: 'eu_mason_crew', name: 'Mason Crew', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Repairs walls and stone buildings quickly.', icon: 'mason' }),
  unitCard({ unitId: 'eu_tax_collector', name: 'Royal Tax Collector', faction: F, type: 'civilian', deckPoints: 3, rarity: 'rare', description: 'Collects a steady trickle of gold.', icon: 'coin', requirements: { buildingId: 'market' } }),

  // --- Infantry ---
  unitCard({ unitId: 'eu_levy_spearman', name: 'Levy Spearman', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap anti-cavalry levy.', icon: 'spear' }),
  unitCard({ unitId: 'eu_militia_swordsman', name: 'Militia Swordsman', faction: F, deckPoints: 1, rarity: 'common', description: 'Basic frontline swordsman.', icon: 'sword' }),
  unitCard({ unitId: 'eu_shieldman', name: 'Shieldman', faction: F, deckPoints: 2, rarity: 'common', description: 'A wall of wood and iron. Absorbs arrows.', icon: 'shield' }),
  unitCard({ unitId: 'eu_longsword_guard', name: 'Longsword Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Durable professional melee.', icon: 'longsword' }),
  unitCard({ unitId: 'eu_halberdier', name: 'Halberdier', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Strong against cavalry and large foes.', icon: 'halberd', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_royal_footman', name: 'Royal Footman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Elite late-game infantry.', icon: 'footman', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_crusader_champion', name: 'Crusader Champion', faction: F, deckPoints: 5, rarity: 'epic', description: 'A paragon whose presence steels nearby hearts.', icon: 'champion', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_banner_guard', name: 'Banner Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Raises morale of nearby soldiers.', icon: 'banner' }),

  // --- Ranged ---
  unitCard({ unitId: 'eu_shortbow_archer', name: 'Shortbow Archer', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap ranged damage.', icon: 'bow' }),
  unitCard({ unitId: 'eu_crossbowman', name: 'Crossbowman', faction: F, deckPoints: 2, rarity: 'common', description: 'Armor-piercing bolts.', icon: 'crossbow' }),
  unitCard({ unitId: 'eu_longbowman', name: 'Longbowman', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Long reach, fragile frame.', icon: 'longbow', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_pavise_crossbowman', name: 'Pavise Crossbowman', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Crossbowman sheltered behind a great shield.', icon: 'pavise', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_arbalestier', name: 'Arbalestier', faction: F, deckPoints: 4, rarity: 'rare', description: 'Elite anti-armor marksman.', icon: 'arbalest', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_castle_marksman', name: 'Castle Marksman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Deadlier near walls and towers.', icon: 'marksman', requirements: { tier: 3 } }),

  // --- Cavalry ---
  unitCard({ unitId: 'eu_scout_rider', name: 'Scout Rider', faction: F, deckPoints: 1, rarity: 'common', description: 'Fast eyes; harasses workers.', icon: 'scout', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_mounted_sergeant', name: 'Mounted Sergeant', faction: F, deckPoints: 2, rarity: 'common', description: 'Dependable cavalry.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_knight', name: 'Knight', faction: F, deckPoints: 4, rarity: 'rare', description: 'A thunderous charge of steel.', icon: 'knight', requirements: { tier: 2 } }),
  unitCard({ unitId: 'eu_royal_lancer', name: 'Royal Lancer', faction: F, deckPoints: 4, rarity: 'rare', description: 'Lances that unhorse enemy riders.', icon: 'lancer', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_paladin', name: 'Paladin', faction: F, deckPoints: 6, rarity: 'epic', description: 'The realm’s finest shock cavalry.', icon: 'paladin', requirements: { tier: 4 } }),
  unitCard({ unitId: 'eu_banner_knight', name: 'Banner Knight', faction: F, deckPoints: 4, rarity: 'rare', description: 'Carries the standard into the charge.', icon: 'bannerKnight', requirements: { tier: 2 } }),

  // --- Siege ---
  unitCard({ unitId: 'eu_battering_ram', name: 'Battering Ram', faction: F, deckPoints: 2, rarity: 'common', description: 'Splinters gates and walls.', icon: 'ram', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_catapult', name: 'Catapult', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Hurls stone in wide arcs.', icon: 'catapult', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_trebuchet', name: 'Trebuchet', faction: F, deckPoints: 5, rarity: 'rare', description: 'Long-range fortress breaker.', icon: 'trebuchet', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_siege_tower', name: 'Siege Tower', faction: F, deckPoints: 4, rarity: 'rare', description: 'Shelters infantry as it nears the walls.', icon: 'siegeTower', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_heavy_ballista', name: 'Heavy Ballista', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Skewers siege engines and beasts.', icon: 'ballista', requirements: { tier: 3 } }),
  unitCard({ unitId: 'eu_bombard_cart', name: 'Bombard Cart', faction: F, deckPoints: 6, rarity: 'epic', description: 'Slow, thunderous, fortress-shattering.', icon: 'bombard', requirements: { tier: 4 } }),

  // --- Faction buildings ---
  buildingCard({ buildingId: 'eu_guild_hall', name: 'Guild Hall', faction: F, type: 'economyBuilding', deckPoints: 2, rarity: 'uncommon', description: 'Speeds construction and gold work nearby.', icon: 'guildHall', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'eu_stone_bastion', name: 'Stone Bastion', faction: F, type: 'defense', deckPoints: 4, rarity: 'rare', description: 'The strongest tower in the realm.', icon: 'bastion', requirements: { tier: 3 } }),
  buildingCard({ buildingId: 'eu_cathedral_banner', name: 'Cathedral Banner', faction: F, type: 'economyBuilding', deckPoints: 3, rarity: 'rare', description: 'A rallying beacon of faith and influence.', icon: 'cathedral', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'eu_royal_stable', name: 'Royal Stable', faction: F, type: 'militaryBuilding', deckPoints: 3, rarity: 'rare', description: 'Trains cavalry faster.', icon: 'royalStable', requirements: { tier: 3 } }),

  // --- Abilities (GDD §24.7) ---
  abilityCard({
    id: 'eu_rally_the_realm',
    name: 'Rally the Realm',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'Nearby soldiers take heart. +25 morale in a wide area.',
    icon: 'rally',
    cost: { food: 100, gold: 50 },
    cooldownSecs: 90,
    ability: {
      target: 'point',
      radius: 16,
      effects: [{ type: 'moraleChange', radius: 16, amount: 25, ally: true }],
      vfx: 'goldenGlow',
      sfx: 'horn',
    },
  }),
  abilityCard({
    id: 'eu_rain_of_arrows',
    name: 'Rain of Arrows',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'A dark sky of shafts falls on the target area.',
    icon: 'arrowRain',
    cost: { wood: 80, gold: 100 },
    cooldownSecs: 75,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 7,
      effects: [{ type: 'damageArea', radius: 7, damage: 42, vs: 'units' }],
      vfx: 'arrowRain',
      sfx: 'arrowVolley',
    },
  }),
  abilityCard({
    id: 'eu_royal_decree',
    name: 'Royal Decree',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'Unit production hastens by half for 30 seconds.',
    icon: 'decree',
    cost: { gold: 120 },
    cooldownSecs: 120,
    ability: {
      target: 'global',
      effects: [{ type: 'productionBoost', mul: 1.5, durationSecs: 30 }],
      vfx: 'scroll',
      sfx: 'fanfare',
    },
  }),
  abilityCard({
    id: 'eu_masons_blessing',
    name: "Mason's Blessing",
    faction: F,
    deckPoints: 2,
    rarity: 'common',
    description: 'Walls and buildings in the area mend over time.',
    icon: 'trowel',
    cost: { stone: 60, gold: 40 },
    cooldownSecs: 60,
    ability: {
      target: 'point',
      radius: 12,
      effects: [{ type: 'repair', radius: 12, hpPerSec: 10, durationSecs: 20 }],
      vfx: 'stoneSparkle',
      sfx: 'chisel',
    },
  }),
  abilityCard({
    id: 'eu_knightly_charge',
    name: 'Knightly Charge',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Cavalry deal 35% more damage for 20 seconds.',
    icon: 'charge',
    cost: { food: 80, gold: 120 },
    cooldownSecs: 100,
    requirements: { tier: 2 },
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['cavalry'], ally: true }, stat: 'unit.cavalry.damage', op: 'mul', value: 1.35, durationSecs: 20 },
      ],
      vfx: 'chargeTrail',
      sfx: 'gallop',
    },
  }),
  abilityCard({
    id: 'eu_hold_the_line',
    name: 'Hold the Line',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Infantry gain +5 armor for 20 seconds.',
    icon: 'holdLine',
    cost: { food: 100, gold: 80 },
    cooldownSecs: 100,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['infantry'], ally: true }, stat: 'unit.infantry.armor', op: 'add', value: 5, durationSecs: 20 },
        { type: 'buff', filter: { roles: ['infantry'], ally: true }, stat: 'unit.infantry.pierceArmor', op: 'add', value: 5, durationSecs: 20 },
      ],
      vfx: 'shieldWall',
      sfx: 'shieldSlam',
    },
  }),
  abilityCard({
    id: 'eu_divine_standard',
    name: 'Divine Standard',
    faction: F,
    deckPoints: 5,
    rarity: 'epic',
    description: 'Plant a radiant banner: allies nearby rally and fight harder.',
    icon: 'standard',
    cost: { gold: 150, influence: 30 },
    cooldownSecs: 150,
    requirements: { tier: 3 },
    ability: {
      target: 'point',
      radius: 14,
      effects: [
        { type: 'moraleChange', radius: 14, amount: 35, ally: true },
        { type: 'buff', radius: 14, filter: { ally: true }, stat: 'unit.damage', op: 'mul', value: 1.15, durationSecs: 25 },
      ],
      vfx: 'divineBanner',
      sfx: 'choir',
    },
  }),
  abilityCard({
    id: 'eu_castle_doctrine',
    name: 'Castle Doctrine',
    faction: F,
    deckPoints: 5,
    rarity: 'epic',
    description: 'Towers and walls gain +6 armor for 40 seconds.',
    icon: 'castleDoctrine',
    cost: { stone: 150, gold: 100 },
    cooldownSecs: 150,
    requirements: { tier: 3 },
    type: 'factionPower',
    ability: {
      target: 'global',
      effects: [{ type: 'buff', stat: 'building.armor', op: 'add', value: 6, durationSecs: 40 }],
      vfx: 'stoneAura',
      sfx: 'deepBell',
    },
  }),
];
