import type { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';
import type {
  IProtoMechMountedEquipment as IBVMount,
  ProtoLocation,
} from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';

/** Preserve each adapter's existing location policy while sharing mount fields. */
export function projectProtoMechEquipment(
  equipment: readonly IProtoMechMountedEquipment[],
  resolveLocation: (location: ProtoMechLocation) => ProtoLocation,
): readonly IBVMount[] {
  return equipment.map((mount) => ({
    id: mount.id,
    equipmentId: mount.equipmentId,
    name: mount.name,
    location: resolveLocation(mount.location),
    linkedAmmoId: mount.linkedAmmoId,
    isMainGun: mount.location === ProtoMechLocation.MAIN_GUN,
    ...(mount.blkSource === undefined ? {} : { blkSource: mount.blkSource }),
  }));
}
