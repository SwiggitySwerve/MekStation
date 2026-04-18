/**
 * ProtoMech Main Gun System
 *
 * Approved weapon list and arm-placement enforcement rules.
 * Heavy weapons may only be installed in the MainGun location; attempts to
 * place them in arm mounts are rejected by VAL-PROTO-MAIN-GUN.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md §Main Gun System
 * @spec openspec/changes/add-protomech-construction/tasks.md §6
 */

import {
  PROTO_MAIN_GUN_APPROVED_WEAPON_IDS,
  ProtoLocation,
  ProtoWeaponSizeClass,
} from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Approved weapon list
// =============================================================================

/**
 * Return true when the given equipment ID is in the approved main-gun list.
 * Used by VAL-PROTO-MAIN-GUN to gate weapon installation in the MainGun slot.
 */
export function isMainGunWeaponApproved(equipmentId: string): boolean {
  return PROTO_MAIN_GUN_APPROVED_WEAPON_IDS.has(equipmentId);
}

// =============================================================================
// Weapon size classification
// =============================================================================

/**
 * IDs of weapons classified as Heavy (must go in MainGun, not arm mounts).
 * This mirrors the approved main-gun list — every approved main-gun weapon
 * is considered Heavy for arm-placement purposes.
 *
 * Medium-class weapons (medium lasers, small pulse) are fine in arms.
 * Light weapons (micro pulse, flamers) are also fine in arms.
 */
const HEAVY_WEAPON_IDS: ReadonlySet<string> =
  PROTO_MAIN_GUN_APPROVED_WEAPON_IDS;

/**
 * Classify an equipment item's size for ProtoMech arm-placement checks.
 *
 * Heavy weapons must go in the MainGun slot; they are blocked from arms
 * by VAL-PROTO-MAIN-GUN (task §6.4).
 */
export function getProtoWeaponSizeClass(
  equipmentId: string,
): ProtoWeaponSizeClass {
  if (HEAVY_WEAPON_IDS.has(equipmentId)) return ProtoWeaponSizeClass.HEAVY;
  // Default: treat unrecognised weapons as Medium (arm-legal)
  return ProtoWeaponSizeClass.MEDIUM;
}

/**
 * Return true when the weapon is too large for an arm mount and must be
 * placed in the MainGun location instead.
 */
export function requiresMainGunMount(equipmentId: string): boolean {
  return getProtoWeaponSizeClass(equipmentId) === ProtoWeaponSizeClass.HEAVY;
}

// =============================================================================
// Arm location helpers
// =============================================================================

/** Locations that count as arm mounts on a standard (non-Quad) ProtoMech */
const ARM_LOCATIONS: ReadonlySet<ProtoLocation> = new Set([
  ProtoLocation.LEFT_ARM,
  ProtoLocation.RIGHT_ARM,
]);

/**
 * Return true when the target location is an arm mount.
 * Used when validating weapon placement attempts.
 */
export function isArmLocation(location: ProtoLocation): boolean {
  return ARM_LOCATIONS.has(location);
}

/**
 * Return true when placing `equipmentId` at `location` violates the arm-weight rule.
 * A heavy weapon in an arm location is illegal — it must be in MainGun.
 */
export function isArmPlacementIllegal(
  equipmentId: string,
  location: ProtoLocation,
): boolean {
  return isArmLocation(location) && requiresMainGunMount(equipmentId);
}

// Re-export the approved list for external consumers
export { PROTO_MAIN_GUN_APPROVED_WEAPON_IDS } from '@/types/unit/ProtoMechInterfaces';
export { ProtoWeaponSizeClass } from '@/types/unit/ProtoMechInterfaces';
