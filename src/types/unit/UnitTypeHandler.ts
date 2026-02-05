/**
 * Unit Type Handler Interface
 *
 * Defines the contract for unit type handlers that provide type-specific
 * parsing, validation, and conversion logic for each unit type.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.3
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

import { IBlkDocument } from '../formats/BlkFormat';
import { UnitCategory } from '../validation/UnitValidationInterfaces';
import { IBaseUnit } from './BaseUnitInterfaces';
import { UnitType } from './BattleMechInterfaces';
import { ISerializedUnit } from './UnitSerialization';

// ============================================================================
// Handler Result Types
// ============================================================================

export interface IUnitParseData<T extends IBaseUnit = IBaseUnit> {
  readonly unit: T;
  readonly warnings: readonly string[];
}

export interface IUnitParseError {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export type IUnitParseResult<T extends IBaseUnit = IBaseUnit> = ResultType<
  IUnitParseData<T>,
  IUnitParseError
>;

export interface IUnitSerializeData {
  readonly serialized: ISerializedUnit;
}

export interface IUnitSerializeError {
  readonly errors: readonly string[];
}

export type IUnitSerializeResult = ResultType<
  IUnitSerializeData,
  IUnitSerializeError
>;

/**
 * Result of validating a unit
 */
export interface IUnitValidateResult {
  /** Whether the unit is valid */
  readonly isValid: boolean;
  /** Validation errors */
  readonly errors: readonly string[];
  /** Validation warnings */
  readonly warnings: readonly string[];
  /** Validation info messages */
  readonly infos: readonly string[];
}

// ============================================================================
// Unit Type Handler Interface
// ============================================================================

/**
 * Handler for a specific unit type
 *
 * Each unit type has a handler that knows how to:
 * - Parse BLK documents into the unit type's interface
 * - Serialize units to the standard serialization format
 * - Validate units according to type-specific rules
 * - Calculate derived values (weight, BV, cost)
 *
 * @template T The specific unit interface this handler works with
 */
export interface IUnitTypeHandler<T extends IBaseUnit = IBaseUnit> {
  /** Unit type this handler supports */
  readonly unitType: UnitType;

  /** Display name for this unit type */
  readonly displayName: string;

  /** Unit type category (Mech, Vehicle, Aerospace, Personnel) */
  readonly category: UnitCategory;

  /**
   * Parse a BLK document into the unit type's interface
   * @param document Parsed BLK document
   * @returns Parse result with unit or errors
   */
  parse(document: IBlkDocument): IUnitParseResult<T>;

  /**
   * Serialize a unit to the standard serialization format
   * @param unit The unit to serialize
   * @returns Serialization result
   */
  serialize(unit: T): IUnitSerializeResult;

  /**
   * Deserialize from standard format to unit interface
   * @param serialized Serialized unit data
   * @returns Parse result with unit or errors
   */
  deserialize(serialized: ISerializedUnit): IUnitParseResult<T>;

  /**
   * Validate a unit according to type-specific rules
   * @param unit The unit to validate
   * @returns Validation result
   */
  validate(unit: T): IUnitValidateResult;

  /**
   * Calculate total weight for the unit
   * @param unit The unit
   * @returns Total weight in tons
   */
  calculateWeight(unit: T): number;

  /**
   * Calculate Battle Value for the unit
   * @param unit The unit
   * @returns Battle Value
   */
  calculateBV(unit: T): number;

  /**
   * Calculate C-Bill cost for the unit
   * @param unit The unit
   * @returns Cost in C-Bills
   */
  calculateCost(unit: T): number;

  /**
   * Get the locations available for this unit type
   * @returns Array of location names
   */
  getLocations(): readonly string[];

  /**
   * Check if this handler can handle a given BLK document
   * @param document BLK document to check
   * @returns True if this handler can parse the document
   */
  canHandle(document: IBlkDocument): boolean;
}

// ============================================================================
// Unit Category - Re-exported from validation interfaces
// ============================================================================

// UnitCategory is imported from validation interfaces to avoid duplication
export { UnitCategory } from '../validation/UnitValidationInterfaces';

/**
 * Map unit types to categories
 */
export const UNIT_TYPE_CATEGORY_MAP: Record<UnitType, UnitCategory> = {
  [UnitType.BATTLEMECH]: UnitCategory.MECH,
  [UnitType.OMNIMECH]: UnitCategory.MECH,
  [UnitType.INDUSTRIALMECH]: UnitCategory.MECH,
  [UnitType.PROTOMECH]: UnitCategory.PERSONNEL,
  [UnitType.VEHICLE]: UnitCategory.VEHICLE,
  [UnitType.VTOL]: UnitCategory.VEHICLE,
  [UnitType.SUPPORT_VEHICLE]: UnitCategory.VEHICLE,
  [UnitType.AEROSPACE]: UnitCategory.AEROSPACE,
  [UnitType.CONVENTIONAL_FIGHTER]: UnitCategory.AEROSPACE,
  [UnitType.SMALL_CRAFT]: UnitCategory.AEROSPACE,
  [UnitType.DROPSHIP]: UnitCategory.AEROSPACE,
  [UnitType.JUMPSHIP]: UnitCategory.AEROSPACE,
  [UnitType.WARSHIP]: UnitCategory.AEROSPACE,
  [UnitType.SPACE_STATION]: UnitCategory.AEROSPACE,
  [UnitType.INFANTRY]: UnitCategory.PERSONNEL,
  [UnitType.BATTLE_ARMOR]: UnitCategory.PERSONNEL,
};

/**
 * Get category for a unit type
 */
export function getUnitCategory(unitType: UnitType): UnitCategory {
  return UNIT_TYPE_CATEGORY_MAP[unitType];
}

// ============================================================================
// Handler Registration Interface
// ============================================================================

/**
 * Interface for the unit type registry
 */
export interface IUnitTypeRegistry {
  /**
   * Register a handler for a unit type
   * @param handler The handler to register
   */
  register<T extends IBaseUnit>(handler: IUnitTypeHandler<T>): void;

  /**
   * Get handler for a unit type
   * @param unitType The unit type
   * @returns Handler or undefined if not registered
   */
  getHandler(unitType: UnitType): IUnitTypeHandler | undefined;

  /**
   * Get handler for a BLK document based on unit type tag
   * @param document BLK document
   * @returns Handler or undefined if unit type not supported
   */
  getHandlerForDocument(document: IBlkDocument): IUnitTypeHandler | undefined;

  /**
   * Check if a unit type is registered
   * @param unitType The unit type
   * @returns True if handler is registered
   */
  isRegistered(unitType: UnitType): boolean;

  /**
   * Get all registered unit types
   * @returns Array of registered unit types
   */
  getRegisteredTypes(): readonly UnitType[];

  /**
   * Get all handlers for a category
   * @param category The category
   * @returns Array of handlers in that category
   */
  getHandlersByCategory(category: UnitCategory): readonly IUnitTypeHandler[];
}
