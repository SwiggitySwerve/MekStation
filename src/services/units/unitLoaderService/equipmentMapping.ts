/**
 * Unit Loader Service - Equipment Mapping
 *
 * Functions for mapping equipment arrays from serialized units to mounted equipment instances.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { mapMechLocation } from './componentMappers';
import { resolveEquipmentId, CRITICAL_SLOTS_LOCATION_KEYS } from './equipmentResolution';

type UnitCriticalSlots = Readonly<Record<string, ReadonlyArray<string | null>>>;

/**
 * Map equipment array to IMountedEquipmentInstance array
 * Looks up equipment from the equipment database to get full properties.
 * Uses multiple resolution strategies including ID normalization and aliasing.
 */
export function mapEquipment(
  equipment: ReadonlyArray<{ id: string; location: string; isOmniPodMounted?: boolean }> | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  unitCriticalSlots: UnitCriticalSlots | undefined
): IMountedEquipmentInstance[] {
  if (!equipment || equipment.length === 0) {
    return [];
  }

  return equipment.map((item) => {
    const location = mapMechLocation(item.location);
    const locationCriticalSlots = unitCriticalSlots
      ? (location ? unitCriticalSlots[CRITICAL_SLOTS_LOCATION_KEYS[location] ?? ''] : unitCriticalSlots[item.location])
      : undefined;

    // Look up equipment using multiple resolution strategies
    const { equipmentDef, resolvedId } = resolveEquipmentId(
      item.id,
      unitTechBase,
      unitTechBaseMode,
      locationCriticalSlots
    );

    if (equipmentDef) {
      // Found in database - use full properties
      const heat = 'heat' in equipmentDef ? (equipmentDef as { heat: number }).heat : 0;

      // Log if we resolved through normalization/aliasing
      if (resolvedId !== item.id) {
        console.debug(`Equipment ID resolved: "${item.id}" → "${resolvedId}"`);
      }

      return {
        instanceId: uuidv4(),
        equipmentId: equipmentDef.id,
        name: equipmentDef.name,
        category: equipmentDef.category,
        weight: equipmentDef.weight,
        criticalSlots: equipmentDef.criticalSlots,
        heat,
        techBase: equipmentDef.techBase,
        location,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: true, // User-added equipment is removable
        isOmniPodMounted: item.isOmniPodMounted ?? false,
      };
    } else {
      // Not found - create placeholder with unknown equipment
      console.warn(`Equipment not found in database: ${item.id} (tried: ${resolvedId})`);
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
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: true, // User-added equipment is removable
        isOmniPodMounted: item.isOmniPodMounted ?? false,
      };
    }
  });
}
