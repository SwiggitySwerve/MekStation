/**
 * Unit Sprite Types — shared types for the mech silhouette sprite system.
 *
 * Why a dedicated file: the sprite layer adds a few enums and a small set
 * of interfaces that are consumed by three different modules (the sprite
 * selector, the MechSprite component, and the armor-pip ring). Grouping
 * them here keeps `GameplayUIInterfaces.ts` from ballooning while still
 * re-exporting through `@/types/gameplay`.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 */

import { WeightClass } from '@/types/enums/WeightClass';

// =============================================================================
// Chassis archetype
// =============================================================================

/**
 * Three silhouette archetypes covered by the sprite set.
 *
 * Why a discriminated string literal (not a class hierarchy): we only ever
 * branch on this value in the selector and the pip-ring layout — an enum
 * plus `switch` is smaller and friendlier to exhaustiveness checking.
 *
 * - `humanoid` — standard biped BattleMech
 * - `quad`     — four-legged mech (no arm locations, two front + two rear legs)
 * - `lam`      — Land-Air 'Mech (humanoid on the ground, extends wings in air)
 */
export type ChassisArchetype = 'humanoid' | 'quad' | 'lam';

// =============================================================================
// Sprite-facing weight-class bucket
// =============================================================================

/**
 * Four weight buckets the sprite catalog ships silhouettes for.
 *
 * Why not reuse `WeightClass` directly: the game's `WeightClass` enum has
 * six values (Ultralight/Light/Medium/Heavy/Assault/Superheavy), but the
 * spec only demands four silhouettes. We collapse Ultralight → light and
 * Superheavy → assault at the selector boundary so the catalog stays small.
 */
export type SpriteWeightBucket = 'light' | 'medium' | 'heavy' | 'assault';

/**
 * Collapse the full `WeightClass` enum into the 4-bucket sprite space.
 *
 * @why Callers typically hold a `WeightClass` (from the unit's tonnage) —
 *      this keeps the downshift logic in one place.
 */
export function weightClassToBucket(
  weightClass: WeightClass | undefined,
): SpriteWeightBucket {
  switch (weightClass) {
    case WeightClass.ULTRALIGHT:
    case WeightClass.LIGHT:
      return 'light';
    case WeightClass.MEDIUM:
      return 'medium';
    case WeightClass.HEAVY:
      return 'heavy';
    case WeightClass.ASSAULT:
    case WeightClass.SUPERHEAVY:
      return 'assault';
    default:
      // Missing weightClass → default to medium (Scenario: Missing archetype
      // falls back to humanoid is for archetype; weight gets medium as the
      // neutral middle-of-the-road silhouette).
      return 'medium';
  }
}

// =============================================================================
// Armor-pip location state
// =============================================================================

/**
 * Per-location armor + structure state rendered by `ArmorPipRing`.
 *
 * Why five discrete states (not raw numbers): the pip ring only needs to
 * pick a color / pattern, not render exact pip counts. Discretising here
 * lets callers project arbitrary armor/structure math (or receive stub
 * data during development) without the ring re-implementing it.
 */
export type PipLocationState =
  | 'full' // armor ≥ max (no damage)
  | 'partial' // 0 < armor < max (some armor remains)
  | 'structure' // armor === 0, internal structure exposed
  | 'destroyed' // structure === 0, location lost
  | 'missing'; // location does not exist on this archetype

/**
 * Biped location keys — eight pip groups around the silhouette.
 * Matches standard BattleMech hit-location labels.
 */
export type BipedPipLocation =
  | 'head'
  | 'centerTorso'
  | 'leftTorso'
  | 'rightTorso'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

/**
 * Quad location keys — six pip groups (no arms, legs split front/rear).
 */
export type QuadPipLocation =
  | 'head'
  | 'centerTorso'
  | 'frontLeftLeg'
  | 'frontRightLeg'
  | 'rearLeftLeg'
  | 'rearRightLeg';

/**
 * Discriminated per-archetype armor state. Callers pass whichever shape
 * matches the unit; the ring switches on `archetype` to pick the layout.
 */
export type ArmorPipState =
  | {
      readonly archetype: 'humanoid';
      readonly locations: Record<BipedPipLocation, PipLocationState>;
    }
  | {
      readonly archetype: 'quad';
      readonly locations: Record<QuadPipLocation, PipLocationState>;
    }
  | {
      readonly archetype: 'lam';
      readonly locations: Record<BipedPipLocation, PipLocationState>;
    };

// =============================================================================
// Sprite metadata (returned by the selector)
// =============================================================================

/**
 * Resolved sprite bundle — the selector returns this so the renderer has
 * everything needed to paint without re-running selection logic.
 *
 * - `assetUrl`   — path under `public/sprites/mechs/` (satisfies the
 *                  "file SHALL live under public/sprites/mechs" scenario).
 * - `viewBox`    — source SVG viewBox string (e.g. "0 0 200 200").
 * - `anchor`     — center-of-mass offset in viewBox units (for precise hex
 *                  centering; most sprites anchor at 100,100).
 * - `weight`     — resolved bucket.
 * - `archetype`  — resolved archetype.
 * - `spriteId`   — stable id, e.g. `humanoid-heavy`.
 */
export interface ISpriteBundle {
  readonly spriteId: string;
  readonly assetUrl: string;
  readonly viewBox: string;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly weight: SpriteWeightBucket;
  readonly archetype: ChassisArchetype;
}
