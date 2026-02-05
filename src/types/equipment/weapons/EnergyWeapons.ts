/**
 * Energy Weapon Definitions
 *
 * Type definitions for Lasers, PPCs, Flamers, and energy-based defensive systems.
 *
 * NOTE: Actual weapon data is now loaded from JSON files at runtime.
 * This file only contains type exports and empty arrays for backwards compatibility.
 *
 * @spec openspec/specs/weapon-system/spec.md
 */

import { IWeapon } from './interfaces';

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 * Empty arrays kept for backwards compatibility during transition.
 */
export const STANDARD_LASERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const ER_LASERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const PULSE_LASERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const HEAVY_LASERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const PPCS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const FLAMERS: readonly IWeapon[] = [] as const;

/**
 * @deprecated Hardcoded weapon data removed. Use EquipmentLookupService instead.
 */
export const LASER_AMS: readonly IWeapon[] = [] as const;

/**
 * All energy weapons combined
 * @deprecated Use EquipmentLookupService.getAllWeapons() filtered by WeaponCategory.ENERGY
 */
export const ENERGY_WEAPONS: readonly IWeapon[] = [] as const;
