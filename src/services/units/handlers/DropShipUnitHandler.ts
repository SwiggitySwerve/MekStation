/**
 * DropShip Unit Handler
 *
 * Handler for parsing, validating, and serializing DropShip units.
 * DropShips are large aerospace transport craft capable of planetary landing.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.7
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IDropShip,
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  DropShipDesignType,
  BayType,
  QuartersType,
  CapitalArc,
} from '../../../types/unit/CapitalShipInterfaces';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '../../../types/unit/BaseUnitInterfaces';
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
 * DropShip armor arc order for array parsing
 */
const _DROPSHIP_ARMOR_ARCS = [
  'nose',
  'frontLeftSide',
  'frontRightSide',
  'aftLeftSide',
  'aftRightSide',
  'aft',
] as const;

/**
 * Map location strings to CapitalArc enum
 */
const ARC_MAP: Record<string, CapitalArc> = {
  nose: CapitalArc.NOSE,
  'nose equipment': CapitalArc.NOSE,
  'front left': CapitalArc.FRONT_LEFT,
  'fl equipment': CapitalArc.FRONT_LEFT,
  'front right': CapitalArc.FRONT_RIGHT,
  'fr equipment': CapitalArc.FRONT_RIGHT,
  'aft left': CapitalArc.AFT_LEFT,
  'al equipment': CapitalArc.AFT_LEFT,
  'aft right': CapitalArc.AFT_RIGHT,
  'ar equipment': CapitalArc.AFT_RIGHT,
  aft: CapitalArc.AFT,
  'aft equipment': CapitalArc.AFT,
  'left side': CapitalArc.FRONT_LEFT,
  'right side': CapitalArc.FRONT_RIGHT,
};

// ============================================================================
// DropShip Unit Handler
// ============================================================================

/**
 * Handler for DropShip units
 */
export class DropShipUnitHandler extends AbstractUnitTypeHandler<IDropShip> {
  readonly unitType = UnitType.DROPSHIP;
  readonly displayName = 'DropShip';

  /**
   * Get available locations for DropShips
   */
  getLocations(): readonly string[] {
    return Object.values(CapitalArc);
  }

  /**
   * Parse DropShip-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IDropShip> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Motion type (aerodyne or spheroid)
    const motionTypeStr = document.motionType?.toLowerCase() || 'spheroid';
    const motionType =
      motionTypeStr === 'aerodyne'
        ? AerospaceMotionType.AERODYNE
        : AerospaceMotionType.SPHEROID;

    // Design type
    const designTypeCode = document.designType || 0;
    const designType =
      designTypeCode === 1
        ? DropShipDesignType.CIVILIAN
        : DropShipDesignType.MILITARY;

    // Movement - thrust values
    const safeThrust = document.safeThrust || 0;
    const maxThrust = Math.floor(safeThrust * 1.5);
    const movement: IAerospaceMovement = { safeThrust, maxThrust };

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

    // Docking collar
    const rawTags = document.rawTags || {};
    const hasDockingCollar = this.getBooleanFromRaw(rawTags, 'dockingcollar') ?? true;

    // Crew configuration
    const crewConfiguration = this.parseCrewConfiguration(document);

    // Transport bays
    const transportBays = this.parseTransportBays(document);

    // Crew quarters
    const quarters = this.parseQuarters(document);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Escape pods and life boats
    const escapePods = document.escapePod || 0;
    const lifeBoats = document.lifeBoat || 0;

    return {
      unitType: UnitType.DROPSHIP,
      motionType,
      designType,
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
      hasDockingCollar,
      crewConfiguration,
      transportBays,
      quarters,
      equipment,
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
    frontLeftSide: number;
    frontRightSide: number;
    aftLeftSide: number;
    aftRightSide: number;
    aft: number;
  } {
    return {
      nose: armor[0] || 0,
      frontLeftSide: armor[1] || 0,
      frontRightSide: armor[2] || 0,
      aftLeftSide: armor[3] || 0,
      aftRightSide: armor[4] || 0,
      aft: armor[5] || 0,
    };
  }

  /**
   * Parse crew configuration from document
   */
  private parseCrewConfiguration(document: IBlkDocument): ICapitalCrewConfiguration {
    return {
      crew: document.crew || 0,
      officers: document.officers || 0,
      gunners: document.gunners || 0,
      pilots: 2, // Default
      marines: document.marines || 0,
      battleArmor: document.battlearmor || 0,
      passengers: document.passengers || 0,
      other: document.otherpassenger || 0,
    };
  }

  /**
   * Parse transport bays from document
   */
  private parseTransportBays(document: IBlkDocument): readonly ITransportBay[] {
    const bays: ITransportBay[] = [];
    const transporters = document.transporters || [];
    let bayNumber = 1;

    for (const transporter of transporters) {
      const parsed = this.parseTransporterString(transporter, bayNumber);
      if (parsed) {
        bays.push(parsed);
        bayNumber++;
      }
    }

    return bays;
  }

  /**
   * Parse a transporter string into ITransportBay
   * Format examples: "mechbay:4", "cargobay:100.0:1", "infantrybay:28:2"
   */
  private parseTransporterString(
    transporter: string,
    bayNumber: number
  ): ITransportBay | null {
    const lower = transporter.toLowerCase();
    const parts = lower.split(':');

    if (parts.length < 2) return null;

    const typeStr = parts[0];
    const capacity = parseFloat(parts[1]) || 0;
    const doors = parts.length > 2 ? parseInt(parts[2], 10) : 1;

    let type: BayType;
    if (typeStr.includes('mech')) {
      type = BayType.MECH;
    } else if (typeStr.includes('vehicle') || typeStr.includes('light')) {
      type = BayType.VEHICLE;
    } else if (typeStr.includes('infantry')) {
      type = BayType.INFANTRY;
    } else if (typeStr.includes('battlearmor') || typeStr.includes('ba')) {
      type = BayType.BATTLE_ARMOR;
    } else if (typeStr.includes('fighter') || typeStr.includes('asf')) {
      type = BayType.FIGHTER;
    } else if (typeStr.includes('smallcraft')) {
      type = BayType.SMALL_CRAFT;
    } else if (typeStr.includes('cargo')) {
      type = BayType.CARGO;
    } else {
      type = BayType.CARGO;
    }

    return { type, capacity, doors, bayNumber };
  }

  /**
   * Parse crew quarters from document
   */
  private parseQuarters(document: IBlkDocument): readonly ICrewQuarters[] {
    // Simplified - derive from crew count
    const quarters: ICrewQuarters[] = [];
    const crew = document.crew || 0;
    const passengers = document.passengers || 0;

    if (crew > 0) {
      quarters.push({ type: QuartersType.CREW, capacity: crew });
    }
    if (passengers > 0) {
      quarters.push({ type: QuartersType.STEERAGE, capacity: passengers });
    }

    return quarters;
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(document: IBlkDocument): readonly ICapitalMountedEquipment[] {
    const equipment: ICapitalMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(document.equipmentByLocation)) {
      const arc = this.normalizeArc(locationKey);

      for (const item of items) {
        const isCapital = this.isCapitalWeapon(item);
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          arc,
          isCapital,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to CapitalArc enum
   */
  private normalizeArc(locationKey: string): CapitalArc {
    const normalized = locationKey.toLowerCase();
    return ARC_MAP[normalized] || CapitalArc.NOSE;
  }

  /**
   * Check if weapon is capital-scale
   */
  private isCapitalWeapon(weaponName: string): boolean {
    const lower = weaponName.toLowerCase();
    return (
      lower.includes('naval') ||
      lower.includes('capital') ||
      lower.includes('mass driver') ||
      lower.includes('kraken') ||
      lower.includes('killer whale') ||
      lower.includes('white shark') ||
      lower.includes('barracuda')
    );
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean | undefined {
    const value = rawTags[key];
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and DropShip-specific fields into IDropShip
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IDropShip>
  ): IDropShip {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    // DropShips use assault weight class (all are 200+ tons)
    const weightClass = WeightClass.ASSAULT;

    return {
      // Identity
      id: `dropship-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.DROPSHIP,
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

      // Calculated values
      bv: 0,
      cost: 0,
      totalWeight: commonFields.tonnage,
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // DropShip-specific fields
      ...typeSpecificFields,
    } as IDropShip;
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
   * Serialize DropShip-specific fields
   */
  protected serializeTypeSpecificFields(unit: IDropShip): Partial<ISerializedUnit> {
    return {
      configuration: unit.motionType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IDropShip> {
    return createFailureResult(['DropShip deserialization not yet implemented']);
  }

  /**
   * Validate DropShip-specific rules
   */
  protected validateTypeSpecificRules(unit: IDropShip): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage validation (DropShips: 200-100,000 tons)
    if (unit.tonnage < 200) {
      errors.push('DropShip tonnage must be at least 200 tons');
    }
    if (unit.tonnage > 100000) {
      errors.push('DropShip tonnage cannot exceed 100,000 tons');
    }

    // Thrust validation
    if (unit.movement.safeThrust < 1) {
      errors.push('DropShip must have at least 1 safe thrust');
    }

    // SI validation
    if (unit.structuralIntegrity < 1) {
      errors.push('DropShip must have at least 1 SI');
    }

    // Crew validation
    if (unit.crewConfiguration.crew < 1) {
      warnings.push('DropShip has no crew assigned');
    }

    // Escape pod check
    const totalPersonnel =
      unit.crewConfiguration.crew +
      unit.crewConfiguration.passengers +
      unit.crewConfiguration.marines;
    const escapeCapacity = unit.escapePods * 7 + unit.lifeBoats * 6;
    if (escapeCapacity < totalPersonnel) {
      warnings.push(
        `Insufficient escape capacity (${escapeCapacity}) for personnel (${totalPersonnel})`
      );
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate DropShip weight
   */
  protected calculateTypeSpecificWeight(unit: IDropShip): number {
    // DropShip weight calculation is complex
    // Simplified version for now
    return unit.tonnage;
  }

  /**
   * Calculate DropShip BV
   */
  protected calculateTypeSpecificBV(unit: IDropShip): number {
    let bv = 0;

    // Base BV from armor
    bv += unit.totalArmorPoints * 2;

    // SI contributes
    bv += unit.structuralIntegrity * 20;

    // Transport capacity adds
    for (const bay of unit.transportBays) {
      bv += bay.capacity * 5;
    }

    // Thrust modifier
    bv *= 1 + unit.movement.safeThrust * 0.1;

    return Math.round(bv);
  }

  /**
   * Calculate DropShip cost
   */
  protected calculateTypeSpecificCost(unit: IDropShip): number {
    // Base cost per ton varies by design type
    const baseCostPerTon =
      unit.designType === DropShipDesignType.MILITARY ? 50000 : 30000;

    let cost = unit.tonnage * baseCostPerTon;

    // Add transport bay costs
    for (const bay of unit.transportBays) {
      switch (bay.type) {
        case BayType.MECH:
          cost += bay.capacity * 1000000;
          break;
        case BayType.FIGHTER:
          cost += bay.capacity * 500000;
          break;
        case BayType.VEHICLE:
          cost += bay.capacity * 250000;
          break;
        case BayType.INFANTRY:
          cost += bay.capacity * 50000;
          break;
        default:
          cost += bay.capacity * 10000;
      }
    }

    return Math.round(cost);
  }
}

/**
 * Create DropShip handler instance
 */
export function createDropShipHandler(): DropShipUnitHandler {
  return new DropShipUnitHandler();
}
