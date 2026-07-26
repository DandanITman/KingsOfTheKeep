# Changelog

## Overhaul phase 1: unit scale, fog of war, world edge, dead wiring, sim fixes

First pass of a wider graphics/mechanics/playability overhaul. This phase fixes
what visibly reads as broken and makes already-implemented content reachable; it
adds no new systems.

**Imported units were floating and ~2.5x oversized.** `ModelLibrary` fitted every
GLB by `max(size.x, size.z)` — the *horizontal footprint*, not height — so a
humanoid fitted to 0.9 came out over 2 units tall, and the oversizing scaled up
the small residual gap between bind-pose grounding and the animated pose into a
visible hover. Fitting is now split into two explicit, separately-named
semantics: `fitHeight` for units (a unit's size is how tall it stands) and
`fitWidth` for buildings and resource nodes (whose size is dictated by the sim's
footprint). `UnitView.importedUnitFitSize` became `importedUnitHeight`, carrying
real world-unit heights — 1.8 infantry, 2.4 cavalry, 2.6 camel/siege, 4.2
elephant — against a keep of roughly 9. Procedural-mode units were always correct;
only the GLB path was affected.

**Fog of war read as a dead black void.** It was a plane floating at y=2.5 —
exactly hut-roof height, so anything taller punched through and hovered on top of
it — painting unexplored terrain at alpha 0.94 over near-black, with hard `?:`
steps that showed the cell grid as blocks. It now sits at ground level, tints
toward the biome's own horizon colour at a lighter alpha, blurs the value grid 3x3
on upload (stored as `value * 127` so the fractional result survives 8-bit
quantization), and samples with `smoothstep`. Resource nodes in never-seen
territory are hidden rather than advertising themselves through the haze.

**The map edge and the void beyond it were visible at max zoom-out.** Added a
low-resolution apron extending 320 units past the map bounds that stays near-flat
at first and then falls away, washed toward the horizon colour with distance so it
reads as aerial perspective rather than a bright green field. The fog plane
overhangs the map by 90 units with clamped sampling, so land outside the playable
area carries the same fog state as the map edge beside it instead of leaving the
map outlined as a sharp dark rectangle. Also set `fogColor === horizon` per biome
in `Renderer` — the two differed, and distance fog fading geometry to one colour
while the sky dome ended in another was the hard grey horizon seam.

**Shadow quality:** the sun's ortho frustum was fixed at ±80 regardless of zoom,
spending most of a 1024px shadow map on off-screen ground. It now tracks camera
zoom, clamped to 22–90.

**The deck editor, the shop, and 4 of 5 victory modes were wired to nothing.**
`PlaySetupScreen` hardcoded `playerDeckId: 'starter'` while the deck editor saves
decks as `deck_<timestamp>`, so `MatchScreen`'s lookup always missed and silently
fell back — making the entire shop → packs → dust → crafting → deck-building loop
unable to affect a match. `victoryMode`, `speed` and `startingResources` were
hardcoded in the same block. Added a "battle rules" strip to the setup screen with
deck (faction-filtered, refreshed when the faction changes), victory mode,
starting resources and game speed. A deck-lookup miss now warns to the console
instead of failing silently.

**Sim correctness:**

- `dotOnHit` only ever fired on melee hits — every ranged unit carrying it (10
  units across three factions) silently lost it. It now rides on the projectile
  and is applied at impact, through a shared `applyDot` helper so the melee and
  projectile paths can't drift apart again.
- Rebuilding a fortress was pointless: `player.fortressId` was written once at
  match start and never updated, so `fortressOf()` returned null the moment the
  original keep fell and `VictorySystem` read that as immediate defeat. It now
  rescans for any other *completed* fortress the player holds and re-caches.
- The `shielded` tag counter was written backwards — `attackerTag: 'shielded',
  defenderRole: 'ranged'` made shield units deal 30% *less* damage to archers,
  the opposite of the intent recorded in its own comment. `TAG_COUNTERS` gained
  an `attackerRole` predicate and the rule is now expressed as archers doing
  less to shielded targets.
- `annihilation` mode was a trap rather than a victory condition: after a 180s
  grace, a player with no army and no military buildings lost on the spot, so a
  peacefully-teching player who simply hadn't built a barracks by 3:00 lost
  unattacked. The grace is now 300s and elimination additionally requires that
  the player cannot afford any military building in their deck.
- `Unit.vel` was declared and documented as "steering velocity smoothing" but
  never read or written. Removed.

**Save robustness:** `migrate()`'s backfill was shallow at the top level only
despite its comment claiming "per section", so a save carrying a partial
`options` object survived migration untouched and then killed the app at boot
dereferencing `options.display.uiScale`. It now descends three levels, filling
missing settings while preserving the player's existing choices.

Typecheck clean; the vitest suite went 35 → 41 tests. The five new sim/save cases
were each verified to fail against the old behaviour before the fix was restored,
so they test the bug rather than the implementation.

## Main-menu icon size and clipping fix

- Normalized the six main-menu icon PNGs: trimmed each to its artwork's alpha
  bounding box, re-centered it, and padded to a uniform 86% fill so every icon
  reads at the same visual size. Also downscaled them from 1024px (~1 MB each)
  to 256px (~100 KB each) — they render at ~40-54px, so this only sheds dead
  weight.
- Icon boxes in `.menu-action` now scale with button height via clamp()
  instead of a fixed 52px image, which overflowed the 48px-min buttons
  (`overflow: hidden` clipped the top and bottom edges — the "runs over the
  edge" artifact). The primary Play button gets a proportionally larger icon.
- Removed a doubled drop-shadow (it was applied on both the icon wrapper and
  the img element).

## Cinematic play setup and supplied menu icon pass

- Replaced the form-based play setup with a cinematic battlefield screen that
  presents map, player faction, bot faction, and difficulty as visual
  selectors while preserving the existing match-launch flow.
- Added original battlefield, map-preview, and faction-medallion artwork for
  the setup screen; documented the generated project assets for future reuse.
- Fixed setup defaults to starter decks, normal speed, standard resources, and
  fortress victory, removing unnecessary player-facing advanced controls.
- Added an Options return route back to play setup, a Battle Codex help modal,
  and responsive desktop/mobile screen layouts.
- Replaced main-menu SVG glyphs with the six supplied high-detail transparent
  icons for Play, Deck Editor, Shop, Options, Credits, and Exit.

## Main menu visual refinement

- Rebalanced the main-menu composition around a framed central masthead and
  responsive action column, so navigation no longer stretches across the
  panel at desktop resolutions.
- Lifted the battlefield and panel overlays to retain the castle-and-banner
  backdrop instead of obscuring it with near-black treatment.
- Replaced generic menu glyphs and the default emoji profile marker with
  purpose-built medieval SVG artwork for cards, shop chest, credits scroll,
  exit door, crown, and crossed swords.

## Skeletal unit animation, terrain/lighting polish, AoE-style HUD upgrades

- Rigged GLB units now actually animate: `ModelLibrary` keeps `gltf.animations`
  (previously discarded), clones skinned models with `SkeletonUtils.clone`, and
  `UnitView` drives a per-unit `AnimationMixer` mapping sim tasks to semantic
  clip roles (idle / walk / attack / shoot / work) with crossfades. Covers the
  Quaternius humanoid rig (workers, crossbowman) and the horse rig
  (knight, light horse raider — cavalry gallops). Attack loops are time-scaled
  to roughly match each unit's attack period.
- Fixed the bug that made properly-cloned skinned models invisible: these GLBs
  ship near-zero-scale bind geometry with the real size baked into bone bind
  matrices, so `Box3.setFromObject` measured garbage. Fitting now uses precise
  (skeleton-aware) bounds for skinned models.
- Models with skeletons but unusable clip sets (militia swordsman's skeleton
  differs from the donor rig; samurai ships a single pose action) fall back to
  a procedural root-motion gait — walk bob/roll and task-driven pitch — so no
  imported unit slides around rigidly anymore. Donor-clip retargeting only
  accepts clips where ≥50% of tracks bind to the target skeleton.
- Once a unit's GLB loads, the procedural placeholder is no longer drawn
  underneath it (was double-rendering both). Imported unit cap raised 80→120.
- Terrain got a tiled procedural detail texture (grain, mottling, grass-blade
  strokes on grass/savanna) multiplied under the vertex colors; sun is warmer
  and slightly stronger, tone-mapping exposure raised 1.18→1.24.
- AoE-style HUD upgrades toward the reference art: resource segments now show
  live "+N /min" income rates (gross income tallied per player in
  `MatchState.addResource`, sampled over a rolling 20s window) with gold
  hairline dividers; selection panel shows a serif gold uppercase title and a
  proper green HP bar (red when low); minimap frame is heavier; command-grid
  labels no longer clip.

## Asset pipeline finish + fantasy UI pass + repo automation

- Overhauled the M12 asset/UI branch (originally authored by Codex): fixed
  imported GLB models rendering near-black by neutralizing their exported
  `metallicFactor` and adding a soft PMREM environment map to `Renderer`
  (`src/render/assets/ModelLibrary.ts`, `src/render/Renderer.ts`).
- Fixed multi-variant model packs (e.g. `env_tree_oak.glb`, which bundles 5
  tree meshes in one file) rendering all variants squeezed into one node's
  footprint — added `variantPick`/`variantIndex` support so each instance
  picks a single sibling deterministically.
- Reworked terrain doodads (`src/render/TerrainView.ts`): brighter
  biome-tuned grass/tree colors, blobby low-poly canopies instead of dark
  cones, decoration trees clustered at map edges instead of littering the
  playable area.
- Restored the team-colored banner on upgraded (GLB) keeps, which was
  dropped when a building's procedural placeholder was swapped for its
  imported model (`src/render/BuildingView.ts`).
- Fixed in-match command-button labels wrapping mid-word (e.g.
  "FORMATI ONS") in `src/ui/styles/hud.css`.
- Applied the (previously unused) Kenney Fantasy UI Borders pack as
  gold-tinted 9-slice frames across menu buttons, panels, modals, and the
  in-match HUD (`src/ui/styles/main.css`, `src/ui/styles/hud.css`).
- Added dev-only tooling to make visual verification possible in this
  environment: a `/__shot` Vite middleware that saves canvas/DOM captures to
  `.dev-shots/` (gitignored), and `preserveDrawingBuffer` on the WebGL
  renderer gated behind `import.meta.env.DEV`.
- Added `.claude/skills/commit-and-push` and a repo `CLAUDE.md` pointing to
  it: after finishing and verifying a change, commit with a detailed message,
  log it here, and push to `origin` (this repo). Wired `origin` to
  https://github.com/DandanITman/KingsOfTheKeep for the first time.
- No gameplay/sim logic changed in this pass — typecheck and the full
  vitest suite (35 tests) are green.
