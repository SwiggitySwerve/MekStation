/**
 * Audit Timeline Page
 * Standalone event timeline browser for viewing all events.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useState, useCallback } from 'react';
import {
  PageLayout,
  Card,
} from '@/components/ui';
import { useEventTimeline } from '@/hooks/audit';
import {
  EventTimeline,
  TimelineFilters,
  TimelineSearch,
  TimelineDatePicker,
} from '@/components/audit/timeline';
import {
  QueryBuilder,
  ExportButton,
} from '@/components/audit/query';
import { IBaseEvent, EventCategory } from '@/types/events';

// =============================================================================
// Main Page Component
// =============================================================================

export default function AuditTimelinePage(): React.ReactElement {
  // Local state for UI
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAdvancedQuery, setShowAdvancedQuery] = useState(false);

  // Use the event timeline hook
  const {
    allEvents,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    loadMore,
    refresh,
    reset,
  } = useEventTimeline({
    pageSize: 50,
    infiniteScroll: true,
  });

  // Handlers
  const handleEventClick = useCallback((event: IBaseEvent) => {
    setSelectedEventId((prev) => (prev === event.id ? null : event.id));
  }, []);

  const handleSearchChange = useCallback(
    (searchQuery: string) => {
      setFilters({ ...filters, searchQuery: searchQuery || undefined });
    },
    [filters, setFilters]
  );

  const handleTimeRangeChange = useCallback(
    (timeRange: { from: string; to: string } | undefined) => {
      setFilters({ ...filters, timeRange });
    },
    [filters, setFilters]
  );

  const handleCategoryChange = useCallback(
    (category: EventCategory | undefined) => {
      setFilters({ ...filters, category });
    },
    [filters, setFilters]
  );

  const handleRootEventsToggle = useCallback(
    (rootEventsOnly: boolean) => {
      setFilters({ ...filters, rootEventsOnly: rootEventsOnly || undefined });
    },
    [filters, setFilters]
  );

  return (
    <PageLayout
      title="Event Timeline"
      subtitle="Browse and search all events"
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-3">
          <ExportButton events={allEvents} filename="event-timeline" />
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-surface-raised border border-border-theme-subtle hover:border-border-theme transition-colors disabled:opacity-50"
            aria-label="Refresh timeline"
          >
            <svg
              className={`w-5 h-5 text-text-theme-secondary ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      }
    >
      {/* Filters Section */}
      <Card className="mb-6">
        <div className="space-y-4">
          {/* Primary Filters Row */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[200px]">
              <TimelineSearch
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                placeholder="Search events..."
              />
            </div>
            <TimelineDatePicker
              timeRange={filters.timeRange}
              onChange={handleTimeRangeChange}
            />
            <button
              onClick={() => setShowAdvancedQuery(!showAdvancedQuery)}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                showAdvancedQuery
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-surface-raised border-border-theme-subtle text-text-theme-secondary hover:border-border-theme'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Advanced
              </span>
            </button>
          </div>

          {/* Category Filters */}
          <TimelineFilters
            filters={{
              category: filters.category,
              rootEventsOnly: filters.rootEventsOnly,
            }}
            onChange={(f) => {
              handleCategoryChange(f.category);
              handleRootEventsToggle(f.rootEventsOnly || false);
            }}
          />

          {/* Advanced Query Builder */}
          {showAdvancedQuery && (
            <div className="pt-4 border-t border-border-theme-subtle">
              <QueryBuilder
                filters={{
                  category: filters.category,
                  types: filters.types,
                  context: filters.context,
                  timeRange: filters.timeRange,
                  rootEventsOnly: filters.rootEventsOnly,
                }}
                onChange={(qf) => {
                  setFilters({
                    ...filters,
                    category: qf.category,
                    types: qf.types ? [...qf.types] : undefined,
                    context: qf.context,
                    timeRange: qf.timeRange,
                    rootEventsOnly: qf.rootEventsOnly,
                  });
                }}
                onSearch={() => {}}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Active Filters Summary */}
          {(filters.category ||
            filters.searchQuery ||
            filters.timeRange ||
            filters.rootEventsOnly) && (
            <div className="flex items-center gap-2 pt-2 border-t border-border-theme-subtle">
              <span className="text-sm text-text-theme-muted">Active:</span>
              <button
                onClick={reset}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-3 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error.message}</span>
          </div>
        </Card>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-text-theme-secondary">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Loading...
            </span>
          ) : (
            <span>
              <span className="font-medium text-text-theme-primary">{pagination.total}</span> events
              {pagination.total !== allEvents.length && (
                <span className="text-text-theme-muted">
                  {' '}
                  (showing {allEvents.length})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden">
        <EventTimeline
          events={allEvents}
          onEventClick={handleEventClick}
          onLoadMore={loadMore}
          hasMore={pagination.hasMore}
          isLoading={isLoading}
          selectedEventId={selectedEventId || undefined}
          maxHeight="calc(100vh - 400px)"
        />
      </Card>

      {/* Selected Event Details */}
      {selectedEventId && (
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-text-theme-primary mb-4">
            Event Details
          </h3>
          {(() => {
            const event = allEvents.find((e) => e.id === selectedEventId);
            if (!event) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-theme-muted">ID:</span>{' '}
                    <code className="text-text-theme-secondary">{event.id}</code>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Sequence:</span>{' '}
                    <span className="text-text-theme-primary font-medium">{event.sequence}</span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Category:</span>{' '}
                    <span className="text-text-theme-primary">{event.category}</span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Type:</span>{' '}
                    <span className="text-text-theme-primary">{event.type}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-theme-muted">Timestamp:</span>{' '}
                    <span className="text-text-theme-secondary">{event.timestamp}</span>
                  </div>
                </div>
                {event.causedBy && (
                  <div className="pt-3 border-t border-border-theme-subtle">
                    <span className="text-text-theme-muted">Caused by:</span>{' '}
                    <code className="text-cyan-400">{event.causedBy.eventId}</code>{' '}
                    <span className="text-text-theme-muted">({event.causedBy.relationship})</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border-theme-subtle">
                  <span className="text-text-theme-muted block mb-2">Payload:</span>
                  <pre className="text-xs bg-surface-base/50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </PageLayout>
  );
}
