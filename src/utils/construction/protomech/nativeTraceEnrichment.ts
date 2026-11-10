import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';
import type { IProtoMechMountedEquipment } from '@/types/unit/ProtoMechInterfaces';

import { nativeProtoEquipmentIndices } from './nativeEquipmentIndices';

/** Append parity-only native positions without changing the ordinary BV snapshot. */
export function withProtoMechNativeIndices(
  breakdown: IProtoMechBVBreakdown,
  unitEquipment: readonly Pick<IProtoMechMountedEquipment, 'equipmentId'>[],
): IProtoMechBVBreakdown {
  const nativeIndices = nativeProtoEquipmentIndices(unitEquipment);
  return {
    ...breakdown,
    ...(breakdown.weaponMountBV === undefined
      ? {}
      : {
          weaponMountBV: breakdown.weaponMountBV.map((fact) => {
            const nativeEquipmentIndex = nativeIndices[fact.equipmentIndex];
            return {
              ...fact,
              ...(nativeEquipmentIndex !== fact.equipmentIndex
                ? { nativeEquipmentIndex }
                : {}),
            };
          }),
        }),
  };
}
