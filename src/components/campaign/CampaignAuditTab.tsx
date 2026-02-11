import { useState, useCallback } from 'react';

import { EventTimeline, TimelineFilters } from '@/components/audit/timeline';
import { Card } from '@/components/ui';
import { useCampaignTimeline } from '@/hooks/audit';
import { IBaseEvent, EventCategory } from '@/types/events';

export interface CampaignAuditTabProps {
  campaignId: string;
  campaignName: string;
}

export function CampaignAuditTab({
  campaignId,
  campaignName,
}: CampaignAuditTabProps): React.ReactElement {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    EventCategory | undefined
  >(undefined);
  const [rootEventsOnly, setRootEventsOnly] = useState(false);

  const {
    allEvents,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    loadMore,
    refresh,
  } = useCampaignTimeline(campaignId, {
    pageSize: 50,
    infiniteScroll: true,
  });

  const handleEventClick = useCallback((event: IBaseEvent) => {
    setSelectedEventId((prev) => (prev === event.id ? null : event.id));
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters: { category?: EventCategory; rootEventsOnly?: boolean }) => {
      setCategoryFilter(newFilters.category);
      setRootEventsOnly(newFilters.rootEventsOnly || false);
      setFilters({
        ...filters,
        category: newFilters.category,
        rootEventsOnly: newFilters.rootEventsOnly || undefined,
      });
    },
    [filters, setFilters],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Campaign Timeline
          </h2>
          <p className="text-text-theme-secondary text-sm">
            Event history for {campaignName}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="bg-surface-raised border-border-theme-subtle hover:border-border-theme rounded-lg border p-2 transition-colors disabled:opacity-50"
          aria-label="Refresh timeline"
        >
          <svg
            className={`text-text-theme-secondary h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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

      <Card className="p-4">
        <TimelineFilters
          filters={{
            category: categoryFilter,
            rootEventsOnly,
          }}
          onChange={handleFiltersChange}
        />
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <div
            className="flex items-center gap-3 p-4 text-red-400"
            role="alert"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
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

      <div className="text-text-theme-secondary text-sm" aria-live="polite">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            Loading...
          </span>
        ) : (
          <span>
            <span className="text-text-theme-primary font-medium">
              {pagination.total}
            </span>{' '}
            events
          </span>
        )}
      </div>

      {!isLoading && allEvents.length === 0 && (
        <Card className="p-8 text-center">
          <div className="bg-surface-raised/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-text-theme-muted h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
            No Events Yet
          </h3>
          <p className="text-text-theme-secondary mx-auto max-w-md text-sm">
            This campaign has no recorded events. Events will appear here as
            missions are completed.
          </p>
        </Card>
      )}

      {allEvents.length > 0 && (
        <Card className="overflow-hidden p-0">
          <EventTimeline
            events={allEvents as IBaseEvent[]}
            onEventClick={handleEventClick}
            onLoadMore={loadMore}
            hasMore={pagination.hasMore}
            isLoading={isLoading}
            selectedEventId={selectedEventId || undefined}
            maxHeight="calc(100vh - 400px)"
          />
        </Card>
      )}

      {selectedEventId && (
        <Card>
          <h3 className="text-text-theme-primary mb-4 text-lg font-semibold">
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
                    <code className="text-text-theme-secondary">
                      {event.id}
                    </code>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Sequence:</span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {event.sequence}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Category:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Type:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.type}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-theme-muted">Timestamp:</span>{' '}
                    <span className="text-text-theme-secondary">
                      {event.timestamp}
                    </span>
                  </div>
                </div>
                {event.causedBy && (
                  <div className="border-border-theme-subtle border-t pt-3">
                    <span className="text-text-theme-muted">Caused by:</span>{' '}
                    <code className="text-cyan-400">
                      {event.causedBy.eventId}
                    </code>{' '}
                    <span className="text-text-theme-muted">
                      ({event.causedBy.relationship})
                    </span>
                  </div>
                )}
                <div className="border-border-theme-subtle border-t pt-3">
                  <span className="text-text-theme-muted mb-2 block">
                    Payload:
                  </span>
                  <pre className="bg-surface-base/50 overflow-x-auto rounded-lg p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
