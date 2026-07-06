/** Neutral mercenary cards (GDD §28) and hero commander cards (§48.2). */

import type { Card } from '../types';
import { unitCard } from './_builders';

export const NEUTRAL_CARDS: Card[] = [
  unitCard({ unitId: 'nu_mercenary_swordsmen', name: 'Mercenary Swordsmen', faction: 'neutral', deckPoints: 3, rarity: 'uncommon', description: 'Hired blades. Loyal while the gold lasts.', icon: 'sword' }),
  unitCard({ unitId: 'nu_free_company_archers', name: 'Free Company Archers', faction: 'neutral', deckPoints: 3, rarity: 'uncommon', description: 'Sellsword bowmen for any banner.', icon: 'bow' }),
  unitCard({ unitId: 'nu_wandering_engineers', name: 'Wandering Engineers', faction: 'neutral', deckPoints: 4, rarity: 'rare', description: 'Repairs siege and buildings at speed.', icon: 'gears', requirements: { tier: 3 } }),
  unitCard({ unitId: 'nu_merchant_caravan', name: 'Merchant Caravan', faction: 'neutral', deckPoints: 3, rarity: 'uncommon', description: 'Trades along your routes for gold.', icon: 'caravan', requirements: { buildingId: 'market' } }),
  unitCard({ unitId: 'nu_bandit_raiders', name: 'Bandit Raiders', faction: 'neutral', deckPoints: 3, rarity: 'uncommon', description: 'Cutthroat riders who love a poorly guarded farm.', icon: 'scout', requirements: { tier: 2 } }),
  unitCard({ unitId: 'nu_stone_golem', name: 'Stone Golem Mercenary', faction: 'neutral', deckPoints: 7, rarity: 'legendary', description: 'A living siege engine of ancient stone.', icon: 'golem', requirements: { tier: 4 } }),
  unitCard({ unitId: 'nu_traveling_monk', name: 'Traveling Monk', faction: 'neutral', deckPoints: 3, rarity: 'uncommon', description: 'Mends wounds and steadies hearts.', icon: 'monk' }),
  unitCard({ unitId: 'nu_siege_contractor', name: 'Siege Contractor', faction: 'neutral', deckPoints: 4, rarity: 'rare', description: 'Builds war machines remarkably fast.', icon: 'workshop', requirements: { tier: 3 } }),

  // --- Heroes (unique; respawn at the keep after falling) ---
  unitCard({ unitId: 'hero_lion_duke', name: 'The Lion Duke', faction: 'european', type: 'hero', deckPoints: 8, rarity: 'legendary', description: 'The realm made flesh: an unbreakable charge and a rallying roar.', icon: 'lionDuke', requirements: { tier: 3 } }),
  unitCard({ unitId: 'hero_jade_strategist', name: 'Jade Strategist', faction: 'asian', type: 'hero', deckPoints: 8, rarity: 'legendary', description: 'Sees ten moves ahead; armies steady under her gaze.', icon: 'jadeStrategist', requirements: { tier: 3 } }),
  unitCard({ unitId: 'hero_sunshield_queen', name: 'Sunshield Queen', faction: 'african', type: 'hero', deckPoints: 8, rarity: 'legendary', description: 'Her shield has never broken; her drums never fall silent.', icon: 'sunshieldQueen', requirements: { tier: 3 } }),
  unitCard({ unitId: 'hero_crescent_vizier', name: 'Crescent Vizier', faction: 'middleEastern', type: 'hero', deckPoints: 8, rarity: 'legendary', description: 'Master of trade and war alike.', icon: 'crescentVizier', requirements: { tier: 3 } }),
];
