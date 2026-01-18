/**
 * Infantry Unit Handler
 *
 * Handler for parsing, validating, and serializing conventional Infantry units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.5
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IInfantry,
  IInfantryFieldGun,
  InfantryArmorKit,
  InfantrySpecialization,
} from '../../../types/unit/PersonnelInterfaces';
import { SquadMotionType, ISquadMovement } from '../../../types/unit/BaseUnitInterfaces';
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
 * Motion type string to enum mapping
 */
const MOTION_TYPE_MAP: Record<string, SquadMotionType> = {
  foot: SquadMotionType.FOOT,
  leg: SquadMotionType.FOOT,
  jump: SquadMotionType.JUMP,
  motorized: SquadMotionType.MOTORIZED,
  mechanized: SquadMotionType.MECHANIZED,
  wheeled: SquadMotionType.WHEELED,
  tracked: SquadMotionType.TRACKED,
  hover: SquadMotionType.HOVER,
  vtol: SquadMotionType.VTOL,
  beast: SquadMotionType.BEAST,
};

/**
 * Armor kit string to enum mapping
 */
const ARMOR_KIT_MAP: Record<string, InfantryArmorKit> = {
  none: InfantryArmorKit.NONE,
  standard: InfantryArmorKit.STANDARD,
  flak: InfantryArmorKit.FLAK,
  ablative: InfantryArmorKit.ABLATIVE,
  clan: InfantryArmorKit.CLAN,
  environmental: InfantryArmorKit.ENVIRONMENTAL,
};

// ============================================================================
// Infantry Unit Handler
// ============================================================================

/**
 * Handler for conventional Infantry units
 */
export class InfantryUnitHandler extends AbstractUnitTypeHandler<IInfantry> {
  readonly unitType = UnitType.INFANTRY;
  readonly displayName = 'Infantry';

  /**
   * Get available locations for Infantry
   * Infantry doesn't have location-based equipment
   */
  getLocations(): readonly string[] {
    return ['Platoon'];
  }

  /**
   * Parse Infantry-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IInfantry> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Squad configuration
    const squadSize = document.squadSize || 7;
    const numberOfSquads = document.squadn || 4;
    const platoonStrength = squadSize * numberOfSquads;

    // Motion type
    const motionTypeStr = document.motionType?.toLowerCase() || 'foot';
    const motionType = MOTION_TYPE_MAP[motionTypeStr] || SquadMotionType.FOOT;

    // Movement
    const groundMP = document.cruiseMP || 1;
    const jumpMP = document.jumpingMP || 0;
    const movement: ISquadMovement = { groundMP, jumpMP, umuMP: 0 };

    // Weapons
    const primaryWeapon = document.primary || 'Rifle';
    const secondaryWeapon = document.secondary;
    const secondaryWeaponCount = document.secondn || 0;

    // Armor kit
    const armorKitStr = document.armorKit?.toLowerCase() || 'none';
    const armorKit = ARMOR_KIT_MAP[armorKitStr] || InfantryArmorKit.NONE;

    // Armor per trooper (from armor array or calculated)
    const armorPerTrooper = document.armor?.[0] || (armorKit === InfantryArmorKit.NONE ? 0 : 1);

    // Specialization (from raw tags)
    const rawTags = document.rawTags || {};
    const specialization = this.parseSpecialization(rawTags);

    // Field guns
    const fieldGuns = this.parseFieldGuns(document);

    // Special features
    const hasAntiMechTraining = this.getBooleanFromRaw(rawTags, 'antimech');
    const isAugmented = this.getBooleanFromRaw(rawTags, 'augmented');
    const augmentationType = this.getStringFromRaw(rawTags, 'augmentationtype');

    // Capabilities
    const canSwarm = hasAntiMechTraining;
    const canLegAttack = hasAntiMechTraining;

    return {
      unitType: UnitType.INFANTRY,
      squadSize,
      numberOfSquads,
      platoonStrength,
      motionType,
      movement,
      armorPerTrooper,
      primaryWeapon,
      secondaryWeapon,
      secondaryWeaponCount,
      armorKit,
      specialization,
      fieldGuns,
      hasAntiMechTraining,
      isAugmented,
      augmentationType,
      canSwarm,
      canLegAttack,
      errors,
      warnings,
    };
  }

  /**
   * Parse specialization from raw tags
   */
  private parseSpecialization(rawTags: Record<string, string | string[]>): InfantrySpecialization {
    const spec = this.getStringFromRaw(rawTags, 'specialization')?.toLowerCase();
    if (!spec) return InfantrySpecialization.NONE;

    if (spec.includes('anti-mech') || spec.includes('antimech')) {
      return InfantrySpecialization.ANTI_MECH;
    }
    if (spec.includes('para')) return InfantrySpecialization.PARATROOPER;
    if (spec.includes('mountain')) return InfantrySpecialization.MOUNTAIN;
    if (spec.includes('marine')) return InfantrySpecialization.MARINE;
    if (spec.includes('xct')) return InfantrySpecialization.XCT;
    if (spec.includes('tag')) return InfantrySpecialization.TAG;
    if (spec.includes('engineer')) return InfantrySpecialization.ENGINEER;

    return InfantrySpecialization.NONE;
  }

  /**
   * Parse field guns from document
   */
  private parseFieldGuns(document: IBlkDocument): readonly IInfantryFieldGun[] {
    const fieldGuns: IInfantryFieldGun[] = [];

    // Check equipment for field gun entries
    for (const items of Object.values(document.equipmentByLocation)) {
      for (const item of items) {
        if (item.toLowerCase().includes('field gun')) {
          fieldGuns.push({
            equipmentId: item,
            name: item,
            crew: 2, // Default crew size
          });
        }
      }
    }

    return fieldGuns;
  }

  /**
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): string | undefined {
    const value = rawTags[key];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean {
    const value = this.getStringFromRaw(rawTags, key);
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and Infantry-specific fields into IInfantry
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IInfantry>
  ): IInfantry {
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `infantry-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.INFANTRY,
      tonnage: commonFields.tonnage || 0.1, // Infantry has very low tonnage
      weightClass: WeightClass.LIGHT,

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
      totalWeight: commonFields.tonnage || 0.1,
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // Infantry-specific fields
      ...typeSpecificFields,
    } as IInfantry;
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
    return RulesLevel.INTRODUCTORY; // Most infantry is introductory
  }

  /**
   * Serialize Infantry-specific fields
   */
  protected serializeTypeSpecificFields(unit: IInfantry): Partial<ISerializedUnit> {
    return {
      configuration: unit.motionType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IInfantry> {
    return createFailureResult(['Infantry deserialization not yet implemented']);
  }

  /**
   * Validate Infantry-specific rules
   */
  protected validateTypeSpecificRules(unit: IInfantry): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Squad size validation (typically 7-10)
    if (unit.squadSize < 1 || unit.squadSize > 10) {
      errors.push('Infantry squad size must be between 1 and 10');
    }

    // Number of squads validation (typically 2-4)
    if (unit.numberOfSquads < 1 || unit.numberOfSquads > 4) {
      warnings.push('Unusual number of squads (standard is 2-4)');
    }

    // Jump infantry limitations
    if (unit.motionType === SquadMotionType.JUMP && unit.fieldGuns.length > 0) {
      errors.push('Jump infantry cannot carry field guns');
    }

    // Anti-mech training requirements
    if (unit.canSwarm && !unit.hasAntiMechTraining) {
      errors.push('Swarm attacks require anti-mech training');
    }

    // Field gun crew check
    for (const gun of unit.fieldGuns) {
      if (gun.crew > unit.squadSize) {
        errors.push(`Field gun ${gun.name} requires more crew than squad size`);
      }
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate Infantry weight
   * Infantry weight is per-platoon, very low
   */
  protected calculateTypeSpecificWeight(unit: IInfantry): number {
    // Average soldier: 80kg with gear
    const soldierWeight = 0.08; // tons
    let weight = unit.platoonStrength * soldierWeight;

    // Add field gun weight
    for (const _gun of unit.fieldGuns) {
      weight += 0.5; // Assume 0.5 tons per field gun
    }

    return weight;
  }

  /**
   * Calculate Infantry BV
   */
  protected calculateTypeSpecificBV(unit: IInfantry): number {
    // Base BV per soldier
    let bvPerSoldier = 2;

    // Modify by weapon
    if (unit.primaryWeapon.toLowerCase().includes('laser')) {
      bvPerSoldier += 1;
    }
    if (unit.primaryWeapon.toLowerCase().includes('srm')) {
      bvPerSoldier += 2;
    }

    // Anti-mech bonus
    if (unit.hasAntiMechTraining) {
      bvPerSoldier += 1;
    }

    // Armor bonus
    if (unit.armorKit !== InfantryArmorKit.NONE) {
      bvPerSoldier += 0.5;
    }

    return Math.round(unit.platoonStrength * bvPerSoldier);
  }

  /**
   * Calculate Infantry cost
   */
  protected calculateTypeSpecificCost(unit: IInfantry): number {
    // Base cost per soldier
    let costPerSoldier = 1000;

    // Training cost
    if (unit.hasAntiMechTraining) {
      costPerSoldier += 500;
    }

    // Armor cost
    if (unit.armorKit === InfantryArmorKit.CLAN) {
      costPerSoldier += 2000;
    } else if (unit.armorKit !== InfantryArmorKit.NONE) {
      costPerSoldier += 500;
    }

    // Field gun cost
    let fieldGunCost = 0;
    for (const _gun of unit.fieldGuns) {
      fieldGunCost += 50000;
    }

    return unit.platoonStrength * costPerSoldier + fieldGunCost;
  }
}

/**
 * Create Infantry handler instance
 */
export function createInfantryHandler(): InfantryUnitHandler {
  return new InfantryUnitHandler();
}
