import { el, button } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import { factionList } from '@/data/factions';
import { MAPS } from '@/data/maps';
import type { BotDifficulty, FactionId, MatchSetup } from '@/data/types';
import { icon } from '@/ui/icons';
import type { Screen, ScreenManager } from '../ScreenManager';

type PlayableFaction = Exclude<FactionId, 'neutral'>;

const MAP_ART: Record<string, string> = {
  greenvaleCrossing: '/assets/ui/play-setup/greenvale-crossing.png',
  twinKeepsValley: '/assets/ui/play-setup/twin-keeps-valley.png',
  sunscarDunes: '/assets/ui/play-setup/sunscar-dunes.png',
  riverCrown: '/assets/ui/play-setup/river-crown.png',
  ashenRidge: '/assets/ui/play-setup/ashen-ridge.png',
  fourKingsBasin: '/assets/ui/play-setup/four-kings-basin.png',
};

const FACTION_ART: Record<PlayableFaction, string> = {
  european: '/assets/ui/play-setup/european-medallion.png',
  asian: '/assets/ui/play-setup/asian-medallion.png',
  african: '/assets/ui/play-setup/african-medallion.png',
  middleEastern: '/assets/ui/play-setup/middle-eastern-medallion.png',
};

const DIFFICULTIES: { id: BotDifficulty; label: string; stars: number }[] = [
  { id: 'easy', label: 'Easy', stars: 1 },
  { id: 'medium', label: 'Medium — balanced', stars: 2 },
  { id: 'hard', label: 'Hard', stars: 3 },
];

function iconButton(label: string, iconName: string, onClick: () => void, className = 'setup-icon-button'): HTMLButtonElement {
  const control = button('', onClick, className);
  control.title = label;
  control.setAttribute('aria-label', label);
  control.innerHTML = icon(iconName);
  return control;
}

function iconMarkup(iconName: string): HTMLElement {
  return el('span', { className: 'setup-heading-icon', html: icon(iconName) });
}

export function createPlaySetupScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'play-setup-screen' });
  const factions = factionList() as { id: PlayableFaction; name: string }[];

  const setup: MatchSetup = {
    mapId: MAPS[0].id,
    playerFaction: 'european',
    botFaction: 'european',
    botDifficulty: 'medium',
    // Match configuration remains deliberately fixed for the focused setup flow.
    playerDeckId: 'starter',
    botDeckId: 'preset',
    speed: 1,
    startingResources: 'standard',
    victoryMode: 'fortress',
    seed: 0,
  };

  const commanderName = el('strong');
  const commanderLevel = el('span');
  const commander = el('button', { className: 'setup-commander' }, [
    el('span', { className: 'setup-commander-crest', html: icon('menuCrown') }),
    el('span', { className: 'setup-commander-copy' }, [commanderName, commanderLevel]),
  ]);
  commander.type = 'button';
  commander.title = 'Commander profile';
  commander.addEventListener('click', () => screens.show('mainMenu'));

  const topBar = el('header', { className: 'setup-topbar' }, [
    commander,
    el('div', { className: 'setup-utility-actions' }, [
      iconButton('Options', 'gears', () => screens.show('options', { returnTo: 'playSetup' })),
      iconButton('Battle Codex', 'setupBook', () => {
        showModal('Battle Codex', 'Choose a map, your faction, your opponent, and a difficulty. Your standard starter deck and fortress victory are prepared automatically.', [
          { label: 'Understood', primary: true },
        ]);
      }),
      iconButton('Return to Main Menu', 'menuExit', () => screens.show('mainMenu')),
    ]),
  ]);

  const masthead = el('section', { className: 'setup-masthead' }, [
    el('span', { className: 'setup-masthead-crown', html: icon('menuCrown') }),
    el('h1', { text: 'Kings of the Keep' }),
    el('div', { className: 'setup-title-divider', html: '<span></span><i>◆</i><span></span>' }),
  ]);

  const botMode = button('', () => undefined, 'setup-mode setup-mode-active');
  botMode.innerHTML = `<span class="setup-mode-icon">${icon('shield')}</span><span>Play Against Bot</span>`;
  const multiplayerMode = button('', () => {
    showModal('Coming Soon', 'Multiplayer battles are still being forged. Check back in a future update!', [{ label: 'OK', primary: true }]);
  }, 'setup-mode setup-mode-locked');
  multiplayerMode.innerHTML = `<span class="setup-mode-icon">${icon('longsword')}</span><span class="setup-mode-copy">Multiplayer<small>Coming Soon</small></span><span class="setup-mode-lock">${icon('setupLock')}</span>`;
  const modes = el('div', { className: 'setup-modes' }, [botMode, multiplayerMode]);

  const mapImage = document.createElement('img');
  mapImage.className = 'setup-map-image';
  const mapName = el('div', { className: 'setup-map-name' });
  const mapDescription = el('p', { className: 'setup-map-description' });
  const mapDots = el('div', { className: 'setup-map-dots' });
  let mapIndex = 0;

  function selectMap(index: number): void {
    mapIndex = (index + MAPS.length) % MAPS.length;
    const selected = MAPS[mapIndex];
    setup.mapId = selected.id;
    mapImage.src = MAP_ART[selected.id];
    mapImage.alt = `${selected.name} map preview`;
    mapName.textContent = selected.name;
    mapDescription.textContent = selected.description;
    mapDots.replaceChildren(
      ...MAPS.map((map, i) => {
        const dot = button('', () => selectMap(i), `setup-map-dot${i === mapIndex ? ' active' : ''}`);
        dot.setAttribute('aria-label', `Select ${map.name}`);
        return dot;
      }),
    );
  }

  const mapCard = el('section', { className: 'setup-selector-card setup-map-card' }, [
    el('h2', { className: 'setup-selector-title' }, [iconMarkup('setupMap'), el('span', { text: 'Map' })]),
    el('div', { className: 'setup-map-preview' }, [
      mapImage,
      iconButton('Previous map', 'setupChevronLeft', () => selectMap(mapIndex - 1), 'setup-carousel-arrow setup-carousel-left'),
      iconButton('Next map', 'setupChevronRight', () => selectMap(mapIndex + 1), 'setup-carousel-arrow setup-carousel-right'),
    ]),
    mapName,
    mapDots,
    mapDescription,
  ]);

  function factionCard(
    title: string,
    headingIcon: string,
    getSelected: () => PlayableFaction,
    setSelected: (faction: PlayableFaction) => void,
  ): HTMLElement {
    const selectedImage = document.createElement('img');
    selectedImage.className = 'setup-faction-emblem';
    const selectedName = el('div', { className: 'setup-faction-name' });
    const chooser = el('div', { className: 'setup-faction-choices' });

    const step = (delta: number) => {
      const index = factions.findIndex((faction) => faction.id === getSelected());
      setSelected(factions[(index + delta + factions.length) % factions.length].id);
      render();
    };

    const render = () => {
      const selected = factions.find((faction) => faction.id === getSelected())!;
      selectedImage.src = FACTION_ART[selected.id];
      selectedImage.alt = `${selected.name} faction emblem`;
      selectedName.textContent = selected.name;
      chooser.replaceChildren(
        ...factions.map((faction) => {
          const choice = button('', () => {
            setSelected(faction.id);
            render();
          }, `setup-faction-choice${faction.id === getSelected() ? ' active' : ''}`);
          choice.title = faction.name;
          choice.setAttribute('aria-label', `Select ${faction.name} faction`);
          const image = document.createElement('img');
          image.src = FACTION_ART[faction.id];
          image.alt = '';
          choice.append(image);
          return choice;
        }),
      );
    };

    const card = el('section', { className: 'setup-selector-card setup-faction-card' }, [
      el('h2', { className: 'setup-selector-title' }, [iconMarkup(headingIcon), el('span', { text: title })]),
      el('div', { className: 'setup-faction-feature' }, [
        iconButton(`Previous ${title}`, 'setupChevronLeft', () => step(-1), 'setup-faction-arrow'),
        el('div', { className: 'setup-faction-focus' }, [selectedImage, selectedName]),
        iconButton(`Next ${title}`, 'setupChevronRight', () => step(1), 'setup-faction-arrow'),
      ]),
      chooser,
    ]);
    render();
    return card;
  }

  const playerFactionCard = factionCard('Your Faction', 'setupPlayerFaction', () => setup.playerFaction as PlayableFaction, (faction) => {
    setup.playerFaction = faction;
  });
  const botFactionCard = factionCard('Bot Faction', 'setupBotFaction', () => setup.botFaction as PlayableFaction, (faction) => {
    setup.botFaction = faction;
  });

  const difficultyRows = new Map<BotDifficulty, HTMLButtonElement>();
  function selectDifficulty(difficulty: BotDifficulty): void {
    setup.botDifficulty = difficulty;
    difficultyRows.forEach((row, id) => row.classList.toggle('active', id === difficulty));
  }

  const difficultyList = el('div', { className: 'setup-difficulty-list' });
  for (const difficulty of DIFFICULTIES) {
    const row = button('', () => selectDifficulty(difficulty.id), 'setup-difficulty-row');
    row.innerHTML = `<span>${difficulty.label}</span><span class="setup-difficulty-stars" aria-label="${difficulty.stars} star difficulty">${'★'.repeat(difficulty.stars)}</span>`;
    difficultyRows.set(difficulty.id, row);
    difficultyList.append(row);
  }
  selectDifficulty(setup.botDifficulty);
  const difficultyCard = el('section', { className: 'setup-selector-card setup-difficulty-card' }, [
    el('h2', { className: 'setup-selector-title' }, [iconMarkup('setupHelmet'), el('span', { text: 'Bot Difficulty' })]),
    difficultyList,
  ]);

  const settingsHeader = el('div', { className: 'setup-settings-heading' }, [el('span'), el('h2', { text: 'Match Settings' }), el('span')]);
  const settingsPanel = el('main', { className: 'setup-settings-panel' }, [settingsHeader, el('div', { className: 'setup-selector-grid' }, [
    mapCard,
    playerFactionCard,
    botFactionCard,
    difficultyCard,
  ])]);

  const gameSettings = button('', () => screens.show('options', { returnTo: 'playSetup' }), 'setup-bottom-button');
  gameSettings.innerHTML = `<span>${icon('setupSliders')}</span><span>Game Settings</span>`;
  const toBattle = button('', () => {
    setup.seed = (Date.now() % 0xffffffff) >>> 0;
    screens.show('loading', { ...setup });
  }, 'setup-battle-button');
  toBattle.innerHTML = `<span>${icon('longsword')}</span><span>To Battle!</span>`;
  const back = button('', () => screens.show('mainMenu'), 'setup-bottom-button setup-back-button');
  back.innerHTML = `<span>${icon('setupBack')}</span><span>Back</span>`;
  const actions = el('footer', { className: 'setup-actions' }, [gameSettings, toBattle, back]);

  function refreshCommander(): void {
    const profile = saveStore.data.profile;
    const stats = saveStore.data.stats;
    const level = 1 + Math.floor(Math.sqrt(stats.matches + stats.wins * 2));
    commanderName.textContent = profile.name;
    commanderLevel.textContent = `Level ${level}`;
  }

  root.append(topBar, masthead, modes, settingsPanel, actions);
  selectMap(mapIndex);

  return {
    root,
    onShow() {
      refreshCommander();
      selectMap(mapIndex);
      selectDifficulty(setup.botDifficulty);
    },
  };
}
