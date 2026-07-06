import { el, button } from '@/ui/components/dom';
import type { Screen, ScreenManager } from '../ScreenManager';

export function createCreditsScreen(screens: ScreenManager): Screen {
  const root = el('div');
  root.style.cssText = 'background:#060504;overflow:hidden;';

  // Castle silhouette
  const castle = el('div');
  castle.innerHTML = `
    <svg width="100%" height="220" viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" style="position:absolute;bottom:0;left:0;opacity:0.5;">
      <path d="M0 220 L0 160 L40 160 L40 130 L55 130 L55 160 L90 160 L90 100 L110 100 L110 80 L125 80 L125 100 L145 100 L145 160 L200 160 L200 140 L260 140 L260 160 L330 160 L330 90 L350 90 L350 70 L370 60 L390 70 L390 90 L410 90 L410 160 L480 160 L480 140 L540 140 L540 160 L610 160 L610 110 L630 110 L630 90 L645 90 L645 110 L665 110 L665 160 L700 160 L700 130 L715 130 L715 160 L760 160 L760 220 Z" fill="#151008"/>
    </svg>`;

  // Torch flames (CSS particles)
  const torches = el('div');
  torches.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  for (const left of ['12%', '88%']) {
    const flame = el('div');
    flame.style.cssText = `position:absolute;bottom:180px;left:${left};width:14px;height:22px;border-radius:50% 50% 35% 35%;
      background:radial-gradient(circle at 50% 80%, #ffcf5e, #e8722a 60%, transparent);
      animation: flicker 0.6s infinite alternate ease-in-out;`;
    torches.append(flame);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes flicker { from { transform: scaleY(1) translateY(0); opacity: 0.9; } to { transform: scaleY(1.25) translateY(-3px); opacity: 1; } }
  @keyframes creditsScroll { from { transform: translateY(100vh); } to { transform: translateY(-100%); } }`;

  const scroll = el('div');
  scroll.style.cssText =
    'position:absolute;width:100%;text-align:center;font-family:Georgia,serif;animation:creditsScroll 36s linear infinite;';
  scroll.innerHTML = `
    <div style="font-size:44px;color:var(--gold);letter-spacing:4px;margin-bottom:60px;">KINGS OF THE KEEP</div>
    <div style="font-size:15px;color:#a89468;margin-bottom:8px;">Game Director</div>
    <div style="font-size:30px;color:var(--parchment);margin-bottom:60px;">Dan the Man</div>
    <div style="font-size:15px;color:#a89468;margin-bottom:8px;">A Production Of</div>
    <div style="font-size:26px;color:#e8a33d;margin-bottom:60px;">Cherry Buddha</div>
    <div style="font-size:15px;color:#a89468;margin-bottom:8px;">Built With</div>
    <div style="font-size:20px;color:var(--parchment);margin-bottom:80px;">TypeScript · Three.js · Vite</div>
    <div style="font-size:18px;color:#776;">Thank you for playing.</div>`;

  const back = button('Return to the Keep', () => screens.show('mainMenu'), 'btn small');
  back.style.cssText += 'position:absolute;bottom:24px;right:24px;z-index:5;';

  root.append(style, scroll, castle, torches, back);
  return { root };
}
