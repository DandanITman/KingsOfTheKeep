/**
 * Physical playing-card faces shared by the deck editor, shop, and match HUD.
 * A card face shows name, age, art (3D spinner or icon glyph), type line,
 * stats, description, and cost — sized as a grid 'tile' or a 'detail' card
 * for hover popups.
 */

import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import { getUnit } from '@/data/units';
import { getBuilding } from '@/data/buildings';
import type { Card, CardType, Cost, Tier } from '@/data/types';
import { buildCardModel, spinnerHub } from './cardModels';

export const RARITY_COLORS: Record<string, string> = {
  common: '#a8a8a8',
  uncommon: '#5ad45a',
  rare: '#4a9ae8',
  epic: '#b45ae8',
  legendary: '#e8a33d',
};

export const TYPE_LABELS: Record<CardType, string> = {
  fortress: 'Fortress',
  civilian: 'Civilian',
  economyBuilding: 'Economy Building',
  militaryBuilding: 'Military Building',
  upgradeBuilding: 'Upgrade Building',
  unit: 'Unit',
  defense: 'Defense',
  ability: 'Ability',
  factionPower: 'Faction Power',
  hero: 'Hero',
};

export const FACTION_LABELS: Record<string, string> = {
  european: 'European',
  asian: 'Asian',
  african: 'African',
  middleEastern: 'Middle Eastern',
  neutral: 'Neutral',
};

const COST_ICON_KEYS: Record<string, string> = { food: 'food', wood: 'wood', stone: 'stone', gold: 'goldRes', influence: 'influence' };
const AGE_NUMERALS: Record<Tier, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/** The age (tier) a card unlocks at. */
export function cardAge(card: Card): Tier {
  return card.requirements?.tier ?? 1;
}

export function ageLabel(card: Card): string {
  return `Age ${AGE_NUMERALS[cardAge(card)]}`;
}

/** Play cost of a card (unit/building costs live on their defs). */
export function cardCost(card: Card): Cost {
  if (card.unitId) return getUnit(card.unitId).cost;
  if (card.buildingId) return getBuilding(card.buildingId).cost;
  return card.cost ?? {};
}

export function costText(cost: Cost): string {
  return Object.entries(cost)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${icon(COST_ICON_KEYS[k] ?? k)}${v}`)
    .join('  ');
}

interface StatChip {
  icon: string;
  label: string;
  value: string;
}

/** Exact numbers for what the card does — shown on detail cards. */
export function cardStats(card: Card): StatChip[] {
  const stats: StatChip[] = [];
  if (card.unitId) {
    const u = getUnit(card.unitId);
    stats.push({ icon: icon('health'), label: 'Health', value: String(u.hp) });
    stats.push({
      icon: icon('sword'),
      label: 'Damage',
      value: `${u.damage}${u.bonusVsBuildings ? ` (×${u.bonusVsBuildings} vs bldg)` : ''}`,
    });
    stats.push({ icon: icon('shield'), label: 'Armor', value: `${u.armor} / ${u.pierceArmor}` });
    stats.push({ icon: icon('range'), label: 'Range', value: u.range > 0.9 ? String(u.range) : 'Melee' });
    stats.push({ icon: icon('boots'), label: 'Speed', value: String(u.speed) });
    stats.push({ icon: icon('time'), label: 'Train', value: `${u.trainSecs}s` });
    stats.push({ icon: icon('command'), label: 'Command', value: String(u.commandCost) });
    if (u.splash) stats.push({ icon: icon('splash'), label: 'Splash', value: String(u.splash) });
    if (u.healPerSec) stats.push({ icon: icon('heal'), label: 'Heal', value: `${u.healPerSec}/s` });
    if (u.dotOnHit) stats.push({ icon: icon('poison'), label: 'On hit', value: `${u.dotOnHit.dps}/s ×${u.dotOnHit.secs}s` });
    if (u.moraleAura) stats.push({ icon: icon('banner'), label: 'Morale', value: `+${u.moraleAura.bonus}` });
  } else if (card.buildingId) {
    const b = getBuilding(card.buildingId);
    stats.push({ icon: icon('health'), label: 'Health', value: String(b.hp) });
    stats.push({ icon: icon('shield'), label: 'Armor', value: String(b.armor) });
    stats.push({ icon: icon('time'), label: 'Build', value: `${b.buildSecs}s` });
    stats.push({ icon: icon('footprint'), label: 'Size', value: `${b.footprint[0]}×${b.footprint[1]}` });
    if (b.attack) stats.push({ icon: icon('sword'), label: 'Attack', value: `${b.attack.damage} @ ${b.attack.range}` });
    if (b.commandProvided) stats.push({ icon: icon('command'), label: 'Command', value: `+${b.commandProvided}` });
    if (b.influencePerMin) stats.push({ icon: icon('influence'), label: 'Influence', value: `${b.influencePerMin}/min` });
    if (b.passiveIncome && b.passiveIncome.perSec > 0) {
      stats.push({ icon: icon(COST_ICON_KEYS[b.passiveIncome.resource] ?? 'income'), label: 'Income', value: `${b.passiveIncome.perSec}/s` });
    }
  } else {
    if (card.cooldownSecs) stats.push({ icon: icon('cooldown'), label: 'Cooldown', value: `${card.cooldownSecs}s` });
  }
  return stats;
}

export interface CardFaceOptions {
  size: 'tile' | 'detail';
  /** Live spinning 3D art (tile grids and popups); false = static icon glyph. */
  model?: boolean;
  /** Grey out (not owned). */
  locked?: boolean;
  /** Copies-owned badge (crafting / collection). */
  count?: number;
}

export interface CardFaceHandle {
  root: HTMLElement;
  /** Unregisters the spinner canvas (safe to call twice). */
  dispose: () => void;
}

export function buildCardFace(card: Card, opts: CardFaceOptions): CardFaceHandle {
  const root = el('div', { className: `pcard ${opts.size === 'detail' ? 'pcard-detail' : 'pcard-tile'}` });
  root.style.setProperty('--rarity', RARITY_COLORS[card.rarity] ?? '#a8a8a8');
  if (opts.locked) root.classList.add('locked');

  // Header: name + deck-point gem.
  const head = el('div', { className: 'pcard-head' });
  head.append(
    el('span', { className: 'pcard-name', text: card.name }),
    el('span', { className: 'pcard-pts', text: String(card.deckPoints), title: 'Deck points' }),
  );

  // Art window: live 3D model or icon glyph, with the age badge.
  const art = el('div', { className: 'pcard-art' });
  let dispose = (): void => {};
  const model = opts.model ? buildCardModel(card) : null;
  if (model) {
    const canvas = document.createElement('canvas');
    if (opts.size === 'detail') {
      canvas.width = 480;
      canvas.height = 360;
    } else {
      canvas.width = 240;
      canvas.height = 180;
    }
    canvas.className = 'pcard-canvas';
    art.append(canvas);
    dispose = spinnerHub.register(canvas, model, { priority: opts.size === 'detail' });
  } else {
    art.append(el('div', { className: 'pcard-glyph', html: icon(card.icon) }));
  }
  art.append(el('span', { className: 'pcard-age', text: ageLabel(card) }));
  if (opts.count !== undefined && opts.count > 0) {
    art.append(el('span', { className: 'pcard-count', text: `×${opts.count}` }));
  }

  // Type line.
  const typeLine = el('div', {
    className: 'pcard-typeline',
    text: `${TYPE_LABELS[card.type]} · ${FACTION_LABELS[card.faction] ?? card.faction}`,
  });

  root.append(head, art, typeLine);

  if (opts.size === 'detail') {
    const stats = cardStats(card);
    if (stats.length > 0) {
      const grid = el('div', { className: 'pcard-stats' });
      for (const s of stats) {
        grid.append(el('div', { className: 'pcard-stat', title: s.label }, [
          el('span', { className: 'pcard-stat-ico', html: s.icon }),
          el('span', { className: 'pcard-stat-label', text: s.label }),
          el('span', { className: 'pcard-stat-val', text: s.value }),
        ]));
      }
      root.append(grid);
    }
    root.append(el('div', { className: 'pcard-desc', text: card.description }));
    if (card.requirements?.buildingId) {
      root.append(el('div', { className: 'pcard-req', text: `Requires: ${getBuilding(card.requirements.buildingId).name}` }));
    }
  }

  // Footer: cost + rarity.
  const foot = el('div', { className: 'pcard-foot' });
  const cost = costText(cardCost(card));
  foot.append(
    el('span', { className: 'pcard-cost', html: cost || '&mdash;' }),
    el('span', { className: 'pcard-rarity', text: card.rarity }),
  );
  root.append(foot);

  return { root, dispose };
}
