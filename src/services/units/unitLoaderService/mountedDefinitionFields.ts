import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { getWeaponById } from '@/utils/equipment/weapons/utilities';

/** The mounted fields an equipment definition gives a list entry. */
export function mountedDefinitionFields(
  equipmentDef: IEquipmentItem,
): Pick<
  IMountedEquipmentInstance,
  | 'equipmentId'
  | 'name'
  | 'category'
  | 'weight'
  | 'criticalSlots'
  | 'heat'
  | 'techBase'
> {
  return {
    equipmentId: equipmentDef.id,
    name: equipmentDef.name,
    category: equipmentDef.category,
    weight: equipmentDef.weight,
    criticalSlots: equipmentDef.criticalSlots,
    heat:
      equipmentDef.category === EquipmentCategory.AMMUNITION
        ? 0
        : (getWeaponById(equipmentDef.id)?.heat ??
          ('heat' in equipmentDef
            ? (equipmentDef as { heat: number }).heat
            : 0)),
    techBase: equipmentDef.techBase,
  };
}
