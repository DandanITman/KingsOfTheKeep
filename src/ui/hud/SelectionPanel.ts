import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import { getUnit, UNIT_DB } from '@/data/units';
import { UPGRADE_DB } from '@/data/upgrades';
import type { MatchState } from '@/sim/MatchState';
import { Building, Unit } from '@/sim/entities/Entity';
import type { MatchSim } from '@/sim/MatchSim';

/**
 * Bottom-left panel describing the current selection. For a selected
 * production building it offers train buttons, queue display, and research.
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
    // Rebuild only when the selection identity changes; refresh dynamic bits every frame.
    const key = [...sel].sort((a, b) => a - b).join(',');
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.rebuild(sel);
    }
    this.refreshDynamic(first instanceof Building ? first : null);
  }

  private queueEl: HTMLElement | null = null;
  private hpEl: HTMLElement | null = null;

  private rebuild(sel: Set<number>): void {
    this.root.innerHTML = '';
    this.root.style.display = '';
    this.queueEl = null;
    this.hpEl = null;

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
          text: `⚔ ${u.def.damage}  🛡 ${u.def.armor}/${u.def.pierceArmor}  👟 ${u.def.speed}  🎯 ${u.def.range > 0.9 ? u.def.range : 'melee'}`,
        }),
      );
      if (u.def.role !== 'worker') {
        this.root.append(el('div', { text: `Stance: ${u.assignment}` }));
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
        const trainRow = el('div');
        trainRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;';
        const faction = this.state.players[0].faction.id;
        for (const def of UNIT_DB.values()) {
          if (def.trainedAt !== b.def.trainKey) continue;
          if (def.faction !== faction && def.faction !== 'neutral') continue;
          // Only units whose card is in the player's deck are trainable.
          const inDeck = this.state.players[0].cards.some((c) => c.cardId === `card_${def.id}`);
          if (!inDeck) continue;
          const btn = el('button', { className: 'btn small', text: `${def.name}`, title: `${def.trainSecs}s` });
          btn.style.cssText += 'font-size:11px;padding:3px 8px;min-width:0;';
          btn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'trainUnit', player: 0, buildingId: b.id, unitId: def.id }),
          );
          trainRow.append(btn);
        }
        if (trainRow.children.length > 0) this.root.append(trainRow);
        this.queueEl = el('div');
        this.queueEl.style.cssText = 'margin-top:4px;font-size:12px;color:#a89468;cursor:pointer;';
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
        tradeWrap.append(el('div', { text: 'Trade (100 at a time):' }));
        const sellRow = el('div');
        sellRow.style.cssText = 'display:flex;gap:4px;margin-top:3px;';
        for (const res of ['food', 'wood', 'stone'] as const) {
          const sellBtn = el('button', { className: 'btn small', text: `${res} → 🪙`, title: `Sell 100 ${res} for gold` });
          sellBtn.style.cssText += 'font-size:10px;padding:3px 6px;min-width:0;';
          sellBtn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'marketTrade', player: 0, sell: res, buy: 'gold', amount: 100 }),
          );
          const buyBtn = el('button', { className: 'btn small', text: `🪙 → ${res}`, title: `Buy ${res} with 100 gold` });
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
        const row = el('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;';
        for (const upgradeId of b.def.researches) {
          const up = UPGRADE_DB.get(upgradeId);
          if (!up || p.completedUpgrades.has(upgradeId)) continue;
          if (up.tier > p.tier) continue;
          const btn = el('button', { className: 'btn small', text: `${icon(up.icon)} ${up.name}`, title: up.description });
          btn.style.cssText += 'font-size:11px;padding:3px 8px;min-width:0;';
          btn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'startUpgrade', player: 0, buildingId: b.id, upgradeId }),
          );
          row.append(btn);
        }
        if (row.children.length > 0) this.root.append(row);
      }

      // Fortress: tier upgrades + worker training handled via researches/trainKey already.
      if (b.def.tierUpgrades && b.player === 0) {
        const p = this.state.players[0];
        const next = b.def.tierUpgrades.find((id) => {
          const up = UPGRADE_DB.get(id);
          return up && !p.completedUpgrades.has(id) && up.tier <= p.tier;
        });
        if (next) {
          const up = UPGRADE_DB.get(next)!;
          const btn = el('button', { className: 'btn small primary', text: `${icon(up.icon)} ${up.name}`, title: up.description });
          btn.style.cssText += 'margin-top:6px;font-size:12px;';
          btn.addEventListener('click', () =>
            this.sim.enqueue({ kind: 'startUpgrade', player: 0, buildingId: b.id, upgradeId: next }),
          );
          this.root.append(btn);
        }
      }
    }
  }

  private refreshDynamic(b: Building | null): void {
    if (this.hpEl) {
      const sel = this.getSelection();
      const first = this.state.entities.get([...sel][0]);
      if (first && !first.dead) {
        this.hpEl.textContent = `❤ ${Math.ceil(first.hp)} / ${first.maxHp}`;
      }
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
      } else {
        this.queueEl.textContent = '';
      }
    }
  }
}
