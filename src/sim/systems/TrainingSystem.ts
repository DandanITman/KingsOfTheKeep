import { MORALE_BASE, TICK_RATE } from '@/data/balance';
import { getUnit } from '@/data/units';
import { UPGRADE_DB } from '@/data/upgrades';
import type { MatchState } from '../MatchState';
import { Building, Unit } from '../entities/Entity';

/**
 * Ticks training queues and research. Production speed respects trainSpeed
 * modifiers and timed production boosts. Finished units spawn at the
 * building's edge and walk to its rally point.
 */
export function trainingSystem(state: MatchState, recomputeCommand: () => void): void {
  for (const b of state.buildings) {
    if (b.dead || !b.complete) continue;
    const p = state.players[b.player];

    // Training.
    const item = b.trainQueue[0];
    if (item) {
      const def = getUnit(item.unitId);
      const speed = p.mods.apply(1, ['trainSpeed', `unit.${def.role}.trainSpeed`, 'productionBoost']);
      item.ticksRemaining -= speed;
      if (item.ticksRemaining <= 0) {
        b.trainQueue.shift();
        const spawnPos = state.nav.nearestFree({
          x: b.pos.x,
          y: b.pos.y + b.def.footprint[1] / 2 + 1.2,
        });
        const unit = new Unit(b.player, spawnPos, def, MORALE_BASE);
        state.addUnit(unit);
        recomputeCommand();
        state.bus.emit('unitSpawned', { entityId: unit.id, unitId: def.id, player: b.player, pos: unit.pos });
        if (b.rallyPoint) {
          unit.task = { kind: 'move', dest: { ...b.rallyPoint }, path: null, attackMove: false };
        }
      }
    }

    // Auto-train: keep the queue topped up with the sticky unit. Fails
    // silently when resources/command run short and retries next tick.
    if (b.autoTrainUnitId && b.trainQueue.length < 2) {
      tryQueueUnit(state, b, b.autoTrainUnitId);
    }

    // Research.
    if (b.research) {
      const speed = p.mods.apply(1, ['researchSpeed', 'productionBoost']);
      b.research.ticksRemaining -= speed;
      if (b.research.ticksRemaining <= 0) {
        const upgradeId = b.research.upgradeId;
        b.research = null;
        const upgrade = UPGRADE_DB.get(upgradeId);
        if (upgrade) {
          p.completedUpgrades.add(upgradeId);
          for (const effect of upgrade.effects) {
            p.mods.add(effect, `upgrade:${upgradeId}`);
          }
          if (upgrade.grantsTier && upgrade.grantsTier > p.tier) {
            p.tier = upgrade.grantsTier;
            state.bus.emit('tierReached', { tier: p.tier, player: b.player });
            state.bus.emit('alert', {
              kind: 'upgradeComplete',
              message: `Your fortress has grown: ${upgrade.name}.`,
              player: b.player,
            });
          } else {
            state.bus.emit('alert', {
              kind: 'upgradeComplete',
              message: `${upgrade.name} research complete.`,
              player: b.player,
            });
          }
        }
        state.bus.emit('upgradeCompleted', { upgradeId, player: b.player });
      }
    }
  }
}

/** Queue a unit at a building; pays cost + command. Returns error or null. */
export function tryQueueUnit(state: MatchState, building: Building, unitId: string): string | null {
  const def = getUnit(unitId);
  const p = state.players[building.player];
  if (building.trainQueue.length >= 5) return 'Queue is full';
  if (p.commandUsed + def.commandCost > p.commandCap) return 'Not enough command';
  if (!state.payCost(building.player, def.cost)) return 'Not enough resources';
  const totalTicks = def.trainSecs * TICK_RATE;
  building.trainQueue.push({ unitId, ticksRemaining: totalTicks, totalTicks });
  // Reserve command immediately so the cap can't be overshot by queueing.
  p.commandUsed += def.commandCost;
  return null;
}
