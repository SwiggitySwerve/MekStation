/**
 * VTOL Unit Handler
 *
 * Handler for parsing, validating, and serializing VTOL (Vertical Take-Off and Landing) units.
 * VTOLs are specialized vehicles with rotors that can hover and fly at low altitudes.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IVTOL,
  IVehicleMountedEquipment,
  ITurretConfiguration,
  TurretType,
} from '../../../types/unit/VehicleInterfaces';
import {
  GroundMotionType,
  IGroundMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { VTOLLocation } from '../../../types/construction/UnitLocation';
import { IUnitParseResult } from '../../../types/unit/UnitTypeHandler';
import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Constants
// ============================================================================

/**
 * VTOL armor location order for array parsing
 * VTOLs have: Front, Left, Right, Rear, Rotor
 */
const VTOL_ARMOR_LOCATIONS = [
  VTOLLocation.FRONT,
  VTOLLocation.LEFT,
  VTOLLocation.RIGHT,
  VTOLLocation.REAR,
  VTOLLocation.ROTOR,
] as const;

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
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IVTOL> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // VTOLs always have VTOL motion type
    const motionType = GroundMotionType.VTOL;

    // Movement
    const cruiseMP = document.cruiseMP || 0;
    const flankMP = Math.floor(cruiseMP * 1.5);
    const jumpMP = 0; // VTOLs don't jump - they fly
    const movement: IGroundMovement = { cruiseMP, flankMP, jumpMP };

    if (cruiseMP < 1) {
      errors.push('VTOLs must have at least 1 cruise MP');
    }

    // Engine
    const engineType = document.engineType || 0;
    const engineRating = cruiseMP * document.tonnage;

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

    // VTOL weight limit
    if (document.tonnage > 30) {
      errors.push('VTOLs cannot exceed 30 tons');
    }

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
  private parseArmorByLocation(armor: readonly number[]): Record<VTOLLocation, number> {
    const result: Record<VTOLLocation, number> = {
      [VTOLLocation.FRONT]: 0,
      [VTOLLocation.LEFT]: 0,
      [VTOLLocation.RIGHT]: 0,
      [VTOLLocation.REAR]: 0,
      [VTOLLocation.TURRET]: 0,
      [VTOLLocation.ROTOR]: 0,
      [VTOLLocation.BODY]: 0,
    };

    VTOL_ARMOR_LOCATIONS.forEach((loc, index) => {
      if (index < armor.length) {
        result[loc] = armor[index];
      }
    });

    return result;
  }

  /**
   * Parse chin turret configuration from document
   */
  private parseChinTurret(document: IBlkDocument): ITurretConfiguration | undefined {
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
  private parseEquipment(document: IBlkDocument): readonly IVehicleMountedEquipment[] {
    const equipment: IVehicleMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(document.equipmentByLocation)) {
      const location = this.normalizeLocation(locationKey);
      const isTurretMounted =
        locationKey.toLowerCase().includes('turret') ||
        locationKey.toLowerCase().includes('chin');

      for (const item of items) {
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          location,
          isRearMounted: false,
          isTurretMounted,
          isSponsonMounted: false,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to VTOLLocation enum
   */
  private normalizeLocation(locationKey: string): VTOLLocation {
    const normalized = locationKey.toLowerCase().replace(' equipment', '');
    switch (normalized) {
      case 'front':
        return VTOLLocation.FRONT;
      case 'left':
      case 'left side':
        return VTOLLocation.LEFT;
      case 'right':
      case 'right side':
        return VTOLLocation.RIGHT;
      case 'rear':
        return VTOLLocation.REAR;
      case 'rotor':
        return VTOLLocation.ROTOR;
      case 'turret':
      case 'chin':
      case 'body':
      default:
        return VTOLLocation.BODY;
    }
  }

  /**
   * Calculate maximum armor points for VTOL tonnage
   */
  private calculateMaxArmor(tonnage: number): number {
    return Math.floor(tonnage * 3.5);
  }

  /**
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): string | undefined {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Combine common and VTOL-specific fields into IVTOL
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IVTOL>
  ): IVTOL {
    const weightClass = this.getWeightClass(commonFields.tonnage);
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `vtol-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.VTOL,
      tonnage: commonFields.tonnage,
      weightClass,

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

      // VTOL-specific fields
      ...typeSpecificFields,
    } as IVTOL;
  }

  /**
   * Determine weight class from tonnage
   * VTOLs are always light (max 30 tons)
   */
  private getWeightClass(_tonnage: number): WeightClass {
    return WeightClass.LIGHT;
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
    if (lower.includes('level 4') || lower.includes('experimental')) {
      return RulesLevel.EXPERIMENTAL;
    }
    return RulesLevel.STANDARD;
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
  protected validateTypeSpecificRules(unit: IVTOL): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // VTOL tonnage limits (1-30 tons per TM)
    if (unit.tonnage < 1) {
      errors.push('VTOL tonnage must be at least 1 ton');
    }
    if (unit.tonnage > 30) {
      errors.push('VTOL tonnage cannot exceed 30 tons');
    }

    // Movement validation
    if (unit.movement.cruiseMP < 1) {
      errors.push('VTOLs must have at least 1 cruise MP');
    }

    // Armor validation
    if (unit.totalArmorPoints > unit.maxArmorPoints) {
      errors.push(
        `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`
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
    const engineRating = unit.movement.cruiseMP * unit.tonnage;
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
    const engineRating = unit.movement.cruiseMP * unit.tonnage;
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
