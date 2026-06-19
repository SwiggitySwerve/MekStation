/**
 * Conventional Fighter Unit Handler
 *
 * Handler for parsing, validating, and serializing conventional fighters.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  IConventionalFighter,
  ConventionalFighterEngineType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  hasBombEquipment,
  parseAerospaceBasics,
  parseAerospaceEquipment,
  parseFighterCockpitType,
} from './aerospaceUnitHandlerShared';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getAerospaceWeightClass,
  parseRulesLevelThroughAdvancedFromType,
  pushSafeThrustAndStructureErrors,
  pushTonnageRangeErrors,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

/**
 * Map engine type codes to ConventionalFighterEngineType
 */
const ENGINE_TYPE_MAP: Record<number, ConventionalFighterEngineType> = {
  0: ConventionalFighterEngineType.ICE,
  1: ConventionalFighterEngineType.FUEL_CELL,
  2: ConventionalFighterEngineType.ELECTRIC,
  3: ConventionalFighterEngineType.FISSION,
  4: ConventionalFighterEngineType.FUSION,
  5: ConventionalFighterEngineType.SOLAR,
  6: ConventionalFighterEngineType.MAGLEV,
};

// ============================================================================
// Conventional Fighter Unit Handler
// ============================================================================

/**
 * Handler for conventional fighter units
 */
export class ConventionalFighterUnitHandler extends AbstractUnitTypeHandler<IConventionalFighter> {
  readonly unitType = UnitType.CONVENTIONAL_FIGHTER;
  readonly displayName = 'Conventional Fighter';

  /**
   * Get available locations for conventional fighters
   */
  getLocations(): readonly string[] {
    return Object.values(AerospaceLocation);
  }

  /**
   * Parse conventional fighter-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IConventionalFighter> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    const basics = parseAerospaceBasics(document, 0);

    if (basics.movement.safeThrust < 1) {
      errors.push('Conventional fighters must have at least 1 safe thrust');
    }

    if (basics.fuel < 40) {
      warnings.push('Very low fuel capacity');
    }

    // Engine type (conventional uses non-fusion)
    const engineTypeCode = document.engineType || 0;
    const conventionalEngineType =
      ENGINE_TYPE_MAP[engineTypeCode] || ConventionalFighterEngineType.ICE;
    const engineType = engineTypeCode;

    // Cockpit type
    const cockpitType = parseFighterCockpitType(document);

    // Equipment
    const equipment = parseAerospaceEquipment(document);

    // Bomb bay
    const hasBombBay = hasBombEquipment(document);
    const bombCapacity = hasBombBay ? Math.floor(document.tonnage * 0.1) : 0;

    // Tonnage limits for conventional fighters
    if (document.tonnage > 100) {
      errors.push('Conventional fighters cannot exceed 100 tons');
    }

    return {
      unitType: UnitType.CONVENTIONAL_FIGHTER,
      motionType: AerospaceMotionType.AERODYNE,
      conventionalEngineType,
      ...basics,
      engineType,
      cockpitType,
      equipment,
      hasBombBay,
      bombCapacity,
      errors,
      warnings,
    } satisfies Partial<IConventionalFighter> & UnitFieldParseMessages;
  }

  /**
   * Combine common and conventional fighter-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IConventionalFighter>,
  ): IConventionalFighter {
    const weightClass = getAerospaceWeightClass(commonFields.tonnage);

    return combineCommonUnitFields<IConventionalFighter>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'conv-fighter',
      unitType: UnitType.CONVENTIONAL_FIGHTER,
      weightClass,
      rulesLevelParser: parseRulesLevelThroughAdvancedFromType,
    });
  }

  /**
   * Serialize conventional fighter-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IConventionalFighter,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel(
      `Conventional Fighter (${unit.conventionalEngineType})`,
      unit.rulesLevel,
    );
  }

  /**
   * Deserialize from standard format
   */
  deserialize(
    _serialized: ISerializedUnit,
  ): IUnitParseResult<IConventionalFighter> {
    return createFailureResult([
      'Conventional Fighter deserialization not yet implemented',
    ]);
  }

  /**
   * Validate conventional fighter-specific rules
   */
  protected validateTypeSpecificRules(
    unit: IConventionalFighter,
  ): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    pushTonnageRangeErrors(errors, unit.tonnage, {
      label: 'Conventional fighter',
      min: 5,
      max: 100,
    });

    pushSafeThrustAndStructureErrors(
      errors,
      unit,
      'Conventional fighters must have at least 1 safe thrust',
      'Conventional fighters must have at least 1 SI',
    );

    // Atmosphere-only warning
    infos.push('Conventional fighters cannot operate in space');

    return { errors, warnings, infos };
  }

  /**
   * Calculate conventional fighter weight
   */
  protected calculateTypeSpecificWeight(unit: IConventionalFighter): number {
    let weight = 0;

    // Engine weight (conventional uses ICE/turbine)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    weight += thrustRating * 0.08; // Heavier than fusion

    // Structural weight
    weight += unit.tonnage * 0.1;

    // Armor weight
    weight += unit.totalArmorPoints / 16;

    // Fuel weight (conventional needs more fuel)
    weight += unit.fuel / 100; // Simplified

    // Cockpit
    weight += 2;

    return weight;
  }

  /**
   * Calculate conventional fighter BV
   */
  protected calculateTypeSpecificBV(unit: IConventionalFighter): number {
    let bv = 0;

    // Armor BV (reduced compared to ASF)
    bv += unit.totalArmorPoints * 1.5;

    // SI contributes
    bv += unit.structuralIntegrity * 5;

    // Thrust modifier
    const thrustMod = 1 + (unit.movement.safeThrust - 5) * 0.03;
    bv *= thrustMod;

    return Math.round(bv);
  }

  /**
   * Calculate conventional fighter cost
   */
  protected calculateTypeSpecificCost(unit: IConventionalFighter): number {
    // Conventional fighters are cheaper than aerospace fighters
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 20000;

    // Engine cost (cheaper than fusion)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    cost += thrustRating * 3000;

    // Armor cost
    cost += unit.totalArmorPoints * 5000;

    // Avionics
    cost += 50000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create Conventional Fighter handler instance
 */
export function createConventionalFighterHandler(): ConventionalFighterUnitHandler {
  return new ConventionalFighterUnitHandler();
}
