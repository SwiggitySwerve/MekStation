/**
 * Sprite catalog — inline SVG strings for the 12 homemade mech silhouettes.
 *
 * Why inline (not <image href>): jsdom tests cannot load external SVGs, and
 * inline sprites let callers retint via `currentColor` + CSS filter without
 * an extra network round-trip. The file-based assets under
 * `public/sprites/mechs/*.svg` mirror these exactly and exist to satisfy
 * the spec's "file SHALL live under public/sprites/mechs/" scenario plus
 * any caller that prefers URL-based loading.
 *
 * Design notes:
 *   - viewBox is 200×200 for all sprites. Anchor is center (100,100).
 *   - Sprites face "north" (up) by default; the `MechSprite` component
 *     applies `rotate(facing*60)` about the center.
 *   - Every silhouette carries a `<polygon id="facing-notch">` at the top
 *     (north side) so the facing cue rotates with the sprite — no separate
 *     overlay.
 *   - Fills use `currentColor` so parent `color` CSS drives the tint. Side
 *     color is delivered via the wrapper's `color` style, not baked in.
 *   - Every silhouette is HOMEMADE — geometric primitives only (rect,
 *     polygon, circle, path). No reference to licensed BattleTech art.
 *   - Weight classes are expressed via chassis girth and head/torso bulk:
 *       light   — slim limbs, small head, narrow torso
 *       medium  — balanced proportions
 *       heavy   — broader torso, chunkier limbs, larger shoulders
 *       assault — widest silhouette, pauldron blocks, squared-off legs
 *   - Archetypes:
 *       humanoid — biped with two arms, two legs, centered head
 *       quad     — four legs (front/rear pairs), no arms, wider centered body
 *       lam      — humanoid plus symmetric wing stubs flanking the torso
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Homemade Silhouette Sprite Catalog
 */

import type { ChassisArchetype, SpriteWeightBucket } from '@/types/gameplay';

// =============================================================================
// Shared constants
// =============================================================================

/** Standard viewBox for every sprite. */
export const SPRITE_VIEWBOX = '0 0 200 200';
export const SPRITE_VIEWBOX_SIZE = 200;
export const SPRITE_ANCHOR_X = 100;
export const SPRITE_ANCHOR_Y = 100;

/**
 * Facing-notch polygon, drawn near the top of the viewBox. This exact
 * marker appears in every silhouette so test assertions can locate it by
 * `id="facing-notch"`.
 *
 * @why A 14×16 triangular notch sits well above the head even on the
 *      lightest silhouette, so rotating the sprite visually sells the
 *      unit's facing direction.
 */
const FACING_NOTCH = `<polygon id="facing-notch" points="100,10 92,28 108,28" fill="currentColor" stroke="black" stroke-width="1.5" />`;

// =============================================================================
// Humanoid (biped) silhouettes — light / medium / heavy / assault
// =============================================================================

const HUMANOID_LIGHT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="humanoid" data-weight="light">
  ${FACING_NOTCH}
  <!-- head -->
  <rect x="90" y="28" width="20" height="18" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- narrow torso -->
  <rect x="82" y="48" width="36" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- slim arms -->
  <rect x="68" y="52" width="12" height="46" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="120" y="52" width="12" height="46" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- slim legs -->
  <rect x="84" y="102" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="102" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- feet -->
  <rect x="80" y="166" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="166" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const HUMANOID_MEDIUM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="humanoid" data-weight="medium">
  ${FACING_NOTCH}
  <!-- head -->
  <rect x="88" y="26" width="24" height="22" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- torso -->
  <rect x="76" y="50" width="48" height="56" rx="5" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- arms -->
  <rect x="58" y="54" width="16" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="126" y="54" width="16" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- legs -->
  <rect x="80" y="108" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="108" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- feet -->
  <rect x="74" y="172" width="28" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="172" width="28" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const HUMANOID_HEAVY = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="humanoid" data-weight="heavy">
  ${FACING_NOTCH}
  <!-- head -->
  <rect x="86" y="26" width="28" height="22" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- pauldrons (big shoulders) -->
  <polygon points="54,62 80,50 80,78 54,82" fill="currentColor" stroke="black" stroke-width="1.5" />
  <polygon points="146,62 120,50 120,78 146,82" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- broad torso -->
  <rect x="70" y="50" width="60" height="58" rx="6" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- chunky arms -->
  <rect x="54" y="62" width="18" height="50" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="128" y="62" width="18" height="50" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- legs -->
  <rect x="78" y="110" width="20" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="110" width="20" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- broad feet -->
  <rect x="70" y="170" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="170" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const HUMANOID_ASSAULT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="humanoid" data-weight="assault">
  ${FACING_NOTCH}
  <!-- head -->
  <rect x="84" y="24" width="32" height="24" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- big block pauldrons -->
  <rect x="46" y="52" width="28" height="34" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="126" y="52" width="28" height="34" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- massive torso -->
  <rect x="64" y="50" width="72" height="62" rx="6" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- arm stubs -->
  <rect x="46" y="86" width="22" height="38" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="132" y="86" width="22" height="38" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- thick legs -->
  <rect x="74" y="114" width="24" height="56" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="114" width="24" height="56" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- wide feet -->
  <rect x="66" y="170" width="36" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="170" width="36" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

// =============================================================================
// Quad silhouettes — light / medium / heavy / assault (no arms, 4 legs)
// =============================================================================

const QUAD_LIGHT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="quad" data-weight="light">
  ${FACING_NOTCH}
  <!-- small head -->
  <polygon points="90,32 110,32 100,46" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- narrow body -->
  <rect x="64" y="46" width="72" height="48" rx="6" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- front-left / front-right legs -->
  <rect x="54" y="88" width="14" height="56" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="132" y="88" width="14" height="56" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- rear-left / rear-right legs -->
  <rect x="72" y="94" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="114" y="94" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- feet -->
  <rect x="50" y="142" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="128" y="142" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="68" y="156" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="110" y="156" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const QUAD_MEDIUM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="quad" data-weight="medium">
  ${FACING_NOTCH}
  <polygon points="88,30 112,30 100,48" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="58" y="48" width="84" height="52" rx="8" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="48" y="94" width="18" height="58" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="134" y="94" width="18" height="58" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="68" y="100" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="114" y="100" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="42" y="150" width="26" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="132" y="150" width="26" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="62" y="162" width="26" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="112" y="162" width="26" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const QUAD_HEAVY = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="quad" data-weight="heavy">
  ${FACING_NOTCH}
  <polygon points="86,28 114,28 100,50" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="50" y="48" width="100" height="58" rx="8" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="40" y="96" width="22" height="62" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="138" y="96" width="22" height="62" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="64" y="104" width="22" height="66" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="114" y="104" width="22" height="66" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="34" y="156" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="134" y="156" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="58" y="168" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="110" y="168" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const QUAD_ASSAULT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="quad" data-weight="assault">
  ${FACING_NOTCH}
  <polygon points="84,26 116,26 100,52" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="44" y="48" width="112" height="64" rx="10" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- armored flank plates -->
  <rect x="40" y="62" width="14" height="44" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="146" y="62" width="14" height="44" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="34" y="102" width="26" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="140" y="102" width="26" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="62" y="108" width="26" height="66" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="112" y="108" width="26" height="66" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="28" y="160" width="38" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="134" y="160" width="38" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="56" y="172" width="38" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="106" y="172" width="38" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

// =============================================================================
// LAM silhouettes — humanoid + wing stubs
// =============================================================================

const LAM_LIGHT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="lam" data-weight="light">
  ${FACING_NOTCH}
  <!-- angled wing stubs -->
  <polygon points="40,70 82,60 82,96 40,90" fill="currentColor" stroke="black" stroke-width="1.5" />
  <polygon points="160,70 118,60 118,96 160,90" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- head -->
  <rect x="90" y="28" width="20" height="18" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- torso -->
  <rect x="82" y="48" width="36" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- arms -->
  <rect x="68" y="52" width="12" height="46" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="120" y="52" width="12" height="46" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <!-- legs -->
  <rect x="84" y="102" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="102" width="14" height="64" rx="3" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="80" y="166" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="166" width="22" height="8" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const LAM_MEDIUM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="lam" data-weight="medium">
  ${FACING_NOTCH}
  <polygon points="32,72 76,60 76,102 32,96" fill="currentColor" stroke="black" stroke-width="1.5" />
  <polygon points="168,72 124,60 124,102 168,96" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="88" y="26" width="24" height="22" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="76" y="50" width="48" height="56" rx="5" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="58" y="54" width="16" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="126" y="54" width="16" height="52" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="80" y="108" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="108" width="18" height="64" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="74" y="172" width="28" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="172" width="28" height="10" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const LAM_HEAVY = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="lam" data-weight="heavy">
  ${FACING_NOTCH}
  <polygon points="26,74 70,60 70,106 26,100" fill="currentColor" stroke="black" stroke-width="1.5" />
  <polygon points="174,74 130,60 130,106 174,100" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="86" y="26" width="28" height="22" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="70" y="50" width="60" height="58" rx="6" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="54" y="62" width="18" height="50" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="128" y="62" width="18" height="50" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="78" y="110" width="20" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="110" width="20" height="60" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="70" y="170" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="170" width="32" height="12" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

const LAM_ASSAULT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SPRITE_VIEWBOX}" data-archetype="lam" data-weight="assault">
  ${FACING_NOTCH}
  <polygon points="20,76 64,58 64,110 20,104" fill="currentColor" stroke="black" stroke-width="1.5" />
  <polygon points="180,76 136,58 136,110 180,104" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="84" y="24" width="32" height="24" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="64" y="50" width="72" height="62" rx="6" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="46" y="86" width="22" height="38" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="132" y="86" width="22" height="38" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="74" y="114" width="24" height="56" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="102" y="114" width="24" height="56" rx="4" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="66" y="170" width="36" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
  <rect x="98" y="170" width="36" height="14" rx="2" fill="currentColor" stroke="black" stroke-width="1.5" />
</svg>`.trim();

// =============================================================================
// Catalog map — (archetype, weight) -> inline SVG string
// =============================================================================

/**
 * All 12 homemade silhouettes, keyed by `${archetype}-${weight}`.
 *
 * @why One flat map keeps lookups O(1) and makes "every combo" test
 *      enumeration trivial — the test iterates catalog keys and asserts
 *      each one decodes to a valid bundle.
 */
export const SPRITE_CATALOG: Readonly<Record<string, string>> = {
  'humanoid-light': HUMANOID_LIGHT,
  'humanoid-medium': HUMANOID_MEDIUM,
  'humanoid-heavy': HUMANOID_HEAVY,
  'humanoid-assault': HUMANOID_ASSAULT,
  'quad-light': QUAD_LIGHT,
  'quad-medium': QUAD_MEDIUM,
  'quad-heavy': QUAD_HEAVY,
  'quad-assault': QUAD_ASSAULT,
  'lam-light': LAM_LIGHT,
  'lam-medium': LAM_MEDIUM,
  'lam-heavy': LAM_HEAVY,
  'lam-assault': LAM_ASSAULT,
};

/**
 * Compose the catalog key for a given archetype × weight combination.
 *
 * @why Having a single function for this guarantees the selector and the
 *      renderer agree on key formatting.
 */
export function spriteId(
  archetype: ChassisArchetype,
  weight: SpriteWeightBucket,
): string {
  return `${archetype}-${weight}`;
}

/**
 * Pull the raw inline SVG string for a given archetype × weight.
 *
 * @throws never — falls back to `humanoid-medium` if a key is missing, so
 *         the renderer never crashes on bad input.
 */
export function getSpriteSvg(
  archetype: ChassisArchetype,
  weight: SpriteWeightBucket,
): string {
  const id = spriteId(archetype, weight);
  return SPRITE_CATALOG[id] ?? SPRITE_CATALOG['humanoid-medium'];
}

/**
 * Tiny archetype glyph shown at low zoom. Three small SVG primitives,
 * each 24×24 with the side color applied via `currentColor`.
 *
 * @why Below zoom 0.6 the full silhouette is illegible — the glyph keeps
 *      archetype recognisable without stroke-width hacks.
 */
export const ARCHETYPE_GLYPHS: Readonly<Record<ChassisArchetype, string>> = {
  humanoid:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12,3 21,21 3,21" fill="currentColor" stroke="black" stroke-width="1" /></svg>',
  quad: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="currentColor" stroke="black" stroke-width="1" /></svg>',
  lam: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="currentColor" stroke="black" stroke-width="1" /></svg>',
};
