import React, { useState, useEffect, useCallback } from 'react';
import type { IFilterPanelProps, IFilterDefinition } from '@/components/simulation-viewer/types';

const DEBOUNCE_MS = 300;

const getOptionLabel = (filter: IFilterDefinition, option: string): string =>
  filter.optionLabels?.[option] ?? option;

const getActiveCount = (activeFilters: Record<string, string[]>): number =>
  Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

export const FilterPanel: React.FC<IFilterPanelProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  enableSearch = false,
  searchQuery = '',
  onSearchChange,
  className = '',
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!enableSearch || !onSearchChange) return;

    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [localSearch, enableSearch, onSearchChange]);

  const handleCheckboxToggle = useCallback(
    (filterId: string, option: string) => {
      const current = activeFilters[filterId] ?? [];
      const isActive = current.includes(option);
      const updated = isActive
        ? current.filter((o) => o !== option)
        : [...current, option];

      const next = { ...activeFilters };
      if (updated.length === 0) {
        delete next[filterId];
      } else {
        next[filterId] = updated;
      }
      onFilterChange(next);
    },
    [activeFilters, onFilterChange]
  );

  const handleBadgeClose = useCallback(
    (filterId: string, option: string) => {
      handleCheckboxToggle(filterId, option);
    },
    [handleCheckboxToggle]
  );

  const handleClearAll = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  const activeCount = getActiveCount(activeFilters);

  const activeBadges: { filterId: string; option: string; label: string }[] = [];
  for (const filter of filters) {
    const active = activeFilters[filter.id] ?? [];
    for (const option of active) {
      activeBadges.push({
        filterId: filter.id,
        option,
        label: getOptionLabel(filter, option),
      });
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className}`}
      data-testid="filter-panel"
    >
      <div className="flex items-center justify-between mb-4" data-testid="filter-header">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Filters
          {activeCount > 0 && (
            <span
              className="ml-2 text-blue-600 dark:text-blue-400"
              data-testid="active-filter-count"
            >
              ({activeCount})
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-red-600 dark:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
            data-testid="clear-all-button"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="active-badges">
          {activeBadges.map(({ filterId, option, label }) => (
            <span
              key={`${filterId}-${option}`}
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full px-3 py-1 text-sm font-medium inline-flex items-center"
              data-testid={`badge-${filterId}-${option}`}
            >
              {label}
              <button
                type="button"
                onClick={() => handleBadgeClose(filterId, option)}
                className="ml-2 hover:text-blue-900 dark:hover:text-blue-100 focus:outline-none"
                aria-label={`Remove ${label} filter`}
                data-testid={`badge-close-${filterId}-${option}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {enableSearch && (
        <div className="mb-4">
          <input
            type="text"
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search filters..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            data-testid="filter-search-input"
            aria-label="Search filters"
          />
        </div>
      )}

      <div className="space-y-2" data-testid="filter-sections">
        {filters.map((filter) => (
          <details
            key={filter.id}
            className="group"
            data-testid={`filter-section-${filter.id}`}
            open
          >
            <summary
              className="flex items-center justify-between cursor-pointer list-none p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300"
              data-testid={`filter-summary-${filter.id}`}
              aria-label={`${filter.label} filter section`}
            >
              <span>
                {filter.label}
                {(activeFilters[filter.id]?.length ?? 0) > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 text-xs">
                    ({activeFilters[filter.id].length})
                  </span>
                )}
              </span>
              <span className="text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <div className="pl-2 pt-1 pb-2 space-y-1" data-testid={`filter-options-${filter.id}`}>
              {filter.options.map((option) => {
                const isChecked = activeFilters[filter.id]?.includes(option) ?? false;
                const label = getOptionLabel(filter, option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300"
                    data-testid={`filter-option-${filter.id}-${option}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxToggle(filter.id, option)}
                      className="accent-blue-600 h-4 w-4"
                      data-testid={`checkbox-${filter.id}-${option}`}
                      aria-label={`Filter by ${label}`}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      {filters.length === 0 && (
        <p
          className="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
          data-testid="empty-filters-message"
        >
          No filters available
        </p>
      )}
    </div>
  );
};
