/**
 * Hover-to-inspect: linger on any card tile (or unit button) for a moment and
 * an enlarged floating detail card appears beside it — spinning 3D model,
 * exact stats, full description. One popup at a time, app-wide.
 */

import type { Card } from '@/data/types';
import { buildCardFace } from './CardFace';

const DEFAULT_DELAY_MS = 450;

let activePopup: { root: HTMLElement; dispose: () => void; owner: HTMLElement } | null = null;

export function hideCardPopup(): void {
  if (activePopup) {
    activePopup.dispose();
    activePopup.root.remove();
    activePopup = null;
  }
}

function showPopup(owner: HTMLElement, card: Card): void {
  hideCardPopup();
  const { root, dispose } = buildCardFace(card, { size: 'detail', model: true });
  root.classList.add('pcard-float');
  document.body.append(root);

  // Position beside the anchor: prefer right, fall back left, clamp to viewport.
  const anchor = owner.getBoundingClientRect();
  const w = root.offsetWidth;
  const h = root.offsetHeight;
  const margin = 10;
  let x = anchor.right + margin;
  if (x + w > window.innerWidth - margin) x = anchor.left - margin - w;
  if (x < margin) x = Math.min(window.innerWidth - w - margin, Math.max(margin, anchor.left));
  let y = anchor.top + anchor.height / 2 - h / 2;
  y = Math.max(margin, Math.min(window.innerHeight - h - margin, y));
  root.style.left = `${Math.round(x)}px`;
  root.style.top = `${Math.round(y)}px`;
  requestAnimationFrame(() => root.classList.add('shown'));

  activePopup = { root, dispose, owner };
}

// Any click or scroll dismisses the popup (capture phase: fire before handlers
// that might re-render the DOM under the pointer).
window.addEventListener('pointerdown', hideCardPopup, true);
window.addEventListener('wheel', hideCardPopup, { capture: true, passive: true });

export interface CardHoverOptions {
  delayMs?: number;
}

/**
 * Wires hover-intent on `target`: after a short linger the detail popup for
 * `getCard()` appears. Returns a disposer (also detaches listeners).
 */
export function attachCardHover(
  target: HTMLElement,
  getCard: () => Card | null,
  opts: CardHoverOptions = {},
): () => void {
  const delay = opts.delayMs ?? DEFAULT_DELAY_MS;
  let timer = 0;
  let over = false;

  const cancel = (): void => {
    over = false;
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
    if (activePopup?.owner === target) hideCardPopup();
  };
  const enter = (): void => {
    over = true;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      const card = getCard();
      if (card && target.isConnected && over) showPopup(target, card);
    }, delay);
  };

  target.addEventListener('mouseenter', enter);
  target.addEventListener('mouseleave', cancel);
  return () => {
    target.removeEventListener('mouseenter', enter);
    target.removeEventListener('mouseleave', cancel);
    cancel();
  };
}
