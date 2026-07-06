import { dist, type Vec2 } from '@/core/mathUtils';
import { MORALE_BASE, TICK_RATE, TICK_SECS } from '@/data/balance';
import { getUnit } from '@/data/units';
import type { AbilityEffect, Card, UnitFilter } from '@/data/types';
import type { PlayerId } from '../commands';
import type { MatchSim } from '../MatchSim';
import type { MatchState } from '../MatchState';
import { Building, Unit } from '../entities/Entity';
import { applyDamage } from './damage';

/**
 * Data-driven ability interpreter (GDD special ability cards, faction powers,
 * hero actives). ~10 atomic effect types compose every ability in the game.
 */
export function castAbility(sim: MatchSim, player: PlayerId, card: Card, target: Vec2 | null): void {
  const s = sim.state;
  const p = s.players[player];
  const ability = card.ability!;
  if ((ability.target === 'point' || ability.target === 'area') && !target) return;
  if (!s.payCost(player, card.cost ?? {})) return;

  const slot = p.cards.find((c) => c.cardId === card.id);
  if (slot && card.cooldownSecs) slot.cooldownTicks = card.cooldownSecs * TICK_RATE;

  const origin = target ?? undefined;
  for (const effect of ability.effects) {
    applyEffect(s, player, effect, origin);
  }
  s.bus.emit('abilityCast', { cardId: card.id, player, pos: target ?? undefined, vfx: ability.vfx });
  s.bus.emit('cardPlayed', { cardId: card.id, player });
}

function matchesFilter(unit: Unit, player: PlayerId, filter?: UnitFilter): boolean {
  if (!filter) return true;
  if (filter.ally !== undefined) {
    const isAlly = unit.player === player;
    if (filter.ally !== isAlly) return false;
  }
  if (filter.roles && !filter.roles.includes(unit.def.role)) return false;
  if (filter.tags && !filter.tags.some((t) => unit.def.tags.includes(t))) return false;
  return true;
}

function applyEffect(s: MatchState, player: PlayerId, effect: AbilityEffect, origin?: Vec2): void {
  switch (effect.type) {
    case 'damageArea': {
      if (!origin) return;
      if (effect.vs !== 'buildings') {
        for (const u of s.units) {
          if (u.dead || u.player === player) continue;
          if (dist(u.pos, origin) > effect.radius) continue;
          applyDamage(s, u, effect.damage, { sourcePlayer: player, trueDamage: true });
          if (effect.dot) {
            u.dots.push({ dps: effect.dot.dps, expiresTick: s.tick + effect.dot.secs * TICK_RATE, sourcePlayer: player });
          }
        }
      }
      if (effect.vs !== 'units') {
        for (const b of s.buildings) {
          if (b.dead || b.player === player) continue;
          if (dist(b.pos, origin) > effect.radius) continue;
          applyDamage(s, b, effect.damage, { sourcePlayer: player, trueDamage: true });
        }
      }
      break;
    }
    case 'buff': {
      const expiresTick = s.tick + effect.durationSecs * TICK_RATE;
      if (effect.stat.startsWith('building.') || effect.stat === 'productionBoost' || effect.stat.startsWith('gatherRate')) {
        s.players[player].mods.add({ stat: effect.stat, op: effect.op, value: effect.value }, `ability:${s.tick}`, expiresTick);
      } else {
        for (const u of s.units) {
          if (u.dead) continue;
          if (origin && effect.radius !== undefined && dist(u.pos, origin) > effect.radius) continue;
          if (!matchesFilter(u, player, effect.filter ?? { ally: true })) continue;
          u.buffs.push({ stat: effect.stat, op: effect.op, value: effect.value, expiresTick });
        }
      }
      break;
    }
    case 'moraleChange': {
      for (const u of s.units) {
        if (u.dead) continue;
        const isAlly = u.player === player;
        if (effect.ally !== isAlly) continue;
        if (origin && dist(u.pos, origin) > effect.radius) continue;
        u.morale = Math.max(0, Math.min(100, u.morale + effect.amount));
      }
      break;
    }
    case 'visionSuppress':
    case 'reveal': {
      if (!origin) return;
      s.activeEffects.push({
        kind: effect.type,
        player,
        pos: { ...origin },
        radius: effect.radius,
        rate: 0,
        expiresTick: s.tick + effect.durationSecs * TICK_RATE,
      });
      break;
    }
    case 'spawnUnits': {
      if (!origin) return;
      const def = getUnit(effect.unitId);
      for (let i = 0; i < effect.count; i++) {
        const angle = (i / effect.count) * Math.PI * 2;
        const pos = s.nav.nearestFree({ x: origin.x + Math.cos(angle) * 1.5, y: origin.y + Math.sin(angle) * 1.5 });
        const unit = new Unit(player, pos, def, MORALE_BASE);
        if (effect.temporarySecs) unit.temporaryTicks = effect.temporarySecs * TICK_RATE;
        s.addUnit(unit);
        s.bus.emit('unitSpawned', { entityId: unit.id, unitId: def.id, player, pos: unit.pos });
      }
      break;
    }
    case 'repair': {
      if (!origin) return;
      s.activeEffects.push({
        kind: 'repair',
        player,
        pos: { ...origin },
        radius: effect.radius,
        rate: effect.hpPerSec,
        expiresTick: s.tick + effect.durationSecs * TICK_RATE,
      });
      break;
    }
    case 'productionBoost': {
      s.players[player].mods.add(
        { stat: 'productionBoost', op: 'mul', value: effect.mul },
        `ability:${s.tick}`,
        s.tick + effect.durationSecs * TICK_RATE,
      );
      break;
    }
    case 'gatherBoost': {
      const stat = effect.resource ? `gatherRate.${effect.resource}` : 'gatherRate';
      s.players[player].mods.add({ stat, op: 'mul', value: effect.mul }, `ability:${s.tick}`, s.tick + effect.durationSecs * TICK_RATE);
      break;
    }
    case 'incomeBurst': {
      s.activeEffects.push({
        kind: 'income',
        player,
        pos: { x: -1, y: -1 },
        radius: 0,
        rate: effect.amountPerSec,
        expiresTick: s.tick + effect.durationSecs * TICK_RATE,
        resource: effect.resource,
      });
      break;
    }
  }
}

/**
 * Ticks active area effects: dots on units, area repair, income bursts.
 * Vision effects are consumed by the fog system.
 */
export function effectsSystem(state: MatchState): void {
  // Unit dots.
  for (const u of state.units) {
    if (u.dead || u.dots.length === 0) continue;
    for (const dot of u.dots) {
      if (dot.expiresTick <= state.tick) continue;
      applyDamage(state, u, dot.dps * TICK_SECS, { sourcePlayer: dot.sourcePlayer, trueDamage: true });
    }
  }

  // Area effects.
  for (const eff of state.activeEffects) {
    if (eff.expiresTick <= state.tick) continue;
    if (eff.kind === 'repair') {
      for (const b of state.buildings) {
        if (b.dead || b.player !== eff.player || b.underConstruction) continue;
        if (dist(b.pos, eff.pos) > eff.radius) continue;
        b.hp = Math.min(b.maxHp, b.hp + eff.rate * TICK_SECS);
      }
    } else if (eff.kind === 'income' && eff.resource) {
      state.addResource(eff.player, eff.resource as never, eff.rate * TICK_SECS);
    }
  }

  // Temporary units expire.
  for (const u of state.units) {
    if (u.dead || u.temporaryTicks === null) continue;
    u.temporaryTicks--;
    if (u.temporaryTicks <= 0) u.dead = true;
  }

  // Prune expired.
  if (state.tick % 20 === 0) {
    state.activeEffects = state.activeEffects.filter((e) => e.expiresTick > state.tick);
    for (const p of state.players) {
      p.mods.prune(state.tick);
      p.recentDeaths = p.recentDeaths.filter((d) => d.expiresTick > state.tick);
    }
  }
}
