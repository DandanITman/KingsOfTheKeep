# Changelog

## Overhaul phase 3a: procedural art system — scale contract, faction grammar, buildings

The first half of replacing the imported-model art with one coherent,
code-authored system. New `src/render/art/` is now the single source of truth
for how the 3D world looks, built alongside the old system behind an `?art=`
switch so the game stays playable throughout the migration.

**The scale contract (`art/scale.ts`).** The bug that made units float and
render 2.5x oversized was fundamentally a scale bug that nothing checked: sizes
were opaque multipliers (`s = 0.9` here, `fitSize: 1.45` there) with no declared
meaning. Sizes are now named heights in world units, and `tests/art.test.ts`
measures the real geometry against the declaration rather than trusting it.
Nothing auto-fits to a measured bound — blind normalization is what caused the
original bug.

This exposed a live defect: procedural infantry stood 0.94 units tall while the
GLB path built them at 1.8, and since imported models cap at 120 per match, a
large battle rendered the same unit type at two different sizes side by side.
Both paths now read the same table. `UnitView`'s `s = 0.9` is gone, replaced by
a scale derived from each archetype's declared height, and the three separate
hardcoded guesses at keep-wall height collapse into one `wallWalkHeight()`.

**Faction identity from shared blueprints.** 24 of the ~60 buildings are shared
by all four factions — a European barracks and an Asian barracks are literally
the same `mesh` key — so faction identity cannot come from the mesh key and has
to be supplied at build time. `buildBuildingMesh` now takes a faction, and
blueprints call `c.mass()` / `c.roof()` / `c.tower()` rather than raw shapes, so
the faction substitutes its own materials and silhouette grammar underneath.
One barracks blueprint now produces four genuinely different buildings:

- **European** — grey ashlar, steep red-tile gables, spired towers, gold cross
- **Asian** — pale plaster, tiered upswept pagoda roofs, red lacquer trim
- **African** — round battered mudbrick, tall thatch cones, gourd finials
- **Middle Eastern** — sandstone cubes, flat parapets with turquoise coping,
  onion domes, crescent finials

**Building silhouettes.** Lumber Camp, Mining Camp and Stone Quarry were the
same two boxes with a differently coloured cube, and unreadable in the card bar.
They now differ by *dominant axis* rather than colour — a vertical minehead
frame, a diagonal derrick boom, low horizontal log stacks — and a test asserts
their proportions actually differ so a future copy-paste can't quietly undo it.
The camps also grew from ~1.0 to 2.0–2.4 units tall so their props read at all.

**Baked ambient occlusion.** Contact darkening toward the ground plus darkening
of downward-facing faces, computed once at build time into the vertex colours
the geometry already carries. Zero runtime cost, and it is most of what
separates flat untextured primitives from something that looks hand-painted.

**Contact shadows.** A soft blob under every unit, one instanced draw call for
the whole army. The shadow map alone never sells contact at RTS zoom; this is
what makes units look like they are standing on the terrain, and it removes the
floating read permanently regardless of what the shadow map does.

**Card previews now show the player's own faction.** Universal cards carry
faction `neutral`, so a European player's Barracks card previewed in generic
neutral styling — art they would never see in a match. Previews are keyed on the
viewer's faction and cached per (card, faction).

Also fixed: `prism` was built with `ExtrudeGeometry`, which produces
*non-indexed* geometry, and `mergeGeometries` returns null when merging a mix of
indexed and non-indexed inputs — one extruded gable roof silently emptied every
other part of the building it belonged to. It is now an explicit indexed
geometry with per-face vertices so facets stay flat-shaded.

`tests/art.test.ts` (12 cases) replaces the coverage `tests/assets.test.ts` will
lose when the manifest goes: every blueprint builds for every faction, every
building matches its declared height within tolerance and sits at y=0, keeps
grow per tier, camps are shape-distinguishable, unknown mesh keys resolve
explicitly rather than silently substituting, and every unit mesh key in the
data layer has a declared height.

**Still to come in phase 3:** unit archetypes are not yet authored as
faction-aware blueprints — they use the legacy geometry, now correctly scaled
and shadowed, so all 16 worker types still share one look. Terrain, water and
the fog rework against the new palette are also outstanding, as is deleting the
GLB pipeline (phase 4).

Typecheck clean; vitest 44 → 56 tests. All four factions verified in a browser,
and `?art=legacy` still boots clean.

## Overhaul phase 2: control groups, hotkeys, queued orders, stop and hold

The game previously had no RTS control layer at all — the entire keyboard
vocabulary was WASD, Q/E, Space, R, Esc and F8. Every order meant a mouse trip
to the HUD, there was no way to recall a group of units, and each new order
discarded the previous one outright.

**New `src/app/screens/MatchHotkeys.ts`** owns the keyboard command layer. It
lives in the app layer, never the sim: every action it takes goes through
`MatchSim.enqueue`, the same command seam the bot and the mouse already use, so
the simulation stays DOM-free and the keyboard cannot desync it. Keys are
ignored while a text field has focus.

- **Control groups.** `Ctrl+1-9` assigns, `1-9` recalls, pressing the same group
  twice within 400ms centres the camera on it. Dead ids are pruned each frame so
  a group never resurrects a stale selection.
- **Selection shortcuts.** `Ctrl+A` selects your whole army (military only —
  workers stay on the gold), `.` / `,` cycle idle workers and centre on each,
  `` ` `` jumps to your keep without disturbing the selection.
- **Card bar hotkeys.** `Q W E T A D F G Z X C V` play the matching slot, with
  the key drawn as a badge on each card tile. Pressing a second card key swaps
  the pending placement rather than stacking modes. The set deliberately skips
  S, H and R (stop, hold, rotate-ghost): binding those by context would mean the
  same key doing different things depending on what happened to be selected.

**Shift-queued orders.** `Unit` gained an `orders: UnitTask[]` queue;
`directOrder`, `directGather` and `directBuild` take a `queue` flag set by
shift+right-click. The queue drains in one place — a single pass in
`MatchSim.tick` that advances any unit sitting idle with orders pending — so
every path that finishes a task by going idle (arrival, gather completion, a
dead fight target) advances the queue for free, with no per-system changes. A
plain right-click still discards everything pending, which is what a player
means by it.

**Stop and hold position.** New `stopUnits` and `holdPosition` commands, bound to
`S` and `H`, distinct from the global emergency STOP in the macro panel. Hold is
a toggle and is genuinely enforced rather than being a flag nothing reads: a
holding unit only acquires targets already inside its weapon range (acquiring at
full line-of-sight would flip it between fight and idle every few ticks against
something it will never walk toward), never chases, and is skipped by the macro
steering and worker-allocation systems. Shift-queued units are likewise left
alone by those auto-systems.

**Documentation.** Added `src/data/controls.ts` as the single dependency-free
source of truth for bindings. The setup screen's Battle Codex now renders the
full reference — `showModal` accepts an element as well as a string — and the
README control table was expanded to match.

Typecheck clean; vitest 41 → 44 tests. The hold-position test asserts both
halves (an ordinary unit closes the gap, the same setup on hold does not) so it
cannot pass vacuously. Control groups, card hotkeys and the codex were verified
in a browser.

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
