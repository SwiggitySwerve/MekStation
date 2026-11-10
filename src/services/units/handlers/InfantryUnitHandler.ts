/**
 * Infantry Unit Handler
 *
 * Handler for parsing, validating, and serializing conventional Infantry units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.5
 */

import { WeightClass } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  SquadMotionType,
  ISquadMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IInfantry,
  IInfantryFieldGun,
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import {
  calculateInfantryBVFromUnit,
  calculatePersonnelArmorKitMassTons,
} from '@/utils/construction/infantry';
import { resolveInfantryProtection } from '@/utils/construction/infantry/infantryBVAdapter';
import { infantrySourceFieldGuns } from '@/utils/construction/infantry/infantrySourceMounts';
import { resolveInfantryOffenseSource } from '@/utils/construction/infantry/platoonComposition';
import { validateInfantrySource } from '@/utils/construction/infantry/validation';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  buildCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getRawTagBoolean,
  getRawTagString,
  withConstructionDiagnostics,
} from './unitHandlerShared';

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
   * Infantry BLKs have no Tonnage tag; Java computes platoon weight from the
   * configuration (TestInfantry.getWeight, TestInfantry.java:550).
   */
  protected readonly requiresUnitTonnage = false;

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
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IInfantry> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

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
    const armorPerTrooper =
      document.armor?.[0] || (armorKit === InfantryArmorKit.NONE ? 0 : 1);

    // Specialization (from raw tags)
    const rawTags = document.rawTags || {};
    const specialization = this.parseSpecialization(rawTags);
    let protection: Partial<IInfantry> = {};
    try {
      protection = resolveInfantryProtection(rawTags);
      if (rawTags.Primary)
        protection = {
          ...protection,
          bvOffense: resolveInfantryOffenseSource(
            rawTags,
            protection.isArmorEncumbering ?? false,
          ),
        };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Field guns
    const fieldGuns = this.parseFieldGuns(document);

    // Special features
    const hasAntiMechTraining = getRawTagBoolean(rawTags, 'antimech');
    const isAugmented = getRawTagBoolean(rawTags, 'augmented');
    const augmentationType = getRawTagString(rawTags, 'augmentationtype');

    // Capabilities
    const canSwarm = hasAntiMechTraining;
    const canLegAttack = hasAntiMechTraining;

    return {
      unitType: UnitType.INFANTRY,
      constructionSource: {
        motion_type: document.motionType ?? 'foot',
        'Field Guns Equipment': rawTags['Field Guns Equipment'] ?? [],
      },
      ...protection,
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
  private parseSpecialization(
    rawTags: Record<string, string | string[]>,
  ): InfantrySpecialization {
    const spec = getRawTagString(rawTags, 'specialization')?.toLowerCase();
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
    // BLKInfantryFile.java:229-230; ConvInfantry.java:2683-2685 (48fcb2f64).
    const source = document.rawTags?.['Field Guns Equipment'];
    if (source)
      return infantrySourceFieldGuns([source].flat()).map(({ id }) => {
        const entry = getEquipmentEntry(id);
        const roundedWeight = Math.ceil(entry?.weight ?? 0);
        return {
          equipmentId: id,
          name: entry?.name ?? id,
          crew: entry?.special?.includes('artillery')
            ? roundedWeight
            : Math.max(2, roundedWeight),
        };
      });
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
   * Combine common and Infantry-specific fields into IInfantry
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IInfantry>,
  ): IInfantry {
    const unit = {
      ...buildCommonUnitFields({
        commonFields,
        idPrefix: 'infantry',
        unitType: UnitType.INFANTRY,
        weightClass: WeightClass.LIGHT,
        tonnage: commonFields.tonnage || 0.1,
        totalWeight: commonFields.tonnage || 0.1,
      }),
      ...typeSpecificFields,
    } as IInfantry;
    return withConstructionDiagnostics(unit, this.validate(unit));
  }

  /**
   * Serialize Infantry-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IInfantry,
  ): Partial<ISerializedUnit> {
    return {
      configuration: unit.motionType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IInfantry> {
    return createFailureResult([
      'Infantry deserialization not yet implemented',
    ]);
  }

  /**
   * Validate Infantry-specific rules
   */
  protected validateTypeSpecificRules(unit: IInfantry): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();
    errors.push(...validateInfantrySource(unit));

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

    // Field gun crew is checked against the whole platoon by
    // validateInfantrySource (TestInfantry.java:295-299, 48fcb2f64).

    return { errors, warnings, infos };
  }

  /**
   * Calculate Infantry weight
   * Infantry weight is per-platoon, very low
   */
  protected calculateTypeSpecificWeight(unit: IInfantry): number {
    // Average soldier: 80kg with gear
    const soldierWeight = 0.08; // tons
    const armorKitWeight = calculatePersonnelArmorKitMassTons(
      unit.armorKit,
      unit.platoonStrength,
    );

    return unit.platoonStrength * soldierWeight + armorKitWeight;
  }

  /**
   * Calculate Infantry BV using the shared infantry calculator.
   *
   * Delegates to `calculateInfantryBVFromUnit` (adapter over
   * `calculateInfantryBV`), including pinned Java defensive structure and the
   * legacy offensive approximation. Full source BV parity remains pending.
   *
   * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
   */
  protected calculateTypeSpecificBV(unit: IInfantry): number {
    return calculateInfantryBVFromUnit(unit).final;
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
