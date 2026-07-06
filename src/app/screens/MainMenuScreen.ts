import { el, button } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import type { Screen, ScreenManager } from '../ScreenManager';

export const PROFILE_ICONS: Record<string, string> = {
  crown: '👑',
  knight: '🛡️',
  dragon: '🐉',
  castle: '🏰',
  monk: '🧘',
  falcon: '🦅',
  lion: '🦁',
  elephant: '🐘',
  crescent: '🌙',
  samurai: '👺',
};

export function createMainMenuScreen(screens: ScreenManager): Screen {
  const root = el('div');
  root.style.cssText =
    'background: radial-gradient(ellipse at 50% 30%, #2a2013 0%, #0c0a08 70%);';

  // Decorative background handled later by menu 3D scene (M12); banner art via CSS for now.
  const banner = el('div');
  banner.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0.25;
    background-image: repeating-linear-gradient(90deg, transparent 0 120px, rgba(212,175,55,0.06) 120px 124px);`;

  const title = el('div', { className: 'screen-title', text: 'KINGS OF THE KEEP' });
  title.style.fontSize = '54px';
  const subtitle = el('div', { text: 'Build your keep. Raise your army. Command the war.' });
  subtitle.style.cssText = 'color:#a89468;margin-bottom:40px;font-style:italic;';

  const buttons = el('div', { className: 'menu-buttons' }, [
    button('Play', () => screens.show('playSetup')),
    button('Deck Editor', () => screens.show('deckEditor')),
    button('Shop', () => screens.show('shop')),
    button('Options', () => screens.show('options')),
    button('Credits', () => screens.show('credits')),
    button('Exit', () => {
      showModal('Leave the Realm?', 'Do you wish to exit the game?', [
        {
          label: 'Yes',
          danger: true,
          onClick: () => {
            saveStore.flush();
            document.body.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#d4af37;font-family:Georgia,serif;font-size:24px;">Farewell, Commander. You may now close this tab.</div>';
            window.close();
          },
        },
        { label: 'No', primary: true },
      ]);
    }),
  ]);

  // Profile chip (top-right)
  const iconEl = el('div', { className: 'profile-icon' });
  const nameEl = el('span');
  const chip = el('div', { className: 'profile-chip' }, [iconEl, nameEl]);
  chip.addEventListener('click', () => openProfileEditor());
  const topRight = el('div', { className: 'top-right' }, [chip]);

  function refreshProfile() {
    iconEl.textContent = PROFILE_ICONS[saveStore.data.profile.icon] ?? '👑';
    nameEl.textContent = saveStore.data.profile.name;
  }

  function openProfileEditor() {
    const backdrop = el('div', { className: 'modal-backdrop' });
    const modal = el('div', { className: 'modal' }, [el('h2', { text: 'Commander Profile' })]);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 20;
    nameInput.value = saveStore.data.profile.name;
    nameInput.style.cssText = 'width:100%;margin-bottom:16px;text-align:center;font-size:16px;';

    const iconGrid = el('div');
    iconGrid.style.cssText =
      'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;';
    let selectedIcon = saveStore.data.profile.icon;
    const cells: HTMLElement[] = [];
    for (const [key, emoji] of Object.entries(PROFILE_ICONS)) {
      const cell = el('div', { text: emoji, title: key });
      cell.style.cssText = `font-size:26px;padding:8px;border-radius:8px;cursor:pointer;text-align:center;
        border:2px solid ${key === selectedIcon ? 'var(--gold)' : 'transparent'};background:#241b10;`;
      cell.addEventListener('click', () => {
        selectedIcon = key;
        cells.forEach((c) => (c.style.borderColor = 'transparent'));
        cell.style.borderColor = 'var(--gold)';
      });
      cells.push(cell);
      iconGrid.append(cell);
    }

    // Stats summary
    const s = saveStore.data.stats;
    const stats = el('p', {
      text: `Matches: ${s.matches}   Wins: ${s.wins}   Losses: ${s.losses}   Packs opened: ${s.packsOpened}`,
    });
    stats.style.fontSize = '13px';

    const row = el('div', { className: 'modal-buttons' }, [
      button('Save', () => {
        saveStore.data.profile.name = nameInput.value.trim() || 'Lord Commander';
        saveStore.data.profile.icon = selectedIcon;
        saveStore.save();
        refreshProfile();
        backdrop.remove();
      }, 'btn small primary'),
      button('Cancel', () => backdrop.remove(), 'btn small'),
    ]);

    modal.append(nameInput, iconGrid, stats, row);
    backdrop.append(modal);
    document.body.append(backdrop);
  }

  const version = el('div', { text: 'v0.1 — single player' });
  version.style.cssText = 'position:absolute;bottom:14px;left:18px;font-size:12px;color:#665;';

  root.append(banner, title, subtitle, buttons, topRight, version);

  return {
    root,
    onShow() {
      refreshProfile();
    },
  };
}
