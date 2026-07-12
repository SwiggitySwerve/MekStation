/**
 * Space Station Unit Handler
 *
 * Handler for parsing, validating, and serializing Space Station units.
 * Space stations are large orbital or deep-space installations, typically immobile.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { CapitalShipLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import type { ISpaceStation } from './SpaceStationUnitHandler.types';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import { parseCapitalVesselBasics } from './capitalShipHandlerShared';
import {
  calculateSpaceStationBV,
  calculateSpaceStationCost,
  validateSpaceStation,
} from './SpaceStationUnitHandler.calculations';
import {
  parseStationType,
  parseCrewConfiguration,
  parseTransportBays,
  parseQuarters,
  parseEquipment,
  parseNumericRaw,
  getBooleanFromRaw,
} from './SpaceStationUnitHandler.helpers';
import { SpaceStationType } from './SpaceStationUnitHandler.types';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineAssaultUnitFields,
  createParseMessages,
  parseRulesLevelThroughAdvancedFromType,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

// Re-export the handler-local interface and station-type enum so
// existing consumers can still import them from this module (or via
// the barrel `index.ts`). The canonical definitions now live in
// `./SpaceStationUnitHandler.types` to break the orchestrator <->
// leaf circular import.
export { SpaceStationType };
export type { ISpaceStation };

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
  ): Partial<ISpaceStation> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // Space stations are always spheroid (or modular)
    const motionType = AerospaceMotionType.SPHEROID;

    const basics = parseCapitalVesselBasics(document, {
      includeEngineType: false,
    });

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
      ...basics,
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
    } satisfies Partial<ISpaceStation> & UnitFieldParseMessages;
  }

  /**
   * Combine common and Space Station-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<ISpaceStation>,
  ): ISpaceStation {
    return combineAssaultUnitFields<ISpaceStation>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'space-station',
      unitType: UnitType.SPACE_STATION,
      rulesLevelParser: parseRulesLevelThroughAdvancedFromType,
    });
  }

  /**
   * Serialize Space Station-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: ISpaceStation,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel(
      `Space Station (${unit.stationType})`,
      unit.rulesLevel,
    );
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<ISpaceStation> {
    return createFailureResult([
      'Space Station deserialization not yet implemented',
    ]);
  }

  protected validateTypeSpecificRules(
    unit: ISpaceStation,
  ): UnitValidationMessages {
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
