/**
 * ProtoMech Unit Handler
 *
 * Handler for parsing, validating, and serializing ProtoMech units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.6
 */

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { TechBase, WeightClass, RulesLevel } from '@/types/enums';
import {
  BLK_PROTOMECH_ARMOR_LOCATIONS,
  BLK_PROTOMECH_CHASSIS,
  IBlkDocument,
} from '@/types/formats/BlkFormat';
import {
  SquadMotionType,
  ISquadMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IProtoMech,
  IProtoMechMountedEquipment,
} from '@/types/unit/PersonnelInterfaces';
import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
  type IProtoArmorByLocation,
  type IProtoMechMountedEquipment as IProtoMechMountedEquipmentV2,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import {
  computeProtoEngineRating,
  computeProtoStructure,
  getProtoStructureTonnageError,
  getProtoMainGunTopologyError,
} from '@/utils/construction/protomech';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

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
  mapLocationEquipment,
  parseInnerSphereOrClan,
  parseRulesLevelFromType,
  pushSourceLoadNumberErrors,
  withConstructionDiagnostics,
} from './unitHandlerShared';

// ============================================================================
// Constants
// ============================================================================

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
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IProtoMech> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();
    const native = document.unitType.toLowerCase() === 'protomek';
    if (!/^(Clan|IS) Level [1-4]$/i.test(document.type)) {
      errors.push(`Unsupported ProtoMek type: ${document.type}`);
    }
    if (native) {
      pushSourceLoadNumberErrors(errors, document, 'cruiseMP');
      if (
        document.jumpingMP !== undefined ||
        document.rawTags.jumpingMP !== undefined
      ) {
        pushSourceLoadNumberErrors(errors, document, 'jumpingMP');
      }
      const armor = document.armor;
      const rawArmor = document.rawTags.armor ?? document.rawTags.Armor;
      const lines =
        typeof rawArmor === 'string' ? rawArmor.split(/\r?\n/) : rawArmor;
      if (
        ![5, 6].includes(armor.length) ||
        !armor.every(Number.isSafeInteger) ||
        (lines !== undefined &&
          (lines.length !== armor.length ||
            lines.some(
              (line, index) =>
                line.trim() === '' || Number(line) !== armor[index],
            )))
      ) {
        errors.push(
          'Invalid ProtoMek armor: expected five or six integer location values',
        );
      }
    }
    const structureError = getProtoStructureTonnageError(document.tonnage);
    if (structureError) errors.push(structureError);
    const chassisType = this.parseChassis(document, errors);
    if (errors.length > 0) return { errors, warnings };

    // Point/squad size (typically 5)
    const pointSize = document.trooperCount || 5;
    const squadSize = pointSize; // Same as point size for ProtoMechs

    // Weight per unit (individual ProtoMech weight in tons)
    const weightPerUnit = document.tonnage;
    if (weightPerUnit < 2 || weightPerUnit > 9) {
      warnings.push(`Unusual ProtoMech weight: ${weightPerUnit} tons`);
    }

    // Engine and movement
    const cruiseMP = document.cruiseMP ?? 4;
    const jumpMP = document.jumpingMP || 0;

    // Motion type
    const motionType = jumpMP > 0 ? SquadMotionType.JUMP : SquadMotionType.FOOT;
    const movement: ISquadMovement = { groundMP: cruiseMP, jumpMP, umuMP: 0 };

    // Armor per location
    const armor = document.armor || [];
    const armorByLocation = this.parseArmorByLocation(armor);
    const armorPerTrooper = armor.reduce((sum, val) => sum + val, 0);

    // Equipment
    const equipment = this.parseEquipment(document);

    // BLKProtoMekFile derives topology from armor count, even for an empty mount.
    const hasMainGun = armor.length === 6;
    const structureByLocation = computeProtoStructure(
      weightPerUnit,
      chassisType,
      hasMainGun,
    );
    const topologyError = getProtoMainGunTopologyError(
      hasMainGun,
      equipment.map((item) => item.location),
      armorByLocation[ProtoMechLocation.MAIN_GUN],
    );
    if (topologyError)
      warnings.push(`${topologyError}; upstream ignores these entries`);

    // Special features from raw tags
    const rawTags = document.rawTags || {};
    const engineRating = computeProtoEngineRating(
      weightPerUnit,
      cruiseMP,
      chassisType,
    );
    const hasMyomerBooster = getRawTagBoolean(rawTags, 'myomerbooster');
    const hasMagneticClamps = getRawTagBoolean(rawTags, 'magneticclamps');
    const hasExtendedTorsoTwist = getRawTagBoolean(
      rawTags,
      'extendedtorsotwist',
    );

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
      chassisType,
      hasMyomerBooster,
      hasMagneticClamps,
      hasExtendedTorsoTwist,
      errors,
      warnings,
    };
  }

  private parseChassis(document: IBlkDocument, errors: string[]): ProtoChassis {
    const motion = document.motionType?.trim().toLowerCase();
    let chassis: ProtoChassis = ProtoChassis.BIPED;
    if (motion !== undefined || document.rawTags.motion_type !== undefined) {
      const entry = Object.entries(BLK_PROTOMECH_CHASSIS).find(
        ([name]) => name.toLowerCase() === motion,
      );
      if (!entry)
        errors.push(`Unsupported ProtoMek motion_type: ${document.motionType}`);
      else chassis = entry[1];
    } else if (document.unitType.toLowerCase() === 'protomek') {
      errors.push('Missing required ProtoMek motion_type');
    } else if (getRawTagBoolean(document.rawTags, 'glider')) {
      chassis = ProtoChassis.GLIDER;
    } else if (getRawTagBoolean(document.rawTags, 'quad')) {
      chassis = ProtoChassis.QUAD;
    }
    return chassis === ProtoChassis.BIPED && document.tonnage >= 10
      ? ProtoChassis.ULTRAHEAVY
      : chassis;
  }

  /** Parse armor values into location-keyed record. */
  private parseArmorByLocation(
    armor: readonly number[],
  ): Record<ProtoMechLocation, number> {
    const result: Record<ProtoMechLocation, number> = {
      [ProtoMechLocation.HEAD]: 0,
      [ProtoMechLocation.TORSO]: 0,
      [ProtoMechLocation.LEFT_ARM]: 0,
      [ProtoMechLocation.RIGHT_ARM]: 0,
      [ProtoMechLocation.LEGS]: 0,
      [ProtoMechLocation.MAIN_GUN]: 0,
    };

    BLK_PROTOMECH_ARMOR_LOCATIONS.forEach((loc, index) => {
      if (index < armor.length) {
        result[loc] = armor[index];
      }
    });

    return result;
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IProtoMechMountedEquipment[] {
    return mapLocationEquipment(
      document.equipmentByLocation,
      (locationKey) => this.normalizeLocation(locationKey),
      ({ mountId, item, location }) => ({
        id: `mount-${mountId}`,
        equipmentId: item,
        name: item,
        location,
        isMainGun: location === ProtoMechLocation.MAIN_GUN,
      }),
    );
  }

  /**
   * Normalize location string to ProtoMechLocation enum
   */
  private normalizeLocation(locationKey: string): ProtoMechLocation {
    const normalized = locationKey.toLowerCase();
    return LOCATION_MAP[normalized] || ProtoMechLocation.TORSO;
  }

  /**
   * Combine common and ProtoMech-specific fields into IProtoMech
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IProtoMech>,
  ): IProtoMech {
    const techBase = parseInnerSphereOrClan(commonFields.techBase);
    const rulesLevel = parseRulesLevelFromType(
      commonFields.techBase,
      RulesLevel.ADVANCED,
    );

    // Weight class based on individual ProtoMech tonnage
    const weightClass = this.getWeightClass(
      typeSpecificFields.weightPerUnit || 5,
    );

    const unit = {
      ...buildCommonUnitFields({
        commonFields,
        idPrefix: 'protomech',
        unitType: UnitType.PROTOMECH,
        weightClass: weightClass,
        techBase,
        rulesLevel,
      }),
      ...typeSpecificFields,
    } as IProtoMech;
    return withConstructionDiagnostics(unit, this.validate(unit));
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
  protected serializeTypeSpecificFields(
    unit: IProtoMech,
  ): Partial<ISerializedUnit> {
    // Project the canonical chassisType discriminant onto the legacy
    // serialized "configuration" string. Only QUAD vs everything-else is
    // observable at this boundary; Glider and Ultraheavy are stored on the
    // chassisType field itself.
    return {
      configuration: unit.chassisType === ProtoChassis.QUAD ? 'Quad' : 'Biped',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IProtoMech> {
    return createFailureResult([
      'ProtoMech deserialization not yet implemented',
    ]);
  }

  /**
   * Validate ProtoMech-specific rules
   */
  protected validateTypeSpecificRules(
    unit: IProtoMech,
  ): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

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
    if (unit.hasMainGun && unit.chassisType === ProtoChassis.QUAD) {
      errors.push('Quad ProtoMechs cannot have main guns');
    }

    // Glider validation
    if (unit.chassisType === ProtoChassis.GLIDER && unit.jumpMP < 2) {
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
   * Calculate ProtoMech BV using the full BV 2.0 calculator.
   *
   * Adapts the legacy `IProtoMech` shape (used by this handler) onto the
   * canonical `IProtoMechUnit` shape consumed by
   * {@link calculateProtoMechBV}, then returns the `final` breakdown field.
   *
   * The legacy stub that combined armor × 15 + cruiseMP × 10 + jumpMP × 15
   * is replaced: per the spec, the full BV 2.0 proto formula (defensive +
   * offensive, chassis multiplier, pilot adjustment) now applies.
   *
   * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
   *       — Requirement: Scope — Full BV Calculation Included
   * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
   *       — Requirement: ProtoMech BV Dispatch
   */
  protected calculateTypeSpecificBV(unit: IProtoMech): number {
    const adapted = this.toProtoMechUnit(unit);
    const breakdown = calculateProtoMechBV(adapted);
    return breakdown.final;
  }

  /**
   * Adapter: legacy IProtoMech → canonical IProtoMechUnit for the BV path.
   *
   * The BV calculator only reads a subset of fields on the unit — armor,
   * structure, equipment, MP, chassis, tonnage. This adapter fills those
   * accurately and uses sensible defaults for identity fields that the
   * calculator does not inspect but TypeScript still requires.
   */
  private toProtoMechUnit(unit: IProtoMech): IProtoMechUnit {
    // chassisType is the canonical discriminant on IProtoMech; the BV-shape
    // unit reuses it directly so the two layers cannot drift.
    const chassisType: ProtoChassis = unit.chassisType;

    const weightClass: ProtoWeightClass =
      unit.weightPerUnit <= 4
        ? ProtoWeightClass.LIGHT
        : unit.weightPerUnit <= 7
          ? ProtoWeightClass.MEDIUM
          : unit.weightPerUnit <= 9
            ? ProtoWeightClass.HEAVY
            : ProtoWeightClass.ULTRAHEAVY;

    const armorByLocation: IProtoArmorByLocation = {
      [ProtoLocation.HEAD]: unit.armorByLocation[ProtoMechLocation.HEAD] ?? 0,
      [ProtoLocation.TORSO]: unit.armorByLocation[ProtoMechLocation.TORSO] ?? 0,
      [ProtoLocation.LEFT_ARM]:
        unit.armorByLocation[ProtoMechLocation.LEFT_ARM] ?? 0,
      [ProtoLocation.RIGHT_ARM]:
        unit.armorByLocation[ProtoMechLocation.RIGHT_ARM] ?? 0,
      [ProtoLocation.LEGS]: unit.armorByLocation[ProtoMechLocation.LEGS] ?? 0,
      [ProtoLocation.MAIN_GUN]:
        unit.armorByLocation[ProtoMechLocation.MAIN_GUN] ?? 0,
    };
    const structureByLocation: IProtoArmorByLocation = {
      [ProtoLocation.HEAD]:
        unit.structureByLocation[ProtoMechLocation.HEAD] ?? 0,
      [ProtoLocation.TORSO]:
        unit.structureByLocation[ProtoMechLocation.TORSO] ?? 0,
      [ProtoLocation.LEFT_ARM]:
        unit.structureByLocation[ProtoMechLocation.LEFT_ARM] ?? 0,
      [ProtoLocation.RIGHT_ARM]:
        unit.structureByLocation[ProtoMechLocation.RIGHT_ARM] ?? 0,
      [ProtoLocation.LEGS]:
        unit.structureByLocation[ProtoMechLocation.LEGS] ?? 0,
      [ProtoLocation.MAIN_GUN]:
        unit.structureByLocation[ProtoMechLocation.MAIN_GUN] ?? 0,
    };

    const equipment: ReadonlyArray<IProtoMechMountedEquipmentV2> =
      unit.equipment.map((mount) => ({
        id: mount.id,
        equipmentId: mount.equipmentId,
        name: mount.name,
        location: this.toBVLocation(mount.location),
        linkedAmmoId: mount.linkedAmmoId,
        // A mount in the MainGun slot is treated as a main gun. IProtoMech
        // doesn't carry an explicit isMainGun flag, so we derive from loc.
        isMainGun: mount.location === ProtoMechLocation.MAIN_GUN,
      }));

    // Legacy IProtoMech uses `cruiseMP` for walk; flank/run comes from
    // cruise + 1 (standard ProtoMech run formula).
    const walkMP = unit.cruiseMP;
    const runMP = unit.cruiseMP + 1;

    return {
      id: unit.id,
      name: unit.name,
      chassis: unit.metadata?.chassis ?? '',
      model: unit.metadata?.model ?? '',
      // IUnitMetadata has no mulId; legacy IProtoMech handler does not track
      // it. The BV calculator does not read this field, so we pass a stable
      // placeholder to satisfy the IProtoMechUnit shape.
      mulId: '-1',
      year: unit.metadata?.year ?? 3060,
      unitType: UnitType.PROTOMECH,
      techBase: unit.techBase,
      tonnage: unit.weightPerUnit,
      weightClass,
      chassisType,
      pointSize: unit.pointSize,
      walkMP,
      runMP,
      jumpMP: unit.jumpMP,
      engineRating: unit.engineRating,
      engineWeight: unit.engineRating * 0.025,
      myomerBooster: unit.hasMyomerBooster,
      // Glider Wings is a passive special equipment of the Glider chassis;
      // derive from the discriminant so the projection always matches.
      glidingWings: unit.chassisType === ProtoChassis.GLIDER,
      armorType: 'Standard',
      armorByLocation,
      structureByLocation,
      hasMainGun: unit.hasMainGun,
      mainGunWeaponId: undefined,
      equipment,
      isModified: false,
      createdAt: 0,
      lastModifiedAt: 0,
    };
  }

  /**
   * Map the handler's ProtoMechLocation enum onto the BV calculator's
   * ProtoLocation enum. Both use identical string values today, but this
   * explicit map localizes any future divergence.
   */
  private toBVLocation(loc: ProtoMechLocation): ProtoLocation {
    switch (loc) {
      case ProtoMechLocation.HEAD:
        return ProtoLocation.HEAD;
      case ProtoMechLocation.TORSO:
        return ProtoLocation.TORSO;
      case ProtoMechLocation.LEFT_ARM:
        return ProtoLocation.LEFT_ARM;
      case ProtoMechLocation.RIGHT_ARM:
        return ProtoLocation.RIGHT_ARM;
      case ProtoMechLocation.LEGS:
        return ProtoLocation.LEGS;
      case ProtoMechLocation.MAIN_GUN:
        return ProtoLocation.MAIN_GUN;
      default:
        return ProtoLocation.TORSO;
    }
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
    if (unit.chassisType === ProtoChassis.GLIDER) costPerUnit += 50000;
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
