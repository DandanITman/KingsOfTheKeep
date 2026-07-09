import { el, button, selectInput, sliderInput, formRow, checkbox } from '@/ui/components/dom';
import { saveStore } from '@/core/save/SaveStore';
import type { Screen, ScreenManager, ScreenName } from '../ScreenManager';

export function createOptionsScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'royal-screen' });
  let returnTo: ScreenName = 'mainMenu';

  const title = el('div', { className: 'screen-title', text: 'Options' });

  const o = saveStore.data.options;
  const save = () => saveStore.save();

  // Tabs
  const tabNames = ['Display', 'Audio', 'Gameplay'] as const;
  const tabBar = el('div');
  tabBar.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
  const panels: Record<string, HTMLElement> = {};

  const displayPanel = el('div', { className: 'panel' });
  displayPanel.append(
    formRow(
      'Graphics Quality',
      selectInput(
        [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
        o.display.quality,
        (v) => ((o.display.quality = v), save()),
      ),
    ),
    formRow(
      'Shadows',
      selectInput(
        [
          { value: 'off', label: 'Off' },
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ],
        o.display.shadows,
        (v) => ((o.display.shadows = v), save()),
      ),
    ),
    formRow(
      'Camera Speed',
      sliderInput(0.5, 2, 0.1, o.display.cameraSpeed, (v) => ((o.display.cameraSpeed = v), save()), (v) =>
        `${v.toFixed(1)}×`,
      ),
    ),
    formRow(
      'UI Scale',
      sliderInput(0.8, 1.3, 0.05, o.display.uiScale, (v) => {
        o.display.uiScale = v;
        document.documentElement.style.fontSize = `${16 * v}px`;
        save();
      }, (v) => `${Math.round(v * 100)}%`),
    ),
    formRow('Camera Edge Scrolling', checkbox(o.display.edgeScroll, (v) => ((o.display.edgeScroll = v), save()))),
    formRow(
      'Health Bars',
      selectInput(
        [
          { value: 'always', label: 'Always' },
          { value: 'damaged', label: 'Damaged Only' },
          { value: 'selected', label: 'Selected Only' },
        ],
        o.display.healthBars,
        (v) => ((o.display.healthBars = v), save()),
      ),
    ),
    formRow(
      'Unit Labels',
      selectInput(
        [
          { value: 'off', label: 'Off' },
          { value: 'important', label: 'Important Only' },
          { value: 'all', label: 'All' },
        ],
        o.display.unitLabels,
        (v) => ((o.display.unitLabels = v), save()),
      ),
    ),
  );

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const audioPanel = el('div', { className: 'panel' });
  audioPanel.append(
    formRow('Master Volume', sliderInput(0, 1, 0.05, o.audio.master, (v) => ((o.audio.master = v), save()), pct)),
    formRow('Music Volume', sliderInput(0, 1, 0.05, o.audio.music, (v) => ((o.audio.music = v), save()), pct)),
    formRow('Sound Effects', sliderInput(0, 1, 0.05, o.audio.sfx, (v) => ((o.audio.sfx = v), save()), pct)),
    formRow('UI Sounds', sliderInput(0, 1, 0.05, o.audio.ui, (v) => ((o.audio.ui = v), save()), pct)),
    formRow('Battle Ambience', sliderInput(0, 1, 0.05, o.audio.ambience, (v) => ((o.audio.ambience = v), save()), pct)),
    formRow('Mute When Unfocused', checkbox(o.audio.muteUnfocused, (v) => ((o.audio.muteUnfocused = v), save()))),
  );

  const gameplayPanel = el('div', { className: 'panel' });
  gameplayPanel.append(
    formRow('Auto-Assign Civilians', checkbox(o.gameplay.autoAssignCivilians, (v) => ((o.gameplay.autoAssignCivilians = v), save()))),
    formRow('Show Beginner Tips', checkbox(o.gameplay.beginnerTips, (v) => ((o.gameplay.beginnerTips = v), save()))),
    formRow('Pause Game In Menus', checkbox(o.gameplay.pauseOnMenu, (v) => ((o.gameplay.pauseOnMenu = v), save()))),
    formRow(
      'Attack Behavior',
      selectInput(
        [
          { value: 'aggressive', label: 'Aggressive' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'conservative', label: 'Conservative' },
        ],
        o.gameplay.attackBehavior,
        (v) => ((o.gameplay.attackBehavior = v), save()),
      ),
    ),
    formRow(
      'Defend Behavior',
      selectInput(
        [
          { value: 'holdWalls', label: 'Hold Walls' },
          { value: 'patrolBase', label: 'Patrol Base' },
          { value: 'protectEconomy', label: 'Protect Economy' },
        ],
        o.gameplay.defendBehavior,
        (v) => ((o.gameplay.defendBehavior = v), save()),
      ),
    ),
  );

  panels['Display'] = displayPanel;
  panels['Audio'] = audioPanel;
  panels['Gameplay'] = gameplayPanel;

  const panelWrap = el('div');
  panelWrap.style.cssText = 'width:520px;max-height:56vh;overflow-y:auto;';

  const tabButtons: HTMLButtonElement[] = [];
  function showTab(name: string) {
    panelWrap.innerHTML = '';
    panelWrap.append(panels[name]);
    tabButtons.forEach((b) => b.classList.toggle('primary', b.textContent === name));
  }
  for (const name of tabNames) {
    const b = button(name, () => showTab(name), 'btn small');
    tabButtons.push(b);
    tabBar.append(b);
  }
  showTab('Display');

  const back = button('Back', () => screens.show(returnTo));
  back.style.marginTop = '22px';

  root.append(title, tabBar, panelWrap, back);
  return {
    root,
    onShow(params) {
      returnTo = (params as { returnTo?: ScreenName } | undefined)?.returnTo ?? 'mainMenu';
    },
  };
}
