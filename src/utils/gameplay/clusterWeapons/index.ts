/**
 * Cluster Weapons Module
 * Barrel export for cluster weapon mechanics.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

// Hit table and sizing
export {
  CLUSTER_HIT_TABLE,
  CLUSTER_SIZES,
  type ClusterSize,
  getNearestClusterSize,
  lookupClusterHits,
} from './hitTable';

// Weapon sizes
export { CLUSTER_WEAPON_SIZES, getClusterSizeForWeapon } from './weaponSizes';

// Resolution
export {
  rollClusterHits,
  determineClusterHitLocations,
  resolveClusterAttack,
  groupClusterHitsByLocation,
  formatClusterResult,
} from './resolution';

// Total launcher damage to landed-projectile damage
export { damageForProjectiles } from './projectileDamage';

// Missile rack identification shared by firing side and previews
export { isMissileClusterWeapon, missileRackSize } from './missileRack';

// Streak weapons
export { isStreakWeapon, resolveStreakAttack } from './streak';
