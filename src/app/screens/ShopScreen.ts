import { el, button } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import { CARD_DB } from '@/data/cards';
import { CRAFT_COST, DUST_PER_DUPE, PACK_PRICE, PACK_SIZE } from '@/data/balance';
import type { Card, CardType, Rarity, Tier } from '@/data/types';
import { buildCardFace, cardAge } from '@/ui/cards/CardFace';
import { attachCardHover, hideCardPopup } from '@/ui/cards/CardHover';
import { buildPackModel, spinnerHub } from '@/ui/cards/cardModels';
import type { Screen, ScreenManager } from '../ScreenManager';

interface PackDef {
  id: string;
  name: string;
  description: string;
  color: number;
  accent: number;
  filter: (c: Card) => boolean;
}

const PACKS: PackDef[] = [
  { id: 'base', name: 'Base Set Pack', description: 'Any card from the launch set.', color: 0x2a6db5, accent: 0xf6c84b, filter: () => true },
  { id: 'european', name: 'European Pack', description: 'European faction cards only.', color: 0x1c4f8a, accent: 0xc8d0da, filter: (c) => c.faction === 'european' },
  { id: 'asian', name: 'Asian Pack', description: 'Asian faction cards only.', color: 0x9a2a2a, accent: 0xf0d060, filter: (c) => c.faction === 'asian' },
  { id: 'african', name: 'African Pack', description: 'African faction cards only.', color: 0xb5651d, accent: 0x64d46a, filter: (c) => c.faction === 'african' },
  { id: 'middleEastern', name: 'Middle Eastern Pack', description: 'Middle Eastern faction cards only.', color: 0x2a8a7a, accent: 0xe8c46a, filter: (c) => c.faction === 'middleEastern' },
  { id: 'economy', name: 'Economy Pack', description: 'Buildings, civilians, and economy cards.', color: 0x4a7a2a, accent: 0xffe89a, filter: (c) => ['economyBuilding', 'civilian', 'upgradeBuilding'].includes(c.type) },
  { id: 'war', name: 'War Pack', description: 'Units, siege, and defenses.', color: 0x8a1c14, accent: 0x9aa2ad, filter: (c) => ['unit', 'defense', 'militaryBuilding'].includes(c.type) },
  { id: 'ability', name: 'Ability Pack', description: 'Special abilities and faction powers.', color: 0x5a2a9a, accent: 0x8ac6ff, filter: (c) => ['ability', 'factionPower'].includes(c.type) },
];

const RARITY_ODDS: [Rarity, number][] = [
  ['common', 0.5],
  ['uncommon', 0.28],
  ['rare', 0.15],
  ['epic', 0.055],
  ['legendary', 0.015],
];

const CRAFT_FACTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Factions' },
  { value: 'european', label: 'European' },
  { value: 'asian', label: 'Asian' },
  { value: 'african', label: 'African' },
  { value: 'middleEastern', label: 'Middle Eastern' },
  { value: 'neutral', label: 'Neutral' },
];

const CRAFT_TYPES: { value: CardType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
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

const CRAFT_RARITIES: { value: Rarity | 'all'; label: string }[] = [
  { value: 'all', label: 'Any Rarity' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
];

function rollRarity(): Rarity {
  let roll = Math.random();
  for (const [rarity, odds] of RARITY_ODDS) {
    if (roll < odds) return rarity;
    roll -= odds;
  }
  return 'common';
}

function openPack(pack: PackDef): { card: Card; isDupe: boolean; dust: number }[] {
  const pool = [...CARD_DB.values()].filter((c) => pack.filter(c) && c.type !== 'fortress' && c.deckPoints > 0);
  const results: { card: Card; isDupe: boolean; dust: number }[] = [];
  const save = saveStore.data;
  for (let i = 0; i < PACK_SIZE; i++) {
    const rarity = rollRarity();
    // Pick from the rolled rarity, falling back to any.
    let candidates = pool.filter((c) => c.rarity === rarity);
    if (candidates.length === 0) candidates = pool;
    const card = candidates[Math.floor(Math.random() * candidates.length)];
    const owned = save.collection[card.id] ?? 0;
    if (owned >= 2) {
      const dust = DUST_PER_DUPE[card.rarity] ?? 5;
      save.dust += dust;
      results.push({ card, isDupe: true, dust });
    } else {
      save.collection[card.id] = owned + 1;
      results.push({ card, isDupe: false, dust: 0 });
    }
  }
  save.stats.packsOpened++;
  saveStore.save();
  return results;
}

export function createShopScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'royal-screen' });
  root.style.cssText = 'justify-content: flex-start; padding-top: 18px;';

  let tab: 'packs' | 'crafting' = 'packs';
  let craftFaction = 'all';
  let craftType: CardType | 'all' = 'all';
  let craftRarity: Rarity | 'all' = 'all';
  let disposers: (() => void)[] = [];

  const title = el('div', { className: 'screen-title', text: 'The Royal Bazaar' });
  title.style.cssText += 'font-size:30px;margin-bottom:4px;';

  const wallet = el('div');
  wallet.style.cssText = 'margin-bottom:12px;font-size:16px;color:var(--gold);';

  function refreshWallet(): void {
    wallet.textContent = `🪙 ${saveStore.data.currency} gold · 🌫 ${saveStore.data.dust} dust`;
  }

  // --- tabs ---
  const tabs = el('div', { className: 'shop-tabs' });
  const packsTab = el('button', { className: 'shop-tab active', text: '🎴 Card Packs' });
  const craftTab = el('button', { className: 'shop-tab', text: '⚗️ Crafting' });
  packsTab.addEventListener('click', () => setTab('packs'));
  craftTab.addEventListener('click', () => setTab('crafting'));
  tabs.append(packsTab, craftTab);

  const content = el('div', { className: 'shop-scroll' });
  content.style.cssText += 'display:flex;flex-direction:column;align-items:center;';

  function setTab(t: 'packs' | 'crafting'): void {
    tab = t;
    packsTab.classList.toggle('active', t === 'packs');
    craftTab.classList.toggle('active', t === 'crafting');
    renderTab();
  }

  function clearContent(): void {
    hideCardPopup();
    disposers.forEach((d) => d());
    disposers = [];
    content.innerHTML = '';
  }

  function renderTab(): void {
    clearContent();
    if (tab === 'packs') renderPacks();
    else renderCrafting();
  }

  // --- packs menu ---
  function renderPacks(): void {
    const note = el('div', {
      text: `Each pack holds ${PACK_SIZE} cards. Duplicates beyond two copies melt into crafting dust.`,
    });
    note.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:12px;text-align:center;';
    const grid = el('div', { className: 'pack-grid' });
    for (const pack of PACKS) {
      const tile = el('div', { className: 'pack-tile' });
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      canvas.className = 'pack-canvas';
      // Floating, glinting booster pack.
      disposers.push(spinnerHub.register(canvas, buildPackModel(pack.color, pack.accent), { speed: 0.7, bob: true }));
      const buy = button(`Buy — 🪙 ${PACK_PRICE}`, () => {
        if (saveStore.data.currency < PACK_PRICE) {
          showModal('Not Enough Gold', 'Win bot matches to earn more gold for packs.', [{ label: 'OK', primary: true }]);
          return;
        }
        saveStore.data.currency -= PACK_PRICE;
        const results = openPack(pack);
        refreshWallet();
        showPackReveal(results);
      }, 'btn small primary');
      tile.append(
        canvas,
        el('div', { className: 'pack-name', text: pack.name }),
        el('div', { className: 'pack-desc', text: pack.description }),
        el('div', { className: 'pack-price', text: `${PACK_SIZE} cards per pack` }),
        buy,
      );
      grid.append(tile);
    }
    content.append(note, grid);
  }

  // --- crafting menu ---
  function renderCrafting(): void {
    const note = el('div', {
      text: `Spend dust to craft cards you lack. Costs: common ${CRAFT_COST.common} · uncommon ${CRAFT_COST.uncommon} · rare ${CRAFT_COST.rare} · epic ${CRAFT_COST.epic} · legendary ${CRAFT_COST.legendary}`,
    });
    note.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px;text-align:center;max-width:640px;';

    // Category chips.
    const makeChips = <T extends string>(
      options: { value: T; label: string }[],
      get: () => T,
      set: (v: T) => void,
    ): HTMLElement => {
      const row = el('div', { className: 'collection-filters' });
      row.style.justifyContent = 'center';
      const chips = new Map<T, HTMLElement>();
      for (const o of options) {
        const chip = el('button', { className: 'filter-chip', text: o.label });
        chip.classList.toggle('active', o.value === get());
        chip.addEventListener('click', () => {
          set(o.value);
          for (const [v, c] of chips) c.classList.toggle('active', v === get());
          renderCraftGrid();
        });
        chips.set(o.value, chip);
        row.append(chip);
      }
      return row;
    };

    const factionRow = makeChips(CRAFT_FACTIONS.map((f) => ({ value: f.value, label: f.label })), () => craftFaction, (v) => (craftFaction = v));
    const typeRow = makeChips(CRAFT_TYPES.map((t) => ({ value: t.value as string, label: t.label })), () => craftType as string, (v) => (craftType = v as CardType | 'all'));
    const rarityRow = makeChips(CRAFT_RARITIES.map((r) => ({ value: r.value as string, label: r.label })), () => craftRarity as string, (v) => (craftRarity = v as Rarity | 'all'));

    const grid = el('div', { className: 'craft-grid' });
    let gridDisposers: (() => void)[] = [];
    disposers.push(() => gridDisposers.forEach((d) => d()));

    function renderCraftGrid(): void {
      hideCardPopup();
      gridDisposers.forEach((d) => d());
      gridDisposers = [];
      grid.innerHTML = '';
      const missing = [...CARD_DB.values()].filter(
        (c) =>
          !(saveStore.data.collection[c.id] ?? 0) &&
          c.type !== 'fortress' &&
          c.deckPoints > 0 &&
          (craftFaction === 'all' || c.faction === craftFaction) &&
          (craftType === 'all' || c.type === craftType) &&
          (craftRarity === 'all' || c.rarity === craftRarity),
      );
      missing.sort((a, b) => cardAge(a) - cardAge(b) || a.name.localeCompare(b.name));
      for (const card of missing.slice(0, 60)) {
        const cost = CRAFT_COST[card.rarity] ?? 20;
        const wrap = el('div');
        const face = buildCardFace(card, { size: 'tile', model: true });
        gridDisposers.push(face.dispose, attachCardHover(face.root, () => card));
        const craftBtn = button(`Craft 🌫 ${cost}`, () => {
          if (saveStore.data.dust < cost) {
            showModal('Not Enough Dust', 'Open packs — duplicate cards turn into crafting dust.', [{ label: 'OK', primary: true }]);
            return;
          }
          saveStore.data.dust -= cost;
          saveStore.data.collection[card.id] = 1;
          saveStore.save();
          refreshWallet();
          renderCraftGrid();
        }, 'btn small');
        craftBtn.style.cssText += 'width:100%;font-size:12px;margin-top:4px;padding:4px 6px;';
        wrap.append(face.root, craftBtn);
        grid.append(wrap);
      }
      if (missing.length === 0) {
        grid.append(el('div', { text: 'Nothing left to craft here — your collection is complete, Commander.' }));
      } else if (missing.length > 60) {
        grid.append(el('div', { text: `…and ${missing.length - 60} more. Narrow the filters to see them.` }));
      }
    }

    renderCraftGrid();
    content.append(note, factionRow, typeRow, rarityRow, grid);
  }

  // --- pack reveal ---
  function showPackReveal(results: { card: Card; isDupe: boolean; dust: number }[]): void {
    const backdrop = el('div', { className: 'modal-backdrop' });
    const modal = el('div', { className: 'modal' });
    modal.style.maxWidth = '760px';
    modal.append(el('h2', { text: 'Pack Opened!' }));
    const row = el('div', { className: 'reveal-row' });
    const revealDisposers: (() => void)[] = [];
    results.forEach((res, i) => {
      const slot = el('div', { className: 'reveal-card' });
      const face = buildCardFace(res.card, { size: 'tile', model: true });
      revealDisposers.push(face.dispose, attachCardHover(face.root, () => res.card));
      slot.append(face.root);
      if (res.isDupe) slot.append(el('div', { className: 'reveal-dust', text: `duplicate → +${res.dust} dust` }));
      row.append(slot);
      window.setTimeout(() => slot.classList.add('flipped'), 120 + i * 180);
    });
    modal.append(row, button('Splendid!', () => {
      hideCardPopup();
      revealDisposers.forEach((d) => d());
      backdrop.remove();
      if (tab === 'crafting') renderTab();
    }, 'btn small primary'));
    backdrop.append(modal);
    document.body.append(backdrop);
  }

  const back = button('Back', () => screens.show('mainMenu'), 'btn small');
  back.style.cssText += 'margin:10px 0 16px;';

  root.append(title, wallet, tabs, content, back);
  renderTab();

  return {
    root,
    onShow() {
      refreshWallet();
      renderTab();
    },
    onHide() {
      clearContent();
    },
  };
}
