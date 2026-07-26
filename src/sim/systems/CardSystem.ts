import { dist } from '@/core/mathUtils';
import type { Vec2 } from '@/core/mathUtils';
import { BUILDING_REFUND_FRACTION, MARKET_TRADE_RATE, MORALE_BASE, TICK_RATE } from '@/data/balance';
import { getBuilding } from '@/data/buildings';
import { getCard } from '@/data/cards';
import { getUnit } from '@/data/units';
import { UPGRADE_DB } from '@/data/upgrades';
import type { BuildingDef, Card } from '@/data/types';
import type { Command, PlayerId } from '../commands';
import type { MatchSim } from '../MatchSim';
import type { MatchState } from '../MatchState';
import { Building, Unit, type UnitTask } from '../entities/Entity';
import { registerCommandHandler } from './CommandSystem';
import { tryQueueUnit } from './TrainingSystem';
import { castAbility } from './AbilitySystem';

// ---------------------------------------------------------------------------
// Placement validation (shared with the UI ghost preview)
// ---------------------------------------------------------------------------

export type PlacementResult = 'ok' | 'inefficient' | 'blocked';

export function validatePlacement(
  state: MatchState,
  def: BuildingDef,
  cellX: number,
  cellY: number,
): PlacementResult {
  const [w, h] = def.footprint;
  if (!state.nav.canPlace(cellX, cellY, w, h)) return 'blocked';
  // Keep a 1-cell gap around other buildings so units can path between them
  // (walls are exempt — they're supposed to connect).
  if (!def.isWall) {
    for (const b of state.buildings) {
      if (b.dead || b.def.isWall) continue;
      const [bw, bh] = b.def.footprint;
      if (
        cellX < b.cell.x + bw + 1 &&
        cellX + w + 1 > b.cell.x &&
        cellY < b.cell.y + bh + 1 &&
        cellY + h + 1 > b.cell.y
      ) {
        return 'blocked';
      }
    }
  }
  // Economy camps warn when far from their resource.
  if (def.gatherResource && def.gatherRadius && def.id !== 'farmstead') {
    const center = { x: cellX + w / 2, y: cellY + h / 2 };
    let best = Infinity;
    for (const node of state.nodes) {
      if (node.dead || node.resource !== def.gatherResource) continue;
      best = Math.min(best, dist(center, node.pos));
    }
    if (best > def.gatherRadius) return 'inefficient';
  }
  return 'ok';
}

/** Can this player use this card right now? Returns error string or null. */
export function cardAvailability(state: MatchState, player: PlayerId, card: Card): string | null {
  const p = state.players[player];
  if (card.requirements?.tier && p.tier < card.requirements.tier) {
    return `Requires Tier ${card.requirements.tier}`;
  }
  if (card.requirements?.buildingId) {
    const has = state.buildings.some(
      (b) => !b.dead && b.complete && b.player === player && b.defId === card.requirements!.buildingId,
    );
    if (!has) return `Requires ${getBuilding(card.requirements.buildingId).name}`;
  }
  const slot = p.cards.find((c) => c.cardId === card.id);
  if (slot && slot.cooldownTicks > 0) return 'Recharging';
  const cost = card.unitId ? getUnit(card.unitId).cost : card.buildingId ? getBuilding(card.buildingId).cost : card.cost ?? {};
  if (!state.canAfford(player, cost)) return 'Not enough resources';
  if (card.unitId) {
    const def = getUnit(card.unitId);
    if (p.commandUsed + def.commandCost > p.commandCap) return 'Not enough command';
    if (card.type === 'hero') {
      const alive = state.units.some((u) => !u.dead && u.player === player && u.defId === card.unitId);
      if (alive) return 'Hero is in the field';
    }
    if (card.type !== 'hero' && def.trainedAt) {
      const trainer = state.buildings.find(
        (b) => !b.dead && b.complete && b.player === player && b.def.trainKey === def.trainedAt,
      );
      if (!trainer) return `Requires ${trainerName(def.trainedAt)}`;
    }
  }
  return null;
}

function trainerName(trainKey: string): string {
  const names: Record<string, string> = {
    fortress: 'Main Fortress',
    barracks: 'Barracks',
    archeryRange: 'Archery Range',
    stable: 'Stable',
    siegeWorkshop: 'Siege Workshop',
    market: 'Market',
  };
  return names[trainKey] ?? trainKey;
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

export function registerCardHandlers(): void {
  registerCommandHandler('playCard', (sim, cmd) => {
    if (cmd.kind !== 'playCard') return;
    playCard(sim, cmd);
  });

  registerCommandHandler('trainUnit', (sim, cmd) => {
    if (cmd.kind !== 'trainUnit') return;
    const b = sim.state.building(cmd.buildingId);
    if (!b || b.player !== cmd.player || !b.complete) return;
    const error = tryQueueUnit(sim.state, b, cmd.unitId);
    if (error && !sim.state.players[cmd.player].isBot) {
      sim.state.bus.emit('alert', {
        kind: error.includes('command') ? 'notEnoughCommand' : 'notEnoughResources',
        message: error,
        player: cmd.player,
      });
    }
  });

  registerCommandHandler('setAutoTrain', (sim, cmd) => {
    if (cmd.kind !== 'setAutoTrain') return;
    const b = sim.state.building(cmd.buildingId);
    if (!b || b.player !== cmd.player) return;
    if (cmd.unitId !== null && getUnit(cmd.unitId).trainedAt !== b.def.trainKey) return;
    b.autoTrainUnitId = cmd.unitId;
  });

  registerCommandHandler('cancelTrain', (sim, cmd) => {
    if (cmd.kind !== 'cancelTrain') return;
    const b = sim.state.building(cmd.buildingId);
    if (!b || b.player !== cmd.player) return;
    const item = b.trainQueue[cmd.queueIndex];
    if (!item) return;
    b.trainQueue.splice(cmd.queueIndex, 1);
    const def = getUnit(item.unitId);
    sim.state.refund(cmd.player, def.cost, 1);
    sim.recomputeCommand();
  });

  registerCommandHandler('setRally', (sim, cmd) => {
    if (cmd.kind !== 'setRally') return;
    const b = sim.state.building(cmd.buildingId);
    if (!b || b.player !== cmd.player) return;
    b.rallyPoint = { ...cmd.pos };
  });

  registerCommandHandler('startUpgrade', (sim, cmd) => {
    if (cmd.kind !== 'startUpgrade') return;
    const s = sim.state;
    const b = s.building(cmd.buildingId);
    const upgrade = UPGRADE_DB.get(cmd.upgradeId);
    if (!b || !upgrade || b.player !== cmd.player || !b.complete || b.research) return;
    const p = s.players[cmd.player];
    if (p.completedUpgrades.has(upgrade.id)) return;
    if (upgrade.tier > p.tier) return;
    if (!s.payCost(cmd.player, upgrade.cost)) {
      if (!p.isBot) s.bus.emit('alert', { kind: 'notEnoughResources', message: 'Not enough resources.', player: cmd.player });
      return;
    }
    const totalTicks = upgrade.researchSecs * TICK_RATE;
    b.research = { upgradeId: upgrade.id, ticksRemaining: totalTicks, totalTicks };
  });

  registerCommandHandler('directBuild', (sim, cmd) => {
    if (cmd.kind !== 'directBuild') return;
    const site = sim.state.building(cmd.buildingId);
    if (!site || site.player !== cmd.player) return;
    for (const id of cmd.unitIds) {
      const u = sim.state.unit(id);
      if (!u || u.player !== cmd.player || u.def.role !== 'worker') continue;
      const task: UnitTask = site.underConstruction
        ? { kind: 'build', buildingId: site.id, pinned: true }
        : { kind: 'repair', buildingId: site.id, pinned: true };
      if (cmd.queue) {
        u.orders.push(task);
      } else {
        u.orders.length = 0;
        u.holdPosition = false;
        u.task = task;
      }
    }
  });

  registerCommandHandler('marketTrade', (sim, cmd) => {
    if (cmd.kind !== 'marketTrade') return;
    const s = sim.state;
    const p = s.players[cmd.player];
    const hasMarket = s.buildings.some(
      (b) => !b.dead && b.complete && b.player === cmd.player && (b.def.trainKey === 'market' || b.defId.includes('bazaar')),
    );
    if (!hasMarket || cmd.sell === cmd.buy) return;
    const amount = Math.min(cmd.amount, p.resources[cmd.sell]);
    if (amount <= 0) return;
    const rate = p.mods.apply(MARKET_TRADE_RATE, ['marketRate']);
    p.resources[cmd.sell] -= amount;
    p.resources[cmd.buy] += Math.floor(amount * rate);
  });
}

function playCard(sim: MatchSim, cmd: Command & { kind: 'playCard' }): void {
  const s = sim.state;
  const p = s.players[cmd.player];
  const card = getCard(cmd.cardId);
  const error = cardAvailability(s, cmd.player, card);
  if (error) {
    if (!p.isBot) s.bus.emit('alert', { kind: 'notEnoughResources', message: `${card.name}: ${error}`, player: cmd.player });
    return;
  }

  if (card.buildingId) {
    const def = getBuilding(card.buildingId);
    if (!cmd.target) return;
    let [w, h] = def.footprint;
    if (cmd.rotation === 1) [w, h] = [h, w];
    const cellX = Math.round(cmd.target.x - w / 2);
    const cellY = Math.round(cmd.target.y - h / 2);
    const result = validatePlacement(s, def, cellX, cellY);
    if (result === 'blocked') {
      if (!p.isBot) s.bus.emit('alert', { kind: 'notEnoughResources', message: 'Cannot build there.', player: cmd.player });
      return;
    }
    if (!s.payCost(cmd.player, def.cost)) return;
    const rotatedDef = cmd.rotation === 1 ? { ...def, footprint: [w, h] as [number, number] } : def;
    const building = new Building(cmd.player, { x: cellX + w / 2, y: cellY + h / 2 }, rotatedDef, { x: cellX, y: cellY }, false);
    // Building hp scales with modifiers at placement time.
    const paths = ['building.hp'];
    if (def.kind === 'defense') paths.push('building.defense.hp');
    building.maxHp = Math.round(p.mods.apply(def.hp, paths));
    s.addBuilding(building);
    s.nav.stamp(cellX, cellY, w, h, { wall: def.isWall, gate: def.isGate, player: cmd.player });
    s.bus.emit('buildingPlaced', { entityId: building.id, buildingId: def.id, player: cmd.player, pos: building.pos });
    s.bus.emit('cardPlayed', { cardId: card.id, player: cmd.player });

    // Send nearby idle/gathering workers to build it (up to 3).
    autoAssignBuilders(s, cmd.player, building);
  } else if (card.type === 'hero' && card.unitId) {
    // Heroes muster instantly at the fortress gates.
    const def = getUnit(card.unitId);
    const fortress = s.fortressOf(cmd.player);
    if (!fortress) return;
    if (!s.payCost(cmd.player, def.cost)) return;
    const pos = s.nav.nearestFree({ x: fortress.pos.x, y: fortress.pos.y + fortress.def.footprint[1] / 2 + 1.5 });
    const unit = new Unit(cmd.player, pos, def, MORALE_BASE);
    s.addUnit(unit);
    sim.recomputeCommand();
    s.bus.emit('unitSpawned', { entityId: unit.id, unitId: def.id, player: cmd.player, pos: unit.pos });
    s.bus.emit('alert', { kind: 'heroReturned', message: `${def.name} has taken the field!`, pos: unit.pos, player: cmd.player });
    s.bus.emit('cardPlayed', { cardId: card.id, player: cmd.player });
  } else if (card.unitId) {
    const def = getUnit(card.unitId);
    // Find the least-busy completed trainer building.
    let best: Building | null = null;
    for (const b of s.buildings) {
      if (b.dead || !b.complete || b.player !== cmd.player || b.def.trainKey !== def.trainedAt) continue;
      if (!best || b.trainQueue.length < best.trainQueue.length) best = b;
    }
    if (!best) return;
    const err = tryQueueUnit(s, best, def.id);
    if (err) {
      if (!p.isBot) s.bus.emit('alert', { kind: 'notEnoughResources', message: err, player: cmd.player });
      return;
    }
    s.bus.emit('cardPlayed', { cardId: card.id, player: cmd.player });
  } else if (card.ability) {
    castAbility(sim, cmd.player, card, cmd.target ?? null);
  }
}

/** Pull up to `max` nearby non-carrying workers onto a new construction site. */
export function autoAssignBuilders(s: MatchState, player: PlayerId, site: Building, max = 3): void {
  const workers = s.units
    .filter(
      (u) =>
        !u.dead &&
        u.player === player &&
        u.def.role === 'worker' &&
        !u.carrying &&
        (u.task.kind === 'idle' || (u.task.kind === 'gather' && !u.task.pinned)),
    )
    .sort((a, b) => dist(a.pos, site.pos) - dist(b.pos, site.pos))
    .slice(0, max);
  for (const w of workers) {
    w.task = { kind: 'build', buildingId: site.id };
  }
}

/** Destroyed while under construction → partial refund (GDD §17.2). */
export function refundIfUnderConstruction(s: MatchState, b: Building): void {
  if (b.underConstruction) {
    s.refund(b.player, b.def.cost, BUILDING_REFUND_FRACTION * (1 - b.progress));
  }
}
