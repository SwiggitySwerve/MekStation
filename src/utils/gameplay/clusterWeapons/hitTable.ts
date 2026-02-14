/**
 * Cluster Hit Table
 * Standard BattleTech cluster hit table (TotalWarfare/MegaMek canonical).
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

/**
 * Standard cluster hit table (TotalWarfare/MegaMek canonical).
 * Row = 2d6 roll, columns = cluster size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20)
 * Value = number of hits
 */
export const CLUSTER_HIT_TABLE: Readonly<
  Record<number, Readonly<Record<number, number>>>
> = {
  2: {
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    12: 4,
    15: 5,
    20: 6,
  },
  3: {
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    12: 4,
    15: 5,
    20: 6,
  },
  4: {
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 3,
    7: 3,
    8: 3,
    9: 4,
    10: 4,
    12: 5,
    15: 6,
    20: 9,
  },
  5: {
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 4,
    8: 4,
    9: 5,
    10: 6,
    12: 8,
    15: 9,
    20: 12,
  },
  6: {
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 4,
    7: 4,
    8: 4,
    9: 5,
    10: 6,
    12: 8,
    15: 9,
    20: 12,
  },
  7: {
    2: 1,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 5,
    10: 6,
    12: 8,
    15: 9,
    20: 12,
  },
  8: {
    2: 2,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 5,
    10: 6,
    12: 8,
    15: 9,
    20: 12,
  },
  9: {
    2: 2,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 5,
    8: 5,
    9: 6,
    10: 8,
    12: 10,
    15: 12,
    20: 16,
  },
  10: {
    2: 2,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 5,
    8: 6,
    9: 6,
    10: 8,
    12: 10,
    15: 12,
    20: 16,
  },
  11: {
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 6,
    8: 7,
    9: 7,
    10: 10,
    12: 12,
    15: 15,
    20: 20,
  },
  12: {
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    12: 12,
    15: 15,
    20: 20,
  },
};

/**
 * Supported cluster sizes in the table.
 */
export const CLUSTER_SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] as const;
export type ClusterSize = (typeof CLUSTER_SIZES)[number];

/**
 * Get the closest cluster size from the table.
 * Rounds down to the nearest supported size.
 */
export function getNearestClusterSize(size: number): ClusterSize {
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
