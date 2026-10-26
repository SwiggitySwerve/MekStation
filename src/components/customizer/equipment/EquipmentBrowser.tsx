import React, { useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { SortColumn } from '@/stores/useEquipmentStore';
import { IEquipmentItem } from '@/types/equipment';

/** @spec openspec/specs/equipment-browser/spec.md */
import workbenchStyles from '../CustomizerWorkbench.module.css';
import { CompactFilterBar } from './CompactFilterBar';
import { EquipmentCatalogCard } from './EquipmentCatalogCard';

export interface EquipmentBrowserProps {
  onAddEquipment: (equipment: IEquipmentItem) => void;
  onAddAndPlace?: (equipment: IEquipmentItem) => void;
  className?: string;
  readOnly?: boolean;
  addHint?: string;
}

export function EquipmentBrowser({
  onAddEquipment,
  onAddAndPlace,
  className = '',
  readOnly = false,
  addHint = 'Added to the unit.',
}: EquipmentBrowserProps): React.ReactElement {
  const browser = useEquipmentBrowser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ message: '', count: 0 });
  const {
    paginatedEquipment,
    isLoading,
    error,
    unitYear,
    unitTechBase,
    currentPage,
    totalPages,
    totalItems,
    sortColumn,
    sortDirection,
  } = browser;
  const lastPage = Math.max(1, totalPages);
  const add = (equipment: IEquipmentItem): void => {
    if (readOnly) return;
    onAddEquipment(equipment);
    setFeedback((previous) => ({
      message: `${equipment.name}. ${addHint}`,
      count: previous.count + 1,
    }));
  };

  const sortButton = (
    column: SortColumn,
    label: string,
    catalogColumn?: 'name' | 'weight' | 'criticalSlots',
  ): React.ReactElement => (
    <Button
      key={column}
      size="sm"
      variant="ghost"
      aria-pressed={sortColumn === column}
      aria-label={`Sort by ${column === 'weight' ? 'weight' : label.toLowerCase()}${sortColumn === column ? `, ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}
      onClick={() => browser.setSort(column)}
      {...(catalogColumn ? { 'data-catalog-column': catalogColumn } : {})}
      className={`${catalogColumn === 'name' ? '!pr-0 !pl-6' : '!px-0'} ${workbenchStyles.catalogSortButton}`}
    >
      <span className={workbenchStyles.catalogSortLabel}>{label}</span>
      <span aria-hidden="true" className={workbenchStyles.catalogSortArrow}>
        {sortColumn === column && sortDirection === 'desc' ? '▼' : '▲'}
      </span>
    </Button>
  );

  if (error)
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
      >
        <div className="py-8 text-center" role="alert">
          <h3 className="mb-2 text-red-400">Failed to load equipment</h3>
          <p className="text-text-theme-secondary mb-4 text-sm">{error}</p>
          <Button onClick={browser.refresh}>Retry</Button>
        </div>
      </div>
    );

  return (
    <section
      aria-label="Equipment catalog"
      className={`bg-surface-base flex min-h-0 min-w-0 flex-col ${className}`}
    >
      <CompactFilterBar
        activeCategories={browser.activeCategories}
        showAll={browser.showAllCategories}
        hidePrototype={browser.hidePrototype}
        hideOneShot={browser.hideOneShot}
        hideUnavailable={browser.hideUnavailable}
        hideAmmoWithoutWeapon={browser.hideAmmoWithoutWeapon}
        search={browser.search}
        onSelectCategory={browser.selectCategory}
        onShowAll={browser.showAll}
        onTogglePrototype={browser.toggleHidePrototype}
        onToggleOneShot={browser.toggleHideOneShot}
        onToggleUnavailable={browser.toggleHideUnavailable}
        onToggleAmmoWithoutWeapon={browser.toggleHideAmmoWithoutWeapon}
        onSearchChange={browser.setSearch}
        onClearFilters={browser.clearFilters}
        resultSummary={
          isLoading
            ? 'Loading…'
            : `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`
        }
        availabilitySummary={[
          unitTechBase,
          unitYear ? `introduced ≤${unitYear}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        sortControls={
          <div className="flex flex-col gap-1">
            {(['name', 'weight', 'criticalSlots'] as const).map((column) =>
              sortButton(
                column,
                column === 'name'
                  ? 'Name'
                  : column === 'weight'
                    ? 'Weight'
                    : 'Slots',
              ),
            )}
          </div>
        }
      />
      <div
        className={`bg-surface-deep ${workbenchStyles.catalogScroll}`}
        aria-busy={isLoading}
        data-testid="equipment-catalog-scroll"
      >
        <div
          className={`${workbenchStyles.catalogColumns} ${workbenchStyles.catalogHeader}`}
          aria-label="Sort equipment columns"
        >
          {sortButton('name', 'Name', 'name')}
          <span data-catalog-column="damage">Dmg</span>
          <span data-catalog-column="range">
            Range
            <br />
            (S/M/L)
          </span>
          <span data-catalog-column="heat">Heat</span>
          {sortButton('weight', 'Tons', 'weight')}
          {sortButton('criticalSlots', 'Slots', 'criticalSlots')}
          <span data-catalog-column="actions" />
        </div>
        {isLoading ? (
          <p className="text-text-theme-secondary p-6 text-center">
            Loading equipment...
          </p>
        ) : paginatedEquipment.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-text-theme-primary font-medium">
              No equipment found
            </p>
            <p className="text-text-theme-secondary my-3 text-sm">
              Try a shorter search or clear the filters.
            </p>
            <Button onClick={browser.clearFilters}>Clear filters</Button>
          </div>
        ) : (
          <ul>
            {paginatedEquipment.map((equipment) => {
              const entryKey = JSON.stringify([
                equipment.id,
                equipment.category,
                equipment.techBase,
              ]);
              return (
                <EquipmentCatalogCard
                  key={entryKey}
                  equipment={equipment}
                  expanded={selectedId === entryKey}
                  readOnly={readOnly}
                  onInspect={() =>
                    setSelectedId(selectedId === entryKey ? null : entryKey)
                  }
                  onAdd={() => add(equipment)}
                  onAddAndPlace={
                    onAddAndPlace ? () => onAddAndPlace(equipment) : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
      <div
        className="border-border-theme flex h-12 shrink-0 items-center justify-between gap-2 border-t px-3"
        data-testid="equipment-pagination"
      >
        <div className="min-w-0">
          <span className="text-text-theme-secondary text-xs">
            Page {Math.min(currentPage, lastPage)}/{lastPage}
          </span>
          <p
            role="status"
            aria-atomic="true"
            className="text-text-theme-secondary max-w-lg truncate text-[11px]"
            title={feedback.message}
          >
            {feedback.message && (
              <span key={feedback.count}>{feedback.message}</span>
            )}
            {readOnly && 'Read-only: equipment can be inspected but not added.'}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="pagination"
            aria-label="First page"
            disabled={isLoading || currentPage <= 1}
            onClick={() => browser.setPage(1)}
          >
            <AppIcon name="chevrons-left" size="inline" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="pagination"
            aria-label="Previous page"
            disabled={isLoading || currentPage <= 1}
            onClick={() => browser.setPage(Math.max(1, currentPage - 1))}
          >
            <AppIcon name="chevron-left" size="inline" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="pagination"
            aria-label="Next page"
            disabled={isLoading || currentPage >= lastPage}
            onClick={() => browser.setPage(Math.min(lastPage, currentPage + 1))}
          >
            <AppIcon name="chevron-right" size="inline" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="pagination"
            aria-label="Last page"
            disabled={isLoading || currentPage >= lastPage}
            onClick={() => browser.setPage(lastPage)}
          >
            <AppIcon name="chevrons-right" size="inline" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default EquipmentBrowser;
