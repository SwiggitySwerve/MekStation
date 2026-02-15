import React from 'react';

import type { IEventQueryFilters, IEventContext } from '@/types/events';

import { Input } from '@/components/ui/Input';

import { ChevronDownIcon, ChevronUpIcon } from './QueryBuilderIcons';

interface QueryBuilderAdvancedFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: IEventQueryFilters;
  onChange: (filters: IEventQueryFilters) => void;
  onContextChange: (field: keyof IEventContext, value: string) => void;
  onSequenceRangeChange: (field: 'from' | 'to', value: string) => void;
}

export function QueryBuilderAdvancedFilters({
  isOpen,
  onToggle,
  filters,
  onChange,
  onContextChange,
  onSequenceRangeChange,
}: QueryBuilderAdvancedFiltersProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="bg-surface-raised/30 text-text-theme-secondary hover:text-text-theme-primary flex w-full items-center justify-between px-4 py-3 transition-colors duration-150"
      >
        <span className="text-sm font-medium">Advanced Filters</span>
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>

      {isOpen && (
        <div className="border-border-theme-subtle bg-surface-base/20 space-y-4 border-t p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Campaign ID"
              placeholder="Enter campaign ID..."
              value={filters.context?.campaignId || ''}
              onChange={(e) => onContextChange('campaignId', e.target.value)}
            />
            <Input
              label="Game ID"
              placeholder="Enter game ID..."
              value={filters.context?.gameId || ''}
              onChange={(e) => onContextChange('gameId', e.target.value)}
            />
            <Input
              label="Pilot ID"
              placeholder="Enter pilot ID..."
              value={filters.context?.pilotId || ''}
              onChange={(e) => onContextChange('pilotId', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Sequence From"
              placeholder="Start sequence..."
              value={filters.sequenceRange?.from?.toString() || ''}
              onChange={(e) => onSequenceRangeChange('from', e.target.value)}
              min={0}
            />
            <Input
              type="number"
              label="Sequence To"
              placeholder="End sequence..."
              value={filters.sequenceRange?.to?.toString() || ''}
              onChange={(e) => onSequenceRangeChange('to', e.target.value)}
              min={0}
            />
          </div>

          <Input
            label="Caused By Event ID"
            placeholder="Filter by parent event ID..."
            value={filters.causedByEventId || ''}
            onChange={(e) =>
              onChange({
                ...filters,
                causedByEventId: e.target.value || undefined,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
