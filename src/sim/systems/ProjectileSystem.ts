import { dist, moveToward } from '@/core/mathUtils';
import { TICK_SECS } from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Building, Unit } from '../entities/Entity';
import { applyDot } from './CombatSystem';
import { applyDamage } from './damage';

const scratch: number[] = [];

/** Moves projectiles and applies damage (with splash) on impact. */
export function projectileSystem(state: MatchState): void {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    // Track living targets; dead targets leave the projectile flying to the last position.
    const target = state.entities.get(p.targetId);
    if (target && !target.dead && target instanceof Unit) {
      p.targetPos = { ...target.pos };
    }
    const step = p.speed * TICK_SECS;
    p.pos = moveToward(p.pos, p.targetPos, step);
    if (dist(p.pos, p.targetPos) < 0.15) {
      p.dead = true;
      impact(state, p);
    }
  }
}

function impact(state: MatchState, p: import('../entities/Entity').Projectile): void {
  const target = state.entities.get(p.targetId);
  if (p.splash > 0) {
    // Area damage around the impact point.
    state.unitHash.query(p.targetPos, p.splash, scratch);
    for (const id of scratch) {
      const u = state.unit(id);
      if (!u || u.player === p.sourcePlayer) continue;
      applyDamage(state, u, p.damage, { pierce: p.pierce, sourcePlayer: p.sourcePlayer });
      applyDot(state, u, p.dotOnHit, p.sourcePlayer);
    }
    state.buildingHash.query(p.targetPos, p.splash + 3, scratch);
    for (const id of scratch) {
      const b = state.building(id);
      if (!b || b.player === p.sourcePlayer) continue;
      if (dist(b.pos, p.targetPos) > p.splash + Math.max(...b.def.footprint) / 2) continue;
      applyDamage(state, b, p.damage, { pierce: false, bonusVsBuildings: p.bonusVsBuildings, sourcePlayer: p.sourcePlayer });
    }
    state.bus.emit('projectileHit', { pos: p.targetPos, splash: p.splash });
  } else if (target && !target.dead && (target instanceof Unit || target instanceof Building)) {
    applyDamage(state, target, p.damage, {
      pierce: p.pierce && target instanceof Unit,
      bonusVsBuildings: p.bonusVsBuildings,
      sourcePlayer: p.sourcePlayer,
    });
    applyDot(state, target, p.dotOnHit, p.sourcePlayer);
  }
}
