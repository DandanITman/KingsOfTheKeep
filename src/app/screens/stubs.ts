import { el, button } from '@/ui/components/dom';
import type { Screen, ScreenManager } from '../ScreenManager';

/** Temporary placeholder screens, replaced by real implementations in later milestones. */
export function createStubScreen(screens: ScreenManager, titleText: string, note: string): Screen {
  const root = el('div', { className: 'royal-screen' });
  root.append(
    el('div', { className: 'screen-title', text: titleText }),
    el('p', { text: note }),
    (() => {
      const b = button('Back', () => screens.show('mainMenu'));
      b.style.marginTop = '24px';
      return b;
    })(),
  );
  return { root };
}
