import type { EventBus } from '@/core/EventBus';
import type { Vec2 } from '@/core/mathUtils';
import {
  MAX_COMMAND_CAP,
  MORALE_BASE,
  STARTING_COMMAND_CAP,
  STARTING_RESOURCES,
  STARTING_WORKERS,
  TICK_SECS,
} from '@/data/balance';
import { FACTIONS } from '@/data/factions';
import { getMap } from '@/data/maps';
import { getBuilding } from '@/data/buildings';
import { getUnit } from '@/data/units';
import { getCard } from '@/data/cards';
import { getStarterDeck } from '@/data/starterDecks';
import type { Deck, MatchSetup } from '@/data/types';
import type { Command, PlayerId } from './commands';
import { Building, ObjectivePoint, ResourceNode, Unit, resetEntityIds } from './entities/Entity';
import { MatchState, createPlayerState } from './MatchState';
import { processCommand } from './systems/CommandSystem';
import { movementSystem } from './systems/MovementSystem';
import { gatherSystem } from './systems/GatherSystem';
import { workerAllocationSystem } from './systems/WorkerAllocationSystem';
import { economySystem } from './systems/EconomySystem';
import { constructionSystem } from './systems/ConstructionSystem';
import { trainingSystem } from './systems/TrainingSystem';
import { effectsSystem } from './systems/AbilitySystem';
import { pruneUnitBuffs } from './systems/statHelpers';
import { registerCardHandlers } from './systems/CardSystem';
import { combatSystem } from './systems/CombatSystem';
import { projectileSystem } from './systems/ProjectileSystem';
import { victorySystem } from './systems/VictorySystem';
import { macroCommandSystem } from './systems/MacroCommandSystem';
import { registerFlagHandlers } from './systems/FlagSystem';
import { moraleSystem } from './systems/MoraleSystem';
import { supportSystem } from './systems/SupportSystem';

registerCardHandlers();
registerFlagHandlers();

export interface SimOptions {
  autoAssignCivilians: boolean;
}

export class MatchSim {
  readonly state: MatchState;
  options: SimOptions = { autoAssignCivilians: true };

  constructor(setup: MatchSetup, bus: EventBus, decks?: { player?: Deck; bot?: Deck }) {
    resetEntityIds();
    const map = getMap(setup.mapId);
    this.state = new MatchState(setup, map, bus);
    const starting = STARTING_RESOURCES[setup.startingResources];

    // Players: 0 = human, 1 = bot.
    const humanFaction = FACTIONS[setup.playerFaction as keyof typeof FACTIONS];
    const botFaction = FACTIONS[setup.botFaction as keyof typeof FACTIONS];
    this.state.players.push(createPlayerState(0, humanFaction, false, starting as Record<string, number>));
    this.state.players.push(createPlayerState(1, botFaction, true, starting as Record<string, number>));

    // Card bars from decks.
    const playerDeck = decks?.player ?? getStarterDeck(setup.playerFaction);
    const botDeck = decks?.bot ?? getStarterDeck(setup.botFaction);
    this.state.players[0].cards = playerDeck.cardIds.map((cardId) => ({ cardId, cooldownTicks: 0 }));
    this.state.players[1].cards = botDeck.cardIds.map((cardId) => ({ cardId, cooldownTicks: 0 }));

    // Fog memory maps.
    this.state.seenBuildings = [new Map(), new Map()];

    this.spawnMapEntities();
    this.spawnStartingBases();
  }

  private spawnMapEntities(): void {
    const { map } = this.state;
    for (const spot of map.resources) {
      const node = new ResourceNode(spot.pos, spot.type, spot.amount);
      this.state.addNode(node);
      // Resource clusters block a small area so units path around them.
      const c = this.state.nav.cellOf(spot.pos);
      this.state.nav.stamp(c.x - 1, c.y - 1, 2, 2);
    }
    for (const obj of map.objectives ?? []) {
      this.state.addObjective(new ObjectivePoint(obj.pos, obj.type));
    }
  }

  private spawnStartingBases(): void {
    const { map, setup } = this.state;
    for (const playerId of [0, 1] as PlayerId[]) {
      const spawn = map.spawns[playerId];
      const p = this.state.players[playerId];
      const fortressCard = getCard(p.faction.fortressCardId.startsWith('card_') ? p.faction.fortressCardId : `card_${p.faction.fortressCardId}`);
      const fortressDef = getBuilding(fortressCard.buildingId!);
      const fw = fortressDef.footprint[0];
      const fh = fortressDef.footprint[1];
      const cell = { x: Math.round(spawn.x - fw / 2), y: Math.round(spawn.y - fh / 2) };
      const fortress = new Building(playerId, { x: cell.x + fw / 2, y: cell.y + fh / 2 }, fortressDef, cell, true);
      this.state.addBuilding(fortress);
      this.state.nav.stamp(cell.x, cell.y, fw, fh);
      p.fortressId = fortress.id;

      const workerDef = getUnit(p.faction.workerUnitId);
      for (let i = 0; i < STARTING_WORKERS; i++) {
        const angle = (i / STARTING_WORKERS) * Math.PI * 2;
        const pos: Vec2 = this.state.nav.nearestFree({
          x: spawn.x + Math.cos(angle) * (fw / 2 + 2),
          y: spawn.y + Math.sin(angle) * (fh / 2 + 2),
        });
        this.state.addUnit(new Unit(playerId, pos, workerDef, MORALE_BASE));
      }
    }
    this.recomputeCommand();
  }

  enqueue(cmd: Command): void {
    this.state.commandQueue.push(cmd);
  }

  private recompute = (): void => this.recomputeCommand();

  recomputeCommand(): void {
    for (const p of this.state.players) {
      let cap = STARTING_COMMAND_CAP;
      let used = 0;
      for (const b of this.state.buildings) {
        if (b.player === p.id && b.complete && b.def.commandProvided) cap += b.def.commandProvided;
      }
      for (const u of this.state.units) {
        if (u.player === p.id && !u.dead) used += u.def.commandCost;
      }
      // Queued units keep their command reserved.
      for (const b of this.state.buildings) {
        if (b.player !== p.id || b.dead) continue;
        for (const item of b.trainQueue) used += getUnit(item.unitId).commandCost;
      }
      p.commandCap = Math.min(cap, MAX_COMMAND_CAP);
      p.commandUsed = used;
    }
  }

  /** Advance the simulation one fixed tick. */
  tick(): void {
    const s = this.state;
    if (s.winner !== null) return;
    s.tick++;
    s.timeSecs += TICK_SECS;

    // 0. Snapshot previous positions for render interpolation.
    for (const u of s.units) {
      u.prevPos.x = u.pos.x;
      u.prevPos.y = u.pos.y;
    }
    for (const p of s.projectiles) {
      p.prevPos.x = p.pos.x;
      p.prevPos.y = p.pos.y;
    }

    // 1. Commands (player + bot) mutate state through one seam.
    const queue = s.commandQueue;
    s.commandQueue = [];
    for (const cmd of queue) processCommand(this, cmd);

    // 2. Rebuild unit spatial hash.
    s.unitHash.clear();
    for (const u of s.units) if (!u.dead) s.unitHash.insert(u.id, u.pos);
    if (s.buildingHashDirty) {
      s.buildingHash.clear();
      for (const b of s.buildings) if (!b.dead) s.buildingHash.insert(b.id, b.pos);
      s.buildingHashDirty = false;
    }

    // 3. Systems in fixed order.
    workerAllocationSystem(s, this.options.autoAssignCivilians);
    macroCommandSystem(s);
    movementSystem(s);
    gatherSystem(s);
    constructionSystem(s, this.recompute);
    trainingSystem(s, this.recompute);
    combatSystem(s);
    projectileSystem(s);
    moraleSystem(s);
    supportSystem(s);
    economySystem(s);
    effectsSystem(s);
    pruneUnitBuffs(s);
    s.fog.update(s);
    victorySystem(s);

    // 4. Cooldowns.
    for (const p of s.players) {
      for (const slot of p.cards) if (slot.cooldownTicks > 0) slot.cooldownTicks--;
    }

    // 5. Cleanup.
    const unitCount = s.units.length;
    const buildingCount = s.buildings.length;
    s.sweepDead();
    if (s.units.length !== unitCount || s.buildings.length !== buildingCount) {
      this.recomputeCommand();
    }
  }
}
