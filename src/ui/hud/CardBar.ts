import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import { getCard } from '@/data/cards';
import { getBuilding } from '@/data/buildings';
import { getUnit } from '@/data/units';
import type { Card, Cost } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { cardAvailability } from '@/sim/systems/CardSystem';

const COST_ICONS: Record<string, string> = { food: '🍖', wood: '🪵', stone: '🪨', gold: '🪙', influence: '✨' };

function costText(cost: Cost): string {
  return Object.entries(cost)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${COST_ICONS[k] ?? k}${v}`)
    .join(' ');
}

export type CardClickHandler = (card: Card) => void;

/**
 * The card bar (GDD §14.3): the player's whole deck as clickable cards with
 * availability states — available / disabled (cost) / cooldown / locked (tier).
 */
export class CardBar {
  readonly root: HTMLElement;
  private state: MatchState;
  private tiles = new Map<string, { tile: HTMLElement; cdOverlay: HTMLElement; reason: HTMLElement }>();
  selectedCardId: string | null = null;

  constructor(state: MatchState, onClick: CardClickHandler) {
    this.state = state;
    this.root = el('div', { className: 'card-bar' });

    for (const slot of state.players[0].cards) {
      const card = getCard(slot.cardId);
      if (card.type === 'fortress' || (card.type === 'civilian' && card.deckPoints === 0 && card.unitId?.includes('worker'))) {
        // Fortress is auto-played; the basic worker is trained from the keep panel.
      }
      if (card.type === 'fortress') continue;

      const cost = card.unitId ? getUnit(card.unitId).cost : card.buildingId ? getBuilding(card.buildingId).cost : card.cost ?? {};
      const tile = el('div', { className: 'card-tile', title: `${card.name} — ${card.description}` });
      const cdOverlay = el('div', { className: 'card-cd' });
      const reason = el('div', { className: 'card-reason' });
      tile.append(
        el('div', { className: 'card-icon', text: icon(card.icon) }),
        el('div', { className: 'card-name', text: card.name }),
        el('div', { className: 'card-cost', text: costText(cost) }),
        cdOverlay,
        reason,
      );
      tile.addEventListener('click', () => onClick(card));
      this.tiles.set(card.id, { tile, cdOverlay, reason });
      this.root.append(tile);
    }
  }

  setSelected(cardId: string | null): void {
    this.selectedCardId = cardId;
    for (const [id, { tile }] of this.tiles) {
      tile.classList.toggle('selected', id === cardId);
    }
  }

  update(): void {
    const p = this.state.players[0];
    for (const slot of p.cards) {
      const entry = this.tiles.get(slot.cardId);
      if (!entry) continue;
      const card = getCard(slot.cardId);
      const error = cardAvailability(this.state, 0, card);
      entry.tile.classList.toggle('disabled', error !== null);
      if (slot.cooldownTicks > 0) {
        const card2 = getCard(slot.cardId);
        const total = (card2.cooldownSecs ?? 1) * 10;
        entry.cdOverlay.style.height = `${Math.min(100, (slot.cooldownTicks / total) * 100)}%`;
      } else {
        entry.cdOverlay.style.height = '0%';
      }
      entry.reason.textContent = error && !error.includes('resources') ? error : '';
    }
  }
}
