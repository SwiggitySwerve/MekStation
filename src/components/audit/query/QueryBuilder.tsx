/**
 * QueryBuilder Component
 * Form for building event queries with filters.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EventCategory, type IEventQueryFilters, type IEventContext } from '@/types/events';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FilterChip, type FilterChipVariant } from './FilterChip';

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
// Category Configuration
// =============================================================================

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: EventCategory.Game, label: 'Game Events' },
  { value: EventCategory.Campaign, label: 'Campaign Events' },
  { value: EventCategory.Pilot, label: 'Pilot Events' },
  { value: EventCategory.Repair, label: 'Repair Events' },
  { value: EventCategory.Award, label: 'Award Events' },
  { value: EventCategory.Meta, label: 'Meta Events' },
];

// Event types by category for multi-select
const EVENT_TYPES_BY_CATEGORY: Record<EventCategory, string[]> = {
  [EventCategory.Game]: [
    'game.started',
    'game.ended',
    'game.phase_changed',
    'game.turn_started',
    'game.turn_ended',
    'game.unit_moved',
    'game.attack_declared',
    'game.damage_applied',
  ],
  [EventCategory.Campaign]: [
    'campaign.created',
    'campaign.mission_started',
    'campaign.mission_completed',
    'campaign.roster_changed',
    'campaign.contract_accepted',
  ],
  [EventCategory.Pilot]: [
    'pilot.created',
    'pilot.xp_gained',
    'pilot.skill_improved',
    'pilot.wounded',
    'pilot.recovered',
    'pilot.killed',
    'pilot.assigned',
  ],
  [EventCategory.Repair]: [
    'repair.started',
    'repair.completed',
    'repair.cost_calculated',
    'repair.parts_ordered',
  ],
  [EventCategory.Award]: [
    'award.earned',
    'award.medal_granted',
    'award.achievement_unlocked',
  ],
  [EventCategory.Meta]: [
    'meta.checkpoint_created',
    'meta.chunk_finalized',
    'meta.save_created',
    'meta.save_loaded',
  ],
};

// =============================================================================
// Icons
// =============================================================================

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M14.78 11.78a.75.75 0 0 1-1.06 0L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

function formatEventType(type: string): string {
  const shortType = type.includes('.') ? type.split('.').slice(1).join('.') : type;
  return shortType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActiveFilters(filters: IEventQueryFilters): Array<{
  key: string;
  label: string;
  value: string;
  variant: FilterChipVariant;
  onRemove: () => IEventQueryFilters;
}> {
  const active: Array<{
    key: string;
    label: string;
    value: string;
    variant: FilterChipVariant;
    onRemove: () => IEventQueryFilters;
  }> = [];

  if (filters.category) {
    active.push({
      key: 'category',
      label: 'Category',
      value: CATEGORY_OPTIONS.find(o => o.value === filters.category)?.label || filters.category,
      variant: 'category',
      onRemove: () => ({ ...filters, category: undefined }),
    });
  }

  if (filters.types && filters.types.length > 0) {
    filters.types.forEach((type, index) => {
      active.push({
        key: `type-${index}`,
        label: 'Type',
        value: formatEventType(type),
        variant: 'type',
        onRemove: () => ({
          ...filters,
          types: filters.types?.filter(t => t !== type),
        }),
      });
    });
  }

  if (filters.context) {
    const ctx = filters.context;
    if (ctx.campaignId) {
      active.push({
        key: 'ctx-campaign',
        label: 'Campaign',
        value: ctx.campaignId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, campaignId: undefined },
        }),
      });
    }
    if (ctx.gameId) {
      active.push({
        key: 'ctx-game',
        label: 'Game',
        value: ctx.gameId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, gameId: undefined },
        }),
      });
    }
    if (ctx.pilotId) {
      active.push({
        key: 'ctx-pilot',
        label: 'Pilot',
        value: ctx.pilotId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, pilotId: undefined },
        }),
      });
    }
  }

  if (filters.timeRange) {
    active.push({
      key: 'time',
      label: 'Time',
      value: `${filters.timeRange.from.split('T')[0]} → ${filters.timeRange.to.split('T')[0]}`,
      variant: 'time',
      onRemove: () => ({ ...filters, timeRange: undefined }),
    });
  }

  if (filters.sequenceRange) {
    active.push({
      key: 'sequence',
      label: 'Sequence',
      value: `#${filters.sequenceRange.from} → #${filters.sequenceRange.to}`,
      variant: 'sequence',
      onRemove: () => ({ ...filters, sequenceRange: undefined }),
    });
  }

  if (filters.rootEventsOnly) {
    active.push({
      key: 'root',
      label: 'Filter',
      value: 'Root only',
      variant: 'category',
      onRemove: () => ({ ...filters, rootEventsOnly: false }),
    });
  }

  return active;
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...(filters.types || [])]);

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
    [filters, onChange]
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
    [filters, onChange, selectedTypes]
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
        Object.entries(newContext).filter(([, v]) => v !== undefined)
      ) as Partial<IEventContext>;
      onChange({
        ...filters,
        context: Object.keys(cleanContext).length > 0 ? cleanContext : undefined,
      });
    },
    [filters, onChange]
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
    [filters, onChange]
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
    [filters, onChange]
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
    [onSearch]
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
    [onChange]
  );

  return (
    <form onSubmit={handleSearch} className={`space-y-4 ${className}`}>
      {/* Primary Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
              border transition-all duration-200 text-sm font-medium
              ${filters.rootEventsOnly
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-surface-raised/50 border-border-theme text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
              }
            `}
          >
            <span className={`
              w-4 h-4 rounded border-2 flex items-center justify-center
              transition-colors duration-200
              ${filters.rootEventsOnly ? 'bg-accent border-accent' : 'border-border-theme'}
            `}>
              {filters.rootEventsOnly && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-surface-deep">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
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
          <label className="block text-sm text-text-theme-secondary">
            Event Types
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-surface-raised/30 rounded-lg border border-border-theme-subtle">
            {availableTypes.map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeToggle(type)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-full border
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-surface-raised/50 border-border-theme-subtle text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
                    }
                  `}
                >
                  {formatEventType(type)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Filters (Collapsible) */}
      <div className="border border-border-theme-subtle rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="
            w-full flex items-center justify-between px-4 py-3
            bg-surface-raised/30 text-text-theme-secondary
            hover:text-text-theme-primary transition-colors duration-150
          "
        >
          <span className="text-sm font-medium">Advanced Filters</span>
          {isAdvancedOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>

        {isAdvancedOpen && (
          <div className="p-4 space-y-4 border-t border-border-theme-subtle bg-surface-base/20">
            {/* Context Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Campaign ID"
                placeholder="Enter campaign ID..."
                value={filters.context?.campaignId || ''}
                onChange={(e) => handleContextChange('campaignId', e.target.value)}
              />
              <Input
                label="Game ID"
                placeholder="Enter game ID..."
                value={filters.context?.gameId || ''}
                onChange={(e) => handleContextChange('gameId', e.target.value)}
              />
              <Input
                label="Pilot ID"
                placeholder="Enter pilot ID..."
                value={filters.context?.pilotId || ''}
                onChange={(e) => handleContextChange('pilotId', e.target.value)}
              />
            </div>

            {/* Sequence Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Sequence From"
                placeholder="Start sequence..."
                value={filters.sequenceRange?.from?.toString() || ''}
                onChange={(e) => handleSequenceRangeChange('from', e.target.value)}
                min={0}
              />
              <Input
                type="number"
                label="Sequence To"
                placeholder="End sequence..."
                value={filters.sequenceRange?.to?.toString() || ''}
                onChange={(e) => handleSequenceRangeChange('to', e.target.value)}
                min={0}
              />
            </div>

            {/* Caused By Filter */}
            <Input
              label="Caused By Event ID"
              placeholder="Filter by parent event ID..."
              value={filters.causedByEventId || ''}
              onChange={(e) => onChange({ ...filters, causedByEventId: e.target.value || undefined })}
            />
          </div>
        )}
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-raised/20 rounded-lg border border-border-theme-subtle/50">
          <span className="text-xs text-text-theme-muted mr-1">Active:</span>
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
