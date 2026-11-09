/**
 * Unit Loader Service - Equipment Mapping
 *
 * Functions for mapping equipment arrays from serialized units to mounted equipment instances.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import type { ISerializedEquipmentInput } from '@/types/unit/UnitSerialization';

import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { logger } from '@/utils/logger';

import { mapMechLocation } from './componentMappers';
import {
  getCriticalSlotsForLocation,
  restoreCriticalSlotEquipment,
} from './criticalSlotEquipment';
import { resolveEquipmentId } from './equipmentResolution';
import { mountedDefinitionFields } from './mountedDefinitionFields';

type UnitCriticalSlots = Readonly<Record<string, ReadonlyArray<string | null>>>;

/**
 * Map equipment array to IMountedEquipmentInstance array
 * Looks up equipment from the equipment database to get full properties.
 * Uses multiple resolution strategies including ID normalization and aliasing.
 */
export function mapEquipment(
  equipment: readonly ISerializedEquipmentInput[] | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  unitCriticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
): IMountedEquipmentInstance[] {
  const serialized = equipment ?? [];

  const mapped = serialized.map((item) => {
    const location = mapMechLocation(item.location);
    const locationCriticalSlots = getCriticalSlotsForLocation(
      unitCriticalSlots,
      location,
    );

    // Look up equipment using multiple resolution strategies
    const { equipmentDef, resolvedId } = resolveEquipmentId(
      item.id,
      unitTechBase,
      unitTechBaseMode,
      locationCriticalSlots,
    );

    if (equipmentDef) {
      // Log if we resolved through normalization/aliasing
      if (resolvedId !== item.id) {
        logger.debug(`Equipment ID resolved: "${item.id}" -> "${resolvedId}"`);
      }

      return {
        instanceId: uuidv4(),
        ...mountedDefinitionFields(equipmentDef),
        location,
        slots: item.slots ? [...item.slots] : undefined,
        isRearMounted: item.isRearMounted ?? false,
        linkedAmmoId: item.linkedAmmo,
        isRemovable: item.isRemovable ?? true,
        isOmniPodMounted: item.isOmniPodMounted ?? false,
      };
    } else {
      // Not found - create placeholder with unknown equipment
      logger.warn(
        `Equipment not found in database: ${item.id} (tried: ${resolvedId})`,
      );
      return {
        instanceId: uuidv4(),
        equipmentId: item.id,
        name: item.id, // Use ID as name fallback
        category: EquipmentCategory.MISC_EQUIPMENT, // Default to misc
        weight: 0, // Unknown weight
        criticalSlots: 1, // Assume 1 slot minimum
        heat: 0,
        techBase: unitTechBase, // Use unit's tech base
        location,
        slots: item.slots ? [...item.slots] : undefined,
        isRearMounted: item.isRearMounted ?? false,
        linkedAmmoId: item.linkedAmmo,
        isRemovable: item.isRemovable ?? true,
        isOmniPodMounted: item.isOmniPodMounted ?? false,
      };
    }
  });

  return restoreCriticalSlotEquipment(
    serialized,
    mapped,
    unitTechBase,
    unitTechBaseMode,
    unitCriticalSlots,
    tonnage,
    serialized.length === 0,
  );
}
