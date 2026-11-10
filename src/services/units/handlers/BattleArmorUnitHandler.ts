/**
 * Battle Armor Unit Handler
 *
 * Handler for parsing, validating, and serializing Battle Armor units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.4
 */

import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { WeightClass } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  SquadMotionType,
  ISquadMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { BA_WEIGHT_CLASS_LIMITS } from '@/types/unit/BattleArmorInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IBattleArmor,
  IBattleArmorMountedEquipment,
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import { calculateBattleArmorBVFromUnit } from '@/utils/construction/battlearmor/battleArmorBVAdapter';
import { canMakeBAAntiMekAttacks } from '@/utils/construction/battlearmor/battleArmorMounts';
import { parseBattleArmorManipulator } from '@/utils/construction/battlearmor/manipulators';
import { validateBattleArmorSource } from '@/utils/construction/battlearmor/validation';

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
  getRawTagBoolean,
  getRawTagNumber,
  getRawTagString,
  mapLocationEquipment,
  withConstructionDiagnostics,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

/**
 * Motion type string to enum mapping
 */
const MOTION_TYPE_MAP: Record<string, SquadMotionType> = {
  jump: SquadMotionType.JUMP,
  leg: SquadMotionType.FOOT,
  foot: SquadMotionType.FOOT,
  vtol: SquadMotionType.VTOL,
  umu: SquadMotionType.UMU,
  mechanized: SquadMotionType.MECHANIZED,
};

// ============================================================================
// Battle Armor Unit Handler
// ============================================================================

/**
 * Handler for Battle Armor units
 */
export class BattleArmorUnitHandler extends AbstractUnitTypeHandler<IBattleArmor> {
  readonly unitType = UnitType.BATTLE_ARMOR;
  readonly displayName = 'Battle Armor';

  /**
   * BA BLKs have no Tonnage tag; Java sets weight from the trooper count
   * (BLKBattleArmorFile.java:90 `t.setWeight(t.getSquadSize())`).
   */
  protected readonly requiresUnitTonnage = false;

  /**
   * Get available locations for Battle Armor
   */
  getLocations(): readonly string[] {
    return Object.values(BattleArmorLocation);
  }

  /**
   * Parse BA-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IBattleArmor> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // Chassis type
    const chassisStr = document.chassis?.toLowerCase() || 'biped';
    const chassisType =
      chassisStr === 'quad'
        ? BattleArmorChassisType.QUAD
        : BattleArmorChassisType.BIPED;

    // Squad size
    const squadSize = document.trooperCount || 4;
    if (squadSize < 1 || squadSize > 6) {
      warnings.push(`Unusual squad size: ${squadSize}`);
    }

    // Weight class from weight code or calculation
    const weightCode = document.weightClass ?? 2; // Default medium
    const baWeightClass = this.weightCodeToClass(weightCode);

    // BattleArmor.java:1200-1201 -> EntityWeightClass.java:77,438-440:
    // getTrooperWeight() is the class limit for both biped and quad chassis.
    const weightPerTrooper = BA_WEIGHT_CLASS_LIMITS[baWeightClass].maxMassKg;

    // Motion type
    const motionTypeStr = document.motionType?.toLowerCase() || 'jump';
    const motionType = MOTION_TYPE_MAP[motionTypeStr] || SquadMotionType.JUMP;

    // Movement
    const groundMP = document.cruiseMP || 1;
    const jumpMP = document.jumpingMP || 0;
    const umuMP = getRawTagNumber(document.rawTags, 'umump') || 0;
    const movement: ISquadMovement = { groundMP, jumpMP, umuMP };

    // Manipulators
    const leftManipulator = this.parseManipulator(
      document.rawTags,
      'leftmanipulator',
    );
    const rightManipulator = this.parseManipulator(
      document.rawTags,
      'rightmanipulator',
    );

    // Armor
    const armorType = document.armorType || 0;
    const armorPerTrooper = document.armor?.[0] || 0;

    // Equipment
    const equipment = this.parseEquipment(document);

    // Special features
    const rawTags = document.rawTags || {};
    const hasAPMount = getRawTagBoolean(rawTags, 'apmount');
    const hasModularMount = getRawTagBoolean(rawTags, 'modularmount');
    const hasTurretMount = getRawTagBoolean(rawTags, 'turretmount');
    const hasStealthSystem = getRawTagBoolean(rawTags, 'stealth');
    const hasMimeticArmor = getRawTagBoolean(rawTags, 'mimetic');
    const hasFireResistantArmor = getRawTagBoolean(rawTags, 'fireresistant');
    const hasMechanicalJumpBoosters = getRawTagBoolean(
      rawTags,
      'mechanicaljumpboosters',
    );

    // Capabilities (derived from weight class and equipment)
    const canSwarm = baWeightClass !== BattleArmorWeightClass.ASSAULT;
    const canLegAttack = true;
    const canMountOmni = baWeightClass !== BattleArmorWeightClass.ASSAULT;

    return {
      unitType: UnitType.BATTLE_ARMOR,
      chassisType,
      baWeightClass,
      weightPerTrooper,
      squadSize,
      leftManipulator,
      rightManipulator,
      motionType,
      movement,
      jumpMP,
      hasMechanicalJumpBoosters,
      umuMP,
      armorType,
      sourceArmorTech: getRawTagNumber(rawTags, 'armor_tech'),
      armorPerTrooper,
      equipment,
      hasAPMount,
      hasModularMount,
      hasTurretMount,
      hasStealthSystem,
      hasMimeticArmor,
      hasFireResistantArmor,
      canSwarm,
      canLegAttack,
      canMountOmni,
      errors,
      warnings,
    };
  }

  /**
   * Convert weight class code to enum
   */
  private weightCodeToClass(code: number): BattleArmorWeightClass {
    switch (code) {
      case 0:
        return BattleArmorWeightClass.PA_L;
      case 1:
        return BattleArmorWeightClass.LIGHT;
      case 2:
        return BattleArmorWeightClass.MEDIUM;
      case 3:
        return BattleArmorWeightClass.HEAVY;
      case 4:
        return BattleArmorWeightClass.ASSAULT;
      default:
        return BattleArmorWeightClass.MEDIUM;
    }
  }

  /**
   * Parse manipulator type from raw tags
   */
  private parseManipulator(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): ManipulatorType {
    return parseBattleArmorManipulator(getRawTagString(rawTags, key));
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IBattleArmorMountedEquipment[] {
    return mapLocationEquipment(
      document.equipmentByLocation,
      (locationKey) => this.normalizeLocation(locationKey),
      ({ mountId, item, location, locationKey }) => ({
        id: `mount-${mountId}`,
        equipmentId: item,
        unitLocation: locationKey,
        name: item,
        location,
        isAPMount: locationKey.toLowerCase().includes('ap'),
        isTurretMounted: locationKey.toLowerCase().includes('turret'),
        isModular: false,
      }),
    );
  }

  /**
   * Normalize location string to BattleArmorLocation enum
   */
  private normalizeLocation(locationKey: string): BattleArmorLocation {
    const normalized = locationKey.toLowerCase().replace(' equipment', '');
    switch (normalized) {
      case 'squad':
        return BattleArmorLocation.SQUAD;
      case 'body':
        return BattleArmorLocation.BODY;
      case 'left arm':
        return BattleArmorLocation.LEFT_ARM;
      case 'right arm':
        return BattleArmorLocation.RIGHT_ARM;
      case 'turret':
        return BattleArmorLocation.TURRET;
      default:
        return BattleArmorLocation.SQUAD;
    }
  }

  /**
   * Combine common and BA-specific fields into IBattleArmor
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IBattleArmor>,
  ): IBattleArmor {
    const unit = combineCommonUnitFields<IBattleArmor>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'battlearmor',
      unitType: UnitType.BATTLE_ARMOR,
      weightClass: WeightClass.LIGHT,
    });
    const result = { ...unit, canAntiMech: canMakeBAAntiMekAttacks(unit) };
    return withConstructionDiagnostics(result, this.validate(result));
  }

  /**
   * Serialize BA-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IBattleArmor,
  ): Partial<ISerializedUnit> {
    return {
      configuration: unit.chassisType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IBattleArmor> {
    return createFailureResult([
      'Battle Armor deserialization not yet implemented',
    ]);
  }

  /**
   * Validate BA-specific rules
   */
  protected validateTypeSpecificRules(
    unit: IBattleArmor,
  ): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    // Squad size validation
    if (unit.squadSize < 1 || unit.squadSize > 6) {
      errors.push('Battle Armor squad size must be between 1 and 6');
    }

    // Weight per trooper validation
    const thresholds = BA_WEIGHT_CLASS_LIMITS[unit.baWeightClass];
    if (
      unit.weightPerTrooper < thresholds.minMassKg ||
      unit.weightPerTrooper > thresholds.maxMassKg
    ) {
      warnings.push(
        `Weight per trooper (${unit.weightPerTrooper}kg) doesn't match weight class ${unit.baWeightClass}`,
      );
    }

    // Assault BA limitations
    if (unit.baWeightClass === BattleArmorWeightClass.ASSAULT) {
      if (unit.canSwarm) {
        errors.push('Assault Battle Armor cannot perform swarm attacks');
      }
      if (unit.canMountOmni) {
        errors.push('Assault Battle Armor cannot mount on OmniMechs');
      }
    }

    // Armor validation (max varies by weight class)
    errors.push(...validateBattleArmorSource(unit));

    return { errors, warnings, infos };
  }

  /**
   * Calculate BA weight
   */
  protected calculateTypeSpecificWeight(unit: IBattleArmor): number {
    // BA weight is per trooper, total = weight per trooper * squad size
    return (unit.weightPerTrooper / 1000) * unit.squadSize;
  }

  /**
   * Calculate BA BV
   */
  protected calculateTypeSpecificBV(unit: IBattleArmor): number {
    return calculateBattleArmorBVFromUnit(unit).final;
  }

  /**
   * Calculate BA cost
   */
  protected calculateTypeSpecificCost(unit: IBattleArmor): number {
    // Base cost varies by weight class
    const baseCost =
      unit.baWeightClass === BattleArmorWeightClass.ASSAULT
        ? 500000
        : unit.baWeightClass === BattleArmorWeightClass.HEAVY
          ? 400000
          : unit.baWeightClass === BattleArmorWeightClass.MEDIUM
            ? 300000
            : unit.baWeightClass === BattleArmorWeightClass.LIGHT
              ? 200000
              : 100000;

    return baseCost * unit.squadSize;
  }
}

/**
 * Create Battle Armor handler instance
 */
export function createBattleArmorHandler(): BattleArmorUnitHandler {
  return new BattleArmorUnitHandler();
}
