import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import { getCard } from '@/data/cards';
import type { Card } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { cardAvailability } from '@/sim/systems/CardSystem';
import { ageLabel, cardCost, costText, RARITY_COLORS } from '@/ui/cards/CardFace';
import { attachCardHover } from '@/ui/cards/CardHover';
import { buildCardModel, spinnerHub } from '@/ui/cards/cardModels';

export type CardClickHandler = (card: Card) => void;

/**
 * The card bar (GDD §14.3): the player's whole deck as clickable cards with
 * availability states — available / disabled (cost) / cooldown / locked (tier).
 */
/**
 * Keys bound to card-bar slots, in bar order — left-hand reachable so opening
 * builds don't need a glance down.
 *
 * Deliberately excludes S and H (stop / hold position) and R (rotate the
 * building ghost). Overloading those by context would mean the same key doing
 * different things depending on what happened to be selected, which is worse
 * than a slightly less tidy alphabet.
 */
export const CARD_HOTKEYS = ['Q', 'W', 'E', 'T', 'A', 'D', 'F', 'G', 'Z', 'X', 'C', 'V'];

export class CardBar {
  readonly root: HTMLElement;
  private state: MatchState;
  private tiles = new Map<string, { tile: HTMLElement; cdOverlay: HTMLElement; reason: HTMLElement }>();
  private disposers: (() => void)[] = [];
  /** Card ids in visual bar order, so hotkeys line up with what's on screen. */
  private order: string[] = [];
  private onClick: CardClickHandler;
  selectedCardId: string | null = null;

  constructor(state: MatchState, onClick: CardClickHandler) {
    this.state = state;
    this.onClick = onClick;
    this.root = el('div', { className: 'card-bar' });

    for (const slot of state.players[0].cards) {
      const card = getCard(slot.cardId);
      if (card.type === 'fortress' || (card.type === 'civilian' && card.deckPoints === 0 && card.unitId?.includes('worker'))) {
        // Fortress is auto-played; the basic worker is trained from the keep panel.
      }
      if (card.type === 'fortress') continue;

      const tile = el('div', { className: 'card-tile' });
      tile.style.setProperty('--rarity', RARITY_COLORS[card.rarity] ?? '#a8a8a8');
      const cdOverlay = el('div', { className: 'card-cd' });
      const reason = el('div', { className: 'card-reason' });
      const art = el('div', { className: 'card-art-window' });
      const model = buildCardModel(card, state.players[0].faction.id);
      if (model) {
        const canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 150;
        canvas.className = 'card-art-canvas';
        art.append(canvas);
        this.disposers.push(spinnerHub.register(canvas, model, { speed: 0.34, bob: card.unitId !== undefined }));
      } else {
        art.append(el('div', { className: 'card-icon', html: icon(card.icon) }));
      }
      art.append(el('div', { className: 'card-age-badge', text: ageLabel(card).replace('Age ', '') }));
      const hotkey = CARD_HOTKEYS[this.order.length];
      tile.append(
        el('div', { className: 'card-rarity-strip' }),
        art,
        el('div', { className: 'card-name', text: card.name }),
        el('div', { className: 'card-cost', html: costText(cardCost(card)) }),
        cdOverlay,
        reason,
      );
      if (hotkey) tile.append(el('div', { className: 'card-hotkey', text: hotkey }));
      this.order.push(card.id);
      tile.addEventListener('click', () => onClick(card));
      // Linger on a card to inspect the full detail card (3D model + stats).
      attachCardHover(tile, () => card);
      this.tiles.set(card.id, { tile, cdOverlay, reason });
      this.root.append(tile);
    }
  }

  /**
   * Fire the slot bound to `key` (e.g. 'Q'), exactly as if it were clicked.
   * Returns false when nothing is bound there.
   */
  activateHotkey(key: string): boolean {
    const index = CARD_HOTKEYS.indexOf(key);
    const cardId = index >= 0 ? this.order[index] : undefined;
    if (!cardId) return false;
    this.onClick(getCard(cardId));
    return true;
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

  dispose(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
  }
}
