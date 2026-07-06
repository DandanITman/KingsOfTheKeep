import { el, button } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { icon } from '@/ui/icons';
import { saveStore } from '@/core/save/SaveStore';
import { CARD_DB } from '@/data/cards';
import { CRAFT_COST, DUST_PER_DUPE, PACK_PRICE, PACK_SIZE } from '@/data/balance';
import type { Card, CardType, FactionId, Rarity } from '@/data/types';
import type { Screen, ScreenManager } from '../ScreenManager';

interface PackDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  filter: (c: Card) => boolean;
}

const PACKS: PackDef[] = [
  { id: 'base', name: 'Base Set Pack', emoji: '🎴', description: 'Any card from the launch set.', filter: () => true },
  { id: 'european', name: 'European Pack', emoji: '🏰', description: 'European faction cards only.', filter: (c) => c.faction === 'european' },
  { id: 'asian', name: 'Asian Pack', emoji: '🏯', description: 'Asian faction cards only.', filter: (c) => c.faction === 'asian' },
  { id: 'african', name: 'African Pack', emoji: '🦁', description: 'African faction cards only.', filter: (c) => c.faction === 'african' },
  { id: 'middleEastern', name: 'Middle Eastern Pack', emoji: '🕌', description: 'Middle Eastern faction cards only.', filter: (c) => c.faction === 'middleEastern' },
  { id: 'economy', name: 'Economy Pack', emoji: '🌾', description: 'Buildings, civilians, and economy cards.', filter: (c) => ['economyBuilding', 'civilian', 'upgradeBuilding'].includes(c.type) },
  { id: 'war', name: 'War Pack', emoji: '⚔️', description: 'Units, siege, and defenses.', filter: (c) => ['unit', 'defense', 'militaryBuilding'].includes(c.type) },
  { id: 'ability', name: 'Ability Pack', emoji: '✨', description: 'Special abilities and faction powers.', filter: (c) => ['ability', 'factionPower'].includes(c.type) },
];

const RARITY_ODDS: [Rarity, number][] = [
  ['common', 0.5],
  ['uncommon', 0.28],
  ['rare', 0.15],
  ['epic', 0.055],
  ['legendary', 0.015],
];

const RARITY_COLORS: Record<string, string> = {
  common: '#a8a8a8',
  uncommon: '#5ad45a',
  rare: '#4a9ae8',
  epic: '#b45ae8',
  legendary: '#e8a33d',
};

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
  const root = el('div');
  root.style.cssText =
    'background: radial-gradient(ellipse at 50% 30%, #2a1c14 0%, #0c0a08 70%); justify-content: flex-start; padding-top: 20px; overflow-y: auto;';

  const title = el('div', { className: 'screen-title', text: 'The Royal Bazaar' });
  title.style.cssText += 'font-size:30px;margin-bottom:4px;';

  const wallet = el('div');
  wallet.style.cssText = 'margin-bottom:14px;font-size:16px;color:var(--gold);';

  function refreshWallet(): void {
    wallet.textContent = `🪙 ${saveStore.data.currency} gold · 🌫 ${saveStore.data.dust} dust`;
  }

  const grid = el('div');
  grid.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:min(1050px,94vw);';

  for (const pack of PACKS) {
    const tile = el('div', { className: 'panel' });
    tile.style.cssText += 'text-align:center;padding:16px;';
    tile.append(
      el('div', { text: pack.emoji }),
      el('div', { text: pack.name }),
      el('div', { text: pack.description }),
      el('div', { text: `${PACK_PRICE} gold · ${PACK_SIZE} cards` }),
    );
    (tile.children[0] as HTMLElement).style.fontSize = '38px';
    (tile.children[1] as HTMLElement).style.cssText = 'font-family:Georgia,serif;color:var(--gold);font-size:17px;margin:4px 0;';
    (tile.children[2] as HTMLElement).style.cssText = 'font-size:12px;color:#a89468;min-height:32px;';
    (tile.children[3] as HTMLElement).style.cssText = 'font-size:12px;margin:6px 0;';
    const buy = button('Buy Pack', () => {
      if (saveStore.data.currency < PACK_PRICE) {
        showModal('Not Enough Gold', 'Win bot matches to earn more gold for packs.', [{ label: 'OK', primary: true }]);
        return;
      }
      saveStore.data.currency -= PACK_PRICE;
      const results = openPack(pack);
      refreshWallet();
      showPackReveal(results);
    }, 'btn small primary');
    tile.append(buy);
    grid.append(tile);
  }

  // Crafting section.
  const craftTitle = el('div', { text: 'Card Crafting' });
  craftTitle.style.cssText = 'font-family:Georgia,serif;color:var(--gold);font-size:20px;margin:20px 0 8px;';
  const craftNote = el('div', {
    text: `Spend dust to craft cards you lack. Costs: common ${CRAFT_COST.common} · uncommon ${CRAFT_COST.uncommon} · rare ${CRAFT_COST.rare} · epic ${CRAFT_COST.epic} · legendary ${CRAFT_COST.legendary}`,
  });
  craftNote.style.cssText = 'font-size:12px;color:#a89468;margin-bottom:8px;text-align:center;max-width:600px;';
  const craftGrid = el('div');
  craftGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;width:min(1050px,94vw);justify-content:center;margin-bottom:20px;';

  function refreshCraft(): void {
    craftGrid.innerHTML = '';
    const missing = [...CARD_DB.values()].filter(
      (c) => !(saveStore.data.collection[c.id] ?? 0) && c.type !== 'fortress' && c.deckPoints > 0,
    );
    for (const card of missing.slice(0, 40)) {
      const cost = CRAFT_COST[card.rarity] ?? 20;
      const b = button(`${icon(card.icon)} ${card.name} (${cost})`, () => {
        if (saveStore.data.dust < cost) {
          showModal('Not Enough Dust', 'Open packs — duplicate cards turn into crafting dust.', [{ label: 'OK', primary: true }]);
          return;
        }
        saveStore.data.dust -= cost;
        saveStore.data.collection[card.id] = 1;
        saveStore.save();
        refreshWallet();
        refreshCraft();
      }, 'btn small');
      b.style.cssText += `font-size:11px;border-color:${RARITY_COLORS[card.rarity]};`;
      craftGrid.append(b);
    }
    if (missing.length === 0) {
      craftGrid.append(el('div', { text: 'Your collection is complete, Commander.' }));
    }
  }

  function showPackReveal(results: { card: Card; isDupe: boolean; dust: number }[]): void {
    const backdrop = el('div', { className: 'modal-backdrop' });
    const modal = el('div', { className: 'modal' });
    modal.style.maxWidth = '640px';
    modal.append(el('h2', { text: 'Pack Opened!' }));
    const row = el('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;margin:10px 0 18px;';
    results.forEach((res, i) => {
      const card = el('div');
      card.style.cssText = `width:100px;height:130px;border:2px solid ${RARITY_COLORS[res.card.rarity]};border-radius:10px;
        background:#241b10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;
        opacity:0;transform:rotateY(90deg);transition:all 0.4s ease ${i * 0.18}s;`;
      card.innerHTML = `<div style="font-size:30px">${icon(res.card.icon)}</div>
        <div style="font-size:11px;text-align:center;margin-top:6px">${res.card.name}</div>
        <div style="font-size:9px;color:${RARITY_COLORS[res.card.rarity]};margin-top:3px">${res.card.rarity}</div>
        ${res.isDupe ? `<div style="font-size:9px;color:#8af">+${res.dust} dust</div>` : ''}`;
      row.append(card);
      window.setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'rotateY(0deg)';
      }, 50);
    });
    modal.append(row, button('Splendid!', () => { backdrop.remove(); refreshCraft(); }, 'btn small primary'));
    backdrop.append(modal);
    document.body.append(backdrop);
  }

  const back = button('Back', () => screens.show('mainMenu'));
  back.style.marginBottom = '30px';

  root.append(title, wallet, grid, craftTitle, craftNote, craftGrid, back);

  return {
    root,
    onShow() {
      refreshWallet();
      refreshCraft();
    },
  };
}
