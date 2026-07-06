import { el } from '@/ui/components/dom';
import type { Screen, ScreenManager } from '../ScreenManager';

/**
 * Cherry Buddha studio splash: fade in, hold, fade out to main menu.
 * Click-to-skip appears after 1 s.
 */
export function createSplashScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'splash-screen' });
  root.style.cssText = 'background:#0c0a08;cursor:default;';

  const logo = el('div', { className: 'splash-logo' });
  logo.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:18px;opacity:0;transition:opacity 1.2s ease;';

  // Smiling Buddha: simple inline SVG, warm cherry/gold palette.
  const svg = el('div');
  svg.innerHTML = `
    <svg width="140" height="140" viewBox="0 0 100 100">
      <circle cx="50" cy="54" r="34" fill="#e8a33d"/>
      <circle cx="50" cy="30" r="16" fill="#e8a33d"/>
      <circle cx="50" cy="16" r="4" fill="#c1362e"/>
      <path d="M40 28 Q44 32 48 28" stroke="#5a3213" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M52 28 Q56 32 60 28" stroke="#5a3213" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M42 36 Q50 44 58 36" stroke="#5a3213" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="62" rx="20" ry="14" fill="#c1362e"/>
      <path d="M30 60 Q50 78 70 60 L70 72 Q50 88 30 72 Z" fill="#a12b24"/>
      <circle cx="50" cy="58" r="5" fill="#f4d58d"/>
    </svg>`;

  const text = el('div', { text: 'Cherry Buddha' });
  text.style.cssText =
    "font-family:Georgia,serif;font-size:34px;color:#e8a33d;letter-spacing:4px;";

  const skip = el('div', { text: 'Click to Skip' });
  skip.style.cssText =
    'position:absolute;bottom:36px;font-size:13px;color:#776;opacity:0;transition:opacity 0.5s;';

  logo.append(svg, text);
  root.append(logo, skip);

  let done = false;
  const timers: number[] = [];

  function finish() {
    if (done) return;
    done = true;
    timers.forEach((t) => window.clearTimeout(t));
    screens.show('mainMenu');
  }

  return {
    root,
    onShow() {
      done = false;
      logo.style.opacity = '0';
      skip.style.opacity = '0';
      timers.push(window.setTimeout(() => (logo.style.opacity = '1'), 60));
      timers.push(window.setTimeout(() => (skip.style.opacity = '1'), 1000));
      timers.push(window.setTimeout(() => (logo.style.opacity = '0'), 2800));
      timers.push(window.setTimeout(finish, 3600));
      root.addEventListener('click', finish, { once: true });
    },
    onHide() {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
    },
  };
}
