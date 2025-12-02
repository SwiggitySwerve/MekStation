/**
 * Category Toggle Bar Component
 * 
 * Toggle button filters for equipment categories.
 * Replaces dropdown with scannable buttons like MekLab.
 * 
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-browser/spec.md
 */

import React from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { categoryToColorType, getEquipmentColors } from '@/utils/colors/equipmentColors';

// =============================================================================
// Types
// =============================================================================

interface CategoryToggleBarProps {
  /** Currently active categories */
  activeCategories: Set<EquipmentCategory>;
  /** Called when category is toggled */
  onToggleCategory: (category: EquipmentCategory) => void;
  /** Called to show all categories */
  onShowAll: () => void;
  /** Is "Show All" currently active */
  showAll: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface HideToggleBarProps {
  /** Hide prototype equipment */
  hidePrototype: boolean;
  /** Hide one-shot equipment */
  hideOneShot: boolean;
  /** Hide unavailable equipment (tech base/era incompatible) */
  hideUnavailable: boolean;
  /** Toggle handlers */
  onTogglePrototype: () => void;
  onToggleOneShot: () => void;
  onToggleUnavailable: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Category Configuration
// =============================================================================

interface CategoryConfig {
  category: EquipmentCategory;
  label: string;
  shortLabel: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: EquipmentCategory.ENERGY_WEAPON, label: 'Energy', shortLabel: 'Energy' },
  { category: EquipmentCategory.BALLISTIC_WEAPON, label: 'Ballistic', shortLabel: 'Ball' },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile', shortLabel: 'Msl' },
  { category: EquipmentCategory.ARTILLERY, label: 'Artillery', shortLabel: 'Art' },
  { category: EquipmentCategory.PHYSICAL_WEAPON, label: 'Physical', shortLabel: 'Phys' },
  { category: EquipmentCategory.AMMUNITION, label: 'Ammo', shortLabel: 'Ammo' },
  { category: EquipmentCategory.ELECTRONICS, label: 'Electronics', shortLabel: 'Elec' },
  { category: EquipmentCategory.MISC_EQUIPMENT, label: 'Other', shortLabel: 'Other' },
];

// =============================================================================
// Category Toggle Bar
// =============================================================================

/**
 * Toggle buttons for filtering equipment by category
 */
export function CategoryToggleBar({
  activeCategories,
  onToggleCategory,
  onShowAll,
  showAll,
  className = '',
}: CategoryToggleBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="text-xs text-slate-400 mr-1">Show:</span>
      
      {/* Category toggles */}
      {CATEGORY_CONFIGS.map(({ category, label }) => {
        const isActive = showAll || activeCategories.has(category);
        const colorType = categoryToColorType(category);
        const colors = getEquipmentColors(colorType);
        
        return (
          <button
            key={category}
            onClick={() => onToggleCategory(category)}
            className={`
              px-2 py-0.5 text-xs rounded transition-colors
              ${isActive
                ? `${colors.bg} ${colors.text} ring-1 ${colors.border}`
                : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
              }
            `}
            title={`Toggle ${label}`}
          >
            {label}
          </button>
        );
      })}
      
      {/* Show All button */}
      <button
        onClick={onShowAll}
        className={`
          px-2 py-0.5 text-xs rounded transition-colors ml-1
          ${showAll
            ? 'bg-amber-600 text-white ring-1 ring-amber-500'
            : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
          }
        `}
        title="Show all categories"
      >
        Show All
      </button>
    </div>
  );
}

// =============================================================================
// Hide Toggle Bar
// =============================================================================

/**
 * Toggle buttons for hiding equipment types
 */
export function HideToggleBar({
  hidePrototype,
  hideOneShot,
  hideUnavailable,
  onTogglePrototype,
  onToggleOneShot,
  onToggleUnavailable,
  className = '',
}: HideToggleBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="text-xs text-slate-400 mr-1">Hide:</span>
      
      <ToggleButton
        label="Prototype"
        isActive={hidePrototype}
        onClick={onTogglePrototype}
      />
      
      <ToggleButton
        label="One-Shot"
        isActive={hideOneShot}
        onClick={onToggleOneShot}
      />
      
      <ToggleButton
        label="Unavailable"
        isActive={hideUnavailable}
        onClick={onToggleUnavailable}
      />
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToggleButton({ label, isActive, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-0.5 text-xs rounded transition-colors
        ${isActive
          ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700'
          : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
        }
      `}
      title={`${isActive ? 'Show' : 'Hide'} ${label.toLowerCase()}`}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default CategoryToggleBar;

