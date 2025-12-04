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

interface EquipmentBrowserProps {
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
}: EquipmentBrowserProps) {
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
    sortColumn,
    sortDirection,
    setSearch,
    selectCategory,
    showAll,
    toggleHidePrototype,
    toggleHideOneShot,
    toggleHideUnavailable,
    clearFilters,
    setPage,
    setSort,
    refresh,
  } = useEquipmentBrowser();
  
  if (error) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">Failed to load equipment</div>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Equipment Database</h3>
      </div>
      
      {/* Toggle Filters */}
      <div className="px-4 py-2 space-y-2 border-b border-slate-700 bg-slate-800/50">
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
          onTogglePrototype={toggleHidePrototype}
          onToggleOneShot={toggleHideOneShot}
          onToggleUnavailable={toggleHideUnavailable}
        />
        
        {/* Unit context info - shows when filtering by availability */}
        {hideUnavailable && (unitYear || unitTechBase) && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <span className="text-slate-500">Filtering:</span>
            {unitYear && (
              <span className="bg-slate-700 px-2 py-0.5 rounded">Year ≤ {unitYear}</span>
            )}
            {unitTechBase && (
              <span className="bg-slate-700 px-2 py-0.5 rounded">{unitTechBase}</span>
            )}
          </div>
        )}
        
        {/* Text filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter:</span>
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment..."
              className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {(search || !showAllCategories || hidePrototype || hideOneShot) && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-slate-400">Loading equipment...</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-700">
                <SortableHeader
                  label="Name"
                  column="name"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={setSort}
                />
                <th className="px-2 py-2">Dmg</th>
                <th className="px-2 py-2">Heat</th>
                <th className="px-2 py-2">Range</th>
                <SortableHeader
                  label="Weight"
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
                <th className="px-2 py-2 w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
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
      <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between">
        <div className="text-xs text-slate-400">
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
          <span className="text-amber-400 text-[10px]">
            {direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </th>
  );
}

export default EquipmentBrowser;
