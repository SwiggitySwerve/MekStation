/**
 * Equipment Browser - searchable, filterable equipment catalog
 * @spec openspec/specs/equipment-browser/spec.md
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-browser/spec.md
 */

import React from 'react';

import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { SortColumn } from '@/stores/useEquipmentStore';
import { IEquipmentItem } from '@/types/equipment';

import { CompactFilterBar } from './CompactFilterBar';
import { EquipmentRow } from './EquipmentRow';

export interface EquipmentBrowserProps {
  /** Called when equipment is added to unit */
  onAddEquipment: (equipment: IEquipmentItem) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Equipment browser with toggle button filtering and pagination
 */
export function EquipmentBrowser({
  onAddEquipment,
  className = '',
}: EquipmentBrowserProps): React.ReactElement {
  const {
    paginatedEquipment,
    isLoading,
    error,
    unitYear,
    unitTechBase,
    currentPage,
    totalPages,
    totalItems,
    search,
    activeCategories,
    showAllCategories,
    hidePrototype,
    hideOneShot,
    hideUnavailable,
    hideAmmoWithoutWeapon,
    sortColumn,
    sortDirection,
    setSearch,
    selectCategory,
    showAll,
    toggleHidePrototype,
    toggleHideOneShot,
    toggleHideUnavailable,
    toggleHideAmmoWithoutWeapon,
    clearFilters,
    setPage,
    setSort,
    refresh,
  } = useEquipmentBrowser();

  if (error) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
      >
        <div className="py-8 text-center">
          <div className="mb-2 text-red-400">Failed to load equipment</div>
          <p className="text-text-theme-secondary mb-4 text-sm">{error}</p>
          <button
            onClick={refresh}
            className="bg-accent hover:bg-accent/80 rounded px-4 py-2 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col rounded-lg border ${className}`}
    >
      <div className="border-border-theme-subtle flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold text-white">Equipment Database</h3>
        <span className="text-text-theme-secondary text-[10px]">
          {totalItems} items
        </span>
      </div>

      <div className="border-border-theme-subtle bg-surface-base/50 border-b px-3 py-2">
        <CompactFilterBar
          activeCategories={activeCategories}
          showAll={showAllCategories}
          hidePrototype={hidePrototype}
          hideOneShot={hideOneShot}
          hideUnavailable={hideUnavailable}
          hideAmmoWithoutWeapon={hideAmmoWithoutWeapon}
          search={search}
          onSelectCategory={selectCategory}
          onShowAll={showAll}
          onTogglePrototype={toggleHidePrototype}
          onToggleOneShot={toggleHideOneShot}
          onToggleUnavailable={toggleHideUnavailable}
          onToggleAmmoWithoutWeapon={toggleHideAmmoWithoutWeapon}
          onSearchChange={setSearch}
          onClearFilters={clearFilters}
        />

        {hideUnavailable && (unitYear || unitTechBase) && (
          <div className="text-text-theme-secondary mt-1.5 flex items-center gap-2 text-[10px]">
            <span className="text-slate-500">Filtering:</span>
            {unitYear && (
              <span className="bg-surface-raised rounded px-1.5 py-0.5">
                Year ≤ {unitYear}
              </span>
            )}
            {unitTechBase && (
              <span className="bg-surface-raised rounded px-1.5 py-0.5">
                {unitTechBase}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="text-text-theme-secondary animate-pulse">
              Loading equipment...
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-base sticky top-0">
              <tr className="text-text-theme-secondary border-border-theme-subtle border-b text-left text-[10px] uppercase">
                <SortableHeader
                  label="Name"
                  column="name"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                  className="pl-1.5"
                />
                <th className="w-20 px-1 py-1 text-center sm:w-24">Range</th>
                <th className="w-10 px-1 py-1 text-center sm:w-12">Dmg</th>
                <th className="w-8 px-1 py-1 text-center sm:w-10">Heat</th>
                <th
                  className="w-12 cursor-pointer px-1 py-1 text-center transition-colors hover:text-white"
                  onClick={() => setSort('weight')}
                >
                  <span className="flex items-center justify-center gap-0.5">
                    Wt
                    {sortColumn === 'weight' && (
                      <span className="text-accent text-[8px]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <SortableHeader
                  label="Crit"
                  column="criticalSlots"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                  className="w-10 text-center"
                />
                <th className="w-10 px-1 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedEquipment.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-text-theme-secondary px-3 py-8 text-center"
                  >
                    No equipment found
                  </td>
                </tr>
              ) : (
                paginatedEquipment.map((equipment) => (
                  <EquipmentRow
                    key={equipment.id}
                    equipment={equipment}
                    onAdd={() => onAddEquipment(equipment)}
                    compact
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-border-theme-subtle flex items-center justify-between border-t px-3 py-1.5">
        <div className="text-text-theme-secondary text-[10px]">
          Page {currentPage}/{totalPages}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
            className="bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-40"
          >
            ««
          </button>
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-40"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
            className="bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-40"
          >
            »»
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sortable table header
 */
interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
  className?: string;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = column === currentColumn;

  return (
    <th
      className={`cursor-pointer px-1 py-1 transition-colors hover:text-white ${className}`}
      onClick={() => onSort(column)}
    >
      <span className="justify-inherit flex items-center gap-0.5">
        {label}
        {isActive && (
          <span className="text-accent text-[8px]">
            {direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </th>
  );
}

export default EquipmentBrowser;
