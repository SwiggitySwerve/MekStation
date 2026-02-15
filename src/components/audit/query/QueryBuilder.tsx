/**
 * QueryBuilder Component
 * Form for building event queries with filters.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import {
  EventCategory,
  type IEventQueryFilters,
  type IEventContext,
} from '@/types/events';

import { FilterChip } from './FilterChip';
import {
  CATEGORY_OPTIONS,
  EVENT_TYPES_BY_CATEGORY,
  formatEventType,
  getActiveFilters,
} from './queryBuilder.helpers';
import { QueryBuilderAdvancedFilters } from './QueryBuilderAdvancedFilters';
import { SearchIcon, ClearIcon } from './QueryBuilderIcons';

// =============================================================================
// Types
// =============================================================================

export interface QueryBuilderProps {
  /** Current filter state */
  filters: IEventQueryFilters;
  /** Callback when filters change */
  onChange: (filters: IEventQueryFilters) => void;
  /** Callback to execute search */
  onSearch: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function QueryBuilder({
  filters,
  onChange,
  onSearch,
  isLoading = false,
  className = '',
}: QueryBuilderProps): React.ReactElement {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    ...(filters.types || []),
  ]);

  // Get available types based on selected category
  const availableTypes = useMemo(() => {
    if (filters.category) {
      return EVENT_TYPES_BY_CATEGORY[filters.category] || [];
    }
    // Return all types if no category selected
    return Object.values(EVENT_TYPES_BY_CATEGORY).flat();
  }, [filters.category]);

  // Handle category change
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as EventCategory | '';
      onChange({
        ...filters,
        category: value || undefined,
        // Reset types when category changes
        types: undefined,
      });
      setSelectedTypes([]);
    },
    [filters, onChange],
  );

  // Handle type toggle
  const handleTypeToggle = useCallback(
    (type: string) => {
      const newTypes = selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type];
      setSelectedTypes(newTypes);
      onChange({
        ...filters,
        types: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [filters, onChange, selectedTypes],
  );

  // Handle context field changes
  const handleContextChange = useCallback(
    (field: keyof IEventContext, value: string) => {
      const newContext: Partial<IEventContext> = {
        ...filters.context,
        [field]: value || undefined,
      };
      // Clean up empty context
      const cleanContext = Object.fromEntries(
        Object.entries(newContext).filter(([, v]) => v !== undefined),
      ) as Partial<IEventContext>;
      onChange({
        ...filters,
        context:
          Object.keys(cleanContext).length > 0 ? cleanContext : undefined,
      });
    },
    [filters, onChange],
  );

  // Handle time range changes
  const handleTimeRangeChange = useCallback(
    (field: 'from' | 'to', value: string) => {
      if (!value) {
        if (field === 'from' && !filters.timeRange?.to) {
          onChange({ ...filters, timeRange: undefined });
        } else if (field === 'to' && !filters.timeRange?.from) {
          onChange({ ...filters, timeRange: undefined });
        } else if (filters.timeRange) {
          onChange({
            ...filters,
            timeRange: {
              from: field === 'from' ? '' : filters.timeRange.from,
              to: field === 'to' ? '' : filters.timeRange.to,
            },
          });
        }
        return;
      }
      onChange({
        ...filters,
        timeRange: {
          from: field === 'from' ? value : filters.timeRange?.from || '',
          to: field === 'to' ? value : filters.timeRange?.to || '',
        },
      });
    },
    [filters, onChange],
  );

  // Handle sequence range changes
  const handleSequenceRangeChange = useCallback(
    (field: 'from' | 'to', value: string) => {
      const numValue = value ? parseInt(value, 10) : undefined;
      if (numValue === undefined || isNaN(numValue)) {
        if (field === 'from' && !filters.sequenceRange?.to) {
          onChange({ ...filters, sequenceRange: undefined });
        } else if (field === 'to' && !filters.sequenceRange?.from) {
          onChange({ ...filters, sequenceRange: undefined });
        } else if (filters.sequenceRange) {
          onChange({
            ...filters,
            sequenceRange: {
              from: field === 'from' ? 0 : filters.sequenceRange.from,
              to: field === 'to' ? 0 : filters.sequenceRange.to,
            },
          });
        }
        return;
      }
      onChange({
        ...filters,
        sequenceRange: {
          from: field === 'from' ? numValue : filters.sequenceRange?.from || 0,
          to: field === 'to' ? numValue : filters.sequenceRange?.to || 0,
        },
      });
    },
    [filters, onChange],
  );

  // Handle root events toggle
  const handleRootEventsToggle = useCallback(() => {
    onChange({
      ...filters,
      rootEventsOnly: !filters.rootEventsOnly,
    });
  }, [filters, onChange]);

  // Clear all filters
  const handleClear = useCallback(() => {
    onChange({});
    setSelectedTypes([]);
  }, [onChange]);

  // Handle search
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch();
    },
    [onSearch],
  );

  // Get active filters for chips
  const activeFilters = useMemo(() => getActiveFilters(filters), [filters]);

  // Handle removing a filter chip
  const handleRemoveFilter = useCallback(
    (removeAction: () => IEventQueryFilters) => {
      const newFilters = removeAction();
      onChange(newFilters);
      // Sync selectedTypes state
      setSelectedTypes([...(newFilters.types || [])]);
    },
    [onChange],
  );

  return (
    <form onSubmit={handleSearch} className={`space-y-4 ${className}`}>
      {/* Primary Filters Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Category Select */}
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={filters.category || ''}
          onChange={handleCategoryChange}
          placeholder="All Categories"
        />

        {/* Time Range - From */}
        <Input
          type="datetime-local"
          label="From Time"
          value={filters.timeRange?.from || ''}
          onChange={(e) => handleTimeRangeChange('from', e.target.value)}
        />

        {/* Time Range - To */}
        <Input
          type="datetime-local"
          label="To Time"
          value={filters.timeRange?.to || ''}
          onChange={(e) => handleTimeRangeChange('to', e.target.value)}
        />

        {/* Root Events Toggle */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRootEventsToggle}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filters.rootEventsOnly
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-surface-raised/50 border-border-theme text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
            } `}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors duration-200 ${filters.rootEventsOnly ? 'bg-accent border-accent' : 'border-border-theme'} `}
            >
              {filters.rootEventsOnly && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="text-surface-deep h-3 w-3"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            Root Events Only
          </button>
        </div>
      </div>

      {/* Event Types Multi-Select */}
      {availableTypes.length > 0 && (
        <div className="space-y-2">
          <label className="text-text-theme-secondary block text-sm">
            Event Types
          </label>
          <div className="bg-surface-raised/30 border-border-theme-subtle flex flex-wrap gap-2 rounded-lg border p-3">
            {availableTypes.map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeToggle(type)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
                      : 'bg-surface-raised/50 border-border-theme-subtle text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
                  } `}
                >
                  {formatEventType(type)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <QueryBuilderAdvancedFilters
        isOpen={isAdvancedOpen}
        onToggle={() => setIsAdvancedOpen(!isAdvancedOpen)}
        filters={filters}
        onChange={onChange}
        onContextChange={handleContextChange}
        onSequenceRangeChange={handleSequenceRangeChange}
      />

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="bg-surface-raised/20 border-border-theme-subtle/50 flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className="text-text-theme-muted mr-1 text-xs">Active:</span>
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              variant={filter.variant}
              onRemove={() => handleRemoveFilter(filter.onRemove)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          leftIcon={<SearchIcon />}
        >
          Search Events
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleClear}
          leftIcon={<ClearIcon />}
          disabled={activeFilters.length === 0}
        >
          Clear All
        </Button>
      </div>
    </form>
  );
}

export default QueryBuilder;
