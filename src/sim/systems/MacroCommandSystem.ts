import { dist, type Vec2 } from '@/core/mathUtils';
import {
  ASSAULT_FLAG_RADIUS,
  HARASS_SPEED_THRESHOLD,
  MACRO_RECONCILE_SECS,
  MARCH_FLAG_RADIUS,
  MARCH_REGROUP_FRACTION,
  TICK_RATE,
} from '@/data/balance';
import { MILITARY_ROLES, type UnitRole } from '@/data/types';
import type { PlayerId } from '../commands';
import type { MatchState, PlayerState } from '../MatchState';
import { Building, Flag, Unit } from '../entities/Entity';

const PERIOD_TICKS = MACRO_RECONCILE_SECS * TICK_RATE;

/**
 * The heart of the macro game (GDD §15): reconciles allocation sliders into
 * per-unit attack/defend assignments, marches attack pools along numbered
 * flags with regroup-then-advance behavior, and posts defenders at
 * threatened structures.
 */
export function macroCommandSystem(state: MatchState): void {
  if (state.tick % PERIOD_TICKS !== 0) return;

  for (const p of state.players) {
    if (p.defeated) continue;
    reconcileAssignments(state, p);
    driveAttackPool(state, p);
    driveDefendPool(state, p);
  }

  // Expire temporary flags.
  for (const f of state.flags) {
    if (f.expiresTick !== null && f.expiresTick <= state.tick) f.dead = true;
  }
}

/** Is this unit available for macro steering? */
function macroSteerable(u: Unit): boolean {
  if (u.dead || u.def.role === 'worker') return false;
  if (u.task.kind === 'rout' || u.task.kind === 'garrison' || u.task.kind === 'trade') return false;
  if ((u.task.kind === 'move' || u.task.kind === 'gather') && u.task.pinned) return false;
  return true;
}

function reconcileAssignments(state: MatchState, p: PlayerState): void {
  const fullAssault = p.fullAssaultUntilTick !== null && p.fullAssaultUntilTick > state.tick;
  const byRole = new Map<UnitRole, Unit[]>();
  for (const role of MILITARY_ROLES) byRole.set(role, []);
  for (const u of state.units) {
    if (u.player !== p.id || !macroSteerable(u)) continue;
    byRole.get(u.def.role)?.push(u);
  }

  for (const role of MILITARY_ROLES) {
    const units = byRole.get(role)!;
    if (units.length === 0) continue;
    let attackCount = 0;
    if (fullAssault) {
      attackCount = units.length;
    } else if (p.stanceAttack) {
      attackCount = Math.floor((units.length * (p.attackAlloc[role] ?? 0)) / 100);
    }
    // Stable: keep existing attackers first, then fill by id order.
    units.sort((a, b) => Number(b.assignment === 'attack') - Number(a.assignment === 'attack') || a.id - b.id);
    for (let i = 0; i < units.length; i++) {
      units[i].assignment = i < attackCount ? 'attack' : 'defend';
    }
  }
}

function orderedAttackFlags(state: MatchState, player: PlayerId): Flag[] {
  return state.flags
    .filter((f) => !f.dead && f.player === player && (f.flagType === 'march' || f.flagType === 'assault' || f.flagType === 'siege'))
    .sort((a, b) => a.order - b.order);
}

function driveAttackPool(state: MatchState, p: PlayerState): void {
  const pool: Unit[] = [];
  for (const u of state.units) {
    if (u.player !== p.id || !macroSteerable(u) || u.assignment !== 'attack') continue;
    pool.push(u);
  }
  if (pool.length === 0) return;

  const flags = orderedAttackFlags(state, p.id);
  const harassFlags = state.flags.filter((f) => !f.dead && f.player === p.id && f.flagType === 'harass');
  const enemyFortress = state.fortressOf(p.id === 0 ? 1 : 0);

  // Advance the flag pointer when enough of the pool has regrouped at a march flag.
  if (p.attackFlagIndex >= flags.length) p.attackFlagIndex = Math.max(0, flags.length - 1);
  let currentFlag: Flag | null = flags.length > 0 ? flags[Math.min(p.attackFlagIndex, flags.length - 1)] : null;
  if (currentFlag && currentFlag.flagType === 'march') {
    const near = pool.filter((u) => dist(u.pos, currentFlag!.pos) < MARCH_FLAG_RADIUS).length;
    if (near / pool.length >= MARCH_REGROUP_FRACTION && p.attackFlagIndex < flags.length - 1) {
      p.attackFlagIndex++;
      currentFlag = flags[p.attackFlagIndex];
    }
  }

  const dest: Vec2 | null = currentFlag ? currentFlag.pos : enemyFortress ? enemyFortress.pos : null;
  if (!dest) return;

  // Pool centroid → layered offset for ranged units (stay behind the line).
  let cx = 0;
  let cy = 0;
  for (const u of pool) {
    cx += u.pos.x;
    cy += u.pos.y;
  }
  cx /= pool.length;
  cy /= pool.length;
  const toDest = { x: dest.x - cx, y: dest.y - cy };
  const len = Math.hypot(toDest.x, toDest.y) || 1;
  const back = { x: -toDest.x / len, y: -toDest.y / len };

  const siegeFlag = flags.find((f) => f.flagType === 'siege');

  for (const u of pool) {
    // Busy fighting: leave them to it.
    if (u.task.kind === 'fight') continue;

    // Harass: fast units peel off to harass flags.
    if (harassFlags.length > 0 && u.def.speed >= HARASS_SPEED_THRESHOLD && u.def.role !== 'siege') {
      let nearest = harassFlags[0];
      let bestD = Infinity;
      for (const f of harassFlags) {
        const d = dist(u.pos, f.pos);
        if (d < bestD) {
          bestD = d;
          nearest = f;
        }
      }
      if (bestD > 6) {
        u.task = { kind: 'macroMove', dest: { ...nearest.pos } };
        u.macroTargetFlagId = nearest.id;
      }
      continue;
    }

    // Siege units prefer the siege flag when one exists.
    let target = dest;
    if (siegeFlag && u.def.role === 'siege') target = siegeFlag.pos;

    // Ranged trail behind the centroid's advance.
    if (u.def.role === 'ranged') {
      target = { x: target.x + back.x * 4, y: target.y + back.y * 4 };
    }

    const arrive = currentFlag?.flagType === 'assault' ? ASSAULT_FLAG_RADIUS * 0.6 : 3.5;
    if (dist(u.pos, target) > arrive) {
      if (u.task.kind !== 'macroMove' || dist(u.task.dest, target) > 3) {
        u.task = { kind: 'macroMove', dest: { ...target } };
      }
    } else if (u.task.kind === 'macroMove') {
      u.task = { kind: 'idle' }; // combat system will engage from here
    }
  }
}

/** Structures worth guarding, weighted by recent threats. */
function guardPosts(state: MatchState, p: PlayerState): { pos: Vec2; weight: number; id: number }[] {
  const posts: { pos: Vec2; weight: number; id: number }[] = [];
  const defendFlags = state.flags.filter((f) => !f.dead && f.player === p.id && f.flagType === 'defend');
  for (const f of defendFlags) posts.push({ pos: f.pos, weight: 3, id: f.id });

  for (const b of state.buildings) {
    if (b.dead || b.player !== p.id || !b.complete) continue;
    let weight = 0;
    if (b.def.kind === 'fortress') weight = 2;
    else if (b.def.isGate) weight = 1.2;
    else if (b.def.kind === 'economy' && b.def.gatherResource) weight = 1;
    else if (b.def.kind === 'defense' && !b.def.isWall) weight = 0.8;
    if (weight === 0) continue;
    // Boost weight when threatened recently.
    for (const threat of p.recentThreats) {
      if (threat.expiresTick > state.tick && dist(threat.pos, b.pos) < 14) {
        weight += 4;
        break;
      }
    }
    posts.push({ pos: b.pos, weight, id: b.id });
  }
  return posts;
}

function driveDefendPool(state: MatchState, p: PlayerState): void {
  const pool: Unit[] = [];
  for (const u of state.units) {
    if (u.player !== p.id || !macroSteerable(u) || u.assignment !== 'defend') continue;
    pool.push(u);
  }
  if (pool.length === 0) return;

  const posts = guardPosts(state, p);
  if (posts.length === 0) return;
  const totalWeight = posts.reduce((sum, post) => sum + post.weight, 0);

  // Desired counts per post, proportional to weight.
  const desired = posts.map((post) => Math.round((pool.length * post.weight) / totalWeight));

  // Assign units keeping current posts when still desired.
  const assignedCounts = new Map<number, number>();
  const unassigned: Unit[] = [];
  for (const u of pool) {
    if (u.task.kind === 'fight') continue;
    const postIdx = posts.findIndex((post) => post.id === u.guardPostId);
    if (postIdx >= 0 && (assignedCounts.get(postIdx) ?? 0) < desired[postIdx]) {
      assignedCounts.set(postIdx, (assignedCounts.get(postIdx) ?? 0) + 1);
    } else {
      u.guardPostId = null;
      unassigned.push(u);
    }
  }
  for (const u of unassigned) {
    // Nearest post with an opening.
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < posts.length; i++) {
      if ((assignedCounts.get(i) ?? 0) >= desired[i]) continue;
      const d = dist(u.pos, posts[i].pos);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) bestIdx = 0;
    assignedCounts.set(bestIdx, (assignedCounts.get(bestIdx) ?? 0) + 1);
    u.guardPostId = posts[bestIdx].id;
  }

  // Move to post if far.
  for (const u of pool) {
    if (u.task.kind === 'fight') continue;
    const post = posts.find((post) => post.id === u.guardPostId);
    if (!post) continue;
    const d = dist(u.pos, post.pos);
    if (d > 7) {
      if (u.task.kind !== 'macroMove' || dist(u.task.dest, post.pos) > 3) {
        u.task = { kind: 'macroMove', dest: { ...post.pos } };
      }
    } else if (u.task.kind === 'macroMove') {
      u.task = { kind: 'idle' };
    }
  }
}
