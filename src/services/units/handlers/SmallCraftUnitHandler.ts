/**
 * Small Craft Unit Handler
 *
 * Handler for parsing, validating, and serializing small craft.
 * Small craft are spacecraft between aerospace fighters and DropShips (100-200 tons).
 * Includes shuttles, assault boats, and armed cutters.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '../../../types/construction/UnitLocation';
import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import {
  ISmallCraft,
  ISmallCraftMountedEquipment,
} from '../../../types/unit/AerospaceInterfaces';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import { IUnitParseResult } from '../../../types/unit/UnitTypeHandler';
import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Constants
// ============================================================================

/**
 * Map location strings to SmallCraftLocation enum
 */
const LOCATION_MAP: Record<string, SmallCraftLocation> = {
  nose: SmallCraftLocation.NOSE,
  'nose equipment': SmallCraftLocation.NOSE,
  'left side': SmallCraftLocation.LEFT_SIDE,
  'left side equipment': SmallCraftLocation.LEFT_SIDE,
  'right side': SmallCraftLocation.RIGHT_SIDE,
  'right side equipment': SmallCraftLocation.RIGHT_SIDE,
  aft: SmallCraftLocation.AFT,
  'aft equipment': SmallCraftLocation.AFT,
  hull: SmallCraftLocation.HULL,
  'hull equipment': SmallCraftLocation.HULL,
};

// ============================================================================
// Small Craft Unit Handler
// ============================================================================

/**
 * Handler for small craft units
 */
export class SmallCraftUnitHandler extends AbstractUnitTypeHandler<ISmallCraft> {
  readonly unitType = UnitType.SMALL_CRAFT;
  readonly displayName = 'Small Craft';

  /**
   * Get available locations for small craft
   */
  getLocations(): readonly string[] {
    return Object.values(SmallCraftLocation);
  }

  /**
   * Parse small craft-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<ISmallCraft> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Motion type (aerodyne or spheroid)
    const motionTypeStr = document.motionType?.toLowerCase() || 'aerodyne';
    const motionType =
      motionTypeStr === 'spheroid'
        ? AerospaceMotionType.SPHEROID
        : AerospaceMotionType.AERODYNE;

    // Movement - thrust values
    const safeThrust = document.safeThrust || 0;
    const maxThrust = Math.floor(safeThrust * 1.5);
    const movement: IAerospaceMovement = { safeThrust, maxThrust };

    if (safeThrust < 1) {
      errors.push('Small craft must have at least 1 safe thrust');
    }

    // Fuel
    const fuel = document.fuel || 0;

    // Structural integrity
    const structuralIntegrity = document.structuralIntegrity || 0;

    // Heat sinks
    const heatSinks = document.heatsinks || 0;
    const heatSinkType = document.sinkType || 0;

    // Engine and armor types
    const engineType = document.engineType || 0;
    const armorType = document.armorType || 0;

    // Parse armor by arc
    const armor = document.armor || [];
    const armorByArc = this.parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Crew and passengers
    const crew = document.crew || 2;
    const passengers = document.passengers || 0;

    // Cargo capacity
    const cargoCapacity = this.parseCargoCapacity(document);

    // Escape pods and life boats
    const escapePods = document.escapePod || 0;
    const lifeBoats = document.lifeBoat || 0;

    // Tonnage validation (100-200 tons for small craft)
    if (document.tonnage < 100) {
      errors.push('Small craft tonnage must be at least 100 tons');
    }
    if (document.tonnage > 200) {
      errors.push('Small craft tonnage cannot exceed 200 tons');
    }

    return {
      unitType: UnitType.SMALL_CRAFT,
      motionType,
      movement,
      fuel,
      structuralIntegrity,
      heatSinks,
      heatSinkType,
      engineType,
      armorType,
      armor,
      armorByArc,
      totalArmorPoints,
      equipment,
      crew,
      passengers,
      cargoCapacity,
      escapePods,
      lifeBoats,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into arc-keyed object
   */
  private parseArmorByArc(armor: readonly number[]): {
    nose: number;
    leftSide: number;
    rightSide: number;
    aft: number;
  } {
    return {
      nose: armor[0] || 0,
      leftSide: armor[1] || 0,
      rightSide: armor[2] || 0,
      aft: armor[3] || 0,
    };
  }

  /**
   * Parse cargo capacity from document
   */
  private parseCargoCapacity(document: IBlkDocument): number {
    const rawTags = document.rawTags || {};
    const cargoStr = rawTags['cargo'] || rawTags['cargocapacity'];
    if (Array.isArray(cargoStr)) {
      return parseFloat(cargoStr[0]) || 0;
    }
    return parseFloat(String(cargoStr)) || 0;
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly ISmallCraftMountedEquipment[] {
    const equipment: ISmallCraftMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(
      document.equipmentByLocation,
    )) {
      const location = this.normalizeLocation(locationKey);

      for (const item of items) {
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          location,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to SmallCraftLocation enum
   */
  private normalizeLocation(locationKey: string): string {
    const normalized = locationKey.toLowerCase();
    return LOCATION_MAP[normalized] || SmallCraftLocation.HULL;
  }

  /**
   * Combine common and small craft-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<ISmallCraft>,
  ): ISmallCraft {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `small-craft-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.SMALL_CRAFT,
      tonnage: commonFields.tonnage,
      weightClass: WeightClass.ASSAULT, // Small craft are always assault weight

      // Tech
      techBase,
      era: commonFields.era as Era,
      rulesLevel,

      // Metadata
      metadata: {
        chassis: commonFields.chassis,
        model: commonFields.model,
        year: commonFields.year,
        rulesLevel,
        techBase,
        role: commonFields.role,
      },

      // Optional fields
      source: commonFields.source,
      role: commonFields.role,

      // Calculated values
      bv: 0,
      cost: 0,
      totalWeight: commonFields.tonnage,
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // Small craft-specific fields
      ...typeSpecificFields,
    } as ISmallCraft;
  }

  /**
   * Parse tech base from type string
   */
  private parseTechBase(typeStr: string): TechBase {
    const lower = typeStr.toLowerCase();
    if (lower.includes('clan') && !lower.includes('mixed')) {
      return TechBase.CLAN;
    }
    return TechBase.INNER_SPHERE;
  }

  /**
   * Parse rules level from type string
   */
  private parseRulesLevel(typeStr: string): RulesLevel {
    const lower = typeStr.toLowerCase();
    if (lower.includes('level 1') || lower.includes('introductory')) {
      return RulesLevel.INTRODUCTORY;
    }
    if (lower.includes('level 2') || lower.includes('standard')) {
      return RulesLevel.STANDARD;
    }
    if (lower.includes('level 3') || lower.includes('advanced')) {
      return RulesLevel.ADVANCED;
    }
    return RulesLevel.STANDARD;
  }

  /**
   * Serialize small craft-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: ISmallCraft,
  ): Partial<ISerializedUnit> {
    return {
      configuration: String(unit.motionType),
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<ISmallCraft> {
    return createFailureResult([
      'Small Craft deserialization not yet implemented',
    ]);
  }

  /**
   * Validate small craft-specific rules
   */
  protected validateTypeSpecificRules(unit: ISmallCraft): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage validation
    if (unit.tonnage < 100) {
      errors.push('Small craft tonnage must be at least 100 tons');
    }
    if (unit.tonnage > 200) {
      errors.push('Small craft tonnage cannot exceed 200 tons');
    }

    // Thrust validation
    if (unit.movement.safeThrust < 1) {
      errors.push('Small craft must have at least 1 safe thrust');
    }

    // SI validation
    if (unit.structuralIntegrity < 1) {
      errors.push('Small craft must have at least 1 SI');
    }

    // Crew validation
    if (unit.crew < 1) {
      warnings.push('Small craft has no crew assigned');
    }

    // Escape capacity check
    const totalPersonnel = unit.crew + unit.passengers;
    const escapeCapacity = unit.escapePods * 7 + unit.lifeBoats * 6;
    if (escapeCapacity < totalPersonnel && totalPersonnel > 0) {
      warnings.push(
        `Insufficient escape capacity (${escapeCapacity}) for personnel (${totalPersonnel})`,
      );
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate small craft weight
   */
  protected calculateTypeSpecificWeight(unit: ISmallCraft): number {
    // Small craft weight calculation is complex
    return unit.tonnage;
  }

  /**
   * Calculate small craft BV
   */
  protected calculateTypeSpecificBV(unit: ISmallCraft): number {
    let bv = 0;

    // Armor BV
    bv += unit.totalArmorPoints * 2;

    // SI contributes
    bv += unit.structuralIntegrity * 15;

    // Thrust modifier
    bv *= 1 + unit.movement.safeThrust * 0.1;

    return Math.round(bv);
  }

  /**
   * Calculate small craft cost
   */
  protected calculateTypeSpecificCost(unit: ISmallCraft): number {
    let cost = 0;

    // Base cost per ton
    cost += unit.tonnage * 30000;

    // Engine cost
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    cost += thrustRating * 8000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // Crew quarters and life support
    cost += (unit.crew + unit.passengers) * 10000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create Small Craft handler instance
 */
export function createSmallCraftHandler(): SmallCraftUnitHandler {
  return new SmallCraftUnitHandler();
}
