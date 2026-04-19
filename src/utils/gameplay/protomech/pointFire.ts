/**
 * ProtoMech Point-Level Fire
 *
 * 5-proto Clan Points may (optionally) fire as a coordinated squad:
 *   - A single attack pool covering all 5 protos is declared.
 *   - Total damage is computed per-proto then distributed across the point
 *     via a cluster-style roll (similar to LRM cluster hits).
 *   - Emits a single `ProtoPointAttack` event capturing the distribution.
 *
 * Point fire is OFF by default (per task 7.4). The caller is responsible for
 * checking a scenario flag before invoking these helpers — individual protos
 * fight on their own in the default MVP.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §7
 */

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { ProtoEvent, ProtoEventType } from './events';

// =============================================================================
// Cluster distribution table
// =============================================================================

/**
 * A simplified 5-proto cluster distribution table. For a given 2d6 roll,
 * returns the percentage (0-100) of total damage each proto in the point
 * receives.
 *
 * Entries lean heavily on the "centre" protos (1-4) with 0 / 1 / 2 protos
 * missing on bad rolls. Matches cluster-hits-style spread at 5 members.
 */
const POINT_CLUSTER_TABLE: Readonly<
  Record<number, readonly [number, number, number, number, number]>
> = {
  2: [20, 20, 20, 20, 20],
  3: [0, 20, 20, 20, 40],
  4: [0, 20, 20, 20, 40],
  5: [20, 20, 20, 20, 20],
  6: [20, 20, 20, 20, 20],
  7: [20, 20, 20, 20, 20],
  8: [20, 20, 20, 20, 20],
  9: [20, 20, 20, 20, 20],
  10: [20, 20, 20, 20, 20],
  11: [25, 25, 25, 25, 0],
  12: [40, 20, 20, 20, 0],
};

// =============================================================================
// Helpers
// =============================================================================

export interface IProtoPointAttackInput {
  readonly pointId: string;
  readonly protoIds: readonly string[];
  readonly totalDamage: number;
}

export interface IProtoPointAttackDistribution {
  readonly protoId: string;
  readonly damage: number;
}

export interface IProtoPointAttackResult {
  readonly pointId: string;
  readonly protoIds: readonly string[];
  readonly totalDamage: number;
  readonly distribution: readonly IProtoPointAttackDistribution[];
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly events: readonly ProtoEvent[];
}

/**
 * Divide `total` among `percentages` and round to integers. Rounding uses
 * floor on each share with the remainder allocated to the first entry to
 * keep the sum exact.
 */
function allocateDamage(
  total: number,
  percentages: readonly [number, number, number, number, number],
  protoIds: readonly string[],
): IProtoPointAttackDistribution[] {
  const shares = percentages.map((p) => Math.floor((total * p) / 100));
  let sum = shares.reduce((a, b) => a + b, 0);
  let i = 0;
  while (sum < total) {
    shares[i] = (shares[i] ?? 0) + 1;
    sum += 1;
    i = (i + 1) % shares.length;
  }

  return protoIds.map((protoId, idx) => ({
    protoId,
    damage: shares[idx] ?? 0,
  }));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a point-level attack from a pre-determined 2d6 result. Used in
 * tests and deterministic replays.
 */
export function resolveProtoPointAttackFromRoll(
  input: IProtoPointAttackInput,
  dice: readonly [number, number],
): IProtoPointAttackResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;
  const percentages = POINT_CLUSTER_TABLE[roll];
  if (!percentages) {
    // Shouldn't happen — the 2d6 table covers 2-12.
    throw new Error(`Invalid point-attack cluster roll: ${roll}`);
  }

  // Pad or trim to exactly 5 entries for distribution. If the point has
  // fewer than 5 survivors, truncate the percentages and redistribute the
  // truncated share across the remaining members proportionally.
  const padded = input.protoIds.slice(0, 5);
  const activePercentages = percentages.slice(0, padded.length);
  const activeSum = activePercentages.reduce((a, b) => a + b, 0);
  const normalized =
    activeSum === 100
      ? (activePercentages as unknown as readonly [
          number,
          number,
          number,
          number,
          number,
        ])
      : (activePercentages.map((p) =>
          Math.round((p / Math.max(1, activeSum)) * 100),
        ) as unknown as readonly [number, number, number, number, number]);

  const distribution = allocateDamage(input.totalDamage, normalized, padded);

  const events: ProtoEvent[] = [
    {
      type: ProtoEventType.PROTO_POINT_ATTACK,
      pointId: input.pointId,
      protoIds: padded,
      totalDamage: input.totalDamage,
      distribution,
    },
  ];

  return {
    pointId: input.pointId,
    protoIds: padded,
    totalDamage: input.totalDamage,
    distribution,
    dice: [d1, d2],
    roll,
    events,
  };
}

/**
 * Roll 2d6 and resolve a point-level attack.
 */
export function resolveProtoPointAttack(
  input: IProtoPointAttackInput,
  diceRoller: D6Roller = defaultD6Roller,
): IProtoPointAttackResult {
  const rolled = roll2d6(diceRoller);
  return resolveProtoPointAttackFromRoll(input, [
    rolled.dice[0],
    rolled.dice[1],
  ]);
}

// =============================================================================
// Scenario flag
// =============================================================================

/**
 * Default "point fire enabled?" flag. Off for MVP — callers flip this via
 * a scenario-level toggle when they want coordinated point attacks.
 */
export const DEFAULT_PROTO_POINT_FIRE_ENABLED = false;
