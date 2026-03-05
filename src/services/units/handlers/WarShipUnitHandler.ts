/**
 * WarShip Unit Handler
 *
 * Handler for parsing, validating, and serializing WarShip units.
 * WarShips are large military spacecraft with K-F jump drives.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.7
 */

import { TechBase, Era, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IWarShip,
  CapitalArc,
} from '@/types/unit/CapitalShipInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  validateWarShip,
  calculateWarShipBV,
  calculateWarShipCost,
} from './WarShipUnitHandler.calculations';
import {
  parseArmorByArc,
  parseKFDriveType,
  parseGravityDecks,
  parseCrewConfiguration,
  parseTransportBays,
  parseQuarters,
  parseEquipment,
  getStringFromRaw,
  getBooleanFromRaw,
  getNumericFromRaw,
} from './WarShipUnitHandler.helpers';

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
    const kfDriveType = parseKFDriveType(rawTags);
    const hasLFBattery = getBooleanFromRaw(rawTags, 'lfbattery') ?? false;

    // Jump capability
    const sailArea = getNumericFromRaw(rawTags, 'sailarea') || 0;
    const jumpRange = 30;

    // Docking and gravity
    const dockingHardpoints = getNumericFromRaw(rawTags, 'hardpoints') || 0;
    const gravityDecks = parseGravityDecks(rawTags);

    // Parse armor by arc (includes broadsides)
    const armor = document.armor || [];
    const armorByArc = parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

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

    // HPG
    const hasHPG = getBooleanFromRaw(rawTags, 'hpg') ?? false;
    const hpgClass = getStringFromRaw(rawTags, 'hpgclass');

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

  protected validateTypeSpecificRules(unit: IWarShip): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    return validateWarShip(unit);
  }

  protected calculateTypeSpecificWeight(unit: IWarShip): number {
    return unit.tonnage;
  }

  protected calculateTypeSpecificBV(unit: IWarShip): number {
    return calculateWarShipBV(unit);
  }

  protected calculateTypeSpecificCost(unit: IWarShip): number {
    return calculateWarShipCost(unit);
  }
}

/**
 * Create WarShip handler instance
 */
export function createWarShipHandler(): WarShipUnitHandler {
  return new WarShipUnitHandler();
}
