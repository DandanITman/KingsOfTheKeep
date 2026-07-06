/** Asian faction cards (GDD §25). */

import type { Card } from '../types';
import { abilityCard, buildingCard, unitCard } from './_builders';

const F = 'asian' as const;

export const ASIAN_CARDS: Card[] = [
  // --- Fortress ---
  buildingCard({
    buildingId: 'as_jade_palace',
    name: 'Jade Palace Keep',
    faction: F,
    type: 'fortress',
    deckPoints: 0,
    rarity: 'common',
    description: 'Flexible command fortress. Formations and ranged bonuses, but less durable.',
    icon: 'keep',
  }),

  // --- Civilians & economy units ---
  unitCard({ unitId: 'as_village_worker', name: 'Village Worker', faction: F, type: 'civilian', deckPoints: 0, rarity: 'common', description: 'Basic builder and gatherer.', icon: 'worker' }),
  unitCard({ unitId: 'as_rice_farmer', name: 'Rice Farmer', faction: F, type: 'civilian', deckPoints: 1, rarity: 'common', description: 'Tends paddies for a better food economy.', icon: 'worker' }),
  unitCard({ unitId: 'as_bamboo_cutter', name: 'Bamboo Cutter', faction: F, type: 'civilian', deckPoints: 1, rarity: 'common', description: 'Harvests wood with practiced speed.', icon: 'bamboo' }),
  unitCard({ unitId: 'as_imperial_clerk', name: 'Imperial Clerk', faction: F, type: 'civilian', deckPoints: 3, rarity: 'uncommon', description: 'Keeps the ledgers; gold trickles into the treasury.', icon: 'coin' }),
  unitCard({ unitId: 'as_artisan_builder', name: 'Artisan Builder', faction: F, type: 'civilian', deckPoints: 2, rarity: 'uncommon', description: 'Raises special structures with remarkable speed.', icon: 'mason' }),

  // --- Infantry ---
  unitCard({ unitId: 'as_ashigaru_spearman', name: 'Ashigaru Spearman', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap, quick anti-cavalry levy.', icon: 'spear' }),
  unitCard({ unitId: 'as_dao_militia', name: 'Dao Militia', faction: F, deckPoints: 1, rarity: 'common', description: 'Basic melee with curved blades.', icon: 'sword' }),
  unitCard({ unitId: 'as_samurai_retainer', name: 'Samurai Retainer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Disciplined heavy melee sworn to service.', icon: 'sword' }),
  unitCard({ unitId: 'as_naginata_guard', name: 'Naginata Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Elite guard whose polearms fell riders.', icon: 'halberd', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_temple_monk', name: 'Temple Monk', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Steadies morale and tends the wounded.', icon: 'monk', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_iron_fan_guard', name: 'Iron Fan Guard', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Iron fans turn aside arrow storms.', icon: 'fan', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_dragon_blade_master', name: 'Dragon Blade Master', faction: F, deckPoints: 5, rarity: 'rare', description: 'An elite blade whose strikes flow like water.', icon: 'champion', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_palace_sentinel', name: 'Palace Sentinel', faction: F, deckPoints: 4, rarity: 'rare', description: 'Immovable defender of the Jade Palace.', icon: 'shield', requirements: { tier: 3 } }),

  // --- Ranged ---
  unitCard({ unitId: 'as_bamboo_archer', name: 'Bamboo Archer', faction: F, deckPoints: 1, rarity: 'common', description: 'Cheap, quick-footed archer.', icon: 'bow' }),
  unitCard({ unitId: 'as_repeating_crossbowman', name: 'Repeating Crossbowman', faction: F, deckPoints: 2, rarity: 'common', description: 'A hail of light bolts, loosed without pause.', icon: 'crossbow' }),
  unitCard({ unitId: 'as_fire_arrow_archer', name: 'Fire Arrow Archer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Burning shafts that gnaw at buildings.', icon: 'fireArrows', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_mounted_archer', name: 'Mounted Archer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Harasses and kites from the saddle.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_imperial_marksman', name: 'Imperial Marksman', faction: F, deckPoints: 4, rarity: 'rare', description: 'Unerring accuracy at remarkable range.', icon: 'marksman', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_rocket_cart_crew', name: 'Rocket Cart Crew', faction: F, deckPoints: 5, rarity: 'rare', description: 'Handheld rockets scorch whole ranks.', icon: 'rocket', requirements: { tier: 3 } }),

  // --- Cavalry ---
  unitCard({ unitId: 'as_steppe_scout', name: 'Steppe Scout', faction: F, deckPoints: 1, rarity: 'common', description: 'The fastest eyes on the plain.', icon: 'scout', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_horse_archer', name: 'Horse Archer', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Loose, wheel, and loose again.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_samurai_rider', name: 'Samurai Rider', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Balanced cavalry with unshakable discipline.', icon: 'horseman', requirements: { tier: 2 } }),
  unitCard({ unitId: 'as_jade_lancer', name: 'Jade Lancer', faction: F, deckPoints: 4, rarity: 'rare', description: 'A green-lacquered lance and a fearsome charge.', icon: 'lancer', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_wind_cavalry', name: 'Wind Cavalry', faction: F, deckPoints: 5, rarity: 'rare', description: 'Flanks faster than the enemy can turn.', icon: 'knight', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_imperial_guard_rider', name: 'Imperial Guard Rider', faction: F, deckPoints: 6, rarity: 'epic', description: 'The emperor’s own riders. Costly, and worth it.', icon: 'paladin', requirements: { tier: 4 } }),

  // --- Siege ---
  unitCard({ unitId: 'as_fire_pot_thrower', name: 'Fire Pot Thrower', faction: F, deckPoints: 2, rarity: 'common', description: 'Clay pots of burning oil crack open on walls.', icon: 'catapult', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_traction_trebuchet', name: 'Traction Trebuchet', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'Crew-pulled stone thrower for mid-range sieges.', icon: 'trebuchet', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_rocket_cart', name: 'Rocket Cart', faction: F, deckPoints: 4, rarity: 'rare', description: 'Screaming volleys blanket a wide area.', icon: 'rocket', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_dragon_cannon', name: 'Dragon Cannon', faction: F, deckPoints: 6, rarity: 'epic', description: 'A bronze dragon that breathes fortress-breaking fire.', icon: 'bombard', requirements: { tier: 4 } }),
  unitCard({ unitId: 'as_bamboo_shield_cart', name: 'Bamboo Shield Cart', faction: F, deckPoints: 3, rarity: 'uncommon', description: 'A rolling bamboo screen that shelters infantry.', icon: 'siegeTower', requirements: { tier: 3 } }),
  unitCard({ unitId: 'as_wall_fire_launcher', name: 'Wall Fire Launcher', faction: F, deckPoints: 4, rarity: 'rare', description: 'Defensive flame engine that melts massed attacks.', icon: 'ballista', requirements: { tier: 3 } }),

  // --- Faction buildings ---
  buildingCard({ buildingId: 'as_temple', name: 'Temple', faction: F, type: 'economyBuilding', deckPoints: 3, rarity: 'uncommon', description: 'A serene sanctuary radiating morale and influence.', icon: 'temple', requirements: { tier: 2 } }),
  buildingCard({ buildingId: 'as_firework_foundry', name: 'Firework Foundry', faction: F, type: 'militaryBuilding', deckPoints: 3, rarity: 'uncommon', description: 'Builds rocket and fire siege engines faster.', icon: 'rocket', requirements: { tier: 3 } }),
  buildingCard({ buildingId: 'as_bamboo_watchpost', name: 'Bamboo Watchpost', faction: F, type: 'defense', deckPoints: 2, rarity: 'common', description: 'Cheap tower raised in moments.', icon: 'bamboo' }),
  buildingCard({ buildingId: 'as_imperial_academy', name: 'Imperial Academy', faction: F, type: 'upgradeBuilding', deckPoints: 3, rarity: 'uncommon', description: 'Tactical doctrines researched a tier early.', icon: 'pagoda', requirements: { tier: 2 } }),

  // --- Abilities (GDD §25.7) ---
  abilityCard({
    id: 'as_way_of_discipline',
    name: 'Way of Discipline',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'Your units hold formation, gaining +3 armor and pierce armor for 20 seconds.',
    icon: 'discipline',
    cost: { food: 80, gold: 60 },
    cooldownSecs: 90,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { ally: true }, stat: 'unit.armor', op: 'add', value: 3, durationSecs: 20 },
        { type: 'buff', filter: { ally: true }, stat: 'unit.pierceArmor', op: 'add', value: 3, durationSecs: 20 },
      ],
      vfx: 'formationGlow',
      sfx: 'warDrum',
    },
  }),
  abilityCard({
    id: 'as_fire_arrows',
    name: 'Fire Arrows',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Ranged units ignite their shots, dealing 30% more damage for 20 seconds.',
    icon: 'fireArrows',
    cost: { wood: 60, gold: 100 },
    cooldownSecs: 90,
    requirements: { tier: 2 },
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['ranged'], ally: true }, stat: 'unit.ranged.damage', op: 'mul', value: 1.3, durationSecs: 20 },
      ],
      vfx: 'emberTrails',
      sfx: 'fireWhoosh',
    },
  }),
  abilityCard({
    id: 'as_smoke_screen',
    name: 'Smoke Screen',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'A choking cloud blinds enemies in the area and saps their nerve.',
    icon: 'smoke',
    cost: { gold: 80 },
    cooldownSecs: 75,
    ability: {
      target: 'point',
      radius: 10,
      effects: [
        { type: 'visionSuppress', radius: 10, durationSecs: 15 },
        { type: 'moraleChange', radius: 10, amount: -10, ally: false },
      ],
      vfx: 'smokeCloud',
      sfx: 'smokeHiss',
    },
  }),
  abilityCard({
    id: 'as_dragon_rockets',
    name: 'Dragon Rockets',
    faction: F,
    deckPoints: 5,
    rarity: 'rare',
    description: 'A shrieking rocket barrage devastates the target area.',
    icon: 'dragonRockets',
    cost: { wood: 100, gold: 150 },
    cooldownSecs: 120,
    requirements: { tier: 3 },
    ability: {
      target: 'point',
      radius: 8,
      effects: [{ type: 'damageArea', radius: 8, damage: 55, vs: 'all' }],
      vfx: 'rocketBarrage',
      sfx: 'rocketScream',
    },
  }),
  abilityCard({
    id: 'as_silent_march',
    name: 'Silent March',
    faction: F,
    deckPoints: 3,
    rarity: 'uncommon',
    description: 'The army moves 25% faster and draws less notice for 15 seconds.',
    icon: 'silentMarch',
    cost: { food: 60, gold: 60 },
    cooldownSecs: 80,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { ally: true }, stat: 'unit.speed', op: 'mul', value: 1.25, durationSecs: 15 },
      ],
      vfx: 'mistStep',
      sfx: 'softWind',
    },
  }),
  abilityCard({
    id: 'as_temple_blessing',
    name: 'Temple Blessing',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'Sacred chimes restore morale and slowly mend allies in the area.',
    icon: 'templeBlessing',
    cost: { gold: 100, influence: 10 },
    cooldownSecs: 100,
    requirements: { tier: 2 },
    ability: {
      target: 'point',
      radius: 14,
      effects: [
        { type: 'moraleChange', radius: 14, amount: 30, ally: true },
        { type: 'repair', radius: 14, hpPerSec: 6, durationSecs: 15 },
      ],
      vfx: 'blessingLight',
      sfx: 'templeBell',
    },
  }),
  abilityCard({
    id: 'as_perfect_formation',
    name: 'Perfect Formation',
    faction: F,
    deckPoints: 5,
    rarity: 'rare',
    description: 'A mixed army in perfect order: +20% damage and +2 armor for 25 seconds.',
    icon: 'perfectFormation',
    cost: { food: 120, gold: 120 },
    cooldownSecs: 130,
    requirements: { tier: 3 },
    type: 'factionPower',
    ability: {
      target: 'point',
      radius: 14,
      effects: [
        { type: 'buff', radius: 14, filter: { ally: true }, stat: 'unit.damage', op: 'mul', value: 1.2, durationSecs: 25 },
        { type: 'buff', radius: 14, filter: { ally: true }, stat: 'unit.armor', op: 'add', value: 2, durationSecs: 25 },
      ],
      vfx: 'formationBanner',
      sfx: 'commandGong',
    },
  }),
  abilityCard({
    id: 'as_wind_reposition',
    name: 'Wind Reposition',
    faction: F,
    deckPoints: 4,
    rarity: 'rare',
    description: 'The army repositions like the wind: cavalry surge ahead, all move faster.',
    icon: 'windReposition',
    cost: { gold: 90 },
    cooldownSecs: 90,
    ability: {
      target: 'global',
      effects: [
        { type: 'buff', filter: { roles: ['cavalry'], ally: true }, stat: 'unit.cavalry.speed', op: 'mul', value: 1.4, durationSecs: 12 },
        { type: 'buff', filter: { ally: true }, stat: 'unit.speed', op: 'mul', value: 1.15, durationSecs: 12 },
      ],
      vfx: 'windGust',
      sfx: 'gustHowl',
    },
  }),
];
