/**
 * Firing Arc Calculation — attack-path entry point.
 *
 * This module is the CANONICAL entry point for the attack-resolution path.
 * Callers that are resolving an attack (to-hit, hit location, arc on event
 * payloads) SHALL import `calculateFiringArc` from here and SHALL NOT call
 * `determineArc` from `./firingArcs` directly.
 *
 * Layering (do not merge these two files — they are layered, not duplicates):
 *   - `firingArc.ts`  (this file, singular): attack-path API.
 *     Handles same-hex + torso-twist shortcuts, returns a `FiringArc`.
 *   - `firingArcs.ts` (plural): low-level geometry + arc utilities
 *     (`determineArc`, `canFireFromArc`, `getArcHitModifier`,
 *     `targetsRearArmor`, `getArcHexes`, `getFront/RearArcDirections`, ...).
 *
 * Arc-boundary convention (decided + documented in `determineArc` — repeated
 * here for callers): front arc wins at the front/side boundary (±60°); rear
 * arc wins at the rear/side boundary (±120°). This is deterministic — the
 * same `(attackerPos, targetPos, targetFacing)` triple always returns the
 * same `FiringArc`. See `firingArcs.ts: determineArc` for the boundary math.
 *
 * @spec openspec/changes/wire-firing-arc-resolution/specs/firing-arc-calculation/spec.md
 * @spec openspec/changes/archive/2026-02-12-full-combat-parity/specs/firing-arc-calculation/spec.md
 */

import { IHexCoordinate, Facing, FiringArc } from '@/types/gameplay';

import { determineArc } from './firingArcs';

// =============================================================================
// Core Firing Arc Calculation
// =============================================================================

/**
 * Which arc the attacker is in relative to the target's facing.
 * Selects the correct hit location table column (front/left/right/rear).
 */
export function calculateFiringArc(
  attackerPos: IHexCoordinate,
  targetPos: IHexCoordinate,
  targetFacing: Facing,
  torsoTwist?: 'left' | 'right',
): FiringArc {
  const targetAsUnit = {
    unitId: '_target',
    coord: targetPos,
    facing: torsoTwist
      ? getTwistedFacing(targetFacing, torsoTwist)
      : targetFacing,
    prone: false,
  };

  return determineArc(targetAsUnit, attackerPos).arc;
}

// =============================================================================
// Torso Twist Support
// =============================================================================

/**
 * Effective facing when torso twist is applied.
 * Shifts center of front arc by 1 hex-side (60°) in twist direction.
 */
export function getTwistedFacing(
  facing: Facing,
  twist: 'left' | 'right',
): Facing {
  // Left: +1 (clockwise), Right: -1 (counter-clockwise) mod 6
  return twist === 'left'
    ? (((facing + 1) % 6) as Facing)
    : (((facing - 1 + 6) % 6) as Facing);
}
