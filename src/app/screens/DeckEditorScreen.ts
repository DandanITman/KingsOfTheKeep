import { el, button, selectInput } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { icon } from '@/ui/icons';
import { saveStore } from '@/core/save/SaveStore';
import { getCard } from '@/data/cards';
import { checkDeck, factionCards } from '@/data/deckValidation';
import { getStarterDeck, STARTER_DECKS } from '@/data/starterDecks';
import { factionList } from '@/data/factions';
import { DECK_MAX_CARDS, DECK_MAX_POINTS, type Card, type CardType, type Deck, type FactionId } from '@/data/types';
import type { Screen, ScreenManager } from '../ScreenManager';

const TYPE_FILTERS: { value: CardType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'fortress', label: 'Fortress' },
  { value: 'civilian', label: 'Civilians' },
  { value: 'economyBuilding', label: 'Economy' },
  { value: 'militaryBuilding', label: 'Military Bldgs' },
  { value: 'upgradeBuilding', label: 'Upgrade Bldgs' },
  { value: 'unit', label: 'Units' },
  { value: 'defense', label: 'Defenses' },
  { value: 'ability', label: 'Abilities' },
  { value: 'factionPower', label: 'Faction Powers' },
  { value: 'hero', label: 'Heroes' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#a8a8a8',
  uncommon: '#5ad45a',
  rare: '#4a9ae8',
  epic: '#b45ae8',
  legendary: '#e8a33d',
};

export function createDeckEditorScreen(screens: ScreenManager): Screen {
  const root = el('div');
  root.style.cssText =
    'background: radial-gradient(ellipse at 50% 30%, #241c10 0%, #0c0a08 70%); justify-content: flex-start; padding-top: 20px;';

  let faction: FactionId = 'european';
  let deck: Deck = newDeck(faction);
  let typeFilter: CardType | 'all' = 'all';

  function newDeck(f: FactionId): Deck {
    const starter = STARTER_DECKS[f];
    return {
      id: `deck_${Date.now()}`,
      name: 'New Deck',
      faction: f,
      cardIds: starter ? [starter.cardIds[0]] : [],
    };
  }

  const title = el('div', { className: 'screen-title', text: 'Deck Editor' });
  title.style.fontSize = '30px';
  title.style.marginBottom = '8px';

  // --- toolbar ---
  const toolbar = el('div');
  toolbar.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;justify-content:center;';

  const factionSelect = selectInput(
    factionList().map((f) => ({ value: f.id as FactionId, label: f.name })),
    faction,
    (v) => {
      faction = v;
      deck = newDeck(v);
      refreshDeckSelect();
      renderAll();
    },
  );

  const deckSelect = document.createElement('select');
  deckSelect.addEventListener('change', () => {
    const found = saveStore.data.decks.find((d) => d.id === deckSelect.value);
    if (deckSelect.value === '__new') {
      deck = newDeck(faction);
    } else if (deckSelect.value === '__starter') {
      // Copy the starter as a template.
      const starter = getStarterDeck(faction);
      deck = { id: `deck_${Date.now()}`, name: `${starter.name} (copy)`, faction, cardIds: [...starter.cardIds] };
    } else if (found) {
      deck = { ...found, cardIds: [...found.cardIds] };
    }
    renderAll();
  });

  function refreshDeckSelect(): void {
    deckSelect.innerHTML = '';
    const optNew = document.createElement('option');
    optNew.value = '__new';
    optNew.textContent = '— New Deck —';
    deckSelect.append(optNew);
    if (STARTER_DECKS[faction]) {
      const optStarter = document.createElement('option');
      optStarter.value = '__starter';
      optStarter.textContent = 'Copy Starter Deck';
      deckSelect.append(optStarter);
    }
    for (const d of saveStore.data.decks.filter((d) => d.faction === faction)) {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.name;
      deckSelect.append(o);
    }
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 24;
  nameInput.addEventListener('input', () => (deck.name = nameInput.value));

  const filterSelect = selectInput(TYPE_FILTERS, 'all', (v) => {
    typeFilter = v as CardType | 'all';
    renderCollection();
  });

  toolbar.append(factionSelect, deckSelect, nameInput, filterSelect);

  // --- main layout ---
  const layout = el('div');
  layout.style.cssText = 'display:flex;gap:14px;width:min(1180px,96vw);height:62vh;';

  const collectionPanel = el('div', { className: 'panel' });
  collectionPanel.style.cssText += 'flex:1.6;overflow-y:auto;padding:10px;';
  const collectionGrid = el('div');
  collectionGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;';
  collectionPanel.append(collectionGrid);

  const deckPanel = el('div', { className: 'panel' });
  deckPanel.style.cssText += 'flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;';
  const meter = el('div');
  meter.style.cssText = 'font-size:14px;margin-bottom:6px;';
  const checklist = el('div');
  checklist.style.cssText = 'font-size:11px;color:#a89468;margin-bottom:8px;line-height:1.6;';
  const deckList = el('div');
  deckList.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:3px;';
  deckPanel.append(meter, checklist, deckList);

  layout.append(collectionPanel, deckPanel);

  // --- actions ---
  const actions = el('div');
  actions.style.cssText = 'display:flex;gap:10px;margin-top:12px;';
  const saveBtn = button('Save Deck', () => {
    const check = checkDeck(deck);
    if (!check.valid) {
      showModal('Deck Incomplete', check.errors.join(' '), [{ label: 'OK', primary: true }]);
      return;
    }
    deck.name = nameInput.value.trim() || 'Unnamed Deck';
    const existing = saveStore.data.decks.findIndex((d) => d.id === deck.id);
    if (existing >= 0) saveStore.data.decks[existing] = { ...deck, cardIds: [...deck.cardIds] };
    else saveStore.data.decks.push({ ...deck, cardIds: [...deck.cardIds] });
    saveStore.save();
    refreshDeckSelect();
    deckSelect.value = deck.id;
    showModal('Deck Saved', `"${deck.name}" is ready for battle.`, [{ label: 'OK', primary: true }]);
  }, 'btn small primary');
  const deleteBtn = button('Delete Deck', () => {
    const idx = saveStore.data.decks.findIndex((d) => d.id === deck.id);
    if (idx >= 0) {
      saveStore.data.decks.splice(idx, 1);
      saveStore.save();
    }
    deck = newDeck(faction);
    refreshDeckSelect();
    renderAll();
  }, 'btn small danger');
  actions.append(saveBtn, deleteBtn, button('Back', () => screens.show('mainMenu'), 'btn small'));

  root.append(title, toolbar, layout, actions);

  // --- rendering ---

  function cardTile(card: Card, inDeck: boolean, owned: boolean): HTMLElement {
    const tile = el('div');
    tile.style.cssText = `border:2px solid ${inDeck ? 'var(--gold)' : RARITY_COLORS[card.rarity]};border-radius:8px;
      padding:6px 8px;cursor:${owned ? 'pointer' : 'not-allowed'};background:#241b10;position:relative;
      ${owned ? '' : 'filter:grayscale(0.9) brightness(0.55);'}`;
    tile.title = `${card.description}${card.requirements?.tier ? ` (Tier ${card.requirements.tier})` : ''}`;
    const header = el('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    header.append(
      el('span', { text: `${icon(card.icon)} ${card.name}` }),
      el('span', { text: String(card.deckPoints), title: 'Deck points' }),
    );
    (header.lastChild as HTMLElement).style.cssText =
      'background:var(--gold-dim);color:#1a1410;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;';
    const sub = el('div', { text: `${card.rarity} · ${card.type}` });
    sub.style.cssText = `font-size:10px;color:${RARITY_COLORS[card.rarity]};margin-top:2px;`;
    tile.append(header, sub);
    return tile;
  }

  function renderCollection(): void {
    collectionGrid.innerHTML = '';
    const collection = saveStore.data.collection;
    for (const card of factionCards(faction)) {
      if (typeFilter !== 'all' && card.type !== typeFilter) continue;
      const owned = (collection[card.id] ?? 0) > 0;
      const inDeck = deck.cardIds.includes(card.id);
      const tile = cardTile(card, inDeck, owned);
      if (owned) {
        tile.addEventListener('click', () => {
          if (inDeck) {
            deck.cardIds = deck.cardIds.filter((id) => id !== card.id);
          } else {
            if (deck.cardIds.length >= DECK_MAX_CARDS) return;
            if (card.type === 'fortress') {
              // Replace any existing fortress.
              deck.cardIds = deck.cardIds.filter((id) => getCard(id).type !== 'fortress');
            }
            deck.cardIds.push(card.id);
          }
          renderAll();
        });
      }
      collectionGrid.append(tile);
    }
  }

  function renderDeck(): void {
    const check = checkDeck(deck);
    meter.innerHTML = `<b style="color:${check.points > DECK_MAX_POINTS ? '#e88' : 'var(--gold)'}">${check.points}/${DECK_MAX_POINTS} points</b>
      · ${check.cardCount}/${DECK_MAX_CARDS} cards`;
    checklist.innerHTML = check.slots
      .map((slot) => `${slot.have >= slot.need ? '✓' : '✗'} ${slot.label} (${slot.have}/${slot.need})`)
      .join(' &nbsp; ');
    deckList.innerHTML = '';
    for (const id of deck.cardIds) {
      const card = getCard(id);
      const row = el('div');
      row.style.cssText = 'display:flex;justify-content:space-between;background:#2c2113;border-radius:5px;padding:4px 8px;cursor:pointer;font-size:13px;';
      row.append(el('span', { text: `${icon(card.icon)} ${card.name}` }), el('span', { text: `${card.deckPoints}pt` }));
      row.title = 'Click to remove';
      row.addEventListener('click', () => {
        deck.cardIds = deck.cardIds.filter((cid) => cid !== id);
        renderAll();
      });
      deckList.append(row);
    }
  }

  function renderAll(): void {
    nameInput.value = deck.name;
    renderCollection();
    renderDeck();
  }

  refreshDeckSelect();
  renderAll();

  return {
    root,
    onShow() {
      refreshDeckSelect();
      renderAll();
    },
  };
}
