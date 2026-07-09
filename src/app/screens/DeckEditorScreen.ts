import { el, button, selectInput } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import { getCard } from '@/data/cards';
import { checkDeck, factionCards } from '@/data/deckValidation';
import { getStarterDeck, STARTER_DECKS } from '@/data/starterDecks';
import { factionList } from '@/data/factions';
import { DECK_MAX_CARDS, DECK_MAX_POINTS, type Card, type CardType, type Deck, type FactionId, type Tier } from '@/data/types';
import { buildCardFace, cardAge, RARITY_COLORS } from '@/ui/cards/CardFace';
import { attachCardHover, hideCardPopup } from '@/ui/cards/CardHover';
import type { Screen, ScreenManager } from '../ScreenManager';

const TYPE_FILTERS: { value: CardType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fortress', label: 'Fortress' },
  { value: 'civilian', label: 'Civilians' },
  { value: 'economyBuilding', label: 'Economy' },
  { value: 'militaryBuilding', label: 'Military Bldgs' },
  { value: 'upgradeBuilding', label: 'Upgrade Bldgs' },
  { value: 'unit', label: 'Units' },
  { value: 'defense', label: 'Defenses' },
  { value: 'ability', label: 'Abilities' },
  { value: 'factionPower', label: 'Powers' },
  { value: 'hero', label: 'Heroes' },
];

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

type SortKey = 'age' | 'points' | 'rarity' | 'name' | 'type';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'age', label: 'Sort: Age' },
  { value: 'type', label: 'Sort: Category' },
  { value: 'points', label: 'Sort: Deck Points' },
  { value: 'rarity', label: 'Sort: Rarity' },
  { value: 'name', label: 'Sort: Name' },
];

export function createDeckEditorScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'royal-screen' });
  root.style.cssText = 'justify-content: flex-start; padding-top: 18px;';

  let faction: FactionId = 'european';
  let deck: Deck = newDeck(faction);
  let typeFilter: CardType | 'all' = 'all';
  let ageFilter: Tier | 0 = 0;
  let sortKey: SortKey = 'age';
  /** Spinner canvases from the last collection render. */
  let tileDisposers: (() => void)[] = [];

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
  title.style.cssText += 'font-size:30px;margin-bottom:8px;';

  // --- toolbar ---
  const toolbar = el('div', { className: 'deck-editor-toolbar' });

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

  const sortSelect = selectInput(SORTS, sortKey, (v) => {
    sortKey = v;
    renderCollection();
  });

  toolbar.append(factionSelect, deckSelect, nameInput, sortSelect);

  // --- filters (category chips + age chips) ---
  const filters = el('div', { className: 'collection-filters' });
  const typeChips = new Map<CardType | 'all', HTMLElement>();
  for (const f of TYPE_FILTERS) {
    const chip = el('button', { className: 'filter-chip', text: f.label });
    chip.addEventListener('click', () => {
      typeFilter = f.value;
      for (const [v, c] of typeChips) c.classList.toggle('active', v === typeFilter);
      renderCollection();
    });
    typeChips.set(f.value, chip);
    filters.append(chip);
  }
  typeChips.get('all')!.classList.add('active');

  const ageFilters = el('div', { className: 'collection-filters' });
  const ageChips = new Map<Tier | 0, HTMLElement>();
  for (const a of [0, 1, 2, 3, 4] as (Tier | 0)[]) {
    const chip = el('button', { className: 'filter-chip', text: a === 0 ? 'All Ages' : `Age ${['', 'I', 'II', 'III', 'IV'][a]}` });
    chip.addEventListener('click', () => {
      ageFilter = a;
      for (const [v, c] of ageChips) c.classList.toggle('active', v === ageFilter);
      renderCollection();
    });
    ageChips.set(a, chip);
    ageFilters.append(chip);
  }
  ageChips.get(0)!.classList.add('active');

  // --- main layout ---
  const layout = el('div', { className: 'deck-editor-layout' });

  const collectionPanel = el('div', { className: 'panel' });
  collectionPanel.style.cssText += 'flex:1;overflow-y:auto;padding:12px;min-width:0;';
  const collectionGrid = el('div', { className: 'collection-grid' });
  collectionPanel.append(filters, ageFilters, collectionGrid);

  const deckPanel = el('div', { className: 'panel deck-side' });
  deckPanel.style.cssText += 'padding:12px;';
  const meter = el('div');
  meter.style.cssText = 'font-size:14px;';
  const meterBar = el('div', { className: 'deck-meter-bar' }, [el('div', { className: 'deck-meter-fill' })]);
  const checklist = el('div');
  checklist.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.6;';
  const deckList = el('div');
  deckList.style.cssText = 'flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:4px;';
  deckPanel.append(meter, meterBar, checklist, deckList);

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

  function sortCards(cards: Card[]): Card[] {
    const byName = (a: Card, b: Card): number => a.name.localeCompare(b.name);
    return [...cards].sort((a, b) => {
      switch (sortKey) {
        case 'age': return cardAge(a) - cardAge(b) || a.deckPoints - b.deckPoints || byName(a, b);
        case 'points': return a.deckPoints - b.deckPoints || byName(a, b);
        case 'rarity': return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || byName(a, b);
        case 'type': return a.type.localeCompare(b.type) || cardAge(a) - cardAge(b) || byName(a, b);
        default: return byName(a, b);
      }
    });
  }

  function toggleCard(card: Card): void {
    if (deck.cardIds.includes(card.id)) {
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
  }

  function renderCollection(): void {
    hideCardPopup();
    tileDisposers.forEach((d) => d());
    tileDisposers = [];
    collectionGrid.innerHTML = '';
    const collection = saveStore.data.collection;
    let cards = factionCards(faction);
    if (typeFilter !== 'all') cards = cards.filter((c) => c.type === typeFilter);
    if (ageFilter !== 0) cards = cards.filter((c) => cardAge(c) === ageFilter);
    for (const card of sortCards(cards)) {
      const owned = collection[card.id] ?? 0;
      const face = buildCardFace(card, { size: 'tile', model: true, locked: owned === 0, count: owned });
      tileDisposers.push(face.dispose);
      face.root.classList.toggle('in-deck', deck.cardIds.includes(card.id));
      if (owned > 0) {
        face.root.addEventListener('click', () => toggleCard(card));
      }
      tileDisposers.push(attachCardHover(face.root, () => card));
      collectionGrid.append(face.root);
    }
    if (collectionGrid.children.length === 0) {
      collectionGrid.append(el('div', { text: 'No cards match these filters.' }));
    }
  }

  function renderDeck(): void {
    const check = checkDeck(deck);
    meter.innerHTML = `<b style="color:${check.points > DECK_MAX_POINTS ? '#e88' : 'var(--gold)'}">${check.points}/${DECK_MAX_POINTS} points</b>
      · ${check.cardCount}/${DECK_MAX_CARDS} cards`;
    const fill = meterBar.firstChild as HTMLElement;
    fill.style.width = `${Math.min(100, (check.points / DECK_MAX_POINTS) * 100)}%`;
    fill.classList.toggle('over', check.points > DECK_MAX_POINTS);
    checklist.innerHTML = check.slots
      .map((slot) => `${slot.have >= slot.need ? '✓' : '✗'} ${slot.label} (${slot.have}/${slot.need})`)
      .join(' &nbsp; ');
    deckList.innerHTML = '';
    const cards = deck.cardIds.map((id) => getCard(id));
    cards.sort((a, b) => cardAge(a) - cardAge(b) || a.deckPoints - b.deckPoints || a.name.localeCompare(b.name));
    for (const card of cards) {
      const row = el('div', { className: 'deck-row', title: 'Click to remove' });
      row.style.setProperty('--rarity', RARITY_COLORS[card.rarity] ?? '#a8a8a8');
      row.append(
        el('span', { className: 'deck-row-age', text: ['', 'I', 'II', 'III', 'IV'][cardAge(card)] }),
        el('span', { className: 'deck-row-name', text: card.name }),
        el('span', { className: 'deck-row-pts', text: `${card.deckPoints}pt` }),
      );
      row.addEventListener('click', () => {
        deck.cardIds = deck.cardIds.filter((cid) => cid !== card.id);
        renderAll();
      });
      tileDisposers.push(attachCardHover(row, () => card));
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
    onHide() {
      hideCardPopup();
      tileDisposers.forEach((d) => d());
      tileDisposers = [];
      collectionGrid.innerHTML = '';
    },
  };
}
