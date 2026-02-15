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
} from '@/types/unit/CapitalShipInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  calculateSpaceStationBV,
  calculateSpaceStationCost,
  validateSpaceStation,
} from './SpaceStationUnitHandler.calculations';
import {
  parseArmorByArc,
  parseStationType,
  parseCrewConfiguration,
  parseTransportBays,
  parseQuarters,
  parseEquipment,
  parseNumericRaw,
  getBooleanFromRaw,
} from './SpaceStationUnitHandler.helpers';

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
    const armorByArc = parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Station type
    const rawTags = document.rawTags || {};
    const stationType = parseStationType(rawTags);

    // Docking collars
    const dockingCollars = parseNumericRaw(rawTags, 'dockingcollars') || 0;

    // Grav decks
    const gravDecks = parseNumericRaw(rawTags, 'gravdecks') || 0;

    // HPG
    const hasHPG = getBooleanFromRaw(rawTags, 'hpg');

    // K-F Drive (rare for stations but possible)
    const hasKFDrive = getBooleanFromRaw(rawTags, 'kfdrive');

    // Pressurized modules
    const pressurizedModules =
      parseNumericRaw(rawTags, 'pressurizedmodules') || 1;

    // Crew configuration
    const crewConfiguration = parseCrewConfiguration(document);

    // Transport bays
    const transportBays = parseTransportBays(document);

    // Crew quarters
    const quarters = parseQuarters(document);

    // Equipment
    const equipment = parseEquipment(document);

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

  protected validateTypeSpecificRules(unit: ISpaceStation): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    return validateSpaceStation(unit);
  }

  /**
   * Calculate Space Station weight
   */
  protected calculateTypeSpecificWeight(unit: ISpaceStation): number {
    return unit.tonnage;
  }

  protected calculateTypeSpecificBV(unit: ISpaceStation): number {
    return calculateSpaceStationBV(unit);
  }

  protected calculateTypeSpecificCost(unit: ISpaceStation): number {
    return calculateSpaceStationCost(unit);
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
