import type { IWeapon } from '@/simulation/ai/types';

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getVehicleWeaponArcs } from '@/utils/gameplay/vehicleFiringArc';
import { logger } from '@/utils/logger';

import {
  normalizedKey,
  recordField,
  stringField,
} from './CompendiumAdapter.fields';
import {
  canonicalizeWeaponId,
  getWeaponData,
} from './CompendiumAdapter.weaponData';

export type AdaptableEquipmentItem = Readonly<Record<string, unknown>> & {
  readonly id?: string;
  readonly equipmentId?: string;
  readonly name?: string;
  readonly location?: string;
};

export function extractWeapons(
  equipment: readonly AdaptableEquipmentItem[],
  unitId: string,
  unitData: Record<string, unknown>,
): IWeapon[] {
  const weapons: IWeapon[] = [];
  const idCounts = new Map<string, number>();

  for (const item of equipment) {
    const sourceWeaponId = equipmentWeaponId(item);
    if (!sourceWeaponId) {
      logger.warn(
        `[CompendiumAdapter] Equipment mount on unit "${unitId}" has no ` +
          'weapon id/equipmentId/name field - skipping.',
      );
      continue;
    }

    const canonicalId = canonicalizeWeaponId(sourceWeaponId);
    const data = getWeaponData(sourceWeaponId);
    if (!data) {
      logger.warn(
        `[CompendiumAdapter] Weapon id "${sourceWeaponId}" on unit "${unitId}" ` +
          `(canonical: "${canonicalId}") has no official weapon catalog entry - ` +
          `skipping. Add it to the official catalog or WEAPON_ID_ALIASES.`,
      );
      continue;
    }

    const count = (idCounts.get(canonicalId) ?? 0) + 1;
    idCounts.set(canonicalId, count);

    weapons.push({
      ...data,
      id: `${unitId}-${canonicalId}-${count}`,
      location: stringField(item, 'location', 'mountLocation', 'locationKey'),
      ...weaponMountArcsFromEquipment(item, unitData),
    });
  }

  return weapons;
}

export function ammoFromWeapons(
  weapons: readonly IWeapon[],
): Record<string, number> {
  const ammo: Record<string, number> = {};
  for (const weapon of weapons) {
    if (weapon.ammoPerTon > 0) {
      ammo[weapon.id] = weapon.ammoPerTon;
    }
  }
  return ammo;
}

function equipmentWeaponId(item: AdaptableEquipmentItem): string | undefined {
  const candidates = [
    stringField(item, 'equipmentId'),
    stringField(item, 'weaponId'),
    stringField(item, 'id'),
    stringField(item, 'name'),
  ].filter((candidate): candidate is string => candidate !== undefined);
  return (
    candidates.find((candidate) => getWeaponData(candidate) !== undefined) ??
    candidates[0]
  );
}

function weaponMountArcsFromEquipment(
  item: AdaptableEquipmentItem,
  unitData: Record<string, unknown>,
): Pick<
  IWeapon,
  | 'mountingArc'
  | 'mountingArcs'
  | 'vehicleMountLocation'
  | 'vehicleIsTurretMounted'
> {
  if (!isVehicleLikeUnitData(unitData)) return {};

  const mountLocation = vehicleMountLocationFromEquipment(item);
  if (!mountLocation) return {};
  const isTurretMounted =
    equipmentBooleanField(item, 'isTurretMounted') ||
    locationHas(item, 'turret', 'chin');
  const isSponsonMounted =
    equipmentBooleanField(item, 'isSponsonMounted') ||
    locationHas(item, 'sponson');

  const arcs = getVehicleWeaponArcs({
    mountLocation,
    isTurretMounted,
    isSponsonMounted,
    turretType: primaryTurretTypeFromUnitData(unitData),
    turretLocked: false,
    isSecondary: locationHas(item, 'turret2', 'turret 2', 'secondary turret'),
    secondaryTurretType: secondaryTurretTypeFromUnitData(unitData),
    secondaryTurretLocked: false,
  });

  const vehicleMountMetadata = {
    vehicleMountLocation: mountLocation,
    vehicleIsTurretMounted: isTurretMounted,
  };
  if (arcs.length === 0) {
    return { ...vehicleMountMetadata, mountingArcs: [] };
  }
  if (arcs.length === 1) {
    return {
      ...vehicleMountMetadata,
      mountingArc: arcs[0],
      mountingArcs: arcs,
    };
  }
  return { ...vehicleMountMetadata, mountingArcs: arcs };
}

const VEHICLE_LIKE_UNIT_TYPES = new Set([
  'vehicle',
  'tank',
  'supportvehicle',
  'supporttank',
  'supportvtol',
  'vtol',
  'naval',
]);

function isVehicleLikeUnitData(unitData: Record<string, unknown>): boolean {
  return VEHICLE_LIKE_UNIT_TYPES.has(
    normalizedKey(stringField(unitData, 'unitType', 'type')),
  );
}

function vehicleMountLocationFromEquipment(
  item: AdaptableEquipmentItem,
): VehicleLocation | VTOLLocation | undefined {
  const normalized = normalizedKey(
    stringField(item, 'location', 'mountLocation', 'locationKey'),
  );
  if (!normalized) return undefined;

  if (normalized.includes('turret2') || normalized.includes('turretsecond')) {
    return VehicleLocation.TURRET_2;
  }
  if (normalized.includes('turret') || normalized.includes('chin')) {
    return VehicleLocation.TURRET;
  }
  if (normalized.includes('front')) return VehicleLocation.FRONT;
  if (normalized.includes('left')) return VehicleLocation.LEFT;
  if (normalized.includes('right')) return VehicleLocation.RIGHT;
  if (normalized.includes('rear')) return VehicleLocation.REAR;
  if (normalized.includes('rotor')) return VTOLLocation.ROTOR;
  if (normalized.includes('body')) return VehicleLocation.BODY;
  return undefined;
}

function locationHas(
  item: AdaptableEquipmentItem,
  ...needles: readonly string[]
): boolean {
  const normalized = normalizedKey(
    stringField(item, 'location', 'mountLocation', 'locationKey'),
  );
  return needles.some((needle) => normalized.includes(normalizedKey(needle)));
}

function equipmentBooleanField(
  item: AdaptableEquipmentItem,
  ...fieldNames: readonly string[]
): boolean {
  return fieldNames.some((fieldName) => item[fieldName] === true);
}

function primaryTurretTypeFromUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return (
    turretTypeFromRecord(recordField(unitData.turret)) ??
    turretTypeFromRecord(recordField(unitData.chinTurret)) ??
    defaultTurretTypeForUnitData(unitData)
  );
}

function secondaryTurretTypeFromUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return turretTypeFromRecord(recordField(unitData.secondaryTurret));
}

function turretTypeFromRecord(
  record: Record<string, unknown> | undefined,
): TurretType | undefined {
  switch (normalizedKey(stringField(record, 'type', 'turretType'))) {
    case 'single':
      return TurretType.SINGLE;
    case 'dual':
      return TurretType.DUAL;
    case 'chin':
      return TurretType.CHIN;
    case 'sponsonleft':
      return TurretType.SPONSON_LEFT;
    case 'sponsonright':
      return TurretType.SPONSON_RIGHT;
    case 'none':
      return TurretType.NONE;
    default:
      return undefined;
  }
}

function defaultTurretTypeForUnitData(
  unitData: Record<string, unknown>,
): TurretType | undefined {
  return normalizedKey(stringField(unitData, 'unitType', 'type')).includes(
    'vtol',
  )
    ? TurretType.CHIN
    : TurretType.SINGLE;
}
