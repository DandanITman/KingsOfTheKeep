# Art direction

Everything in the 3D world is generated in code. There are no model files, no
textures, and no third-party art in the rendered scene — the only image assets
the game ships are the 2D menu and play-setup artwork under
`public/assets/ui/`, which is original to the project (see
[`PLAY_SETUP_ASSETS.md`](PLAY_SETUP_ASSETS.md)).

This replaces an earlier pipeline of 89 imported GLB models. That approach was
abandoned because mixed-source models never cohered into one style, could not be
adjusted to fit gameplay needs, carried attribution obligations, and added ~190 MB
to the repository. Generating geometry costs a few hundred lines and gives total
control over silhouette, scale and palette.

## Where things live

```
src/render/art/
  scale.ts       THE SCALE CONTRACT — declared heights in world units
  palette.ts     material slots + per-faction colour identity
  factions.ts    the silhouette grammar each faction is built from
  buildings.ts   building blueprints + the faction-aware build context
  units.ts       unit archetypes + the three-layer instancing compiler
  ContactShadows.ts
  kit/
    node.ts      Node type, transforms, measuring, grounding
    forms.ts     dimensioned primitives (slab, post, prism, dome, ...)
    roofs.ts     roofs, tower caps and finials by cultural shape
    props.ts     the small objects that tell similar buildings apart
    detail.ts    baked ambient occlusion
```

## Three rules

**1. Sizes are declared heights, never scale factors.**
`scale.ts` states how tall everything is in world units. Nothing auto-fits to a
measured bound. This exists because the bug that made units float and render
2.5× oversized came from exactly that: an opaque multiplier fitted to a measured
*horizontal* extent, with nothing checking the result. `tests/art.test.ts`
re-measures the real geometry against the declaration, so a mis-sized mesh fails
the build instead of shipping.

**2. Geometry names a slot; the faction decides what the slot looks like.**
A blueprint asks for `'stone'` or `'thatch'`, not a hex colour. This is what
lets 24 buildings that are *shared across all four factions* — a European
barracks and an Asian barracks are the same `mesh` key — read as four different
cultures without authoring four sets of meshes.

**3. Nothing resolves silently.**
An unknown mesh key throws in dev and renders a magenta marker in production.
The old builders quietly substituted a generic hut or a swordsman, which is how
art gaps sat unnoticed.

## The faction grammar

Identity comes from shape first and colour second — you read a roofline long
before a wall material at RTS camera distance.

| | European | Asian | African | Middle Eastern |
|---|---|---|---|---|
| plan | rectangular | wide + low | round | rectangular, arched |
| walls | grey ashlar | plaster + lacquer posts | battered mudbrick | battered sandstone |
| roof | steep red-tile gable | tiered upswept pagoda | tall thatch cone | flat crenellated parapet |
| tower cap | spire | pagoda cap | thatch cone | onion dome |
| keep roof | gable | pagoda | thatch cone | dome |
| finial | gold cross | ridge ornament | gourd | crescent |
| helm | kettle / great helm | cap / kabuto | bare / feather crown | conical / turban |
| shield | kite | buckler | tall hide oval | round |
| blade | straight | slightly curved | slightly curved | scimitar |

## Silhouette discipline

Buildings in the same functional group must differ by **dominant axis or prop
shape, not by colour**. The three gathering camps were previously the same two
boxes with a differently coloured cube on top, and were indistinguishable in the
card bar. They now read as a vertical minehead frame, a diagonal derrick boom
and low horizontal log stacks. A test asserts their proportions actually differ,
so a future copy-paste cannot quietly undo it.

## Adding a building

1. Declare its height in `BUILDING_HEIGHT` (`scale.ts`).
2. Add a blueprint in `buildings.ts`. Use `c.mass()`, `c.roof()`, `c.tower()`,
   `c.door()`, `c.plinth()`, `c.prop()` — **never** raw `roof('gable', ...)`,
   or the building will look the same for every faction.
3. Give it a prop cluster that distinguishes it from its neighbours in the
   build menu.
4. Run `npm test`. The contract tests will tell you if it is the wrong height,
   floats, or sprawls outside its nav footprint.

## Adding a unit

1. Declare its height in `UNIT_HEIGHT` (`scale.ts`).
2. Add an archetype in `units.ts`, composing `footBody()` / `mount()` /
   `rider()` / `chassis()` with a weapon.
3. Tag weapon and tool geometry with `layer: 'action'` so `UnitView` can swing
   it, and add an entry to `ACTION_PIVOTS` if the default pivot is wrong.
4. Anything team-coloured takes `slot: 'team'` or `layer: 'team'`.

Note that the action layer does **not** count toward a unit's declared height —
otherwise a catapult would measure differently with its arm cocked than
released.
