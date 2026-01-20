/**
 * QueryResults Component
 * Displays search results with event list, loading state, and empty state.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';
import { type IBaseEvent } from '@/types/events';
import { EventTimelineItem } from '@/components/audit/timeline';

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
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const EmptyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="
            p-4 rounded-lg border-l-4
            bg-surface-base/40 border-border-theme-subtle/50
          "
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-surface-raised/50" />
              <div className="w-24 h-5 rounded-full bg-surface-raised/50" />
            </div>
            <div className="w-32 h-4 rounded bg-surface-raised/30" />
          </div>
          {/* Content */}
          <div className="w-48 h-4 rounded bg-surface-raised/30" />
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
    <div className="flex flex-col items-center justify-center py-16 text-text-theme-muted">
      {hasSearched ? (
        <>
          <EmptyIcon />
          <h3 className="mt-4 text-lg font-medium text-text-theme-secondary">
            No events found
          </h3>
          <p className="mt-1 text-sm text-center max-w-sm">
            Try adjusting your filters or search criteria to find what you&apos;re looking for.
          </p>
        </>
      ) : (
        <>
          <SearchIcon />
          <h3 className="mt-4 text-lg font-medium text-text-theme-secondary">
            Search for events
          </h3>
          <p className="mt-1 text-sm text-center max-w-sm">
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

function ResultsHeader({ total, displayed }: ResultsHeaderProps): React.ReactElement {
  return (
    <div className="
      flex items-center justify-between px-4 py-3
      bg-surface-raised/30 border border-border-theme-subtle rounded-lg
      mb-4
    ">
      <div className="flex items-center gap-3">
        <span className="
          text-2xl font-bold text-text-theme-primary
          tabular-nums tracking-tight
        ">
          {total.toLocaleString()}
        </span>
        <span className="text-sm text-text-theme-secondary">
          event{total !== 1 ? 's' : ''} found
        </span>
      </div>
      {displayed < total && (
        <span className="text-xs text-text-theme-muted">
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
          <div className="
            flex items-center gap-3 px-4 py-3 mb-4
            bg-surface-raised/30 border border-border-theme-subtle rounded-lg
          ">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-text-theme-secondary">
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
