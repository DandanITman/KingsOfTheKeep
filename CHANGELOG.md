# Changelog

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
