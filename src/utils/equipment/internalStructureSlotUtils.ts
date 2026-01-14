/**
 * Internal Structure Slot Utilities
 * 
 * Functions for creating internal structure equipment items (e.g., Endo Steel slots).
 * All created items are configuration-based (isRemovable: false).
 */

import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { generateUnitId } from '@/utils/uuid';
import { 
  InternalStructureType, 
  getInternalStructureDefinition 
} from '@/types/construction/InternalStructureType';
import { INTERNAL_STRUCTURE_EQUIPMENT_ID } from './equipmentConstants';

export function createInternalStructureEquipmentList(
  structureType: InternalStructureType
): IMountedEquipmentInstance[] {
  const structureDef = getInternalStructureDefinition(structureType);
  if (!structureDef || structureDef.criticalSlots === 0) {
    return [];
  }
  
  const result: IMountedEquipmentInstance[] = [];
  const slotCount = structureDef.criticalSlots;
  
  for (let i = 0; i < slotCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: `${INTERNAL_STRUCTURE_EQUIPMENT_ID}-${structureType}`,
      name: structureDef.name,
      category: EquipmentCategory.STRUCTURAL,
      weight: 0,
      criticalSlots: 1,
      heat: 0,
      techBase: structureDef.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false,
      isOmniPodMounted: false,
    });
  }
  return result;
}

export function filterOutInternalStructure(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(INTERNAL_STRUCTURE_EQUIPMENT_ID));
}
