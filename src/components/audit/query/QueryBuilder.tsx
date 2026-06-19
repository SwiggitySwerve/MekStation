/**
 * QueryBuilder Component
 * Form for building event queries with filters.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useCallback, useMemo } from 'react';

import { Input, Select } from '@/components/ui/Input';
import {
  EventCategory,
  type IEventQueryFilters,
  type IEventContext,
} from '@/types/events';

import {
  CATEGORY_OPTIONS,
  getActiveFilters,
  getAvailableEventTypes,
  toggleQueryType,
  withCategoryFilter,
  withContextFilter,
  withQueryTypes,
  withSequenceRangeFilter,
  withTimeRangeFilter,
} from './queryBuilder.helpers';
import { QueryBuilderAdvancedFilters } from './QueryBuilderAdvancedFilters';
import {
  ActiveFiltersList,
  EventTypesPicker,
  QueryBuilderActions,
  RootEventsToggle,
} from './QueryBuilderControls';

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

  const availableTypes = useMemo(
    () => getAvailableEventTypes(filters.category),
    [filters.category],
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as EventCategory | '';
      onChange(withCategoryFilter(filters, value));
      setSelectedTypes([]);
    },
    [filters, onChange],
  );

  // Handle type toggle
  const handleTypeToggle = useCallback(
    (type: string) => {
      const newTypes = toggleQueryType(selectedTypes, type);
      setSelectedTypes(newTypes);
      onChange(withQueryTypes(filters, newTypes));
    },
    [filters, onChange, selectedTypes],
  );

  // Handle context field changes
  const handleContextChange = useCallback(
    (field: keyof IEventContext, value: string) => {
      onChange(withContextFilter(filters, field, value));
    },
    [filters, onChange],
  );

  // Handle time range changes
  const handleTimeRangeChange = useCallback(
    (field: 'from' | 'to', value: string) => {
      onChange(withTimeRangeFilter(filters, field, value));
    },
    [filters, onChange],
  );

  // Handle sequence range changes
  const handleSequenceRangeChange = useCallback(
    (field: 'from' | 'to', value: string) => {
      onChange(withSequenceRangeFilter(filters, field, value));
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

        <RootEventsToggle
          isActive={Boolean(filters.rootEventsOnly)}
          onToggle={handleRootEventsToggle}
        />
      </div>

      <EventTypesPicker
        availableTypes={availableTypes}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
      />

      <QueryBuilderAdvancedFilters
        isOpen={isAdvancedOpen}
        onToggle={() => setIsAdvancedOpen(!isAdvancedOpen)}
        filters={filters}
        onChange={onChange}
        onContextChange={handleContextChange}
        onSequenceRangeChange={handleSequenceRangeChange}
      />

      <ActiveFiltersList
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
      />

      <QueryBuilderActions
        hasActiveFilters={activeFilters.length > 0}
        isLoading={isLoading}
        onClear={handleClear}
      />
    </form>
  );
}

export default QueryBuilder;
