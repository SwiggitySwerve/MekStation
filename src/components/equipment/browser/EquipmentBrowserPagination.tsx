/**
 * Equipment Browser Pagination - Pagination controls for equipment browsing
 * Handles page navigation, page size selection, and pagination state
 * Follows SOLID principles with single responsibility for pagination UI
 */

import React from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface EquipmentBrowserPaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  className?: string;
}

export interface PageSizeOption {
  value: number;
  label: string;
}

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [
  { value: 10, label: '10 per page' },
  { value: 25, label: '25 per page' },
  { value: 50, label: '50 per page' },
  { value: 100, label: '100 per page' },
  { value: 250, label: '250 per page' },
];

export function EquipmentBrowserPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  className = ''
}: EquipmentBrowserPaginationProps) {
  const { currentPage, pageSize, totalItems } = pagination;
  
  // Calculate pagination metrics
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Generate page numbers to show
  const getVisiblePages = (): number[] => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: number[] = [];
    
    // Always show first page
    if (totalPages > 0) {
      range.push(1);
    }
    
    // Calculate the range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);
    
    // Add ellipsis if there's a gap after first page
    if (start > 2) {
      range.push(-1); // -1 represents ellipsis
    }
    
    // Add pages around current page
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        range.push(i);
      }
    }
    
    // Add ellipsis if there's a gap before last page
    if (end < totalPages - 1) {
      range.push(-1); // -1 represents ellipsis
    }
    
    // Always show last page if different from first
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    return range;
  };

  const visiblePages = getVisiblePages();

  // Handle page navigation
  const handlePreviousPage = () => {
    if (hasPreviousPage && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page > 0 && page <= totalPages && !isLoading) {
      onPageChange(page);
    }
  };

  const handleFirstPage = () => {
    if (currentPage !== 1 && !isLoading) {
      onPageChange(1);
    }
  };

  const handleLastPage = () => {
    if (currentPage !== totalPages && !isLoading) {
      onPageChange(totalPages);
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isLoading) {
      onPageSizeChange(Number(event.target.value));
    }
  };

  // Don't render if no items
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`equipment-browser-pagination ${className}`}>
      {/* Results Summary and Page Size Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Results Info */}
          <div className="text-gray-400 text-sm">
            Showing{' '}
            <span className="text-white font-medium">{startIndex}</span>
            {endIndex > startIndex && (
              <>
                {' '}to <span className="text-white font-medium">{endIndex}</span>
              </>
            )}
            {' '}of <span className="text-white font-medium">{totalItems}</span> items
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center text-blue-400 text-sm">
              <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-gray-400 text-sm">Items per page:</label>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={isLoading}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-1">
          {/* First Page Button */}
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 1 || isLoading}
            className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            title="First page"
          >
            ««
          </button>

          {/* Previous Page Button */}
          <button
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage || isLoading}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            title="Previous page"
          >
            ‹ Previous
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 mx-2">
            {visiblePages.map((page, index) => {
              if (page === -1) {
                // Render ellipsis
                return (
                  <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                    ...
                  </span>
                );
              }

              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  disabled={isActive || isLoading}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white cursor-default'
                      : 'bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50'
                  }`}
                  title={`Go to page ${page}`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            onClick={handleNextPage}
            disabled={!hasNextPage || isLoading}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            title="Next page"
          >
            Next ›
          </button>

          {/* Last Page Button */}
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages || isLoading}
            className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
            title="Last page"
          >
            »»
          </button>
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      {totalPages > 1 && (
        <div className="mt-3 text-center">
          <div className="text-gray-500 text-xs">
            Use arrow keys ← → for page navigation, or click page numbers
          </div>
        </div>
      )}
    </div>
  );
}

// Keyboard navigation hook for pagination
export function usePaginationKeyboard(
  pagination: PaginationState,
  onPageChange: (page: number) => void,
  isEnabled: boolean = true
) {
  React.useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { currentPage } = pagination;
      const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentPage > 1) {
            onPageChange(currentPage - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          if (currentPage !== 1) {
            onPageChange(1);
          }
          break;
        case 'End':
          event.preventDefault();
          if (currentPage !== totalPages) {
            onPageChange(totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pagination, onPageChange, isEnabled]);
}

// Calculate pagination info utility
export function calculatePaginationInfo(
  totalItems: number,
  currentPage: number,
  pageSize: number
): {
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isValidPage: boolean;
} {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  
  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isValidPage: currentPage >= 1 && currentPage <= totalPages
  };
}

// Export utility constants
export { PAGE_SIZE_OPTIONS };
