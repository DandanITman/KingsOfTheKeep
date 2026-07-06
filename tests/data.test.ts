import { describe, expect, it } from 'vitest';
import { CARD_DB, validateCardDb, getCard } from '@/data/cards';
import { UNIT_DB } from '@/data/units';
import { BUILDING_DB } from '@/data/buildings';
import { STARTER_DECKS } from '@/data/starterDecks';
import { checkDeck } from '@/data/deckValidation';
import { UPGRADES } from '@/data/upgrades';
import { MAPS } from '@/data/maps';
import { PLAYABLE_FACTIONS } from '@/data/types';
import { FACTIONS } from '@/data/factions';

describe('card database', () => {
  it('has no integrity errors', () => {
    expect(validateCardDb()).toEqual([]);
  });

  it('has the full launch set size', () => {
    // ~24 universal + 4×~43 faction + 8 neutral + 4 heroes
    expect(CARD_DB.size).toBeGreaterThanOrEqual(170);
  });

  it('every unit card references a unit trained at a real trainKey', () => {
    const trainKeys = new Set<string>(['']);
    for (const b of BUILDING_DB.values()) {
      if (b.trainKey) trainKeys.add(b.trainKey);
    }
    for (const unit of UNIT_DB.values()) {
      expect(trainKeys.has(unit.trainedAt), `unit ${unit.id} trainedAt=${unit.trainedAt}`).toBe(true);
    }
  });

  it('every faction has a fortress card and worker unit', () => {
    for (const faction of PLAYABLE_FACTIONS) {
      const def = FACTIONS[faction as keyof typeof FACTIONS];
      const fortressCard = getCard(`card_${def.fortressCardId}`);
      expect(fortressCard.type).toBe('fortress');
      expect(UNIT_DB.has(def.workerUnitId)).toBe(true);
    }
  });

  it('upgrade researches referenced by buildings exist', () => {
    const upgradeIds = new Set(UPGRADES.map((u) => u.id));
    for (const b of BUILDING_DB.values()) {
      for (const id of b.researches ?? []) {
        expect(upgradeIds.has(id), `building ${b.id} researches ${id}`).toBe(true);
      }
      for (const id of b.tierUpgrades ?? []) {
        expect(upgradeIds.has(id), `building ${b.id} tier upgrade ${id}`).toBe(true);
      }
    }
  });
});

describe('starter decks', () => {
  it('every playable faction has a valid starter deck', () => {
    for (const faction of PLAYABLE_FACTIONS) {
      const deck = STARTER_DECKS[faction];
      expect(deck, `starter deck for ${faction}`).toBeDefined();
      for (const cardId of deck!.cardIds) {
        expect(CARD_DB.has(cardId), `${faction} starter card ${cardId}`).toBe(true);
      }
      const check = checkDeck(deck!);
      expect(check.errors, `${faction}: ${check.errors.join('; ')}`).toEqual([]);
    }
  });
});

describe('maps', () => {
  it('all maps have at least 2 spawns and base resources', () => {
    for (const map of MAPS) {
      expect(map.spawns.length).toBeGreaterThanOrEqual(2);
      for (const type of ['forest', 'gold', 'stone'] as const) {
        expect(
          map.resources.some((r) => r.type === type),
          `${map.id} missing ${type}`,
        ).toBe(true);
      }
    }
  });
});
