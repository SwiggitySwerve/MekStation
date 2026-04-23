/**
 * Retreat AI
 *
 * Pure helpers that decide when a bot-controlled unit should disengage
 * and which map edge to head toward. Both functions are deterministic
 * — no randomness — so identical states always yield identical retreat
 * decisions (per spec § 8.1).
 *
 * @spec openspec/changes/add-bot-retreat-behavior/tasks.md § 2, § 3
 */

import type { IHexCoordinate } from '@/types/gameplay';

import type { IAIUnitState, IBotBehavior, RetreatEdge } from './types';

/**
 * Concrete edge the unit moves toward, or `null` when retreat is
 * disabled (`retreatEdge === 'none'`).
 */
export type ConcreteRetreatEdge = 'north' | 'south' | 'east' | 'west' | null;

/**
 * Per task 2: returns true when either retreat trigger fires.
 *
 * Trigger A — structural integrity threshold: caller passes the
 * destruction ratio (0..1). The unit retreats when the ratio exceeds
 * `behavior.retreatThreshold`.
 *
 * Trigger B — through-armor critical on cockpit/gyro/engine: caller
 * passes a boolean indicating whether such a crit has been recorded
 * for this unit at any point in the match.
 *
 * `'none'` retreat edge suppresses ALL retreat behavior regardless of
 * triggers (per task 2.5).
 */
export function shouldRetreat(
  behavior: IBotBehavior,
  destructionRatio: number,
  hasCritOnVitalSystem: boolean,
): boolean {
  if (behavior.retreatEdge === 'none') return false;
  if (destructionRatio > behavior.retreatThreshold) return true;
  if (hasCritOnVitalSystem) return true;
  return false;
}

/**
 * Per task 3: pick the concrete edge to retreat toward. For explicit
 * edge names, returns that edge directly. For `'nearest'`, computes
 * the closest edge by axial distance to the unit's current hex; ties
 * resolve in the canonical order north → east → south → west. For
 * `'none'`, returns null.
 */
export function resolveEdge(
  behavior: IBotBehavior,
  position: IHexCoordinate,
  mapRadius: number,
): ConcreteRetreatEdge {
  if (behavior.retreatEdge === 'none') return null;
  if (behavior.retreatEdge !== 'nearest') {
    return behavior.retreatEdge as ConcreteRetreatEdge;
  }
  // Nearest: compute hex distance to each of the 4 edges.
  // North = max +r row, South = max -r row, East = max +q col, West = max -q col.
  // (Convention: positive r = south in the visual hex grid; positive q = east.)
  const dNorth = mapRadius - position.r; // distance to row r = +mapRadius
  const dSouth = position.r - -mapRadius;
  const dEast = mapRadius - position.q;
  const dWest = position.q - -mapRadius;

  // Find min and tie-break in canonical order.
  const candidates: { edge: ConcreteRetreatEdge; distance: number }[] = [
    { edge: 'north', distance: dNorth },
    { edge: 'east', distance: dEast },
    { edge: 'south', distance: dSouth },
    { edge: 'west', distance: dWest },
  ];
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].edge;
}

/**
 * Per task 4: scoring weight when a retreating unit evaluates a move.
 * Pure helper — caller composes with the rest of MoveAI's scoring.
 *
 * Returns 1000 × progress + facing bonus + jump penalty, where:
 * - progress = previousDistanceToEdge - newDistanceToEdge (positive
 *   when the move brings the unit closer to the retreat edge)
 * - facing bonus: +200 when `endingFacingTowardEdge` is true
 * - jump penalty: -50 when the move uses a jump movement type
 *
 * Caller must compute distance using a consistent metric (Chebyshev
 * for axial hexes is recommended per spec § 4.2).
 */
export function scoreRetreatMove(opts: {
  previousDistanceToEdge: number;
  newDistanceToEdge: number;
  endingFacingTowardEdge: boolean;
  isJumpMove: boolean;
}): number {
  const progress = opts.previousDistanceToEdge - opts.newDistanceToEdge;
  let score = progress * 1000;
  if (opts.endingFacingTowardEdge) score += 200;
  if (opts.isJumpMove) score -= 50;
  return score;
}

/**
 * Per task 6.1: when retreating, reduce the effective heat threshold
 * so the bot stops less often to fire. Floors at 0.
 */
export function effectiveSafeHeatThreshold(
  unit: IAIUnitState,
  behavior: IBotBehavior,
): number {
  // safeHeatThreshold was added in #315 (improve-bot-basic-combat-competence).
  // Optional read keeps this PR independent of the merge order — defaults
  // to 13 (the canonical +1 to-hit threshold) when missing.
  const baseline =
    (behavior as { safeHeatThreshold?: number }).safeHeatThreshold ?? 13;
  if (unit.isRetreating) {
    return Math.max(0, baseline - 2);
  }
  return baseline;
}

/**
 * Per task 5: pick the movement type for a retreating unit. Always
 * Run when available, Walk when Run is disabled (e.g., leg actuator
 * damage), never Jump.
 */
export function retreatMovementType(opts: {
  walkAvailable: boolean;
  runAvailable: boolean;
}): 'walk' | 'run' | 'stationary' {
  if (opts.runAvailable) return 'run';
  if (opts.walkAvailable) return 'walk';
  return 'stationary';
}

/**
 * Per `add-bot-retreat-behavior` § 7.2–7.3: test whether `position`
 * touches the specified map edge. Used after a retreating unit locks
 * in its movement to decide whether to emit `UnitRetreated`.
 *
 * A unit is considered to have reached its retreat edge when its axial
 * coordinate sits on the outermost row/column for that edge:
 *   - north: `r === +mapRadius`
 *   - south: `r === -mapRadius`
 *   - east:  `q === +mapRadius`
 *   - west:  `q === -mapRadius`
 *
 * Pure helper — same convention as `resolveEdge`. Returns false when
 * `edge` is null (safety guard for callers that didn't gate on the
 * latch).
 */
export function hasReachedEdge(
  position: IHexCoordinate,
  edge: ConcreteRetreatEdge,
  mapRadius: number,
): boolean {
  switch (edge) {
    case 'north':
      return position.r >= mapRadius;
    case 'south':
      return position.r <= -mapRadius;
    case 'east':
      return position.q >= mapRadius;
    case 'west':
      return position.q <= -mapRadius;
    case null:
    default:
      return false;
  }
}

/**
 * Re-export for downstream consumers using string-literal edges.
 */
export type { RetreatEdge };
