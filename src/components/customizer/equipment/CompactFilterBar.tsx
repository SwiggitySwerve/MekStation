/**
 * Compact Filter Bar - space-efficient unified filter bar
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useCallback } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { CATALOG_OTHER_CATEGORIES } from '@/stores/useEquipmentStore.filters';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryIndicatorClass } from '@/utils/colors/equipmentColors';

import { EquipmentControlPopover } from './EquipmentControlPopover';

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
  resultSummary?: string;
  availabilitySummary?: string;
  sortControls?: React.ReactNode;
}

interface CategoryConfig {
  category: EquipmentCategory;
  label: string;
}

const CHIP_CLASS =
  'focus-visible:outline-accent inline-flex min-h-11 shrink-0 items-center gap-2 rounded border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';
const CHIP_SELECTED = 'border-accent bg-accent/10 text-accent';
const CHIP_IDLE =
  'border-border-theme-subtle bg-surface-raised/50 text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary';

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: EquipmentCategory.ENERGY_WEAPON, label: 'Energy' },
  {
    category: EquipmentCategory.BALLISTIC_WEAPON,
    label: 'Ballistic',
  },
  { category: EquipmentCategory.MISSILE_WEAPON, label: 'Missile' },
  { category: EquipmentCategory.ARTILLERY, label: 'Artillery' },
  {
    category: EquipmentCategory.PHYSICAL_WEAPON,
    label: 'Physical',
  },
  { category: EquipmentCategory.AMMUNITION, label: 'Ammo' },
  { category: EquipmentCategory.ELECTRONICS, label: 'Electronics' },
  { category: EquipmentCategory.MISC_EQUIPMENT, label: 'Other' },
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
  resultSummary,
  availabilitySummary,
  sortControls,
}: CompactFilterBarProps): React.ReactElement {
  const activeHideCount = [
    hidePrototype,
    hideOneShot,
    hideUnavailable,
    hideAmmoWithoutWeapon,
  ].filter(Boolean).length;
  const handleCategoryClick = useCallback(
    (category: EquipmentCategory, event: React.MouseEvent) =>
      onSelectCategory(category, event.ctrlKey || event.metaKey),
    [onSelectCategory],
  );
  const toggles = [
    { label: 'Prototype', active: hidePrototype, toggle: onTogglePrototype },
    { label: 'One-shot', active: hideOneShot, toggle: onToggleOneShot },
    {
      label: 'Ammo without weapon',
      active: hideAmmoWithoutWeapon,
      toggle: onToggleAmmoWithoutWeapon,
    },
    {
      label: 'Unavailable',
      active: hideUnavailable,
      toggle: onToggleUnavailable,
    },
  ];
  return (
    <div className={`flex shrink-0 flex-col ${className}`}>
      <div
        className="border-border-theme flex h-12 shrink-0 items-center gap-1 border-b px-3"
        data-testid="equipment-search-controls"
      >
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            aria-label="Search equipment"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="bg-surface-raised border-border-theme placeholder-text-theme-secondary text-text-theme-primary focus:outline-accent min-h-11 w-full rounded border px-3 pr-11 text-sm focus:outline-2 focus:outline-offset-[-2px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              title="Clear search"
              aria-label="Clear search"
              className="absolute top-0 right-0 !min-w-11 !px-2"
            >
              {' '}
              <AppIcon name="close" size="inline" aria-hidden="true" />
            </Button>
          )}
        </div>
        <EquipmentControlPopover
          ariaLabel="Visibility filters"
          label={
            <>
              <span>Filters</span>
              {activeHideCount > 0 && (
                <span className="text-accent">({activeHideCount})</span>
              )}
            </>
          }
        >
          <p className="text-text-theme-secondary mb-2 text-xs">
            Hide equipment matching these conditions:
          </p>
          <div className="flex flex-col gap-1">
            {toggles.map(({ label, active, toggle }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                aria-pressed={active}
                onClick={toggle}
                className="!justify-between !text-xs"
              >
                {label}
                <span
                  aria-hidden="true"
                  className={active ? 'text-accent' : 'text-text-theme-muted'}
                >
                  {active ? (
                    <AppIcon name="check" size="inline" aria-hidden="true" />
                  ) : (
                    <SvgIcon size="inline" aria-hidden="true">
                      <circle cx="12" cy="12" r="8" />
                    </SvgIcon>
                  )}
                </span>
              </Button>
            ))}
          </div>
          {hideUnavailable && availabilitySummary && (
            <p className="text-text-theme-secondary my-2 text-xs">
              Available for: {availabilitySummary}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            title="Clear all filters"
            className="mt-2 w-full"
          >
            Clear filters
          </Button>
          <p className="text-text-theme-secondary mt-3 text-xs">
            Ammo without weapon hides ammunition that has no compatible weapon
            on this unit. Electronics has its own category. Ctrl-click or
            Command-click categories to combine them.
          </p>
        </EquipmentControlPopover>
        {sortControls && (
          <EquipmentControlPopover
            ariaLabel="Sort equipment"
            label="Sort"
            className="lg:hidden"
          >
            {sortControls}
          </EquipmentControlPopover>
        )}
        {hideUnavailable && availabilitySummary && (
          <span
            className="text-text-theme-secondary bg-surface-deep border-border-theme-subtle hidden shrink-0 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap md:inline-block"
            title="Equipment is limited to what this unit can use"
          >
            {availabilitySummary}
          </span>
        )}
        {resultSummary && (
          <span
            className="text-text-theme-secondary hidden shrink-0 px-1 text-xs whitespace-nowrap md:block"
            aria-live="polite"
          >
            {resultSummary}
          </span>
        )}
        <EquipmentControlPopover
          ariaLabel="How to add equipment"
          label="How to add"
          className="hidden lg:block"
        >
          <p className="text-text-theme-secondary text-sm">
            Add a copy unassigned, or use Add + place to choose a legal
            location. Sort using the column headings. Ctrl-click or
            Command-click categories to combine them.
          </p>
        </EquipmentControlPopover>
      </div>
      <div
        className="border-border-theme flex h-12 shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-0.5"
        role="group"
        aria-label="Equipment categories"
        data-testid="equipment-category-controls"
      >
        <button
          type="button"
          onClick={onShowAll}
          aria-pressed={showAll}
          title="Show all categories"
          className={`${CHIP_CLASS} ${showAll ? CHIP_SELECTED : CHIP_IDLE}`}
        >
          All
        </button>
        {CATEGORY_CONFIGS.map(({ category, label }) => {
          const isActive =
            showAll ||
            (category === EquipmentCategory.MISC_EQUIPMENT
              ? CATALOG_OTHER_CATEGORIES.some((candidate) =>
                  activeCategories.has(candidate),
                )
              : activeCategories.has(category));
          return (
            <button
              key={category}
              type="button"
              aria-label={label}
              aria-pressed={isActive}
              onClick={(event) => handleCategoryClick(category, event)}
              title={`${label} (Ctrl+click to multi-select)`}
              className={`${CHIP_CLASS} ${isActive && !showAll ? CHIP_SELECTED : CHIP_IDLE}`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${getCategoryIndicatorClass(category)}`}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CompactFilterBar;
