/**
 * Space Station Unit Handler
 *
 * Handler for parsing, validating, and serializing Space Station units.
 * Space stations are large orbital or deep-space installations, typically immobile.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { CapitalShipLocation } from '@/types/construction/UnitLocation';
import { TechBase, Era, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  BayType,
  QuartersType,
  CapitalArc,
} from '@/types/unit/CapitalShipInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Space Station Interface
// ============================================================================

/**
 * Space station type
 */
export enum SpaceStationType {
  ORBITAL = 'Orbital',
  DEEP_SPACE = 'Deep Space',
  RECHARGE_STATION = 'Recharge Station',
  SHIPYARD = 'Shipyard',
  HABITAT = 'Habitat',
  MILITARY = 'Military',
}

/**
 * Space Station unit interface
 */
export interface ISpaceStation extends IBaseUnit {
  readonly unitType: UnitType.SPACE_STATION;
  readonly motionType: AerospaceMotionType.SPHEROID;
  readonly stationType: SpaceStationType;
  readonly movement: IAerospaceMovement;
  readonly fuel: number;
  readonly structuralIntegrity: number;
  readonly heatSinks: number;
  readonly heatSinkType: number;
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
  readonly dockingCollars: number;
  readonly gravDecks: number;
  readonly crewConfiguration: ICapitalCrewConfiguration;
  readonly transportBays: readonly ITransportBay[];
  readonly quarters: readonly ICrewQuarters[];
  readonly equipment: readonly ICapitalMountedEquipment[];
  readonly escapePods: number;
  readonly lifeBoats: number;
  readonly hasHPG: boolean;
  readonly hasKFDrive: boolean;
  readonly pressurizedModules: number;
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
// Space Station Unit Handler
// ============================================================================

/**
 * Handler for Space Station units
 */
export class SpaceStationUnitHandler extends AbstractUnitTypeHandler<ISpaceStation> {
  readonly unitType = UnitType.SPACE_STATION;
  readonly displayName = 'Space Station';

  /**
   * Get available locations for Space Stations
   */
  getLocations(): readonly string[] {
    return Object.values(CapitalShipLocation);
  }

  /**
   * Parse Space Station-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<ISpaceStation> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Space stations are always spheroid (or modular)
    const motionType = AerospaceMotionType.SPHEROID;

    // Movement - space stations typically have minimal or no thrust
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

    // Armor
    const armorType = document.armorType || 0;
    const armor = document.armor || [];
    const armorByArc = this.parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Station type
    const rawTags = document.rawTags || {};
    const stationType = this.parseStationType(rawTags);

    // Docking collars
    const dockingCollars = this.parseNumericRaw(rawTags, 'dockingcollars') || 0;

    // Grav decks
    const gravDecks = this.parseNumericRaw(rawTags, 'gravdecks') || 0;

    // HPG
    const hasHPG = this.getBooleanFromRaw(rawTags, 'hpg');

    // K-F Drive (rare for stations but possible)
    const hasKFDrive = this.getBooleanFromRaw(rawTags, 'kfdrive');

    // Pressurized modules
    const pressurizedModules =
      this.parseNumericRaw(rawTags, 'pressurizedmodules') || 1;

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

    // Tonnage validation (Space Stations: 5,000+ tons typically)
    if (document.tonnage < 5000) {
      warnings.push('Space stations are typically at least 5,000 tons');
    }

    return {
      unitType: UnitType.SPACE_STATION,
      motionType,
      stationType,
      movement,
      fuel,
      structuralIntegrity,
      heatSinks,
      heatSinkType,
      armorType,
      armor,
      armorByArc,
      totalArmorPoints,
      dockingCollars,
      gravDecks,
      hasHPG,
      hasKFDrive,
      pressurizedModules,
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
   * Parse station type from raw tags
   */
  private parseStationType(
    rawTags: Record<string, string | string[]>,
  ): SpaceStationType {
    const typeStr =
      this.getStringFromRaw(rawTags, 'stationtype')?.toLowerCase() || '';

    if (typeStr.includes('shipyard')) return SpaceStationType.SHIPYARD;
    if (typeStr.includes('recharge')) return SpaceStationType.RECHARGE_STATION;
    if (typeStr.includes('habitat')) return SpaceStationType.HABITAT;
    if (typeStr.includes('military') || typeStr.includes('defense'))
      return SpaceStationType.MILITARY;
    if (typeStr.includes('deep')) return SpaceStationType.DEEP_SPACE;

    return SpaceStationType.ORBITAL;
  }

  /**
   * Get string from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): string | undefined {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Parse crew configuration
   */
  private parseCrewConfiguration(
    document: IBlkDocument,
  ): ICapitalCrewConfiguration {
    return {
      crew: document.crew || 0,
      officers: document.officers || 0,
      gunners: document.gunners || 0,
      pilots: 0, // Stations don't have pilots
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
    bayNumber: number,
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
  private parseEquipment(
    document: IBlkDocument,
  ): readonly ICapitalMountedEquipment[] {
    const equipment: ICapitalMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(
      document.equipmentByLocation,
    )) {
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
  private parseNumericRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): number {
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
    key: string,
  ): boolean {
    const value = rawTags[key];
    if (value === undefined) return false;
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and Space Station-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<ISpaceStation>,
  ): ISpaceStation {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `space-station-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.SPACE_STATION,
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

      // Space Station-specific fields
      ...typeSpecificFields,
    } as ISpaceStation;
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
   * Serialize Space Station-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: ISpaceStation,
  ): Partial<ISerializedUnit> {
    return {
      configuration: `Space Station (${unit.stationType})`,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<ISpaceStation> {
    return createFailureResult([
      'Space Station deserialization not yet implemented',
    ]);
  }

  /**
   * Validate Space Station-specific rules
   */
  protected validateTypeSpecificRules(unit: ISpaceStation): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // SI validation
    if (unit.structuralIntegrity < 1) {
      errors.push('Space station must have at least 1 SI');
    }

    // Crew validation
    if (unit.crewConfiguration.crew < 1) {
      warnings.push('Space station has no crew assigned');
    }

    // Escape capacity check
    const totalPersonnel =
      unit.crewConfiguration.crew +
      unit.crewConfiguration.passengers +
      unit.crewConfiguration.marines;
    const escapeCapacity = unit.escapePods * 7 + unit.lifeBoats * 6;
    if (escapeCapacity < totalPersonnel && totalPersonnel > 0) {
      warnings.push(
        `Insufficient escape capacity (${escapeCapacity}) for personnel (${totalPersonnel})`,
      );
    }

    // Station type info
    infos.push(`Station type: ${unit.stationType}`);

    // HPG info
    if (unit.hasHPG) {
      infos.push('Station has HPG capabilities');
    }

    // K-F Drive info
    if (unit.hasKFDrive) {
      infos.push('Station has K-F drive (mobile station)');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate Space Station weight
   */
  protected calculateTypeSpecificWeight(unit: ISpaceStation): number {
    return unit.tonnage;
  }

  /**
   * Calculate Space Station BV
   */
  protected calculateTypeSpecificBV(unit: ISpaceStation): number {
    let bv = 0;

    // Armor BV
    bv += unit.totalArmorPoints * 2;

    // SI contributes
    bv += unit.structuralIntegrity * 25;

    // Docking collar capacity
    bv += unit.dockingCollars * 40;

    // Transport bays
    for (const bay of unit.transportBays) {
      bv += bay.capacity * 3;
    }

    return Math.round(bv);
  }

  /**
   * Calculate Space Station cost
   */
  protected calculateTypeSpecificCost(unit: ISpaceStation): number {
    let cost = 0;

    // Base cost per ton
    cost += unit.tonnage * 50000;

    // Pressurized modules
    cost += unit.pressurizedModules * 500000;

    // Grav decks
    cost += unit.gravDecks * 1000000;

    // Docking collars
    cost += unit.dockingCollars * 1000000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // HPG
    if (unit.hasHPG) {
      cost += 500000000; // HPGs are extremely expensive
    }

    // K-F Drive
    if (unit.hasKFDrive) {
      cost += unit.tonnage * 100000;
    }

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create Space Station handler instance
 */
export function createSpaceStationHandler(): SpaceStationUnitHandler {
  return new SpaceStationUnitHandler();
}
