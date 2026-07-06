import '@/ui/styles/main.css';
import { ScreenManager } from '@/app/ScreenManager';
import { createSplashScreen } from '@/app/screens/SplashScreen';
import { createMainMenuScreen } from '@/app/screens/MainMenuScreen';
import { createPlaySetupScreen } from '@/app/screens/PlaySetupScreen';
import { createOptionsScreen } from '@/app/screens/OptionsScreen';
import { createCreditsScreen } from '@/app/screens/CreditsScreen';
import { createLoadingScreen } from '@/app/screens/LoadingScreen';
import { createStubScreen } from '@/app/screens/stubs';
import { saveStore } from '@/core/save/SaveStore';

const app = document.getElementById('app')!;
const screens = new ScreenManager(app);

screens.register('splash', () => createSplashScreen(screens));
screens.register('mainMenu', () => createMainMenuScreen(screens));
screens.register('playSetup', () => createPlaySetupScreen(screens));
screens.register('options', () => createOptionsScreen(screens));
screens.register('credits', () => createCreditsScreen(screens));
screens.register('loading', () => createLoadingScreen(screens));
screens.register('deckEditor', () =>
  createStubScreen(screens, 'Deck Editor', 'The war table is being carved. Deck building arrives soon.'),
);
screens.register('shop', () =>
  createStubScreen(screens, 'Shop', 'The merchants are still stocking their stalls.'),
);
screens.register('match', () =>
  createStubScreen(screens, 'Match', 'The battlefield is under construction.'),
);

// Apply persisted UI scale
document.documentElement.style.fontSize = `${16 * saveStore.data.options.display.uiScale}px`;

screens.show('splash');
