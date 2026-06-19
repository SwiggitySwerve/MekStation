/**
 * JumpShip Unit Handler
 *
 * Handler for parsing, validating, and serializing JumpShip units.
 * JumpShips are large interstellar transport vessels equipped with Kearny-Fuchida drives.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { CapitalShipLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import type { IJumpShip } from './JumpShipUnitHandler.types';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import { parseCapitalVesselBasics } from './capitalShipHandlerShared';
import {
  validateJumpShip,
  calculateJumpShipBV,
  calculateJumpShipCost,
} from './JumpShipUnitHandler.calculations';
import {
  getBooleanFromRaw,
  parseCrewConfiguration,
  parseEquipment,
  parseKFDrive,
  parseNumericRaw,
  parseQuarters,
  parseTransportBays,
} from './JumpShipUnitHandler.helpers';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineAssaultUnitFields,
  createParseMessages,
  createValidationMessages,
  parseRulesLevelThroughAdvancedFromType,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

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
  ): Partial<IJumpShip> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // JumpShips are always spheroid
    const motionType = AerospaceMotionType.SPHEROID;

    const basics = parseCapitalVesselBasics(document);

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
      ...basics,
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
    } satisfies Partial<IJumpShip> & UnitFieldParseMessages;
  }

  /**
   * Combine common and JumpShip-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IJumpShip>,
  ): IJumpShip {
    return combineAssaultUnitFields<IJumpShip>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'jumpship',
      unitType: UnitType.JUMPSHIP,
      rulesLevelParser: parseRulesLevelThroughAdvancedFromType,
    });
  }

  /**
   * Serialize JumpShip-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IJumpShip,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel('JumpShip', unit.rulesLevel);
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IJumpShip> {
    return createFailureResult([
      'JumpShip deserialization not yet implemented',
    ]);
  }

  protected validateTypeSpecificRules(unit: IJumpShip): UnitValidationMessages {
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
