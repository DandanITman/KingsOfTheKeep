/**
 * The colour vocabulary for everything in the 3D world.
 *
 * Colours used to be hardcoded hex constants scattered across five files
 * (`Renderer.BIOME_SKY`, `TerrainView.BIOME_GROUND`, `unitMeshes`,
 * `buildingMeshes`, `FlagView.FLAG_COLORS`), which is why the procedural keep
 * and the imported keep looked like they came from different games. Geometry
 * now names a *slot* — 'stone', 'thatch', 'cloth' — and the faction decides what
 * that slot actually looks like. One barracks blueprint, four distinct barracks.
 */

export type Slot =
  // Masonry and earth
  | 'stone'
  | 'stoneDark'
  | 'stoneTrim'
  | 'sandstone'
  | 'mudbrick'
  | 'plaster'
  // Timber
  | 'wood'
  | 'woodDark'
  | 'timber'
  | 'bamboo'
  // Roofing
  | 'thatch'
  | 'tileRoof'
  | 'slate'
  | 'lacquer'
  | 'canvas'
  // Metal and treasure
  | 'iron'
  | 'steel'
  | 'darkIron'
  | 'gold'
  | 'copper'
  | 'jade'
  // Soft goods and people
  | 'cloth'
  | 'clothDark'
  | 'leather'
  | 'skin'
  | 'hair'
  | 'hide'
  // Ground dressing
  | 'foliage'
  | 'crop'
  | 'dirt'
  | 'rope'
  // Emissive-ish
  | 'ember'
  // Special: resolved per player / per faction rather than from the palette
  | 'team'
  | 'accent';

export type ArtFactionId = 'european' | 'asian' | 'african' | 'middleEastern' | 'neutral';

/** Neutral defaults. A faction overrides only the slots that carry its identity. */
export const BASE_PALETTE: Record<Slot, number> = {
  stone: 0x9a958c,
  stoneDark: 0x6f6b64,
  stoneTrim: 0xb8b2a6,
  sandstone: 0xd8c9a0,
  mudbrick: 0xb08350,
  plaster: 0xe0d6c0,

  wood: 0x8a6a3a,
  woodDark: 0x5d4526,
  timber: 0x6b4f2c,
  bamboo: 0xbfae6a,

  thatch: 0xbf9b52,
  tileRoof: 0x9a4a3a,
  slate: 0x4e5661,
  lacquer: 0x8a3a2e,
  canvas: 0xd8cdb2,

  iron: 0x9aa2ad,
  steel: 0xc8d0da,
  darkIron: 0x5a6068,
  gold: 0xd4af37,
  copper: 0xa9673a,
  jade: 0x5fa88a,

  cloth: 0x8a7a5a,
  clothDark: 0x5c5039,
  leather: 0x6b4a2a,
  skin: 0xd9a066,
  hair: 0x3c2b1c,
  hide: 0x7a5230,

  foliage: 0x5f8a3d,
  crop: 0xc8b053,
  dirt: 0x7d6247,
  rope: 0xb9a071,

  ember: 0xff8a3c,

  // Overwritten per player / per faction before use.
  team: 0x3366cc,
  accent: 0xd4af37,
};

/**
 * Per-faction overrides. This table carries most of the visual identity: the
 * same blueprint compiled against a different palette already reads as a
 * different culture before a single shape changes.
 */
export const FACTION_PALETTE: Record<ArtFactionId, Partial<Record<Slot, number>>> = {
  european: {
    stone: 0x9a958c, // cool grey ashlar
    stoneDark: 0x6d6963,
    stoneTrim: 0xbdb7ab,
    wood: 0x8a6a3a,
    timber: 0x4f3a20, // dark exposed half-timber framing
    plaster: 0xe6dfcd,
    tileRoof: 0x9a4a3a, // red clay tile
    slate: 0x49515c,
    accent: 0xd4af37, // gold
  },
  asian: {
    stone: 0xcfc6ae, // pale rendered plinths
    stoneDark: 0x8e8674,
    plaster: 0xefe6d2,
    wood: 0x7a4632,
    woodDark: 0x4a2a1e,
    timber: 0x6b3226,
    lacquer: 0x9c3a2c, // red lacquer posts and beams
    tileRoof: 0x3f4a55, // dark glazed tile
    accent: 0x7ec8a9, // jade
    jade: 0x5fa88a,
  },
  african: {
    stone: 0xb08350, // ochre mudbrick reads as the "stone" of this culture
    stoneDark: 0x8a6238,
    mudbrick: 0xb0834f,
    plaster: 0xd9b98a,
    wood: 0x9a6a3a,
    woodDark: 0x5f3f22,
    // Thatch has to sit well clear of the mudbrick in value, or the whole
    // faction collapses into one flat ochre mass with no readable roofline.
    thatch: 0x7a5426,
    tileRoof: 0x7a5426,
    accent: 0x8a4b26, // burnt umber
  },
  middleEastern: {
    stone: 0xd8c9a0, // sandstone
    stoneDark: 0xac9a72,
    sandstone: 0xdccfa8,
    plaster: 0xeee2c4,
    wood: 0x8a6a46,
    tileRoof: 0xdccfa8, // flat roofs: same material as the walls
    jade: 0x2e8a8a, // turquoise tilework
    accent: 0xe8d9b0, // ivory
  },
  neutral: {},
};

/** Resolve the full palette for a faction. Cached — this runs per mesh build. */
const resolved = new Map<ArtFactionId, Readonly<Record<Slot, number>>>();

export function paletteFor(faction: ArtFactionId): Readonly<Record<Slot, number>> {
  let p = resolved.get(faction);
  if (!p) {
    p = { ...BASE_PALETTE, ...FACTION_PALETTE[faction] };
    resolved.set(faction, p);
  }
  return p;
}

/** Map a sim faction id (which includes 'neutral') onto an art faction. */
export function artFaction(faction: string | undefined): ArtFactionId {
  switch (faction) {
    case 'european':
    case 'asian':
    case 'african':
    case 'middleEastern':
      return faction;
    default:
      return 'neutral';
  }
}
