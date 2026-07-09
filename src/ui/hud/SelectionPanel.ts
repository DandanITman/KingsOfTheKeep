import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import { FORTRESS_GARRISON_SLOTS, HOUSE_UPGRADES } from '@/data/balance';
import { getUnit, UNIT_DB } from '@/data/units';
import { UPGRADE_DB } from '@/data/upgrades';
import { CARD_DB, getCard } from '@/data/cards';
import type { UnitDef, UpgradeDef } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';
import { Building, Unit } from '@/sim/entities/Entity';
import type { MatchSim } from '@/sim/MatchSim';
import { costText } from '@/ui/cards/CardFace';
import { attachCardHover } from '@/ui/cards/CardHover';

/**
 * Bottom-left panel describing the current selection. For a selected
 * production building it offers train buttons (right-click = auto-queue),
 * queue display, market trading, and research with costs.
 */
export class SelectionPanel {
  readonly root: HTMLElement;
  private sim: MatchSim;
  private state: MatchState;
  private getSelection: () => Set<number>;
  private lastKey = '';

  constructor(sim: MatchSim, getSelection: () => Set<number>) {
    this.sim = sim;
    this.state = sim.state;
    this.getSelection = getSelection;
    this.root = el('div', { className: 'panel selection-panel' });
    this.root.style.cssText += 'padding:8px 12px;min-width:230px;max-width:320px;display:none;font-size:13px;';
  }

  update(): void {
    const sel = this.getSelection();
    if (sel.size === 0) {
      if (this.lastKey !== '') {
        this.lastKey = '';
        this.root.style.display = 'none';
      }
      return;
    }

    const first = this.state.entities.get([...sel][0]);
    // Rebuild only when the selection identity changes; refresh dynamic bits
    // every frame. House level and player tier are part of the key so the
    // panel re-renders after upgrades.
    let key = [...sel].sort((a, b) => a - b).join(',');
    if (first instanceof Building) key += `:${first.level}:${this.state.players[0].tier}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.rebuild(sel);
    }
    this.refreshDynamic(first instanceof Building ? first : null);
  }

  private queueEl: HTMLElement | null = null;
  private hpEl: HTMLElement | null = null;
  private garrisonEl: HTMLElement | null = null;
  private trainBtns = new Map<string, HTMLElement>();
  private hoverDisposers: (() => void)[] = [];

  /** Rich production tile: icon, name, cost, time; hover shows the full card. */
  private trainButton(def: UnitDef, b: Building): HTMLElement {
    const btn = el('button', { className: 'train-btn' });
    btn.append(
      el('span', { className: 'train-ico', html: icon(getCardIcon(def)) }),
      el('span', { className: 'train-name', text: def.name }),
      el('span', { className: 'train-cost', html: `${costText(def.cost)} &middot; ${def.trainSecs}s` }),
      el('span', { className: 'train-auto-tag', text: 'auto' }),
    );
    btn.title = 'Left-click: train once · Right-click: toggle auto-train';
    btn.addEventListener('click', () =>
      this.sim.enqueue({ kind: 'trainUnit', player: 0, buildingId: b.id, unitId: def.id }),
    );
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = b.autoTrainUnitId === def.id ? null : def.id;
      this.sim.enqueue({ kind: 'setAutoTrain', player: 0, buildingId: b.id, unitId: next });
    });
    const cardId = `card_${def.id}`;
    if (CARD_DB.has(cardId)) {
      this.hoverDisposers.push(attachCardHover(btn, () => getCard(cardId)));
    }
    this.trainBtns.set(def.id, btn);
    return btn;
  }

  /** Research tile with explicit cost + time. */
  private researchButton(up: UpgradeDef, b: Building, primary: boolean): HTMLElement {
    const btn = el('button', { className: `train-btn research${primary ? ' primary' : ''}` });
    btn.append(
      el('span', { className: 'train-ico', html: icon(up.icon) }),
      el('span', { className: 'train-name', text: up.name }),
      el('span', { className: 'train-cost', html: `${costText(up.cost) || 'Free'} &middot; ${up.researchSecs}s` }),
    );
    btn.title = up.description;
    btn.addEventListener('click', () =>
      this.sim.enqueue({ kind: 'startUpgrade', player: 0, buildingId: b.id, upgradeId: up.id }),
    );
    return btn;
  }

  private sectionLabel(text: string): HTMLElement {
    return el('div', { className: 'sel-section', text });
  }

  private rebuild(sel: Set<number>): void {
    this.hoverDisposers.forEach((d) => d());
    this.hoverDisposers = [];
    this.trainBtns.clear();
    this.root.innerHTML = '';
    this.root.style.display = '';
    this.queueEl = null;
    this.hpEl = null;
    this.garrisonEl = null;

    const entities = [...sel].map((id) => this.state.entities.get(id)).filter((e) => e && !e.dead);
    const units = entities.filter((e): e is Unit => e instanceof Unit);
    const buildings = entities.filter((e): e is Building => e instanceof Building);

    if (units.length > 1) {
      const byType = new Map<string, number>();
      for (const u of units) byType.set(u.def.name, (byType.get(u.def.name) ?? 0) + 1);
      this.root.append(el('div', { html: `<b style="color:var(--gold)">${units.length} units</b>` }));
      const list = el('div');
      list.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;';
      for (const [name, count] of byType) {
        list.append(el('span', { text: `${count}× ${name}` }));
      }
      this.root.append(list);
      return;
    }

    if (units.length === 1) {
      const u = units[0];
      this.root.append(el('div', { html: `<b style="color:var(--gold)">${u.def.name}</b>` }));
      this.hpEl = el('div');
      this.root.append(this.hpEl);
      this.root.append(
        el('div', {
          html: `${icon('sword')} ${u.def.damage}  ${icon('shield')} ${u.def.armor}/${u.def.pierceArmor}  ${icon('boots')} ${u.def.speed}  ${icon('range')} ${u.def.range > 0.9 ? u.def.range : 'melee'}`,
        }),
      );
      if (u.def.role !== 'worker') {
        this.root.append(el('div', { text: `Stance: ${u.assignment}` }));
      }
      const cardId = `card_${u.defId}`;
      if (CARD_DB.has(cardId)) {
        this.hoverDisposers.push(attachCardHover(this.root, () => getCard(cardId), { delayMs: 700 }));
      }
      return;
    }

    if (buildings.length >= 1) {
      const b = buildings[0];
      this.root.append(el('div', { html: `<b style="color:var(--gold)">${b.def.name}</b>` }));
      this.hpEl = el('div');
      this.root.append(this.hpEl);

      if (b.underConstruction) {
        this.root.append(el('div', { text: 'Under construction — right-click with workers to help build.' }));
        return;
      }

      // Train buttons.
      if (b.def.trainKey && b.player === 0) {
        const trainRow = el('div', { className: 'train-grid' });
        const faction = this.state.players[0].faction.id;
        for (const def of UNIT_DB.values()) {
          if (def.trainedAt !== b.def.trainKey) continue;
          if (def.faction !== faction && def.faction !== 'neutral') continue;
          // Only units whose card is in the player's deck are trainable.
          const inDeck = this.state.players[0].cards.some((c) => c.cardId === `card_${def.id}`);
          if (!inDeck) continue;
          trainRow.append(this.trainButton(def, b));
        }
        if (trainRow.children.length > 0) {
          this.root.append(this.sectionLabel('Train — right-click for auto'), trainRow);
        }
        this.queueEl = el('div');
        this.queueEl.style.cssText = 'margin-top:4px;font-size:12px;color:var(--muted);cursor:pointer;min-height:15px;';
        this.queueEl.title = 'Click to cancel the first queued unit';
        this.queueEl.addEventListener('click', () => {
          this.sim.enqueue({ kind: 'cancelTrain', player: 0, buildingId: b.id, queueIndex: 0 });
        });
        this.root.append(this.queueEl);
      }

      // Market trading (GDD §18.1 Market): sell 100 of a resource for gold, or buy with gold.
      if ((b.def.trainKey === 'market' || b.defId.includes('bazaar')) && b.player === 0) {
        const tradeWrap = el('div');
        tradeWrap.style.cssText = 'margin-top:6px;';
        tradeWrap.append(this.sectionLabel('Trade (100 at a time)'));
        const sellRow = el('div');
        sellRow.style.cssText = 'display:flex;gap:4px;margin-top:3px;';
        for (const res of ['food', 'wood', 'stone'] as const) {
          const sellBtn = el('button', { className: 'btn small', html: `${res} &rarr; ${icon('goldRes')}`, title: `Sell 100 ${res} for gold` });
          sellBtn.style.cssText += 'font-size:10px;padding:3px 6px;min-width:0;';
          sellBtn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'marketTrade', player: 0, sell: res, buy: 'gold', amount: 100 }),
          );
          const buyBtn = el('button', { className: 'btn small', html: `${icon('goldRes')} &rarr; ${res}`, title: `Buy ${res} with 100 gold` });
          buyBtn.style.cssText += 'font-size:10px;padding:3px 6px;min-width:0;';
          buyBtn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'marketTrade', player: 0, sell: 'gold', buy: res, amount: 100 }),
          );
          sellRow.append(sellBtn, buyBtn);
        }
        tradeWrap.append(sellRow);
        this.root.append(tradeWrap);
      }

      // Research buttons.
      if (b.def.researches && b.player === 0) {
        const p = this.state.players[0];
        const row = el('div', { className: 'train-grid' });
        for (const upgradeId of b.def.researches) {
          const up = UPGRADE_DB.get(upgradeId);
          if (!up || p.completedUpgrades.has(upgradeId)) continue;
          if (up.tier > p.tier) continue;
          row.append(this.researchButton(up, b, false));
        }
        if (row.children.length > 0) this.root.append(this.sectionLabel('Research'), row);
      }

      // House: per-building level upgrades.
      if (b.defId === 'house' && b.player === 0) {
        const next = HOUSE_UPGRADES[b.level - 1];
        if (next) {
          const btn = el('button', { className: 'train-btn research primary' });
          btn.append(
            el('span', { className: 'train-ico', html: icon('houseUp') }),
            el('span', { className: 'train-name', text: `Upgrade to ${next.name}` }),
            el('span', { className: 'train-cost', html: `${costText(next.cost)} &middot; +${next.command} cmd, +${next.hp} hp` }),
          );
          btn.title = 'Bigger home: more command capacity and hit points.';
          btn.addEventListener('click', () => this.sim.enqueue({ kind: 'upgradeHouse', player: 0, buildingId: b.id }));
          const wrap = el('div', { className: 'train-grid' });
          wrap.append(btn);
          this.root.append(this.sectionLabel('Improve'), wrap);
        } else {
          this.root.append(el('div', { text: `Manor (max level)` }));
        }
      }

      // Fortress: garrison archers on the walls (tier 2+).
      if (b.def.kind === 'fortress' && b.player === 0) {
        const slots = FORTRESS_GARRISON_SLOTS[this.state.players[0].tier] ?? 0;
        if (slots > 0) {
          const row = el('div');
          row.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
          const manBtn = el('button', { className: 'btn small', html: `${icon('garrison')} Man the walls` });
          manBtn.title = 'Nearby archers climb onto the keep and fire with bonus range';
          manBtn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'garrisonRanged', player: 0, buildingId: b.id }),
          );
          const ejectBtn = el('button', { className: 'btn small', html: `${icon('dismount')} Dismount` });
          ejectBtn.title = 'Garrisoned archers climb back down';
          ejectBtn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'ungarrison', player: 0, buildingId: b.id }),
          );
          row.append(manBtn, ejectBtn);
          this.garrisonEl = el('div');
          this.garrisonEl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:2px;';
          this.root.append(this.sectionLabel('Castle Garrison'), row, this.garrisonEl);
        }
      }

      // Fortress: next tier upgrade.
      if (b.def.tierUpgrades && b.player === 0) {
        const p = this.state.players[0];
        const next = b.def.tierUpgrades.find((id) => {
          const up = UPGRADE_DB.get(id);
          return up && !p.completedUpgrades.has(id) && up.tier <= p.tier;
        });
        if (next) {
          const up = UPGRADE_DB.get(next)!;
          const wrap = el('div', { className: 'train-grid' });
          wrap.append(this.researchButton(up, b, true));
          this.root.append(this.sectionLabel('Advance'), wrap);
        }
      }
    }
  }

  private refreshDynamic(b: Building | null): void {
    if (this.hpEl) {
      const sel = this.getSelection();
      const first = this.state.entities.get([...sel][0]);
      if (first && !first.dead) {
        this.hpEl.innerHTML = `${icon('health')} ${Math.ceil(first.hp)} / ${first.maxHp}`;
      }
    }
    if (b) {
      // Auto-train highlight follows sim state (commands apply next tick).
      for (const [unitId, btn] of this.trainBtns) {
        btn.classList.toggle('auto', b.autoTrainUnitId === unitId);
      }
    }
    if (this.garrisonEl && b) {
      const slots = FORTRESS_GARRISON_SLOTS[this.state.players[0].tier] ?? 0;
      const manned = this.state.units.filter((u) => !u.dead && u.garrisonedIn === b.id).length;
      this.garrisonEl.textContent = `${manned}/${slots} archers on the walls`;
    }
    if (this.queueEl && b) {
      if (b.trainQueue.length > 0) {
        const head = b.trainQueue[0];
        const pct = Math.round((1 - head.ticksRemaining / head.totalTicks) * 100);
        this.queueEl.textContent = `Training: ${getUnit(head.unitId).name} ${pct}%${b.trainQueue.length > 1 ? ` (+${b.trainQueue.length - 1} queued)` : ''}`;
      } else if (b.research) {
        const up = UPGRADE_DB.get(b.research.upgradeId);
        const pct = Math.round((1 - b.research.ticksRemaining / b.research.totalTicks) * 100);
        this.queueEl.textContent = `Researching: ${up?.name ?? ''} ${pct}%`;
      } else if (b.autoTrainUnitId) {
        this.queueEl.textContent = `Auto-training ${getUnit(b.autoTrainUnitId).name} — waiting for resources`;
      } else {
        this.queueEl.textContent = '';
      }
    }
  }
}

/** Icon key for a unit: its card icon when a card exists, else a role glyph. */
function getCardIcon(def: UnitDef): string {
  const cardId = `card_${def.id}`;
  if (CARD_DB.has(cardId)) return getCard(cardId).icon;
  return def.role === 'worker' ? 'worker' : 'sword';
}
