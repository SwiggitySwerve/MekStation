/**
 * Equipment Browser - searchable, filterable equipment catalog
 * @spec openspec/specs/equipment-browser/spec.md
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-browser/spec.md
 */

import React from 'react';
import { EquipmentRow } from './EquipmentRow';
import { CompactFilterBar } from './CompactFilterBar';
import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { SortColumn } from '@/stores/useEquipmentStore';
import { IEquipmentItem } from '@/types/equipment';

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
      <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">Failed to load equipment</div>
          <p className="text-sm text-text-theme-secondary mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle flex flex-col ${className}`}>
      <div className="px-3 py-2 border-b border-border-theme-subtle flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Equipment Database</h3>
        <span className="text-[10px] text-text-theme-secondary">{totalItems} items</span>
      </div>

      <div className="px-3 py-2 border-b border-border-theme-subtle bg-surface-base/50">
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
          <div className="flex items-center gap-2 text-[10px] text-text-theme-secondary mt-1.5">
            <span className="text-slate-500">Filtering:</span>
            {unitYear && (
              <span className="bg-surface-raised px-1.5 py-0.5 rounded">Year ≤ {unitYear}</span>
            )}
            {unitTechBase && (
              <span className="bg-surface-raised px-1.5 py-0.5 rounded">{unitTechBase}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-text-theme-secondary">Loading equipment...</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-base">
              <tr className="text-left text-[10px] text-text-theme-secondary uppercase border-b border-border-theme-subtle">
                <SortableHeader
                  label="Name"
                  column="name"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                />
                <th className="hidden sm:table-cell px-1 py-1">Dmg</th>
                <th className="hidden sm:table-cell px-1 py-1">Heat</th>
                <th className="hidden md:table-cell px-1 py-1">Range</th>
                <SortableHeader
                  label="Wt"
                  column="weight"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Crit"
                  column="criticalSlots"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                />
                <th className="px-1 py-1 w-10 sm:w-12"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-text-theme-secondary">
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
      
      <div className="px-3 py-1.5 border-t border-border-theme-subtle flex items-center justify-between">
        <div className="text-[10px] text-text-theme-secondary">
          Page {currentPage}/{totalPages}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
            className="px-1.5 py-0.5 text-[10px] bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary disabled:opacity-40 rounded transition-colors"
          >
            ««
          </button>
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-1.5 py-0.5 text-[10px] bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary disabled:opacity-40 rounded transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-1.5 py-0.5 text-[10px] bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary disabled:opacity-40 rounded transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-1.5 py-0.5 text-[10px] bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary disabled:opacity-40 rounded transition-colors"
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
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = column === currentColumn;
  
  return (
    <th
      className="px-1.5 py-1 cursor-pointer hover:text-white transition-colors"
      onClick={() => onSort(column)}
    >
      <span className="flex items-center gap-0.5">
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
