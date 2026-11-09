import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type {
  IVehicle,
  IVehicleTurretSourceContext,
} from '@/types/unit/VehicleInterfaces';
import type { VehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';

import { decodeBlkArmorType } from '@/services/conversion/BlkArmorCodes';
import { decodeBlkVehicleEngine } from '@/services/conversion/blkEngineIdentity';
import { isClanSourceChassis } from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { getNativeEquipmentLookupToken } from '@/utils/construction/equipmentBV/normalization';
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

/** Native-input transport into the shared construction owner. */
export function computeNativeTankWeight(
  source: IBlkDocument,
  unit: NativeTankWeightUnit,
): VehicleWeightBreakdown | undefined {
  // Do not silently turn an unsupported native structure or armor into Standard.
  if (
    source.cruiseMP === undefined ||
    unit.internalStructureType !== 0 ||
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
    const lookupToken = /^islmga\(st\)(?::omni)?$/i.test(original)
      ? getNativeEquipmentLookupToken(original)
      : original;
    const { equipmentDef } = resolveEquipmentId(
      lookupToken,
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
      unitType: UnitType.VEHICLE,
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
      // BLKTankFile.java:268-269 uses tag presence, regardless of its payload.
      hasNoControlSystems: Object.keys(source.rawTags).some(
        (key) => key.toLowerCase() === 'hasnocontrolsystems',
      ),
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
