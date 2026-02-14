/**
 * Cluster Weapon Sizes
 * Weapon cluster size definitions for common BattleTech weapons.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

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
