import { dist } from '@/core/mathUtils';
import { GARRISON_RANGE_BONUS, PROJECTILE_SPEED } from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Projectile, Unit } from '../entities/Entity';
import { stepToward } from './moveHelpers';
import { attackDamage } from './CombatSystem';
import { unitStat } from './statHelpers';

const scratch: number[] = [];

/** Rooftop slot for the i-th garrisoned unit, spread around the keep's edge. */
function slotPos(b: { pos: { x: number; y: number }; def: { footprint: [number, number] } }, i: number): { x: number; y: number } {
  const r = Math.max(b.def.footprint[0], b.def.footprint[1]) * 0.32;
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return { x: b.pos.x + Math.cos(angle) * r, y: b.pos.y + Math.sin(angle) * r };
}

/**
 * Fortress garrison: ranged units ordered onto the walls walk to the keep,
 * mount it, and fire independently at nearby enemies with an elevation range
 * bonus. Ejects everyone if the keep falls.
 */
export function garrisonSystem(state: MatchState): void {
  for (const unit of state.units) {
    if (unit.dead) continue;

    // Walking to the keep.
    if (unit.task.kind === 'garrison' && unit.garrisonedIn === null) {
      const b = state.building(unit.task.buildingId);
      if (!b) {
        unit.task = { kind: 'idle' };
        continue;
      }
      const arrive = Math.max(b.def.footprint[0], b.def.footprint[1]) / 2 + 0.8;
      if (stepToward(state, unit, b.pos, arrive)) {
        unit.garrisonedIn = b.id;
        const idx = state.units.filter((u) => !u.dead && u.garrisonedIn === b.id).length - 1;
        unit.pos = slotPos(b, idx);
        unit.prevPos = { ...unit.pos };
      }
      continue;
    }

    // Mounted: hold position and shoot.
    if (unit.garrisonedIn !== null) {
      const b = state.building(unit.garrisonedIn);
      if (!b) {
        // Keep destroyed: drop to the ground where it stood.
        unit.garrisonedIn = null;
        unit.pos = state.nav.nearestFree(unit.pos);
        unit.prevPos = { ...unit.pos };
        unit.task = { kind: 'idle' };
        continue;
      }
      unit.prevPos = { ...unit.pos };
      if (unit.attackCooldown > 0) continue;
      const range = unitStat(state, unit, unit.def.range, 'range') + GARRISON_RANGE_BONUS;
      let target: Unit | null = null;
      let bestD = Infinity;
      state.unitHash.query(unit.pos, range, scratch);
      for (const id of scratch) {
        const other = state.unit(id);
        if (!other || other.player === unit.player || other.player < 0 || other.garrisonedIn !== null) continue;
        const d = dist(unit.pos, other.pos);
        if (d < bestD) {
          bestD = d;
          target = other;
        }
      }
      if (!target) continue;
      unit.facing = Math.atan2(target.pos.y - unit.pos.y, target.pos.x - unit.pos.x);
      unit.attackCooldown = unit.def.attackPeriodSecs / Math.max(0.1, unitStat(state, unit, 1, 'attackSpeed'));
      state.addProjectile(
        new Projectile({
          player: unit.player,
          pos: { x: unit.pos.x, y: unit.pos.y },
          targetId: target.id,
          targetPos: { ...target.pos },
          speed: PROJECTILE_SPEED,
          damage: attackDamage(state, unit, target),
          pierce: true,
          splash: unit.def.splash ?? 0,
          bonusVsBuildings: unit.def.bonusVsBuildings ?? 0,
          arc: 'flat',
        }),
      );
    }
  }
}
