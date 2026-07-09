# Changelog

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
