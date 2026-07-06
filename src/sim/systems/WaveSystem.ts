import { MORALE_BASE, SURVIVAL_WAVES, SURVIVAL_WAVE_INTERVAL_SECS, TICK_RATE } from '@/data/balance';
import { getUnit } from '@/data/units';
import { UNIT_DB } from '@/data/units';
import type { MatchState } from '../MatchState';
import { Unit } from '../entities/Entity';
import { declareWinner } from './VictorySystem';

/**
 * Survival mode (GDD §13.3 optional win conditions): escalating waves of the
 * bot faction's units spawn at the enemy side and assault the player's keep.
 * Survive all waves to win; losing the fortress still loses the match.
 */
export class WaveSpawner {
  wave = 0;
  private nextWaveTick: number;
  private waveUnitIds: number[] = [];

  constructor(state: MatchState) {
    this.nextWaveTick = Math.round(SURVIVAL_WAVE_INTERVAL_SECS * 0.8 * TICK_RATE);
    void state;
  }

  update(state: MatchState): void {
    if (state.setup.victoryMode !== 'survival' || state.winner !== null) return;

    // Win check: all waves cleared.
    if (this.wave >= SURVIVAL_WAVES) {
      const anyAlive = this.waveUnitIds.some((id) => state.unit(id) !== null);
      if (!anyAlive) {
        declareWinner(state, 0, `You survived all ${SURVIVAL_WAVES} waves`);
      }
      return;
    }

    if (state.tick < this.nextWaveTick) return;
    this.wave++;
    this.nextWaveTick = state.tick + SURVIVAL_WAVE_INTERVAL_SECS * TICK_RATE;

    const botFaction = state.players[1].faction.id;
    // Escalating roster: wave N spawns N+2 line units + extras by tier.
    const pool = [...UNIT_DB.values()].filter(
      (u) => u.faction === botFaction && u.role !== 'worker' && !u.tags.includes('hero'),
    );
    const line = pool.filter((u) => u.commandCost <= 2);
    const heavy = pool.filter((u) => u.commandCost >= 3 && u.role !== 'siege');
    const siege = pool.filter((u) => u.role === 'siege');

    const spawnBase = state.map.spawns[1];
    const playerFortress = state.fortressOf(0);
    const count = 3 + this.wave * 2;
    const spawned: Unit[] = [];
    for (let i = 0; i < count; i++) {
      let def = line[Math.floor(state.rng.next() * line.length)] ?? pool[0];
      if (this.wave >= 3 && i % 4 === 0 && heavy.length > 0) def = heavy[Math.floor(state.rng.next() * heavy.length)];
      if (this.wave >= 5 && i % 6 === 0 && siege.length > 0) def = siege[Math.floor(state.rng.next() * siege.length)];
      const angle = (i / count) * Math.PI * 2;
      const pos = state.nav.nearestFree({
        x: spawnBase.x + Math.cos(angle) * 6,
        y: spawnBase.y + Math.sin(angle) * 6,
      });
      const unit = new Unit(1, pos, getUnit(def.id), MORALE_BASE + 20);
      unit.assignment = 'attack';
      if (playerFortress) {
        unit.task = { kind: 'macroMove', dest: { ...playerFortress.pos } };
      }
      state.addUnit(unit);
      this.waveUnitIds.push(unit.id);
      spawned.push(unit);
    }
    // Waves don't cost the bot command.
    state.bus.emit('waveStarted', { wave: this.wave, total: SURVIVAL_WAVES });
    state.bus.emit('alert', {
      kind: 'waveIncoming',
      message: `Wave ${this.wave} of ${SURVIVAL_WAVES} approaches!`,
      pos: spawnBase,
      player: 0,
    });
  }
}
