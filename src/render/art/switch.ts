/**
 * Which art system renders the world.
 *
 * The new procedural system is built alongside the old one rather than
 * replacing it in place, so the game stays playable through the migration and
 * the two can be compared side by side on the same save. Once the new system is
 * at parity this defaults to 'new' and the legacy path is deleted.
 *
 *   ?art=legacy   — the original procedural meshes
 *   ?art=new      — the src/render/art/ system (default)
 */
export type ArtMode = 'legacy' | 'new';

let cached: ArtMode | null = null;

export function artMode(): ArtMode {
  if (cached) return cached;
  let mode: ArtMode = 'new';
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('art');
    if (param === 'legacy' || param === 'new') {
      mode = param;
    } else {
      try {
        const stored = window.localStorage?.getItem('kotk_art');
        if (stored === 'legacy' || stored === 'new') mode = stored;
      } catch {
        // Private-mode storage denial: fall through to the default.
      }
    }
  }
  cached = mode;
  return mode;
}
