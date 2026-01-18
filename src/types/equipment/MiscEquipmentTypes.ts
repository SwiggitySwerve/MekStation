/**
 * Miscellaneous Equipment Type Definitions
 * 
 * Type definitions for heat sinks, jump jets, movement enhancements, and other misc equipment.
 * 
 * NOTE: Actual equipment data is now loaded from JSON files at runtime.
 * This file only contains type exports and empty arrays for backwards compatibility.
 * 
 * @spec openspec/specs/electronics-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { EquipmentFlag } from '../enums/EquipmentFlag';
import { UnitType } from '../unit/BattleMechInterfaces';

/**
 * Misc equipment category
 */
export enum MiscEquipmentCategory {
  HEAT_SINK = 'Heat Sink',
  JUMP_JET = 'Jump Jet',
  MOVEMENT = 'Movement Enhancement',
  DEFENSIVE = 'Defensive',
  MYOMER = 'Myomer',
  INDUSTRIAL = 'Industrial',
}

/**
 * Misc equipment interface
 */
export interface IMiscEquipment {
  readonly id: string;
  readonly name: string;
  readonly category: MiscEquipmentCategory;
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
   * Unit types that can mount this equipment.
   * Critical for items like jump jets (mech vs vehicle variants), MASC, etc.
   */
  readonly allowedUnitTypes?: readonly UnitType[];

  /**
   * Equipment flags defining behavior and properties.
   * Used to identify equipment type (JUMP_JET, MASC, TSM, etc.) and behaviors.
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
// MISC EQUIPMENT DATA - DEPRECATED
// All data now loaded from JSON files via EquipmentLookupService
// ============================================================================

/**
 * @deprecated Hardcoded equipment data removed. Use EquipmentLookupService instead.
 */
export const HEAT_SINKS: readonly IMiscEquipment[] = [] as const;

/**
 * @deprecated Hardcoded equipment data removed. Use EquipmentLookupService instead.
 */
export const JUMP_JETS: readonly IMiscEquipment[] = [] as const;

/**
 * @deprecated Hardcoded equipment data removed. Use EquipmentLookupService instead.
 */
export const MOVEMENT_EQUIPMENT: readonly IMiscEquipment[] = [] as const;

/**
 * @deprecated Hardcoded equipment data removed. Use EquipmentLookupService instead.
 */
export const MYOMER_SYSTEMS: readonly IMiscEquipment[] = [] as const;

/**
 * @deprecated Hardcoded equipment data removed. Use EquipmentLookupService instead.
 */
export const DEFENSIVE_EQUIPMENT: readonly IMiscEquipment[] = [] as const;

/**
 * All misc equipment combined
 * @deprecated Use EquipmentLookupService.getAllMiscEquipment() instead.
 */
export const ALL_MISC_EQUIPMENT: readonly IMiscEquipment[] = [] as const;

/**
 * Get misc equipment by ID
 * @deprecated Use EquipmentLookupService.getById() instead.
 */
export function getMiscEquipmentById(id: string): IMiscEquipment | undefined {
  return ALL_MISC_EQUIPMENT.find(e => e.id === id);
}

/**
 * Get misc equipment by category
 * @deprecated Use EquipmentLookupService instead.
 */
export function getMiscEquipmentByCategory(category: MiscEquipmentCategory): IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT.filter(e => e.category === category);
}

/**
 * Get misc equipment by tech base
 * @deprecated Use EquipmentLookupService instead.
 */
export function getMiscEquipmentByTechBase(techBase: TechBase): IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT.filter(e => e.techBase === techBase);
}
