/**
 * QueryResults Component
 * Displays search results with event list, loading state, and empty state.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';

import { EventTimelineItem } from '@/components/audit/timeline';
import { type IBaseEvent } from '@/types/events';

// =============================================================================
// Types
// =============================================================================

export interface QueryResultsProps {
  /** Events to display */
  events: IBaseEvent[];
  /** Total count (may differ from events.length if paginated) */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Click handler for an event */
  onEventClick?: (event: IBaseEvent) => void;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-12 w-12"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

const EmptyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-12 w-12"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
    />
  </svg>
);

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-surface-base/40 border-border-theme-subtle/50 rounded-lg border-l-4 p-4"
        >
          {/* Header Row */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-surface-raised/50 h-7 w-7 rounded-lg" />
              <div className="bg-surface-raised/50 h-5 w-24 rounded-full" />
            </div>
            <div className="bg-surface-raised/30 h-4 w-32 rounded" />
          </div>
          {/* Content */}
          <div className="bg-surface-raised/30 h-4 w-48 rounded" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  hasSearched: boolean;
}

function EmptyState({ hasSearched }: EmptyStateProps): React.ReactElement {
  return (
    <div className="text-text-theme-muted flex flex-col items-center justify-center py-16">
      {hasSearched ? (
        <>
          <EmptyIcon />
          <h3 className="text-text-theme-secondary mt-4 text-lg font-medium">
            No events found
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm">
            Try adjusting your filters or search criteria to find what
            you&apos;re looking for.
          </p>
        </>
      ) : (
        <>
          <SearchIcon />
          <h3 className="text-text-theme-secondary mt-4 text-lg font-medium">
            Search for events
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm">
            Use the query builder above to search through your event history.
          </p>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Results Header
// =============================================================================

interface ResultsHeaderProps {
  total: number;
  displayed: number;
}

function ResultsHeader({
  total,
  displayed,
}: ResultsHeaderProps): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 border-border-theme-subtle mb-4 flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-text-theme-primary text-2xl font-bold tracking-tight tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="text-text-theme-secondary text-sm">
          event{total !== 1 ? 's' : ''} found
        </span>
      </div>
      {displayed < total && (
        <span className="text-text-theme-muted text-xs">
          Showing {displayed.toLocaleString()} of {total.toLocaleString()}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function QueryResults({
  events,
  total,
  isLoading,
  onEventClick,
  className = '',
}: QueryResultsProps): React.ReactElement {
  // Determine state
  const hasSearched = total > 0 || events.length > 0;
  const showEmpty = !isLoading && events.length === 0;
  const showResults = !isLoading && events.length > 0;

  return (
    <div className={className}>
      {/* Loading State */}
      {isLoading && (
        <div>
          <div className="bg-surface-raised/30 border-border-theme-subtle mb-4 flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="border-accent/30 border-t-accent h-6 w-6 animate-spin rounded-full border-2" />
            <span className="text-text-theme-secondary text-sm">
              Searching events...
            </span>
          </div>
          <LoadingSkeleton />
        </div>
      )}

      {/* Empty State */}
      {showEmpty && <EmptyState hasSearched={hasSearched} />}

      {/* Results */}
      {showResults && (
        <>
          <ResultsHeader total={total} displayed={events.length} />
          <div className="space-y-2">
            {events.map((event) => (
              <EventTimelineItem
                key={event.id}
                event={event}
                onClick={onEventClick ? () => onEventClick(event) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default QueryResults;
