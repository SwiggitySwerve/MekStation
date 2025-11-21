/**
 * Equipment Sort Service - Handles equipment sorting operations
 * Single responsibility for sorting logic and comparison operations
 * Following SOLID principles - Single Responsibility and Open/Closed
 */

import {
  IEquipmentSortService,
  EquipmentVariant,
  EquipmentSort
} from './EquipmentBrowserTypes';

export class EquipmentSortService implements IEquipmentSortService {

  /**
   * Sort equipment array by specified criteria
   */
  sortEquipment(equipment: EquipmentVariant[], sort: EquipmentSort): EquipmentVariant[] {
    console.log(`[EquipmentSortService] Sorting ${equipment.length} items by ${sort.sortBy} ${sort.sortOrder}`);

    const sorted = [...equipment].sort((a, b) => {
      const aVal = this.getSortValue(a, sort.sortBy);
      const bVal = this.getSortValue(b, sort.sortBy);

      let comparison: number;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        // Handle mixed types or nulls
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        comparison = aStr.localeCompare(bStr);
      }

      return sort.sortOrder === 'DESC' ? -comparison : comparison;
    });

    console.log(`[EquipmentSortService] Sorted ${sorted.length} items`);
    return sorted;
  }

  /**
   * Get sort value from equipment for comparison
   */
  getSortValue(equipment: EquipmentVariant, sortBy: EquipmentSort['sortBy']): any {
    switch (sortBy) {
      case 'name':
        return equipment.name;
      case 'weight':
        return equipment.weight;
      case 'crits':
        return equipment.crits;
      case 'techBase':
        return equipment.techBase;
      case 'damage':
        return equipment.damage || 0;
      case 'heat':
        return equipment.heat || 0;
      default:
        return equipment.name;
    }
  }
}
