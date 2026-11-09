import type { IProtoMechMountedEquipment } from '@/types/unit/ProtoMechInterfaces';

import { nativeOneShotAmmoMounts } from '../equipmentBV/nativeOneShotAmmoMounts';
import { getEquipmentEntry } from '../equipmentBVResolver';

/** Entity.java:5093-5175 at 48fcb2f64 appends intrinsic ammo after its launcher.
 * Keep public source mounts intact; only the diagnostic equipment index expands.
 * Admission, explicit bins, shots and BV calculations remain with their owners.
 */
export function nativeProtoEquipmentIndices(
  equipment: readonly Pick<IProtoMechMountedEquipment, 'equipmentId'>[],
): readonly number[] {
  let inserted = 0;
  return equipment.map((mount, sourceIndex) => {
    const index = sourceIndex + inserted;
    const id = getEquipmentEntry(mount.equipmentId)?.id;
    inserted += id === undefined ? 0 : (nativeOneShotAmmoMounts[id] ?? 0);
    return index;
  });
}
