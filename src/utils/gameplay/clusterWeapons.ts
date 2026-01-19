/**
 * Cluster Weapons Module
 * Implements BattleTech cluster hit table and cluster damage resolution.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { FiringArc } from '@/types/gameplay';
import {
  CombatLocation,
  IClusterResult,
  IClusterHitLocation,
  IWeaponAttack,
  IDiceRoll,
} from '@/types/gameplay';
import { roll2d6, determineHitLocation } from './hitLocation';

// =============================================================================
// Cluster Hit Table
// =============================================================================

/**
 * Standard cluster hit table.
 * Row = 2d6 roll, columns = cluster size (2, 4, 5, 6, 10, 15, 20)
 * Value = number of hits
 */
export const CLUSTER_HIT_TABLE: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  2:  { 2: 1, 4: 1, 5: 1, 6: 2, 10: 3, 15: 5, 20: 6 },
  3:  { 2: 1, 4: 2, 5: 2, 6: 2, 10: 3, 15: 5, 20: 6 },
  4:  { 2: 1, 4: 2, 5: 2, 6: 3, 10: 4, 15: 6, 20: 9 },
  5:  { 2: 1, 4: 2, 5: 3, 6: 3, 10: 6, 15: 9, 20: 12 },
  6:  { 2: 1, 4: 2, 5: 3, 6: 4, 10: 6, 15: 9, 20: 12 },
  7:  { 2: 1, 4: 3, 5: 3, 6: 4, 10: 6, 15: 9, 20: 12 },
  8:  { 2: 2, 4: 3, 5: 3, 6: 4, 10: 6, 15: 9, 20: 12 },
  9:  { 2: 2, 4: 3, 5: 4, 6: 5, 10: 8, 15: 12, 20: 16 },
  10: { 2: 2, 4: 3, 5: 4, 6: 5, 10: 8, 15: 12, 20: 16 },
  11: { 2: 2, 4: 4, 5: 5, 6: 6, 10: 10, 15: 15, 20: 20 },
  12: { 2: 2, 4: 4, 5: 5, 6: 6, 10: 10, 15: 15, 20: 20 },
};

/**
 * Supported cluster sizes in the table.
 */
export const CLUSTER_SIZES = [2, 4, 5, 6, 10, 15, 20] as const;
export type ClusterSize = typeof CLUSTER_SIZES[number];

// =============================================================================
// Cluster Hit Resolution
// =============================================================================

/**
 * Get the closest cluster size from the table.
 * Rounds down to the nearest supported size.
 */
export function getNearestClusterSize(size: number): ClusterSize {
  if (size <= 2) return 2;
  if (size <= 4) return 4;
  if (size <= 5) return 5;
  if (size <= 6) return 6;
  if (size <= 10) return 10;
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

/**
 * Roll on the cluster table for a weapon.
 */
export function rollClusterHits(clusterSize: number): { roll: IDiceRoll; hits: number } {
  const roll = roll2d6();
  const hits = lookupClusterHits(roll.total, clusterSize);
  return { roll, hits };
}

/**
 * Determine hit locations for all cluster hits.
 */
export function determineClusterHitLocations(
  arc: FiringArc,
  numberOfHits: number,
  damagePerHit: number
): IClusterHitLocation[] {
  const locations: IClusterHitLocation[] = [];

  for (let i = 0; i < numberOfHits; i++) {
    const hitResult = determineHitLocation(arc);
    locations.push({
      location: hitResult.location,
      roll: hitResult.roll,
      damage: damagePerHit,
    });
  }

  return locations;
}

/**
 * Resolve a complete cluster weapon attack.
 */
export function resolveClusterAttack(
  weapon: IWeaponAttack,
  arc: FiringArc
): IClusterResult {
  if (!weapon.isCluster || !weapon.clusterSize) {
    throw new Error(`Weapon ${weapon.weaponName} is not a cluster weapon`);
  }

  // Roll for number of hits
  const { roll: clusterRoll, hits: hitsScored } = rollClusterHits(weapon.clusterSize);

  // Calculate damage per hit
  const damagePerHit = weapon.damage;
  const totalDamage = hitsScored * damagePerHit;

  // Determine hit locations
  const hitDistribution = determineClusterHitLocations(arc, hitsScored, damagePerHit);

  return {
    weapon,
    clusterRoll,
    hitsScored,
    damagePerHit,
    totalDamage,
    hitDistribution,
  };
}

// =============================================================================
// Common Cluster Weapons
// =============================================================================

/**
 * Cluster weapon definitions for common weapons.
 */
export const CLUSTER_WEAPON_SIZES: Readonly<Record<string, number>> = {
  // LRMs
  'lrm-5': 5,
  'lrm-10': 10,
  'lrm-15': 15,
  'lrm-20': 20,
  
  // SRMs (2 damage per missile, but rolled as cluster)
  'srm-2': 2,
  'srm-4': 4,
  'srm-6': 6,
  
  // MRMs
  'mrm-10': 10,
  'mrm-20': 20,
  'mrm-30': 30, // Uses 20 column, then 10 column
  'mrm-40': 40, // Uses 20 column twice
  
  // ATM
  'atm-3': 3,
  'atm-6': 6,
  'atm-9': 9,
  'atm-12': 12,
  
  // Rotary AC (special - multiple shots)
  'rac-2': 6, // Max 6 shots
  'rac-5': 6,
  
  // Ultra AC (special - 2 shots)
  'uac-2': 2,
  'uac-5': 2,
  'uac-10': 2,
  'uac-20': 2,
  
  // LB-X AC (cluster mode)
  'lb-2-x': 2,
  'lb-5-x': 5,
  'lb-10-x': 10,
  'lb-20-x': 20,
};

/**
 * Get the cluster size for a weapon ID.
 */
export function getClusterSizeForWeapon(weaponId: string): number | undefined {
  return CLUSTER_WEAPON_SIZES[weaponId.toLowerCase()];
}

// =============================================================================
// Streak Weapons
// =============================================================================

/**
 * Check if a weapon is a Streak missile system.
 * Streak missiles either all hit or none hit (no cluster roll needed).
 */
export function isStreakWeapon(weaponId: string): boolean {
  return weaponId.toLowerCase().includes('streak');
}

/**
 * Resolve a Streak missile attack.
 * All missiles hit the same location for Streak-2/4/6.
 */
export function resolveStreakAttack(
  weapon: IWeaponAttack,
  arc: FiringArc
): IClusterResult {
  if (!weapon.clusterSize) {
    throw new Error(`Weapon ${weapon.weaponName} has no cluster size`);
  }

  // All missiles hit
  const hitsScored = weapon.clusterSize;
  const damagePerHit = weapon.damage;
  const totalDamage = hitsScored * damagePerHit;

  // For Streak, determine locations (each missile still rolls separately)
  const hitDistribution = determineClusterHitLocations(arc, hitsScored, damagePerHit);

  // Create a "perfect" cluster roll (showing all hit)
  const clusterRoll: IDiceRoll = {
    dice: [6, 6],
    total: 12, // Max roll
    isSnakeEyes: false,
    isBoxcars: true,
  };

  return {
    weapon,
    clusterRoll,
    hitsScored,
    damagePerHit,
    totalDamage,
    hitDistribution,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Group cluster hits by location for display/damage application.
 */
export function groupClusterHitsByLocation(
  hits: readonly IClusterHitLocation[]
): Map<CombatLocation, { count: number; totalDamage: number }> {
  const grouped = new Map<CombatLocation, { count: number; totalDamage: number }>();

  for (const hit of hits) {
    const existing = grouped.get(hit.location) ?? { count: 0, totalDamage: 0 };
    grouped.set(hit.location, {
      count: existing.count + 1,
      totalDamage: existing.totalDamage + hit.damage,
    });
  }

  return grouped;
}

/**
 * Format cluster result for display.
 */
export function formatClusterResult(result: IClusterResult): string {
  const lines: string[] = [
    `${result.weapon.weaponName}: ${result.hitsScored} hits (roll: ${result.clusterRoll.total})`,
    `Total damage: ${result.totalDamage}`,
    'Hit distribution:',
  ];

  const grouped = groupClusterHitsByLocation(result.hitDistribution);
  grouped.forEach((data, location) => {
    lines.push(`  ${location}: ${data.count} hit(s), ${data.totalDamage} damage`);
  });

  return lines.join('\n');
}
