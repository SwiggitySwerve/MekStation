/**
 * WarShip Unit Handler
 *
 * Handler for parsing, validating, and serializing WarShip units.
 * WarShips are large military spacecraft with K-F jump drives.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.7
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IWarShip, CapitalArc } from '@/types/unit/CapitalShipInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import { parseCapitalVesselBasics } from './capitalShipHandlerShared';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineAssaultUnitFields,
  createParseMessages,
  createValidationMessages,
  parseRulesLevelThroughAdvancedFromType,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';
import {
  validateWarShip,
  calculateWarShipBV,
  calculateWarShipCost,
} from './WarShipUnitHandler.calculations';
import {
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
  ): Partial<IWarShip> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // WarShips are always spheroid
    const motionType = AerospaceMotionType.SPHEROID;

    const basics = parseCapitalVesselBasics(document, {
      includeBroadsides: true,
    });

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
      ...basics,
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
    } satisfies Partial<IWarShip> & UnitFieldParseMessages;
  }

  /**
   * Combine common and WarShip-specific fields into IWarShip
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IWarShip>,
  ): IWarShip {
    return combineAssaultUnitFields<IWarShip>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'warship',
      unitType: UnitType.WARSHIP,
      rulesLevelParser: parseRulesLevelThroughAdvancedFromType,
    });
  }

  /**
   * Serialize WarShip-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IWarShip,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel('Spheroid', unit.rulesLevel);
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IWarShip> {
    return createFailureResult(['WarShip deserialization not yet implemented']);
  }

  protected validateTypeSpecificRules(unit: IWarShip): UnitValidationMessages {
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
