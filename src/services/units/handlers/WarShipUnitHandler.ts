/**
 * WarShip Unit Handler
 *
 * Handler for parsing, validating, and serializing WarShip units.
 * WarShips are large military spacecraft with K-F jump drives.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.7
 */

import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import {
  IWarShip,
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  IGravityDeck,
  BayType,
  QuartersType,
  CapitalArc,
  KFDriveType,
} from '../../../types/unit/CapitalShipInterfaces';
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
 * WarShip armor arc order for array parsing (includes broadsides)
 */
const _WARSHIP_ARMOR_ARCS = [
  'nose',
  'frontLeftSide',
  'frontRightSide',
  'aftLeftSide',
  'aftRightSide',
  'aft',
  'leftBroadside',
  'rightBroadside',
] as const;

/**
 * Map location strings to CapitalArc enum
 */
const ARC_MAP: Record<string, CapitalArc> = {
  nose: CapitalArc.NOSE,
  'nose equipment': CapitalArc.NOSE,
  'front left': CapitalArc.FRONT_LEFT,
  fl: CapitalArc.FRONT_LEFT,
  'fl equipment': CapitalArc.FRONT_LEFT,
  'front right': CapitalArc.FRONT_RIGHT,
  fr: CapitalArc.FRONT_RIGHT,
  'fr equipment': CapitalArc.FRONT_RIGHT,
  'aft left': CapitalArc.AFT_LEFT,
  al: CapitalArc.AFT_LEFT,
  'al equipment': CapitalArc.AFT_LEFT,
  'aft right': CapitalArc.AFT_RIGHT,
  ar: CapitalArc.AFT_RIGHT,
  'ar equipment': CapitalArc.AFT_RIGHT,
  aft: CapitalArc.AFT,
  'aft equipment': CapitalArc.AFT,
  'left broadside': CapitalArc.LEFT_BROADSIDE,
  lbs: CapitalArc.LEFT_BROADSIDE,
  'lbs equipment': CapitalArc.LEFT_BROADSIDE,
  'right broadside': CapitalArc.RIGHT_BROADSIDE,
  rbs: CapitalArc.RIGHT_BROADSIDE,
  'rbs equipment': CapitalArc.RIGHT_BROADSIDE,
};

// ============================================================================
// WarShip Unit Handler
// ============================================================================

/**
 * Handler for WarShip units
 */
export class WarShipUnitHandler extends AbstractUnitTypeHandler<IWarShip> {
  readonly unitType = UnitType.WARSHIP;
  readonly displayName = 'WarShip';

  /**
   * Get available locations for WarShips (includes broadsides)
   */
  getLocations(): readonly string[] {
    return Object.values(CapitalArc);
  }

  /**
   * Parse WarShip-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IWarShip> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // WarShips are always spheroid
    const motionType = AerospaceMotionType.SPHEROID;

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

    // K-F Drive
    const rawTags = document.rawTags || {};
    const kfDriveType = this.parseKFDriveType(rawTags);
    const hasLFBattery = this.getBooleanFromRaw(rawTags, 'lfbattery') ?? false;

    // Jump capability
    const sailArea = this.getNumericFromRaw(rawTags, 'sailarea') || 0;
    const jumpRange = 30; // Standard K-F jump range

    // Docking and gravity
    const dockingHardpoints =
      this.getNumericFromRaw(rawTags, 'hardpoints') || 0;
    const gravityDecks = this.parseGravityDecks(rawTags);

    // Parse armor by arc (includes broadsides)
    const armor = document.armor || [];
    const armorByArc = this.parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

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

    // HPG
    const hasHPG = this.getBooleanFromRaw(rawTags, 'hpg') ?? false;
    const hpgClass = this.getStringFromRaw(rawTags, 'hpgclass');

    return {
      unitType: UnitType.WARSHIP,
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
      kfDriveType,
      hasLFBattery,
      sailArea,
      jumpRange,
      dockingHardpoints,
      gravityDecks,
      crewConfiguration,
      transportBays,
      quarters,
      equipment,
      escapePods,
      lifeBoats,
      hasHPG,
      hpgClass,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into arc-keyed object (includes broadsides)
   */
  private parseArmorByArc(armor: readonly number[]): {
    nose: number;
    frontLeftSide: number;
    frontRightSide: number;
    aftLeftSide: number;
    aftRightSide: number;
    aft: number;
    leftBroadside?: number;
    rightBroadside?: number;
  } {
    return {
      nose: armor[0] || 0,
      frontLeftSide: armor[1] || 0,
      frontRightSide: armor[2] || 0,
      aftLeftSide: armor[3] || 0,
      aftRightSide: armor[4] || 0,
      aft: armor[5] || 0,
      leftBroadside: armor[6],
      rightBroadside: armor[7],
    };
  }

  /**
   * Parse K-F Drive type from raw tags
   */
  private parseKFDriveType(
    rawTags: Record<string, string | string[]>,
  ): KFDriveType {
    const driveType = this.getStringFromRaw(
      rawTags,
      'kfdrivetype',
    )?.toLowerCase();
    if (driveType === 'compact') return KFDriveType.COMPACT;
    return KFDriveType.STANDARD;
  }

  /**
   * Parse gravity decks from raw tags
   */
  private parseGravityDecks(
    rawTags: Record<string, string | string[]>,
  ): readonly IGravityDeck[] {
    const decks: IGravityDeck[] = [];
    const deckCount = this.getNumericFromRaw(rawTags, 'gravdecks') || 0;
    const largeDecks = this.getNumericFromRaw(rawTags, 'largegravdecks') || 0;

    for (let i = 0; i < largeDecks; i++) {
      decks.push({ size: 'Large', capacity: 200 });
    }
    for (let i = 0; i < deckCount - largeDecks; i++) {
      decks.push({ size: 'Standard', capacity: 100 });
    }

    return decks;
  }

  /**
   * Parse crew configuration from document
   */
  private parseCrewConfiguration(
    document: IBlkDocument,
  ): ICapitalCrewConfiguration {
    return {
      crew: document.crew || 0,
      officers: document.officers || 0,
      gunners: document.gunners || 0,
      pilots: 4, // WarShips have multiple bridge crew
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
    if (typeStr.includes('dropship')) {
      type = BayType.DROPSHIP;
    } else if (typeStr.includes('mech')) {
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
   * Parse crew quarters from document
   */
  private parseQuarters(document: IBlkDocument): readonly ICrewQuarters[] {
    const quarters: ICrewQuarters[] = [];
    const crew = document.crew || 0;
    const passengers = document.passengers || 0;
    const officers = document.officers || 0;

    if (officers > 0) {
      quarters.push({ type: QuartersType.FIRST_CLASS, capacity: officers });
    }
    if (crew > 0) {
      quarters.push({ type: QuartersType.CREW, capacity: crew });
    }
    if (passengers > 0) {
      quarters.push({ type: QuartersType.SECOND_CLASS, capacity: passengers });
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
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): string | undefined {
    const value = rawTags[key];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): boolean | undefined {
    const value = this.getStringFromRaw(rawTags, key);
    if (value === undefined) return undefined;
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get numeric value from raw tags
   */
  private getNumericFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): number {
    const value = this.getStringFromRaw(rawTags, key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Combine common and WarShip-specific fields into IWarShip
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IWarShip>,
  ): IWarShip {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `warship-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.WARSHIP,
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

      // WarShip-specific fields
      ...typeSpecificFields,
    } as IWarShip;
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
    if (lower.includes('level 3') || lower.includes('advanced')) {
      return RulesLevel.ADVANCED;
    }
    return RulesLevel.STANDARD;
  }

  /**
   * Serialize WarShip-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IWarShip,
  ): Partial<ISerializedUnit> {
    return {
      configuration: 'Spheroid',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IWarShip> {
    return createFailureResult(['WarShip deserialization not yet implemented']);
  }

  /**
   * Validate WarShip-specific rules
   */
  protected validateTypeSpecificRules(unit: IWarShip): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage validation (WarShips: 100,000+ tons typical)
    if (unit.tonnage < 50000) {
      warnings.push(
        'WarShip tonnage is unusually low (typical minimum 100,000 tons)',
      );
    }
    if (unit.tonnage > 2500000) {
      errors.push('WarShip tonnage cannot exceed 2,500,000 tons');
    }

    // K-F Drive requirement
    if (!unit.kfDriveType) {
      errors.push('WarShip must have K-F Drive');
    }

    // Thrust validation
    if (unit.movement.safeThrust < 1) {
      errors.push('WarShip must have at least 1 safe thrust');
    }

    // SI validation
    if (unit.structuralIntegrity < 1) {
      errors.push('WarShip must have at least 1 SI');
    }

    // Crew validation
    if (unit.crewConfiguration.crew < 100) {
      warnings.push('WarShip has unusually small crew');
    }

    // Gravity deck check for long deployments
    if (unit.gravityDecks.length === 0) {
      warnings.push('WarShip has no gravity decks (crew comfort issue)');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate WarShip weight
   */
  protected calculateTypeSpecificWeight(unit: IWarShip): number {
    return unit.tonnage;
  }

  /**
   * Calculate WarShip BV
   */
  protected calculateTypeSpecificBV(unit: IWarShip): number {
    let bv = 0;

    // Base BV from armor (capital armor is worth more)
    bv += unit.totalArmorPoints * 5;

    // SI contributes heavily
    bv += unit.structuralIntegrity * 50;

    // K-F Drive adds value
    bv += 500;
    if (unit.hasLFBattery) bv += 200;

    // Transport capacity
    for (const bay of unit.transportBays) {
      bv += bay.capacity * 10;
    }

    // Thrust modifier
    bv *= 1 + unit.movement.safeThrust * 0.05;

    return Math.round(bv);
  }

  /**
   * Calculate WarShip cost
   */
  protected calculateTypeSpecificCost(unit: IWarShip): number {
    // Base cost per ton for WarShips
    const baseCostPerTon = 75000;

    let cost = unit.tonnage * baseCostPerTon;

    // K-F Drive is extremely expensive
    cost += 100000000; // 100 million C-bills base
    if (unit.hasLFBattery) cost += 50000000;

    // Transport bays
    for (const bay of unit.transportBays) {
      switch (bay.type) {
        case BayType.DROPSHIP:
          cost += bay.capacity * 5000000;
          break;
        case BayType.MECH:
          cost += bay.capacity * 1000000;
          break;
        case BayType.FIGHTER:
          cost += bay.capacity * 500000;
          break;
        default:
          cost += bay.capacity * 100000;
      }
    }

    // Gravity decks
    for (const deck of unit.gravityDecks) {
      cost += deck.size === 'Large' ? 5000000 : 2000000;
    }

    return Math.round(cost);
  }
}

/**
 * Create WarShip handler instance
 */
export function createWarShipHandler(): WarShipUnitHandler {
  return new WarShipUnitHandler();
}
