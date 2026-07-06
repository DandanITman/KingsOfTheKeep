import '@/ui/styles/main.css';
import '@/ui/styles/hud.css';
import { createMatchScreen } from '@/app/screens/MatchScreen';
import { createDeckEditorScreen } from '@/app/screens/DeckEditorScreen';
import { createShopScreen } from '@/app/screens/ShopScreen';
import { validateCardDb } from '@/data/cards';
import { ensureStarterCollection } from '@/data/deckValidation';
import { STARTER_DECKS } from '@/data/starterDecks';
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
screens.register('deckEditor', () => createDeckEditorScreen(screens));
screens.register('shop', () => createShopScreen(screens));
screens.register('match', () => createMatchScreen(screens));

const dbErrors = validateCardDb();
if (dbErrors.length > 0) console.error('Card DB validation errors:', dbErrors);

// Grant the launch collection (starter deck cards + all commons).
const starterCardIds = Object.values(STARTER_DECKS).flatMap((d) => d?.cardIds ?? []);
ensureStarterCollection(saveStore.data.collection, starterCardIds);
saveStore.save();

// Apply persisted UI scale
document.documentElement.style.fontSize = `${16 * saveStore.data.options.display.uiScale}px`;

screens.show('splash');
