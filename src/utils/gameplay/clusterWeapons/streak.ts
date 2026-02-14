/**
 * Streak Weapons
 * Streak missile detection and attack resolution.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { FiringArc } from '@/types/gameplay';
import { IClusterResult, IWeaponAttack, IDiceRoll } from '@/types/gameplay';

import { determineClusterHitLocations } from './resolution';

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
  arc: FiringArc,
): IClusterResult {
  if (!weapon.clusterSize) {
    throw new Error(`Weapon ${weapon.weaponName} has no cluster size`);
  }

  // All missiles hit
  const hitsScored = weapon.clusterSize;
  const damagePerHit = weapon.damage;
  const totalDamage = hitsScored * damagePerHit;

  // For Streak, determine locations (each missile still rolls separately)
  const hitDistribution = determineClusterHitLocations(
    arc,
    hitsScored,
    damagePerHit,
  );

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
