/**
 * ProtoMech AI Behavior Helpers
 *
 * Policy helpers for the bot controller:
 *   - Prefer flanking routes (task 10.1).
 *   - Keep protos at medium range to avoid mech punch counterattack (task 10.2).
 *   - Retreat below 50% armor remaining (task 10.3).
 *
 * Pure functions — no direct coupling to the GameEngine. The bot AI layer
 * calls these when scoring candidate moves / attacks.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §10
 */

import type { IProtoMechCombatState } from './state';

// =============================================================================
// Range policy
// =============================================================================

/**
 * Preferred range band for a proto. "Medium" = 7–12 hexes. This keeps the
 * proto outside of mech punch range (usually 1 hex) and short-range laser
 * fire sweet spots while still being able to hit with Clan LB-X or ER lasers.
 */
export const PROTO_PREFERRED_RANGE_MIN = 7;
export const PROTO_PREFERRED_RANGE_MAX = 12;

/**
 * Return a hex-distance score for the given candidate range — higher is
 * better. Distances inside the preferred band score 1.0; distances outside
 * decay linearly toward 0 at either extreme.
 */
export function protoRangeScore(distance: number): number {
  if (
    distance >= PROTO_PREFERRED_RANGE_MIN &&
    distance <= PROTO_PREFERRED_RANGE_MAX
  ) {
    return 1.0;
  }
  if (distance < PROTO_PREFERRED_RANGE_MIN) {
    // 1 hex away = 0.1, approaching 1.0 as we reach the min.
    const gap = PROTO_PREFERRED_RANGE_MIN - distance;
    return Math.max(0, 1 - gap * 0.15);
  }
  // Past max — decay toward 0 at 20 hexes.
  const over = distance - PROTO_PREFERRED_RANGE_MAX;
  return Math.max(0, 1 - over * 0.12);
}

// =============================================================================
// Armor threshold policy
// =============================================================================

/**
 * Armor fraction below which the bot should retreat the proto (task 10.3).
 * 0.5 = 50% of starting total armor.
 */
export const PROTO_RETREAT_ARMOR_FRACTION = 0.5;

/**
 * Sum all armor values in a `Partial<Record<ProtoLocation, number>>`.
 */
export function sumProtoArmor(
  bag: IProtoMechCombatState['armorByLocation'],
): number {
  let total = 0;
  for (const v of Object.values(bag)) {
    total += v ?? 0;
  }
  return total;
}

/**
 * True when the proto should be retreated by the bot controller. Requires
 * the starting-total-armor value so we can compare to a fraction.
 */
export function protoShouldRetreat(
  state: IProtoMechCombatState,
  startingTotalArmor: number,
): boolean {
  if (startingTotalArmor <= 0) return false;
  const remaining = sumProtoArmor(state.armorByLocation);
  return remaining <= startingTotalArmor * PROTO_RETREAT_ARMOR_FRACTION;
}

// =============================================================================
// Flanker preference
// =============================================================================

/**
 * Tag applied to moves the bot should prefer for proto units. Callers
 * interpret this as "score this candidate move higher" when path-finding.
 */
export type ProtoMoveTag = 'flank' | 'retreat' | 'engage' | 'none';

/**
 * Classify a candidate move for a proto unit. Parameters are intentionally
 * scalar — the bot passes in pre-computed distances / armor values so the
 * helper stays pure + cheap.
 */
export function classifyProtoMove(params: {
  readonly distanceToEnemy: number;
  readonly startingTotalArmor: number;
  readonly currentTotalArmor: number;
  readonly flankingScore: number; // 0..1, from the bot's flanking heuristic
}): ProtoMoveTag {
  const armorFraction =
    params.startingTotalArmor > 0
      ? params.currentTotalArmor / params.startingTotalArmor
      : 1;

  if (armorFraction <= PROTO_RETREAT_ARMOR_FRACTION) return 'retreat';

  if (params.flankingScore >= 0.6) return 'flank';

  if (
    params.distanceToEnemy >= PROTO_PREFERRED_RANGE_MIN &&
    params.distanceToEnemy <= PROTO_PREFERRED_RANGE_MAX
  ) {
    return 'engage';
  }

  return 'none';
}
