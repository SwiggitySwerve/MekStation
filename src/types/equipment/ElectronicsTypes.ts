/**
 * Electronics Equipment Type Definitions
 * 
 * Type definitions for electronic warfare, targeting, and C3 systems.
 * 
 * NOTE: Actual electronics data is now loaded from JSON files at runtime.
 * This file only contains type exports and empty arrays for backwards compatibility.
 * 
 * @spec openspec/specs/electronics-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { EquipmentFlag } from '../enums/EquipmentFlag';
import { UnitType } from '../unit/BattleMechInterfaces';

/**
 * Electronics category
 */
export enum ElectronicsCategory {
  TARGETING = 'Targeting',
  ECM = 'ECM',
  ACTIVE_PROBE = 'Active Probe',
  C3 = 'C3 System',
  TAG = 'TAG',
  COMMUNICATIONS = 'Communications',
}

/**
 * Electronics equipment interface
 */
export interface IElectronics {
  readonly id: string;
  readonly name: string;
  readonly category: ElectronicsCategory;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
  readonly special?: readonly string[];
  /** ID for variable equipment formula lookup in FormulaRegistry */
  readonly variableEquipmentId?: string;

  /**
   * Unit types that can mount this electronics equipment.
   * Most electronics work on multiple unit types.
   */
  readonly allowedUnitTypes?: readonly UnitType[];

  /**
   * Equipment flags defining behavior and properties.
   * @see EquipmentFlag
   */
  readonly flags?: readonly EquipmentFlag[];

  /**
   * Locations where this equipment can be mounted.
   * If undefined, equipment can be mounted in any valid location for the unit type.
   */
  readonly allowedLocations?: readonly string[];
}

// ============================================================================
// ELECTRONICS DATA - DEPRECATED
// All data now loaded from JSON files via EquipmentLookupService
// ============================================================================

/**
 * @deprecated Hardcoded electronics data removed. Use EquipmentLookupService instead.
 */
export const TARGETING_COMPUTERS: readonly IElectronics[] = [] as const;

/**
 * @deprecated Hardcoded electronics data removed. Use EquipmentLookupService instead.
 */
export const ECM_SYSTEMS: readonly IElectronics[] = [] as const;

/**
 * @deprecated Hardcoded electronics data removed. Use EquipmentLookupService instead.
 */
export const ACTIVE_PROBES: readonly IElectronics[] = [] as const;

/**
 * @deprecated Hardcoded electronics data removed. Use EquipmentLookupService instead.
 */
export const C3_SYSTEMS: readonly IElectronics[] = [] as const;

/**
 * @deprecated Hardcoded electronics data removed. Use EquipmentLookupService instead.
 */
export const TAG_SYSTEMS: readonly IElectronics[] = [] as const;

/**
 * All electronics combined
 * @deprecated Use EquipmentLookupService.getAllElectronics() instead.
 */
export const ALL_ELECTRONICS: readonly IElectronics[] = [] as const;

/**
 * Get electronics by ID
 * @deprecated Use EquipmentLookupService.getById() instead.
 */
export function getElectronicsById(id: string): IElectronics | undefined {
  return ALL_ELECTRONICS.find(e => e.id === id);
}

/**
 * Get electronics by category
 * @deprecated Use EquipmentLookupService instead.
 */
export function getElectronicsByCategory(category: ElectronicsCategory): IElectronics[] {
  return ALL_ELECTRONICS.filter(e => e.category === category);
}

/**
 * Get electronics by tech base
 * @deprecated Use EquipmentLookupService instead.
 */
export function getElectronicsByTechBase(techBase: TechBase): IElectronics[] {
  return ALL_ELECTRONICS.filter(e => e.techBase === techBase);
}
