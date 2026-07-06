import { CARD_DB, getCard } from './cards';
import { DECK_MAX_CARDS, DECK_MAX_POINTS, type Card, type Deck, type FactionId } from './types';

export interface DeckCheck {
  valid: boolean;
  errors: string[];
  points: number;
  cardCount: number;
  /** Required-slot checklist (GDD §8.1). */
  slots: { label: string; need: number; have: number }[];
}

function countType(cards: Card[], pred: (c: Card) => boolean): number {
  return cards.filter(pred).length;
}

/** Validate a deck against GDD §8.1 rules. */
export function checkDeck(deck: Deck): DeckCheck {
  const errors: string[] = [];
  const cards = deck.cardIds.filter((id) => CARD_DB.has(id)).map((id) => getCard(id));

  const points = cards.reduce((sum, c) => sum + c.deckPoints, 0);
  if (points > DECK_MAX_POINTS) errors.push(`Over the ${DECK_MAX_POINTS} deck point limit (${points}).`);
  if (cards.length > DECK_MAX_CARDS) errors.push(`Over the ${DECK_MAX_CARDS} card limit (${cards.length}).`);

  const dupes = new Set<string>();
  const seen = new Set<string>();
  for (const id of deck.cardIds) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size > 0) errors.push('Decks cannot contain duplicate cards.');

  for (const c of cards) {
    if (c.faction !== 'neutral' && c.faction !== deck.faction) {
      errors.push(`${c.name} belongs to another faction.`);
    }
  }

  const slots = [
    { label: 'Main Fortress', need: 1, have: countType(cards, (c) => c.type === 'fortress') },
    { label: 'Civilian Unit', need: 1, have: countType(cards, (c) => c.type === 'civilian') },
    { label: 'Economy Building', need: 2, have: countType(cards, (c) => c.type === 'economyBuilding') },
    { label: 'Military Building', need: 1, have: countType(cards, (c) => c.type === 'militaryBuilding') },
    { label: 'Military Unit', need: 3, have: countType(cards, (c) => c.type === 'unit' || c.type === 'hero') },
    { label: 'Defensive Structure', need: 1, have: countType(cards, (c) => c.type === 'defense') },
  ];
  const fortressCount = slots[0].have;
  if (fortressCount !== 1) errors.push('A deck needs exactly one Main Fortress card.');
  for (const slot of slots.slice(1)) {
    if (slot.have < slot.need) errors.push(`Needs ${slot.need}+ ${slot.label} card${slot.need > 1 ? 's' : ''}.`);
  }

  return { valid: errors.length === 0, errors, points, cardCount: cards.length, slots };
}

/** Grant the launch collection: starter deck contents plus every common card. */
export function ensureStarterCollection(collection: Record<string, number>, starterCardIds: string[]): void {
  for (const id of starterCardIds) {
    if (!collection[id]) collection[id] = 1;
  }
  for (const card of CARD_DB.values()) {
    if (card.rarity === 'common' && !collection[card.id]) collection[card.id] = 1;
  }
}

export function factionCards(faction: FactionId): Card[] {
  return [...CARD_DB.values()]
    .filter((c) => c.faction === faction || c.faction === 'neutral')
    .sort((a, b) => a.deckPoints - b.deckPoints || a.name.localeCompare(b.name));
}
