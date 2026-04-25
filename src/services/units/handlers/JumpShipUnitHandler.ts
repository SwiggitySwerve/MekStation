/**
 * JumpShip Unit Handler
 *
 * Handler for parsing, validating, and serializing JumpShip units.
 * JumpShips are large interstellar transport vessels equipped with Kearny-Fuchida drives.
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
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import type { IJumpShip } from './JumpShipUnitHandler.types';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  validateJumpShip,
  calculateJumpShipBV,
  calculateJumpShipCost,
} from './JumpShipUnitHandler.calculations';
import {
  parseArmorByArc,
  parseKFDrive,
  parseCrewConfiguration,
  parseTransportBays,
  parseQuarters,
  parseEquipment,
  parseNumericRaw,
  getBooleanFromRaw,
} from './JumpShipUnitHandler.helpers';

// Re-export the handler-local interface so existing consumers can
// still `import { IJumpShip } from './JumpShipUnitHandler'` (or via
// the barrel `index.ts`). The canonical definition now lives in
// `./JumpShipUnitHandler.types` to break the orchestrator <->
// leaf circular import.
export type { IJumpShip };

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
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IJumpShip> & {
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
    const armorByArc = parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // K-F Drive
    const rawTags = document.rawTags || {};
    const kfDrive = parseKFDrive(rawTags, document.tonnage);

    // Docking collars
    const dockingCollars = parseNumericRaw(rawTags, 'dockingcollars') || 1;

    // Grav decks
    const gravDecks = parseNumericRaw(rawTags, 'gravdecks') || 0;

    // HPG
    const hpg = getBooleanFromRaw(rawTags, 'hpg');

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
   * Combine common and JumpShip-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IJumpShip>,
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
  protected serializeTypeSpecificFields(
    unit: IJumpShip,
  ): Partial<ISerializedUnit> {
    return {
      configuration: 'JumpShip',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IJumpShip> {
    return createFailureResult([
      'JumpShip deserialization not yet implemented',
    ]);
  }

  protected validateTypeSpecificRules(unit: IJumpShip): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    return validateJumpShip(unit);
  }

  protected calculateTypeSpecificWeight(unit: IJumpShip): number {
    return unit.tonnage;
  }

  protected calculateTypeSpecificBV(unit: IJumpShip): number {
    return calculateJumpShipBV(unit);
  }

  protected calculateTypeSpecificCost(unit: IJumpShip): number {
    return calculateJumpShipCost(unit);
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
