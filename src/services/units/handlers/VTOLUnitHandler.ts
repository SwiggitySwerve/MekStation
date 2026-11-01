/**
 * VTOL Unit Handler
 *
 * Handler for parsing, validating, and serializing VTOL (Vertical Take-Off and Landing) units.
 * VTOLs are specialized vehicles with rotors that can hover and fly at low altitudes.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { VTOL_TONNAGE } from '@/services/construction/constructionConstants';
import { VTOLLocation } from '@/types/construction/UnitLocation';
import { WeightClass } from '@/types/enums';
import {
  BLK_VTOL_ARMOR_LOCATIONS,
  IBlkDocument,
} from '@/types/formats/BlkFormat';
import {
  GroundMotionType,
  IGroundMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import {
  IVTOL,
  IVehicleMountedEquipment,
  ITurretConfiguration,
  TurretType,
} from '@/types/unit/VehicleInterfaces';
import { getTankMaxTotalArmor } from '@/utils/construction/vehicle/armor';
import {
  computeEngineRating,
  computeFlankMP,
} from '@/utils/construction/vehicle/engine';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getRawTagString,
  mapLocationEquipment,
  pushTonnageRangeErrors,
  pushSourceLoadNumberErrors,
  withConstructionDiagnostics,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

/** A VTOL over 30 t is SuperHeavy (VTOL.java:729) and may reach 60 t (TestTank.java:136) */
const SUPERHEAVY_VTOL_MAX_TONNAGE = 60;

const VTOL_LOCATION_MAP: Record<string, VTOLLocation> = {
  front: VTOLLocation.FRONT,
  left: VTOLLocation.LEFT,
  'left side': VTOLLocation.LEFT,
  right: VTOLLocation.RIGHT,
  'right side': VTOLLocation.RIGHT,
  rear: VTOLLocation.REAR,
  rotor: VTOLLocation.ROTOR,
  turret: VTOLLocation.TURRET,
  chin: VTOLLocation.TURRET,
  body: VTOLLocation.BODY,
};

// ============================================================================
// VTOL Unit Handler
// ============================================================================

/**
 * Handler for VTOL units
 */
export class VTOLUnitHandler extends AbstractUnitTypeHandler<IVTOL> {
  readonly unitType = UnitType.VTOL;
  readonly displayName = 'VTOL';

  /**
   * Get available locations for VTOLs
   */
  getLocations(): readonly string[] {
    return Object.values(VTOLLocation);
  }

  /**
   * Parse VTOL-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IVTOL> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();
    pushSourceLoadNumberErrors(errors, document, 'cruiseMP');
    if (errors.length > 0) return { errors, warnings };

    // VTOLs always have VTOL motion type
    const motionType = GroundMotionType.VTOL;

    // Movement
    // Audit 2026-06-09 C-14: flank MP rounds UP — MegaMek Entity.getRunMP is
    // ceil(walk MP * 1.5) (Tank inherits it) and the project's own BLK Python
    // converter (blk_vehicle_converter.py) uses math.ceil.
    const cruiseMP = document.cruiseMP || 0;
    const flankMP = computeFlankMP(cruiseMP);
    const jumpMP = 0; // VTOLs don't jump - they fly
    const movement: IGroundMovement = { cruiseMP, flankMP, jumpMP };

    // Engine
    const engineType = document.engineType || 0;
    const engineRating = computeEngineRating(
      document.tonnage,
      cruiseMP,
      GroundMotionType.VTOL,
    );

    // Armor
    const armorType = document.armorType || 0;
    const armor = document.armor || [];
    const armorByLocation = this.parseArmorByLocation(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Chin turret configuration
    const chinTurret = this.parseChinTurret(document);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Rotor hits (max 2 for VTOLs per TM)
    const rotorHits = 2;

    // Rotor type
    const rawTags = document.rawTags || {};
    const rotorType = this.getStringFromRaw(rawTags, 'rotortype') || 'Standard';

    return {
      unitType: UnitType.VTOL,
      motionType,
      movement,
      engineType,
      engineRating,
      armorType,
      armor,
      armorByLocation,
      totalArmorPoints,
      maxArmorPoints: this.calculateMaxArmor(document.tonnage),
      chinTurret,
      equipment,
      rotorType,
      rotorHits,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into location-keyed record
   */
  private parseArmorByLocation(
    armor: readonly number[],
  ): Record<VTOLLocation, number> {
    const result: Record<VTOLLocation, number> = {
      [VTOLLocation.FRONT]: 0,
      [VTOLLocation.LEFT]: 0,
      [VTOLLocation.RIGHT]: 0,
      [VTOLLocation.REAR]: 0,
      [VTOLLocation.TURRET]: 0,
      [VTOLLocation.ROTOR]: 0,
      [VTOLLocation.BODY]: 0,
    };

    BLK_VTOL_ARMOR_LOCATIONS.forEach((loc, index) => {
      if (index < armor.length) {
        result[loc] = armor[index];
      }
    });

    return result;
  }

  /**
   * Parse chin turret configuration from document
   */
  private parseChinTurret(
    document: IBlkDocument,
  ): ITurretConfiguration | undefined {
    const rawTags = document.rawTags || {};
    const turretType = this.getStringFromRaw(rawTags, 'turrettype');

    // VTOLs use chin turrets
    if (turretType?.toLowerCase() === 'chin') {
      return {
        type: TurretType.CHIN,
        maxWeight: document.tonnage * 0.1,
        currentWeight: 0,
        rotationArc: 180, // Chin turrets have limited arc
      };
    }

    // Check for turret equipment
    const hasTurretEquipment =
      document.equipmentByLocation['Turret']?.length > 0 ||
      document.equipmentByLocation['Turret Equipment']?.length > 0 ||
      document.equipmentByLocation['Chin']?.length > 0;

    if (!hasTurretEquipment) {
      return undefined;
    }

    return {
      type: TurretType.CHIN,
      maxWeight: document.tonnage * 0.1,
      currentWeight: 0,
      rotationArc: 180,
    };
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IVehicleMountedEquipment[] {
    return mapLocationEquipment(
      document.equipmentByLocation,
      (locationKey) => this.normalizeLocation(locationKey),
      ({ mountId, item, location, locationKey }) => ({
        id: `mount-${mountId}`,
        equipmentId: item,
        name: item,
        location,
        isRearMounted: false,
        isTurretMounted:
          locationKey.toLowerCase().includes('turret') ||
          locationKey.toLowerCase().includes('chin'),
        isSponsonMounted: false,
      }),
    );
  }

  /**
   * Normalize location string to VTOLLocation enum
   */
  private normalizeLocation(locationKey: string): VTOLLocation {
    const normalized = locationKey.toLowerCase().replace(' equipment', '');
    return VTOL_LOCATION_MAP[normalized] || VTOLLocation.BODY;
  }

  /**
   * Calculate maximum armor points for VTOL tonnage
   * (TestTank.java:338: tonnage * 7 / 2 + 40, rounded down)
   */
  private calculateMaxArmor(tonnage: number): number {
    return getTankMaxTotalArmor(tonnage);
  }

  /**
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): string | undefined {
    return getRawTagString(rawTags, key);
  }

  /**
   * Combine common and VTOL-specific fields into IVTOL
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IVTOL>,
  ): IVTOL {
    const weightClass = this.getWeightClass(commonFields.tonnage);

    const unit = combineCommonUnitFields<IVTOL>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'vtol',
      unitType: UnitType.VTOL,
      weightClass,
    });
    return withConstructionDiagnostics(unit, this.validate(unit));
  }

  /**
   * Determine weight class from tonnage
   * VTOLs are always light (max 30 tons)
   */
  private getWeightClass(_tonnage: number): WeightClass {
    return WeightClass.LIGHT;
  }

  /**
   * Serialize VTOL-specific fields
   */
  protected serializeTypeSpecificFields(unit: IVTOL): Partial<ISerializedUnit> {
    return {
      configuration: 'VTOL',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IVTOL> {
    return createFailureResult(['VTOL deserialization not yet implemented']);
  }

  /**
   * Validate VTOL-specific rules
   */
  protected validateTypeSpecificRules(unit: IVTOL): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    pushTonnageRangeErrors(errors, unit.tonnage, {
      label: 'VTOL',
      min: VTOL_TONNAGE.min,
      max: SUPERHEAVY_VTOL_MAX_TONNAGE,
    });

    // Movement validation
    if (unit.movement.cruiseMP < 1) {
      errors.push('VTOLs must have at least 1 cruise MP');
    }

    // Armor validation
    if (unit.totalArmorPoints > unit.maxArmorPoints) {
      errors.push(
        `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
      );
    }

    // Rotor cannot be armored beyond 2 points
    const rotorArmor = unit.armorByLocation?.[VTOLLocation.ROTOR] || 0;
    if (rotorArmor > 2) {
      warnings.push('VTOL rotor armor exceeds typical maximum of 2 points');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate VTOL weight
   */
  protected calculateTypeSpecificWeight(unit: IVTOL): number {
    let weight = 0;

    // Engine weight (VTOLs use lighter engines per thrust)
    const engineRating = computeEngineRating(
      unit.tonnage,
      unit.movement.cruiseMP,
      GroundMotionType.VTOL,
    );
    weight += engineRating * 0.04; // Simplified

    // Rotor weight (10% of tonnage)
    weight += unit.tonnage * 0.1;

    // Structural weight
    weight += unit.tonnage * 0.1;

    // Armor weight
    weight += unit.totalArmorPoints / 16;

    return weight;
  }

  /**
   * Calculate VTOL BV
   */
  protected calculateTypeSpecificBV(unit: IVTOL): number {
    let bv = 0;

    // Armor BV (lower than ground vehicles due to fragility)
    bv += unit.totalArmorPoints * 2;

    // Movement modifier (VTOLs get bonus for speed)
    const movementMod = 1 + (unit.movement.cruiseMP - 1) * 0.15;
    bv *= movementMod;

    return Math.round(bv);
  }

  /**
   * Calculate VTOL cost
   */
  protected calculateTypeSpecificCost(unit: IVTOL): number {
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 15000;

    // Engine cost
    const engineRating = computeEngineRating(
      unit.tonnage,
      unit.movement.cruiseMP,
      GroundMotionType.VTOL,
    );
    cost += engineRating * 6000;

    // Rotor cost
    cost += unit.tonnage * 40000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create VTOL handler instance
 */
export function createVTOLHandler(): VTOLUnitHandler {
  return new VTOLUnitHandler();
}
