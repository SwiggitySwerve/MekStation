/**
 * ProtoMech Unit Handler
 *
 * Handler for parsing, validating, and serializing ProtoMech units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.6
 */

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { TechBase, Era, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
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
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

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
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IProtoMech> & {
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
      (e) => e.location === ProtoMechLocation.MAIN_GUN,
    );

    // Special features from raw tags
    const rawTags = document.rawTags || {};
    const isGlider = this.getBooleanFromRaw(rawTags, 'glider');
    const isQuad = this.getBooleanFromRaw(rawTags, 'quad');
    const hasMyomerBooster = this.getBooleanFromRaw(rawTags, 'myomerbooster');
    const hasMagneticClamps = this.getBooleanFromRaw(rawTags, 'magneticclamps');
    const hasExtendedTorsoTwist = this.getBooleanFromRaw(
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
  private calculateStructure(
    tonnage: number,
  ): Record<ProtoMechLocation, number> {
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
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IProtoMechMountedEquipment[] {
    const equipment: IProtoMechMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(
      document.equipmentByLocation,
    )) {
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
    key: string,
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
    typeSpecificFields: Partial<IProtoMech>,
  ): IProtoMech {
    // ProtoMechs are always Clan tech
    const techBase = TechBase.CLAN;
    const rulesLevel = RulesLevel.ADVANCED;

    // Weight class based on individual ProtoMech tonnage
    const weightClass = this.getWeightClass(
      typeSpecificFields.weightPerUnit || 5,
    );

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
  protected serializeTypeSpecificFields(
    unit: IProtoMech,
  ): Partial<ISerializedUnit> {
    return {
      configuration: unit.isQuad ? 'Quad' : 'Biped',
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
    const chassisType: ProtoChassis = unit.isGlider
      ? ProtoChassis.GLIDER
      : unit.isQuad
        ? ProtoChassis.QUAD
        : unit.weightPerUnit >= 10
          ? ProtoChassis.ULTRAHEAVY
          : ProtoChassis.BIPED;

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
      glidingWings: unit.isGlider,
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
