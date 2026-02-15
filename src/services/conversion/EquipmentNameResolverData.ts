import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';
import { weaponCategoryToEquipmentCategory } from '@/utils/equipment/categoryRegistry';

export function getAllEquipmentItemsForResolver(): IEquipmentItem[] {
  const loader = getEquipmentLoader();
  if (!loader.getIsLoaded()) {
    return [];
  }

  const items: IEquipmentItem[] = [];

  for (const weapon of loader.getAllWeapons()) {
    const category = weaponCategoryToEquipmentCategory(weapon.category);
    items.push({
      id: weapon.id,
      name: weapon.name,
      category,
      techBase: weapon.techBase,
      rulesLevel: weapon.rulesLevel,
      weight: weapon.weight,
      criticalSlots: weapon.criticalSlots,
      costCBills: weapon.costCBills,
      battleValue: weapon.battleValue,
      introductionYear: weapon.introductionYear,
    });
  }

  for (const ammo of loader.getAllAmmunition()) {
    items.push({
      id: ammo.id,
      name: ammo.name,
      category: EquipmentCategory.AMMUNITION,
      techBase: ammo.techBase,
      rulesLevel: ammo.rulesLevel,
      weight: ammo.weight,
      criticalSlots: ammo.criticalSlots,
      costCBills: ammo.costPerTon,
      battleValue: ammo.battleValue,
      introductionYear: ammo.introductionYear,
    });
  }

  for (const elec of loader.getAllElectronics()) {
    items.push({
      id: elec.id,
      name: elec.name,
      category: EquipmentCategory.ELECTRONICS,
      techBase: elec.techBase,
      rulesLevel: elec.rulesLevel,
      weight: elec.weight,
      criticalSlots: elec.criticalSlots,
      costCBills: elec.costCBills,
      battleValue: elec.battleValue,
      introductionYear: elec.introductionYear,
    });
  }

  for (const misc of loader.getAllMiscEquipment()) {
    items.push({
      id: misc.id,
      name: misc.name,
      category: EquipmentCategory.MISC_EQUIPMENT,
      techBase: misc.techBase,
      rulesLevel: misc.rulesLevel,
      weight: misc.weight,
      criticalSlots: misc.criticalSlots,
      costCBills: misc.costCBills,
      battleValue: misc.battleValue,
      introductionYear: misc.introductionYear,
    });
  }

  return items;
}
