import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type {
  IVehicle,
  IVehicleTurretSourceContext,
  IVTOL,
} from '@/types/unit/VehicleInterfaces';
import type { VehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';

import { decodeBlkArmorType } from '@/services/conversion/BlkArmorCodes';
import {
  decodeBlkVehicleEngine,
  isClanBlkEngine,
} from '@/services/conversion/blkEngineIdentity';
import { isClanSourceChassis } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { getNativeWeightLookupToken } from '@/utils/construction/equipmentBV/normalization';
import {
  computeVehicleArmorWeight,
  resolveVehicleClanArmor,
} from '@/utils/construction/vehicle/armor';
import { getVehicleSourceIdentity } from '@/utils/construction/vehicle/equipmentMounts';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';
import { computeVehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';

type NativeTankWeightUnit = Pick<
  IVehicle,
  | 'engineType'
  | 'clanEngine'
  | 'engineRating'
  | 'motionType'
  | 'armorType'
  | 'armorTechLevel'
  | 'armorLayoutError'
  | 'totalArmorPoints'
  | 'internalStructureType'
  | 'equipment'
  | 'turret'
  | 'secondaryTurret'
  | keyof IVehicleTurretSourceContext
>;

type NativeCombatVehicleWeightUnit = NativeTankWeightUnit & {
  readonly unitType: UnitType.VEHICLE | UnitType.VTOL;
  readonly hasNoControlSystems: boolean;
};

type NativeVTOLWeightUnit = Pick<
  IVTOL,
  | 'unitType'
  | 'engineType'
  | 'engineRating'
  | 'motionType'
  | 'armorType'
  | 'armorLayoutError'
  | 'totalArmorPoints'
  | 'internalStructureType'
  | 'equipment'
  | 'chinTurret'
  | keyof IVehicleTurretSourceContext
>;

/** Preserve the native tag's integer parsing, including the explicit -1 sentinel. */
export function getNativeVehicleArmorTechLevel(source: IBlkDocument): number {
  return Number.parseInt(String(source.rawTags.armor_tech_level ?? ''), 10);
}

/**
 * MegaMek T_STRUCTURE_UNKNOWN (EquipmentType.java:138, 48fcb2f64). BLKTankFile
 * stores a `-1` tag verbatim, and TestTank.getStructure:87-95 maps only `1` to
 * Endo Steel, so `-1` weighs through Structure.getWeightStructure's Standard branch.
 */
const T_STRUCTURE_UNKNOWN = -1;

/** Native-input transport into the shared construction owner. */
export function computeNativeTankWeight(
  source: IBlkDocument,
  unit: NativeTankWeightUnit,
): VehicleWeightBreakdown | undefined {
  return computeNativeCombatVehicleWeight(source, {
    ...unit,
    unitType: UnitType.VEHICLE,
    // BLKTankFile.java:268-269 uses tag presence, regardless of its payload.
    hasNoControlSystems: Object.keys(source.rawTags).some(
      (key) => key.toLowerCase() === 'hasnocontrolsystems',
    ),
  });
}

/**
 * Native VTOL fields use the same construction owners as Tank.
 * TestTank.java:229-239 (48fcb2f64): rotor mass is the existing lifting term.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 */
export function computeNativeVTOLWeight(
  source: IBlkDocument,
  unit: NativeVTOLWeightUnit,
): VehicleWeightBreakdown | undefined {
  const armorTechLevel = getNativeVehicleArmorTechLevel(source);
  return computeNativeCombatVehicleWeight(source, {
    ...unit,
    unitType: UnitType.VTOL,
    internalStructureType: unit.internalStructureType ?? 0,
    clanEngine: isClanBlkEngine(source.type, source.rawTags.clan_engine),
    ...(Number.isInteger(armorTechLevel) ? { armorTechLevel } : {}),
    turret: unit.chinTurret,
    // BLKVTOLFile.java:132-133,164-172 installs at most one chin turret.
    secondaryTurret: undefined,
    // Unlike BLKTankFile, BLKVTOLFile never reads hasNoControlSystems.
    hasNoControlSystems: false,
  });
}

function computeNativeCombatVehicleWeight(
  source: IBlkDocument,
  unit: NativeCombatVehicleWeightUnit,
): VehicleWeightBreakdown | undefined {
  // Do not silently turn an unsupported native structure or armor into Standard.
  if (
    source.cruiseMP === undefined ||
    (unit.internalStructureType !== 0 &&
      unit.internalStructureType !== T_STRUCTURE_UNKNOWN) ||
    unit.armorLayoutError
  )
    return undefined;
  const clan = isClanSourceChassis(source.type);
  // ArmorType.forEntity:96-101 uses TechConstants.isClan, including explicit -1.
  const clanArmor = resolveVehicleClanArmor(unit.armorTechLevel, clan);
  const armorType = decodeBlkArmorType(unit.armorType, clanArmor);
  if (armorType === undefined) return undefined;
  const techBase = clan ? TechBase.CLAN : TechBase.INNER_SPHERE;
  const mode = clan ? TechBaseMode.CLAN : TechBaseMode.INNER_SPHERE;
  const equipment = unit.equipment.map((mount) => {
    const original =
      getVehicleSourceIdentity(mount)?.sourceId ?? mount.equipmentId;
    // Resolve this native array for weight without rerouting public API identities.
    const { equipmentDef } = resolveEquipmentId(
      getNativeWeightLookupToken(original),
      techBase,
      mode,
      undefined,
      mount.name,
    );
    const equipmentId = equipmentDef?.id ?? mount.equipmentId;
    return {
      ...mount,
      equipmentId,
      isAmmo: isAmmunitionEquipmentId(original),
      ...(equipmentId === original
        ? {}
        : { sourceIdentity: { sourceId: original, resolvedId: equipmentId } }),
    };
  });
  const lookup = getEquipmentLookupService();
  const weights = computeVehicleWeightBreakdown(
    {
      ...unit,
      tonnage: source.tonnage,
      year: source.year,
      techBase,
      engineType: decodeBlkVehicleEngine(
        unit.engineType,
        unit.clanEngine ?? clan,
      ),
      cruiseMP: source.cruiseMP,
      armorType,
      armorTonnage: computeVehicleArmorWeight(unit.totalArmorPoints, armorType),
      structureType: VehicleStructureType.STANDARD,
      turret: unit.turret ?? null,
      secondaryTurret: unit.secondaryTurret ?? null,
      equipment,
      powerAmpWeight: 0,
      transporters: source.transporters ?? [],
    },
    (id, isAmmo) => lookup.getMountedById(id, isAmmo === true),
  );
  return weights.isComplete && weights.remaining !== null ? weights : undefined;
}

/** Populate common validation fields only from a complete construction result. */
export function withNativeTankWeight<
  T extends NativeTankWeightUnit & { readonly errors: readonly string[] },
>(
  source: IBlkDocument,
  fields: T,
): T & Partial<Pick<IVehicle, 'totalWeight' | 'remainingTonnage'>> {
  const weights = fields.errors.length
    ? undefined
    : computeNativeTankWeight(source, fields);
  return withNativeVehicleWeight(source, fields, weights);
}

/** Publish only complete source-derived VTOL mass, without changing legacy APIs. */
export function withNativeVTOLWeight<
  T extends NativeVTOLWeightUnit & { readonly errors: readonly string[] },
>(
  source: IBlkDocument,
  fields: T,
): T & Partial<Pick<IVTOL, 'totalWeight' | 'remainingTonnage'>> {
  const weights = fields.errors.length
    ? undefined
    : computeNativeVTOLWeight(source, fields);
  return withNativeVehicleWeight(source, fields, weights);
}

function withNativeVehicleWeight<
  T extends { readonly errors: readonly string[] },
>(
  source: IBlkDocument,
  fields: T,
  weights: VehicleWeightBreakdown | undefined,
): T & Partial<Pick<IVehicle, 'totalWeight' | 'remainingTonnage'>> {
  return weights?.remaining == null
    ? fields
    : {
        ...fields,
        totalWeight: source.tonnage - weights.remaining,
        remainingTonnage: weights.remaining,
      };
}

/**
 * The number-only legacy handler API cannot represent construction completeness.
 * @spec openspec/changes/reject-incomplete-combat-vehicle-handler-weight/specs/vehicle-unit-system/spec.md
 */
export function rejectIncompleteCombatVehicleWeight(): never {
  throw new Error(
    'Combat vehicle handler weight is incomplete: resolved equipment masses and complete construction terms are unavailable',
  );
}
