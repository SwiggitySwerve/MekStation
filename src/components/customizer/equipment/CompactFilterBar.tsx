/**
 * Compact Filter Bar - space-efficient unified filter bar
 * @spec openspec/specs/equipment-browser/spec.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { CATALOG_OTHER_CATEGORIES } from '@/stores/useEquipmentStore.filters';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryIndicatorClass } from '@/utils/colors/equipmentColors';

import type { ICatalogCapacityNotice } from './EquipmentBrowser.model';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { CatalogSummaryLine } from './CatalogSummaryLine';
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
  /** Free tonnage and slots, shown on the result-count line. */
  capacity?: ICatalogCapacityNotice;
  /** Id for the at-limit notice, which the Add buttons reference. */
  limitNoteId?: string;
  availabilitySummary?: string;
  /** Short availability text for the phone Filters button, e.g. "IS · 3028". */
  compactAvailabilitySummary?: string;
  sortControls?: React.ReactNode;
}

interface CategoryConfig {
  category: EquipmentCategory;
  label: string;
}

const CHIP_CLASS =
  'focus-visible:outline-accent inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]';
const CHIP_SELECTED = 'border-accent text-accent font-medium';
const CHIP_IDLE =
  'border-transparent text-text-theme-secondary hover:bg-surface-raised/30 hover:text-text-theme-primary';

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
  capacity,
  limitNoteId,
  availabilitySummary,
  compactAvailabilitySummary,
  sortControls,
}: CompactFilterBarProps): React.ReactElement {
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [categoryOverflow, setCategoryOverflow] = useState<
    'none' | 'forward' | 'backward'
  >('none');
  // How many category tabs are cut off on the side the scroll button points
  // to, so the button can say "+5" instead of showing a bare chevron.
  const [hiddenCategoryCount, setHiddenCategoryCount] = useState(0);
  const updateCategoryOverflow = useCallback(() => {
    const element = categoriesRef.current;
    if (!element) return;
    const overflow =
      element.scrollWidth <= element.clientWidth + 1
        ? 'none'
        : element.scrollLeft + element.clientWidth < element.scrollWidth - 1
          ? 'forward'
          : 'backward';
    setCategoryOverflow(overflow);
    const bounds = element.getBoundingClientRect();
    setHiddenCategoryCount(
      overflow === 'none'
        ? 0
        : Array.from(element.children).filter((chip) => {
            const rect = chip.getBoundingClientRect();
            return overflow === 'forward'
              ? rect.right > bounds.right + 1
              : rect.left < bounds.left - 1;
          }).length,
    );
  }, []);
  useEffect(() => {
    const element = categoriesRef.current;
    if (!element) return;
    updateCategoryOverflow();
    const observer = new ResizeObserver(updateCategoryOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateCategoryOverflow]);
  const activeFilterNames = [
    hideUnavailable && (availabilitySummary || 'Availability'),
    hidePrototype && 'No Prototypes',
    hideOneShot && 'No One-Shot',
    hideAmmoWithoutWeapon && 'Matched Ammo',
  ].filter(Boolean);
  const activeFilters = activeFilterNames.join(', ');
  // Phone: the first active filter in short form, plus how many more apply.
  const compactFilterNames = [
    hideUnavailable &&
      (compactAvailabilitySummary || availabilitySummary || 'Availability'),
    ...activeFilterNames.slice(hideUnavailable ? 1 : 0),
  ].filter(Boolean);
  const compactFilters = compactFilterNames.length
    ? `${compactFilterNames[0]}${compactFilterNames.length > 1 ? ` +${compactFilterNames.length - 1}` : ''}`
    : '';
  const handleCategoryClick = useCallback(
    (category: EquipmentCategory, event: React.MouseEvent) =>
      onSelectCategory(category, event.ctrlKey || event.metaKey),
    [onSelectCategory],
  );
  const toggles = [
    { label: 'Prototype', active: hidePrototype, toggle: onTogglePrototype },
    { label: 'One-Shot', active: hideOneShot, toggle: onToggleOneShot },
    {
      label: 'Ammo Without Weapon',
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
        className="border-border-theme flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-0 border-b px-3 py-0.5"
        data-testid="equipment-search-controls"
      >
        {/* Wide screens give Search its own row, so the Filters summary and
            How to Add get a full row under it instead of squeezing beside it. */}
        <div className="relative max-w-full min-w-32 flex-1 basis-0 lg:basis-full">
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
          triggerLabel={
            activeFilters
              ? `Visibility filters: ${activeFilters}`
              : 'Visibility filters'
          }
          className="max-w-full min-w-0 [&>button]:max-w-full"
          label={
            <span className="truncate" title={activeFilters}>
              Filters
              {activeFilters && (
                <span className="hidden sm:inline"> · {activeFilters}</span>
              )}
              {compactFilters && (
                <span className="sm:hidden"> · {compactFilters}</span>
              )}
            </span>
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
              Catalog criteria: {availabilitySummary}. Uses listed introduction
              year and tech base; does not check extinction, reintroduction, or
              rules legality.
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            title="Clear all filters"
            className="mt-2 w-full"
          >
            Clear Filters
          </Button>
          <p className="text-text-theme-secondary mt-3 text-xs">
            Ammo Without Weapon hides ammunition that has no compatible weapon
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
        <EquipmentControlPopover
          ariaLabel="How to Add Equipment"
          label="How to Add"
          className="hidden lg:ml-auto lg:block"
        >
          <p className="text-text-theme-secondary text-sm">
            Add a copy unassigned, or use Add + place to choose a legal
            location. Sort using the column headings. Ctrl-click or
            Command-click categories to combine them.
          </p>
        </EquipmentControlPopover>
      </div>
      <div className="border-border-theme-subtle flex min-w-0 border-b">
        <div
          ref={categoriesRef}
          onScroll={updateCategoryOverflow}
          data-overflow={categoryOverflow}
          className={`flex min-h-11 min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-3 ${workbenchStyles.catalogCategories}`}
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
        {categoryOverflow !== 'none' && (
          <Button
            size="sm"
            variant="secondary"
            aria-label={
              hiddenCategoryCount > 0
                ? `${hiddenCategoryCount} ${categoryOverflow === 'forward' ? 'more' : 'previous'} equipment categories`
                : categoryOverflow === 'forward'
                  ? 'More equipment categories'
                  : 'Previous equipment categories'
            }
            // A full 44px bordered button, like the edit-history buttons,
            // with 2px above and below so it clears the row's divider. The
            // chevron's glyph sits inside its box with blank space on its
            // outer side, so the padding is uneven to centre what shows.
            className={`my-0.5 mr-1 !h-11 !min-w-11 shrink-0 !gap-0.5 tabular-nums ${
              categoryOverflow === 'forward'
                ? '!pr-[5px] !pl-[11px]'
                : '!pr-[11px] !pl-[5px]'
            }`}
            onClick={() => {
              const element = categoriesRef.current;
              if (!element) return;
              element.scrollBy({
                left:
                  (categoryOverflow === 'forward' ? 1 : -1) *
                  element.clientWidth *
                  0.8,
                behavior: 'auto',
              });
            }}
          >
            {/* The count makes the overflow explicit: "+5 ›" says five more
                categories are off to the right. */}
            {categoryOverflow === 'backward' && (
              <AppIcon name="chevron-left" size="control" aria-hidden="true" />
            )}
            {hiddenCategoryCount > 0 && (
              <span className="text-xs font-medium">
                +{hiddenCategoryCount}
              </span>
            )}
            {categoryOverflow === 'forward' && (
              <AppIcon name="chevron-right" size="control" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      <CatalogSummaryLine
        resultSummary={resultSummary}
        capacity={capacity}
        limitNoteId={limitNoteId}
      />
    </div>
  );
}

export default CompactFilterBar;
