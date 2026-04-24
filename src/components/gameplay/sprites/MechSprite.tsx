/**
 * MechSprite — renders a homemade mech silhouette for a unit token.
 *
 * Responsibilities (per tasks 3, 4, 7, 8 of add-mech-silhouette-sprite-set):
 *   - Resolve the correct archetype × weight silhouette from `spriteCatalog`
 *   - Apply a side-derived tint via CSS `color` (silhouettes fill with
 *     `currentColor`)
 *   - Rotate the sprite by `facing * 60deg` about its center
 *   - Smoothly animate facing changes over 150ms ease-out, snapping instantly
 *     when `prefers-reduced-motion` (OS) or the AccessibilityStore opts in
 *   - Render a selection ring when the unit is selected
 *   - Collapse to a tiny archetype glyph below zoom 0.6 so the hex stays
 *     legible (pip ring is hidden by `ArmorPipRing` at the same threshold)
 *   - Overlay a colorblind-safe shape marker (circle/triangle/square) keyed
 *     by side so adjacent opponents are distinguishable without color
 *
 * Shape of rendered output: this component emits SVG children (a `<g>` with
 * the silhouette plus optional selection ring and shape overlay). It is
 * meant to be composed inside the parent hex-cell `<g transform="translate"/>`
 * just like the original `MechToken`.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Homemade Silhouette Sprite Catalog
 *        §Built-in Facing Indicator
 *        §Sprite Scaling
 *        §Side Tint and Selection Ring
 */

import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import {
  ARCHETYPE_GLYPHS,
  SPRITE_ANCHOR_X,
  SPRITE_ANCHOR_Y,
  SPRITE_VIEWBOX_SIZE,
  getSpriteSvg,
} from '@/components/gameplay/sprites/spriteCatalog';
import { HEX_SIZE } from '@/constants/hexMap';
import { useAccessibilityStore } from '@/stores/useAccessibilityStore';
import { Facing, GameSide } from '@/types/gameplay';
import { selectSprite } from '@/utils/sprites/spriteSelector';

// =============================================================================
// Constants
// =============================================================================

/**
 * Rendered sprite diameter at zoom 1.0 — 80% of hex diameter per spec
 * Scenario "Default scale".
 *
 * @why `HEX_SIZE` is a flat-top radius; diameter = 2 × radius. 80% of that
 *      lands the sprite inside the hex with visible margin for the pip ring
 *      and the selection halo.
 */
const SPRITE_DIAMETER = HEX_SIZE * 2 * 0.8;

/**
 * Threshold below which the full silhouette is replaced by the archetype
 * glyph. Matches the pip ring's simplification threshold, so both visual
 * layers transition together.
 */
const LOW_ZOOM_GLYPH_THRESHOLD = 0.6;

/**
 * Ring radius when the sprite is selected. A bit larger than the sprite
 * half-diameter so the ring sits clear of the silhouette's outline.
 */
const SELECTION_RING_RADIUS = SPRITE_DIAMETER * 0.62;

/** Shape-overlay marker size (diameter in SVG user units). */
const SHAPE_OVERLAY_SIZE = 10;

/**
 * Side → tint color. Tinted via CSS `color` → `currentColor` fills in SVG.
 * Matches HEX_COLORS but kept local so the sprite palette can diverge
 * from the original flat-disc marker palette without forcing other callers
 * to re-theme.
 *
 * @why The game currently only models two sides (Player, Opponent) via the
 *      `GameSide` enum. The spec references a "Neutral" tint for future-
 *      neutral chassis, so we expose a grey fallback (`NEUTRAL_TINT`) that
 *      callers can pass via `tintOverride` when a unit is not on either
 *      side of the active engagement (e.g. eject pilots, turrets).
 */
const SIDE_TINT: Record<GameSide, string> = {
  [GameSide.Player]: '#3b82f6', // blue
  [GameSide.Opponent]: '#ef4444', // red
};

/** Grey fallback exposed for callers that need a "neutral" tint. */
export const NEUTRAL_TINT = '#9ca3af';

// =============================================================================
// Facing helpers
// =============================================================================

/**
 * Map the `Facing` enum to rotation degrees (0/60/120/180/240/300).
 * Kept local to avoid pulling in `renderHelpers` — this function is pure
 * and trivial and we want `MechSprite` to have zero hex-math dependency.
 */
function facingToDegrees(facing: Facing): number {
  switch (facing) {
    case Facing.North:
      return 0;
    case Facing.Northeast:
      return 60;
    case Facing.Southeast:
      return 120;
    case Facing.South:
      return 180;
    case Facing.Southwest:
      return 240;
    case Facing.Northwest:
      return 300;
    default:
      return 0;
  }
}

// =============================================================================
// Side shape overlay (colorblind safety)
// =============================================================================

interface SideShapeProps {
  readonly side: GameSide;
  readonly tint: string;
}

/**
 * Colorblind-safe shape overlay. Small marker drawn at the top of the
 * sprite — triangle for Player, square for Opponent, circle for Neutral.
 * Combined with the facing notch this gives two independent shape cues.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Side Tint and Selection Ring → Scenario: Colorblind-safe distinction
 */
function SideShape({ side, tint }: SideShapeProps): React.ReactElement | null {
  // Place the shape above the sprite center (just above the sprite)
  const cy = -SPRITE_DIAMETER * 0.46;
  const commonProps = {
    fill: tint,
    stroke: '#0f172a',
    strokeWidth: 1,
    'data-testid': `sprite-side-shape-${side}`,
    'aria-hidden': true,
    pointerEvents: 'none' as const,
  };
  switch (side) {
    case GameSide.Player:
      // Upward triangle
      return (
        <polygon
          points={`0,${cy - SHAPE_OVERLAY_SIZE / 2} ${SHAPE_OVERLAY_SIZE / 2},${cy + SHAPE_OVERLAY_SIZE / 2} ${-SHAPE_OVERLAY_SIZE / 2},${cy + SHAPE_OVERLAY_SIZE / 2}`}
          {...commonProps}
        />
      );
    case GameSide.Opponent:
      // Square
      return (
        <rect
          x={-SHAPE_OVERLAY_SIZE / 2}
          y={cy - SHAPE_OVERLAY_SIZE / 2}
          width={SHAPE_OVERLAY_SIZE}
          height={SHAPE_OVERLAY_SIZE}
          {...commonProps}
        />
      );
    default:
      // Any future side falls back to a neutral circle.
      return (
        <circle cx={0} cy={cy} r={SHAPE_OVERLAY_SIZE / 2} {...commonProps} />
      );
  }
}

// =============================================================================
// Reduced-motion detection
// =============================================================================

/**
 * Return true when the user has explicitly requested reduced motion, either
 * via the OS media query or the in-app accessibility store.
 *
 * @why Wrapped in a hook so the component re-renders when the setting flips
 *      at runtime (e.g. the user toggles it in AccessibilitySettings).
 */
function useReducedMotion(): boolean {
  const storeReduceMotion = useAccessibilityStore((s) => s.reduceMotion);
  const [mediaReduce, setMediaReduce] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent): void => setMediaReduce(e.matches);
    // `addEventListener` is the modern API; jsdom supports it.
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  return storeReduceMotion || mediaReduce;
}

// =============================================================================
// Component
// =============================================================================

export interface MechSpriteProps {
  /**
   * The token being rendered. `weightClass`, `chassisArchetype`, `isQuad`,
   * and `isLAM` feed the sprite selector; absent values default to
   * humanoid-medium.
   */
  readonly token: Pick<
    IUnitToken,
    | 'weightClass'
    | 'chassisArchetype'
    | 'isQuad'
    | 'isLAM'
    | 'facing'
    | 'side'
    | 'isDestroyed'
  >;
  /** Current map zoom level (1.0 = 100%). Drives low-zoom glyph collapse. */
  readonly zoom?: number;
  /** Whether the unit is currently selected — drives the ring. */
  readonly isSelected?: boolean;
  /**
   * Optional tint override. Normally the tint is derived from `token.side`;
   * callers may pass an explicit value for dead/destroyed/bot states.
   */
  readonly tintOverride?: string;
}

/**
 * Render a mech silhouette token with facing rotation, side tint, selection
 * ring, and low-zoom glyph collapse.
 *
 * Layout contract: emits an SVG fragment assuming the parent has already
 * translated to the hex center. All internal coordinates are viewBox-local
 * and centered at (0, 0).
 */
export const MechSprite = React.memo(function MechSprite({
  token,
  zoom = 1,
  isSelected = false,
  tintOverride,
}: MechSpriteProps): React.ReactElement {
  const bundle = selectSprite({
    weightClass: token.weightClass,
    chassisArchetype: token.chassisArchetype,
    isQuad: token.isQuad,
    isLAM: token.isLAM,
  });

  const rotationDeg = facingToDegrees(token.facing);
  const reducedMotion = useReducedMotion();

  // CSS transition — the <g> that holds the silhouette rotates; animation
  // is disabled when reduced motion is requested (spec scenario "Facing
  // change animates" + "prefers-reduced-motion users SHALL see an instant
  // snap").
  const rotateTransform = `rotate(${rotationDeg})`;
  const rotateStyle: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transition: reducedMotion ? 'none' : 'transform 150ms ease-out',
  };

  const tint =
    tintOverride ?? (token.isDestroyed ? '#6b7280' : SIDE_TINT[token.side]);

  const lowZoom = zoom < LOW_ZOOM_GLYPH_THRESHOLD;
  const glyphSvg = ARCHETYPE_GLYPHS[bundle.archetype];
  const fullSvg = getSpriteSvg(bundle.archetype, bundle.weight);

  // Render either the full silhouette or the tiny archetype glyph. In both
  // cases the outer transform handles position + facing rotation.
  const spriteBody = lowZoom ? (
    <g
      data-testid="mech-sprite-glyph"
      data-archetype={bundle.archetype}
      // Glyph is 24×24; scale it to ~50% of sprite diameter and center.
      transform={`translate(${-SPRITE_DIAMETER * 0.25}, ${-SPRITE_DIAMETER * 0.25}) scale(${SPRITE_DIAMETER * 0.5 * (1 / 24)})`}
      style={{ color: tint }}
      dangerouslySetInnerHTML={{ __html: stripOuterSvg(glyphSvg) }}
    />
  ) : (
    <g
      data-testid="mech-sprite-body"
      data-archetype={bundle.archetype}
      data-weight={bundle.weight}
      // Silhouettes live in a 200×200 viewBox with center at (100,100).
      // Translate so center is at (0,0), then scale to target diameter.
      transform={`translate(${-SPRITE_DIAMETER / 2}, ${-SPRITE_DIAMETER / 2}) scale(${SPRITE_DIAMETER / SPRITE_VIEWBOX_SIZE})`}
      style={{ color: tint }}
      dangerouslySetInnerHTML={{ __html: stripOuterSvg(fullSvg) }}
    />
  );

  return (
    <g
      data-testid="mech-sprite"
      data-sprite-id={bundle.spriteId}
      data-facing={token.facing}
      data-zoom-mode={lowZoom ? 'glyph' : 'full'}
    >
      {/* Selection ring — painted BEHIND the silhouette so it reads as a halo. */}
      {isSelected && (
        <circle
          data-testid="mech-sprite-selection-ring"
          r={SELECTION_RING_RADIUS}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
          pointerEvents="none"
          aria-hidden="true"
        />
      )}

      {/* Rotating silhouette group. Anchor is sprite center (0,0). */}
      <g
        data-testid="mech-sprite-rotator"
        data-rotation-deg={rotationDeg}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        transform={rotateTransform}
        style={rotateStyle}
      >
        {spriteBody}
      </g>

      {/* Colorblind-safe shape overlay. Lives ABOVE the rotator so it does
          NOT rotate with the sprite — it is a side cue, not a facing cue. */}
      <SideShape side={token.side} tint={tint} />
    </g>
  );
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the inner SVG markup from a top-level `<svg ...>...</svg>` string.
 *
 * @why We inject the silhouette geometry into an existing `<g>` inside a
 *      larger SVG scene. Keeping the outer `<svg>` tag would nest root
 *      namespaces; stripping it gives us just the children (polygons,
 *      rects, etc.) to embed cleanly.
 */
function stripOuterSvg(svg: string): string {
  const openEnd = svg.indexOf('>');
  const closeStart = svg.lastIndexOf('</svg>');
  if (openEnd < 0 || closeStart < 0) return svg;
  return svg.slice(openEnd + 1, closeStart);
}

// Reference the anchor constants so callers that destructure this file
// (e.g., snapshot generators) can verify the hex center alignment matches
// the catalog. Re-exports are avoided to keep the public API tight.
void SPRITE_ANCHOR_X;
void SPRITE_ANCHOR_Y;
