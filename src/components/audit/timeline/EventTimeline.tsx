/**
 * EventTimeline Component
 * Virtualized list of timeline events with infinite scroll support.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useRef, useCallback, useEffect } from 'react';

import { IBaseEvent } from '@/types/events';

import { EventTimelineItem } from './EventTimelineItem';

// =============================================================================
// Types
// =============================================================================

export interface EventTimelineProps {
  /** Array of events to display */
  events: readonly IBaseEvent[];
  /** Click handler for individual events */
  onEventClick?: (event: IBaseEvent) => void;
  /** Callback when user scrolls near the bottom (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether there are more events to load */
  hasMore?: boolean;
  /** Whether currently loading more events */
  isLoading?: boolean;
  /** Currently selected event ID */
  selectedEventId?: string;
  /** Custom class name */
  className?: string;
  /** Maximum height of the timeline container */
  maxHeight?: string;
}

// =============================================================================
// Loading Spinner
// =============================================================================

function LoadingSpinner(): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <svg
        className="text-accent h-5 w-5 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-text-theme-secondary text-sm">
        Loading more events...
      </span>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="bg-surface-raised/50 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="text-text-theme-muted h-8 w-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <h3 className="text-text-theme-primary mb-1 text-lg font-medium">
        No events found
      </h3>
      <p className="text-text-theme-muted max-w-xs text-sm">
        Try adjusting your filters or check back later for new events.
      </p>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function EventTimeline({
  events,
  onEventClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  selectedEventId,
  className = '',
  maxHeight = '600px',
}: EventTimelineProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px', // Trigger 100px before reaching the end
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, hasMore, isLoading]);

  // Handle event click
  const handleEventClick = useCallback(
    (event: IBaseEvent) => {
      onEventClick?.(event);
    },
    [onEventClick],
  );

  // Empty state
  if (events.length === 0 && !isLoading) {
    return (
      <div
        className={`bg-surface-base/30 border-border-theme-subtle rounded-xl border ${className}`}
      >
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-surface-base/30 border-border-theme-subtle scrollbar-thin scrollbar-thumb-border-theme scrollbar-track-transparent relative overflow-x-hidden overflow-y-auto rounded-xl border ${className} `}
      style={{ maxHeight }}
    >
      {/* Timeline Track */}
      <div className="from-border-theme via-border-theme-subtle pointer-events-none absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b to-transparent" />

      {/* Events List */}
      <div className="relative space-y-3 p-4">
        {events.map((event) => (
          <div key={event.id} className="relative pl-6">
            {/* Timeline Dot */}
            <div className="bg-surface-raised border-border-theme absolute top-4 left-0 z-10 h-3 w-3 rounded-full border-2" />

            <EventTimelineItem
              event={event}
              onClick={() => handleEventClick(event)}
              isSelected={selectedEventId === event.id}
            />
          </div>
        ))}

        {/* Loading indicator at bottom */}
        {isLoading && <LoadingSpinner />}

        {/* Sentinel element for intersection observer */}
        {hasMore && !isLoading && (
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        )}

        {/* End of list indicator */}
        {!hasMore && events.length > 0 && !isLoading && (
          <div className="py-4 text-center">
            <span className="text-text-theme-muted bg-surface-raised/50 rounded-full px-3 py-1.5 text-xs">
              End of timeline
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventTimeline;
