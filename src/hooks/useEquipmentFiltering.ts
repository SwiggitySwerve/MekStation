import { useMemo } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { OTHER_CATEGORIES, groupByCategory } from '@/components/customizer/equipment/equipmentConstants';

interface FilterableEquipment {
  category: EquipmentCategory;
  isAllocated: boolean;
}

interface UseEquipmentFilteringResult<T> {
  filteredEquipment: T[];
  unallocated: T[];
  allocated: T[];
  unallocatedByCategory: Map<EquipmentCategory, T[]>;
  allocatedByCategory: Map<EquipmentCategory, T[]>;
}

export function useEquipmentFiltering<T extends FilterableEquipment>(
  equipment: T[],
  activeCategory: EquipmentCategory | 'ALL'
): UseEquipmentFilteringResult<T> {
  const filteredEquipment = useMemo(() => {
    if (activeCategory === 'ALL') return equipment;
    if (activeCategory === EquipmentCategory.MISC_EQUIPMENT) {
      return equipment.filter(item => OTHER_CATEGORIES.includes(item.category));
    }
    return equipment.filter(item => item.category === activeCategory);
  }, [equipment, activeCategory]);

  const { unallocated, allocated } = useMemo(() => {
    const unalloc: T[] = [];
    const alloc: T[] = [];
    for (const item of filteredEquipment) {
      if (item.isAllocated) {
        alloc.push(item);
      } else {
        unalloc.push(item);
      }
    }
    return { unallocated: unalloc, allocated: alloc };
  }, [filteredEquipment]);

  const unallocatedByCategory = useMemo(() => groupByCategory(unallocated), [unallocated]);
  const allocatedByCategory = useMemo(() => groupByCategory(allocated), [allocated]);

  return {
    filteredEquipment,
    unallocated,
    allocated,
    unallocatedByCategory,
    allocatedByCategory,
  };
}
