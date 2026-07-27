import type { ArtFactionId, Slot } from './palette';
import { paletteFor } from './palette';

/**
 * Roof shapes. The single strongest cultural signal at RTS camera distance —
 * you read a roofline long before you read a wall texture.
 */
export type RoofKind =
  | 'gable' // steep pitched ridge — European
  | 'hip'
  | 'pagoda' // wide upswept eaves, optionally tiered — Asian
  | 'thatchCone' // tall cone on a round plan — African
  | 'flatParapet' // flat roof with a crenellated coping — Middle Eastern
  | 'dome'
  | 'lean' // single-pitch shed roof, used by work camps everywhere
  | 'spire';

/** Cap on top of a tower. */
export type TowerCap = 'spire' | 'pagodaCap' | 'onionDome' | 'thatchCone' | 'crenellated' | 'flat';

/** Wall treatment. Drives both the material slot and whether walls taper. */
export type WallKind = 'stoneBlock' | 'halfTimber' | 'mudbrick' | 'plankWood' | 'bamboo' | 'plaster' | 'sandstone';

/** Plan shape — round-plan buildings read completely differently in silhouette. */
export type PlanKind = 'rect' | 'wideRect' | 'round' | 'rectArched';

export interface FactionStyle {
  id: ArtFactionId;
  palette: Readonly<Record<Slot, number>>;

  // --- Building grammar ---
  plan: PlanKind;
  wall: WallKind;
  /** Material slot the main mass is built from. */
  wallSlot: Slot;
  /** Material slot roofs use. */
  roofSlot: Slot;
  /** Trim / ornament slot. */
  trimSlot: Slot;
  /** Default roof for an ordinary hall or house. */
  roof: RoofKind;
  /** Roof for towers and keeps. */
  towerCap: TowerCap;
  /**
   * Roof for the keep's central hall. Separate from `roof` because a flat
   * parapet that works on an ordinary house turns the keep into a blank
   * courtyard — the dominant building needs a dominant shape.
   */
  keepRoof: RoofKind;
  /** 0 = flat, 1 = very steep. */
  roofPitch: number;
  /** How far eaves overhang the wall line, in world units. */
  eaves: number;
  /** Walls taper inward going up (mudbrick, sandstone). */
  battered: boolean;
  /** Signature ornament placed at the ridge or apex. */
  finial: 'cross' | 'ridgeOrnament' | 'gourd' | 'crescent' | 'none';

  // --- Unit grammar ---
  /** Headgear silhouette for rank-and-file and for elites. */
  helm: 'kettle' | 'cap' | 'bare' | 'conical';
  helmElite: 'great' | 'kabuto' | 'featherCrown' | 'turban';
  /** Shield shape. */
  shield: 'kite' | 'buckler' | 'hideOval' | 'round';
  /** 0 straight .. 0.4 heavily curved blade. */
  bladeCurve: number;
  /** Slot used for a unit's tunic/robe. */
  clothSlot: Slot;
}

const STYLES: Record<ArtFactionId, Omit<FactionStyle, 'palette'>> = {
  european: {
    id: 'european',
    plan: 'rect',
    wall: 'stoneBlock',
    wallSlot: 'stone',
    roofSlot: 'tileRoof',
    trimSlot: 'timber',
    roof: 'gable',
    towerCap: 'spire',
    keepRoof: 'gable',
    roofPitch: 0.85,
    eaves: 0.08,
    battered: false,
    finial: 'cross',
    helm: 'kettle',
    helmElite: 'great',
    shield: 'kite',
    bladeCurve: 0,
    clothSlot: 'cloth',
  },
  asian: {
    id: 'asian',
    // Low and long: the horizontal, layered silhouette is the whole read.
    plan: 'wideRect',
    wall: 'plaster',
    wallSlot: 'plaster',
    roofSlot: 'tileRoof',
    trimSlot: 'lacquer',
    roof: 'pagoda',
    towerCap: 'pagodaCap',
    keepRoof: 'pagoda',
    roofPitch: 0.32,
    eaves: 0.2,
    battered: false,
    finial: 'ridgeOrnament',
    helm: 'cap',
    helmElite: 'kabuto',
    shield: 'buckler',
    bladeCurve: 0.15,
    clothSlot: 'cloth',
  },
  african: {
    // Round plans and tall thatch cones — organic where the others are angular.
    id: 'african',
    plan: 'round',
    wall: 'mudbrick',
    wallSlot: 'mudbrick',
    roofSlot: 'thatch',
    trimSlot: 'wood',
    roof: 'thatchCone',
    towerCap: 'thatchCone',
    keepRoof: 'thatchCone',
    roofPitch: 0.95,
    eaves: 0.22,
    battered: true,
    finial: 'gourd',
    helm: 'bare',
    helmElite: 'featherCrown',
    shield: 'hideOval',
    bladeCurve: 0.1,
    clothSlot: 'cloth',
  },
  middleEastern: {
    // Cubic masses and flat parapets, punctuated by domes.
    id: 'middleEastern',
    plan: 'rectArched',
    wall: 'sandstone',
    wallSlot: 'sandstone',
    roofSlot: 'sandstone',
    trimSlot: 'jade',
    roof: 'flatParapet',
    towerCap: 'onionDome',
    keepRoof: 'dome',
    roofPitch: 0.08,
    eaves: 0.05,
    battered: true,
    finial: 'crescent',
    helm: 'conical',
    helmElite: 'turban',
    shield: 'round',
    bladeCurve: 0.35,
    clothSlot: 'cloth',
  },
  neutral: {
    id: 'neutral',
    plan: 'rect',
    wall: 'plankWood',
    wallSlot: 'wood',
    roofSlot: 'thatch',
    trimSlot: 'woodDark',
    roof: 'gable',
    towerCap: 'crenellated',
    keepRoof: 'gable',
    roofPitch: 0.7,
    eaves: 0.12,
    battered: false,
    finial: 'none',
    helm: 'cap',
    helmElite: 'great',
    shield: 'round',
    bladeCurve: 0.05,
    clothSlot: 'cloth',
  },
};

const cache = new Map<ArtFactionId, FactionStyle>();

export function styleFor(faction: ArtFactionId): FactionStyle {
  let s = cache.get(faction);
  if (!s) {
    s = { ...STYLES[faction], palette: paletteFor(faction) };
    cache.set(faction, s);
  }
  return s;
}

export const ART_FACTIONS: ArtFactionId[] = ['european', 'asian', 'african', 'middleEastern', 'neutral'];
