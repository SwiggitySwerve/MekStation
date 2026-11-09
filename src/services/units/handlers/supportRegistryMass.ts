import type { SupportRegistryMass } from '@/utils/construction/vehicle/supportPayload';

import { TechBase } from '@/types/enums/TechBase';
import { getNativeWeightLookupToken } from '@/utils/construction/equipmentBV/normalization';
import { isRegistryEquipment } from '@/utils/construction/equipmentBVCatalogData';

import { mapTechBaseMode } from '../unitLoaderService/componentMappers';
import { resolveEquipmentId } from '../unitLoaderService/equipmentResolution';

/**
 * The service-side lookup the pure support payload rule is given: pinned mass
 * for a raw BLK mount token that the unit loader resolves to a Java-derived
 * registry entry (`lrt-10-registry`, 5 t). The BV catalog matches some of those
 * tokens by name to legacy stubs whose mass is not pinned (`lrtorpedo10`, 2.5 t
 * against Java 5). Registry entries carry the pinned mass; the stubs do not. A
 * definition outside the registry (cargo, flail, wrecking ball) is not
 * authoritative for mass here, so the BV entry keeps answering for it.
 */
export function createSupportRegistryMass(
  techBase: TechBase,
): SupportRegistryMass {
  const mode = mapTechBaseMode(techBase);
  return (equipmentId, name) => {
    const { equipmentDef } = resolveEquipmentId(
      getNativeWeightLookupToken(equipmentId),
      techBase,
      mode,
      undefined,
      name,
    );
    return equipmentDef !== undefined &&
      isRegistryEquipment(equipmentDef.id) &&
      equipmentDef.weight !== undefined
      ? equipmentDef.weight
      : undefined;
  };
}
