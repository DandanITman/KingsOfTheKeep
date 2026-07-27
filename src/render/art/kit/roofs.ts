import type { Slot } from '../palette';
import type { RoofKind, TowerCap } from '../factions';
import { at, type Node } from './node';
import { ball, crenellation, dome, post, prism, slab, spike } from './forms';

/**
 * Roofs, by cultural shape rather than by building. A blueprint asks for "a roof
 * this wide covering this mass"; the faction decides whether that is a steep
 * red gable, a tiered pagoda, a thatch cone or a flat parapet.
 */
export function roof(
  kind: RoofKind,
  o: {
    w: number;
    d: number;
    h: number;
    y: number;
    slot: Slot;
    trim: Slot;
    eaves?: number;
    tiers?: number;
  },
): Node[] {
  const eaves = o.eaves ?? 0.08;
  const w = o.w + eaves * 2;
  const d = o.d + eaves * 2;

  switch (kind) {
    case 'gable':
      return at(prism({ w, h: o.h, d, slot: o.slot }), { y: o.y });

    case 'hip': {
      // Pyramid with a slight ridge — reads as hipped without a lathe.
      const out = spike({ r: Math.max(w, d) * 0.62, h: o.h, sides: 4, slot: o.slot, ry: Math.PI / 4 });
      return at(out, { y: o.y + o.h / 2 });
    }

    case 'pagoda': {
      // Tiered, wide, upswept. The eave overhang is the whole read, so the
      // corner lift is exaggerated rather than subtle.
      const tiers = o.tiers ?? 2;
      const out: Node[] = [];
      for (let i = 0; i < tiers; i++) {
        const t = i / Math.max(1, tiers);
        const tw = w * (1 - t * 0.28);
        const td = d * (1 - t * 0.28);
        const th = o.h / tiers;
        const y = o.y + i * th * 0.92;
        // The slab is the tile field; the thin lip beneath it is the upsweep.
        out.push(...at(spike({ r: Math.max(tw, td) * 0.6, h: th, sides: 4, slot: o.slot, ry: Math.PI / 4 }), { y: y + th / 2 }));
        out.push(...at(slab({ w: tw * 1.06, h: 0.05, d: td * 1.06, slot: o.trim }), { y }));
      }
      return out;
    }

    case 'thatchCone':
      // Tall cone on a round plan — the African signature.
      return at(spike({ r: Math.max(w, d) * 0.62, h: o.h, sides: 9, slot: o.slot }), { y: o.y + o.h / 2 });

    case 'flatParapet': {
      // Flat deck plus a low crenellated coping.
      const out = at(slab({ w, h: 0.12, d, slot: o.slot }), { y: o.y + 0.06 });
      out.push(
        ...crenellation({
          halfW: w / 2 - 0.08,
          halfD: d / 2 - 0.08,
          y: o.y + 0.12,
          step: Math.max(0.28, w / 5),
          size: 0.16,
          slot: o.trim,
        }),
      );
      return out;
    }

    case 'dome':
      return at(dome({ r: Math.min(w, d) * 0.5, h: o.h, onion: 0.35, slot: o.slot }), { y: o.y });

    case 'lean': {
      // Single-pitch shed. Used by work camps in every faction — the tilt is
      // what stops a camp reading as a plain box.
      const out = slab({ w, h: 0.09, d: d * 1.08, slot: o.slot });
      return at(out, { y: o.y + o.h * 0.5, rx: -0.34 });
    }

    case 'spire':
      return at(spike({ r: Math.max(w, d) * 0.5, h: o.h, sides: 6, slot: o.slot }), { y: o.y + o.h / 2 });
  }
}

/** The cap on top of a tower or keep. */
export function towerCap(
  kind: TowerCap,
  o: { r: number; h: number; y: number; slot: Slot; trim: Slot },
): Node[] {
  switch (kind) {
    case 'spire':
      return at(spike({ r: o.r * 1.1, h: o.h, sides: 6, slot: o.slot }), { y: o.y + o.h / 2 });
    case 'pagodaCap':
      // Narrower than the wall it caps, or the tiers read as a mushroom.
      return roof('pagoda', { w: o.r * 1.7, d: o.r * 1.7, h: o.h, y: o.y, slot: o.slot, trim: o.trim, tiers: 2 });
    case 'onionDome':
      return at(dome({ r: o.r * 1.02, h: o.h, onion: 0.55, slot: o.slot }), { y: o.y });
    case 'thatchCone':
      return at(spike({ r: o.r * 1.2, h: o.h, sides: 9, slot: o.slot }), { y: o.y + o.h / 2 });
    case 'crenellated':
      return crenellation({
        halfW: o.r * 0.8,
        halfD: o.r * 0.8,
        y: o.y,
        step: Math.max(0.24, o.r * 0.6),
        size: 0.16,
        slot: o.slot,
      });
    case 'flat':
      return at(slab({ w: o.r * 2, h: 0.1, d: o.r * 2, slot: o.slot }), { y: o.y + 0.05 });
  }
}

/** The signature ornament at a roof apex. Small, but it is the faction's stamp. */
export function finial(
  kind: 'cross' | 'ridgeOrnament' | 'gourd' | 'crescent' | 'none',
  o: { y: number; slot: Slot; scale?: number },
): Node[] {
  const s = o.scale ?? 1;
  switch (kind) {
    case 'cross':
      return [
        ...at(slab({ w: 0.05 * s, h: 0.34 * s, d: 0.05 * s, slot: o.slot }), { y: o.y + 0.17 * s }),
        ...at(slab({ w: 0.2 * s, h: 0.05 * s, d: 0.05 * s, slot: o.slot }), { y: o.y + 0.25 * s }),
      ];
    case 'ridgeOrnament':
      // A pair of upturned ridge tips, the classic Asian roof terminal.
      return [
        ...at(spike({ r: 0.07 * s, h: 0.2 * s, sides: 4, slot: o.slot }), { y: o.y + 0.1 * s, x: -0.16 * s, rz: 0.5 }),
        ...at(spike({ r: 0.07 * s, h: 0.2 * s, sides: 4, slot: o.slot }), { y: o.y + 0.1 * s, x: 0.16 * s, rz: -0.5 }),
      ];
    case 'gourd':
      return [
        ...at(post({ r: 0.03 * s, h: 0.2 * s, slot: o.slot }), { y: o.y + 0.1 * s }),
        ...at(ball({ r: 0.1 * s, slot: o.slot }), { y: o.y + 0.26 * s }),
      ];
    case 'crescent':
      return [
        ...at(post({ r: 0.03 * s, h: 0.26 * s, slot: o.slot }), { y: o.y + 0.13 * s }),
        ...at(ball({ r: 0.09 * s, segments: 5, slot: o.slot }), { y: o.y + 0.32 * s }),
      ];
    case 'none':
      return [];
  }
}
