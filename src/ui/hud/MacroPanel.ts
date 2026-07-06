import { el } from '@/ui/components/dom';
import { MILITARY_ROLES, type UnitRole } from '@/data/types';
import type { FlagType, EmergencyAction } from '@/sim/commands';
import type { MatchSim } from '@/sim/MatchSim';

const ROLE_ICONS: Record<string, string> = { infantry: '🗡️', ranged: '🏹', cavalry: '🐎', siege: '🪨', support: '🚩' };

const FLAG_DEFS: { type: FlagType; icon: string; label: string }[] = [
  { type: 'march', icon: '🚶', label: 'March Flag — army moves there and regroups' },
  { type: 'assault', icon: '⚔️', label: 'Assault Flag — attack everything nearby' },
  { type: 'siege', icon: '🪨', label: 'Siege Flag — siege engines prioritize this spot' },
  { type: 'rally', icon: '🎪', label: 'Rally Flag — new units gather here' },
  { type: 'harass', icon: '🐎', label: 'Harass Flag — fast units raid this area' },
  { type: 'defend', icon: '🛡️', label: 'Defend Flag — defenders hold this position' },
];

const EMERGENCIES: { action: EmergencyAction; icon: string; label: string }[] = [
  { action: 'fullAssault', icon: '💥', label: 'Full Assault — everyone attacks for 60s' },
  { action: 'holdKeep', icon: '🏰', label: 'Hold the Keep — pull army home' },
  { action: 'protectWorkers', icon: '👷', label: 'Protect Workers — guard the economy' },
  { action: 'rallyArmy', icon: '📯', label: 'Rally Army — gather idle soldiers' },
  { action: 'repairWalls', icon: '🔧', label: 'Repair Walls — workers fix damage' },
  { action: 'retreat', icon: '🏳️', label: 'Retreat — attackers fall back' },
];

/**
 * Macro command panel (GDD §15): ATTACK/DEFEND stance toggles, attack &
 * defend allocation sliders, flag placement buttons, emergency buttons.
 */
export class MacroPanel {
  readonly root: HTMLElement;
  private sim: MatchSim;
  private attackBtn: HTMLElement;
  private defendBtn: HTMLElement;
  private drawer: HTMLElement;
  private drawerOpen = false;

  constructor(sim: MatchSim, onFlagMode: (type: FlagType) => void) {
    this.sim = sim;
    this.root = el('div', { className: 'macro-panel' });

    // Stance buttons.
    const stanceRow = el('div', { className: 'stance-row' });
    this.attackBtn = el('button', { className: 'stance-btn attack', text: '⚔ ATTACK' });
    this.attackBtn.title = 'Send allocated units to your attack flags (or the enemy fortress)';
    this.attackBtn.addEventListener('click', () => {
      const p = sim.state.players[0];
      sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: !p.stanceAttack });
    });
    this.defendBtn = el('button', { className: 'stance-btn defend active', text: '🛡 DEFEND' });
    this.defendBtn.title = 'Unallocated units hold your structures and respond to threats';
    this.defendBtn.addEventListener('click', () => {
      this.drawerOpen = !this.drawerOpen;
      this.drawer.style.display = this.drawerOpen ? '' : 'none';
    });
    stanceRow.append(this.attackBtn, this.defendBtn);

    // Allocation drawer.
    this.drawer = el('div', { className: 'macro-drawer' });
    this.drawer.style.display = 'none';
    this.drawer.append(el('div', { className: 'macro-title', text: 'Attack Allocation %' }));
    this.drawer.append(this.allocSliders('attack'));
    const toggleBtn = el('button', { className: 'btn small', text: 'Sliders' });
    toggleBtn.addEventListener('click', () => {
      this.drawerOpen = !this.drawerOpen;
      this.drawer.style.display = this.drawerOpen ? '' : 'none';
    });

    // Flags.
    const flagRow = el('div', { className: 'flag-row' });
    for (const f of FLAG_DEFS) {
      const b = el('button', { className: 'icon-btn', text: f.icon, title: f.label });
      b.addEventListener('click', () => onFlagMode(f.type));
      flagRow.append(b);
    }

    // Emergency buttons.
    const emergencyRow = el('div', { className: 'flag-row' });
    for (const e of EMERGENCIES) {
      const b = el('button', { className: 'icon-btn emergency', text: e.icon, title: e.label });
      b.addEventListener('click', () => sim.enqueue({ kind: 'emergency', player: 0, action: e.action }));
      emergencyRow.append(b);
    }

    this.root.append(stanceRow, toggleBtn, this.drawer, flagRow, emergencyRow);
  }

  private allocSliders(mode: 'attack' | 'defend'): HTMLElement {
    const wrap = el('div');
    const p = this.sim.state.players[0];
    const source = mode === 'attack' ? p.attackAlloc : p.defendAlloc;
    for (const role of MILITARY_ROLES) {
      if (role === 'support') continue;
      const row = el('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:2px 0;';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '10';
      input.value = String(source[role as UnitRole] ?? 0);
      input.style.flex = '1';
      const pct = el('span', { className: 'slider-value', text: `${input.value}%` });
      input.addEventListener('input', () => {
        pct.textContent = `${input.value}%`;
        this.sim.enqueue({ kind: 'setAllocation', player: 0, mode, alloc: { [role]: Number(input.value) } });
      });
      row.append(el('span', { text: ROLE_ICONS[role] ?? role }), input, pct);
      wrap.append(row);
    }
    return wrap;
  }

  update(): void {
    const p = this.sim.state.players[0];
    this.attackBtn.classList.toggle('active', p.stanceAttack);
    const fullAssault = p.fullAssaultUntilTick !== null && p.fullAssaultUntilTick > this.sim.state.tick;
    this.attackBtn.textContent = fullAssault ? '💥 FULL ASSAULT' : '⚔ ATTACK';
  }
}
