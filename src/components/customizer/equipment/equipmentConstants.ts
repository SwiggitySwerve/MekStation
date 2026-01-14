import { EquipmentCategory } from '@/types/equipment';

export const CATEGORY_ORDER: EquipmentCategory[] = [
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
  EquipmentCategory.MISC_EQUIPMENT,
];

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.ENERGY_WEAPON]: 'Energy',
  [EquipmentCategory.BALLISTIC_WEAPON]: 'Ballistic',
  [EquipmentCategory.MISSILE_WEAPON]: 'Missile',
  [EquipmentCategory.ARTILLERY]: 'Artillery',
  [EquipmentCategory.CAPITAL_WEAPON]: 'Capital',
  [EquipmentCategory.AMMUNITION]: 'Ammo',
  [EquipmentCategory.ELECTRONICS]: 'Electronics',
  [EquipmentCategory.PHYSICAL_WEAPON]: 'Physical',
  [EquipmentCategory.MOVEMENT]: 'Movement',
  [EquipmentCategory.STRUCTURAL]: 'Structural',
  [EquipmentCategory.MISC_EQUIPMENT]: 'Misc',
};

export interface CategoryFilterConfig {
  category: EquipmentCategory | 'ALL';
  label: string;
  icon: string;
}

export const CATEGORY_FILTERS: CategoryFilterConfig[] = [
  { category: 'ALL', label: 'All', icon: '∑' },
  { category: EquipmentCategory.ENERGY_WEAPON, label: 'Energy', icon: '⚡' },
  { category: EquipmentCategory.BALLISTIC_WEAPON, label: 'Ballistic', icon: '🎯' },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile', icon: '🚀' },
  { category: EquipmentCategory.AMMUNITION, label: 'Ammo', icon: '📦' },
  { category: EquipmentCategory.ELECTRONICS, label: 'Elec', icon: '📡' },
  { category: EquipmentCategory.MISC_EQUIPMENT, label: 'Other', icon: '⚙️' },
];

/** Categories grouped under "Other" filter when MISC_EQUIPMENT is selected */
export const OTHER_CATEGORIES: EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.STRUCTURAL,
];

export function groupByCategory<T extends { category: EquipmentCategory }>(
  equipment: T[]
): Map<EquipmentCategory, T[]> {
  const groups = new Map<EquipmentCategory, T[]>();
  for (const item of equipment) {
    const existing = groups.get(item.category) || [];
    existing.push(item);
    groups.set(item.category, existing);
  }
  return groups;
}
