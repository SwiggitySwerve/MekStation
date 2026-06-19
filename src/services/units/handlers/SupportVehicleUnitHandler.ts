/**
 * Support Vehicle Unit Handler
 *
 * Handler for parsing, validating, and serializing Support Vehicles.
 * Support vehicles are non-combat or lightly-armed vehicles used for logistics,
 * construction, and other support roles.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  GroundMotionType,
  IGroundMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import {
  ISupportVehicle,
  IVehicleMountedEquipment,
  SupportVehicleSizeClass,
} from '@/types/unit/VehicleInterfaces';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getRawTagNumber,
  getVehicleWeightClass,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

/**
 * Motion type string to enum mapping for support vehicles
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
  airship: GroundMotionType.HOVER, // Airships use hover movement
  fixed: GroundMotionType.TRACKED, // Fixed-wing uses tracked as placeholder
};

const VEHICLE_LOCATION_MAP: Record<string, VehicleLocation> = {
  front: VehicleLocation.FRONT,
  left: VehicleLocation.LEFT,
  'left side': VehicleLocation.LEFT,
  right: VehicleLocation.RIGHT,
  'right side': VehicleLocation.RIGHT,
  rear: VehicleLocation.REAR,
  turret: VehicleLocation.TURRET,
  body: VehicleLocation.BODY,
};

// ============================================================================
// Support Vehicle Unit Handler
// ============================================================================

/**
 * Handler for support vehicle units
 */
export class SupportVehicleUnitHandler extends AbstractUnitTypeHandler<ISupportVehicle> {
  readonly unitType = UnitType.SUPPORT_VEHICLE;
  readonly displayName = 'Support Vehicle';

  /**
   * Get available locations for support vehicles
   */
  getLocations(): readonly string[] {
    return Object.values(VehicleLocation);
  }

  /**
   * Parse support vehicle-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<ISupportVehicle> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // Motion type
    const motionTypeStr = document.motionType?.toLowerCase() || 'wheeled';
    const motionType =
      MOTION_TYPE_MAP[motionTypeStr] || GroundMotionType.WHEELED;

    // Movement (support vehicles can have 0 MP for stationary types)
    // Audit 2026-06-09 C-14: flank MP rounds UP — MegaMek Entity.getRunMP is
    // ceil(walk MP * 1.5) (Tank inherits it) and the project's own BLK Python
    // converter (blk_vehicle_converter.py) uses math.ceil.
    const cruiseMP = document.cruiseMP || 0;
    const flankMP = cruiseMP > 0 ? Math.ceil(cruiseMP * 1.5) : 0;
    const jumpMP = document.jumpingMP || 0;
    const movement: IGroundMovement = { cruiseMP, flankMP, jumpMP };

    // Engine
    const engineType = document.engineType || 0;
    const engineRating = cruiseMP * document.tonnage;

    // Armor (support vehicles use BAR - Barrier Armor Rating)
    const armorType = document.armorType || 0;
    const armor = document.armor || [];
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // BAR rating (0-10, determines armor per point)
    const rawTags = document.rawTags || {};
    const barRating = this.parseBarRating(rawTags);

    // Size class
    const sizeClass = this.determineSizeClass(document.tonnage);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Cargo capacity
    const cargoCapacity = this.parseCargoCapacity(document);

    // Crew and passengers
    const crewSize = document.crew || 1;
    const passengerCapacity = document.passengers || 0;

    // Tech ratings
    const structuralTechRating =
      this.parseNumericRaw(rawTags, 'structuraltechrating') || 5;
    const armorTechRating =
      this.parseNumericRaw(rawTags, 'armortechrating') || 5;
    const engineTechRating =
      this.parseNumericRaw(rawTags, 'enginetechrating') || 5;

    return {
      unitType: UnitType.SUPPORT_VEHICLE,
      motionType,
      movement,
      engineType,
      engineRating,
      armorType,
      armor,
      totalArmorPoints,
      maxArmorPoints: this.calculateMaxArmor(document.tonnage, barRating),
      equipment,
      sizeClass,
      barRating,
      cargoCapacity,
      crewSize,
      passengerCapacity,
      structuralTechRating,
      armorTechRating,
      engineTechRating,
      errors,
      warnings,
    };
  }

  /**
   * Parse BAR rating from raw tags
   */
  private parseBarRating(rawTags: Record<string, string | string[]>): number {
    const barStr = rawTags['bar'] || rawTags['barrating'];
    if (Array.isArray(barStr)) {
      return parseInt(barStr[0], 10) || 5;
    }
    return parseInt(String(barStr), 10) || 5;
  }

  /**
   * Parse numeric value from raw tags
   */
  private parseNumericRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): number {
    return getRawTagNumber(rawTags, key);
  }

  /**
   * Determine size class from tonnage
   */
  private determineSizeClass(tonnage: number): SupportVehicleSizeClass {
    if (tonnage <= 5) return SupportVehicleSizeClass.SMALL;
    if (tonnage <= 80) return SupportVehicleSizeClass.MEDIUM;
    return SupportVehicleSizeClass.LARGE;
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IVehicleMountedEquipment[] {
    const equipment: IVehicleMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(
      document.equipmentByLocation,
    )) {
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
   * Normalize location string to VehicleLocation enum
   */
  private normalizeLocation(locationKey: string): VehicleLocation {
    const normalized = locationKey.toLowerCase().replace(' equipment', '');
    return VEHICLE_LOCATION_MAP[normalized] || VehicleLocation.BODY;
  }

  /**
   * Calculate maximum armor points for support vehicle
   * Support vehicles use BAR rating to determine armor effectiveness
   */
  private calculateMaxArmor(tonnage: number, barRating: number): number {
    // BAR armor provides less protection per point
    // Standard is BAR 10 = full armor, BAR 5 = half effectiveness
    const armorMultiplier = barRating / 10;
    return Math.floor(tonnage * 3.5 * armorMultiplier);
  }

  /**
   * Combine common and support vehicle-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<ISupportVehicle>,
  ): ISupportVehicle {
    const weightClass = getVehicleWeightClass(commonFields.tonnage);

    return combineCommonUnitFields<ISupportVehicle>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'support-vehicle',
      unitType: UnitType.SUPPORT_VEHICLE,
      weightClass,
    });
  }

  /**
   * Serialize support vehicle-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: ISupportVehicle,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel(
      `Support Vehicle (${unit.sizeClass})`,
      unit.rulesLevel,
    );
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<ISupportVehicle> {
    return createFailureResult([
      'Support Vehicle deserialization not yet implemented',
    ]);
  }

  /**
   * Validate support vehicle-specific rules
   */
  protected validateTypeSpecificRules(
    unit: ISupportVehicle,
  ): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    // Tonnage validation by size class
    if (unit.sizeClass === SupportVehicleSizeClass.SMALL && unit.tonnage > 5) {
      errors.push('Small support vehicles cannot exceed 5 tons');
    }
    if (
      unit.sizeClass === SupportVehicleSizeClass.MEDIUM &&
      unit.tonnage > 80
    ) {
      errors.push('Medium support vehicles cannot exceed 80 tons');
    }
    if (
      unit.sizeClass === SupportVehicleSizeClass.LARGE &&
      unit.tonnage > 300
    ) {
      errors.push('Large support vehicles cannot exceed 300 tons');
    }

    // BAR rating validation
    if (unit.barRating < 1 || unit.barRating > 10) {
      errors.push('BAR rating must be between 1 and 10');
    }

    // Armor validation
    if (unit.totalArmorPoints > unit.maxArmorPoints) {
      errors.push(
        `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
      );
    }

    // Cargo capacity info
    if (unit.cargoCapacity > 0) {
      infos.push(`Vehicle has ${unit.cargoCapacity} tons of cargo capacity`);
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate support vehicle weight
   */
  protected calculateTypeSpecificWeight(unit: ISupportVehicle): number {
    let weight = 0;

    // Engine weight (support vehicles use ICE typically)
    if (unit.movement.cruiseMP > 0) {
      const engineRating = unit.movement.cruiseMP * unit.tonnage;
      weight += engineRating * 0.08; // ICE engines are heavier
    }

    // Structural weight (less than combat vehicles)
    weight += unit.tonnage * 0.08;

    // Armor weight (BAR armor weighs less)
    const armorWeightPerPoint = 0.0625 * (unit.barRating / 10);
    weight += unit.totalArmorPoints * armorWeightPerPoint;

    return weight;
  }

  /**
   * Calculate support vehicle BV
   */
  protected calculateTypeSpecificBV(unit: ISupportVehicle): number {
    // Support vehicles have minimal BV
    let bv = 0;

    // Armor BV (reduced by BAR rating)
    bv += unit.totalArmorPoints * 1.5 * (unit.barRating / 10);

    // Movement modifier
    if (unit.movement.cruiseMP > 0) {
      bv *= 1 + unit.movement.cruiseMP * 0.05;
    }

    return Math.round(bv);
  }

  /**
   * Calculate support vehicle cost
   */
  protected calculateTypeSpecificCost(unit: ISupportVehicle): number {
    // Support vehicles are cheaper than combat vehicles
    let cost = 0;

    // Base chassis cost
    cost += unit.tonnage * 5000;

    // Engine cost (if mobile)
    if (unit.movement.cruiseMP > 0) {
      const engineRating = unit.movement.cruiseMP * unit.tonnage;
      cost += engineRating * 2000;
    }

    // Armor cost (cheaper BAR armor)
    cost += unit.totalArmorPoints * 5000 * (unit.barRating / 10);

    // Cargo capacity cost
    cost += unit.cargoCapacity * 1000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create Support Vehicle handler instance
 */
export function createSupportVehicleHandler(): SupportVehicleUnitHandler {
  return new SupportVehicleUnitHandler();
}
