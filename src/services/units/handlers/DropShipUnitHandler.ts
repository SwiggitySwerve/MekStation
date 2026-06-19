/**
 * DropShip Unit Handler
 *
 * Handler for parsing, validating, and serializing DropShip units.
 * DropShips are large aerospace transport craft capable of planetary landing.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.7
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IDropShip,
  DropShipDesignType,
  BayType,
  CapitalArc,
} from '@/types/unit/CapitalShipInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  EXTENDED_CAPITAL_WEAPON_TERMS,
  buildCapitalCrewConfiguration,
  parseCapitalCrewQuarters,
  parseCapitalEquipment,
  parseCapitalTransportBays,
  parseCapitalVesselBasics,
} from './capitalShipHandlerShared';
import { type ITransportBayTypeRule } from './transportBayParsing';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineAssaultUnitFields,
  createParseMessages,
  createValidationMessages,
  getOptionalRawTagBoolean,
  parseRulesLevelThroughAdvancedFromType,
  pushSafeThrustAndStructureErrors,
  pushTonnageRangeErrors,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

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

const DROPSHIP_TRANSPORT_BAY_RULES: readonly ITransportBayTypeRule[] = [
  { tokens: ['mech'], type: BayType.MECH },
  { tokens: ['vehicle', 'light'], type: BayType.VEHICLE },
  { tokens: ['infantry'], type: BayType.INFANTRY },
  { tokens: ['battlearmor', 'ba'], type: BayType.BATTLE_ARMOR },
  { tokens: ['fighter', 'asf'], type: BayType.FIGHTER },
  { tokens: ['smallcraft'], type: BayType.SMALL_CRAFT },
  { tokens: ['cargo'], type: BayType.CARGO },
];

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
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IDropShip> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

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

    const basics = parseCapitalVesselBasics(document);

    // Docking collar
    const rawTags = document.rawTags || {};
    const hasDockingCollar =
      getOptionalRawTagBoolean(rawTags, 'dockingcollar') ?? true;

    // Crew configuration
    const crewConfiguration = buildCapitalCrewConfiguration(document, 2);

    // Transport bays
    const transportBays = parseCapitalTransportBays(
      document,
      DROPSHIP_TRANSPORT_BAY_RULES,
    );

    // Crew quarters
    const quarters = parseCapitalCrewQuarters(document);

    // Equipment
    const equipment = parseCapitalEquipment(document, {
      arcAliases: {
        'left side': CapitalArc.FRONT_LEFT,
        'right side': CapitalArc.FRONT_RIGHT,
      },
      capitalWeaponTerms: EXTENDED_CAPITAL_WEAPON_TERMS,
    });

    // Escape pods and life boats
    const escapePods = document.escapePod || 0;
    const lifeBoats = document.lifeBoat || 0;

    return {
      unitType: UnitType.DROPSHIP,
      motionType,
      designType,
      ...basics,
      hasDockingCollar,
      crewConfiguration,
      transportBays,
      quarters,
      equipment,
      escapePods,
      lifeBoats,
      errors,
      warnings,
    } satisfies Partial<IDropShip> & UnitFieldParseMessages;
  }

  /**
   * Combine common and DropShip-specific fields into IDropShip
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IDropShip>,
  ): IDropShip {
    return combineAssaultUnitFields<IDropShip>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'dropship',
      unitType: UnitType.DROPSHIP,
      rulesLevelParser: parseRulesLevelThroughAdvancedFromType,
    });
  }

  /**
   * Serialize DropShip-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IDropShip,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel(
      unit.motionType,
      unit.rulesLevel,
    );
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IDropShip> {
    return createFailureResult([
      'DropShip deserialization not yet implemented',
    ]);
  }

  /**
   * Validate DropShip-specific rules
   */
  protected validateTypeSpecificRules(unit: IDropShip): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    pushTonnageRangeErrors(errors, unit.tonnage, {
      label: 'DropShip',
      min: 200,
      max: 100000,
      maxText: '100,000',
    });

    pushSafeThrustAndStructureErrors(
      errors,
      unit,
      'DropShip must have at least 1 safe thrust',
      'DropShip must have at least 1 SI',
    );

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
        `Insufficient escape capacity (${escapeCapacity}) for personnel (${totalPersonnel})`,
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
