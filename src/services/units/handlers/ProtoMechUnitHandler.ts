/**
 * ProtoMech Unit Handler
 *
 * Handler for parsing, validating, and serializing ProtoMech units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.6
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IProtoMech,
  IProtoMechMountedEquipment,
} from '../../../types/unit/PersonnelInterfaces';
import { SquadMotionType, ISquadMovement } from '../../../types/unit/BaseUnitInterfaces';
import { ProtoMechLocation } from '../../../types/construction/UnitLocation';
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
 * ProtoMech location order for armor array
 */
const PROTOMECH_ARMOR_LOCATIONS = [
  ProtoMechLocation.HEAD,
  ProtoMechLocation.TORSO,
  ProtoMechLocation.LEFT_ARM,
  ProtoMechLocation.RIGHT_ARM,
  ProtoMechLocation.LEGS,
  ProtoMechLocation.MAIN_GUN,
] as const;

/**
 * Location string to enum mapping
 */
const LOCATION_MAP: Record<string, ProtoMechLocation> = {
  head: ProtoMechLocation.HEAD,
  'head equipment': ProtoMechLocation.HEAD,
  torso: ProtoMechLocation.TORSO,
  'torso equipment': ProtoMechLocation.TORSO,
  'main gun': ProtoMechLocation.MAIN_GUN,
  'main gun equipment': ProtoMechLocation.MAIN_GUN,
  'left arm': ProtoMechLocation.LEFT_ARM,
  'left arm equipment': ProtoMechLocation.LEFT_ARM,
  'right arm': ProtoMechLocation.RIGHT_ARM,
  'right arm equipment': ProtoMechLocation.RIGHT_ARM,
  legs: ProtoMechLocation.LEGS,
  'legs equipment': ProtoMechLocation.LEGS,
};

// ============================================================================
// ProtoMech Unit Handler
// ============================================================================

/**
 * Handler for ProtoMech units
 */
export class ProtoMechUnitHandler extends AbstractUnitTypeHandler<IProtoMech> {
  readonly unitType = UnitType.PROTOMECH;
  readonly displayName = 'ProtoMech';

  /**
   * Get available locations for ProtoMechs
   */
  getLocations(): readonly string[] {
    return Object.values(ProtoMechLocation);
  }

  /**
   * Parse ProtoMech-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IProtoMech> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Point/squad size (typically 5)
    const pointSize = document.trooperCount || 5;
    const squadSize = pointSize; // Same as point size for ProtoMechs

    // Weight per unit (individual ProtoMech weight in tons)
    const weightPerUnit = document.tonnage;
    if (weightPerUnit < 2 || weightPerUnit > 9) {
      warnings.push(`Unusual ProtoMech weight: ${weightPerUnit} tons`);
    }

    // Engine and movement
    const cruiseMP = document.cruiseMP || 4;
    const jumpMP = document.jumpingMP || 0;
    const engineRating = cruiseMP * weightPerUnit;

    // Motion type
    const motionType = jumpMP > 0 ? SquadMotionType.JUMP : SquadMotionType.FOOT;
    const movement: ISquadMovement = { groundMP: cruiseMP, jumpMP, umuMP: 0 };

    // Armor per location
    const armor = document.armor || [];
    const armorByLocation = this.parseArmorByLocation(armor);
    const armorPerTrooper = armor.reduce((sum, val) => sum + val, 0);

    // Internal structure (simplified - ProtoMechs have fixed structure by tonnage)
    const structureByLocation = this.calculateStructure(weightPerUnit);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Main gun detection
    const hasMainGun = equipment.some(
      (e) => e.location === ProtoMechLocation.MAIN_GUN
    );

    // Special features from raw tags
    const rawTags = document.rawTags || {};
    const isGlider = this.getBooleanFromRaw(rawTags, 'glider');
    const isQuad = this.getBooleanFromRaw(rawTags, 'quad');
    const hasMyomerBooster = this.getBooleanFromRaw(rawTags, 'myomerbooster');
    const hasMagneticClamps = this.getBooleanFromRaw(rawTags, 'magneticclamps');
    const hasExtendedTorsoTwist = this.getBooleanFromRaw(rawTags, 'extendedtorsotwist');

    return {
      unitType: UnitType.PROTOMECH,
      weightPerUnit,
      pointSize,
      squadSize,
      engineRating,
      cruiseMP,
      jumpMP,
      motionType,
      movement,
      armorPerTrooper,
      hasMainGun,
      armorByLocation,
      structureByLocation,
      equipment,
      isGlider,
      isQuad,
      hasMyomerBooster,
      hasMagneticClamps,
      hasExtendedTorsoTwist,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into location-keyed record
   */
  private parseArmorByLocation(armor: readonly number[]): Record<ProtoMechLocation, number> {
    const result: Record<ProtoMechLocation, number> = {
      [ProtoMechLocation.HEAD]: 0,
      [ProtoMechLocation.TORSO]: 0,
      [ProtoMechLocation.LEFT_ARM]: 0,
      [ProtoMechLocation.RIGHT_ARM]: 0,
      [ProtoMechLocation.LEGS]: 0,
      [ProtoMechLocation.MAIN_GUN]: 0,
    };

    PROTOMECH_ARMOR_LOCATIONS.forEach((loc, index) => {
      if (index < armor.length) {
        result[loc] = armor[index];
      }
    });

    return result;
  }

  /**
   * Calculate internal structure by tonnage
   */
  private calculateStructure(tonnage: number): Record<ProtoMechLocation, number> {
    // ProtoMech structure is based on tonnage
    // Simplified calculation
    const headStructure = 1;
    const torsoStructure = Math.ceil(tonnage / 2);
    const armStructure = Math.ceil(tonnage / 4);
    const legsStructure = Math.ceil(tonnage / 3);

    return {
      [ProtoMechLocation.HEAD]: headStructure,
      [ProtoMechLocation.TORSO]: torsoStructure,
      [ProtoMechLocation.LEFT_ARM]: armStructure,
      [ProtoMechLocation.RIGHT_ARM]: armStructure,
      [ProtoMechLocation.LEGS]: legsStructure,
      [ProtoMechLocation.MAIN_GUN]: 1,
    };
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(document: IBlkDocument): readonly IProtoMechMountedEquipment[] {
    const equipment: IProtoMechMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(document.equipmentByLocation)) {
      const location = this.normalizeLocation(locationKey);

      for (const item of items) {
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          location,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to ProtoMechLocation enum
   */
  private normalizeLocation(locationKey: string): ProtoMechLocation {
    const normalized = locationKey.toLowerCase();
    return LOCATION_MAP[normalized] || ProtoMechLocation.TORSO;
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and ProtoMech-specific fields into IProtoMech
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IProtoMech>
  ): IProtoMech {
    // ProtoMechs are always Clan tech
    const techBase = TechBase.CLAN;
    const rulesLevel = RulesLevel.ADVANCED;

    // Weight class based on individual ProtoMech tonnage
    const weightClass = this.getWeightClass(typeSpecificFields.weightPerUnit || 5);

    return {
      // Identity
      id: `protomech-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.PROTOMECH,
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

      // ProtoMech-specific fields
      ...typeSpecificFields,
    } as IProtoMech;
  }

  /**
   * Determine weight class from individual unit tonnage
   */
  private getWeightClass(tonnage: number): WeightClass {
    // ProtoMech weight classes:
    // 2-4 tons = Light
    // 5-6 tons = Medium
    // 7-9 tons = Heavy
    if (tonnage <= 4) return WeightClass.LIGHT;
    if (tonnage <= 6) return WeightClass.MEDIUM;
    return WeightClass.HEAVY;
  }

  /**
   * Serialize ProtoMech-specific fields
   */
  protected serializeTypeSpecificFields(unit: IProtoMech): Partial<ISerializedUnit> {
    return {
      configuration: unit.isQuad ? 'Quad' : 'Biped',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IProtoMech> {
    return createFailureResult(['ProtoMech deserialization not yet implemented']);
  }

  /**
   * Validate ProtoMech-specific rules
   */
  protected validateTypeSpecificRules(unit: IProtoMech): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Weight validation (2-9 tons per ProtoMech)
    if (unit.weightPerUnit < 2) {
      errors.push('ProtoMech must be at least 2 tons');
    }
    if (unit.weightPerUnit > 9) {
      errors.push('ProtoMech cannot exceed 9 tons');
    }

    // Point size (typically 5)
    if (unit.pointSize < 1 || unit.pointSize > 6) {
      warnings.push('Unusual point size (standard is 5)');
    }

    // Movement validation
    if (unit.cruiseMP < 1) {
      errors.push('ProtoMech must have at least 1 cruise MP');
    }

    // Main gun validation
    if (unit.hasMainGun && unit.isQuad) {
      errors.push('Quad ProtoMechs cannot have main guns');
    }

    // Glider validation
    if (unit.isGlider && unit.jumpMP < 2) {
      errors.push('Glider ProtoMechs require at least 2 jump MP');
    }

    // Tech base validation
    if (unit.techBase !== TechBase.CLAN) {
      warnings.push('ProtoMechs are Clan-only technology');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate ProtoMech weight
   */
  protected calculateTypeSpecificWeight(unit: IProtoMech): number {
    // Total weight = individual weight * point size
    return unit.weightPerUnit * unit.pointSize;
  }

  /**
   * Calculate ProtoMech BV
   */
  protected calculateTypeSpecificBV(unit: IProtoMech): number {
    let bv = 0;

    // Base BV from armor
    bv += unit.armorPerTrooper * 15;

    // Movement bonus
    bv += unit.cruiseMP * 10;
    if (unit.jumpMP > 0) {
      bv += unit.jumpMP * 15;
    }

    // Per-unit BV multiplied by point size
    bv *= unit.pointSize;

    // Equipment BV would be added here

    return Math.round(bv);
  }

  /**
   * Calculate ProtoMech cost
   */
  protected calculateTypeSpecificCost(unit: IProtoMech): number {
    // Base cost per ton
    const costPerTon = 200000;
    let costPerUnit = unit.weightPerUnit * costPerTon;

    // Engine cost
    costPerUnit += unit.engineRating * 1000;

    // Special equipment
    if (unit.isGlider) costPerUnit += 50000;
    if (unit.hasMyomerBooster) costPerUnit += 100000;
    if (unit.hasMagneticClamps) costPerUnit += 75000;

    return costPerUnit * unit.pointSize;
  }
}

/**
 * Create ProtoMech handler instance
 */
export function createProtoMechHandler(): ProtoMechUnitHandler {
  return new ProtoMechUnitHandler();
}
