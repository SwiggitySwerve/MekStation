/**
 * Cluster Hit Resolution
 * Cluster hit rolling, location determination, attack resolution, grouping, and formatting.
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

import { roll2d6, determineHitLocation } from '../hitLocation';
import { CLUSTER_HIT_TABLE, getNearestClusterSize } from './hitTable';

/**
 * Roll on the cluster table for a weapon.
 */
export function rollClusterHits(clusterSize: number): {
  roll: IDiceRoll;
  hits: number;
} {
  const roll = roll2d6();
  const hits = lookupClusterHits(roll.total, clusterSize);
  return { roll, hits };
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
 * Determine hit locations for all cluster hits.
 */
export function determineClusterHitLocations(
  arc: FiringArc,
  numberOfHits: number,
  damagePerHit: number,
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
  arc: FiringArc,
): IClusterResult {
  if (!weapon.isCluster || !weapon.clusterSize) {
    throw new Error(`Weapon ${weapon.weaponName} is not a cluster weapon`);
  }

  // Roll for number of hits
  const { roll: clusterRoll, hits: hitsScored } = rollClusterHits(
    weapon.clusterSize,
  );

  // Calculate damage per hit
  const damagePerHit = weapon.damage;
  const totalDamage = hitsScored * damagePerHit;

  // Determine hit locations
  const hitDistribution = determineClusterHitLocations(
    arc,
    hitsScored,
    damagePerHit,
  );

  return {
    weapon,
    clusterRoll,
    hitsScored,
    damagePerHit,
    totalDamage,
    hitDistribution,
  };
}

/**
 * Group cluster hits by location for display/damage application.
 */
export function groupClusterHitsByLocation(
  hits: readonly IClusterHitLocation[],
): Map<CombatLocation, { count: number; totalDamage: number }> {
  const grouped = new Map<
    CombatLocation,
    { count: number; totalDamage: number }
  >();

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
    lines.push(
      `  ${location}: ${data.count} hit(s), ${data.totalDamage} damage`,
    );
  });

  return lines.join('\n');
}
