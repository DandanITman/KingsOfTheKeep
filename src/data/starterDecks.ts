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

STARTER_DECKS.asian = {
  id: 'starter_asian',
  name: 'Way of the Jade Court',
  faction: 'asian',
  cardIds: [
    'card_as_jade_palace',
    'card_as_village_worker',
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
    'card_as_ashigaru_spearman',
    'card_as_dao_militia',
    'card_as_bamboo_archer',
    'card_as_samurai_rider',
    'card_as_traction_trebuchet',
    'card_watchTower',
    'card_stoneWall',
  ],
};

STARTER_DECKS.african = {
  id: 'starter_african',
  name: 'Drums of the Golden Hearth',
  faction: 'african',
  cardIds: [
    'card_af_golden_hearth',
    'card_af_hearth_worker',
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
    'card_af_village_spearman',
    'card_af_shield_warrior',
    'card_af_bow_hunter',
    'card_af_war_zebra_rider',
    'card_af_stone_slinger_team',
    'card_watchTower',
    'card_woodenWall',
  ],
};

STARTER_DECKS.middleEastern = {
  id: 'starter_middleEastern',
  name: 'Caravans of the Crescent',
  faction: 'middleEastern',
  cardIds: [
    'card_me_crescent_citadel',
    'card_me_town_worker',
    'card_farmstead',
    'card_lumberCamp',
    'card_miningCamp',
    'card_stoneQuarry',
    'card_house',
    'card_barracks',
    'card_archeryRange',
    'card_stable',
    'card_siegeWorkshop',
    'card_market',
    'card_blacksmith',
    'card_me_spear_levy',
    'card_me_scimitar_militia',
    'card_me_desert_archer',
    'card_me_camel_rider',
    'card_me_mangonel',
    'card_watchTower',
    'card_stoneWall',
  ],
};

export function getStarterDeck(faction: FactionId): Deck {
  const deck = STARTER_DECKS[faction];
  if (!deck) throw new Error(`No starter deck for faction: ${faction}`);
  return deck;
}
