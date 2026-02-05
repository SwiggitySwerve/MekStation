/**
 * Missile Weapon Definitions
 *
 * Type definitions for LRMs, SRMs, Streak, MRMs, ATMs, MMLs, and NARC systems.
 *
 * NOTE: Actual weapon data is now loaded from JSON files at runtime.
 * This file only contains type exports and empty arrays for backwards compatibility.
 *
 * @spec openspec/specs/weapon-system/spec.md
 */

import { IWeapon } from './interfaces';

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const LRM_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const SRM_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const STREAK_SRM_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const MRM_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const ATM_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const MML_LAUNCHERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const NARC_SYSTEMS: readonly IWeapon[] = [] as const;

/**
 * All missile weapons combined
 * @deprecated Use EquipmentLookupService.getAllWeapons() filtered by WeaponCategory.MISSILE
 */
export const MISSILE_WEAPONS: readonly IWeapon[] = [] as const;
