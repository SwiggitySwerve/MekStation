/**
 * Ammunition Type Definitions
 * 
 * Type definitions for ammunition and compatibility rules.
 * 
 * NOTE: Actual ammunition data is now loaded from JSON files at runtime.
 * This file only contains type exports and empty arrays for backwards compatibility.
 * 
 * @spec openspec/specs/ammunition-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { EquipmentFlag } from '../enums/EquipmentFlag';
import { UnitType } from '../unit/BattleMechInterfaces';

/**
 * Ammunition category
 */
export enum AmmoCategory {
  AUTOCANNON = 'Autocannon',
  GAUSS = 'Gauss',
  MACHINE_GUN = 'Machine Gun',
  LRM = 'LRM',
  SRM = 'SRM',
  MRM = 'MRM',
  ATM = 'ATM',
  NARC = 'NARC',
  ARTILLERY = 'Artillery',
  AMS = 'AMS',
}

/**
 * Special ammo variant types
 */
export enum AmmoVariant {
  STANDARD = 'Standard',
  ARMOR_PIERCING = 'Armor-Piercing',
  CLUSTER = 'Cluster',
  PRECISION = 'Precision',
  FLECHETTE = 'Flechette',
  INFERNO = 'Inferno',
  FRAGMENTATION = 'Fragmentation',
  INCENDIARY = 'Incendiary',
  SMOKE = 'Smoke',
  THUNDER = 'Thunder',
  SWARM = 'Swarm',
  TANDEM_CHARGE = 'Tandem-Charge',
  EXTENDED_RANGE = 'Extended Range',
  HIGH_EXPLOSIVE = 'High Explosive',
}

/**
 * Ammunition interface
 */
export interface IAmmunition {
  readonly id: string;
  readonly name: string;
  readonly category: AmmoCategory;
  readonly variant: AmmoVariant;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly compatibleWeaponIds: readonly string[];
  readonly shotsPerTon: number;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costPerTon: number;
  readonly battleValue: number;
  readonly isExplosive: boolean;
  readonly damageModifier?: number;
  readonly rangeModifier?: number;
  readonly introductionYear: number;
  readonly special?: readonly string[];

  /**
   * Unit types that can use this ammunition.
   * Typically matches the allowedUnitTypes of compatible weapons.
   */
  readonly allowedUnitTypes?: readonly UnitType[];

  /**
   * Equipment flags defining behavior and properties.
   * @see EquipmentFlag
   */
  readonly flags?: readonly EquipmentFlag[];
}

// ============================================================================
// AMMUNITION DATA - DEPRECATED
// All data now loaded from JSON files via EquipmentLookupService
// ============================================================================

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const AC_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const ULTRA_AC_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const LBX_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const GAUSS_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const MG_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const LRM_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const SRM_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const STREAK_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const MRM_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const ATM_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const AMS_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Hardcoded ammunition data removed. Use EquipmentLookupService instead.
 */
export const NARC_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * All ammunition types combined
 * @deprecated Use EquipmentLookupService.getAllAmmunition() instead.
 */
export const ALL_AMMUNITION: readonly IAmmunition[] = [] as const;

/**
 * @deprecated Backwards compatibility alias
 */
export const AMMUNITION_TYPES = ALL_AMMUNITION;

/**
 * Get ammunition by ID
 * @deprecated Use EquipmentLookupService.getById() instead.
 */
export function getAmmunitionById(id: string): IAmmunition | undefined {
  return ALL_AMMUNITION.find(a => a.id === id);
}

/**
 * Get compatible ammunition for a weapon
 * @deprecated Use EquipmentLookupService instead.
 */
export function getCompatibleAmmunition(weaponId: string): IAmmunition[] {
  return ALL_AMMUNITION.filter(a => a.compatibleWeaponIds.includes(weaponId));
}

/**
 * Get ammunition by category
 * @deprecated Use EquipmentLookupService instead.
 */
export function getAmmunitionByCategory(category: AmmoCategory): IAmmunition[] {
  return ALL_AMMUNITION.filter(a => a.category === category);
}

/**
 * Check if ammunition is compatible with weapon
 * @deprecated Use EquipmentLookupService instead.
 */
export function isAmmoCompatible(ammoId: string, weaponId: string): boolean {
  const ammo = getAmmunitionById(ammoId);
  return ammo?.compatibleWeaponIds.includes(weaponId) ?? false;
}

// ============================================================================
// CASE PROTECTION - Kept as these are structural, not equipment
// ============================================================================

/**
 * CASE (Cellular Ammunition Storage Equipment) protection rules
 */
export interface CASEProtection {
  readonly type: 'CASE' | 'CASE_II';
  readonly techBase: TechBase;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly protectsAdjacentLocations: boolean;
  readonly preventsTorsoDestruction: boolean;
}

export const CASE_DEFINITIONS: readonly CASEProtection[] = [
  {
    type: 'CASE',
    techBase: TechBase.INNER_SPHERE,
    weight: 0.5,
    criticalSlots: 1,
    protectsAdjacentLocations: false,
    preventsTorsoDestruction: true,
  },
  {
    type: 'CASE_II',
    techBase: TechBase.INNER_SPHERE,
    weight: 1,
    criticalSlots: 1,
    protectsAdjacentLocations: true,
    preventsTorsoDestruction: true,
  },
  {
    type: 'CASE',
    techBase: TechBase.CLAN,
    weight: 0,
    criticalSlots: 0,
    protectsAdjacentLocations: false,
    preventsTorsoDestruction: true,
  },
] as const;
