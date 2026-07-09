import { el } from '@/ui/components/dom';
import { getMap } from '@/data/maps';
import { FACTIONS } from '@/data/factions';
import type { MatchSetup } from '@/data/types';
import type { Screen, ScreenManager } from '../ScreenManager';

/** Brief themed loading screen; hands the MatchSetup to the match screen. */
export function createLoadingScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'royal-screen' });

  const title = el('div', { className: 'screen-title', text: '' });
  const tip = el('div');
  tip.style.cssText = 'color:var(--muted);font-style:italic;max-width:440px;text-align:center;';
  const bar = el('div');
  bar.style.cssText =
    'width:320px;height:8px;border:1px solid var(--border);border-radius:4px;margin-top:28px;overflow:hidden;';
  const fill = el('div');
  fill.style.cssText =
    'height:100%;width:0%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));transition:width 0.3s;';
  bar.append(fill);

  const TIPS = [
    'Place mining camps directly beside gold deposits for full efficiency.',
    'Spearmen slaughter charging cavalry. Keep some at your gates.',
    'Siege engines crumble to cavalry raids — escort them with infantry.',
    'The Defend button keeps your army home. The Attack button sends them to your flags.',
    'Attack flags can be numbered to form an attack route.',
    'A stronger economy wins wars before the first sword is drawn.',
    'Watch towers extend your vision and warn of raids.',
    'Harass flags send fast units to torment enemy workers.',
  ];

  root.append(title, tip, bar);

  return {
    root,
    onShow(params) {
      const setup = params as MatchSetup;
      const map = getMap(setup.mapId);
      const pf = FACTIONS[setup.playerFaction as keyof typeof FACTIONS];
      const bf = FACTIONS[setup.botFaction as keyof typeof FACTIONS];
      title.textContent = `${map.name}`;
      tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      fill.style.width = '10%';

      const sub = el('div', {
        text: `${pf?.name ?? '?'} vs ${bf?.name ?? '?'} — ${setup.botDifficulty} bot`,
      });
      sub.style.cssText = 'color:#8a7a52;margin:-14px 0 10px;';
      title.after(sub);

      // Let the browser paint, then construct the (heavy) match screen.
      window.setTimeout(() => {
        fill.style.width = '80%';
        window.setTimeout(() => {
          fill.style.width = '100%';
          sub.remove();
          screens.dispose('match'); // always a fresh match instance
          screens.show('match', setup);
        }, 120);
      }, 350);
    },
  };
}
