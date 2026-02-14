/**
 * Cluster Weapons Module
 * Facade re-exporting cluster weapon mechanics from subdirectory modules.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

export {
  CLUSTER_HIT_TABLE,
  CLUSTER_SIZES,
  type ClusterSize,
  getNearestClusterSize,
  lookupClusterHits,
} from './clusterWeapons/hitTable';

export {
  CLUSTER_WEAPON_SIZES,
  getClusterSizeForWeapon,
} from './clusterWeapons/weaponSizes';

export {
  rollClusterHits,
  determineClusterHitLocations,
  resolveClusterAttack,
  groupClusterHitsByLocation,
  formatClusterResult,
} from './clusterWeapons/resolution';

export { isStreakWeapon, resolveStreakAttack } from './clusterWeapons/streak';
