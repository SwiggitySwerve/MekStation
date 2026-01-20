/**
 * TimelineFilters Component
 * Filter controls for event category, types, and root-events-only toggle.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useCallback } from 'react';
import { EventCategory } from '@/types/events';
import { ITimelineFilters } from '@/hooks/audit';
import { Button } from '@/components/ui/Button';

// =============================================================================
// Types
// =============================================================================

export interface TimelineFiltersProps {
  /** Current filter state */
  filters: ITimelineFilters;
  /** Callback when filters change */
  onChange: (filters: ITimelineFilters) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Category Configuration
// =============================================================================

type CategoryOption = {
  value: EventCategory | undefined;
  label: string;
  shortLabel: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: undefined, label: 'All Categories', shortLabel: 'All' },
  { value: EventCategory.Game, label: 'Game Events', shortLabel: 'Game' },
  { value: EventCategory.Campaign, label: 'Campaign Events', shortLabel: 'Campaign' },
  { value: EventCategory.Pilot, label: 'Pilot Events', shortLabel: 'Pilot' },
  { value: EventCategory.Repair, label: 'Repair Events', shortLabel: 'Repair' },
  { value: EventCategory.Award, label: 'Award Events', shortLabel: 'Award' },
  { value: EventCategory.Meta, label: 'Meta Events', shortLabel: 'Meta' },
];

// Category color mapping for button styling
const CATEGORY_COLORS: Record<string, string> = {
  [EventCategory.Game]: 'hover:border-amber-500/50 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-400',
  [EventCategory.Campaign]: 'hover:border-cyan-500/50 data-[active=true]:border-cyan-500 data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-400',
  [EventCategory.Pilot]: 'hover:border-emerald-500/50 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-400',
  [EventCategory.Repair]: 'hover:border-violet-500/50 data-[active=true]:border-violet-500 data-[active=true]:bg-violet-500/10 data-[active=true]:text-violet-400',
  [EventCategory.Award]: 'hover:border-rose-500/50 data-[active=true]:border-rose-500 data-[active=true]:bg-rose-500/10 data-[active=true]:text-rose-400',
  [EventCategory.Meta]: 'hover:border-slate-500/50 data-[active=true]:border-slate-500 data-[active=true]:bg-slate-500/10 data-[active=true]:text-slate-400',
};

// =============================================================================
// Component
// =============================================================================

export function TimelineFilters({
  filters,
  onChange,
  className = '',
}: TimelineFiltersProps): React.ReactElement {
  // Handle category selection
  const handleCategoryChange = useCallback(
    (category: EventCategory | undefined) => {
      onChange({
        ...filters,
        category,
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category Filter - Button Group */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-theme-secondary">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((option) => {
            const isActive = filters.category === option.value;
            const colorClass = option.value ? CATEGORY_COLORS[option.value] : '';
            
            return (
              <button
                key={option.value ?? 'all'}
                type="button"
                data-active={isActive}
                onClick={() => handleCategoryChange(option.value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200
                  ${isActive && !option.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary'
                  }
                  ${colorClass}
                `}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Root Events Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={filters.rootEventsOnly ?? false}
          onClick={handleRootEventsToggle}
          className={`
            relative w-10 h-5 rounded-full transition-colors duration-200
            ${filters.rootEventsOnly 
              ? 'bg-accent' 
              : 'bg-surface-raised border border-border-theme'
            }
          `}
        >
          <span
            className={`
              absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200
              ${filters.rootEventsOnly 
                ? 'translate-x-5 bg-surface-deep' 
                : 'translate-x-0.5 bg-text-theme-muted'
              }
            `}
          />
        </button>
        <label className="text-sm text-text-theme-secondary select-none cursor-pointer" onClick={handleRootEventsToggle}>
          Root events only
          <span className="block text-xs text-text-theme-muted">
            Hide events triggered by other events
          </span>
        </label>
      </div>

      {/* Active Filters Summary */}
      {(filters.category || filters.rootEventsOnly) && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-theme-subtle/30">
          <span className="text-xs text-text-theme-muted">Active:</span>
          {filters.category && (
            <span className="inline-flex items-center gap-1 text-xs bg-surface-raised/50 px-2 py-0.5 rounded-full text-text-theme-secondary">
              {CATEGORY_OPTIONS.find(o => o.value === filters.category)?.label}
              <button
                type="button"
                onClick={() => handleCategoryChange(undefined)}
                className="hover:text-text-theme-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {filters.rootEventsOnly && (
            <span className="inline-flex items-center gap-1 text-xs bg-surface-raised/50 px-2 py-0.5 rounded-full text-text-theme-secondary">
              Root only
              <button
                type="button"
                onClick={handleRootEventsToggle}
                className="hover:text-text-theme-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...filters, category: undefined, rootEventsOnly: false })}
            className="ml-auto text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

export default TimelineFilters;
