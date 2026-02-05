/**
 * Ballistic Weapon Definitions
 *
 * Type definitions for Autocannons, Gauss Rifles, Machine Guns, and ballistic defensive systems.
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
export const AUTOCANNONS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const ULTRA_AUTOCANNONS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const LBX_AUTOCANNONS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const ROTARY_AUTOCANNONS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const LIGHT_AUTOCANNONS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const GAUSS_RIFLES: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const MACHINE_GUNS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const AMS_SYSTEMS: readonly IWeapon[] = [] as const;

/**
 * All ballistic weapons combined
 * @deprecated Use EquipmentLookupService.getAllWeapons() filtered by WeaponCategory.BALLISTIC
 */
export const BALLISTIC_WEAPONS: readonly IWeapon[] = [] as const;
