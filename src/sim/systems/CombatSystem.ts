import { dist } from '@/core/mathUtils';
import {
  COUNTER_TABLE,
  FORTRESS_BALLISTA,
  MORALE_MIN_MULT,
  PROJECTILE_SPEED,
  RETALIATE_LEASH,
  SIEGE_PROJECTILE_SPEED,
  TAG_COUNTERS,
  TARGET_ACQUIRE_PERIOD_TICKS,
  TICK_RATE,
  TICK_SECS,
} from '@/data/balance';
import type { PlayerId } from '../commands';
import type { MatchState } from '../MatchState';
import { Building, Entity, Projectile, Unit } from '../entities/Entity';
import { applyDamage } from './damage';
import { stepToward } from './moveHelpers';
import { buildingStat, unitStat } from './statHelpers';

const scratch: number[] = [];

export function counterMultiplier(attacker: Unit, defender: Entity): number {
  let mult = 1;
  if (defender instanceof Unit) {
    mult *= COUNTER_TABLE[attacker.def.role]?.[defender.def.role] ?? 1;
    for (const tc of TAG_COUNTERS) {
      if (tc.attackerTag && !attacker.def.tags.includes(tc.attackerTag as never)) continue;
      if (tc.attackerRole && attacker.def.role !== tc.attackerRole) continue;
      if (tc.defenderRole && defender.def.role !== tc.defenderRole) continue;
      if (tc.defenderTag && !defender.def.tags.includes(tc.defenderTag as never)) continue;
      mult *= tc.mult;
    }
  }
  return mult;
}

export function moraleMultiplier(unit: Unit): number {
  return MORALE_MIN_MULT + unit.morale / 200;
}

/** Effective damage a unit deals to a target before armor. */
export function attackDamage(state: MatchState, attacker: Unit, target: Entity): number {
  let dmg = unitStat(state, attacker, attacker.def.damage, 'damage');
  dmg *= counterMultiplier(attacker, target);
  dmg *= moraleMultiplier(attacker);
  // Defensive bonus upgrade (War Academy).
  if (attacker.assignment === 'defend') {
    dmg = state.players[attacker.player].mods.apply(dmg, ['defend.damage']);
  }
  return dmg;
}

function isRanged(unit: Unit): boolean {
  return unit.def.range > 0.9;
}

/** Find the best enemy target for a unit within `radius`. */
export function acquireTarget(state: MatchState, unit: Unit, radius: number): Entity | null {
  const attacking = unit.assignment === 'attack';
  let best: Entity | null = null;
  let bestScore = -Infinity;
  state.unitHash.query(unit.pos, radius, scratch);
  for (const id of scratch) {
    const other = state.unit(id);
    if (!other || other.player === unit.player || other.player < 0) continue;
    const d = dist(unit.pos, other.pos);
    // Prefer close targets we counter; siege prefers buildings (below).
    let score = -d;
    score += (counterMultiplier(unit, other) - 1) * 6;
    if (other.def.role === 'worker') score -= 2; // soldiers first
    if (unit.def.role === 'siege' && !unit.def.tags.includes('defensive')) score -= 20;
    if (score > bestScore) {
      bestScore = score;
      best = other;
    }
  }
  // Buildings: siege actively prefers them; attackers raze whatever is on the
  // way (camps, towers, houses) before the enemy fortress; defenders mostly
  // ignore buildings unless nothing else is around.
  const buildingBias = unit.def.role === 'siege' && !unit.def.tags.includes('defensive') ? 25 : attacking ? -1.5 : -8;
  state.buildingHash.query(unit.pos, radius, scratch);
  for (const id of scratch) {
    const b = state.building(id);
    if (!b || b.player === unit.player || b.player < 0) continue;
    const d = dist(unit.pos, b.pos);
    let score = -d + buildingBias;
    // The main castle comes last: clear its supporting structures first.
    if (attacking && b.def.kind === 'fortress') score -= 7;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best;
}

/**
 * Combat: engagement checks every few ticks, chase + attack execution every
 * tick, worker flee behavior, and static building (tower) attacks.
 */
export function combatSystem(state: MatchState): void {
  const acquireTick = state.tick % TARGET_ACQUIRE_PERIOD_TICKS === 0;

  for (const unit of state.units) {
    if (unit.dead) continue;
    if (unit.attackCooldown > 0) unit.attackCooldown -= TICK_SECS;
    const task = unit.task;

    // Engagement checks (cheap, periodic).
    if (acquireTick && unit.def.role !== 'worker' && unit.def.damage > 0) {
      if (task.kind === 'idle') {
        // A held unit only picks targets already inside its weapon range —
        // acquiring at full LOS would make it flip between fight and idle every
        // few ticks against something it has no intention of walking toward.
        const reach = unit.holdPosition
          ? unitStat(state, unit, unit.def.range, 'range') + 0.5
          : unit.def.los;
        const target = acquireTarget(state, unit, reach);
        if (target) unit.task = { kind: 'fight', targetId: target.id, returnTo: { ...unit.pos } };
      } else if (task.kind === 'move' && task.attackMove) {
        const target = acquireTarget(state, unit, unit.def.los);
        if (target) unit.task = { kind: 'fight', targetId: target.id, returnTo: { ...task.dest } };
      } else if (task.kind === 'macroMove' && unit.assignment === 'attack') {
        // Marching armies engage whatever crosses their path — workers,
        // defenders, towers — instead of beelining to the destination.
        const target = acquireTarget(state, unit, unit.def.los);
        if (target) unit.task = { kind: 'fight', targetId: target.id, returnTo: { ...task.dest } };
      }
    }

    // Worker flee: damaged and enemies near → run home (GDD civilian flee).
    if (acquireTick && unit.def.role === 'worker' && unit.hp < unit.maxHp * 0.999 && unit.task.kind !== 'move') {
      const threat = acquireTarget(state, unit, 7);
      if (threat instanceof Unit) {
        const fortress = state.fortressOf(unit.player);
        if (fortress) {
          unit.task = { kind: 'move', dest: { ...fortress.pos }, path: null, attackMove: false };
          state.bus.emit('alert', {
            kind: 'civiliansUnderAttack',
            message: 'Your civilians are under attack!',
            pos: unit.pos,
            player: unit.player,
          });
        }
      }
    }

    // Fight execution.
    if (unit.task.kind === 'fight') {
      const fight = unit.task;
      const target = state.entities.get(fight.targetId);
      if (!target || target.dead) {
        // Re-acquire nearby, else return to post.
        const next = acquireTick ? acquireTarget(state, unit, unit.def.los) : null;
        if (next) {
          unit.task = { kind: 'fight', targetId: next.id, returnTo: fight.returnTo };
        } else if (fight.returnTo && dist(unit.pos, fight.returnTo) > 3) {
          unit.task = { kind: 'move', dest: fight.returnTo, path: null, attackMove: unit.assignment === 'attack' };
        } else {
          unit.task = { kind: 'idle' };
        }
        continue;
      }

      // Leash: defenders don't chase forever.
      if (fight.returnTo && unit.assignment !== 'attack' && dist(unit.pos, fight.returnTo) > RETALIATE_LEASH) {
        unit.task = { kind: 'move', dest: fight.returnTo, path: null, attackMove: false };
        continue;
      }

      const range = unitStat(state, unit, unit.def.range, 'range');
      const targetRadius = target instanceof Building ? Math.max(target.def.footprint[0], target.def.footprint[1]) / 2 : 0.4;
      const d = dist(unit.pos, target.pos) - targetRadius;
      if (d > range) {
        // Hold position: shoot what walks into range, never chase it.
        if (unit.holdPosition) {
          unit.task = { kind: 'idle' };
          continue;
        }
        stepToward(state, unit, target.pos, range + targetRadius);
      } else {
        unit.facing = Math.atan2(target.pos.y - unit.pos.y, target.pos.x - unit.pos.x);
        if (unit.attackCooldown <= 0) {
          const period = unit.def.attackPeriodSecs / Math.max(0.1, unitStat(state, unit, 1, 'attackSpeed'));
          unit.attackCooldown = period;
          performAttack(state, unit, target);
        }
      }
    }
  }

  // Static defenses: towers and fortresses fire on nearby enemies.
  for (const b of state.buildings) {
    if (b.dead || !b.complete || !b.def.attack || b.player < 0) continue;
    if (b.attackCooldown > 0) b.attackCooldown -= TICK_SECS;
    if (b.ballistaCooldown > 0) b.ballistaCooldown -= TICK_SECS;

    const attack = b.def.attack;
    if (b.attackCooldown <= 0) {
      const target = nearestEnemyUnit(state, b.pos, b.player, attack.range);
      if (target) {
        b.attackCooldown = attack.periodSecs;
        const dmg = buildingStat(state, b, attack.damage, 'attackDamage');
        state.addProjectile(
          new Projectile({
            player: b.player,
            pos: { x: b.pos.x, y: b.pos.y },
            targetId: target.id,
            targetPos: { ...target.pos },
            speed: PROJECTILE_SPEED,
            damage: dmg,
            pierce: attack.pierce ?? true,
            splash: 0,
            bonusVsBuildings: 0,
            arc: 'flat',
          }),
        );
      }
    }

    // Tier-4 fortresses mount a rooftop ballista for extra defensive shots.
    if (b.def.kind === 'fortress' && state.players[b.player].tier >= 4 && b.ballistaCooldown <= 0) {
      const target = nearestEnemyUnit(state, b.pos, b.player, FORTRESS_BALLISTA.range);
      if (target) {
        b.ballistaCooldown = FORTRESS_BALLISTA.periodSecs;
        const dmg = buildingStat(state, b, FORTRESS_BALLISTA.damage, 'attackDamage');
        state.addProjectile(
          new Projectile({
            player: b.player,
            pos: { x: b.pos.x, y: b.pos.y },
            targetId: target.id,
            targetPos: { ...target.pos },
            speed: SIEGE_PROJECTILE_SPEED,
            damage: dmg,
            pierce: true,
            splash: FORTRESS_BALLISTA.splash,
            bonusVsBuildings: 0,
            arc: 'lob',
          }),
        );
      }
    }
  }
}

/** Nearest living enemy unit within range of a point. */
function nearestEnemyUnit(state: MatchState, pos: { x: number; y: number }, player: number, range: number): Unit | null {
  let target: Unit | null = null;
  let bestD = Infinity;
  state.unitHash.query(pos, range, scratch);
  for (const id of scratch) {
    const u = state.unit(id);
    if (!u || u.player === player || u.player < 0) continue;
    const d = dist(pos, u.pos);
    if (d < bestD) {
      bestD = d;
      target = u;
    }
  }
  return target;
}

/**
 * Applies an on-hit damage-over-time to a unit target. Shared by the melee path
 * here and the projectile impact path so the two can't drift apart again.
 */
export function applyDot(
  state: MatchState,
  target: Entity,
  dot: { dps: number; secs: number } | undefined,
  sourcePlayer: PlayerId,
): void {
  if (!dot || !(target instanceof Unit) || target.dead) return;
  target.dots.push({
    dps: dot.dps,
    expiresTick: state.tick + dot.secs * TICK_RATE,
    sourcePlayer,
  });
}

function performAttack(state: MatchState, attacker: Unit, target: Entity): void {
  const dmg = attackDamage(state, attacker, target);
  if (isRanged(attacker)) {
    state.addProjectile(
      new Projectile({
        player: attacker.player,
        pos: { x: attacker.pos.x, y: attacker.pos.y },
        targetId: target.id,
        targetPos: { ...target.pos },
        speed: attacker.def.role === 'siege' ? SIEGE_PROJECTILE_SPEED : PROJECTILE_SPEED,
        damage: dmg,
        pierce: attacker.def.role !== 'siege',
        splash: attacker.def.splash ?? 0,
        bonusVsBuildings: attacker.def.bonusVsBuildings ?? 0,
        arc: attacker.def.role === 'siege' ? 'lob' : 'flat',
        // Rides along on the projectile so ranged fire/poison units actually
        // apply their DoT — it used to be applied only on the melee path, so
        // every ranged unit with `dotOnHit` silently lost it.
        dotOnHit: attacker.def.dotOnHit,
      }),
    );
  } else {
    applyDamage(state, target, dmg, {
      pierce: false,
      bonusVsBuildings: attacker.def.bonusVsBuildings,
      sourcePlayer: attacker.player,
    });
    applyDot(state, target, attacker.def.dotOnHit, attacker.player);
  }
}
