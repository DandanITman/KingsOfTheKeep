# Kings of the Keep  
## Expanded Game Design & Technical Requirements Specification  
### Version 0.2 — Macro RTS / Card-Based Army Builder

---

# 1. Game Overview

**Kings of the Keep** is a 3D real-time strategy game focused on **economy management, base development, card-based army construction, and macro-scale battles** rather than high-intensity unit micromanagement.

The player begins each match with a **Main Keep**, builds an economy, expands across the map, constructs military infrastructure, summons or trains units through faction-specific cards, and wins by destroying the enemy’s Main Fortress.

The game is inspired by classic RTS games, fortress defense games, card-based army builders, and large-scale fantasy/historical battles. It should feel like a mix of:

- **Age of Empires** economy and base growth
- **BattleForge-style card/deck army identity**
- **Warcraft III-style faction personality**
- **Total War-lite battle staging**
- **Auto-battler-inspired macro control**
- **Tower defense / fortress defense positioning**

The player should feel like a **king, commander, or warlord**, not like someone babysitting every single unit.

---

# 2. Core Design Pillars

## 2.1 Simple to Control, Deep to Master

The game should be easy to pick up:

- Build economy.
- Build military structures.
- Play cards.
- Create an army.
- Press **Attack** or **Defend**.
- Place flags.
- Watch armies clash.

But it should have long-term depth through:

- Deck building
- Faction strategy
- Resource balancing
- Army composition
- Map control
- Defensive planning
- Tech upgrades
- Counter units
- Timing attacks
- Bot difficulty scaling
- Future multiplayer meta

The player should not need to constantly click every soldier.

---

## 2.2 Macro Battles Over Micro Management

The player should control the **intent** of the army more than individual unit actions.

Instead of:

> Select 15 archers, focus this unit, kite backwards, split formation, cast 7 spells manually.

The game should focus on:

> Assign 30% infantry, 25% archers, 20% cavalry, 15% siege, 10% defense. Place an attack flag near the enemy wall. Activate Battle March.

The player should be rewarded for planning, economy, army composition, and timing.

---

## 2.3 Card-Based Identity

Everything important comes from cards:

- Main Fortress
- Civilian units
- Economy buildings
- Military buildings
- Upgrade buildings
- Units
- Walls
- Towers
- Siege engines
- Special abilities
- Faction bonuses
- Future heroes/champions

Cards are chosen before the match in faction-specific decks.

Each faction has its own cards and cannot mix with other factions at launch.

---

## 2.4 Factions Should Feel Distinct

The four launch factions are:

1. **European**
2. **Asian**
3. **African**
4. **Middle Eastern**

Each faction should have unique:

- Architecture
- Unit silhouettes
- Economy style
- Defensive style
- Army identity
- Special abilities
- Strengths and weaknesses
- Upgrade paths

The game should not simply reskin the same units four times.

---

## 2.5 Economy Is the Heart of the Game

The player wins by building a stronger economy and converting that economy into battlefield pressure.

Resources should be easy to understand, but deep enough to create real strategic choices.

| Resource | Purpose |
|---|---|
| Food | Civilian units, infantry, cavalry, population growth |
| Wood | Basic buildings, archers, camps, early defenses |
| Stone | Walls, towers, keeps, fortifications, siege durability |
| Gold | Advanced units, upgrades, elite units, special cards |
| Command | Army size / population cap system |
| Influence | Late-game special abilities, faction powers, elite tech |

For the first playable prototype, the game can start with only:

- Food
- Wood
- Stone
- Gold
- Population / Command

Influence can be added later.

---

# 3. Target Platform and Tech Stack

## 3.1 Recommended Initial Platform

The recommended first version should be a **browser-based 3D RTS prototype**.

This keeps development faster, easier to test, and easier for AI coding tools to iterate on.

## 3.2 Recommended Tech Stack

### Core Game

| Layer | Recommended Tech |
|---|---|
| Language | TypeScript |
| Rendering | Three.js |
| App Framework | React or vanilla TypeScript UI layer |
| Build Tool | Vite |
| Physics | Rapier.js or simple custom collision initially |
| Pathfinding | Navmesh/grid-based A* |
| State Management | Zustand, Redux Toolkit, or custom ECS-style game state |
| UI | HTML/CSS overlay or React UI |
| Audio | Howler.js |
| Save Data | LocalStorage first, Firebase later |
| Backend Future | Firebase Auth + Firestore |
| Multiplayer Future | Colyseus, Nakama, or custom WebSocket server |
| Deployment | Static web app first; Firebase Hosting, Vercel, Netlify, or Cloudflare Pages |

---

## 3.3 Why Browser First?

Browser-first is recommended because:

- Faster iteration
- Easier AI-assisted development
- No install required
- Easy sharing with testers
- 3D RTS prototype is possible with Three.js
- Menus, deck editing, card shops, and game UI are easier to build
- Multiplayer can be added later through WebSockets

The first version does **not** need to be an Unreal-level RTS. It should prove the core loop first.

---

## 3.4 Future Engine Migration

The game should be designed in a way that could later migrate to:

- Godot
- Unity
- Unreal Engine

To support this, the implementation should separate:

- Game rules
- Unit stats
- Card data
- Faction data
- Match simulation
- UI logic
- Rendering logic

All unit and card data should be stored in external JSON-style data files or modular TypeScript data objects.

---

# 4. Branding and Presentation

## 4.1 Studio Splash Screen

On launch, show a simple splash screen.

### Splash Screen Requirements

Text:

> Cherry Buddha

Logo:

- A smiling Buddha icon
- Friendly, round, warm, peaceful
- Could be orange, gold, cherry red, or cream
- Should appear simple and memorable
- Should not feel religiously serious; more like a cozy indie studio logo

### Splash Behavior

- Fade in logo and text.
- Hold for 1.5 to 3 seconds.
- Fade out into main menu.
- Optional gentle chime or soft gong sound.
- Include “Click to Skip” after the first second.

---

# 5. Main Menu Flow

## 5.1 Main Menu Layout

The main menu should feel like a fantasy war table / castle hall.

### Visual Direction

- 3D animated background showing a keep, banners, torches, and distant armies.
- Camera slowly pans around a war table.
- Cards, maps, and faction banners visible.
- Music should be epic but not too intense.

### Main Menu Buttons

Main menu should include:

1. **Play**
2. **Deck Editor**
3. **Shop**
4. **Options**
5. **Credits**
6. **Exit**

Top-right should include:

- Player profile icon
- Player name
- Future account/login indicator
- Clickable profile panel

---

## 5.2 Player Icon

Top-right player icon should be changeable.

### MVP Version

- Local player name
- Choose from preset icons
- Icons include:
  - Crown
  - Knight helmet
  - Dragon
  - Castle
  - Monk
  - Falcon
  - Lion
  - Elephant
  - Crescent shield
  - Samurai mask

### Future Version

- Login required
- Player avatar stored online
- Profile stats shown
- Favorite faction shown
- Match history shown
- Decks stored online

---

# 6. Play Menu

Clicking **Play** opens a submenu.

## 6.1 Play Options

Buttons:

1. **Play Against Bot**
2. **Multiplayer**
3. **Back**

### Multiplayer Button

The multiplayer button should exist as a placeholder.

When clicked, show:

> Coming Soon

This should use a clean modal popup.

---

## 6.2 Bot Match Setup Screen

When clicking **Play Against Bot**, the player goes to a setup screen.

### Required Setup Options

The player chooses:

1. Map
2. Player faction
3. Bot faction
4. Bot difficulty
5. Player deck
6. Bot deck preset
7. Match speed setting
8. Starting resources
9. Victory condition

### Bot Difficulties

| Difficulty | Description |
|---|---|
| Easy | Slow economy, delayed attacks, weak army composition |
| Medium | Standard economy, balanced attacks, basic countering |
| Hard | Faster economy, better upgrades, attacks weak points, mixes unit types |

### Launch Bot Options

Bot should support:

- European bot
- Asian bot
- African bot
- Middle Eastern bot

### Map Selection

Initial maps:

| Map | Size | Description |
|---|---:|---|
| Greenvale Crossing | Small | Beginner map with open center and two gold deposits |
| Twin Keeps Valley | Small | Symmetrical map with forest and stone near each base |
| Sunscar Dunes | Medium | Desert map with exposed resources and wide attack lanes |
| River Crown | Medium | River crossings and choke points |
| Ashen Ridge | Large | Mountain lanes, high-ground siege positions |
| Four Kings Basin | Large | Designed for future 2v2 or free-for-all |

---

# 7. Login and Account System

## 7.1 MVP

For the MVP, login is not required.

Use local storage for:

- Player name
- Player icon
- Unlocked cards
- Decks
- Bot match stats
- Options settings

## 7.2 Future Online Login

Eventually add:

- Email login
- Google login
- Apple login if mobile or iOS is planned
- Account profile
- Cloud save
- Player inventory
- Deck storage
- Match history
- Ranked stats
- Multiplayer profile
- Shop purchases
- Card collection

## 7.3 Future Player Stats

Track:

- Matches played
- Wins
- Losses
- Win rate
- Favorite faction
- Most used card
- Average match time
- Fastest win
- Bot difficulty cleared
- Multiplayer rank
- Total resources gathered
- Total units trained
- Keeps destroyed
- Defensive structures built
- Packs opened
- Cards collected

---

# 8. Deck System

## 8.1 Core Deck Rules

Each player builds a faction deck before the match.

### Launch Rules

- Decks are faction-specific.
- Player cannot mix factions.
- Each deck has a maximum of **50 deck points**.
- Each card has a deck point value.
- Each deck may have up to **20 cards**.
- A deck must include exactly one **Main Fortress** card.
- The Main Fortress card is automatically played at match start.
- Certain required starter cards may be free or cost 0 deck points.

### Suggested Required Deck Slots

Each valid deck should include:

| Required Category | Minimum |
|---|---:|
| Main Fortress | 1 |
| Civilian Unit | 1 |
| Economy Building | 2 |
| Military Building | 1 |
| Military Unit | 3 |
| Defensive Structure | 1 |

This prevents players from accidentally making unusable decks.

---

## 8.2 Card Point Cost vs Match Resource Cost

Cards should have two separate costs:

### Deck Point Cost

This controls deck-building balance.

Example:

- Peasant Militia: 1 deck point
- Royal Knight: 5 deck points
- Meteor Strike: 7 deck points

### In-Match Resource Cost

This controls gameplay balance during the match.

Example:

- Peasant Militia costs 60 food and 20 wood.
- Royal Knight costs 120 food and 150 gold.
- Meteor Strike costs 250 gold and 150 influence.

---

## 8.3 Card Types

Cards should have clear types.

| Card Type | Description |
|---|---|
| Main Fortress | Starting base structure |
| Civilian Unit | Gathers and builds |
| Economy Building | Enables resource collection and storage |
| Upgrade Building | Unlocks improvements |
| Military Building | Trains specific unit classes |
| Infantry Unit | Core melee units |
| Ranged Unit | Archers, skirmishers, gunpowder later |
| Cavalry Unit | Fast mounted units |
| Siege Unit | Destroys buildings and walls |
| Defense Structure | Walls, towers, gates |
| Special Ability | One-time or cooldown-based spell/tactical effect |
| Faction Power | Strong identity card unique to faction |
| Hero / Commander | Future special unit type |

---

## 8.4 Card Rarity

The shop and collection system can use rarity.

| Rarity | Meaning |
|---|---|
| Common | Basic units and buildings |
| Uncommon | Specialized units or upgrades |
| Rare | Strong tactical cards |
| Epic | Powerful faction-defining cards |
| Legendary | Unique elite cards or future heroes |

Important:  
Rarity should not mean automatic pay-to-win. Higher rarity should offer different strategies, not simply better numbers.

---

## 8.5 Card Collection Rules

For launch, the player can have all cards unlocked for testing.

Future collection system:

- Players open packs.
- Cards are added to collection.
- Duplicate cards convert into crafting dust.
- Dust can craft specific cards.
- Starter decks are given for free.
- Bot mode should remain playable without spending money.

---

# 9. Shop System

## 9.1 Shop Purpose

The shop allows the player to expand their card collection.

## 9.2 Shop Categories

Shop menu should include:

1. Featured Packs
2. Faction Packs
3. Expansion Packs
4. Starter Bundles
5. Cosmetic Icons
6. Card Crafting
7. Future Premium Currency

---

## 9.3 Pack Types

| Pack Type | Contents |
|---|---|
| European Pack | European faction cards only |
| Asian Pack | Asian faction cards only |
| African Pack | African faction cards only |
| Middle Eastern Pack | Middle Eastern faction cards only |
| Base Set Pack | Any launch card |
| Economy Pack | Buildings, civilians, economy upgrades |
| War Pack | Units, siege, defenses |
| Ability Pack | Special abilities and faction powers |

---

## 9.4 MVP Shop

For the first playable version, the shop should be fake/local only.

MVP shop features:

- Player has test currency.
- Clicking “Buy Pack” opens a pack animation.
- Cards are added to local collection.
- No real money.
- No payment system.
- No online economy.

---

# 10. Options Menu

Options should be simple but complete.

## 10.1 Display Options

- Screen resolution
- Windowed mode
- Fullscreen mode
- Borderless windowed mode
- Graphics quality:
  - Low
  - Medium
  - High
- Shadows:
  - Off
  - Low
  - High
- Unit count display:
  - Simple
  - Detailed
- Camera speed
- UI scale

---

## 10.2 Audio Options

- Master volume
- Music volume
- Sound effects volume
- UI sound volume
- Battle ambience volume
- Mute when unfocused

---

## 10.3 Gameplay Options

- Auto-assign civilians on/off
- Show beginner tips on/off
- Pause game when opening menu on/off
- Attack behavior:
  - Aggressive
  - Balanced
  - Conservative
- Defend behavior:
  - Hold walls
  - Patrol base
  - Protect economy
- Camera edge scrolling on/off
- Health bars:
  - Always
  - Damaged only
  - Selected only
- Unit labels:
  - Off
  - Important only
  - All

---

# 11. Credits Menu

Clicking Credits should open a cinematic scrolling credits screen.

## 11.1 MVP Credits

Display:

> Game Director  
> Dan the Man

## 11.2 Credits Presentation

- Dark background
- Slow scroll
- Cool music
- Torch/fire particle effects
- Button to return to menu
- Optional castle silhouette in background

---

# 12. Exit Flow

Clicking Exit should not instantly close.

Show confirmation popup:

> Do you wish to exit the game?

Buttons:

- Yes
- No

If Yes:

- Close the game if running as desktop app.
- If browser, return to splash/menu or show “You may now close this tab.”

If No:

- Return to main menu.

---

# 13. Match Flow

## 13.1 Match Start

When a match begins:

1. Loading screen appears.
2. Map loads.
3. Player and bot spawn positions are selected.
4. Player’s Main Fortress starts constructing automatically.
5. Bot’s Main Fortress starts constructing automatically.
6. Starting civilians spawn.
7. Starting resources are granted.
8. Camera focuses on player base.
9. Intro banner appears:
   - “Defend your Keep. Destroy theirs.”

---

## 13.2 Starting Conditions

Recommended default:

| Starting Asset | Amount |
|---|---:|
| Main Fortress | 1 |
| Civilian Units | 5 |
| Food | 300 |
| Wood | 300 |
| Stone | 150 |
| Gold | 100 |
| Command Cap | 30 |

---

## 13.3 Win Condition

The primary win condition:

> Destroy the enemy Main Fortress.

Optional future win conditions:

- Control all relics
- Survive waves
- Destroy all enemy military buildings
- Score victory after time limit
- King assassination mode
- Capture center shrine

---

## 13.4 Lose Condition

The player loses if:

- Their Main Fortress is destroyed.

Optional mercy condition:

- If no civilians and no fortress remain, auto-defeat.

---

# 14. Core RTS Controls

## 14.1 Camera Controls

Recommended camera style:

- WASD to move camera
- Mouse edge scrolling
- Mouse wheel zoom
- Middle mouse drag rotate
- Q/E rotate camera
- Spacebar return to Main Fortress
- Number keys jump to control groups or command panels

The camera should be forgiving and readable.

---

## 14.2 Selection Controls

The game should support standard RTS selection, but not require intense micro.

- Left click selects unit or building.
- Drag box selects multiple units.
- Double click selects same unit type nearby.
- Right click issues contextual command.
- Shift queues commands.
- Control groups may exist, but are optional.

---

## 14.3 Card Bar

The player should have a card bar at the bottom of the screen.

Cards can be:

- Clicked
- Dragged onto the map
- Hotkeyed

Card states:

| State | Meaning |
|---|---|
| Available | Can be played |
| Disabled | Missing resources or requirements |
| Cooldown | Recently used |
| Locked | Tech requirement missing |
| Invalid Placement | Cannot place there |

---

## 14.4 Building Placement

When placing a building card:

- Show transparent ghost preview.
- Green means valid.
- Red means invalid.
- Yellow means valid but inefficient.
- Snap walls to grid.
- Allow rotating buildings.
- Show resource radius if economy building.

---

# 15. Macro Command System

This is one of the most important systems in the game.

The player should be able to run their army with high-level commands.

---

## 15.1 Global Attack Button

There should be a large **Attack** button.

When enabled:

- Units assigned to attack mode gather.
- Units move toward attack flags.
- If no attack flags exist, they march toward enemy Main Fortress.
- Units fight enemies on the way.
- Siege units prioritize walls, towers, and fortress structures.
- Infantry protects siege.
- Archers stay behind infantry.
- Cavalry flanks or attacks exposed ranged units.

---

## 15.2 Attack Flags

The player can place attack flags on the map.

### Attack Flag Behavior

- Units in attack mode move toward the nearest active attack flag.
- Multiple flags can create an attack route.
- Flags can be dragged or deleted.
- Flags can be numbered in order:
  - Attack Flag 1
  - Attack Flag 2
  - Attack Flag 3

### Attack Flag Types

| Flag Type | Behavior |
|---|---|
| March Flag | Army moves there and waits |
| Assault Flag | Army attacks nearby enemies and structures |
| Siege Flag | Siege units prioritize this location |
| Rally Flag | Newly trained units gather here |
| Harass Flag | Fast units raid economy in this area |

---

## 15.3 Defend Button

There should be a large **Defend** button.

When enabled:

- Units assigned to defense mode stay near base, walls, structures, or patrol routes.
- They respond to nearby threats.
- Units do not chase too far.
- Siege defense units hold position.
- Ranged units prefer towers/walls if available.

---

## 15.4 Defense Assignments

The player should be able to assign units to defend:

- Main Fortress
- Walls
- Gates
- Towers
- Economy buildings
- Mining camps
- Lumber camps
- Stone quarries
- Trade routes
- Specific defend flags

---

## 15.5 Defense Slider System

The player should have a defense composition panel.

Example:

| Unit Type | Defense Allocation |
|---|---:|
| Infantry | 35% |
| Ranged | 30% |
| Cavalry | 10% |
| Siege Defense | 15% |
| Support | 10% |

The player drags sliders to decide how many of each unit type remain defensive.

If the player has 100 military units and sets Infantry to 35%, the system attempts to keep 35 infantry-class units in defensive assignments.

---

## 15.6 Attack Allocation Slider

A matching attack allocation panel should exist.

Example:

| Unit Type | Attack Allocation |
|---|---:|
| Infantry | 40% |
| Ranged | 30% |
| Cavalry | 20% |
| Siege | 10% |

The game should not force all units to attack unless the player chooses “Full Assault.”

---

## 15.7 Emergency Buttons

Add simple tactical buttons:

| Button | Function |
|---|---|
| Full Assault | Sends most available military units to attack |
| Hold the Keep | Pulls army back to Main Fortress |
| Protect Workers | Sends nearby troops to defend civilians |
| Rally Army | Gathers idle military units at rally flag |
| Repair Walls | Prioritizes civilian repair tasks |
| Retreat | Pulls attacking units back to nearest safe structure |

---

# 16. Economy System

## 16.1 Civilian Automation

Civilian units are basic workers.

They can:

- Build
- Repair
- Gather food
- Chop wood
- Mine stone
- Mine gold
- Construct camps
- Repair walls
- Extinguish fires if added later

To reduce micro, civilians should have auto-behavior.

---

## 16.2 Resource Camps

Economy buildings should automate resource delivery.

### Mining Camp

If built near gold deposits:

- Assigned civilians walk to nearest gold ore.
- Mine gold.
- Return gold to Mining Camp.
- Repeat automatically.

### Lumber Camp

If built near forest:

- Assigned civilians chop nearest trees.
- Return wood to Lumber Camp.
- Repeat automatically.

### Stone Quarry

If built near stone deposits:

- Assigned civilians mine stone.
- Return stone to Quarry.
- Repeat automatically.

### Farmstead

If built near open ground:

- Assigned civilians gather food.
- Farms can slowly regenerate food.
- Could be safer but slower than hunting or berry gathering.

---

## 16.3 Economy Assignment UI

The player should have an economy panel.

Example:

| Resource | Desired Worker % |
|---|---:|
| Food | 30% |
| Wood | 30% |
| Stone | 20% |
| Gold | 20% |

If the player changes Food to 40%, idle or reassigned civilians should automatically seek food work.

---

## 16.4 Economy Building Efficiency

Economy buildings should have efficiency based on placement.

Example:

- Mining Camp directly beside gold deposit: 100% efficient
- Mining Camp somewhat nearby: 75% efficient
- Mining Camp too far: valid but inefficient
- No deposit nearby: invalid or warning

This creates strategic placement without requiring constant micro.

---

## 16.5 Civilians and Risk

Civilians should be vulnerable.

Raiding enemy economy should be a valid strategy.

However, because the game is macro-focused, the player should have tools like:

- Protect Workers button
- Defensive patrols
- Watch towers
- Alarm bell
- Auto-garrison
- Civilian flee behavior

---

# 17. Building System

## 17.1 Building Categories

Buildings should fall into major categories.

| Category | Examples |
|---|---|
| Main Fortress | Keep, Palace, Citadel |
| Economy | Farmstead, Lumber Camp, Mining Camp, Quarry |
| Military | Barracks, Archery Range, Stable, Siege Workshop |
| Upgrade | Forge, Blacksmith, War Academy, Market |
| Defense | Walls, Gates, Towers, Ballista Towers |
| Special | Faction monuments, shrines, trade buildings |

---

## 17.2 Building Construction

- Buildings are placed using cards.
- Civilians construct them.
- Construction time depends on building size.
- Multiple civilians can speed up construction.
- Buildings can be damaged during construction.
- If destroyed before completion, partial resources may be refunded.

---

## 17.3 Main Fortress

Each faction has a Main Fortress.

The Main Fortress:

- Is the player’s core base.
- Must survive.
- Produces basic civilians.
- Stores resources.
- Unlocks basic buildings.
- Acts as a drop-off point.
- Has defensive arrows or basic attack.
- Can be upgraded through tiers.

---

## 17.4 Fortress Tiers

Recommended tech tiers:

| Tier | Name | Unlocks |
|---|---|---|
| Tier 1 | Settlement | Basic economy, infantry, simple defenses |
| Tier 2 | Stronghold | Archers, cavalry, upgrades, stronger walls |
| Tier 3 | Citadel | Siege, elite units, advanced abilities |
| Tier 4 | Royal Keep | Super units, ultimate abilities, final upgrades |

The MVP can start with only Tier 1 and Tier 2.

---

# 18. Upgrade System

## 18.1 Upgrade Buildings

Upgrade buildings allow the player to improve economy and military.

### Forge

Economy and construction upgrades:

- Sharpened Axes: faster wood gathering
- Stonecutting Tools: faster stone gathering
- Deep Mining: faster gold gathering
- Reinforced Carts: faster drop-off
- Masonry: stronger buildings
- Efficient Scaffolding: faster construction

### Blacksmith

Military upgrades:

- Infantry Weapons
- Infantry Armor
- Archer Range
- Archer Damage
- Cavalry Armor
- Cavalry Charge
- Siege Engineering
- Tower Accuracy

### War Academy

Advanced army behavior:

- Improved Formations
- Faster Rally
- Disciplined Retreat
- Better Defensive Patrols
- Siege Coordination
- Cavalry Flanking

### Market

Economy flexibility:

- Trade resources
- Generate passive gold
- Unlock trade carts
- Improve pack/shop lore later

---

# 19. Unit Classes

All military units should have class tags.

| Class | Role |
|---|---|
| Infantry | General frontline |
| Spear Infantry | Counters cavalry |
| Heavy Infantry | Durable frontline |
| Ranged | Damage from behind |
| Skirmisher | Anti-ranged or mobile ranged |
| Cavalry | Fast assault and flanking |
| Heavy Cavalry | Powerful charge units |
| Siege | Destroys buildings |
| Support | Buffs, heals, repairs, morale |
| Defensive Siege | Ballistae, wall engines |
| Elite | High-cost powerful units |
| Commander | Future hero-like unit |

---

# 20. Combat Triangle

The combat should be readable.

Basic counter logic:

| Unit Type | Strong Against | Weak Against |
|---|---|---|
| Infantry | Archers, siege if they reach them | Cavalry charge, heavy infantry |
| Spearmen | Cavalry | Archers, siege |
| Archers | Infantry, spearmen | Cavalry, shields |
| Cavalry | Archers, siege, workers | Spearmen, walls |
| Siege | Buildings, walls, towers | Cavalry, infantry rush |
| Heavy Infantry | Infantry, archers | Siege, magic, cavalry flanks |
| Skirmishers | Archers, workers | Heavy cavalry |
| Support | Army sustain | Direct combat |

---

# 21. Morale System

A light morale system would add depth.

## 21.1 Morale Effects

Units with high morale:

- Fight better
- Move faster
- Resist retreat
- Hold formations

Units with low morale:

- Deal less damage
- May retreat
- May ignore attack orders briefly
- Become vulnerable to rout effects

## 21.2 Morale Changes

Morale increases when:

- Near Main Fortress
- Near banners
- Winning fights
- Commander nearby
- Defensive position held

Morale decreases when:

- Surrounded
- Under siege
- Main Fortress damaged
- Nearby allies die
- Fighting far from base
- Attacked by fear abilities

For MVP, morale can be simplified or skipped.

---

# 22. Faction Overview

## 22.1 European Faction

### Identity

Balanced, defensive, armored, reliable.

European armies rely on:

- Strong walls
- Heavy infantry
- Knights
- Crossbows
- Castles
- Reliable economy
- Strong late-game upgrades

### Strengths

- Best walls and towers
- Strong heavy infantry
- Strong cavalry
- Excellent blacksmith upgrades
- Good defensive scaling

### Weaknesses

- Expensive units
- Slower army movement
- Predictable strategies
- Needs strong economy

### Visual Style

- Stone keeps
- Blue, red, gold banners
- Plate armor
- Crossbows
- Castles
- Gothic towers
- Heavy cavalry

---

## 22.2 Asian Faction

### Identity

Mobile, disciplined, technical, flexible.

Asian armies rely on:

- Fast units
- Precision archers
- Martial infantry
- Fireworks/rocket siege
- Strong formations
- Tactical abilities

### Strengths

- Fast army repositioning
- Strong ranged units
- Strong formation bonuses
- Good special abilities
- Excellent mid-game timing attacks

### Weaknesses

- Less durable walls
- Some units are fragile
- Requires good composition
- Weaker direct fortress defense than Europeans

### Visual Style

- Curved rooftops
- Red, white, jade, black banners
- Samurai, monks, crossbowmen, fire lances
- Elegant wooden fortifications
- Lanterns, temple structures

---

## 22.3 African Faction

### Identity

Resilient, mobile, resourceful, pressure-based.

African armies rely on:

- Fast infantry
- Strong skirmishers
- War beasts
- Ambush tactics
- Resource efficiency
- Morale and drums
- Flexible economy

### Strengths

- Strong early and mid-game pressure
- Great map control
- Fast resource gathering options
- Good anti-archer skirmishers
- Powerful morale support

### Weaknesses

- Weaker stone defenses
- Some units have lower armor
- Siege options are less traditional
- Needs mobility and pressure

### Visual Style

- Mudbrick, carved stone, timber, gold ornamentation
- Earth tones, bright textiles
- Shields, spears, drums, war elephants or rhinos
- Savanna, desert, jungle influences

---

## 22.4 Middle Eastern Faction

### Identity

Trade, cavalry, siege, control, and powerful abilities.

Middle Eastern armies rely on:

- Strong economy through trade
- Mobile cavalry
- Camel units
- Strong siege
- Fire and sand abilities
- Defensive towers
- Gold-heavy elite units

### Strengths

- Strong gold economy
- Excellent cavalry and camel counters
- Powerful siege
- Strong map control through trade posts
- Dangerous late-game abilities

### Weaknesses

- Food economy can be pressured
- Some units are gold-dependent
- Early defense needs planning
- Vulnerable if trade is disrupted

### Visual Style

- Sandstone citadels
- Domes, arches, minarets
- Green, gold, white, crimson banners
- Camels, scimitars, composite bows
- Fire pots, desert engines, trade caravans

---

# 23. Universal Cards

These cards can have faction versions but similar roles.

## 23.1 Universal Economy Cards

| Card | Type | Deck Points | Match Role |
|---|---|---:|---|
| Civilian Workers | Civilian | 0 | Basic gatherers/builders |
| Farmstead | Economy | 1 | Food generation |
| Lumber Camp | Economy | 1 | Wood harvesting |
| Mining Camp | Economy | 1 | Gold mining |
| Stone Quarry | Economy | 1 | Stone mining |
| Storehouse | Economy | 1 | Generic drop-off |
| Market | Economy | 2 | Resource trading |
| Trade Cart | Economy Unit | 2 | Gold over time |
| Supply Depot | Economy | 1 | Raises command cap |
| Builder’s Yard | Economy | 2 | Faster construction nearby |

---

## 23.2 Universal Military Building Cards

| Card | Type | Deck Points | Unlocks |
|---|---|---:|---|
| Barracks | Military Building | 2 | Infantry |
| Archery Range | Military Building | 2 | Ranged units |
| Stable | Military Building | 3 | Cavalry |
| Siege Workshop | Military Building | 4 | Siege units |
| War Academy | Upgrade Building | 3 | Army behavior upgrades |
| Blacksmith | Upgrade Building | 2 | Military upgrades |
| Forge | Upgrade Building | 2 | Economy/construction upgrades |

---

## 23.3 Universal Defense Cards

| Card | Type | Deck Points | Function |
|---|---|---:|---|
| Wooden Wall | Defense | 1 | Cheap early barrier |
| Stone Wall | Defense | 2 | Stronger defensive wall |
| Gatehouse | Defense | 1 | Controlled entry |
| Watch Tower | Defense | 2 | Basic ranged defense |
| Ballista Tower | Defense | 3 | Anti-siege/anti-large |
| Fortress Tower | Defense | 4 | Heavy late-game tower |
| Repair Post | Defense | 2 | Helps repair nearby walls |
| Alarm Bell | Defense Utility | 1 | Calls defenders to economy area |

---

# 24. European Unit Roster

## 24.1 European Main Fortress

### Crown Keep

| Attribute | Value |
|---|---|
| Card Type | Main Fortress |
| Deck Points | Required / 0 |
| Role | Balanced starting fortress |
| Strength | Strong upgrades, good defense |
| Weakness | Expensive tech path |

Special:

- Can fire arrows at nearby enemies.
- Unlocks stronger walls earlier.
- Improves nearby defensive morale.

---

## 24.2 European Civilian and Economy Units

| Unit | Role | Deck Points | Notes |
|---|---|---:|---|
| Serf Worker | Civilian | 0 | Basic builder/gatherer |
| Guild Laborer | Advanced Civilian | 2 | Builds faster, gathers gold slightly faster |
| Ox Cart | Economy Unit | 2 | Improves drop-off efficiency |
| Mason Crew | Builder Unit | 2 | Repairs walls and stone buildings faster |
| Royal Tax Collector | Economy Support | 3 | Generates slow gold from houses/markets |

---

## 24.3 European Infantry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Levy Spearman | Spear Infantry | 1 | Cheap anti-cavalry |
| Militia Swordsman | Infantry | 1 | Basic frontline |
| Shieldman | Heavy Infantry | 2 | Absorbs arrows |
| Longsword Guard | Heavy Infantry | 3 | Durable melee |
| Halberdier | Spear Infantry | 3 | Strong anti-cavalry and anti-large |
| Royal Footman | Elite Infantry | 4 | Strong late-game infantry |
| Crusader Champion | Elite Infantry | 5 | High morale, strong against infantry |
| Banner Guard | Support Infantry | 3 | Improves nearby morale |

---

## 24.4 European Ranged Units

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Shortbow Archer | Ranged | 1 | Cheap ranged damage |
| Crossbowman | Ranged | 2 | Armor-piercing ranged |
| Longbowman | Ranged | 3 | Long range, fragile |
| Pavise Crossbowman | Ranged | 3 | Shielded ranged unit |
| Arbalestier | Elite Ranged | 4 | Strong anti-armor ranged |
| Castle Marksman | Defensive Ranged | 4 | Bonus when near walls/towers |

---

## 24.5 European Cavalry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Scout Rider | Light Cavalry | 1 | Scouting, worker harassment |
| Mounted Sergeant | Cavalry | 2 | Basic cavalry |
| Knight | Heavy Cavalry | 4 | Powerful charge |
| Royal Lancer | Heavy Cavalry | 4 | Anti-cavalry charge |
| Paladin | Elite Cavalry | 6 | Expensive elite shock unit |
| Banner Knight | Support Cavalry | 4 | Boosts charge morale |

---

## 24.6 European Siege

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Battering Ram | Siege | 2 | Destroys gates/walls |
| Catapult | Siege | 3 | Area damage to buildings |
| Trebuchet | Siege | 5 | Long-range fortress siege |
| Siege Tower | Siege Support | 4 | Helps infantry breach walls |
| Heavy Ballista | Defensive Siege | 3 | Anti-large, anti-siege |
| Bombard Cart | Late Siege | 6 | Powerful but slow |

---

## 24.7 European Special Ability Cards

| Card | Deck Points | Effect |
|---|---:|---|
| Rally the Realm | 3 | Temporarily increases infantry morale |
| Rain of Arrows | 4 | Damages enemy units in target area |
| Royal Decree | 3 | Speeds up unit production briefly |
| Mason’s Blessing | 2 | Repairs nearby walls over time |
| Knightly Charge | 4 | Cavalry gain charge damage |
| Hold the Line | 4 | Infantry take reduced damage while defending |
| Divine Standard | 5 | Creates morale banner on battlefield |
| Castle Doctrine | 5 | Towers and walls gain temporary armor |

---

# 25. Asian Unit Roster

## 25.1 Asian Main Fortress

### Jade Palace Keep

| Attribute | Value |
|---|---|
| Card Type | Main Fortress |
| Deck Points | Required / 0 |
| Role | Flexible command fortress |
| Strength | Formation and ranged bonuses |
| Weakness | Less durable than European keep |

Special:

- Unlocks formation upgrades earlier.
- Nearby units reposition faster.
- Can research discipline bonuses.

---

## 25.2 Asian Civilian and Economy Units

| Unit | Role | Deck Points | Notes |
|---|---|---:|---|
| Village Worker | Civilian | 0 | Basic builder/gatherer |
| Rice Farmer | Food Specialist | 1 | Better food economy |
| Bamboo Cutter | Wood Specialist | 1 | Faster wood harvesting |
| Imperial Clerk | Economy Support | 3 | Improves tax/gold income |
| Artisan Builder | Builder | 2 | Builds special structures faster |

---

## 25.3 Asian Infantry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Ashigaru Spearman | Spear Infantry | 1 | Cheap anti-cavalry |
| Dao Militia | Infantry | 1 | Basic melee unit |
| Samurai Retainer | Heavy Infantry | 3 | Strong disciplined melee |
| Naginata Guard | Spear Infantry | 3 | Anti-cavalry elite guard |
| Temple Monk | Support Infantry | 3 | Morale and light healing |
| Iron Fan Guard | Defensive Infantry | 3 | Strong against ranged |
| Dragon Blade Master | Elite Infantry | 5 | High damage elite melee |
| Palace Sentinel | Heavy Infantry | 4 | Strong defensive unit |

---

## 25.4 Asian Ranged Units

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Bamboo Archer | Ranged | 1 | Basic archer |
| Repeating Crossbowman | Ranged | 2 | Fast attack, low damage |
| Fire Arrow Archer | Ranged | 3 | Bonus vs buildings/light units |
| Mounted Archer | Mobile Ranged | 3 | Harassment and kiting |
| Imperial Marksman | Elite Ranged | 4 | High accuracy, long range |
| Rocket Cart Crew | Ranged Siege Hybrid | 5 | Area fire damage |

---

## 25.5 Asian Cavalry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Steppe Scout | Light Cavalry | 1 | Fast scouting |
| Horse Archer | Mobile Ranged | 3 | Harassment |
| Samurai Rider | Cavalry | 3 | Balanced cavalry |
| Jade Lancer | Heavy Cavalry | 4 | Strong charge |
| Wind Cavalry | Elite Cavalry | 5 | Very fast flanking |
| Imperial Guard Rider | Elite Cavalry | 6 | Strong but expensive |

---

## 25.6 Asian Siege

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Fire Pot Thrower | Light Siege | 2 | Anti-building fire damage |
| Traction Trebuchet | Siege | 3 | Mid-range siege |
| Rocket Cart | Siege | 4 | Area damage, inaccurate |
| Dragon Cannon | Heavy Siege | 6 | Powerful late-game siege |
| Bamboo Shield Cart | Siege Support | 3 | Protects infantry from arrows |
| Wall Fire Launcher | Defensive Siege | 4 | Defensive anti-mass unit |

---

## 25.7 Asian Special Ability Cards

| Card | Deck Points | Effect |
|---|---:|---|
| Way of Discipline | 3 | Units hold formation and gain armor |
| Fire Arrows | 4 | Ranged units ignite attacks briefly |
| Smoke Screen | 3 | Reduces enemy ranged accuracy in area |
| Dragon Rockets | 5 | Area bombardment ability |
| Silent March | 3 | Army moves faster and draws less aggro |
| Temple Blessing | 4 | Restores morale and minor health |
| Perfect Formation | 5 | Nearby mixed army gains combat bonus |
| Wind Reposition | 4 | Selected army group moves faster briefly |

---

# 26. African Unit Roster

## 26.1 African Main Fortress

### Golden Hearth Citadel

| Attribute | Value |
|---|---|
| Card Type | Main Fortress |
| Deck Points | Required / 0 |
| Role | Resilient, morale-focused fortress |
| Strength | Strong early pressure and economy flexibility |
| Weakness | Weaker conventional walls |

Special:

- Drums increase nearby unit morale.
- Workers gather slightly faster near Main Fortress.
- Defensive units respond quickly to raids.

---

## 26.2 African Civilian and Economy Units

| Unit | Role | Deck Points | Notes |
|---|---|---:|---|
| Hearth Worker | Civilian | 0 | Basic builder/gatherer |
| Forager | Food Specialist | 1 | Gathers food quickly from natural sources |
| Gold Washer | Gold Specialist | 2 | Improved gold gathering near rivers/mines |
| Herd Keeper | Economy Unit | 2 | Generates food over time |
| Drum Caller | Economy/Support | 3 | Boosts nearby work speed and morale |

---

## 26.3 African Infantry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Village Spearman | Spear Infantry | 1 | Cheap anti-cavalry |
| Shield Warrior | Infantry | 1 | Basic melee |
| Throwing Spear Warrior | Skirmisher | 2 | Anti-ranged mobile infantry |
| Iron Guard | Heavy Infantry | 3 | Armored frontline |
| Leopard Warrior | Fast Infantry | 3 | High mobility melee |
| Royal Spear Guard | Elite Spear | 4 | Strong anti-cavalry |
| Sunblade Champion | Elite Infantry | 5 | Strong duelist |
| Ancestral Guard | Defensive Infantry | 4 | Strong near keeps and monuments |

---

## 26.4 African Ranged Units

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Sling Hunter | Ranged | 1 | Cheap ranged harassment |
| Bow Hunter | Ranged | 1 | Basic archer |
| Poison Dart Skirmisher | Skirmisher | 3 | Damage over time |
| Royal Archer | Ranged | 3 | Reliable ranged damage |
| Savannah Marksman | Elite Ranged | 4 | Bonus vs light units |
| Fire Gourd Thrower | Ranged/Siege Hybrid | 4 | Fire area damage |

---

## 26.5 African Cavalry and Beast Units

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Scout Runner | Light Scout | 1 | Very fast non-mounted scout |
| Light Horse Raider | Light Cavalry | 2 | Worker harassment |
| Camel Skirmisher | Mobile Ranged | 3 | Anti-cavalry harassment |
| War Zebra Rider | Cavalry | 3 | Fast flanking unit |
| Rhino Breaker | Beast Siege | 5 | Charges walls and formations |
| War Elephant Guard | Elite Beast | 6 | Massive frontline unit |

---

## 26.6 African Siege

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Ram Crew | Siege | 2 | Basic wall breaker |
| Fire Pot Crew | Light Siege | 3 | Burns buildings |
| Stone Slinger Team | Siege | 3 | Anti-building ranged siege |
| Rhino Ram | Beast Siege | 5 | Mobile living siege |
| Great Drum Platform | Siege Support | 4 | Morale aura, slow |
| Sunfire Engine | Heavy Siege | 6 | Late-game fire siege |

---

## 26.7 African Special Ability Cards

| Card | Deck Points | Effect |
|---|---:|---|
| War Drums | 3 | Boosts movement and morale |
| Ancestral Courage | 4 | Prevents nearby units from routing |
| Dust Ambush | 3 | Temporarily hides units in target area |
| Stampede | 5 | Beast units charge through enemy lines |
| Sunfire Pots | 4 | Fire damage in an area |
| Call of the Hearth | 3 | Workers repair and gather faster briefly |
| Golden Surge | 5 | Temporary gold gathering boost |
| Circle of Shields | 4 | Infantry gain ranged resistance |

---

# 27. Middle Eastern Unit Roster

## 27.1 Middle Eastern Main Fortress

### Crescent Citadel

| Attribute | Value |
|---|---|
| Card Type | Main Fortress |
| Deck Points | Required / 0 |
| Role | Trade and siege-focused fortress |
| Strength | Gold economy, cavalry, siege |
| Weakness | Requires trade/gold control |

Special:

- Markets generate slightly more gold.
- Cavalry units train faster.
- Siege units gain late-game bonuses.

---

## 27.2 Middle Eastern Civilian and Economy Units

| Unit | Role | Deck Points | Notes |
|---|---|---:|---|
| Town Worker | Civilian | 0 | Basic builder/gatherer |
| Bazaar Trader | Economy Support | 2 | Improves market exchange |
| Caravan Driver | Trade Unit | 3 | Generates gold along route |
| Oasis Tender | Food Specialist | 2 | Improves food near oasis/farms |
| Stone Mason | Builder | 2 | Builds towers and walls faster |

---

## 27.3 Middle Eastern Infantry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Spear Levy | Spear Infantry | 1 | Cheap anti-cavalry |
| Scimitar Militia | Infantry | 1 | Basic melee |
| Shielded Guard | Defensive Infantry | 2 | Holds choke points |
| Palace Guard | Heavy Infantry | 3 | Durable defensive unit |
| Dervish Fighter | Fast Infantry | 3 | High mobility melee |
| Janissary Guard | Elite Infantry | 5 | Strong advanced infantry |
| Golden Spearman | Elite Spear | 4 | Strong vs cavalry |
| Citadel Defender | Defensive Elite | 4 | Strong near buildings |

---

## 27.4 Middle Eastern Ranged Units

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Desert Archer | Ranged | 1 | Basic archer |
| Composite Bowman | Ranged | 2 | Stronger archer |
| Camel Archer | Mobile Ranged | 3 | Mobile harassment |
| Fire Siphon Team | Ranged/Siege Hybrid | 4 | Fire cone attack |
| Palace Marksman | Elite Ranged | 4 | Long-range elite |
| Hand Cannon Guard | Elite Ranged | 5 | Armor-piercing late unit |

---

## 27.5 Middle Eastern Cavalry

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Desert Scout | Light Cavalry | 1 | Scouting |
| Camel Rider | Anti-Cavalry Cavalry | 2 | Counters enemy cavalry |
| Horse Raider | Light Cavalry | 2 | Economy harassment |
| Mamluk Cavalry | Heavy Cavalry | 4 | Durable cavalry |
| Royal Cataphract | Elite Cavalry | 6 | Heavy shock unit |
| Sand Reaver | Elite Raider | 5 | Strong vs workers and siege |

---

## 27.6 Middle Eastern Siege

| Unit | Class | Deck Points | Role |
|---|---|---:|---|
| Battering Cart | Siege | 2 | Basic gate breaker |
| Mangonel | Siege | 3 | Area damage |
| Fire Thrower Engine | Siege | 4 | Burns buildings and units |
| Great Bombard | Heavy Siege | 6 | Massive building damage |
| Siege Camel Team | Mobile Siege | 5 | Faster siege setup |
| Oil Cauldron Wagon | Defensive Siege | 4 | Strong against infantry blobs |

---

## 27.7 Middle Eastern Special Ability Cards

| Card | Deck Points | Effect |
|---|---:|---|
| Sandstorm | 4 | Reduces enemy vision and ranged accuracy |
| Bazaar Boom | 3 | Temporary market/trade income boost |
| Burning Oil | 4 | Damages enemies near walls/gates |
| Desert March | 3 | Cavalry and infantry move faster |
| Call the Caravan | 5 | Spawns temporary trade income route |
| Meteor Fire | 6 | Powerful area fire strike |
| Golden Command | 4 | Speeds elite unit training |
| Siege Mastery | 5 | Siege units reload and deploy faster |

---

# 28. Neutral / Mercenary Cards

Future expansion can include neutral cards usable by all factions, though launch may avoid them for simplicity.

| Card | Type | Deck Points | Role |
|---|---|---:|---|
| Mercenary Swordsmen | Infantry | 3 | Generic hired melee |
| Free Company Archers | Ranged | 3 | Generic ranged unit |
| Wandering Engineers | Support | 4 | Repairs siege and buildings |
| Merchant Caravan | Economy | 3 | Trade gold |
| Bandit Raiders | Cavalry | 3 | Harassment |
| Stone Golem Mercenary | Siege/Elite | 7 | Fantasy expansion option |
| Traveling Monk | Support | 3 | Morale support |
| Siege Contractor | Support | 4 | Improves siege build speed |

---

# 29. Suggested Launch Card Counts

For the first serious prototype:

| Faction | Cards |
|---|---:|
| European | 35 |
| Asian | 35 |
| African | 35 |
| Middle Eastern | 35 |
| Universal | 25 |
| Total | 165 |

For MVP, this can be reduced to:

| Faction | Cards |
|---|---:|
| European | 15 |
| Asian | 15 |
| African | 15 |
| Middle Eastern | 15 |
| Universal | 15 |
| Total | 75 |

---

# 30. Unit Stat Model

Each unit should have standardized stats.

## 30.1 Core Unit Stats

| Stat | Description |
|---|---|
| Health | How much damage unit can take |
| Armor | Reduces physical damage |
| Pierce Armor | Reduces ranged damage |
| Speed | Movement speed |
| Attack Damage | Base attack |
| Attack Rate | Time between attacks |
| Attack Range | Melee or ranged distance |
| Line of Sight | Vision range |
| Command Cost | Population cost |
| Training Time | Time to create unit |
| Resource Cost | Food/Wood/Gold/Stone |
| Tags | Infantry, Cavalry, Siege, etc. |

---

## 30.2 Example Stat Ranges

| Unit Class | Health | Damage | Speed | Command |
|---|---:|---:|---:|---:|
| Worker | 50 | 3 | Medium | 1 |
| Light Infantry | 70–90 | 8–12 | Medium | 1 |
| Heavy Infantry | 130–180 | 12–20 | Slow | 2 |
| Archer | 50–80 | 8–15 | Medium | 1 |
| Cavalry | 120–220 | 18–35 | Fast | 2–4 |
| Siege | 180–500 | 50–200 vs buildings | Very Slow | 3–6 |
| Elite | 250–600 | 30–80 | Varies | 4–8 |

---

# 31. Example Unit Stat Cards

## 31.1 European Knight

| Attribute | Value |
|---|---|
| Class | Heavy Cavalry |
| Deck Points | 4 |
| Cost | 120 Food, 150 Gold |
| Command | 3 |
| Health | 220 |
| Armor | High |
| Damage | 32 |
| Speed | Fast |
| Strong Against | Archers, siege, workers |
| Weak Against | Spearmen, walls, anti-cavalry camels |
| Ability | Charge |

---

## 31.2 Asian Repeating Crossbowman

| Attribute | Value |
|---|---|
| Class | Ranged |
| Deck Points | 2 |
| Cost | 60 Food, 80 Wood |
| Command | 1 |
| Health | 65 |
| Damage | 5 rapid shots |
| Speed | Medium |
| Strong Against | Light infantry |
| Weak Against | Cavalry, heavy shields |
| Ability | Volley Fire |

---

## 31.3 African Rhino Breaker

| Attribute | Value |
|---|---|
| Class | Beast Siege |
| Deck Points | 5 |
| Cost | 180 Food, 120 Gold |
| Command | 5 |
| Health | 480 |
| Damage | 70 charge / 120 vs buildings |
| Speed | Medium |
| Strong Against | Walls, formations |
| Weak Against | Spearmen, focus fire |
| Ability | Thunder Charge |

---

## 31.4 Middle Eastern Great Bombard

| Attribute | Value |
|---|---|
| Class | Heavy Siege |
| Deck Points | 6 |
| Cost | 250 Wood, 250 Gold, 150 Stone |
| Command | 6 |
| Health | 300 |
| Damage | 220 vs buildings |
| Speed | Very Slow |
| Strong Against | Fortresses, towers, walls |
| Weak Against | Cavalry, raids |
| Ability | Siege Setup |

---

# 32. Building Roster

## 32.1 Universal Buildings

| Building | Cost | Role |
|---|---:|---|
| Main Fortress | Auto | Core base |
| House / Supply Hut | 50 Wood | Raises command cap |
| Farmstead | 75 Wood | Food income |
| Lumber Camp | 80 Wood | Wood drop-off |
| Mining Camp | 100 Wood | Gold drop-off |
| Stone Quarry | 100 Wood | Stone drop-off |
| Barracks | 150 Wood | Infantry |
| Archery Range | 175 Wood | Ranged |
| Stable | 200 Wood, 100 Gold | Cavalry |
| Siege Workshop | 250 Wood, 150 Gold | Siege |
| Forge | 150 Wood, 100 Stone | Economy upgrades |
| Blacksmith | 150 Wood, 100 Gold | Military upgrades |
| Market | 200 Wood, 100 Gold | Resource trade |
| War Academy | 200 Wood, 200 Gold | Army behavior |
| Watch Tower | 100 Wood, 100 Stone | Defense |
| Stone Tower | 150 Stone, 100 Gold | Strong defense |
| Wall Segment | 20 Stone | Wall |
| Gate | 100 Stone, 50 Wood | Controlled access |

---

# 33. Faction Building Flavor

## 33.1 European Buildings

| Building | Unique Bonus |
|---|---|
| Crown Keep | Strong defense |
| Guild Hall | Improves gold and construction |
| Stone Bastion | Stronger tower |
| Cathedral Banner | Morale aura |
| Royal Stable | Stronger knights |

---

## 33.2 Asian Buildings

| Building | Unique Bonus |
|---|---|
| Jade Palace | Formation upgrades |
| Temple | Morale/support upgrades |
| Firework Foundry | Rocket and fire siege |
| Bamboo Watchpost | Cheap fast tower |
| Imperial Academy | Tactical upgrades |

---

## 33.3 African Buildings

| Building | Unique Bonus |
|---|---|
| Golden Hearth | Morale and worker response |
| Drum Circle | Army morale aura |
| Herding Grounds | Passive food |
| Warrior Lodge | Fast infantry |
| Sunfire Yard | Fire siege |

---

## 33.4 Middle Eastern Buildings

| Building | Unique Bonus |
|---|---|
| Crescent Citadel | Trade and cavalry bonuses |
| Grand Bazaar | Strong market |
| Caravanserai | Trade routes |
| Fire Oil Foundry | Fire siege |
| Dome Tower | Strong anti-infantry tower |

---

# 34. AI Bot Design

## 34.1 Bot Goals

The bot should understand:

- Build economy
- Build military
- Expand
- Defend
- Attack
- Tech up
- Use faction strategy
- Use simple card decks

---

## 34.2 Easy Bot

Easy bot behavior:

- Builds slowly.
- Leaves some resources unspent.
- Attacks late.
- Uses simple unit composition.
- Rarely raids.
- Defends poorly.
- Does not optimize upgrades.

Good for new players.

---

## 34.3 Medium Bot

Medium bot behavior:

- Builds steady economy.
- Trains balanced army.
- Uses basic upgrades.
- Attacks with moderate timing.
- Places defenses near base.
- Rebuilds destroyed economy buildings.
- Uses faction identity lightly.

This should be the standard intended experience.

---

## 34.4 Hard Bot

Hard bot behavior:

- Efficient economy.
- Scouts player.
- Counters unit composition.
- Raids workers.
- Uses siege correctly.
- Defends important resources.
- Uses special abilities.
- Times attacks around upgrades.
- Expands faster.

Hard bot should feel challenging but not unfair.

---

## 34.5 Bot Faction Personalities

| Faction | Bot Style |
|---|---|
| European | Defend, tech, push with heavy units |
| Asian | Mid-game timing attacks, formation armies |
| African | Early pressure, raids, map control |
| Middle Eastern | Trade boom, cavalry raids, siege finish |

---

# 35. Map Design

## 35.1 Map Requirements

Each map should include:

- Player starting area
- Bot starting area
- Nearby wood
- Nearby food
- Nearby stone
- Nearby gold
- Expansion resources
- Attack lanes
- Defensive choke points
- Open battle zones
- Optional neutral objectives

---

## 35.2 Map Resource Philosophy

Resources should create choices:

- Safe resources near base are limited.
- Rich resources are farther away.
- Gold should be contestable.
- Stone should support defensive strategies.
- Wood should be available early.
- Food should require expansion or farms.

---

## 35.3 Map Objective Ideas

Optional future objectives:

| Objective | Function |
|---|---|
| Ancient Shrine | Generates Influence |
| Trade Post | Generates Gold |
| Watch Hill | Grants vision |
| Ruined Fort | Can be rebuilt as forward base |
| Sacred Grove | Boosts wood/food economy |
| Stone Bridge | Strategic choke point |
| Relic Cart | Capture for passive resource bonus |

---

# 36. Art Direction

## 36.1 Overall Visual Style

The game should use a stylized 3D look.

Recommended:

- Low-to-mid poly 3D models
- Clear silhouettes
- Readable colors
- Slightly painterly textures
- Not hyper-realistic
- Units visible from RTS camera distance
- Buildings exaggerated enough to read quickly
- Banners and color coding for teams

The game should look polished but achievable.

---

## 36.2 Unit Readability

Every unit should be identifiable from above.

Use:

- Large shields for shield units
- Long spears for anti-cavalry
- Bows/crossbows for ranged
- Horses/camels/beasts for cavalry
- Giant engines for siege
- Banners for support units
- Glow or effects for special units

---

## 36.3 Team Colors

Each player should have a team color overlay.

Use team color on:

- Banners
- Shields
- Unit cloth
- Building flags
- Health bar accents
- Selection rings

---

# 37. Audio Direction

## 37.1 Music

Music should be:

- Epic
- Rhythmic
- War-table fantasy style
- Less intense during economy phase
- More intense during battle
- Faction-flavored later

Menu music:

- Cool, dramatic, strategic

Credits music:

- Cool and memorable
- Slightly humorous or triumphant

---

## 37.2 Sound Effects

Required sounds:

- Button hover
- Button click
- Card played
- Building placed
- Building completed
- Unit trained
- Attack horn
- Defense horn
- Resource gathered
- Wall hit
- Siege impact
- Fortress under attack
- Victory
- Defeat

---

# 38. UI / HUD

## 38.1 In-Match HUD

Top bar:

- Food
- Wood
- Stone
- Gold
- Command / population
- Timer
- Bot difficulty
- Pause/settings

Bottom bar:

- Card deck hand / available cards
- Selected unit/building panel
- Attack button
- Defend button
- Macro sliders
- Minimap

Right side:

- Alerts
- Objectives
- Current army state
- Idle civilians
- Idle military
- Under attack warnings

---

## 38.2 Alerts

Important alerts:

- Main Fortress under attack
- Civilians under attack
- Resource depleted
- Not enough command
- Not enough resources
- Building complete
- Enemy attacking
- Wall breached
- Siege detected
- Upgrade complete
- Army ready

---

## 38.3 Minimap

The minimap should show:

- Player buildings
- Enemy visible buildings
- Units
- Attack flags
- Defense flags
- Resources
- Alerts
- Fog of war

---

# 39. Fog of War and Vision

## 39.1 MVP

MVP can use simple visibility:

- Player sees around buildings and units.
- Enemy base hidden until scouted.
- Fog darkens unexplored areas.

## 39.2 Full Version

Full fog system:

- Unexplored black fog
- Previously explored gray fog
- Active vision clear
- Watch towers increase vision
- Scouts matter
- Sandstorm/smoke effects reduce vision

---

# 40. Match Pacing

Recommended match length:

| Mode | Target Duration |
|---|---:|
| Small Bot Match | 10–15 minutes |
| Medium Bot Match | 15–25 minutes |
| Large Bot Match | 25–40 minutes |
| Future Multiplayer | 20–35 minutes |

The game should avoid 90-minute matches unless custom settings allow it.

---

# 41. Progression

## 41.1 Local Progression

For MVP:

- Win bot matches to earn gold.
- Gold buys packs.
- Packs unlock cards.
- Player can edit decks.
- Stats saved locally.

---

## 41.2 Future Online Progression

Future:

- Account level
- Faction mastery
- Ranked score
- Seasonal rewards
- Card cosmetics
- Player icons
- Keep skins
- Victory banners
- Titles

---

# 42. Balance Philosophy

## 42.1 No Single Best Deck

Every faction should support multiple strategies.

Examples:

European:

- Turtle into knights and trebuchets
- Infantry wall push
- Crossbow defense
- Castle tower control

Asian:

- Fast archer pressure
- Fire rocket timing
- Mobile horse archers
- Formation deathball

African:

- Early raids
- Skirmisher control
- Beast siege
- Morale infantry swarm

Middle Eastern:

- Trade boom
- Camel counter army
- Fire siege
- Cavalry raids into bombard finish

---

## 42.2 Counterplay Required

Every strong strategy needs a counter.

Examples:

| Strategy | Counter |
|---|---|
| Heavy cavalry | Spearmen, camels, walls |
| Archer mass | Cavalry, shields, smoke |
| Siege push | Cavalry raids, counter-siege |
| Turtle defense | Trade boom, long-range siege |
| Worker raids | Towers, patrols, alarm bell |
| Beast units | Spears, focus fire, traps |
| Fire abilities | Spread formation, stone upgrades |

---

# 43. MVP Scope

The first playable version should be small.

## 43.1 MVP Features

Must have:

- Cherry Buddha splash
- Main menu
- Play menu
- Bot placeholder setup
- One playable map
- One faction fully playable first
- One bot enemy
- Basic deck system
- Main Fortress
- Workers
- 4 resources
- Basic buildings
- Basic units
- Attack button
- Defend button
- Attack flags
- Win/loss condition
- Simple options menu
- Credits screen
- Exit confirmation

---

## 43.2 First Playable Factions

Recommended order:

1. European
2. Middle Eastern
3. Asian
4. African

Why European first?

- Easiest baseline faction
- Most standard RTS units
- Clear buildings
- Good for testing walls, cavalry, archers, siege

---

## 43.3 MVP Unit Set

First faction should include:

| Unit | Purpose |
|---|---|
| Worker | Economy/building |
| Spearman | Anti-cavalry |
| Swordsman | Basic melee |
| Archer | Basic ranged |
| Knight | Cavalry |
| Catapult | Siege |
| Ballista | Defensive siege |

MVP buildings:

| Building | Purpose |
|---|---|
| Main Keep | Base |
| House | Command cap |
| Farm | Food |
| Lumber Camp | Wood |
| Mining Camp | Gold |
| Quarry | Stone |
| Barracks | Infantry |
| Archery Range | Archers |
| Stable | Cavalry |
| Siege Workshop | Siege |
| Watch Tower | Defense |
| Wall | Defense |
| Gate | Defense |

---

# 44. Recommended Implementation Phases for AI Later

## Phase 1 — Project Shell

Goal:

- Create game project.
- Add splash screen.
- Add main menu.
- Add navigation between screens.
- Add placeholder buttons.

No RTS gameplay yet.

---

## Phase 2 — Match Scene Prototype

Goal:

- Load simple 3D map.
- Add camera controls.
- Add player Main Keep.
- Add bot Main Keep.
- Add workers.
- Add resources on map.

---

## Phase 3 — Economy

Goal:

- Workers gather resources.
- Build resource camps.
- Assign workers automatically.
- Display resource UI.
- Add economy slider.

---

## Phase 4 — Building Placement

Goal:

- Play building cards.
- Place buildings on map.
- Validate placement.
- Workers construct buildings.
- Buildings complete and function.

---

## Phase 5 — Unit Training

Goal:

- Barracks trains infantry.
- Archery range trains archers.
- Stable trains cavalry.
- Siege workshop trains siege.
- Units cost resources and command.

---

## Phase 6 — Basic Combat

Goal:

- Units detect enemies.
- Units attack.
- Units take damage.
- Units die.
- Buildings can be damaged.
- Main Fortress destruction triggers victory/defeat.

---

## Phase 7 — Macro Attack / Defend

Goal:

- Add Attack button.
- Add Defend button.
- Add attack flags.
- Add defend flags.
- Add unit allocation sliders.
- Units follow macro behavior.

---

## Phase 8 — Bot AI

Goal:

- Easy bot builds economy.
- Bot trains units.
- Bot attacks after timer.
- Bot can lose and win.

---

## Phase 9 — Deck Editor

Goal:

- Card collection screen.
- Deck building screen.
- 50-point deck limit.
- Faction-specific decks.
- Save decks locally.

---

## Phase 10 — Shop Prototype

Goal:

- Fake currency.
- Buy packs.
- Open cards.
- Add to collection.
- Save locally.

---

## Phase 11 — Additional Factions

Goal:

- Add remaining factions.
- Add unique unit models/placeholders.
- Add faction cards.
- Add faction AI personalities.

---

## Phase 12 — Polish

Goal:

- Better UI
- Sound effects
- Music
- Animations
- Better VFX
- Better pathfinding
- Fog of war
- Balance pass

---

## Phase 13 — Future Online Systems

Goal:

- Login
- Cloud saves
- Multiplayer placeholder becomes real
- Online stats
- Player profiles
- Ranked or casual matchmaking

---

# 45. Data Architecture Requirements

Game data should be separated from code.

## 45.1 Card Data

Each card should include:

- id
- name
- faction
- type
- rarity
- deckPointCost
- matchResourceCost
- cooldown
- requirements
- description
- icon
- modelReference
- effect
- tags

---

## 45.2 Unit Data

Each unit should include:

- id
- name
- faction
- class
- health
- armor
- pierceArmor
- damage
- attackRate
- range
- speed
- commandCost
- cost
- trainingTime
- abilities
- counters
- weaknesses
- model
- animation set
- sound set

---

## 45.3 Building Data

Each building should include:

- id
- name
- faction
- type
- health
- armor
- footprint size
- cost
- build time
- requirements
- produces
- upgrades
- resource radius
- attack if any
- model
- destruction model

---

# 46. Naming and Tone

The game should use strong, readable names.

Good examples:

- Crown Keep
- Jade Palace
- Golden Hearth
- Crescent Citadel
- Royal Lancer
- Dragon Cannon
- Rhino Breaker
- Great Bombard
- War Drums
- Sandstorm
- Hold the Line

Avoid names that are too generic, such as:

- Strong Unit
- Better Archer
- Big Tower
- Level 2 Soldier

---

# 47. Important Design Risks

## 47.1 Too Much Automation

Risk:

- Game plays itself.

Solution:

- Player makes meaningful macro choices.
- Economy sliders matter.
- Attack routes matter.
- Deck choices matter.
- Timing matters.

---

## 47.2 Too Much Micro

Risk:

- Game becomes stressful like traditional RTS.

Solution:

- Strong macro buttons.
- Smart unit behavior.
- Auto-assign workers.
- Good default formations.
- Defensive assignments.

---

## 47.3 Card System Becomes Pay-to-Win

Risk:

- Better cards dominate.

Solution:

- Use deck point limits.
- Powerful cards cost more deck points.
- Starter decks remain viable.
- Rarity creates variety, not raw superiority.

---

## 47.4 Too Many Units Too Early

Risk:

- Development becomes impossible.

Solution:

- Build European MVP first.
- Use placeholder models.
- Add factions one at a time.
- Balance with simple stat templates.

---

# 48. Long-Term Expansion Ideas

Future expansions could include:

## 48.1 New Factions

- Norse
- Mesoamerican
- Indian
- Slavic
- Persian-specific split
- Steppe Nomads
- Fantasy Undead
- Elemental Kingdoms

---

## 48.2 Heroes / Commanders

Each faction could eventually have commander cards.

Examples:

- European: The Lion Duke
- Asian: Jade Strategist
- African: Sunshield Queen
- Middle Eastern: Crescent Vizier

Heroes should be powerful but not required.

---

## 48.3 Campaign

A future campaign could include:

- Tutorial missions
- Faction campaigns
- Boss fortresses
- Challenge maps
- Survival defense
- Historical/fantasy scenarios

---

## 48.4 Multiplayer

Future multiplayer modes:

- 1v1
- 2v2
- Co-op vs bot
- Free-for-all
- Draft mode
- Ranked mode
- Custom lobbies

---

# 49. Final Game Vision

**Kings of the Keep** should be a strategy game where the player feels like they are building a kingdom, preparing an army, and making large strategic decisions.

The fun should come from:

- Building a strong economy
- Choosing the right deck
- Creating a unique army identity
- Watching large armies clash
- Timing attacks
- Defending walls
- Breaking enemy fortresses
- Unlocking new cards
- Improving faction mastery

The game should not be about clicking faster than the opponent.

It should be about thinking better, building smarter, and commanding the battlefield like a ruler.

The fantasy is:

> Build your keep. Raise your army. Command the war. Break their fortress before they break yours.

---

# 50. Recommended Prototype Direction

The first playable prototype should be:

> **European vs European on one small map**

This is the cleanest first implementation because European units are the most standard RTS baseline.

After that, add:

1. Middle Eastern faction  
2. Asian faction  
3. African faction  

Middle Eastern should come second because trade, cavalry, and siege will quickly test whether the macro command systems are actually fun before expanding into the more unique factions.

