import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryIndicatorClass } from '@/utils/colors/equipmentColors';

import { CATEGORY_FILTERS, CATEGORY_LABELS } from './equipmentConstants';

interface CategoryFilterBarProps {
  activeCategory: EquipmentCategory | 'ALL';
  onSelectCategory: (category: EquipmentCategory | 'ALL') => void;
  compact?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function CategoryFilterBar({
  activeCategory,
  onSelectCategory,
  compact = false,
  showLabels = false,
  className = '',
}: CategoryFilterBarProps): React.ReactElement {
  const containerClass = compact
    ? 'flex items-center gap-0.5 px-1 py-1 overflow-x-auto scrollbar-none'
    : 'flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none bg-surface-base/50';

  const buttonBaseClass = compact
    ? 'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded transition-all'
    : 'min-h-11 min-w-11 flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95';

  return (
    <div className={`${containerClass} ${className}`}>
      {CATEGORY_FILTERS.map(({ category, label, icon }) => {
        const isActive = category === activeCategory;
        const activeClass = isActive
          ? 'bg-accent/10 text-accent ring-accent ring-1'
          : compact
            ? 'bg-surface-raised/60 text-text-theme-secondary hover:bg-surface-raised'
            : 'bg-surface-raised/60 text-text-theme-secondary';

        const title =
          category === 'ALL'
            ? 'All Categories'
            : CATEGORY_LABELS[category as EquipmentCategory] ||
              String(category);

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`${buttonBaseClass} ${activeClass}`}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
          >
            <span className="relative inline-flex">
              <AppIcon name={icon} size="control" aria-hidden="true" />
              {category !== 'ALL' && (
                <span
                  aria-hidden="true"
                  className={`absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full ${getCategoryIndicatorClass(category as EquipmentCategory)}`}
                />
              )}
            </span>
            {showLabels && <span className="xs:inline hidden">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryFilterBar;
