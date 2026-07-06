import type { Card, FactionId } from '../types';
import { UNIVERSAL_CARDS } from './universal';
import { EUROPEAN_CARDS } from './european';
import { UNIT_DB } from '../units';
import { BUILDING_DB } from '../buildings';

const ALL_CARDS: Card[] = [...UNIVERSAL_CARDS, ...EUROPEAN_CARDS];

export const CARD_DB = new Map<string, Card>();

export function registerCards(cards: Card[]): void {
  for (const c of cards) {
    if (CARD_DB.has(c.id)) throw new Error(`Duplicate card id: ${c.id}`);
    CARD_DB.set(c.id, c);
  }
}
registerCards(ALL_CARDS);

export function getCard(id: string): Card {
  const c = CARD_DB.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function cardsForFaction(faction: FactionId): Card[] {
  return [...CARD_DB.values()].filter((c) => c.faction === faction || c.faction === 'neutral');
}

/** Startup integrity check: every card payload must reference existing defs. */
export function validateCardDb(): string[] {
  const errors: string[] = [];
  for (const card of CARD_DB.values()) {
    const payloads = [card.unitId, card.buildingId, card.ability].filter((p) => p !== undefined);
    if (payloads.length !== 1) errors.push(`${card.id}: has ${payloads.length} payloads (want 1)`);
    if (card.unitId && !UNIT_DB.has(card.unitId)) errors.push(`${card.id}: missing unit ${card.unitId}`);
    if (card.buildingId && !BUILDING_DB.has(card.buildingId)) errors.push(`${card.id}: missing building ${card.buildingId}`);
    if (card.deckPoints < 0 || card.deckPoints > 10) errors.push(`${card.id}: bad deckPoints ${card.deckPoints}`);
  }
  return errors;
}
