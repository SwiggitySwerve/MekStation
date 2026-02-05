/**
 * Compact Filter Bar - space-efficient unified filter bar
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useState, useCallback } from 'react';

import { BalancedGrid } from '@/components/common/BalancedGrid';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';

export interface CompactFilterBarProps {
  activeCategories: Set<EquipmentCategory>;
  showAll: boolean;
  hidePrototype: boolean;
  hideOneShot: boolean;
  hideUnavailable: boolean;
  hideAmmoWithoutWeapon: boolean;
  search: string;
  onSelectCategory: (
    category: EquipmentCategory,
    isMultiSelect: boolean,
  ) => void;
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
  {
    category: EquipmentCategory.BALLISTIC_WEAPON,
    label: 'Ballistic',
    icon: '🎯',
  },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile', icon: '🚀' },
  { category: EquipmentCategory.ARTILLERY, label: 'Artillery', icon: '💥' },
  {
    category: EquipmentCategory.PHYSICAL_WEAPON,
    label: 'Physical',
    icon: '🔨',
  },
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

  const activeHideCount = [
    hidePrototype,
    hideOneShot,
    hideUnavailable,
    hideAmmoWithoutWeapon,
  ].filter(Boolean).length;
  const hasActiveFilters = search || !showAll || activeHideCount > 0;

  const handleCategoryClick = useCallback(
    (category: EquipmentCategory, event: React.MouseEvent) => {
      const isMultiSelect = event.ctrlKey || event.metaKey;
      onSelectCategory(category, isMultiSelect);
    },
    [onSelectCategory],
  );

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Row 1: Category buttons with balanced grid */}
      <BalancedGrid
        minItemWidth={85}
        gap={4}
        fallbackColumns="repeat(auto-fill, minmax(40px, 1fr))"
      >
        {CATEGORY_CONFIGS.map(({ category, label, icon }) => {
          const isActive =
            showAll ||
            (category === EquipmentCategory.MISC_EQUIPMENT
              ? OTHER_COMBINED_CATEGORIES.some((cat) =>
                  activeCategories.has(cat),
                )
              : activeCategories.has(category));
          const colors = getCategoryColorsLegacy(category);

          return (
            <button
              key={category}
              onClick={(e) => handleCategoryClick(category, e)}
              className={`flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text} ring-1 ${colors.border} shadow-sm`
                  : 'bg-surface-raised/60 text-text-theme-secondary hover:bg-surface-raised hover:text-white'
              } `}
              title={`${label} (Ctrl+click to multi-select)`}
            >
              <span className="text-sm">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}

        <button
          onClick={onShowAll}
          className={`rounded px-1.5 py-0.5 text-[10px] transition-all ${
            showAll
              ? 'bg-accent ring-accent text-white shadow-sm ring-1'
              : 'bg-surface-raised/60 text-text-theme-secondary hover:bg-surface-raised hover:text-white'
          } `}
          title="Show all categories"
        >
          All
        </button>
      </BalancedGrid>

      {/* Row 2: Controls (Hide, Search, Clear) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setHideFiltersExpanded(!hideFiltersExpanded)}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-all ${
            activeHideCount > 0
              ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700'
              : 'bg-surface-raised/60 text-text-theme-secondary hover:bg-surface-raised hover:text-white'
          } `}
          title={
            hideFiltersExpanded ? 'Hide filter options' : 'Show filter options'
          }
        >
          <span>Hide</span>
          {activeHideCount > 0 && (
            <span className="min-w-[14px] rounded-full bg-red-600 px-1 text-center text-[8px] text-white">
              {activeHideCount}
            </span>
          )}
          <span
            className={`text-[8px] transition-transform ${hideFiltersExpanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>

        <div className="min-w-[60px] flex-1" />

        <div className="relative w-32 flex-shrink-0 sm:w-40">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="bg-surface-raised border-border-theme-subtle placeholder-text-theme-secondary focus:ring-accent w-full rounded border px-2 py-1 text-[11px] text-white focus:ring-1 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="text-text-theme-secondary absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] hover:text-white"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="bg-surface-raised/60 hover:bg-surface-raised text-text-theme-secondary rounded px-1.5 py-0.5 text-[10px] transition-colors hover:text-white"
            title="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      {hideFiltersExpanded && (
        <div className="animate-fadeIn flex items-center gap-1 pl-1">
          <span className="text-text-theme-secondary mr-0.5 text-[9px]">
            Hide:
          </span>

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
      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
        isActive
          ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700'
          : 'bg-surface-raised/60 text-text-theme-secondary hover:bg-surface-raised hover:text-white'
      } `}
      title={`${isActive ? 'Show' : 'Hide'} ${fullLabel.toLowerCase()}`}
    >
      {label}
    </button>
  );
}

export default CompactFilterBar;
