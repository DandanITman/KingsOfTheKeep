import { el, button, selectInput, formRow } from '@/ui/components/dom';
import { showModal } from '@/ui/components/Modal';
import { saveStore } from '@/core/save/SaveStore';
import { factionList } from '@/data/factions';
import { MAPS } from '@/data/maps';
import type { BotDifficulty, FactionId, MatchSetup, VictoryMode } from '@/data/types';
import type { Screen, ScreenManager } from '../ScreenManager';

export function createPlaySetupScreen(screens: ScreenManager): Screen {
  const root = el('div', { className: 'royal-screen' });

  const setup: MatchSetup = {
    mapId: MAPS[0].id,
    playerFaction: 'european',
    botFaction: 'european',
    botDifficulty: 'medium',
    playerDeckId: 'starter',
    botDeckId: 'preset',
    speed: 1,
    startingResources: 'standard',
    victoryMode: 'fortress',
    seed: 0,
  };

  const title = el('div', { className: 'screen-title', text: 'Muster for War' });

  // --- Play mode choice ---
  const modeRow = el('div');
  modeRow.style.cssText = 'display:flex;gap:16px;margin-bottom:26px;';
  const botBtn = button('Play Against Bot', () => {
    /* form below is always visible; this is the active mode */
  }, 'btn primary');
  const mpBtn = button('Multiplayer', () => {
    showModal('Coming Soon', 'Multiplayer battles are still being forged. Check back in a future update!', [
      { label: 'OK', primary: true },
    ]);
  });
  modeRow.append(botBtn, mpBtn);

  // --- Setup form ---
  const factions = factionList().map((f) => ({ value: f.id as FactionId, label: f.name }));

  const mapSelect = selectInput(
    MAPS.map((m) => ({ value: m.id, label: `${m.name} (${m.size})` })),
    setup.mapId,
    (v) => {
      setup.mapId = v;
      updateMapDesc();
    },
  );
  const mapDesc = el('div');
  mapDesc.style.cssText = 'font-size:12px;color:var(--muted);margin:-2px 0 6px;min-height:16px;';
  function updateMapDesc() {
    mapDesc.textContent = MAPS.find((m) => m.id === setup.mapId)?.description ?? '';
  }
  updateMapDesc();

  const playerDeckSelect = document.createElement('select');
  function refreshDeckOptions() {
    playerDeckSelect.innerHTML = '';
    const starter = document.createElement('option');
    starter.value = 'starter';
    starter.textContent = 'Starter Deck (recommended)';
    playerDeckSelect.append(starter);
    for (const deck of saveStore.data.decks.filter((d) => d.faction === setup.playerFaction)) {
      const o = document.createElement('option');
      o.value = deck.id;
      o.textContent = deck.name;
      playerDeckSelect.append(o);
    }
    playerDeckSelect.value = 'starter';
    setup.playerDeckId = 'starter';
  }
  playerDeckSelect.addEventListener('change', () => (setup.playerDeckId = playerDeckSelect.value));

  const form = el('div', { className: 'panel' });
  form.style.cssText += 'width:520px;max-height:56vh;overflow-y:auto;';
  form.append(
    formRow('Map', mapSelect),
    mapDesc,
    formRow(
      'Your Faction',
      selectInput(factions, setup.playerFaction, (v) => {
        setup.playerFaction = v;
        refreshDeckOptions();
      }),
    ),
    formRow('Bot Faction', selectInput(factions, setup.botFaction, (v) => (setup.botFaction = v))),
    formRow(
      'Bot Difficulty',
      selectInput<BotDifficulty>(
        [
          { value: 'easy', label: 'Easy — slow economy, late attacks' },
          { value: 'medium', label: 'Medium — balanced (standard)' },
          { value: 'hard', label: 'Hard — fast, counters, raids' },
        ],
        setup.botDifficulty,
        (v) => (setup.botDifficulty = v),
      ),
    ),
    formRow('Your Deck', playerDeckSelect),
    formRow(
      'Bot Deck',
      selectInput(
        [{ value: 'preset', label: 'Faction preset' }],
        'preset',
        (v) => (setup.botDeckId = v),
      ),
    ),
    formRow(
      'Match Speed',
      selectInput(
        [
          { value: '0.5', label: '0.5× — relaxed' },
          { value: '1', label: '1× — normal' },
          { value: '1.5', label: '1.5× — brisk' },
          { value: '2', label: '2× — fast' },
        ],
        String(setup.speed),
        (v) => (setup.speed = Number(v)),
      ),
    ),
    formRow(
      'Starting Resources',
      selectInput(
        [
          { value: 'standard', label: 'Standard' },
          { value: 'rich', label: 'Rich — double start' },
        ],
        setup.startingResources,
        (v) => (setup.startingResources = v as MatchSetup['startingResources']),
      ),
    ),
    formRow(
      'Victory Condition',
      selectInput<VictoryMode>(
        [
          { value: 'fortress', label: 'Destroy the Main Fortress' },
          { value: 'shrines', label: 'Capture the Shrines' },
          { value: 'survival', label: 'Survive the Waves' },
          { value: 'timedScore', label: 'Score Victory (20 min)' },
          { value: 'annihilation', label: 'Destroy All Military' },
        ],
        setup.victoryMode,
        (v) => (setup.victoryMode = v),
      ),
    ),
  );
  refreshDeckOptions();

  const actions = el('div');
  actions.style.cssText = 'display:flex;gap:14px;margin-top:24px;';
  actions.append(
    button('To Battle!', () => {
      setup.seed = (Date.now() % 0xffffffff) >>> 0;
      screens.show('loading', { ...setup });
    }, 'btn primary'),
    button('Back', () => screens.show('mainMenu')),
  );

  root.append(title, modeRow, form, actions);

  return {
    root,
    onShow() {
      refreshDeckOptions();
    },
  };
}
