# Kings of the Keep

A 3D browser-based macro RTS: build your economy, construct your base, forge an army from cards, and command it with high-level orders — then break the enemy fortress before they break yours.

Built with TypeScript, Three.js, and Vite. All art is procedural low-poly; all audio is synthesized. No assets, no backend — everything runs and saves locally.

## Play

```bash
npm install
npm run dev
```

Open the printed local URL. Chrome/Edge/Firefox on desktop recommended.

## What's in the box

- **4 factions**, each fully playable with ~44 unique cards: European (walls, knights, crossbows), Asian (speed, formations, rockets), African (skirmishers, war beasts, drums), Middle Eastern (trade, camels, great bombards)
- **~180 cards**: units, buildings, defenses, abilities, faction powers, neutral mercenaries, and 4 legendary hero commanders
- **Macro command system**: ATTACK/DEFEND stances, allocation sliders, 6 flag types (march, assault, siege, rally, harass, defend), 6 emergency buttons
- **Automated economy**: worker ratio sliders, camps, farms, markets, trade caravans
- **Bot opponents**: 3 difficulties × 4 faction personalities (turtle-tech Europeans, raiding Africans, trade-booming Middle Easterners...)
- **6 maps** from beginner valley to the Four Kings Basin
- **5 victory modes**: fortress destruction, shrine capture, survival waves, timed score, annihilation
- Fog of war, morale & routing, counters, fortress tiers 1–4, 20+ upgrades, Influence resource
- **Deck editor** (50 points, 20 cards, required slots) and a **shop** with 8 pack types, dust, and crafting — earn gold by winning matches
- Options, stats, profile icons, and local saves

## Controls

| Input | Action |
|---|---|
| WASD / edge scroll | Move camera |
| Q/E or middle-drag | Rotate; wheel zooms |
| Space | Jump to your keep |
| Left click / drag | Select units |
| Right click | Contextual order (move / attack / gather / build / repair) |
| R | Rotate building ghost while placing |
| Shift+click (placing) | Keep placing more of the same building |
| Esc | Pause menu / cancel placement |
| F8 | Dev fast-forward (8×) |

## Development

```bash
npm run typecheck   # strict TS
npm test            # vitest: data integrity, headless sim, bot matches, victory modes
npm run build       # production bundle
```

The simulation (`src/sim/`) has zero Three.js imports and runs headless under Node — the test suite plays entire bot-vs-bot matches without a browser. Player UI and bot AI both drive the sim exclusively through the `Command` queue.

---
*A Cherry Buddha production. Game Director: Dan the Man.*
