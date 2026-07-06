/** Card construction helpers so faction card files stay short and readable. */

import type { AbilityDef, Card, CardRequirements, CardType, Cost, Rarity } from '../types';

export function unitCard(opts: {
  id?: string;
  unitId: string;
  name: string;
  faction: Card['faction'];
  deckPoints: number;
  rarity: Rarity;
  description: string;
  icon: string;
  type?: CardType;
  requirements?: CardRequirements;
}): Card {
  return {
    id: opts.id ?? `card_${opts.unitId}`,
    name: opts.name,
    faction: opts.faction,
    type: opts.type ?? 'unit',
    rarity: opts.rarity,
    deckPoints: opts.deckPoints,
    description: opts.description,
    icon: opts.icon,
    requirements: opts.requirements,
    unitId: opts.unitId,
  };
}

export function buildingCard(opts: {
  id?: string;
  buildingId: string;
  name: string;
  faction: Card['faction'];
  deckPoints: number;
  rarity: Rarity;
  description: string;
  icon: string;
  type: CardType;
  requirements?: CardRequirements;
}): Card {
  return {
    id: opts.id ?? `card_${opts.buildingId}`,
    name: opts.name,
    faction: opts.faction,
    type: opts.type,
    rarity: opts.rarity,
    deckPoints: opts.deckPoints,
    description: opts.description,
    icon: opts.icon,
    requirements: opts.requirements,
    buildingId: opts.buildingId,
  };
}

export function abilityCard(opts: {
  id: string;
  name: string;
  faction: Card['faction'];
  deckPoints: number;
  rarity: Rarity;
  description: string;
  icon: string;
  ability: AbilityDef;
  cost: Cost;
  cooldownSecs: number;
  requirements?: CardRequirements;
  type?: CardType;
}): Card {
  return {
    id: opts.id,
    name: opts.name,
    faction: opts.faction,
    type: opts.type ?? 'ability',
    rarity: opts.rarity,
    deckPoints: opts.deckPoints,
    description: opts.description,
    icon: opts.icon,
    requirements: opts.requirements,
    ability: opts.ability,
    cost: opts.cost,
    cooldownSecs: opts.cooldownSecs,
  };
}
