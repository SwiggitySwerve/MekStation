/**
 * JumpShip Unit Handler
 *
 * Handler for parsing, validating, and serializing JumpShip units.
 * JumpShips are large interstellar transport vessels equipped with Kearny-Fuchida drives.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  BayType,
  QuartersType,
  CapitalArc,
} from '../../../types/unit/CapitalShipInterfaces';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { CapitalShipLocation } from '../../../types/construction/UnitLocation';
import { IUnitParseResult } from '../../../types/unit/UnitTypeHandler';
import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import { IBaseUnit } from '../../../types/unit/BaseUnitInterfaces';

// ============================================================================
// JumpShip Interface
// ============================================================================

/**
 * JumpShip unit interface
 */
export interface IJumpShip extends IBaseUnit {
  readonly unitType: UnitType.JUMPSHIP;
  readonly motionType: AerospaceMotionType;
  readonly movement: IAerospaceMovement;
  readonly fuel: number;
  readonly structuralIntegrity: number;
  readonly heatSinks: number;
  readonly heatSinkType: number;
  readonly engineType: number;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
  };
  readonly totalArmorPoints: number;
  readonly kfDrive: {
    readonly rating: number;
    readonly integrityPoints: number;
    readonly hasDriveCore: boolean;
    readonly hasLithiumFusion: boolean;
  };
  readonly dockingCollars: number;
  readonly crewConfiguration: ICapitalCrewConfiguration;
  readonly transportBays: readonly ITransportBay[];
  readonly quarters: readonly ICrewQuarters[];
  readonly equipment: readonly ICapitalMountedEquipment[];
  readonly escapePods: number;
  readonly lifeBoats: number;
  readonly gravDecks: number;
  readonly hpg?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

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
};

// ============================================================================
// JumpShip Unit Handler
// ============================================================================

/**
 * Handler for JumpShip units
 */
export class JumpShipUnitHandler extends AbstractUnitTypeHandler<IJumpShip> {
  readonly unitType = UnitType.JUMPSHIP;
  readonly displayName = 'JumpShip';

  /**
   * Get available locations for JumpShips
   */
  getLocations(): readonly string[] {
    return Object.values(CapitalShipLocation);
  }

  /**
   * Parse JumpShip-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IJumpShip> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // JumpShips are always spheroid
    const motionType = AerospaceMotionType.SPHEROID;

    // Movement - thrust values (JumpShips have minimal thrust)
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

    // K-F Drive
    const rawTags = document.rawTags || {};
    const kfDrive = this.parseKFDrive(rawTags, document.tonnage);

    // Docking collars
    const dockingCollars = this.parseNumericRaw(rawTags, 'dockingcollars') || 1;

    // Grav decks
    const gravDecks = this.parseNumericRaw(rawTags, 'gravdecks') || 0;

    // HPG
    const hpg = this.getBooleanFromRaw(rawTags, 'hpg');

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

    // Tonnage validation (JumpShips: 50,000+ tons)
    if (document.tonnage < 50000) {
      errors.push('JumpShip tonnage must be at least 50,000 tons');
    }

    return {
      unitType: UnitType.JUMPSHIP,
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
      kfDrive,
      dockingCollars,
      gravDecks,
      hpg,
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
   * Parse K-F Drive configuration
   */
  private parseKFDrive(
    rawTags: Record<string, string | string[]>,
    tonnage: number
  ): IJumpShip['kfDrive'] {
    const rating = this.parseNumericRaw(rawTags, 'kfrating') || Math.ceil(tonnage / 10000);
    const integrityPoints = this.parseNumericRaw(rawTags, 'kfintegrity') || 4;
    const hasDriveCore = true; // JumpShips always have K-F drive
    const hasLithiumFusion = this.getBooleanFromRaw(rawTags, 'lithiumfusion') || false;

    return { rating, integrityPoints, hasDriveCore, hasLithiumFusion };
  }

  /**
   * Parse crew configuration
   */
  private parseCrewConfiguration(document: IBlkDocument): ICapitalCrewConfiguration {
    return {
      crew: document.crew || 0,
      officers: document.officers || 0,
      gunners: document.gunners || 0,
      pilots: 2,
      marines: document.marines || 0,
      battleArmor: document.battlearmor || 0,
      passengers: document.passengers || 0,
      other: document.otherpassenger || 0,
    };
  }

  /**
   * Parse transport bays
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
    } else if (typeStr.includes('vehicle')) {
      type = BayType.VEHICLE;
    } else if (typeStr.includes('fighter') || typeStr.includes('asf')) {
      type = BayType.FIGHTER;
    } else if (typeStr.includes('smallcraft')) {
      type = BayType.SMALL_CRAFT;
    } else if (typeStr.includes('dropship')) {
      type = BayType.CARGO; // DropShip collars aren't bays
    } else if (typeStr.includes('cargo')) {
      type = BayType.CARGO;
    } else {
      type = BayType.CARGO;
    }

    return { type, capacity, doors, bayNumber };
  }

  /**
   * Parse crew quarters
   */
  private parseQuarters(document: IBlkDocument): readonly ICrewQuarters[] {
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
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          arc,
          isCapital: this.isCapitalWeapon(item),
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
      lower.includes('mass driver')
    );
  }

  /**
   * Parse numeric value from raw tags
   */
  private parseNumericRaw(rawTags: Record<string, string | string[]>, key: string): number {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return parseFloat(value[0]) || 0;
    }
    return parseFloat(String(value)) || 0;
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean {
    const value = rawTags[key];
    if (value === undefined) return false;
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and JumpShip-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IJumpShip>
  ): IJumpShip {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `jumpship-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.JUMPSHIP,
      tonnage: commonFields.tonnage,
      weightClass: WeightClass.ASSAULT,

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

      // JumpShip-specific fields
      ...typeSpecificFields,
    } as IJumpShip;
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
   * Serialize JumpShip-specific fields
   */
  protected serializeTypeSpecificFields(unit: IJumpShip): Partial<ISerializedUnit> {
    return {
      configuration: 'JumpShip',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(serialized: ISerializedUnit): IUnitParseResult<IJumpShip> {
    return createFailureResult(['JumpShip deserialization not yet implemented']);
  }

  /**
   * Validate JumpShip-specific rules
   */
  protected validateTypeSpecificRules(unit: IJumpShip): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage validation
    if (unit.tonnage < 50000) {
      errors.push('JumpShip tonnage must be at least 50,000 tons');
    }
    if (unit.tonnage > 500000) {
      errors.push('JumpShip tonnage cannot exceed 500,000 tons');
    }

    // K-F Drive validation
    if (!unit.kfDrive.hasDriveCore) {
      errors.push('JumpShip must have a K-F drive core');
    }

    // Docking collars
    if (unit.dockingCollars < 1) {
      warnings.push('JumpShip has no docking collars');
    }

    // Crew validation
    if (unit.crewConfiguration.crew < 1) {
      warnings.push('JumpShip has no crew assigned');
    }

    // Lithium-fusion battery info
    if (unit.kfDrive.hasLithiumFusion) {
      infos.push('JumpShip has Lithium-Fusion batteries for rapid recharge');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate JumpShip weight
   */
  protected calculateTypeSpecificWeight(unit: IJumpShip): number {
    // JumpShip weight is its tonnage
    return unit.tonnage;
  }

  /**
   * Calculate JumpShip BV
   */
  protected calculateTypeSpecificBV(unit: IJumpShip): number {
    let bv = 0;

    // Armor BV
    bv += unit.totalArmorPoints * 2;

    // SI contributes
    bv += unit.structuralIntegrity * 30;

    // K-F Drive value
    bv += unit.kfDrive.rating * 100;

    // Docking collar capacity
    bv += unit.dockingCollars * 50;

    return Math.round(bv);
  }

  /**
   * Calculate JumpShip cost
   */
  protected calculateTypeSpecificCost(unit: IJumpShip): number {
    let cost = 0;

    // Base cost per ton
    cost += unit.tonnage * 100000;

    // K-F Drive cost (extremely expensive)
    cost += unit.kfDrive.rating * 100000000;

    // Lithium-fusion batteries
    if (unit.kfDrive.hasLithiumFusion) {
      cost += unit.tonnage * 50000;
    }

    // Docking collars
    cost += unit.dockingCollars * 1000000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create JumpShip handler instance
 */
export function createJumpShipHandler(): JumpShipUnitHandler {
  return new JumpShipUnitHandler();
}
