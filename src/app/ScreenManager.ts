import { appBus } from '@/core/EventBus';

export interface Screen {
  /** Root element, attached to #app on registration; toggled via .hidden. */
  root: HTMLElement;
  onShow?(params?: unknown): void;
  onHide?(): void;
}

export type ScreenName =
  | 'splash'
  | 'mainMenu'
  | 'playSetup'
  | 'deckEditor'
  | 'shop'
  | 'options'
  | 'credits'
  | 'loading'
  | 'match';

/**
 * Owns screen DOM roots and transitions. Screens are registered lazily by
 * factory so heavy screens (match) construct only when first shown.
 */
export class ScreenManager {
  private screens = new Map<ScreenName, Screen>();
  private factories = new Map<ScreenName, () => Screen>();
  private current: ScreenName | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  register(name: ScreenName, factory: () => Screen): void {
    this.factories.set(name, factory);
  }

  private instantiate(name: ScreenName): Screen {
    let screen = this.screens.get(name);
    if (!screen) {
      const factory = this.factories.get(name);
      if (!factory) throw new Error(`No screen registered: ${name}`);
      screen = factory();
      screen.root.classList.add('screen', 'hidden');
      this.container.append(screen.root);
      this.screens.set(name, screen);
    }
    return screen;
  }

  show(name: ScreenName, params?: unknown): void {
    if (this.current === name) return;
    if (this.current) {
      const prev = this.screens.get(this.current);
      if (prev) {
        prev.root.classList.add('hidden');
        prev.onHide?.();
      }
    }
    const screen = this.instantiate(name);
    screen.root.classList.remove('hidden');
    screen.onShow?.(params);
    this.current = name;
    appBus.emit('screenChanged', { screen: name });
  }

  /** Destroy a cached screen instance so next show() rebuilds it fresh. */
  dispose(name: ScreenName): void {
    const screen = this.screens.get(name);
    if (screen) {
      screen.onHide?.();
      screen.root.remove();
      this.screens.delete(name);
      if (this.current === name) this.current = null;
    }
  }
}
