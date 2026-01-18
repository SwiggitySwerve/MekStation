/**
 * Vehicle Unit Handler
 *
 * Handler for parsing, validating, and serializing combat vehicles.
 * Supports standard vehicles (tanks), VTOLs, and naval units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IVehicle,
  IVehicleMountedEquipment,
  ITurretConfiguration,
  TurretType,
} from '../../../types/unit/VehicleInterfaces';
import {
  GroundMotionType,
  IGroundMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { VehicleLocation } from '../../../types/construction/UnitLocation';
import { IUnitParseResult } from '../../../types/unit/UnitTypeHandler';
import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Constants
// ============================================================================

/**
 * Vehicle location order for armor array parsing
 */
const VEHICLE_ARMOR_LOCATIONS = [
  VehicleLocation.FRONT,
  VehicleLocation.LEFT,
  VehicleLocation.RIGHT,
  VehicleLocation.REAR,
  VehicleLocation.TURRET,
] as const;

/**
 * Motion type string to enum mapping
 */
const MOTION_TYPE_MAP: Record<string, GroundMotionType> = {
  tracked: GroundMotionType.TRACKED,
  wheeled: GroundMotionType.WHEELED,
  hover: GroundMotionType.HOVER,
  vtol: GroundMotionType.VTOL,
  naval: GroundMotionType.NAVAL,
  hydrofoil: GroundMotionType.HYDROFOIL,
  submarine: GroundMotionType.SUBMARINE,
  wige: GroundMotionType.WIGE,
  rail: GroundMotionType.RAIL,
  maglev: GroundMotionType.MAGLEV,
};

// ============================================================================
// Vehicle Unit Handler
// ============================================================================

/**
 * Handler for combat vehicle units
 */
export class VehicleUnitHandler extends AbstractUnitTypeHandler<IVehicle> {
  readonly unitType = UnitType.VEHICLE;
  readonly displayName = 'Combat Vehicle';

  /**
   * Get available locations for vehicles
   */
  getLocations(): readonly string[] {
    return Object.values(VehicleLocation);
  }

  /**
   * Parse vehicle-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IVehicle> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Motion type
    const motionTypeStr = document.motionType?.toLowerCase() || 'tracked';
    const motionType = MOTION_TYPE_MAP[motionTypeStr];
    if (!motionType) {
      warnings.push(`Unknown motion type: ${document.motionType}, defaulting to Tracked`);
    }

    // Movement
    const cruiseMP = document.cruiseMP || 0;
    const flankMP = Math.floor(cruiseMP * 1.5);
    const jumpMP = document.jumpingMP || 0;
    const movement: IGroundMovement = { cruiseMP, flankMP, jumpMP };

    // Engine
    const engineType = document.engineType || 0;
    const engineRating = cruiseMP * document.tonnage;

    // Armor
    const armorType = document.armorType || 0;
    const armor = document.armor || [];
    const armorByLocation = this.parseArmorByLocation(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Turret configuration
    const turret = this.parseTurretConfiguration(document);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Vehicle-specific flags
    const isSuperheavy = document.tonnage > 100;

    // Parse raw tags for additional fields
    const rawTags = document.rawTags || {};
    const hasEnvironmentalSealing = this.getBooleanFromRaw(rawTags, 'environmentalsealing');
    const hasFlotationHull = this.getBooleanFromRaw(rawTags, 'flotationhull');
    const isAmphibious = this.getBooleanFromRaw(rawTags, 'amphibious');
    const hasTrailerHitch = this.getBooleanFromRaw(rawTags, 'trailerhitch');
    const isTrailer = this.getBooleanFromRaw(rawTags, 'trailer');

    // Internal structure type
    const internalStructureType = document.internalType || 0;

    return {
      unitType: UnitType.VEHICLE,
      motionType: motionType || GroundMotionType.TRACKED,
      movement,
      engineType,
      engineRating,
      armorType,
      armor,
      armorByLocation,
      totalArmorPoints,
      maxArmorPoints: this.calculateMaxArmor(document.tonnage),
      turret,
      equipment,
      internalStructureType,
      isSuperheavy,
      hasEnvironmentalSealing,
      hasFlotationHull,
      isAmphibious,
      hasTrailerHitch,
      isTrailer,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into location-keyed record
   */
  private parseArmorByLocation(armor: readonly number[]): Record<VehicleLocation, number> {
    const result: Record<VehicleLocation, number> = {
      [VehicleLocation.FRONT]: 0,
      [VehicleLocation.LEFT]: 0,
      [VehicleLocation.RIGHT]: 0,
      [VehicleLocation.REAR]: 0,
      [VehicleLocation.TURRET]: 0,
      [VehicleLocation.BODY]: 0,
    };

    VEHICLE_ARMOR_LOCATIONS.forEach((loc, index) => {
      if (index < armor.length) {
        result[loc] = armor[index];
      }
    });

    return result;
  }

  /**
   * Parse turret configuration from document
   */
  private parseTurretConfiguration(
    document: IBlkDocument
  ): ITurretConfiguration | undefined {
    // Check if vehicle has a turret by looking for turret equipment
    const hasTurretEquipment =
      document.equipmentByLocation['Turret']?.length > 0 ||
      document.equipmentByLocation['Turret Equipment']?.length > 0;

    // Check raw tags for turret type
    const rawTags = document.rawTags || {};
    const turretType = this.getStringFromRaw(rawTags, 'turrettype');

    if (!hasTurretEquipment && !turretType) {
      return undefined;
    }

    // Determine turret type
    let type = TurretType.SINGLE;
    if (turretType?.toLowerCase() === 'dual') {
      type = TurretType.DUAL;
    } else if (turretType?.toLowerCase() === 'chin') {
      type = TurretType.CHIN;
    }

    // Calculate turret weight (simplified - full calculation would need equipment data)
    const turretWeightFraction = 0.1; // 10% of weapons in turret typically
    const maxWeight = document.tonnage * turretWeightFraction;

    return {
      type,
      maxWeight,
      currentWeight: 0, // Would be calculated from actual equipment
      rotationArc: 360,
    };
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(document: IBlkDocument): readonly IVehicleMountedEquipment[] {
    const equipment: IVehicleMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(document.equipmentByLocation)) {
      const location = this.normalizeLocation(locationKey);
      const isTurretMounted = locationKey.toLowerCase().includes('turret');

      for (const item of items) {
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          location,
          isRearMounted: false,
          isTurretMounted,
          isSponsonMounted: false,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to VehicleLocation enum
   */
  private normalizeLocation(locationKey: string): VehicleLocation {
    const normalized = locationKey.toLowerCase().replace(' equipment', '');
    switch (normalized) {
      case 'front':
        return VehicleLocation.FRONT;
      case 'left':
      case 'left side':
        return VehicleLocation.LEFT;
      case 'right':
      case 'right side':
        return VehicleLocation.RIGHT;
      case 'rear':
        return VehicleLocation.REAR;
      case 'turret':
        return VehicleLocation.TURRET;
      case 'body':
      default:
        return VehicleLocation.BODY;
    }
  }

  /**
   * Calculate maximum armor points for vehicle tonnage
   * Vehicles: tonnage * 3.5 for standard armor (rounded down)
   */
  private calculateMaxArmor(tonnage: number): number {
    return Math.floor(tonnage * 3.5);
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): string | undefined {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Combine common and vehicle-specific fields into IVehicle
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IVehicle>
  ): IVehicle {
    // Determine weight class
    const weightClass = this.getWeightClass(commonFields.tonnage);

    // Parse tech base from type string
    const techBase = this.parseTechBase(commonFields.techBase);

    // Parse rules level from type string
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `vehicle-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.VEHICLE,
      tonnage: commonFields.tonnage,
      weightClass,

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

      // Calculated values (will be recalculated)
      bv: 0,
      cost: 0,
      totalWeight: commonFields.tonnage, // Placeholder
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // Vehicle-specific fields
      ...typeSpecificFields,
    } as IVehicle;
  }

  /**
   * Determine weight class from tonnage
   */
  private getWeightClass(tonnage: number): WeightClass {
    if (tonnage <= 35) return WeightClass.LIGHT;
    if (tonnage <= 55) return WeightClass.MEDIUM;
    if (tonnage <= 75) return WeightClass.HEAVY;
    return WeightClass.ASSAULT;
  }

  /**
   * Parse tech base from type string
   * Note: Mixed tech units default to Inner Sphere component tech base
   * per spec VAL-ENUM-004 (components have binary tech base)
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
    if (lower.includes('level 4') || lower.includes('experimental')) {
      return RulesLevel.EXPERIMENTAL;
    }
    return RulesLevel.STANDARD;
  }

  /**
   * Serialize vehicle-specific fields
   */
  protected serializeTypeSpecificFields(unit: IVehicle): Partial<ISerializedUnit> {
    // Vehicle-specific serialization would go here
    // For now, return empty as full serialization is complex
    return {
      configuration: unit.motionType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IVehicle> {
    // Full deserialization would require mapping all serialized fields back
    return createFailureResult(['Vehicle deserialization not yet implemented']);
  }

  /**
   * Validate vehicle-specific rules
   */
  protected validateTypeSpecificRules(unit: IVehicle): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage limits
    if (unit.tonnage < 1) {
      errors.push('Vehicle tonnage must be at least 1 ton');
    }
    if (unit.tonnage > 100 && !unit.isSuperheavy) {
      errors.push('Vehicles over 100 tons must be marked as superheavy');
    }
    if (unit.tonnage > 200) {
      errors.push('Vehicle tonnage cannot exceed 200 tons');
    }

    // Movement validation
    if (unit.movement.cruiseMP < 1 && !unit.isTrailer) {
      errors.push('Non-trailer vehicles must have at least 1 cruise MP');
    }

    // Armor validation
    if (unit.totalArmorPoints > unit.maxArmorPoints) {
      errors.push(
        `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`
      );
    }

    // Turret validation
    if (unit.turret && unit.turret.currentWeight > unit.turret.maxWeight) {
      errors.push('Turret weight exceeds maximum capacity');
    }

    // Motion type specific validations
    if (unit.motionType === GroundMotionType.HOVER && unit.tonnage > 50) {
      warnings.push('Hover vehicles over 50 tons are rare');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate vehicle weight
   */
  protected calculateTypeSpecificWeight(unit: IVehicle): number {
    let weight = 0;

    // Engine weight (simplified calculation)
    // Engine Rating = Cruise MP × Tonnage
    // Engine Weight depends on engine type
    const engineRating = unit.movement.cruiseMP * unit.tonnage;
    const engineMultiplier = this.getEngineWeightMultiplier(unit.engineType);
    weight += Math.ceil((engineRating / 10) * engineMultiplier * 10) / 10;

    // Structural weight (10% of tonnage for most vehicles)
    weight += unit.tonnage * 0.1;

    // Armor weight (1 point = 0.0625 tons for standard armor)
    const armorPointsPerTon = 16; // Standard armor
    weight += unit.totalArmorPoints / armorPointsPerTon;

    // Turret weight (10% of turret-mounted weapons)
    if (unit.turret) {
      weight += unit.turret.currentWeight * 0.1;
    }

    // Equipment weight would be added here

    return weight;
  }

  /**
   * Get engine weight multiplier based on type
   */
  private getEngineWeightMultiplier(engineType: number): number {
    // Engine type codes:
    // 0 = Fusion, 1 = XL, 2 = XXL, 3 = Compact, 4 = Light
    // 5 = ICE, 6 = Fuel Cell, 7 = Fission
    switch (engineType) {
      case 0:
        return 1.0; // Fusion
      case 1:
        return 0.5; // XL
      case 2:
        return 0.33; // XXL
      case 3:
        return 1.5; // Compact
      case 4:
        return 0.75; // Light
      case 5:
        return 2.0; // ICE
      case 6:
        return 1.2; // Fuel Cell
      case 7:
        return 1.75; // Fission
      default:
        return 1.0;
    }
  }

  /**
   * Calculate vehicle BV
   */
  protected calculateTypeSpecificBV(unit: IVehicle): number {
    // Simplified BV calculation
    // Full calculation would involve weapon BV, armor BV, movement modifiers
    let bv = 0;

    // Base armor BV (2.5 points per armor point for vehicles)
    bv += unit.totalArmorPoints * 2.5;

    // Movement modifier (higher MP = higher BV)
    const movementMod = 1 + (unit.movement.cruiseMP - 1) * 0.1;
    bv *= movementMod;

    // Equipment BV would be added here

    return Math.round(bv);
  }

  /**
   * Calculate vehicle cost
   */
  protected calculateTypeSpecificCost(unit: IVehicle): number {
    // Simplified cost calculation
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 10000;

    // Engine cost (varies by type)
    const engineRating = unit.movement.cruiseMP * unit.tonnage;
    cost += engineRating * 5000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // Equipment cost would be added here

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create and optionally register the vehicle handler
 */
export function createVehicleHandler(): VehicleUnitHandler {
  return new VehicleUnitHandler();
}
