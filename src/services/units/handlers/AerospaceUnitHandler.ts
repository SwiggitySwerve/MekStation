/**
 * Aerospace Unit Handler
 *
 * Handler for parsing, validating, and serializing aerospace fighters.
 * Supports standard aerospace fighters, conventional fighters, and small craft.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.3
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { IAerospace } from '@/types/unit/AerospaceInterfaces';
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
  parseAerospaceCockpitType,
  parseAerospaceEquipment,
} from './aerospaceUnitHandlerShared';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getAerospaceWeightClass,
  getRawTagBoolean,
  pushSafeThrustAndStructureErrors,
  pushTonnageRangeErrors,
  serializeConfigurationWithRulesLevel,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

/**
 * Aerospace armor arc order for array parsing
 * BLK format: Nose, Left Wing, Right Wing, Aft
 */
const _AEROSPACE_ARMOR_ARCS = ['nose', 'leftWing', 'rightWing', 'aft'] as const;

// ============================================================================
// Aerospace Unit Handler
// ============================================================================

/**
 * Handler for aerospace fighter units
 */
export class AerospaceUnitHandler extends AbstractUnitTypeHandler<IAerospace> {
  readonly unitType = UnitType.AEROSPACE;
  readonly displayName = 'Aerospace Fighter';

  /**
   * Get available locations for aerospace fighters
   */
  getLocations(): readonly string[] {
    return Object.values(AerospaceLocation);
  }

  /**
   * Parse aerospace-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IAerospace> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    const basics = parseAerospaceBasics(document, 10);
    const rawTags = document.rawTags || {};

    if (basics.movement.safeThrust < 1) {
      errors.push('Aerospace fighters must have at least 1 safe thrust');
    }

    if (basics.fuel < 80) {
      warnings.push('Low fuel capacity may limit operational range');
    }

    const cockpitType = parseAerospaceCockpitType(document);
    const equipment = parseAerospaceEquipment(document);
    const hasBombBay =
      hasBombEquipment(document) || getRawTagBoolean(rawTags, 'bombbay');
    const bombCapacity = hasBombBay ? Math.floor(document.tonnage * 0.1) : 0;

    const hasReinforcedCockpit = getRawTagBoolean(rawTags, 'reinforcedcockpit');
    const hasEjectionSeat = getRawTagBoolean(rawTags, 'ejectionseat');

    return {
      unitType: UnitType.AEROSPACE,
      motionType: AerospaceMotionType.AERODYNE,
      ...basics,
      cockpitType,
      equipment,
      hasBombBay,
      bombCapacity,
      bombs: [],
      hasReinforcedCockpit,
      hasEjectionSeat,
      errors,
      warnings,
    } satisfies Partial<IAerospace> & UnitFieldParseMessages;
  }

  /**
   * Combine common and aerospace-specific fields into IAerospace
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IAerospace>,
  ): IAerospace {
    const weightClass = getAerospaceWeightClass(commonFields.tonnage);

    return combineCommonUnitFields<IAerospace>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'aerospace',
      unitType: UnitType.AEROSPACE,
      weightClass,
    });
  }

  /**
   * Serialize aerospace-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IAerospace,
  ): Partial<ISerializedUnit> {
    return serializeConfigurationWithRulesLevel('Aerodyne', unit.rulesLevel);
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IAerospace> {
    return createFailureResult([
      'Aerospace deserialization not yet implemented',
    ]);
  }

  /**
   * Validate aerospace-specific rules
   */
  protected validateTypeSpecificRules(
    unit: IAerospace,
  ): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    pushTonnageRangeErrors(errors, unit.tonnage, {
      label: 'Aerospace fighter',
      min: 5,
      max: 100,
    });

    pushSafeThrustAndStructureErrors(
      errors,
      unit,
      'Aerospace fighters must have at least 1 safe thrust',
      'Aerospace fighters must have at least 1 SI',
    );

    // Fuel validation
    if (unit.fuel < 80) {
      warnings.push('Low fuel capacity (less than 80 points)');
    }

    // Heat sink minimum
    if (unit.heatSinks < 10) {
      errors.push('Aerospace fighters must have at least 10 heat sinks');
    }

    // Armor balance check
    const arcValues = [
      unit.armorByArc.nose,
      unit.armorByArc.leftWing,
      unit.armorByArc.rightWing,
      unit.armorByArc.aft,
    ];
    const maxArc = Math.max(...arcValues);
    const minArc = Math.min(...arcValues);
    if (maxArc > minArc * 3) {
      warnings.push('Armor distribution is highly unbalanced');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate aerospace weight
   */
  protected calculateTypeSpecificWeight(unit: IAerospace): number {
    let weight = 0;

    // Engine weight (simplified: based on safe thrust and tonnage)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    weight += thrustRating * 0.05; // Simplified engine weight

    // Structural weight
    weight += unit.tonnage * 0.1;

    // Armor weight (aerospace: 16 points per ton for standard)
    weight += unit.totalArmorPoints / 16;

    // Heat sinks (first 10 free, rest = 1 ton each for single)
    const extraHeatSinks = Math.max(0, unit.heatSinks - 10);
    weight += extraHeatSinks * (unit.heatSinkType === 1 ? 1 : 1);

    // Fuel (200 points per ton)
    weight += unit.fuel / 200;

    // Cockpit (3 tons standard)
    weight += 3;

    return weight;
  }

  /**
   * Calculate aerospace BV
   */
  protected calculateTypeSpecificBV(unit: IAerospace): number {
    let bv = 0;

    // Base armor BV (2 points per armor point for aerospace)
    bv += unit.totalArmorPoints * 2;

    // SI contributes to BV
    bv += unit.structuralIntegrity * 10;

    // Thrust modifier (higher thrust = higher BV)
    const thrustMod = 1 + (unit.movement.safeThrust - 5) * 0.05;
    bv *= thrustMod;

    // Equipment BV would be added here

    return Math.round(bv);
  }

  /**
   * Calculate aerospace cost
   */
  protected calculateTypeSpecificCost(unit: IAerospace): number {
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 50000;

    // Engine cost
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    cost += thrustRating * 10000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // Avionics/cockpit
    cost += 200000;

    // Equipment cost would be added here

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create and optionally register the aerospace handler
 */
export function createAerospaceHandler(): AerospaceUnitHandler {
  return new AerospaceUnitHandler();
}
