import { el, button } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import { icon } from '@/ui/icons';
import gameLogoUrl from '@/assets/kings-of-the-keep-logo.png';
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
  const root = el('div', { className: 'main-menu-screen' });

  // Decorative background handled later by menu 3D scene (M12); banner art via CSS for now.
  const banner = el('div', { className: 'menu-crest-backdrop' });

  const gameLogo = document.createElement('img');
  gameLogo.className = 'game-logo';
  gameLogo.src = gameLogoUrl;
  gameLogo.alt = 'Kings of the Keep';

  const subtitle = el('div', {
    className: 'menu-subtitle',
    text: 'Build your keep. Raise your army. Command the war.',
  });

  const menuAction = (label: string, iconName: string, onClick: () => void, primary = false) => {
    const action = button(label, onClick, `menu-action${primary ? ' menu-action-primary' : ''}`);
    action.innerHTML = `<span class="menu-action-icon" aria-hidden="true">${icon(iconName)}</span><span class="menu-action-label">${label}</span>`;
    return action;
  };

  const buttons = el('nav', { className: 'menu-buttons' }, [
    menuAction('Play', 'longsword', () => screens.show('playSetup'), true),
    menuAction('Deck Editor', 'menuDeck', () => screens.show('deckEditor')),
    menuAction('Shop', 'menuShop', () => screens.show('shop')),
    menuAction('Options', 'gears', () => screens.show('options')),
    menuAction('Credits', 'menuCredits', () => screens.show('credits')),
    menuAction('Exit', 'menuExit', () => {
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

  const divider = el('div', { className: 'menu-divider', html: '<span></span><i>◆</i><span></span>' });
  const masthead = el('header', { className: 'menu-masthead' }, [gameLogo, subtitle, divider]);
  const frame = el('main', { className: 'menu-frame' }, [masthead, buttons]);

  // Profile chip (top-right)
  const iconEl = el('div', { className: 'profile-icon' });
  const nameEl = el('span');
  const chip = el('div', { className: 'profile-chip' }, [iconEl, nameEl]);
  chip.addEventListener('click', () => openProfileEditor());
  const topRight = el('div', { className: 'top-right' }, [chip]);

  function refreshProfile() {
    const selectedIcon = saveStore.data.profile.icon;
    iconEl.innerHTML = selectedIcon === 'crown'
      ? icon('menuCrown')
      : (PROFILE_ICONS[selectedIcon] ?? '👑');
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
        border:2px solid ${key === selectedIcon ? 'var(--gold)' : 'transparent'};background:#041d31;`;
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

  const version = el('div', { className: 'version-tag', text: 'v0.1 — single player' });

  root.append(banner, frame, topRight, version);

  return {
    root,
    onShow() {
      refreshProfile();
    },
  };
}
