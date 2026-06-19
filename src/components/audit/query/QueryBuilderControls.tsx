import React from 'react';

import type { IEventQueryFilters } from '@/types/events';

import { Button } from '@/components/ui/Button';

import type { getActiveFilters } from './queryBuilder.helpers';

import { FilterChip } from './FilterChip';
import { formatEventType } from './queryBuilder.helpers';
import { SearchIcon, ClearIcon } from './QueryBuilderIcons';

type ActiveFilter = ReturnType<typeof getActiveFilters>[number];

interface RootEventsToggleProps {
  readonly isActive: boolean;
  readonly onToggle: () => void;
}

interface EventTypesPickerProps {
  readonly availableTypes: readonly string[];
  readonly selectedTypes: readonly string[];
  readonly onTypeToggle: (type: string) => void;
}

interface ActiveFiltersListProps {
  readonly activeFilters: readonly ActiveFilter[];
  readonly onRemoveFilter: (removeAction: () => IEventQueryFilters) => void;
}

interface QueryBuilderActionsProps {
  readonly hasActiveFilters: boolean;
  readonly isLoading: boolean;
  readonly onClear: () => void;
}

export function RootEventsToggle({
  isActive,
  onToggle,
}: RootEventsToggleProps): React.ReactElement {
  return (
    <div className="flex items-end">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-accent/20 border-accent text-accent'
            : 'bg-surface-raised/50 border-border-theme text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
        } `}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors duration-200 ${
            isActive ? 'bg-accent border-accent' : 'border-border-theme'
          } `}
        >
          {isActive && (
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
  );
}

export function EventTypesPicker({
  availableTypes,
  selectedTypes,
  onTypeToggle,
}: EventTypesPickerProps): React.ReactElement | null {
  if (availableTypes.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-text-theme-secondary block text-sm">
        Event Types
      </label>
      <div className="bg-surface-raised/30 border-border-theme-subtle flex flex-wrap gap-2 rounded-lg border p-3">
        {availableTypes.map((type) => (
          <EventTypeButton
            key={type}
            type={type}
            isSelected={selectedTypes.includes(type)}
            onToggle={onTypeToggle}
          />
        ))}
      </div>
    </div>
  );
}

function EventTypeButton({
  type,
  isSelected,
  onToggle,
}: {
  readonly type: string;
  readonly isSelected: boolean;
  readonly onToggle: (type: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onToggle(type)}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
        isSelected
          ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
          : 'bg-surface-raised/50 border-border-theme-subtle text-text-theme-secondary hover:border-border-theme hover:text-text-theme-primary'
      } `}
    >
      {formatEventType(type)}
    </button>
  );
}

export function ActiveFiltersList({
  activeFilters,
  onRemoveFilter,
}: ActiveFiltersListProps): React.ReactElement | null {
  if (activeFilters.length === 0) return null;

  return (
    <div className="bg-surface-raised/20 border-border-theme-subtle/50 flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <span className="text-text-theme-muted mr-1 text-xs">Active:</span>
      {activeFilters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          value={filter.value}
          variant={filter.variant}
          onRemove={() => onRemoveFilter(filter.onRemove)}
        />
      ))}
    </div>
  );
}

export function QueryBuilderActions({
  hasActiveFilters,
  isLoading,
  onClear,
}: QueryBuilderActionsProps): React.ReactElement {
  return (
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
        onClick={onClear}
        leftIcon={<ClearIcon />}
        disabled={!hasActiveFilters}
      >
        Clear All
      </Button>
    </div>
  );
}
