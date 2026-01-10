/**
 * Equipment Browser Component
 * 
 * Searchable, filterable equipment catalog with toggle button filters.
 * 
 * @spec openspec/specs/equipment-browser/spec.md
 * @spec openspec/changes/unify-equipment-tab/specs/equipment-browser/spec.md
 */

import React from 'react';
import { EquipmentRow } from './EquipmentRow';
import { CategoryToggleBar, HideToggleBar } from './CategoryToggleBar';
import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';
import { SortColumn } from '@/stores/useEquipmentStore';
import { IEquipmentItem } from '@/types/equipment';
import { PaginationButtons } from '@/components/ui/Button';

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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-theme-subtle">
        <h3 className="text-lg font-semibold text-white">Equipment Database</h3>
      </div>

      {/* Toggle Filters */}
      <div className="px-4 py-2 space-y-2 border-b border-border-theme-subtle bg-surface-base/50">
        {/* Category toggles */}
        <CategoryToggleBar
          activeCategories={activeCategories}
          onSelectCategory={selectCategory}
          onShowAll={showAll}
          showAll={showAllCategories}
        />
        
        {/* Hide toggles */}
        <HideToggleBar
          hidePrototype={hidePrototype}
          hideOneShot={hideOneShot}
          hideUnavailable={hideUnavailable}
          hideAmmoWithoutWeapon={hideAmmoWithoutWeapon}
          onTogglePrototype={toggleHidePrototype}
          onToggleOneShot={toggleHideOneShot}
          onToggleUnavailable={toggleHideUnavailable}
          onToggleAmmoWithoutWeapon={toggleHideAmmoWithoutWeapon}
        />
        
        {/* Unit context info - shows when filtering by availability */}
        {hideUnavailable && (unitYear || unitTechBase) && (
          <div className="flex items-center gap-2 text-xs text-text-theme-secondary px-1">
            <span className="text-slate-500">Filtering:</span>
            {unitYear && (
              <span className="bg-surface-raised px-2 py-0.5 rounded">Year ≤ {unitYear}</span>
            )}
            {unitTechBase && (
              <span className="bg-surface-raised px-2 py-0.5 rounded">{unitTechBase}</span>
            )}
          </div>
        )}
        
        {/* Text filter */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-text-theme-secondary">Filter:</span>
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment..."
              inputMode="search"
              className="w-full px-3 py-2 sm:py-1.5 text-sm bg-surface-raised border border-border-theme rounded text-white placeholder-text-theme-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-theme-secondary hover:text-white"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {(search || !showAllCategories || hidePrototype || hideOneShot || hideAmmoWithoutWeapon) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 sm:px-2 sm:py-1 text-xs bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-text-theme-secondary">Loading equipment...</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-base">
              <tr className="text-left text-xs text-text-theme-secondary uppercase border-b border-border-theme-subtle">
                <SortableHeader
                  label="Name"
                  column="name"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                />
                <th className="hidden sm:table-cell px-2 py-2">Dmg</th>
                <th className="hidden sm:table-cell px-2 py-2">Heat</th>
                <th className="hidden md:table-cell px-2 py-2">Range</th>
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
                <th className="px-2 py-2 w-14 sm:w-16">Action</th>
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
      
      {/* Pagination */}
      <div className="px-4 py-2 border-t border-border-theme-subtle flex items-center justify-between">
        <div className="text-xs text-text-theme-secondary">
          {paginatedEquipment.length} of {totalItems}
        </div>
        <PaginationButtons
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
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
      className="px-2 py-2 cursor-pointer hover:text-white transition-colors"
      onClick={() => onSort(column)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-accent text-[10px]">
            {direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </th>
  );
}

export default EquipmentBrowser;
