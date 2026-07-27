/**
 * The single seam through which players (human UI and bot AI alike) mutate
 * the simulation. Commands are queued and processed at the start of a tick.
 */

import type { Vec2 } from '@/core/mathUtils';
import type { GatherResource, UnitRole } from '@/data/types';

export type PlayerId = number;
export type EntityId = number;

export type FlagType = 'march' | 'assault' | 'siege' | 'rally' | 'harass' | 'defend';

export type Stance = 'attack' | 'defend';

export type EmergencyAction =
  | 'fullAssault'
  | 'holdKeep'
  | 'protectWorkers'
  | 'rallyArmy'
  | 'repairWalls'
  | 'retreat'
  | 'stop';

export type Command =
  | { kind: 'playCard'; player: PlayerId; cardId: string; target?: Vec2; rotation?: number }
  | { kind: 'setStance'; player: PlayerId; stance: Stance; enabled: boolean }
  | { kind: 'placeFlag'; player: PlayerId; flagType: FlagType; pos: Vec2 }
  | { kind: 'removeFlag'; player: PlayerId; flagId: EntityId }
  | { kind: 'moveFlag'; player: PlayerId; flagId: EntityId; pos: Vec2 }
  | { kind: 'setAllocation'; player: PlayerId; mode: Stance; alloc: Partial<Record<UnitRole, number>> }
  | { kind: 'setWorkerRatios'; player: PlayerId; ratios: Record<GatherResource, number> }
  | { kind: 'trainUnit'; player: PlayerId; buildingId: EntityId; unitId: string }
  | { kind: 'setAutoTrain'; player: PlayerId; buildingId: EntityId; unitId: string | null }
  | { kind: 'cancelTrain'; player: PlayerId; buildingId: EntityId; queueIndex: number }
  | { kind: 'startUpgrade'; player: PlayerId; buildingId: EntityId; upgradeId: string }
  | { kind: 'emergency'; player: PlayerId; action: EmergencyAction }
  // `queue: true` (shift-click) appends to the unit's order queue instead of
  // replacing whatever it is currently doing.
  | { kind: 'directOrder'; player: PlayerId; unitIds: EntityId[]; dest: Vec2; attackMove: boolean; queue?: boolean }
  | { kind: 'directGather'; player: PlayerId; unitIds: EntityId[]; nodeId: EntityId; queue?: boolean }
  | { kind: 'directBuild'; player: PlayerId; unitIds: EntityId[]; buildingId: EntityId; queue?: boolean }
  | { kind: 'stopUnits'; player: PlayerId; unitIds: EntityId[] }
  | { kind: 'holdPosition'; player: PlayerId; unitIds: EntityId[] }
  | { kind: 'marketTrade'; player: PlayerId; sell: GatherResource; buy: GatherResource; amount: number }
  | { kind: 'setRally'; player: PlayerId; buildingId: EntityId; pos: Vec2 }
  | { kind: 'garrisonRanged'; player: PlayerId; buildingId: EntityId; count?: number }
  | { kind: 'ungarrison'; player: PlayerId; buildingId: EntityId }
  | { kind: 'upgradeHouse'; player: PlayerId; buildingId: EntityId }
  | { kind: 'concede'; player: PlayerId };
