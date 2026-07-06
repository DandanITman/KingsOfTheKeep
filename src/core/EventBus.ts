/**
 * Typed publish/subscribe event bus. The sim emits discrete events here;
 * UI, render, and audio layers subscribe. Never used to mutate sim state.
 */

import type { Vec2 } from './mathUtils';

export type AlertKind =
  | 'fortressUnderAttack'
  | 'civiliansUnderAttack'
  | 'unitsUnderAttack'
  | 'resourceDepleted'
  | 'notEnoughCommand'
  | 'notEnoughResources'
  | 'buildingComplete'
  | 'enemyAttacking'
  | 'wallBreached'
  | 'siegeDetected'
  | 'upgradeComplete'
  | 'armyReady'
  | 'unitTrained'
  | 'shrineCaptured'
  | 'waveIncoming'
  | 'heroFallen'
  | 'heroReturned';

export interface GameEvents {
  // Sim events
  unitSpawned: { entityId: number; unitId: string; player: number; pos: Vec2 };
  unitDied: { entityId: number; unitId: string; player: number; pos: Vec2 };
  buildingPlaced: { entityId: number; buildingId: string; player: number; pos: Vec2 };
  buildingCompleted: { entityId: number; buildingId: string; player: number; pos: Vec2 };
  buildingDestroyed: { entityId: number; buildingId: string; player: number; pos: Vec2 };
  projectileHit: { pos: Vec2; splash: number };
  abilityCast: { cardId: string; player: number; pos?: Vec2; vfx: string };
  upgradeCompleted: { upgradeId: string; player: number };
  tierReached: { tier: number; player: number };
  resourceNodeDepleted: { pos: Vec2; resource: string };
  alert: { kind: AlertKind; message: string; pos?: Vec2; player: number };
  matchEnded: { winner: number; loser: number; reason: string };
  waveStarted: { wave: number; total: number };
  cardPlayed: { cardId: string; player: number };
  attackCommand: { player: number };
  defendCommand: { player: number };
  // UI events
  uiClick: Record<string, never>;
  uiHover: Record<string, never>;
  cardHovered: { cardId: string };
  packOpened: { cardIds: string[] };
  screenChanged: { screen: string };
}

export type EventKey = keyof GameEvents;
type Handler<K extends EventKey> = (payload: GameEvents[K]) => void;

export class EventBus {
  private handlers = new Map<EventKey, Set<Handler<EventKey>>>();

  on<K extends EventKey>(key: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(fn as Handler<EventKey>);
    return () => set!.delete(fn as Handler<EventKey>);
  }

  emit<K extends EventKey>(key: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Handler<K>)(payload);
      } catch (err) {
        console.error(`EventBus handler error for "${key}":`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Global bus for app-level events (menus, audio). Matches create their own. */
export const appBus = new EventBus();
