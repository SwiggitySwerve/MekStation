/**
 * Unit Loader Service - Equipment Mapping
 *
 * Functions for mapping equipment arrays from serialized units to mounted equipment instances.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { ISerializedEquipmentInput } from '@/types/unit/UnitSerialization';

import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { logger } from '@/utils/logger';

import { mapMechLocation } from './componentMappers';
import {
  getCriticalSlotsForLocation,
  restoreCriticalSlotEquipmentWithDiagnostics,
  type ICriticalSlotEquipmentResult,
  type CriticalSlotSystemContext,
} from './criticalSlotEquipment';
import { resolveEquipmentId } from './equipmentResolution';
import { mountedDefinitionFields } from './mountedDefinitionFields';
import { sourceMountInstanceId } from './mountInstanceId';

type UnitCriticalSlots = Readonly<Record<string, ReadonlyArray<string | null>>>;

/**
 * Map equipment array to IMountedEquipmentInstance array
 * Looks up equipment from the equipment database to get full properties.
 * Uses multiple resolution strategies including ID normalization and aliasing.
 */
export function mapEquipmentWithDiagnostics(
  equipment: readonly ISerializedEquipmentInput[] | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  unitCriticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
  isOmni = false,
  systems?: CriticalSlotSystemContext,
): ICriticalSlotEquipmentResult {
  const serialized = equipment ?? [];

  const ordinals = new Map<string, number>();
  const mapped = serialized.map((item) => {
    const location = mapMechLocation(item.location);
    const ordinalKey = `${location}\0${item.id}`;
    const ordinal = ordinals.get(ordinalKey) ?? 0;
    ordinals.set(ordinalKey, ordinal + 1);
    const instanceId = sourceMountInstanceId(location, item.id, ordinal);
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
      undefined,
      item.slots,
    );

    if (equipmentDef) {
      // Log if we resolved through normalization/aliasing
      if (resolvedId !== item.id) {
        logger.debug(`Equipment ID resolved: "${item.id}" -> "${resolvedId}"`);
      }

      return {
        instanceId,
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
        instanceId,
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

  return restoreCriticalSlotEquipmentWithDiagnostics(
    serialized,
    mapped,
    unitTechBase,
    unitTechBaseMode,
    unitCriticalSlots,
    tonnage,
    serialized.length === 0,
    isOmni,
    systems,
  );
}

export function mapEquipment(
  ...args: Parameters<typeof mapEquipmentWithDiagnostics>
): IMountedEquipmentInstance[] {
  return mapEquipmentWithDiagnostics(...args).equipment;
}
