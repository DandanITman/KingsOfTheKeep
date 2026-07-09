# Faction Asset Roadmap

Design-notes-only roadmap for future continent / expansion factions. **None of
these are implemented** — no playable code, no imported assets. Placeholder
folders exist under `public/assets/models/future/` so the pipeline layout is
stable when work starts.

Launch faction order (per GDD): **European → Middle Eastern → Asian → African.**
Future factions below come after all four launch factions ship.

Rules that apply to every future faction:

- Prefer CC0 (Quaternius, Kenney, ambientCG, Poly Haven). CC-BY allowed with
  attribution recorded in `docs/ASSET_SOURCES.md` and the manifest. Never NC,
  ND, SA, GPL, unclear licenses, or ripped/fan/IP-adjacent models.
- Every asset gets a manifest entry before it ships, and loads by manifest ID.
- Kitbash from primitives + material swaps before hunting for perfect models.
- Silhouettes must read at RTS camera distance: one dominant shape per
  building, one weapon/mount cue per unit.

---

## Norse

**Visual identity.** Dark timber, iron, rune-carved stone, snow-dusted thatch,
longhouses, dragon-prow motifs. Palette: deep blue, iron grey, blood red,
bone white.

**Building silhouette language.** Long, low, steep-pitched roofs (longhouse
ridge line is the faction signature); stave-church verticals for the keep;
palisades of sharpened logs; carved totem posts as banner stands.

**Unit silhouette language.** Round shields (big, readable disc), bearded
axes, horned-free helmets (avoid the cliché and IP-adjacent looks), heavy
cloaks/furs widening the torso; berserkers bare-chested for contrast; huscarl
with two-handed axe held high.

**Likely asset sources.** Kenney Fantasy Town Kit roofs/timber (CC0);
Quaternius medieval + Viking-adjacent packs (CC0); ambientCG wood/snow/rock
materials; Poly Pizza search: "viking", "longhouse", "drakkar", "axe".

**Kitbash strategy.** Universal house + stretched footprint + steep roof cap =
longhouse; watchtower + carved post props = rune tower; European wall +
darker wood material + sharpened tips = palisade; generic warrior + round
shield prop + axe = raider line.

**Risky assets to avoid.** Anything tagged "Vikings" from TV/game IP (AC
Valhalla, God of War, Vinland Saga lookalikes); museum scans of real artifacts
with unclear licenses; runestone models using real futhark inscriptions from
scanned heritage sites (scan licenses often ND).

**MVP model IDs needed later.** `norse_longhouse_keep`, `norse_mead_hall`,
`norse_rune_tower`, `norse_shipwright_hall`, `norse_raider_axeman`,
`norse_shield_maiden`, `norse_huscarl`, `norse_berserker`, `norse_bondi_worker`,
`norse_ram_longship_cart`, `norse_palisade_wall`, `norse_carved_gate`,
`norse_totem_banner_prop`.

---

## Mesoamerican

**Visual identity.** Stepped stone pyramids, bright painted murals, feathers,
jade and gold, jaguar/eagle warrior orders. Palette: jade green, terracotta,
turquoise, gold, blood red.

**Building silhouette language.** Stepped/tiered masses everywhere (the
pyramid stair is the signature); flat-roofed stone platforms; steles and
skull-rack props; canal/chinampa farm plots instead of European fields.

**Unit silhouette language.** Feather crests for elites (tall, readable),
macuahuitl flat clubs, round feather shields, atlatl throwers with a long
spear silhouette; jaguar/eagle warrior heads as tier cues.

**Likely asset sources.** Kenney pirate/jungle kits for foliage (CC0);
Quaternius jungle/nature packs (CC0); Poly Pizza: "pyramid", "aztec", "maya",
"jungle", "totem"; ambientCG stone/moss materials.

**Kitbash strategy.** Stacked shrinking boxes + stair strip = any pyramid
tier; stone platform + feather banner props = war hut; universal farm plot +
water border = chinampa; generic warrior + feather crest + flat club = eagle
warrior.

**Risky assets to avoid.** Scans of real Maya/Aztec artifacts and glyph
panels (heritage scan licenses vary, often ND); "Aztec" packs that are Age of
Empires II rips; religious iconography reproduced verbatim (also a tone
question for the GDD).

**MVP model IDs needed later.** `meso_sun_pyramid_keep`, `meso_war_temple`,
`meso_chinampa_farm`, `meso_jaguar_lodge`, `meso_skull_rack_prop`,
`meso_villager_worker`, `meso_atlatl_thrower`, `meso_macuahuitl_warrior`,
`meso_eagle_knight`, `meso_jaguar_knight`, `meso_sling_skirmisher`,
`meso_stone_wall`, `meso_stele_banner_prop`.

---

## Indian / South Asian

**Visual identity.** Carved sandstone and marble, chhatri domes, stepwells,
war elephants as the military signature, silk banners. Palette: saffron,
peacock blue, ivory, gold.

**Building silhouette language.** Onion-adjacent domes but on open pillared
pavilions (chhatri) — distinct from Middle Eastern closed domes; tiered
shikhara towers for the keep; stepped water tanks; elephant stables as a
unique production silhouette.

**Unit silhouette language.** War elephants with howdah towers (biggest unit
silhouette in the game); chakram/talwar infantry; longbowmen with bamboo bows;
armored elephant vs unarmored labor elephant distinction.

**Likely asset sources.** Poly Pizza: "elephant", "taj", "temple india",
"palace"; Quaternius animals (CC0 elephant base); ambientCG sandstone/marble;
Kenney props for market/dock shared pieces.

**Kitbash strategy.** Middle Eastern dome tower + open pillar base = chhatri;
box keep + tiered shrinking towers = shikhara; Quaternius elephant + box
howdah + banner = war elephant; universal farm + water tile inset = paddy.

**Risky assets to avoid.** Scans of the Taj Mahal or active temples (many
heritage scans ND/NC); religious deity statues (license and respect issues);
"India" packs on OpenGameArt with mixed per-file licenses — check every file.

**MVP model IDs needed later.** `indian_shikhara_keep`, `indian_chhatri_court`,
`indian_stepwell`, `indian_elephant_stable`, `indian_silk_bazaar`,
`indian_villager_worker`, `indian_talwar_infantry`, `indian_bamboo_longbowman`,
`indian_chakram_skirmisher`, `indian_war_elephant`, `indian_labor_elephant`,
`indian_carved_wall`, `indian_silk_banner_prop`.

---

## Slavic

**Visual identity.** Whitewashed stone + dark log construction, onion-dome
tops on towers, deep forests, bogatyr heavy cavalry. Palette: white, birch,
deep green, crimson, gilded domes.

**Building silhouette language.** Log-built izba houses with carved gables;
kremlin-style tent-roof towers (sharp cone, distinct from European turrets);
wooden ostrog palisade forts; churches with a single small onion dome as the
banner building.

**Unit silhouette language.** Tall almond/kite shields, spear + axe militia
mass, bogatyr cavalry with tall pointed helms, streltsy-style axe-gunners in
later tiers (if gunpowder fits the GDD era band).

**Likely asset sources.** Kenney Fantasy Town Kit timber pieces (CC0);
Quaternius medieval (CC0); ambientCG log/whitewash/plaster materials; Poly
Pizza: "log cabin", "orthodox", "kremlin", "onion dome".

**Kitbash strategy.** Universal house + log material + carved gable strip =
izba; European tower + tent-cone roof = kremlin tower; small dome from
Middle Eastern kit + gold material + drum base = church top; European knight +
tall helm + kite shield = bogatyr.

**Risky assets to avoid.** Scans of real Orthodox churches (heritage + ND);
anything from Slavic-themed commercial games (Kingdom Come, Witcher-adjacent
fan art); Mount & Blade module rips.

**MVP model IDs needed later.** `slavic_kremlin_keep`, `slavic_izba_house`,
`slavic_onion_chapel`, `slavic_hunter_lodge`, `slavic_ostrog_wall`,
`slavic_tent_roof_tower`, `slavic_villager_worker`, `slavic_spear_militia`,
`slavic_axe_druzhina`, `slavic_bogatyr_cavalry`, `slavic_forest_archer`,
`slavic_gusli_banner_prop`.

---

## Persian-specific split

(Currently folded into the Middle Eastern faction; splits out when the ME
roster is mature.)

**Visual identity.** Distinct from generic ME: glazed blue-tile domes,
paradise gardens, winged-lion motifs, immortal-style elite infantry, heavy
cataphract cavalry. Palette: lapis blue, turquoise, gold, white.

**Building silhouette language.** Iwan arches (huge single portal arch) as
the front of every major building; blue-glazed domes vs ME sandstone domes;
walled garden (charbagh) as an economy/culture building silhouette —
symmetric quadrants + water cross.

**Unit silhouette language.** Cataphracts: fully skirted armored horse (no
visible legs — instantly distinct from European knight); immortals with wicker
shields and spears; scythed chariots if the GDD wants a gimmick siege unit.

**Likely asset sources.** Reuse the ME base kit + new blue-tile material set
(ambientCG glazed ceramic); Poly Pizza: "persian", "garden", "fountain",
"chariot"; Quaternius horses for cataphract base.

**Kitbash strategy.** ME dome tower + blue material override = Persian tower
(material override slot already in manifest schema); ME citadel + iwan arch
front = palace; garden = flat plot + hedge boxes + fountain prop; ME horse
raider + armor skirt geometry = cataphract.

**Risky assets to avoid.** Persepolis heritage scans (ND); Prince of Persia /
AC Mirage fan assets; carpet/miniature artwork textures scanned from books
(unclear rights).

**MVP model IDs needed later.** `persian_iwan_palace_keep`,
`persian_blue_dome_tower`, `persian_paradise_garden`, `persian_qanat_well`,
`persian_immortal_spearman`, `persian_cataphract`, `persian_horse_archer`,
`persian_scythed_chariot`, `persian_villager_worker`, `persian_tile_wall`,
`persian_winged_lion_banner_prop`.

---

## Steppe Nomads

**Visual identity.** Mobility as identity: gers/yurts, horse herds, banner
poles with horsetails, minimal permanent structures. Palette: felt white,
leather brown, steel, sky blue.

**Building silhouette language.** Round felt gers (low dome cylinder — reads
opposite to every other faction's rectangles); wagon-mounted structures
(buildings that could pack up, even if gameplay keeps them static); corrals
and hitching lines instead of walls; the "keep" is a great khan's ger ring.

**Unit silhouette language.** Almost everything mounted; horse archer as the
line unit (bow up, quiver visible); lancer with horsetail banner; unmounted
units are rare and read as support (shaman, wagon crew).

**Likely asset sources.** Poly Pizza: "yurt", "tent", "horse", "wagon", "camp"
(several CC0 yurt/tent models exist); Quaternius animals for horse herds;
Kenney survival/camp kits for props; ambientCG felt/leather/fur materials.

**Kitbash strategy.** Cylinder + shallow dome + door flap = ger at any size
(scale = building tier); universal cart + ger top = pack wagon building;
fence pieces + horse models = herd grounds; ME horse raider + quiver + new
material = steppe horse archer.

**Risky assets to avoid.** Anything Mongol-themed ripped from Total War or
AoE4; historical banner/tamga symbols of living cultures used carelessly;
"Genghis Khan" character models (usually fan art of specific games).

**MVP model IDs needed later.** `steppe_khan_ger_keep`, `steppe_ger_house`,
`steppe_pack_wagon_hall`, `steppe_herd_grounds`, `steppe_horse_archer`,
`steppe_horsetail_lancer`, `steppe_shaman_support`, `steppe_wagon_ram`,
`steppe_camp_worker`, `steppe_corral_fence`, `steppe_horsetail_banner_prop`.

---

## Fantasy Undead

**Visual identity.** First openly fantasy faction: bone, grave dirt, sickly
green necromantic light, torn banners, ruined-church architecture. Palette:
bone white, grave black, necro green, tarnished silver.

**Building silhouette language.** Everything leans and sags (shear the
kitbash groups a few degrees); crypts and mausoleums with heavy lintels;
bone-spire keep; graveyard plots as "farms"; green emissive windows/cracks as
the faction light signature (cheap emissive material, no dynamic lights).

**Unit silhouette language.** Skeletons read by gaps (thin limbs, missing
mass) — keep silhouettes exaggerated so they read at distance; hunched ghouls
vs upright skeleton soldiers; necromancer with staff + floating book; bone
catapult flinging skulls.

**Likely asset sources.** This is the best-served fantasy niche: Quaternius
"Ultimate Skeletons" / dungeon packs (CC0), Kenney graveyard kit (CC0), Poly
Pizza: "skeleton", "grave", "crypt", "zombie". Least kitbashing needed of all
future factions.

**Kitbash strategy.** European church + sag/shear + bone props = ruined
cathedral keep; universal house + collapse (delete roof half, add debris) =
hovel; catapult + bone material + skull ammo = bone thrower; emissive green
plane windows on any building for the light signature.

**Risky assets to avoid.** Warcraft/WoW Scourge lookalikes (very common as
fan models — reject anything "inspired by" named games); Diablo fan assets;
horror movie IP (specific named monsters).

**MVP model IDs needed later.** `undead_bone_spire_keep`,
`undead_ruined_cathedral`, `undead_crypt_barracks`, `undead_graveyard_farm`,
`undead_soul_forge`, `undead_skeleton_worker`, `undead_skeleton_spearman`,
`undead_skeleton_archer`, `undead_ghoul_ripper`, `undead_necromancer`,
`undead_bone_catapult`, `undead_barrow_wall`, `undead_torn_banner_prop`.

---

## Elemental Kingdoms

**Visual identity.** Second fantasy faction (or a set of sub-factions):
living stone, fire, frost, storm. Architecture grown rather than built —
crystal clusters, floating fragments, elemental cores. Palette per element:
magma orange/black, ice blue/white, storm violet, earth ochre/jade.

**Building silhouette language.** Crystalline angular clusters (no roofs at
all — instantly non-human); a floating core above the keep (cheap: separate
mesh bobbing on sine, no physics); conduit lines (emissive strips) connecting
buildings visually; monolith "walls" as spaced standing stones.

**Unit silhouette language.** Golems: heavy, blocky, gapped joints (floating
forearms are cheap and readable); wisps/elementals as billboarded particle
cores with orbiting fragments; one big titan silhouette per element as the
super-unit.

**Likely asset sources.** Quaternius has CC0 golem/monster packs; Kenney
particle sprites for cores; Poly Pizza: "golem", "crystal", "rock monster";
ambientCG lava/ice/crystal-adjacent materials; Poly Haven HDRIs for card art
renders only (not runtime).

**Kitbash strategy.** Crystal = stretched icosahedron primitives + emissive
material (fully procedural, may need zero external models); golem = existing
`golem` unit mesh archetype (already in `unitMeshes.ts`) + element material
swap; floating keep core = sphere + orbiting rock fragments on a cheap
animation hook like the existing banner flutter pass.

**Risky assets to avoid.** Anything resembling WoW elementals or Dota/LoL
creatures; marketplace "stylized RTS" packs that are non-commercial;
CGTrader/Sketchfab models with "editorial" or unclear licenses.

**MVP model IDs needed later.** `elemental_core_spire_keep`,
`elemental_crystal_forge`, `elemental_conduit_pylon`, `elemental_ritual_circle`,
`elemental_stone_golem`, `elemental_magma_golem`, `elemental_frost_wisp`,
`elemental_storm_caller`, `elemental_earth_titan`, `elemental_monolith_wall`,
`elemental_floating_shard_prop`.
