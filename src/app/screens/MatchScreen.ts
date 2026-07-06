import { EventBus } from '@/core/EventBus';
import { el, button } from '@/ui/components/dom';
import { saveStore } from '@/core/save/SaveStore';
import { TICK_SECS } from '@/data/balance';
import type { MatchSetup } from '@/data/types';
import { MatchSim } from '@/sim/MatchSim';
import { Renderer } from '@/render/Renderer';
import { CameraRig } from '@/render/CameraRig';
import { TerrainView } from '@/render/TerrainView';
import { UnitView } from '@/render/UnitView';
import { BuildingView } from '@/render/BuildingView';
import { TopBar } from '@/ui/hud/TopBar';
import { MinimapView } from '@/ui/hud/MinimapView';
import { EconomyPanel } from '@/ui/hud/EconomyPanel';
import { CardBar } from '@/ui/hud/CardBar';
import { SelectionPanel } from '@/ui/hud/SelectionPanel';
import { AlertFeed } from '@/ui/hud/AlertFeed';
import { GhostPlacementView } from '@/render/GhostPlacementView';
import { EffectsView } from '@/render/EffectsView';
import { OverlayCanvas } from '@/render/OverlayCanvas';
import { FlagView } from '@/render/FlagView';
import { FogView } from '@/render/FogView';
import { MacroPanel } from '@/ui/hud/MacroPanel';
import { BotController } from '@/ai/BotController';
import { createBotProfile } from '@/ai/BotProfile';
import { FOG_VISIBLE, FOG_BLACK } from '@/sim/systems/FogSystem';
import { MatchInput } from './MatchInput';
import { MatchSelection } from './MatchSelection';
import type { Screen, ScreenManager } from '../ScreenManager';

/**
 * The match screen: owns the sim, render layer, HUD, and the fixed-timestep
 * loop. Constructed fresh per match (ScreenManager.dispose before show).
 */
export function createMatchScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'match-root' });
  let runner: MatchRunner | null = null;

  return {
    root,
    onShow(params) {
      runner = new MatchRunner(root, params as MatchSetup, screens);
    },
    onHide() {
      runner?.dispose();
      runner = null;
      root.innerHTML = '';
    },
  };
}

export class MatchRunner {
  readonly sim: MatchSim;
  readonly bus = new EventBus();
  private renderer: Renderer;
  private rig: CameraRig;
  private terrain: TerrainView;
  private unitView: UnitView;
  private buildingView: BuildingView;
  private topBar: TopBar;
  private minimap: MinimapView;
  private economyPanel: EconomyPanel;
  private cardBar: CardBar;
  private ghost: GhostPlacementView;
  private input: MatchInput;
  private effects: EffectsView;
  private overlay: OverlayCanvas;
  private selection: MatchSelection;
  private selectionPanel: SelectionPanel;
  private alertFeed: AlertFeed;
  private flagView: FlagView;
  private macroPanel: MacroPanel;
  private fogView: FogView;
  bot: BotController;
  private screens: ScreenManager;
  private root: HTMLElement;

  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private paused = false;
  private ended = false;
  speedMult: number;

  constructor(root: HTMLElement, setup: MatchSetup, screens: ScreenManager) {
    this.root = root;
    this.screens = screens;
    this.speedMult = setup.speed;
    this.sim = new MatchSim(setup, this.bus);
    const state = this.sim.state;
    const display = saveStore.data.options.display;

    // Render layer.
    this.renderer = new Renderer(root, state.map.terrain.biome, display);
    this.rig = new CameraRig(root, state.map.spawns[0], { w: state.map.worldSize[0], h: state.map.worldSize[1] }, display);
    this.terrain = new TerrainView(state);
    this.unitView = new UnitView(state);
    this.buildingView = new BuildingView(state);
    this.ghost = new GhostPlacementView();
    this.effects = new EffectsView(state);
    this.flagView = new FlagView(state);
    this.fogView = new FogView(state);
    this.renderer.scene.add(
      this.terrain.root,
      this.unitView.root,
      this.buildingView.root,
      this.ghost.root,
      this.effects.root,
      this.flagView.root,
      this.fogView.mesh,
    );
    this.overlay = new OverlayCanvas(root, state, this.renderer.camera);

    // Fog visibility filters: enemy units need active vision; enemy buildings
    // stay visible as "last seen" ghosts once discovered.
    const enemyUnitVisible = (u: import('@/sim/entities/Entity').Unit) =>
      u.player === 0 || state.fog.valueAt(u.pos, 0) === FOG_VISIBLE;
    this.unitView.visibleFilter = enemyUnitVisible;
    this.overlay.visibleFilter = enemyUnitVisible;
    this.buildingView.visibleFilter = (b) =>
      b.player === 0 || state.fog.seenBuildingIds[0].has(b.id);
    this.minimapFogQuery = (pos, player) => state.fog.valueAt(pos, player as 0 | 1);

    // The bot.
    this.bot = new BotController(this.sim, createBotProfile(setup.botDifficulty, setup.botFaction));

    // Input: placement + targeting modes.
    this.input = new MatchInput(root, this.renderer.camera, this.sim, this.ghost, () => {
      this.cardBar.setSelected(this.input.mode.kind === 'placing' || this.input.mode.kind === 'targeting'
        ? (this.input.mode as { card: { id: string } }).card.id
        : null);
    });

    // HUD.
    const hud = el('div', { className: 'hud' });
    this.topBar = new TopBar(state, () => this.togglePause());
    this.minimap = new MinimapView(state, (world) => this.rig.jumpTo(world));
    this.minimap.fogQuery = this.minimapFogQuery;
    this.economyPanel = new EconomyPanel(state, (ratios) =>
      this.sim.enqueue({ kind: 'setWorkerRatios', player: 0, ratios }),
    );
    this.cardBar = new CardBar(state, (card) => {
      if (this.input.mode.kind !== 'normal' && this.cardBar.selectedCardId === card.id) {
        this.input.setMode({ kind: 'normal' });
        return;
      }
      if (card.buildingId) {
        this.input.startPlacing(card);
      } else if (card.unitId) {
        this.sim.enqueue({ kind: 'playCard', player: 0, cardId: card.id });
      } else if (card.ability) {
        if (card.ability.target === 'global') {
          this.sim.enqueue({ kind: 'playCard', player: 0, cardId: card.id });
        } else {
          this.input.startTargeting(card);
        }
      }
    });
    // Selection.
    this.selection = new MatchSelection(this.sim, this.input, this.overlay);
    this.selectionPanel = new SelectionPanel(this.sim, () => this.selection.selected);
    this.alertFeed = new AlertFeed(this.bus, (pos) => this.rig.jumpTo(pos));
    this.macroPanel = new MacroPanel(this.sim, (flagType) => this.input.startFlagPlacing(flagType));
    this.input.onFlagPlace = (flagType, world) => {
      this.sim.enqueue({ kind: 'placeFlag', player: 0, flagType, pos: world });
    };

    const bottomLeft = el('div', { className: 'hud-bottom' });
    bottomLeft.style.flexDirection = 'column';
    bottomLeft.style.alignItems = 'flex-start';
    bottomLeft.append(this.selectionPanel.root, this.economyPanel.root);
    hud.append(this.topBar.root, this.minimap.canvas, bottomLeft, this.cardBar.root, this.alertFeed.root, this.macroPanel.root);
    root.append(hud);
    this.sim.options.autoAssignCivilians = saveStore.data.options.gameplay.autoAssignCivilians;

    // Intro banner.
    const intro = el('div', { text: 'Defend your Keep. Destroy theirs.' });
    intro.style.cssText = `position:absolute;top:20%;left:50%;transform:translateX(-50%);font-family:Georgia,serif;
      font-size:30px;color:var(--gold);text-shadow:0 2px 10px #000;opacity:1;transition:opacity 1.2s;pointer-events:none;z-index:20;`;
    root.append(intro);
    window.setTimeout(() => (intro.style.opacity = '0'), 2600);
    window.setTimeout(() => intro.remove(), 4000);

    // Match end.
    this.bus.on('matchEnded', ({ winner }) => this.onMatchEnd(winner === 0));

    // Esc opens pause menu.
    this.escHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.togglePause();
    };
    window.addEventListener('keydown', this.escHandler);

    this.lastTime = performance.now();
    this.loop(this.lastTime);

    // Debug handle for console inspection and headless testing.
    (window as unknown as Record<string, unknown>).__kotk = this;
  }

  private escHandler: (e: KeyboardEvent) => void;
  private pauseOverlay: HTMLElement | null = null;
  private minimapFogQuery: ((pos: { x: number; y: number }, player: number) => number) | null = null;

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dtMs = Math.min(100, now - this.lastTime);
    this.lastTime = now;
    const dt = dtMs / 1000;

    if (!this.paused && !this.ended) {
      this.accumulator += dt * this.speedMult;
      let ticks = 0;
      while (this.accumulator >= TICK_SECS && ticks < 8) {
        this.bot.update();
        this.sim.tick();
        this.accumulator -= TICK_SECS;
        ticks++;
      }
      if (ticks === 8) this.accumulator = 0; // spiral-of-death guard
    }

    const alpha = Math.min(1, this.accumulator / TICK_SECS);
    this.rig.update(dt, this.renderer.camera);
    this.renderer.followShadow(this.rig.target);
    this.unitView.update(alpha, now);
    this.buildingView.update();
    this.effects.update(alpha);
    this.flagView.update(now);
    this.fogView.update();
    this.terrain.update();
    this.macroPanel.update();
    this.selection.prune();
    this.overlay.update(alpha, saveStore.data.options.display);
    this.topBar.update();
    this.economyPanel.update();
    this.cardBar.update();
    this.selectionPanel.update();
    this.minimap.update(this.rig.target, this.rig.zoom);
    this.renderer.render();
  };

  togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    if (this.paused) {
      const backdrop = el('div', { className: 'modal-backdrop' });
      const modal = el('div', { className: 'modal' }, [el('h2', { text: 'Paused' })]);
      const buttons = el('div', { className: 'modal-buttons' });
      buttons.style.flexDirection = 'column';
      buttons.append(
        button('Resume', () => this.togglePause(), 'btn small primary'),
        button('Concede', () => {
          this.sim.enqueue({ kind: 'concede', player: 0 });
          this.paused = false;
          backdrop.remove();
          this.pauseOverlay = null;
        }, 'btn small danger'),
        button('Quit to Menu', () => {
          backdrop.remove();
          this.screens.show('mainMenu');
        }, 'btn small'),
      );
      modal.append(buttons);
      backdrop.append(modal);
      this.root.append(backdrop);
      this.pauseOverlay = backdrop;
    } else {
      this.pauseOverlay?.remove();
      this.pauseOverlay = null;
    }
  }

  private onMatchEnd(playerWon: boolean): void {
    if (this.ended) return;
    this.ended = true;
    const overlay = el('div', { className: `match-end ${playerWon ? 'victory' : 'defeat'}` });
    overlay.append(
      el('h1', { text: playerWon ? 'VICTORY' : 'DEFEAT' }),
      el('p', {
        text: playerWon
          ? 'The enemy fortress lies in ruins. The realm is yours.'
          : 'Your keep has fallen. The banners are lowered.',
      }),
      button('Return to Menu', () => this.screens.show('mainMenu'), 'btn primary'),
    );
    this.root.append(overlay);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.escHandler);
    this.input.dispose();
    this.rig.dispose();
    this.renderer.dispose();
  }
}
