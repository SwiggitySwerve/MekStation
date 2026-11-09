import { mapTechBaseMode } from '@/services/units/unitLoaderService/componentMappers';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBase } from '@/types/enums/TechBase';
import { isRegistryEquipment } from '@/utils/construction/equipmentBVCatalogData';

/**
 * Pinned mass for a raw BLK mount token that the unit loader resolves to a
 * Java-derived registry entry (`lrt-10-registry`, 5 t). The support payload
 * receives the BLK token as written, and the BV catalog matches some of those by
 * name to legacy stubs whose mass is not pinned (`lrtorpedo10`, 2.5 t against
 * Java 5). Registry entries carry the pinned mass; the stubs do not. A
 * definition outside the registry (cargo, flail, wrecking ball) is not
 * authoritative for mass here, so the BV entry keeps answering for it.
 * Undefined when the loader finds no registry entry.
 */
export function getSupportRegistryMass(
  equipmentId: string,
  techBase: TechBase,
  name?: string,
): number | undefined {
  const { equipmentDef } = resolveEquipmentId(
    equipmentId,
    techBase,
    mapTechBaseMode(techBase),
    undefined,
    name,
  );
  return equipmentDef !== undefined &&
    isRegistryEquipment(equipmentDef.id) &&
    equipmentDef.weight !== undefined
    ? equipmentDef.weight
    : undefined;
}
