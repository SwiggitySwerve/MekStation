/**
 * Equipment Browser (Refactored) - Clean, service-based equipment browser
 * Uses the new service architecture for maintainable and testable code
 * Clean, service-based equipment browser with complete transformation from 600+ line monolithic component
 */

import React from 'react';
import { EquipmentObject } from '../../utils/criticalSlots/CriticalSlot';
import { useEquipmentBrowser } from '../../hooks/equipment/useEquipmentBrowser';
import { EquipmentBrowserHeader } from './browser/EquipmentBrowserHeader';
import { EquipmentBrowserTable } from './browser/EquipmentBrowserTable';
import { EquipmentBrowserPagination } from './browser/EquipmentBrowserPagination';

export interface EquipmentBrowserProps {
  // Optional equipment action handlers
  onAddEquipment?: (equipment: EquipmentObject) => void;
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void;
  
  // Optional UI customization
  showAddButtons?: boolean;
  actionButtonLabel?: string;
  actionButtonIcon?: string;
  
  // Optional configuration
  initialPageSize?: number;
  initialFilters?: Partial<import('../../utils/equipment/EquipmentDataService').EquipmentFilterCriteria>;
  enableKeyboardNavigation?: boolean;
  enableAutoRefresh?: boolean;
  
  // Optional styling
  className?: string;
}

export function EquipmentBrowserRefactored({
  onAddEquipment,
  onEquipmentAction,
  showAddButtons = true,
  actionButtonLabel = "Add to unit",
  actionButtonIcon = "+",
  initialPageSize = 25,
  initialFilters,
  enableKeyboardNavigation = true,
  enableAutoRefresh = false,
  className = ""
}: EquipmentBrowserProps) {
  
  // Use the comprehensive equipment browser hook
  const {
    // Filter state and actions
    filters,
    setFilters,
    availableCategories,
    availableTechBases,
    
    // Pagination state and actions
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    
    // Data state
    paginatedEquipment,
    isLoading,
    isRefreshing,
    hasError,
    error,
    
    // Actions
    refresh
  } = useEquipmentBrowser({
    initialPageSize,
    initialFilters,
    enableKeyboardNavigation,
    enableAutoRefresh,
    onEquipmentAdd: onAddEquipment,
    onEquipmentAction,
    onError: (error) => {
      console.warn('Equipment Browser Warning:', error);
    }
  });

  // Error display
  if (hasError && !isLoading) {
    return (
      <div className={`h-full flex flex-col bg-gray-800 p-4 rounded-lg border border-red-600 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Equipment Browser</h2>
          <button
            onClick={refresh}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
          >
            Retry
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-2">⚠️ Equipment Data Error</div>
            <div className="text-red-300 text-sm max-w-md">
              {error || 'Failed to load equipment data. Please check your connection and try again.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-gray-800 p-4 rounded-lg border border-gray-700 ${className}`}>
      {/* Header with filters and search */}
      <EquipmentBrowserHeader
        filters={filters}
        onFiltersChange={setFilters}
        categories={availableCategories}
        techBases={availableTechBases}
        totalResults={totalItems}
        filteredResults={paginatedEquipment.length}
        isLoading={isLoading || isRefreshing}
        className="flex-shrink-0"
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Equipment table */}
        <div className="flex-1 mb-4">
          <EquipmentBrowserTable
            equipment={paginatedEquipment}
            onAddEquipment={onAddEquipment}
            onEquipmentAction={onEquipmentAction}
            showAddButtons={showAddButtons}
            actionButtonLabel={actionButtonLabel}
            actionButtonIcon={actionButtonIcon}
            isLoading={isLoading}
            className="h-full"
          />
        </div>

        {/* Pagination controls */}
        <EquipmentBrowserPagination
          pagination={{
            currentPage,
            pageSize,
            totalItems
          }}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading || isRefreshing}
          className="flex-shrink-0"
        />
      </div>

      {/* Instructions footer */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-600">
        <div className="text-gray-400 text-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p>• Click <span className="text-green-400">{actionButtonIcon}</span> to add equipment to your unit</p>
              <p>• Use filters to find specific equipment types and tech bases</p>
            </div>
            {enableKeyboardNavigation && (
              <div className="text-right space-y-1">
                <p>• Use <span className="text-blue-400">← →</span> keys for page navigation</p>
                <p>• <span className="text-blue-400">Home/End</span> for first/last page</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the refactored component as the main export
export default EquipmentBrowserRefactored;

// Also export a compatibility wrapper for the original component interface
export function EquipmentBrowser(props: EquipmentBrowserProps) {
  return <EquipmentBrowserRefactored {...props} />;
}
