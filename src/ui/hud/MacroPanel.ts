import { el } from '@/ui/components/dom';
import { MILITARY_ROLES } from '@/data/types';
import { icon } from '@/ui/icons';
import type { FlagType, EmergencyAction } from '@/sim/commands';
import type { MatchSim } from '@/sim/MatchSim';

const ROLE_ICON_KEYS: Record<string, string> = {
  infantry: 'roleInfantry',
  ranged: 'roleRanged',
  cavalry: 'roleCavalry',
  siege: 'roleSiege',
  support: 'roleSupport',
};

const FLAG_DEFS: { type: FlagType; iconKey: string; label: string }[] = [
  { type: 'march', iconKey: 'flagMarch', label: 'March flag - army moves there and regroups' },
  { type: 'assault', iconKey: 'flagAssault', label: 'Assault flag - attack everything nearby' },
  { type: 'siege', iconKey: 'flagSiege', label: 'Siege flag - siege engines prioritize this spot' },
  { type: 'rally', iconKey: 'flagRally', label: 'Rally flag - new units gather here' },
  { type: 'harass', iconKey: 'flagHarass', label: 'Harass flag - fast units raid this area' },
  { type: 'defend', iconKey: 'flagDefend', label: 'Defend flag - defenders hold this position' },
];

const EMERGENCIES: { action: EmergencyAction; iconKey: string; label: string }[] = [
  { action: 'fullAssault', iconKey: 'emFullAssault', label: 'Full assault - everyone attacks for 60s' },
  { action: 'holdKeep', iconKey: 'emHoldKeep', label: 'Hold the Keep - pull army home' },
  { action: 'protectWorkers', iconKey: 'emProtectWorkers', label: 'Protect Workers - guard the economy' },
  { action: 'rallyArmy', iconKey: 'emRallyArmy', label: 'Rally Army - gather idle soldiers' },
  { action: 'repairWalls', iconKey: 'emRepairWalls', label: 'Repair Walls - workers fix damage' },
  { action: 'retreat', iconKey: 'emRetreat', label: 'Retreat - attackers fall back' },
];

const ALLOC_STEP = 25;

/**
 * Macro command panel: a named RTS command grid with the working commands
 * wired to the current sim, plus an expandable drawer for advanced flags and
 * troop attack allocation.
 */
export class MacroPanel {
  readonly root: HTMLElement;
  private sim: MatchSim;
  private attackBtn: HTMLButtonElement;
  private defendBtn: HTMLButtonElement;
  private formationBtn: HTMLButtonElement;
  private drawer: HTMLElement;
  private drawerOpen = false;

  constructor(sim: MatchSim, onFlagMode: (type: FlagType) => void) {
    this.sim = sim;
    this.root = el('div', { className: 'macro-panel' });

    const commandGrid = el('div', { className: 'command-grid' });
    this.attackBtn = this.commandButton('roleInfantry', 'ATTACK', 'Send allocated units to your attack flags or the enemy fortress');
    this.attackBtn.classList.add('attack');
    this.attackBtn.addEventListener('click', () => {
      sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: true });
    });

    this.defendBtn = this.commandButton('flagDefend', 'DEFEND', 'Recall the army to hold structures and respond to threats');
    this.defendBtn.classList.add('defend', 'active');
    this.defendBtn.addEventListener('click', () => {
      sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: false });
    });

    const retreatBtn = this.commandButton('emRetreat', 'RETREAT', 'Attackers fall back toward your base');
    retreatBtn.classList.add('danger');
    retreatBtn.addEventListener('click', () => sim.enqueue({ kind: 'emergency', player: 0, action: 'retreat' }));

    const rallyBtn = this.commandButton('flagRally', 'RALLY', 'Gather idle soldiers at your rally flag or keep');
    rallyBtn.addEventListener('click', () => sim.enqueue({ kind: 'emergency', player: 0, action: 'rallyArmy' }));

    const patrolBtn = this.commandButton('patrol', 'PATROL', 'Place a defend patrol flag for guards');
    patrolBtn.addEventListener('click', () => onFlagMode('defend'));

    const holdBtn = this.commandButton('holdLine', 'HOLD', 'Pull the army home and hold the keep');
    holdBtn.addEventListener('click', () => sim.enqueue({ kind: 'emergency', player: 0, action: 'holdKeep' }));

    const stopBtn = this.commandButton('stopCommand', 'STOP', 'Cancel the current assault and regroup idle soldiers');
    stopBtn.classList.add('wide');
    stopBtn.addEventListener('click', () => {
      sim.enqueue({ kind: 'emergency', player: 0, action: 'stop' });
    });

    this.formationBtn = this.commandButton('formation', 'FORMATIONS', 'Open attack allocation by troop role');
    this.formationBtn.addEventListener('click', () => this.toggleDrawer());

    const upgradesBtn = this.commandButton('upgradesCommand', 'UPGRADES', 'Select a building to research upgrades');
    upgradesBtn.addEventListener('click', () => {
      sim.state.bus.emit('alert', {
        kind: 'armyReady',
        message: 'Select a building, then use its Research or Improve buttons.',
        player: 0,
      });
    });

    const deleteBtn = this.commandButton('deleteCommand', 'DELETE', 'Clear every command flag you have placed');
    deleteBtn.classList.add('danger');
    deleteBtn.addEventListener('click', () => this.clearFlags());

    commandGrid.append(
      this.attackBtn,
      this.defendBtn,
      retreatBtn,
      rallyBtn,
      patrolBtn,
      holdBtn,
      this.formationBtn,
      upgradesBtn,
      deleteBtn,
      stopBtn,
    );

    this.drawer = el('div', { className: 'macro-drawer' });
    this.drawer.style.display = 'none';
    this.drawer.append(this.sectionTitle('Attack mix'), this.allocRow());

    const flagRow = el('div', { className: 'flag-row' });
    for (const f of FLAG_DEFS) {
      const b = el('button', {
        className: 'icon-btn',
        html: icon(f.iconKey),
        title: `${f.label}\nWhile placing: left-click places, right-click a flag removes it.`,
      });
      b.addEventListener('click', () => onFlagMode(f.type));
      flagRow.append(b);
    }
    const clearBtn = el('button', { className: 'icon-btn', html: icon('clearFlags') });
    clearBtn.title = 'Clear Flags - remove every flag you have placed';
    clearBtn.addEventListener('click', () => this.clearFlags());
    flagRow.append(clearBtn);

    const emergencyRow = el('div', { className: 'flag-row' });
    for (const e of EMERGENCIES) {
      const b = el('button', { className: 'icon-btn emergency', html: icon(e.iconKey), title: e.label });
      b.addEventListener('click', () => sim.enqueue({ kind: 'emergency', player: 0, action: e.action }));
      emergencyRow.append(b);
    }

    this.drawer.append(this.sectionTitle('Flags'), flagRow, this.sectionTitle('Crisis'), emergencyRow);
    this.root.append(commandGrid, this.drawer);
  }

  /** One small button per role; click steps +25% (wraps), right-click -25%. */
  private allocRow(): HTMLElement {
    const row = el('div', { className: 'alloc-row' });
    const p = this.sim.state.players[0];
    for (const role of MILITARY_ROLES) {
      if (role === 'support') continue;
      const btn = el('button', { className: 'icon-btn alloc-btn' });
      let value = p.attackAlloc[role] ?? 0;
      const render = () => {
        btn.innerHTML = `${icon(ROLE_ICON_KEYS[role])}<span>${value}</span>`;
        btn.title = `${value}% of ${role} join attacks - click +${ALLOC_STEP}%, right-click -${ALLOC_STEP}%`;
      };
      const set = (v: number) => {
        value = v;
        render();
        this.sim.enqueue({ kind: 'setAllocation', player: 0, mode: 'attack', alloc: { [role]: v } });
      };
      render();
      btn.addEventListener('click', () =>
        set(value >= 100 ? 0 : Math.min(100, (Math.floor(value / ALLOC_STEP) + 1) * ALLOC_STEP)),
      );
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        set(Math.max(0, (Math.ceil(value / ALLOC_STEP) - 1) * ALLOC_STEP));
      });
      row.append(btn);
    }
    return row;
  }

  private commandButton(iconKey: string, label: string, title: string): HTMLButtonElement {
    return el('button', {
      className: 'command-btn',
      html: `<span class="command-icon">${icon(iconKey)}</span><span class="command-label">${label}</span>`,
      title,
    });
  }

  private sectionTitle(text: string): HTMLElement {
    return el('div', { className: 'macro-title', text });
  }

  private toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
    this.drawer.style.display = this.drawerOpen ? '' : 'none';
    this.formationBtn.classList.toggle('active', this.drawerOpen);
  }

  private clearFlags(): void {
    for (const f of this.sim.state.flags) {
      if (!f.dead && f.player === 0) this.sim.enqueue({ kind: 'removeFlag', player: 0, flagId: f.id });
    }
  }

  update(): void {
    const p = this.sim.state.players[0];
    this.attackBtn.classList.toggle('active', p.stanceAttack);
    this.defendBtn.classList.toggle('active', !p.stanceAttack);
    const fullAssault = p.fullAssaultUntilTick !== null && p.fullAssaultUntilTick > this.sim.state.tick;
    this.attackBtn.innerHTML = fullAssault
      ? `<span class="command-icon">${icon('emFullAssault')}</span><span class="command-label">FULL ASSAULT</span>`
      : `<span class="command-icon">${icon('roleInfantry')}</span><span class="command-label">ATTACK</span>`;
  }
}
