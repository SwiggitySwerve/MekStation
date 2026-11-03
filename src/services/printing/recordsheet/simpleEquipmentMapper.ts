import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { IRecordSheetEquipment } from '@/types/printing';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

import { mapCombatEquipment } from './dataExtractors.equipment';
import { lookupAmmoShots, lookupWeapon } from './equipmentUtils';

export interface ISimpleEquipmentInput {
  readonly id?: string;
  readonly equipmentId?: string;
  readonly name: string;
  readonly location: string;
  readonly heat?: number;
  readonly damage?: number | string;
  readonly ranges?: {
    readonly minimum: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
  };
  readonly isWeapon?: boolean;
  readonly isAmmo?: boolean;
  readonly ammoCount?: number;
}

export function mapSimpleRecordSheetEquipment(
  equipment: readonly ISimpleEquipmentInput[] | undefined,
): IRecordSheetEquipment[] {
  const lookup = getEquipmentLookupService();
  const allWeapons = lookup.getAllWeapons();
  const ammunition = lookup.getAllAmmunition();
  return (equipment ?? []).map((eq, index) => {
    const sourceId = eq.equipmentId ?? eq.id;
    const catalogId = sourceId
      ? (getEquipmentEntry(sourceId)?.id ?? sourceId)
      : undefined;
    const weapon = lookupWeapon(allWeapons, eq.name, catalogId, false);
    const ammoCount = lookupAmmoShots(ammunition, eq.name, catalogId);
    const resolved =
      weapon || ammoCount !== undefined
        ? mapCombatEquipment(
            {
              ...eq,
              id: catalogId ?? String(index),
              isAmmo: eq.isAmmo ?? (!weapon && ammoCount !== undefined),
            },
            weapon,
            ammunition,
          )
        : undefined;
    return {
      id: eq.id ?? String(index),
      name: eq.name,
      location: eq.location,
      locationAbbr: eq.location.substring(0, 3).toUpperCase(),
      heat: eq.heat ?? resolved?.heat ?? '-',
      damage: eq.damage ?? resolved?.damage ?? '-',
      damageCode: resolved?.damageCode,
      minimum: eq.ranges?.minimum ?? resolved?.minimum ?? '-',
      short: eq.ranges?.short ?? resolved?.short ?? '-',
      medium: eq.ranges?.medium ?? resolved?.medium ?? '-',
      long: eq.ranges?.long ?? resolved?.long ?? '-',
      quantity: 1,
      isWeapon: eq.isWeapon ?? resolved?.isWeapon ?? false,
      isAmmo: eq.isAmmo ?? resolved?.isAmmo ?? false,
      ammoCount: eq.ammoCount ?? resolved?.ammoCount,
    };
  });
}
