/**
 * Compact Filter Bar - space-efficient unified filter bar
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useState, useCallback } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import { BalancedGrid } from '@/components/common/BalancedGrid';

export interface CompactFilterBarProps {
  activeCategories: Set<EquipmentCategory>;
  showAll: boolean;
  hidePrototype: boolean;
  hideOneShot: boolean;
  hideUnavailable: boolean;
  hideAmmoWithoutWeapon: boolean;
  search: string;
  onSelectCategory: (category: EquipmentCategory, isMultiSelect: boolean) => void;
  onShowAll: () => void;
  onTogglePrototype: () => void;
  onToggleOneShot: () => void;
  onToggleUnavailable: () => void;
  onToggleAmmoWithoutWeapon: () => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  className?: string;
}

interface CategoryConfig {
  category: EquipmentCategory;
  label: string;
  icon: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: EquipmentCategory.ENERGY_WEAPON, label: 'Energy', icon: '⚡' },
  { category: EquipmentCategory.BALLISTIC_WEAPON, label: 'Ballistic', icon: '🎯' },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile', icon: '🚀' },
  { category: EquipmentCategory.ARTILLERY, label: 'Artillery', icon: '💥' },
  { category: EquipmentCategory.PHYSICAL_WEAPON, label: 'Physical', icon: '🔨' },
  { category: EquipmentCategory.AMMUNITION, label: 'Ammo', icon: '📦' },
  { category: EquipmentCategory.MISC_EQUIPMENT, label: 'Other', icon: '⚙️' },
];

const OTHER_COMBINED_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.MISC_EQUIPMENT,
  EquipmentCategory.ELECTRONICS,
];

export function CompactFilterBar({
  activeCategories,
  showAll,
  hidePrototype,
  hideOneShot,
  hideUnavailable,
  hideAmmoWithoutWeapon,
  search,
  onSelectCategory,
  onShowAll,
  onTogglePrototype,
  onToggleOneShot,
  onToggleUnavailable,
  onToggleAmmoWithoutWeapon,
  onSearchChange,
  onClearFilters,
  className = '',
}: CompactFilterBarProps): React.ReactElement {
  const [hideFiltersExpanded, setHideFiltersExpanded] = useState(false);
  
  const activeHideCount = [hidePrototype, hideOneShot, hideUnavailable, hideAmmoWithoutWeapon].filter(Boolean).length;
  const hasActiveFilters = search || !showAll || activeHideCount > 0;
  
  const handleCategoryClick = useCallback((category: EquipmentCategory, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    onSelectCategory(category, isMultiSelect);
  }, [onSelectCategory]);
  
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Row 1: Category buttons with balanced grid */}
      <BalancedGrid minItemWidth={85} gap={4} fallbackColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {CATEGORY_CONFIGS.map(({ category, label, icon }) => {
          const isActive = showAll || (
            category === EquipmentCategory.MISC_EQUIPMENT
              ? OTHER_COMBINED_CATEGORIES.some(cat => activeCategories.has(cat))
              : activeCategories.has(category)
          );
          const colors = getCategoryColorsLegacy(category);
          
          return (
            <button
              key={category}
              onClick={(e) => handleCategoryClick(category, e)}
              className={`
                px-1.5 py-0.5 text-[10px] rounded transition-all
                flex items-center justify-center gap-1
                ${isActive
                  ? `${colors.bg} ${colors.text} ring-1 ${colors.border} shadow-sm`
                  : 'bg-surface-raised/60 text-text-theme-secondary hover:text-white hover:bg-surface-raised'
                }
              `}
              title={`${label} (Ctrl+click to multi-select)`}
            >
              <span className="text-sm">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
        
        <button
          onClick={onShowAll}
          className={`
            px-1.5 py-0.5 text-[10px] rounded transition-all
            ${showAll
              ? 'bg-accent text-white ring-1 ring-accent shadow-sm'
              : 'bg-surface-raised/60 text-text-theme-secondary hover:text-white hover:bg-surface-raised'
            }
          `}
          title="Show all categories"
        >
          All
        </button>
      </BalancedGrid>
      
      {/* Row 2: Controls (Hide, Search, Clear) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setHideFiltersExpanded(!hideFiltersExpanded)}
          className={`
            px-1.5 py-0.5 text-[10px] rounded transition-all flex items-center gap-1
            ${activeHideCount > 0
              ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700'
              : 'bg-surface-raised/60 text-text-theme-secondary hover:text-white hover:bg-surface-raised'
            }
          `}
          title={hideFiltersExpanded ? 'Hide filter options' : 'Show filter options'}
        >
          <span>Hide</span>
          {activeHideCount > 0 && (
            <span className="bg-red-600 text-white text-[8px] rounded-full px-1 min-w-[14px] text-center">
              {activeHideCount}
            </span>
          )}
          <span className={`text-[8px] transition-transform ${hideFiltersExpanded ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        <div className="flex-1 min-w-[60px]" />
        
        <div className="relative flex-shrink-0 w-32 sm:w-40">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full px-2 py-1 text-[11px] bg-surface-raised border border-border-theme-subtle rounded text-white placeholder-text-theme-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-theme-secondary hover:text-white text-[10px]"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-1.5 py-0.5 text-[10px] bg-surface-raised/60 hover:bg-surface-raised text-text-theme-secondary hover:text-white rounded transition-colors"
            title="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>
      
      {hideFiltersExpanded && (
        <div className="flex items-center gap-1 pl-1 animate-fadeIn">
          <span className="text-[9px] text-text-theme-secondary mr-0.5">Hide:</span>
          
          <HideToggle
            label="Proto"
            fullLabel="Prototype"
            isActive={hidePrototype}
            onClick={onTogglePrototype}
          />
          <HideToggle
            label="1-Shot"
            fullLabel="One-Shot"
            isActive={hideOneShot}
            onClick={onToggleOneShot}
          />
          <HideToggle
            label="No Wpn"
            fullLabel="Ammo without Weapon"
            isActive={hideAmmoWithoutWeapon}
            onClick={onToggleAmmoWithoutWeapon}
          />
          <HideToggle
            label="Unavail"
            fullLabel="Unavailable (tech/era)"
            isActive={hideUnavailable}
            onClick={onToggleUnavailable}
          />
        </div>
      )}
    </div>
  );
}

interface HideToggleProps {
  label: string;
  fullLabel: string;
  isActive: boolean;
  onClick: () => void;
}

function HideToggle({ label, fullLabel, isActive, onClick }: HideToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-1.5 py-0.5 text-[10px] rounded transition-colors
        ${isActive
          ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700'
          : 'bg-surface-raised/60 text-text-theme-secondary hover:text-white hover:bg-surface-raised'
        }
      `}
      title={`${isActive ? 'Show' : 'Hide'} ${fullLabel.toLowerCase()}`}
    >
      {label}
    </button>
  );
}

export default CompactFilterBar;
