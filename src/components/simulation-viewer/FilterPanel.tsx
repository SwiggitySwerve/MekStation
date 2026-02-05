import React, { useState, useEffect, useCallback } from 'react';

import type {
  IFilterPanelProps,
  IFilterDefinition,
} from '@/components/simulation-viewer/types';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

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
    [activeFilters, onFilterChange],
  );

  const handleBadgeClose = useCallback(
    (filterId: string, option: string) => {
      handleCheckboxToggle(filterId, option);
    },
    [handleCheckboxToggle],
  );

  const handleClearAll = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  const activeCount = getActiveCount(activeFilters);

  const activeBadges: { filterId: string; option: string; label: string }[] =
    [];
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
      className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}
      role="region"
      aria-label="Filter controls"
      data-testid="filter-panel"
    >
      <div
        className="mb-4 flex items-center justify-between"
        data-testid="filter-header"
      >
        <h3 className="text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
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
            className={`min-h-[44px] rounded px-3 py-2 text-sm text-red-600 hover:underline md:min-h-0 md:px-2 md:py-1 dark:text-red-400 ${FOCUS_RING_CLASSES}`}
            data-testid="clear-all-button"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {activeBadges.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" data-testid="active-badges">
          {activeBadges.map(({ filterId, option, label }) => (
            <span
              key={`${filterId}-${option}`}
              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
              data-testid={`badge-${filterId}-${option}`}
            >
              {label}
              <button
                type="button"
                onClick={() => handleBadgeClose(filterId, option)}
                className={`ml-2 rounded-full hover:text-blue-900 dark:hover:text-blue-100 ${FOCUS_RING_CLASSES}`}
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
            className={`min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent md:min-h-0 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${FOCUS_RING_CLASSES}`}
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
              className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:min-h-0 dark:text-gray-300 dark:hover:bg-gray-700/50"
              data-testid={`filter-summary-${filter.id}`}
              aria-label={`${filter.label} filter section`}
            >
              <span>
                {filter.label}
                {(activeFilters[filter.id]?.length ?? 0) > 0 && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    ({activeFilters[filter.id].length})
                  </span>
                )}
              </span>
              <span
                className="text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
                aria-hidden="true"
              >
                ▾
              </span>
            </summary>
            <div
              className="space-y-1 pt-1 pb-2 pl-2"
              data-testid={`filter-options-${filter.id}`}
            >
              {filter.options.map((option) => {
                const isChecked =
                  activeFilters[filter.id]?.includes(option) ?? false;
                const label = getOptionLabel(filter, option);
                return (
                  <label
                    key={option}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 md:min-h-0 md:py-1 dark:text-gray-300 dark:hover:bg-gray-700/50"
                    data-testid={`filter-option-${filter.id}-${option}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxToggle(filter.id, option)}
                      className="h-4 w-4 accent-blue-600"
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
          className="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
          data-testid="empty-filters-message"
        >
          No filters available
        </p>
      )}
    </div>
  );
};
