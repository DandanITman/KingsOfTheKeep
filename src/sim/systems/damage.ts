import { MORALE_ALLY_DEATH_PENALTY, MORALE_DEATH_MEMORY_SECS, TICK_RATE } from '@/data/balance';
import type { PlayerId } from '../commands';
import type { MatchState } from '../MatchState';
import { Building, Entity, Unit } from '../entities/Entity';
import { buildingStat, unitStat } from './statHelpers';
import { refundIfUnderConstruction } from './CardSystem';

export interface DamageOpts {
  pierce?: boolean;
  bonusVsBuildings?: number;
  sourcePlayer: PlayerId;
  /** Skip armor entirely (dots, abilities that state raw damage). */
  trueDamage?: boolean;
}

/** Apply damage to a unit or building; handles armor, death, and events. */
export function applyDamage(state: MatchState, target: Entity, raw: number, opts: DamageOpts): void {
  if (target.dead) return;
  let damage = raw;

  // Threat memory for defensive weighting and alerts.
  if (target.player >= 0 && opts.sourcePlayer !== target.player) {
    const p = state.players[target.player];
    p.recentThreats.push({ pos: { ...target.pos }, expiresTick: state.tick + 80 });
    if (p.recentThreats.length > 40) p.recentThreats.shift();
    if (target instanceof Building) {
      if (target.def.kind === 'fortress') {
        state.bus.emit('alert', { kind: 'fortressUnderAttack', message: 'Your Main Fortress is under attack!', pos: target.pos, player: target.player });
      } else {
        state.bus.emit('alert', { kind: 'enemyAttacking', message: `${target.def.name} is under attack!`, pos: target.pos, player: target.player });
      }
    }
  }

  if (target instanceof Unit) {
    if (!opts.trueDamage) {
      const armor = opts.pierce
        ? unitStat(state, target, target.def.pierceArmor, 'pierceArmor')
        : unitStat(state, target, target.def.armor, 'armor');
      damage = Math.max(1, raw - armor);
    }
    target.hp -= damage;
    if (target.hp <= 0) killUnit(state, target);
  } else if (target instanceof Building) {
    if (!opts.trueDamage) {
      const armor = buildingStat(state, target, target.def.armor, 'armor');
      damage = Math.max(1, raw + (opts.bonusVsBuildings ?? 0) - armor);
    }
    target.hp -= damage;
    if (target.hp <= 0) destroyBuilding(state, target);
  }
}

export function killUnit(state: MatchState, unit: Unit): void {
  if (unit.dead) return;
  unit.dead = true;
  const p = state.players[unit.player];
  // Fallen heroes recharge their card before they can be summoned again.
  if (unit.def.hero) {
    const slot = p.cards.find((c) => c.cardId === `card_${unit.defId}`);
    if (slot) slot.cooldownTicks = unit.def.hero.respawnSecs * TICK_RATE;
    state.bus.emit('alert', {
      kind: 'heroFallen',
      message: `${unit.def.name} has fallen! They will return in ${unit.def.hero.respawnSecs}s.`,
      pos: unit.pos,
      player: unit.player,
    });
  }
  p.recentDeaths.push({ pos: { ...unit.pos }, expiresTick: state.tick + MORALE_DEATH_MEMORY_SECS * TICK_RATE });
  if (p.recentDeaths.length > 40) p.recentDeaths.shift();
  state.enemyOf(unit.player).score += unit.def.commandCost * 10;
  state.bus.emit('unitDied', { entityId: unit.id, unitId: unit.defId, player: unit.player, pos: unit.pos });
}

export function destroyBuilding(state: MatchState, b: Building): void {
  if (b.dead) return;
  b.dead = true;
  refundIfUnderConstruction(state, b);
  state.nav.unstamp(b.cell.x, b.cell.y, b.def.footprint[0], b.def.footprint[1]);
  state.buildingHashDirty = true;
  state.enemyOf(b.player).score += 50;
  state.bus.emit('buildingDestroyed', { entityId: b.id, buildingId: b.defId, player: b.player, pos: b.pos });
  if (b.def.isWall) {
    state.bus.emit('alert', { kind: 'wallBreached', message: 'A wall has been breached!', pos: b.pos, player: b.player });
  }
}

/** Apply ally-death morale hit: penalty per nearby recent death (morale system reads recentDeaths). */
export { MORALE_ALLY_DEATH_PENALTY };
