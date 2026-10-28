import React, { useContext, useEffect, useId, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { SortColumn } from '@/stores/useEquipmentStore';
import { IEquipmentItem } from '@/types/equipment';

/** @spec openspec/specs/equipment-browser/spec.md */
import workbenchStyles from '../CustomizerWorkbench.module.css';
import { MoreBelowCue } from '../shared/MoreBelowCue';
import { hasContentBelow } from '../shared/scrollOverflow';
import { CompactFilterBar } from './CompactFilterBar';
import {
  getCatalogCapacityNotice,
  getCompactAvailabilitySummary,
  getRowFillPadding,
  getWholeRowListHeight,
} from './EquipmentBrowser.model';
import {
  EquipmentBrowserUnitContext,
  EquipmentBrowserUnitProvider,
} from './EquipmentBrowserUnitContext';
import { EquipmentCatalogCard } from './EquipmentCatalogCard';

/**
 * Shown only when a single-page list overflows its viewport. A paged list
 * shows its page line alone, so paging and scrolling cues never mix.
 */
const SCROLL_HINT = 'More below';

export interface EquipmentBrowserProps {
  onAddEquipment: (equipment: IEquipmentItem) => void;
  onAddAndPlace?: (equipment: IEquipmentItem) => void;
  className?: string;
  readOnly?: boolean;
  addHint?: string;
}

export function EquipmentBrowser(
  props: EquipmentBrowserProps,
): React.ReactElement {
  return (
    <EquipmentBrowserUnitProvider>
      <EquipmentBrowserContent {...props} />
    </EquipmentBrowserUnitProvider>
  );
}

function EquipmentBrowserContent({
  onAddEquipment,
  onAddAndPlace,
  className = '',
  readOnly = false,
  addHint = 'Added to the unit.',
}: EquipmentBrowserProps): React.ReactElement {
  const browser = useEquipmentBrowser();
  const unit = useContext(EquipmentBrowserUnitContext);
  const capacity = unit ? getCatalogCapacityNotice(unit) : undefined;
  // At the limit every Add names the notice as its description.
  const limitNoteId = useId();
  const atLimitNoteId = capacity?.limitText ? limitNoteId : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ message: '', count: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
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
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const update = () => setHasMoreBelow(hasContentBelow(viewport));
    // End the list on a whole row on every width, so the pager (or the
    // viewport edge above it) never cuts one, and grow the rows slightly so
    // those whole rows reach the pager instead of leaving an empty band.
    const fitRows = () => {
      viewport.style.maxHeight = '';
      viewport.style.removeProperty('--catalog-row-fill');
      const contentTop =
        viewport.getBoundingClientRect().top - viewport.scrollTop;
      const rowBottoms = Array.from(
        viewport.querySelectorAll(':scope > ul > li'),
        (row) => row.getBoundingClientRect().bottom - contentTop,
      );
      const height = getWholeRowListHeight(rowBottoms, viewport.clientHeight);
      const fill = getRowFillPadding(rowBottoms, viewport.clientHeight);
      const fitting = rowBottoms.filter(
        (bottom) => bottom <= viewport.clientHeight,
      ).length;
      if (fill > 0)
        viewport.style.setProperty('--catalog-row-fill', `${fill}px`);
      // max-height is border-box: add the bottom border back.
      if (height !== null)
        viewport.style.maxHeight = `${Math.ceil(height + fitting * fill) + viewport.offsetHeight - viewport.clientHeight}px`;
      update();
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(fitRows);
    if (viewport.parentElement) observer?.observe(viewport.parentElement);
    observer?.observe(viewport);
    for (const child of Array.from(viewport.children)) observer?.observe(child);
    viewport.addEventListener('scroll', update, { passive: true });
    fitRows();
    return () => {
      observer?.disconnect();
      viewport.removeEventListener('scroll', update);
    };
  }, [paginatedEquipment, selectedId, isLoading, error]);
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
        capacity={capacity}
        limitNoteId={limitNoteId}
        resultSummary={
          isLoading
            ? 'Loading…'
            : `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`
        }
        availabilitySummary={[
          unitTechBase,
          unitYear ? `Available in ${unitYear}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        compactAvailabilitySummary={getCompactAvailabilitySummary(
          unitTechBase,
          unitYear,
        )}
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
        className={workbenchStyles.catalogViewport}
        data-more-below={hasMoreBelow}
      >
        <div
          ref={scrollRef}
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
            <span
              data-catalog-column="range"
              title="Short / medium / long range in hexes"
              aria-label="Range in hexes (short / medium / long)"
            >
              Range (hex)
            </span>
            <span data-catalog-column="minimumRange" title="Minimum range">
              Min
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
              <Button onClick={browser.clearFilters}>Clear Filters</Button>
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
                    mountedCount={unit?.mountedCounts.get(equipment.id)}
                    remainingWeight={unit?.remainingWeight}
                    expanded={selectedId === entryKey}
                    readOnly={readOnly}
                    limitNoteId={atLimitNoteId}
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
          {!isLoading && totalItems > 0 && currentPage === lastPage && (
            <p className={workbenchStyles.catalogEnd}>
              End of results · {totalItems}{' '}
              {totalItems === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      </div>
      {/* Above the pager, so on phones the pager stays pinned to the Loadout bar. */}
      <p
        role="status"
        aria-atomic="true"
        className={
          feedback.message || readOnly
            ? 'text-text-theme-secondary shrink-0 px-3 py-1 text-xs'
            : 'sr-only'
        }
      >
        {feedback.message && (
          <span key={feedback.count}>{feedback.message}</span>
        )}
        {readOnly && 'Read-only: equipment can be inspected but not added.'}
      </p>
      {totalPages > 1 && (
        <div
          className={`border-border-theme flex min-h-12 shrink-0 items-center justify-between gap-2 border-t px-3 ${workbenchStyles.catalogFooter}`}
          data-testid="equipment-pagination"
        >
          {/* The page line alone: paging is the list's navigation, so no
              scroll cue sits beside it. The item count is in the summary line
              above the list. */}
          <span className="text-text-theme-secondary min-w-0 text-xs">
            Page {Math.min(currentPage, lastPage)} of {lastPage}
          </span>
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
              onClick={() =>
                browser.setPage(Math.min(lastPage, currentPage + 1))
              }
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
      )}
      {totalPages <= 1 && hasMoreBelow && (
        <div
          className={`border-border-theme shrink-0 border-t px-3 ${workbenchStyles.catalogFooter}`}
        >
          <MoreBelowCue visible label={SCROLL_HINT} />
        </div>
      )}
    </section>
  );
}

export default EquipmentBrowser;
