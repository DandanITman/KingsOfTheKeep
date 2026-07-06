import { dist, type Vec2 } from '@/core/mathUtils';
import { TICK_RATE } from '@/data/balance';
import { getBuilding } from '@/data/buildings';
import { getCard } from '@/data/cards';
import { getUnit } from '@/data/units';
import { UPGRADE_DB } from '@/data/upgrades';
import type { Card, GatherResource, UnitRole } from '@/data/types';
import type { MatchSim } from '@/sim/MatchSim';
import type { MatchState } from '@/sim/MatchState';
import { Building, Unit } from '@/sim/entities/Entity';
import { validatePlacement, cardAvailability } from '@/sim/systems/CardSystem';
import type { BotProfile } from './BotProfile';

const BOT: 1 = 1;

/**
 * The bot player: a utility-lite planner that issues the same Commands a
 * human does. Personality and difficulty come entirely from BotProfile.
 */
export class BotController {
  private sim: MatchSim;
  private profile: BotProfile;
  private nextPlanTick = 0;
  private attacking = false;
  private lastRaidTick = 0;
  private lastAbilityTick = 0;

  constructor(sim: MatchSim, profile: BotProfile) {
    this.sim = sim;
    this.profile = profile;
    // Mild economy handicap/boost per difficulty.
    sim.state.players[BOT].mods.add(
      { stat: 'gatherRate', op: 'mul', value: profile.ecoMultiplier },
      'bot-difficulty',
    );
  }

  update(): void {
    const s = this.sim.state;
    if (s.winner !== null) return;
    if (s.tick < this.nextPlanTick) return;
    this.nextPlanTick = s.tick + Math.round(this.profile.plannerIntervalSecs * TICK_RATE);

    const p = s.players[BOT];
    if (p.defeated) return;

    this.planWorkers(s);
    this.planWorkerRatios(s);
    this.planBuildings(s);
    this.planTier(s);
    this.planUpgrades(s);
    this.planArmy(s);
    this.planAttack(s);
    if (this.profile.raids) this.planRaids(s);
    if (this.profile.useAbilities) this.planAbilities(s);
  }

  // --- economy ---

  private planWorkers(s: MatchState): void {
    const p = s.players[BOT];
    const fortress = s.fortressOf(BOT);
    if (!fortress || fortress.trainQueue.length > 0) return;
    const workers = s.units.filter((u) => !u.dead && u.player === BOT && u.def.role === 'worker').length;
    const target = this.profile.workerTarget(s.timeSecs / 60);
    if (workers < target) {
      this.sim.enqueue({ kind: 'trainUnit', player: BOT, buildingId: fortress.id, unitId: p.faction.workerUnitId });
    }
  }

  private planWorkerRatios(s: MatchState): void {
    const minutes = s.timeSecs / 60;
    const ratios: Record<GatherResource, number> =
      minutes < 4
        ? { food: 35, wood: 40, stone: 5, gold: 20 }
        : minutes < 8
          ? { food: 30, wood: 30, stone: 15, gold: 25 }
          : { food: 25, wood: 25, stone: 20, gold: 30 };
    this.sim.enqueue({ kind: 'setWorkerRatios', player: BOT, ratios });
  }

  // --- construction ---

  private countOwn(s: MatchState, defId: string): number {
    return s.buildings.filter((b) => !b.dead && b.player === BOT && b.defId === defId).length;
  }

  private pendingConstruction(s: MatchState): number {
    return s.buildings.filter((b) => !b.dead && b.player === BOT && b.underConstruction).length;
  }

  private tryPlace(s: MatchState, cardId: string, near: Vec2, searchRadius = 14): boolean {
    const card = getCard(cardId);
    if (!card.buildingId) return false;
    if (cardAvailability(s, BOT, card) !== null) return false;
    const def = getBuilding(card.buildingId);
    const spot = this.findSpot(s, def, near, searchRadius);
    if (!spot) return false;
    this.sim.enqueue({ kind: 'playCard', player: BOT, cardId, target: spot });
    return true;
  }

  private findSpot(s: MatchState, def: import('@/data/types').BuildingDef, near: Vec2, searchRadius: number): Vec2 | null {
    const [w, h] = def.footprint;
    for (let r = 2; r <= searchRadius; r += 2) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const angle = s.rng.next() * Math.PI * 2;
        const cx = Math.round(near.x + Math.cos(angle) * r - w / 2);
        const cy = Math.round(near.y + Math.sin(angle) * r - h / 2);
        const result = validatePlacement(s, def, cx, cy);
        if (result === 'ok') return { x: cx + w / 2, y: cy + h / 2 };
      }
    }
    return null;
  }

  private planBuildings(s: MatchState): void {
    const p = s.players[BOT];
    const fortress = s.fortressOf(BOT);
    if (!fortress || this.pendingConstruction(s) >= 2) return;
    const workers = s.units.filter((u) => !u.dead && u.player === BOT && u.def.role === 'worker').length;

    // Houses when command is tight.
    if (p.commandCap - p.commandUsed < 6 && p.commandCap < 200) {
      if (this.tryPlace(s, 'card_house', fortress.pos, 16)) return;
    }

    // Drop-off camps near rich nodes.
    const campByResource: Record<string, string> = {
      wood: 'card_lumberCamp',
      gold: 'card_miningCamp',
      stone: 'card_stoneQuarry',
      food: 'card_farmstead',
    };
    for (const res of ['wood', 'gold', 'stone'] as GatherResource[]) {
      const camp = campByResource[res];
      const cardDefId = getCard(camp).buildingId!;
      // Nearest node of this resource to our fortress.
      let bestNode: Vec2 | null = null;
      let bestD = Infinity;
      for (const node of s.nodes) {
        if (node.dead || node.amount <= 0 || node.resource !== res) continue;
        const d = dist(node.pos, fortress.pos);
        if (d < bestD) {
          bestD = d;
          bestNode = node.pos;
        }
      }
      if (!bestNode || bestD > 60) continue;
      // Already have a camp near it?
      const covered = s.buildings.some(
        (b) => !b.dead && b.player === BOT && b.defId === cardDefId && dist(b.pos, bestNode!) < 14,
      );
      if (!covered) {
        if (this.tryPlace(s, camp, bestNode, 8)) return;
      }
    }

    // Farms for food scaling.
    if (workers >= 10 && this.countOwn(s, 'farmstead') < Math.floor(workers / 7)) {
      if (this.tryPlace(s, 'card_farmstead', fortress.pos, 18)) return;
    }

    // Military path.
    if (workers >= 7 && this.countOwn(s, 'barracks') === 0) {
      if (this.tryPlace(s, 'card_barracks', fortress.pos, 18)) return;
    }
    if (this.countOwn(s, 'barracks') > 0 && this.countOwn(s, 'archeryRange') === 0 && workers >= 9) {
      if (this.tryPlace(s, 'card_archeryRange', fortress.pos, 18)) return;
    }
    if (p.tier >= 2 && this.countOwn(s, 'stable') === 0) {
      if (this.tryPlace(s, 'card_stable', fortress.pos, 20)) return;
    }
    if (p.tier >= 3 && this.countOwn(s, 'siegeWorkshop') === 0) {
      if (this.tryPlace(s, 'card_siegeWorkshop', fortress.pos, 20)) return;
    }
    if (workers >= 10 && this.countOwn(s, 'forge') === 0) {
      if (this.tryPlace(s, 'card_forge', fortress.pos, 18)) return;
    }
    if (p.tier >= 2 && this.countOwn(s, 'blacksmith') === 0) {
      if (this.tryPlace(s, 'card_blacksmith', fortress.pos, 18)) return;
    }
    // A watch tower for the economy.
    if (workers >= 12 && this.countOwn(s, 'watchTower') < 2) {
      if (this.tryPlace(s, 'card_watchTower', fortress.pos, 14)) return;
    }
    // Second barracks for production scale.
    if (s.timeSecs > 480 && this.countOwn(s, 'barracks') === 1) {
      this.tryPlace(s, 'card_barracks', fortress.pos, 20);
    }
  }

  private planTier(s: MatchState): void {
    const p = s.players[BOT];
    const fortress = s.fortressOf(BOT);
    if (!fortress || fortress.research || p.tier >= 4) return;
    const timing = this.profile.tierTimings[p.tier - 1];
    if (timing !== undefined && s.timeSecs >= timing) {
      const upgradeId = fortress.def.tierUpgrades?.[p.tier - 1];
      if (upgradeId) {
        const up = UPGRADE_DB.get(upgradeId);
        if (up && s.canAfford(BOT, up.cost)) {
          this.sim.enqueue({ kind: 'startUpgrade', player: BOT, buildingId: fortress.id, upgradeId });
        }
      }
    }
  }

  private planUpgrades(s: MatchState): void {
    const p = s.players[BOT];
    if (s.rng.next() > this.profile.upgradeChance) return;
    for (const b of s.buildings) {
      if (b.dead || b.player !== BOT || !b.complete || b.research || !b.def.researches) continue;
      for (const upgradeId of b.def.researches) {
        const up = UPGRADE_DB.get(upgradeId);
        if (!up || p.completedUpgrades.has(upgradeId) || up.tier > p.tier) continue;
        if (!s.canAfford(BOT, up.cost)) continue;
        this.sim.enqueue({ kind: 'startUpgrade', player: BOT, buildingId: b.id, upgradeId });
        return;
      }
    }
  }

  // --- military ---

  private armyByRole(s: MatchState, player: number): Map<UnitRole, number> {
    const counts = new Map<UnitRole, number>();
    for (const u of s.units) {
      if (u.dead || u.player !== player || u.def.role === 'worker') continue;
      counts.set(u.def.role, (counts.get(u.def.role) ?? 0) + u.def.commandCost);
    }
    return counts;
  }

  private planArmy(s: MatchState): void {
    const p = s.players[BOT];
    const own = this.armyByRole(s, BOT);
    const weights = new Map<UnitRole, number>(Object.entries(this.profile.compWeights) as [UnitRole, number][]);

    // Hard bots counter what they see of the player's army.
    if (this.profile.counters) {
      const enemy = this.armyByRole(s, 0);
      const cav = enemy.get('cavalry') ?? 0;
      const ranged = enemy.get('ranged') ?? 0;
      const siege = enemy.get('siege') ?? 0;
      const infantry = enemy.get('infantry') ?? 0;
      if (cav > 6) weights.set('infantry', (weights.get('infantry') ?? 2) + 3); // spears live in infantry bucket
      if (ranged > 6) weights.set('cavalry', (weights.get('cavalry') ?? 2) + 3);
      if (siege > 4) weights.set('cavalry', (weights.get('cavalry') ?? 2) + 2);
      if (infantry > 8) weights.set('ranged', (weights.get('ranged') ?? 2) + 3);
    }

    // Pick the role with the biggest deficit vs weights.
    const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
    const totalArmy = [...own.values()].reduce((a, b) => a + b, 0);
    let bestRole: UnitRole | null = null;
    let bestDeficit = -Infinity;
    for (const [role, weight] of weights) {
      const desired = ((totalArmy + 6) * weight) / totalWeight;
      const deficit = desired - (own.get(role) ?? 0);
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestRole = role;
      }
    }
    if (!bestRole) return;

    // Play the most advanced affordable unit card of that role from the deck.
    const candidates: Card[] = [];
    for (const slot of p.cards) {
      const card = getCard(slot.cardId);
      if (!card.unitId) continue;
      const def = getUnit(card.unitId);
      if (def.role !== bestRole) continue;
      if (cardAvailability(s, BOT, card) !== null) continue;
      candidates.push(card);
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => getUnit(b.unitId!).commandCost - getUnit(a.unitId!).commandCost);
    this.sim.enqueue({ kind: 'playCard', player: BOT, cardId: candidates[0].id });
  }

  private planAttack(s: MatchState): void {
    const own = this.armyByRole(s, BOT);
    const armyValue = [...own.values()].reduce((a, b) => a + b, 0);
    const playerFortress = s.fortressOf(0);

    if (!this.attacking) {
      if (armyValue >= this.profile.attackTriggerValue && s.timeSecs >= this.profile.earliestAttackSecs && playerFortress) {
        this.attacking = true;
        // Clear old flags, stage an assault on the player's fortress.
        for (const f of s.flags) {
          if (!f.dead && f.player === BOT) this.sim.enqueue({ kind: 'removeFlag', player: BOT, flagId: f.id });
        }
        const mid = {
          x: (playerFortress.pos.x + (s.fortressOf(BOT)?.pos.x ?? playerFortress.pos.x)) / 2,
          y: (playerFortress.pos.y + (s.fortressOf(BOT)?.pos.y ?? playerFortress.pos.y)) / 2,
        };
        this.sim.enqueue({ kind: 'placeFlag', player: BOT, flagType: 'march', pos: mid });
        this.sim.enqueue({ kind: 'placeFlag', player: BOT, flagType: 'assault', pos: { ...playerFortress.pos } });
        const alloc = this.profile.attackAllocation;
        this.sim.enqueue({
          kind: 'setAllocation',
          player: BOT,
          mode: 'attack',
          alloc: { infantry: alloc, ranged: alloc, cavalry: alloc, siege: 100, support: 100 },
        });
        this.sim.enqueue({ kind: 'setStance', player: BOT, stance: 'attack', enabled: true });
      }
    } else {
      // Call off a failed attack.
      if (armyValue < this.profile.attackTriggerValue * 0.35) {
        this.attacking = false;
        this.sim.enqueue({ kind: 'setStance', player: BOT, stance: 'attack', enabled: false });
        this.sim.enqueue({ kind: 'emergency', player: BOT, action: 'retreat' });
        s.players[BOT].attackFlagIndex = 0;
      }
    }
  }

  private planRaids(s: MatchState): void {
    if (s.tick - this.lastRaidTick < 90 * TICK_RATE) return;
    if (s.timeSecs < 240) return;
    // Raid the player's worker cluster.
    const workers = s.units.filter((u) => !u.dead && u.player === 0 && u.def.role === 'worker');
    if (workers.length === 0) return;
    this.lastRaidTick = s.tick;
    const target = workers[Math.floor(s.rng.next() * workers.length)].pos;
    this.sim.enqueue({ kind: 'placeFlag', player: BOT, flagType: 'harass', pos: { ...target } });
    // Old harass flags expire naturally via removal on next raid.
    for (const f of s.flags) {
      if (!f.dead && f.player === BOT && f.flagType === 'harass' && dist(f.pos, target) > 10) {
        this.sim.enqueue({ kind: 'removeFlag', player: BOT, flagId: f.id });
      }
    }
  }

  private planAbilities(s: MatchState): void {
    if (s.tick - this.lastAbilityTick < 45 * TICK_RATE) return;
    const p = s.players[BOT];
    // Find a clump of player units.
    let center: Vec2 | null = null;
    for (const u of s.units) {
      if (u.dead || u.player !== 0 || u.def.role === 'worker') continue;
      let near = 0;
      for (const v of s.units) {
        if (v.dead || v.player !== 0) continue;
        if (dist(u.pos, v.pos) < 7) near++;
      }
      if (near >= 6) {
        center = u.pos;
        break;
      }
    }
    if (!center) return;
    for (const slot of p.cards) {
      const card = getCard(slot.cardId);
      if (!card.ability) continue;
      const hasDamage = card.ability.effects.some((e) => e.type === 'damageArea');
      if (!hasDamage) continue;
      if (cardAvailability(s, BOT, card) !== null) continue;
      this.lastAbilityTick = s.tick;
      this.sim.enqueue({ kind: 'playCard', player: BOT, cardId: card.id, target: { ...center } });
      return;
    }
  }
}
