/** African faction cards (GDD §26). */

import type { Card } from '../types';
import { abilityCard, buildingCard, unitCard } from './_builders';

const F = 'african' as const;

export const AFRICAN_CARDS: Card[] = [
  // --- Fortress ---
  buildingCard({
    buildingId: 'af_golden_hearth',
    name: 'Golden Hearth Citadel',
    faction: F,
    type: 'fortress',
    deckPoints: 0,
    rarity: 'common',
    description: 'Morale-focused fortress. Drums bolster nearby hearts and hands.',
    icon: 'hearth',
  }),

  // --- Civilians & economy units ---
  unitCard({ unitId: 'af_hearth_worker', name: 'Hearth Worker', faction: F, type: 'civilian', deckPoints: 0, rarity: 'common', description: 'Basic builder and gatherer.', icon: 'worker' }),
  unitCard({ unitId: 'af_forager', name: 'Forager', faction: F, type: 'civilian', deckPoints: 1, rarity: 'common', description: 'Gathers food quickly from natural sources.', icon: 'worker' }),
  unitCard({ unitId: 'af_gold_washer', name: 'Gold Washer', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Pans rivers and mines for extra gold.', icon: 'coin' }),
  unitCard({ unitId: 'af_herd_keeper', name: 'Herd Keeper', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Tends herds that provide a steady trickle of food.', icon: 'zebra' }),
  unitCard({ unitId: 'af_drum_caller', name: 'Drum Caller', faction: F, type: 'civilian', deckPoints: 3, rarity: 'uncommon', description: 'Drumbeats lift the morale of those nearby.', icon: 'drum' }),

  // --- Infantry ---
  unitCard({ unitId: 'af_village_spearman', name: 'Village Spearman', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap anti-cavalry spear.', icon: 'spear' }),
  unitCard({ unitId: 'af_shield_warrior', name: 'Shield Warrior', faction: F, deckPoints: 1, rarity: 'common', description: 'Basic melee behind a hide shield.', icon: 'shield' }),
  unitCard({ unitId: 'af_throwing_spear_warrior', name: 'Throwing Spear Warrior', faction: F, deckPoints: 2, rarity: 'common', description: 'Mobile infantry that hurls spears at archers.', icon: 'spear' }),
  unitCard({ unitId: 'af_iron_guard', name: 'Iron Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Armored frontline of forge-hardened iron.', icon: 'shield', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_leopard_warrior', name: 'Leopard Warrior', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Strikes fast and slips away faster.', icon: 'sword', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_royal_spear_guard', name: 'Royal Spear Guard', faction: F, deckPoints: 4, rarity: 'rare', description: 'Elite spears that break any charge.', icon: 'spear', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_sunblade_champion', name: 'Sunblade Champion', faction: F, deckPoints: 5, rarity: 'epic', description: 'A duelist whose blade blazes like the noon sun.', icon: 'champion', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_ancestral_guard', name: 'Ancestral Guard', faction: F, deckPoints: 4, rarity: 'rare', description: 'Stalwart defenders, strongest near keeps and monuments.', icon: 'shield', requirements: { tier: 3 } }),

  // --- Ranged ---
  unitCard({ unitId: 'af_sling_hunter', name: 'Sling Hunter', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap ranged harassment with stone and sling.', icon: 'sling' }),
  unitCard({ unitId: 'af_bow_hunter', name: 'Bow Hunter', faction: F, deckPoints: 1, rarity: 'common', description: 'Basic archer of the savannah.', icon: 'bow' }),
  unitCard({ unitId: 'af_poison_dart_skirmisher', name: 'Poison Dart Skirmisher', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Darts that keep biting after they land.', icon: 'bow', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_royal_archer', name: 'Royal Archer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Reliable ranged damage for the royal host.', icon: 'bow', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_savannah_marksman', name: 'Savannah Marksman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Elite shot that punishes light units.', icon: 'marksman', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_fire_gourd_thrower', name: 'Fire Gourd Thrower', faction: F, deckPoints: 4, rarity: 'rare', description: 'Lobs burning gourds that splash fire.', icon: 'gourd', requirements: { tier: 3 } }),

  // --- Cavalry & beasts ---
  unitCard({ unitId: 'af_scout_runner', name: 'Scout Runner', faction: F, deckPoints: 1, rarity: 'common', description: 'Very fast runner; the eyes of the war camp.', icon: 'scout', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_light_horse_raider', name: 'Light Horse Raider', faction: F, deckPoints: 2, rarity: 'common', description: 'Swift riders that harry enemy workers.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_camel_skirmisher', name: 'Camel Skirmisher', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Mobile ranged harassment; horses hate the smell.', icon: 'camel', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_war_zebra_rider', name: 'War Zebra Rider', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Fast flankers on striped mounts.', icon: 'zebra', requirements: { tier: 2 } }),
  unitCard({ unitId: 'af_rhino_breaker', name: 'Rhino Breaker', faction: F, deckPoints: 5, rarity: 'rare', description: 'Charges through walls and formations alike.', icon: 'rhino', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_war_elephant_guard', name: 'War Elephant Guard', faction: F, deckPoints: 6, rarity: 'epic', description: 'A living rampart that anchors the battle line.', icon: 'elephant', requirements: { tier: 4 } }),

  // --- Siege ---
  unitCard({ unitId: 'af_ram_crew', name: 'Ram Crew', faction: F, deckPoints: 2, rarity: 'common', description: 'Basic wall breaker.', icon: 'ram', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_fire_pot_crew', name: 'Fire Pot Crew', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Hurls fire pots that burn buildings down.', icon: 'gourd', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_stone_slinger_team', name: 'Stone Slinger Team', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Anti-building ranged siege.', icon: 'sling', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_rhino_ram', name: 'Rhino Ram', faction: F, deckPoints: 5, rarity: 'rare', description: 'A living siege engine in armored hide.', icon: 'rhino', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_great_drum_platform', name: 'Great Drum Platform', faction: F, deckPoints: 4, rarity: 'rare', description: 'Slow rolling drums that steel the whole army.', icon: 'drum', requirements: { tier: 3 } }),
  unitCard({ unitId: 'af_sunfire_engine', name: 'Sunfire Engine', faction: F, deckPoints: 6, rarity: 'epic', description: 'Late-game engine that drowns fortresses in fire.', icon: 'bombard', requirements: { tier: 4 } }),

  // --- Faction buildings ---
  buildingCard({ buildingId: 'af_drum_circle', name: 'Drum Circle', faction: F, type: 'economyBuilding', deckPoints: 3, rarity: 'rare', description: 'A standing rhythm that keeps army morale high.', icon: 'drum', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'af_herding_grounds', name: 'Herding Grounds', faction: F, type: 'economyBuilding', deckPoints: 2, rarity: 'uncommon', description: 'Penned herds provide passive food.', icon: 'zebra' }),
  buildingCard({ buildingId: 'af_warrior_lodge', name: 'Warrior Lodge', faction: F, type: 'militaryBuilding', deckPoints: 3, rarity: 'rare', description: 'Trains infantry faster.', icon: 'sword', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'af_sunfire_yard', name: 'Sunfire Yard', faction: F, type: 'militaryBuilding', deckPoints: 3, rarity: 'rare', description: 'Builds the fire siege of the late game.', icon: 'catapult', requirements: { tier: 3 } }),

  // --- Abilities (GDD §26.7) ---
  abilityCard({
    id: 'af_war_drums',
    name: 'War Drums',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'The drums thunder: nearby allies rally and move 20% faster.',
    icon: 'warDrums',
    cost: { food: 80, gold: 50 },
    cooldownSecs: 90,
    ability: {
      target: 'point',
      radius: 16,
      effects: [
        { type: 'moraleChange', radius: 16, amount: 20, ally: true },
        { type: 'buff', radius: 16, filter: { ally: true }, stat: 'unit.speed', op: 'mul', value: 1.2, durationSecs: 20 },
      ],
      vfx: 'drumShock',
      sfx: 'warDrums',
    },
  }),
  abilityCard({
    id: 'af_ancestral_courage',
    name: 'Ancestral Courage',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'The ancestors stand with you: +40 morale in a wide area.',
    icon: 'courage',
    cost: { food: 100, gold: 80 },
    cooldownSecs: 110,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 16,
      effects: [{ type: 'moraleChange', radius: 16, amount: 40, ally: true }],
      vfx: 'ancestorGlow',
      sfx: 'chant',
    },
  }),
  abilityCard({
    id: 'af_dust_ambush',
    name: 'Dust Ambush',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'A blinding dust cloud hides the target area for 12 seconds.',
    icon: 'dust',
    cost: { gold: 70 },
    cooldownSecs: 80,
    ability: {
      target: 'point',
      radius: 10,
      effects: [{ type: 'visionSuppress', radius: 10, durationSecs: 12 }],
      vfx: 'dustCloud',
      sfx: 'windGust',
    },
  }),
  abilityCard({
    id: 'af_stampede',
    name: 'Stampede',
    faction: F,
    deckPoints: 5,
    rarity: 'epic',
    description: 'War beasts charge through enemy lines, faster and far deadlier.',
    icon: 'stampede',
    cost: { food: 150, gold: 100 },
    cooldownSecs: 130,
    requirements: { tier: 3 },
    type: 'factionPower',
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { tags: ['beast'], ally: true }, stat: 'unit.damage', op: 'mul', value: 1.5, durationSecs: 15 },
        { type: 'buff', filter: { tags: ['beast'], ally: true }, stat: 'unit.speed', op: 'mul', value: 1.3, durationSecs: 15 },
      ],
      vfx: 'stampedeDust',
      sfx: 'stampede',
    },
  }),
  abilityCard({
    id: 'af_sunfire_pots',
    name: 'Sunfire Pots',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Burning pots shatter over the area, leaving lingering flames.',
    icon: 'sunfire',
    cost: { wood: 80, gold: 120 },
    cooldownSecs: 110,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 7,
      effects: [{ type: 'damageArea', radius: 7, damage: 40, vs: 'all', dot: { dps: 6, secs: 5 } }],
      vfx: 'fireBurst',
      sfx: 'fireWhoosh',
    },
  }),
  abilityCard({
    id: 'af_call_of_the_hearth',
    name: 'Call of the Hearth',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'Workers gather 30% faster and production hastens for 20 seconds.',
    icon: 'hearth',
    cost: { gold: 80 },
    cooldownSecs: 100,
    ability: {
      target: 'global',
      effects: [
        { type: 'gatherBoost', mul: 1.3, durationSecs: 20 },
        { type: 'productionBoost', mul: 1.2, durationSecs: 20 },
      ],
      vfx: 'hearthGlow',
      sfx: 'homeDrum',
    },
  }),
  abilityCard({
    id: 'af_golden_surge',
    name: 'Golden Surge',
    faction: F,
    deckPoints: 5,
    rarity: 'epic',
    description: 'The rivers run gold: gold gathering surges for 30 seconds.',
    icon: 'goldenSurge',
    cost: { food: 100, wood: 100 },
    cooldownSecs: 150,
    requirements: { tier: 3 },
    ability: {
      target: 'global',
      effects: [
        { type: 'gatherBoost', resource: 'gold', mul: 1.6, durationSecs: 30 },
        { type: 'incomeBurst', resource: 'gold', amountPerSec: 3, durationSecs: 30 },
      ],
      vfx: 'goldSparkle',
      sfx: 'coinShower',
    },
  }),
  abilityCard({
    id: 'af_circle_of_shields',
    name: 'Circle of Shields',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Infantry lock shields: +6 pierce armor for 20 seconds.',
    icon: 'shieldCircle',
    cost: { food: 100, gold: 70 },
    cooldownSecs: 100,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['infantry'], ally: true }, stat: 'unit.infantry.pierceArmor', op: 'add', value: 6, durationSecs: 20 },
      ],
      vfx: 'shieldRing',
      sfx: 'shieldSlam',
    },
  }),
];
