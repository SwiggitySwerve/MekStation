/**
 * Equipment Filters Component
 * 
 * Filter controls for the equipment browser.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React from 'react';
import { TechBase, ALL_TECH_BASES } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { customizerStyles as cs } from '../styles';

interface EquipmentFiltersProps {
  /** Current search query */
  search: string;
  /** Current tech base filter */
  techBase: TechBase | null;
  /** Current category filter */
  category: EquipmentCategory | null;
  /** Search change handler */
  onSearchChange: (search: string) => void;
  /** Tech base change handler */
  onTechBaseChange: (techBase: TechBase | null) => void;
  /** Category change handler */
  onCategoryChange: (category: EquipmentCategory | null) => void;
  /** Clear all filters */
  onClear: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Equipment categories for filtering
 */
const FILTER_CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: EquipmentCategory.ENERGY_WEAPON, label: 'Energy Weapons' },
  { value: EquipmentCategory.BALLISTIC_WEAPON, label: 'Ballistic Weapons' },
  { value: EquipmentCategory.MISSILE_WEAPON, label: 'Missile Weapons' },
  { value: EquipmentCategory.AMMUNITION, label: 'Ammunition' },
  { value: EquipmentCategory.ELECTRONICS, label: 'Electronics' },
  { value: EquipmentCategory.PHYSICAL_WEAPON, label: 'Physical Weapons' },
  { value: EquipmentCategory.MISC_EQUIPMENT, label: 'Misc Equipment' },
];

/**
 * Equipment filter controls
 */
export function EquipmentFilters({
  search,
  techBase,
  category,
  onSearchChange,
  onTechBaseChange,
  onCategoryChange,
  onClear,
  className = '',
}: EquipmentFiltersProps): React.ReactElement {
  const hasFilters = search || techBase || category;
  
  return (
    <div className={`${cs.filter.bar} ${className}`}>
      {/* Search */}
      <div className={cs.filter.input}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search equipment..."
        />
      </div>
      
      {/* Tech Base */}
      <div>
        <select
          value={techBase || ''}
          onChange={(e) => onTechBaseChange(e.target.value as TechBase || null)}
          className={cs.filter.select}
        >
          <option value="">All Tech</option>
          {ALL_TECH_BASES.map((tb) => (
            <option key={tb} value={tb}>
              {tb}
            </option>
          ))}
        </select>
      </div>
      
      {/* Category */}
      <div>
        <select
          value={category || ''}
          onChange={(e) => onCategoryChange(e.target.value as EquipmentCategory || null)}
          className={cs.filter.select}
        >
          <option value="">All Categories</option>
          {FILTER_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Clear */}
      {hasFilters && (
        <button onClick={onClear} className={cs.filter.clearBtn}>
          Clear
        </button>
      )}
    </div>
  );
}

