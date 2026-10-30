/**
 * Cluster Hit Table
 * Standard BattleTech cluster hit table (TotalWarfare/MegaMek canonical).
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

/**
 * Standard cluster hit table (TotalWarfare/MegaMek canonical).
 * Row = 2d6 roll, columns = integer rack sizes 1 through 20.
 * Pinned MegaMek 48fcb2f6 Compute.calculateClusterHitTableAmount; see RULES.md.
 * Value = number of hits
 */
export const CLUSTER_HIT_TABLE: Readonly<
  Record<number, Readonly<Record<number, number>>>
> = {
  2: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 2,
    9: 3,
    10: 3,
    11: 4,
    12: 4,
    13: 4,
    14: 5,
    15: 5,
    16: 5,
    17: 5,
    18: 6,
    19: 6,
    20: 6,
  },
  3: {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    11: 4,
    12: 4,
    13: 4,
    14: 5,
    15: 5,
    16: 5,
    17: 5,
    18: 6,
    19: 6,
    20: 6,
  },
  4: {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 3,
    7: 3,
    8: 3,
    9: 4,
    10: 4,
    11: 5,
    12: 5,
    13: 5,
    14: 6,
    15: 6,
    16: 7,
    17: 7,
    18: 8,
    19: 8,
    20: 9,
  },
  5: {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 4,
    8: 4,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    13: 8,
    14: 9,
    15: 9,
    16: 10,
    17: 10,
    18: 11,
    19: 11,
    20: 12,
  },
  6: {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 4,
    7: 4,
    8: 4,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    13: 8,
    14: 9,
    15: 9,
    16: 10,
    17: 10,
    18: 11,
    19: 11,
    20: 12,
  },
  7: {
    1: 1,
    2: 1,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    13: 8,
    14: 9,
    15: 9,
    16: 10,
    17: 10,
    18: 11,
    19: 11,
    20: 12,
  },
  8: {
    1: 1,
    2: 2,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    13: 8,
    14: 9,
    15: 9,
    16: 10,
    17: 10,
    18: 11,
    19: 11,
    20: 12,
  },
  9: {
    1: 1,
    2: 2,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 6,
    9: 7,
    10: 8,
    11: 9,
    12: 10,
    13: 11,
    14: 11,
    15: 12,
    16: 13,
    17: 14,
    18: 14,
    19: 15,
    20: 16,
  },
  10: {
    1: 1,
    2: 2,
    3: 3,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 7,
    9: 7,
    10: 8,
    11: 9,
    12: 10,
    13: 11,
    14: 11,
    15: 12,
    16: 13,
    17: 14,
    18: 14,
    19: 15,
    20: 16,
  },
  11: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
    13: 13,
    14: 14,
    15: 15,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    20: 20,
  },
  12: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
    13: 13,
    14: 14,
    15: 15,
    16: 16,
    17: 17,
    18: 18,
    19: 19,
    20: 20,
  },
};

/**
 * Supported cluster sizes in the table.
 */
export const CLUSTER_SIZES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;
export type ClusterSize = (typeof CLUSTER_SIZES)[number];

/**
 * Resolve an exact supported integer rack; retain the legacy upward fallback
 * for unsupported values, including fractional, nonpositive and large sizes.
 */
export function getNearestClusterSize(size: number): ClusterSize {
  const exactSize = CLUSTER_SIZES.find((candidate) => candidate === size);
  if (exactSize !== undefined) return exactSize;

  // Compatibility fallback: adding columns does not reroute unsupported sizes.
  if (size <= 2) return 2;
  if (size <= 3) return 3;
  if (size <= 4) return 4;
  if (size <= 5) return 5;
  if (size <= 6) return 6;
  if (size <= 7) return 7;
  if (size <= 8) return 8;
  if (size <= 9) return 9;
  if (size <= 10) return 10;
  if (size <= 12) return 12;
  if (size <= 15) return 15;
  return 20;
}

/**
 * Look up number of hits on the cluster table.
 */
export function lookupClusterHits(roll: number, clusterSize: number): number {
  const tableRow = CLUSTER_HIT_TABLE[roll];
  if (!tableRow) {
    // Out of range roll, use closest valid
    const clampedRoll = Math.max(2, Math.min(12, roll));
    return lookupClusterHits(clampedRoll, clusterSize);
  }

  const nearestSize = getNearestClusterSize(clusterSize);
  return tableRow[nearestSize] ?? 0;
}
