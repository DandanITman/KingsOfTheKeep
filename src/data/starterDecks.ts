/** Built-in starter decks, one per faction. Always available; also used by bots. */

import type { Deck, FactionId } from './types';

export const STARTER_DECKS: Partial<Record<FactionId, Deck>> = {
  european: {
    id: 'starter_european',
    name: 'Banner of the Crown',
    faction: 'european',
    cardIds: [
      'card_eu_crown_keep',
      'card_eu_serf_worker',
      'card_farmstead',
      'card_lumberCamp',
      'card_miningCamp',
      'card_stoneQuarry',
      'card_house',
      'card_barracks',
      'card_archeryRange',
      'card_stable',
      'card_siegeWorkshop',
      'card_forge',
      'card_blacksmith',
      'card_eu_levy_spearman',
      'card_eu_militia_swordsman',
      'card_eu_shortbow_archer',
      'card_eu_knight',
      'card_eu_catapult',
      'card_watchTower',
      'card_stoneWall',
    ],
  },
};

export function getStarterDeck(faction: FactionId): Deck {
  const deck = STARTER_DECKS[faction];
  if (!deck) throw new Error(`No starter deck for faction: ${faction}`);
  return deck;
}
