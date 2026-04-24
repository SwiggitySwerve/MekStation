/**
 * ArmorPipRing — renders the 6/8 armor-pip dots around a mech sprite.
 *
 * Layout choice by archetype:
 *   - humanoid / lam: 8 pip groups → Head, CT, LT, RT, LA, RA, LL, RL
 *     arranged clockwise from 12 o'clock (head) around the silhouette.
 *   - quad:           6 pip groups → Head, CT, Front-Left, Front-Right,
 *                      Rear-Left, Rear-Right.
 *
 * Each pip group is ONE dot; state controls fill/outline/pattern. This
 * keeps the ring legible at 80% hex diameter (~64px total) where 3 sub-
 * pips per location would smear into a blur.
 *
 * Colorblind rule: `structure` state adds a diagonal stripe pattern so
 * it is distinguishable from `partial` (yellow) by shape as well as hue,
 * matching the accessibility requirement.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Armor Pip Damage Overlay
 */

import React from 'react';

import type {
  ArmorPipState,
  BipedPipLocation,
  PipLocationState,
  QuadPipLocation,
} from '@/types/gameplay';

// =============================================================================
// Geometry — pip positions (in viewBox units, centered on sprite)
// =============================================================================

/**
 * Radius of the pip ring in sprite-viewBox units (viewBox = 200).
 * @why 108 sits just outside the 200×200 silhouette, which is already padded
 *      inward to ~180 max extent — gives clean separation from the body.
 */
const RING_RADIUS = 108;

/** Pip dot radius — two-ish pixels at hex scale, readable at zoom 1.0. */
const PIP_RADIUS = 7;

/**
 * Biped pip positions around the silhouette. Clock-face layout starting at
 * 12 o'clock (head) and marching clockwise. Coordinates are viewBox-centered:
 * (0,0) is the sprite center; the enclosing <g> translates by +100,+100.
 */
const BIPED_POSITIONS: Readonly<
  Record<BipedPipLocation, { x: number; y: number }>
> = {
  head: { x: 0, y: -RING_RADIUS }, // 12
  rightArm: { x: RING_RADIUS * 0.72, y: -RING_RADIUS * 0.66 }, // 1-2
  rightTorso: { x: RING_RADIUS * 0.95, y: 0 }, // 3
  rightLeg: { x: RING_RADIUS * 0.72, y: RING_RADIUS * 0.66 }, // 4-5
  centerTorso: { x: 0, y: RING_RADIUS }, // 6
  leftLeg: { x: -RING_RADIUS * 0.72, y: RING_RADIUS * 0.66 }, // 7-8
  leftTorso: { x: -RING_RADIUS * 0.95, y: 0 }, // 9
  leftArm: { x: -RING_RADIUS * 0.72, y: -RING_RADIUS * 0.66 }, // 10-11
};

/**
 * Quad pip positions. Head at 12, CT at 6, four legs at the cardinal-ish
 * corners (front pair near 2/10, rear pair near 4/8).
 */
const QUAD_POSITIONS: Readonly<
  Record<QuadPipLocation, { x: number; y: number }>
> = {
  head: { x: 0, y: -RING_RADIUS }, // 12
  frontRightLeg: { x: RING_RADIUS * 0.85, y: -RING_RADIUS * 0.4 }, // 2
  rearRightLeg: { x: RING_RADIUS * 0.85, y: RING_RADIUS * 0.4 }, // 4
  centerTorso: { x: 0, y: RING_RADIUS }, // 6
  rearLeftLeg: { x: -RING_RADIUS * 0.85, y: RING_RADIUS * 0.4 }, // 8
  frontLeftLeg: { x: -RING_RADIUS * 0.85, y: -RING_RADIUS * 0.4 }, // 10
};

// =============================================================================
// State → visual mapping
// =============================================================================

/**
 * Pip fill color by state. Colors are accessibility-considered:
 *   full      → green  (damage-free)
 *   partial   → yellow (armor breached but holding)
 *   structure → orange (internals exposed)
 *   destroyed → red outline only, no fill
 *   missing   → not rendered
 *
 * Colors intentionally chosen for contrast against a grey-tinted sprite
 * background; the stripe pattern on `structure` adds a shape cue.
 */
const PIP_FILL: Record<
  Exclude<PipLocationState, 'destroyed' | 'missing'>,
  string
> = {
  full: '#16a34a',
  partial: '#facc15',
  structure: '#f97316',
};

/**
 * Shared stable ID for the stripe pattern. We expose it as a function so
 * callers with multiple rings on the same map each get a uniquely-scoped
 * pattern and SVG <defs> stacking never collides.
 */
function stripePatternId(keySuffix: string): string {
  return `armor-pip-stripe-${keySuffix}`;
}

// =============================================================================
// Component
// =============================================================================

export interface ArmorPipRingProps {
  /**
   * Per-location armor state for this unit. When omitted the ring assumes
   * every location is `full` — useful before the gameplay store wires
   * real armor projection in.
   */
  readonly state?: ArmorPipState;
  /**
   * Current map zoom level. Below 0.6 the ring simplifies (still shows a
   * single dot per location but suppresses stripes). Below 0.35 the ring
   * is hidden entirely (too small to read).
   */
  readonly zoom?: number;
  /**
   * Unique suffix for the SVG pattern def — typically the unit id. Keeps
   * multiple rings on the same map from stomping each other's <pattern>.
   */
  readonly patternKey: string;
}

/**
 * Render a ring of small pip dots, one per hit location.
 *
 * Returns `null` when `zoom < 0.35` — the ring is too small to read, and
 * the spec says "ring rendering SHALL be suppressed entirely below zoom
 * 0.35x".
 */
export const ArmorPipRing = React.memo(function ArmorPipRing({
  state,
  zoom = 1,
  patternKey,
}: ArmorPipRingProps): React.ReactElement | null {
  if (zoom < 0.35) return null;

  // Low-zoom simplification: hide the stripe pattern since it won't read.
  // We still render the dots themselves per spec "each location SHALL
  // collapse to a single aggregate dot" — our layout is already one dot
  // per location, so the only simplification is dropping the stripe.
  const simplified = zoom < 0.6;

  const locations = resolveLocations(state);
  const stripeId = stripePatternId(patternKey);

  return (
    <g data-testid="armor-pip-ring" aria-hidden="true" pointerEvents="none">
      {/* <defs> scope is local to this <g> — pattern fill resolves via url(#id). */}
      {!simplified && (
        <defs>
          <pattern
            id={stripeId}
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" fill={PIP_FILL.structure} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="#7c2d12"
              strokeWidth="2"
            />
          </pattern>
        </defs>
      )}

      {locations.map(({ name, pos, pipState }) => (
        <PipDot
          key={name}
          cx={pos.x}
          cy={pos.y}
          state={pipState}
          stripeId={stripeId}
          simplified={simplified}
        />
      ))}
    </g>
  );
});

// =============================================================================
// Internals — location resolution + single pip primitive
// =============================================================================

interface ResolvedPip {
  readonly name: string;
  readonly pos: { x: number; y: number };
  readonly pipState: PipLocationState;
}

/**
 * Project the optional `ArmorPipState` into an ordered list of pips. When
 * no state is provided, every biped location renders as `full`.
 */
function resolveLocations(state: ArmorPipState | undefined): ResolvedPip[] {
  if (!state) {
    return Object.entries(BIPED_POSITIONS).map(([name, pos]) => ({
      name,
      pos,
      pipState: 'full' as const,
    }));
  }
  if (state.archetype === 'quad') {
    return Object.entries(QUAD_POSITIONS)
      .map(([name, pos]) => {
        const s = state.locations[name as QuadPipLocation];
        return { name, pos, pipState: s };
      })
      .filter((p) => p.pipState !== 'missing');
  }
  // humanoid + lam both use the biped layout.
  return Object.entries(BIPED_POSITIONS)
    .map(([name, pos]) => {
      const s = state.locations[name as BipedPipLocation];
      return { name, pos, pipState: s };
    })
    .filter((p) => p.pipState !== 'missing');
}

interface PipDotProps {
  readonly cx: number;
  readonly cy: number;
  readonly state: PipLocationState;
  readonly stripeId: string;
  readonly simplified: boolean;
}

/**
 * One pip dot. `destroyed` renders as an outline-only circle with a red
 * stroke — no fill — so the location reads as "gone" even at small sizes.
 */
function PipDot({
  cx,
  cy,
  state,
  stripeId,
  simplified,
}: PipDotProps): React.ReactElement | null {
  if (state === 'missing') return null;

  if (state === 'destroyed') {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={PIP_RADIUS}
        fill="none"
        stroke="#dc2626"
        strokeWidth={2.5}
        data-pip-state="destroyed"
      />
    );
  }

  // `structure` uses a stripe pattern for colorblind distinction — unless
  // we're in simplified (low-zoom) mode, where we just use the flat orange.
  const fill =
    state === 'structure' && !simplified
      ? `url(#${stripeId})`
      : PIP_FILL[state as 'full' | 'partial' | 'structure'];

  return (
    <circle
      cx={cx}
      cy={cy}
      r={PIP_RADIUS}
      fill={fill}
      stroke="#1e293b"
      strokeWidth={1}
      data-pip-state={state}
    />
  );
}
