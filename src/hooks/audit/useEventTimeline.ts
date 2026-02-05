/**
 * Event Timeline Hook
 * Provides paginated event loading with filtering capabilities.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { EventStoreService, getEventStore } from '@/services/events';
import {
  IBaseEvent,
  IEventQueryFilters,
  IEventQueryOptions,
  IEventQueryResult,
  EventCategory,
} from '@/types/events';

// =============================================================================
// Types
// =============================================================================

/**
 * Timeline filter options exposed to consumers.
 */
export interface ITimelineFilters {
  /** Filter by event category */
  category?: EventCategory;
  /** Filter by event type(s) */
  types?: string[];
  /** Filter by context fields */
  context?: {
    campaignId?: string;
    missionId?: string;
    gameId?: string;
    pilotId?: string;
    unitId?: string;
  };
  /** Filter by time range */
  timeRange?: {
    from: string;
    to: string;
  };
  /** Full-text search query */
  searchQuery?: string;
  /** Show only root events (no causedBy) */
  rootEventsOnly?: boolean;
}

/**
 * Pagination state for the timeline.
 */
export interface ITimelinePagination {
  /** Current page (0-indexed) */
  page: number;
  /** Events per page */
  pageSize: number;
  /** Total number of matching events */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more events to load */
  hasMore: boolean;
}

/**
 * Timeline hook state.
 */
export interface ITimelineState {
  /** Current events (current page) */
  events: readonly IBaseEvent[];
  /** All loaded events (for infinite scroll mode) */
  allEvents: readonly IBaseEvent[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filters */
  filters: ITimelineFilters;
  /** Pagination state */
  pagination: ITimelinePagination;
}

/**
 * Timeline hook actions.
 */
export interface ITimelineActions {
  /** Update filters and reload */
  setFilters: (filters: ITimelineFilters) => void;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Load next page (infinite scroll) */
  loadMore: () => void;
  /** Refresh current view */
  refresh: () => void;
  /** Reset filters and pagination */
  reset: () => void;
  /** Set page size */
  setPageSize: (size: number) => void;
}

/**
 * Return type for useEventTimeline hook.
 */
export type UseEventTimelineReturn = ITimelineState & ITimelineActions;

/**
 * Options for useEventTimeline hook.
 */
export interface IUseEventTimelineOptions {
  /** Initial filters */
  initialFilters?: ITimelineFilters;
  /** Initial page size */
  pageSize?: number;
  /** Use infinite scroll mode (accumulates events) */
  infiniteScroll?: boolean;
  /** Custom event store (for testing) */
  eventStore?: EventStoreService;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_FILTERS: ITimelineFilters = {};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert timeline filters to event store query filters.
 */
function toQueryFilters(filters: ITimelineFilters): IEventQueryFilters {
  return {
    category: filters.category,
    types:
      filters.types && filters.types.length > 0 ? filters.types : undefined,
    context: filters.context,
    timeRange: filters.timeRange,
    rootEventsOnly: filters.rootEventsOnly,
  };
}

/**
 * Apply full-text search filter to events.
 * Searches in event type, payload (stringified), and context values.
 */
function applySearchFilter(
  events: readonly IBaseEvent[],
  query: string,
): IBaseEvent[] {
  if (!query.trim()) {
    return [...events];
  }

  const lowerQuery = query.toLowerCase();

  return events.filter((event) => {
    // Search in type
    if (event.type.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in category
    if (event.category.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in payload (stringified)
    const payloadStr = JSON.stringify(event.payload).toLowerCase();
    if (payloadStr.includes(lowerQuery)) {
      return true;
    }

    // Search in context values
    const contextValues = Object.values(event.context).filter(Boolean);
    if (
      contextValues.some((v) => String(v).toLowerCase().includes(lowerQuery))
    ) {
      return true;
    }

    return false;
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for paginated event timeline with filtering.
 *
 * @example
 * ```tsx
 * const {
 *   events,
 *   isLoading,
 *   filters,
 *   pagination,
 *   setFilters,
 *   loadMore,
 * } = useEventTimeline({
 *   initialFilters: { category: EventCategory.Game },
 *   pageSize: 25,
 * });
 * ```
 */
export function useEventTimeline(
  options: IUseEventTimelineOptions = {},
): UseEventTimelineReturn {
  const {
    initialFilters = DEFAULT_FILTERS,
    pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
    infiniteScroll = false,
    eventStore = getEventStore(),
    autoRefreshInterval = 0,
  } = options;

  // State
  const [events, setEvents] = useState<readonly IBaseEvent[]>([]);
  const [allEvents, setAllEvents] = useState<readonly IBaseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<ITimelineFilters>(initialFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  // Refs for cleanup
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate pagination state
  const pagination: ITimelinePagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: (page + 1) * pageSize < total,
    }),
    [page, pageSize, total],
  );

  // Load events based on current state
  const loadEvents = useCallback(
    async (
      currentFilters: ITimelineFilters,
      currentPage: number,
      currentPageSize: number,
      appendMode: boolean = false,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query options
        const queryOptions: IEventQueryOptions = {
          filters: toQueryFilters(currentFilters),
          pagination: {
            offset: currentPage * currentPageSize,
            limit: currentPageSize,
          },
          sort: {
            field: 'sequence',
            direction: 'desc', // Most recent first
          },
        };

        // Query the event store
        let result: IEventQueryResult<IBaseEvent> =
          eventStore.query(queryOptions);

        // Apply full-text search if present (post-filter)
        if (currentFilters.searchQuery) {
          const filteredEvents = applySearchFilter(
            result.events,
            currentFilters.searchQuery,
          );
          result = {
            ...result,
            events: filteredEvents,
            total: filteredEvents.length,
            hasMore: false, // Search disables server-side pagination
          };
        }

        // Update state
        if (appendMode && infiniteScroll) {
          // Append mode: add new events to accumulated list
          setAllEvents((prev) => [...prev, ...result.events]);
        } else if (infiniteScroll) {
          // Initial load in infinite scroll: start fresh accumulation
          setAllEvents(result.events);
        } else {
          // Non-infinite scroll: allEvents mirrors current page
          setAllEvents(result.events);
        }
        setEvents(result.events);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setEvents([]);
        setAllEvents([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [eventStore, infiniteScroll],
  );

  // Initial load and filter changes
  useEffect(() => {
    // Reset pagination state first
    setPage(0);
    // Note: allEvents will be set by loadEvents based on infiniteScroll mode
    loadEvents(filters, 0, pageSize, false);
  }, [filters, pageSize, loadEvents]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      autoRefreshRef.current = setInterval(() => {
        loadEvents(filters, page, pageSize, false);
      }, autoRefreshInterval);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefreshInterval, filters, page, pageSize, loadEvents]);

  // Actions
  const setFilters = useCallback((newFilters: ITimelineFilters) => {
    setFiltersState(newFilters);
    setPage(0);
    setAllEvents([]);
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
      const clampedPage = Math.max(0, Math.min(newPage, maxPage));
      setPage(clampedPage);
      loadEvents(filters, clampedPage, pageSize, false);
    },
    [filters, pageSize, total, loadEvents],
  );

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadEvents(filters, nextPage, pageSize, true);
  }, [filters, page, pageSize, pagination.hasMore, isLoading, loadEvents]);

  const refresh = useCallback(() => {
    loadEvents(filters, page, pageSize, false);
  }, [filters, page, pageSize, loadEvents]);

  const reset = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(0);
    setPageSizeState(initialPageSize);
    setAllEvents([]);
  }, [initialPageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(Math.max(1, size));
    setPage(0);
    setAllEvents([]);
  }, []);

  return {
    events,
    allEvents: infiniteScroll ? allEvents : events,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    goToPage,
    loadMore,
    refresh,
    reset,
    setPageSize,
  };
}

// =============================================================================
// Specialized Timeline Hooks
// =============================================================================

/**
 * Hook for game event timeline (filtered to Game category).
 */
export function useGameTimeline(
  gameId: string,
  options: Omit<IUseEventTimelineOptions, 'initialFilters'> = {},
): UseEventTimelineReturn {
  return useEventTimeline({
    ...options,
    initialFilters: {
      category: EventCategory.Game,
      context: { gameId },
    },
  });
}

/**
 * Hook for pilot event timeline (filtered to Pilot category).
 */
export function usePilotTimeline(
  pilotId: string,
  options: Omit<IUseEventTimelineOptions, 'initialFilters'> = {},
): UseEventTimelineReturn {
  return useEventTimeline({
    ...options,
    initialFilters: {
      context: { pilotId },
    },
  });
}

/**
 * Hook for campaign event timeline (filtered to Campaign category).
 */
export function useCampaignTimeline(
  campaignId: string,
  options: Omit<IUseEventTimelineOptions, 'initialFilters'> = {},
): UseEventTimelineReturn {
  return useEventTimeline({
    ...options,
    initialFilters: {
      context: { campaignId },
    },
  });
}

/**
 * Hook for unit instance event timeline.
 * Filters events by unit instance ID (stored in context.unitId).
 *
 * @param unitInstanceId - The campaign unit instance ID
 * @param options - Additional timeline options
 */
export function useUnitInstanceTimeline(
  unitInstanceId: string,
  options: Omit<IUseEventTimelineOptions, 'initialFilters'> = {},
): UseEventTimelineReturn {
  return useEventTimeline({
    ...options,
    initialFilters: {
      context: { unitId: unitInstanceId },
    },
  });
}

/**
 * Hook for pilot instance event timeline.
 * Filters events by pilot instance ID (stored in context.pilotId).
 *
 * @param pilotInstanceId - The campaign pilot instance ID
 * @param options - Additional timeline options
 */
export function usePilotInstanceTimeline(
  pilotInstanceId: string,
  options: Omit<IUseEventTimelineOptions, 'initialFilters'> = {},
): UseEventTimelineReturn {
  return useEventTimeline({
    ...options,
    initialFilters: {
      context: { pilotId: pilotInstanceId },
    },
  });
}
