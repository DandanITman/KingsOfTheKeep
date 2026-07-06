/** Middle Eastern faction cards (GDD §27). */

import type { Card } from '../types';
import { abilityCard, buildingCard, unitCard } from './_builders';

const F = 'middleEastern' as const;

export const MIDDLE_EASTERN_CARDS: Card[] = [
  // --- Fortress ---
  buildingCard({
    buildingId: 'me_crescent_citadel',
    name: 'Crescent Citadel',
    faction: F,
    type: 'fortress',
    deckPoints: 0,
    rarity: 'common',
    description: 'Trade-rich fortress. Nearby gold work quickens beneath its walls.',
    icon: 'keep',
  }),

  // --- Civilians & economy units ---
  unitCard({ unitId: 'me_town_worker', name: 'Town Worker', faction: F, type: 'civilian', deckPoints: 0, rarity: 'common', description: 'Basic builder and gatherer.', icon: 'worker' }),
  unitCard({ unitId: 'me_bazaar_trader', name: 'Bazaar Trader', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Haggles a steady trickle of gold from the bazaar.', icon: 'bazaar', requirements: { buildingId: 'market' } }),
  unitCard({ unitId: 'me_caravan_driver', name: 'Caravan Driver', faction: F, type: 'civilian', deckPoints: 3, rarity: 'uncommon', description: 'Drives a caravan along trade routes, earning gold each trip.', icon: 'caravan', requirements: { buildingId: 'market' } }),
  unitCard({ unitId: 'me_oasis_tender', name: 'Oasis Tender', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Coaxes more food from farms and oases.', icon: 'oasis' }),
  unitCard({ unitId: 'me_stone_mason', name: 'Stone Mason', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Raises towers and walls faster, and mends them well.', icon: 'mason' }),

  // --- Infantry ---
  unitCard({ unitId: 'me_spear_levy', name: 'Spear Levy', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap anti-cavalry levy.', icon: 'spear' }),
  unitCard({ unitId: 'me_scimitar_militia', name: 'Scimitar Militia', faction: F, deckPoints: 1, rarity: 'common', description: 'Quick-slashing basic melee.', icon: 'scimitar' }),
  unitCard({ unitId: 'me_shielded_guard', name: 'Shielded Guard', faction: F, deckPoints: 2, rarity: 'common', description: 'Holds choke points behind a broad shield.', icon: 'shield' }),
  unitCard({ unitId: 'me_palace_guard', name: 'Palace Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Durable defensive infantry of the palace.', icon: 'longsword' }),
  unitCard({ unitId: 'me_dervish_fighter', name: 'Dervish Fighter', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Whirling melee fighter with startling speed.', icon: 'sword', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_janissary_guard', name: 'Janissary Guard', faction: F, deckPoints: 5, rarity: 'epic', description: 'Elite standing infantry of the citadel.', icon: 'champion', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_golden_spearman', name: 'Golden Spearman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Gilded spears that unhorse the proudest riders.', icon: 'halberd', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_citadel_defender', name: 'Citadel Defender', faction: F, deckPoints: 4, rarity: 'rare', description: 'Elite defender, strongest near friendly walls.', icon: 'bastion', requirements: { tier: 3 } }),

  // --- Ranged ---
  unitCard({ unitId: 'me_desert_archer', name: 'Desert Archer', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap ranged damage.', icon: 'bow' }),
  unitCard({ unitId: 'me_composite_bowman', name: 'Composite Bowman', faction: F, deckPoints: 2, rarity: 'common', description: 'Recurved bow with greater punch and reach.', icon: 'longbow' }),
  unitCard({ unitId: 'me_camel_archer', name: 'Camel Archer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Mobile harassment from camelback.', icon: 'camel', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_fire_siphon_team', name: 'Fire Siphon Team', faction: F, deckPoints: 4, rarity: 'rare', description: 'Sprays clinging fire in a short cone.', icon: 'burningOil', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_palace_marksman', name: 'Palace Marksman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Long-range elite of the palace rooftops.', icon: 'marksman', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_hand_cannon_guard', name: 'Hand Cannon Guard', faction: F, deckPoints: 5, rarity: 'epic', description: 'Slow to load; armor means nothing to it.', icon: 'crossbow', requirements: { tier: 4 } }),

  // --- Cavalry ---
  unitCard({ unitId: 'me_desert_scout', name: 'Desert Scout', faction: F, deckPoints: 1, rarity: 'common', description: 'Fast eyes across the dunes.', icon: 'scout', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_camel_rider', name: 'Camel Rider', faction: F, deckPoints: 2, rarity: 'common', description: 'Horses shy from its scent. Counters cavalry.', icon: 'camel', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_horse_raider', name: 'Horse Raider', faction: F, deckPoints: 2, rarity: 'common', description: 'Swift raider that preys on workers.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_mamluk_cavalry', name: 'Mamluk Cavalry', faction: F, deckPoints: 4, rarity: 'rare', description: 'Durable slave-soldier heavy cavalry.', icon: 'knight', requirements: { tier: 2 } }),
  unitCard({ unitId: 'me_royal_cataphract', name: 'Royal Cataphract', faction: F, deckPoints: 6, rarity: 'epic', description: 'Rider and mount armored head to hoof.', icon: 'paladin', requirements: { tier: 4 } }),
  unitCard({ unitId: 'me_sand_reaver', name: 'Sand Reaver', faction: F, deckPoints: 5, rarity: 'epic', description: 'Elite raider that shreds workers and siege trains.', icon: 'lancer', requirements: { tier: 3 } }),

  // --- Siege ---
  unitCard({ unitId: 'me_battering_cart', name: 'Battering Cart', faction: F, deckPoints: 2, rarity: 'common', description: 'Basic gate breaker.', icon: 'ram', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_mangonel', name: 'Mangonel', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Flings stone across a wide area.', icon: 'catapult', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_fire_thrower_engine', name: 'Fire Thrower Engine', faction: F, deckPoints: 4, rarity: 'rare', description: 'Burns buildings and the men inside them.', icon: 'burningOil', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_great_bombard', name: 'Great Bombard', faction: F, deckPoints: 6, rarity: 'epic', description: 'A wall-ending thunderclap of bronze.', icon: 'bombard', requirements: { tier: 4 } }),
  unitCard({ unitId: 'me_siege_camel_team', name: 'Siege Camel Team', faction: F, deckPoints: 5, rarity: 'rare', description: 'Camel-drawn siege that sets up on the move.', icon: 'camel', requirements: { tier: 3 } }),
  unitCard({ unitId: 'me_oil_cauldron_wagon', name: 'Oil Cauldron Wagon', faction: F, deckPoints: 4, rarity: 'rare', description: 'Boiling oil poured over packed infantry.', icon: 'burningOil', requirements: { tier: 3 } }),

  // --- Faction buildings ---
  buildingCard({ buildingId: 'me_grand_bazaar', name: 'Grand Bazaar', faction: F, type: 'economyBuilding', deckPoints: 2, rarity: 'uncommon', description: 'Doubles market income and quickens exchange.', icon: 'bazaar', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'me_caravanserai', name: 'Caravanserai', faction: F, type: 'economyBuilding', deckPoints: 3, rarity: 'rare', description: 'A waystation that anchors new trade routes.', icon: 'caravan', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'me_fire_oil_foundry', name: 'Fire Oil Foundry', faction: F, type: 'militaryBuilding', deckPoints: 3, rarity: 'rare', description: 'Forges fire-hurling siege engines.', icon: 'minaret', requirements: { tier: 3 } }),
  buildingCard({ buildingId: 'me_dome_tower', name: 'Dome Tower', faction: F, type: 'defense', deckPoints: 3, rarity: 'uncommon', description: 'Fast-firing tower that scythes down infantry.', icon: 'dome', requirements: { tier: 2 } }),

  // --- Abilities (GDD §27.7) ---
  abilityCard({
    id: 'me_sandstorm',
    name: 'Sandstorm',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'A blinding wall of sand: enemy vision fails and hearts falter.',
    icon: 'sandstorm',
    cost: { gold: 100 },
    cooldownSecs: 100,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 12,
      effects: [
        { type: 'visionSuppress', radius: 12, durationSecs: 18 },
        { type: 'moraleChange', radius: 12, amount: -15, ally: false },
      ],
      vfx: 'sandSwirl',
      sfx: 'howlingWind',
    },
  }),
  abilityCard({
    id: 'me_bazaar_boom',
    name: 'Bazaar Boom',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'The bazaar roars to life: a burst of gold income for 25 seconds.',
    icon: 'bazaarBoom',
    cost: { food: 80, wood: 80 },
    cooldownSecs: 110,
    ability: {
      target: 'global',
      effects: [{ type: 'incomeBurst', resource: 'gold', amountPerSec: 4, durationSecs: 25 }],
      vfx: 'coinShower',
      sfx: 'marketDin',
    },
  }),
  abilityCard({
    id: 'me_burning_oil',
    name: 'Burning Oil',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Cauldrons tip over the walls; enemies below burn.',
    icon: 'burningOil',
    cost: { gold: 120 },
    cooldownSecs: 90,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 6,
      effects: [{ type: 'damageArea', radius: 6, damage: 50, vs: 'units', dot: { dps: 8, secs: 4 } }],
      vfx: 'oilSplash',
      sfx: 'sizzle',
    },
  }),
  abilityCard({
    id: 'me_desert_march',
    name: 'Desert March',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'Soldiers and riders quicken their pace by a quarter for 18 seconds.',
    icon: 'desertMarch',
    cost: { food: 70, gold: 60 },
    cooldownSecs: 85,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['infantry', 'cavalry'], ally: true }, stat: 'unit.speed', op: 'mul', value: 1.25, durationSecs: 18 },
      ],
      vfx: 'dustTrail',
      sfx: 'marchDrums',
    },
  }),
  abilityCard({
    id: 'me_call_the_caravan',
    name: 'Call the Caravan',
    faction: F,
    deckPoints: 5,
    rarity: 'rare',
    description: 'Summons two caravan drivers to run a temporary trade route.',
    icon: 'caravan',
    cost: { gold: 150 },
    cooldownSecs: 150,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      effects: [{ type: 'spawnUnits', unitId: 'me_caravan_driver', count: 2, temporarySecs: 120 }],
      vfx: 'caravanArrival',
      sfx: 'camelBells',
    },
  }),
  abilityCard({
    id: 'me_meteor_fire',
    name: 'Meteor Fire',
    faction: F,
    deckPoints: 6,
    rarity: 'legendary',
    description: 'Fire falls from the sky and lingers on all it touches.',
    icon: 'meteor',
    cost: { gold: 250, influence: 40 },
    cooldownSecs: 180,
    requirements: { tier: 4 },
    type: 'factionPower',
    ability: {
      target: 'point',
      radius: 9,
      effects: [{ type: 'damageArea', radius: 9, damage: 90, vs: 'all', dot: { dps: 10, secs: 4 } }],
      vfx: 'meteorStrike',
      sfx: 'skyfall',
    },
  }),
  abilityCard({
    id: 'me_golden_command',
    name: 'Golden Command',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Gold greases every drill yard: production hastens for 25 seconds.',
    icon: 'goldenCommand',
    cost: { gold: 140 },
    cooldownSecs: 120,
    requirements: { tier: 3 },
    ability: {
      target: 'global',
      effects: [{ type: 'productionBoost', mul: 1.6, durationSecs: 25 }],
      vfx: 'goldenSeal',
      sfx: 'gong',
    },
  }),
  abilityCard({
    id: 'me_siege_mastery',
    name: 'Siege Mastery',
    faction: F,
    deckPoints: 5,
    rarity: 'rare',
    description: 'Siege crews reload faster and strike harder for 25 seconds.',
    icon: 'siegeMastery',
    cost: { wood: 120, gold: 150 },
    cooldownSecs: 140,
    requirements: { tier: 3 },
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['siege'], ally: true }, stat: 'unit.siege.attackSpeed', op: 'mul', value: 1.35, durationSecs: 25 },
        { type: 'buff', filter: { roles: ['siege'], ally: true }, stat: 'unit.siege.damage', op: 'mul', value: 1.2, durationSecs: 25 },
      ],
      vfx: 'engineGlow',
      sfx: 'winchCrank',
    },
  }),
];
