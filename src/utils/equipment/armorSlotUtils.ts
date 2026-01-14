/**
 * Armor Slot Utilities
 * 
 * Functions for creating armor equipment items (e.g., Ferro-Fibrous or Stealth slots).
 * All created items are configuration-based (isRemovable: false).
 */

import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { generateUnitId } from '@/utils/uuid';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { ARMOR_SLOTS_EQUIPMENT_ID, STEALTH_ARMOR_LOCATIONS } from './equipmentConstants';

export function createArmorEquipmentList(
  armorType: ArmorTypeEnum
): IMountedEquipmentInstance[] {
  const armorDef = getArmorDefinition(armorType);
  if (!armorDef || armorDef.criticalSlots === 0) {
    return [];
  }
  
  const result: IMountedEquipmentInstance[] = [];
  
  // Stealth armor: 6 × 2-slot items with fixed locations
  if (armorType === ArmorTypeEnum.STEALTH) {
    for (const location of STEALTH_ARMOR_LOCATIONS) {
      result.push({
        instanceId: generateUnitId(),
        equipmentId: `${ARMOR_SLOTS_EQUIPMENT_ID}-${armorType}`,
        name: 'Stealth',
        category: EquipmentCategory.STRUCTURAL,
        weight: 0,
        criticalSlots: 2,
        heat: 0,
        techBase: armorDef.techBase,
        location,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: false,
        isOmniPodMounted: false,
      });
    }
    return result;
  }

  // Other armor types: individual 1-slot items
  const slotCount = armorDef.criticalSlots;
  for (let i = 0; i < slotCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: `${ARMOR_SLOTS_EQUIPMENT_ID}-${armorType}`,
      name: armorDef.name,
      category: EquipmentCategory.STRUCTURAL,
      weight: 0,
      criticalSlots: 1,
      heat: 0,
      techBase: armorDef.techBase,
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

export function filterOutArmorSlots(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(ARMOR_SLOTS_EQUIPMENT_ID));
}
