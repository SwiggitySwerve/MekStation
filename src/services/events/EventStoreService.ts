/**
 * Event Store Service
 * In-memory event storage with query capabilities.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import {
  IBaseEvent,
  IEventQueryFilters,
  IEventQueryOptions,
  IEventQueryResult,
  EventCategory,
} from '@/types/events';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

// =============================================================================
// Event Store Service
// =============================================================================

/**
 * In-memory event store implementation.
 * Provides append-only storage with query capabilities.
 */
export class EventStoreService {
  private events: IBaseEvent[] = [];
  private latestSequence = 0;

  // ===========================================================================
  // Append Operations
  // ===========================================================================

  /**
   * Append a single event to the store.
   * @throws Error if event sequence is not greater than latest
   */
  append(event: IBaseEvent): void {
    if (event.sequence <= this.latestSequence) {
      throw new Error(
        `Event sequence ${event.sequence} must be greater than latest sequence ${this.latestSequence}`,
      );
    }
    this.events.push(event);
    this.latestSequence = event.sequence;
  }

  /**
   * Append multiple events atomically.
   * @throws Error if any event sequence is out of order
   */
  appendBatch(events: readonly IBaseEvent[]): void {
    if (events.length === 0) return;

    // Sort by sequence to ensure correct order
    const sorted = [...events].sort((a, b) => a.sequence - b.sequence);

    // Validate sequence order
    let expectedNext = this.latestSequence + 1;
    for (const event of sorted) {
      if (event.sequence < expectedNext) {
        throw new Error(
          `Event sequence ${event.sequence} is less than expected ${expectedNext}`,
        );
      }
      expectedNext = event.sequence + 1;
    }

    // Append all events
    this.events.push(...sorted);
    this.latestSequence = sorted[sorted.length - 1].sequence;
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Query events with filters and pagination.
   */
  query(options: IEventQueryOptions = {}): IEventQueryResult<IBaseEvent> {
    const { filters, pagination, sort } = options;

    // Apply filters
    let filtered = this.applyFilters(this.events, filters);

    // Apply sorting
    if (sort) {
      filtered = this.applySort(filtered, sort.field, sort.direction);
    }

    // Get total before pagination
    const total = filtered.length;

    // Apply pagination
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      events: paginated,
      total,
      hasMore: offset + limit < total,
      offset,
      limit,
    };
  }

  /**
   * Get events in a sequence range (inclusive).
   */
  getEventsInRange(from: number, to: number): readonly IBaseEvent[] {
    return this.events.filter((e) => e.sequence >= from && e.sequence <= to);
  }

  /**
   * Get the latest sequence number.
   */
  getLatestSequence(): number {
    return this.latestSequence;
  }

  /**
   * Get total event count.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get all events (readonly).
   */
  getAllEvents(): readonly IBaseEvent[] {
    return this.events;
  }

  /**
   * Get a single event by ID.
   */
  getEventById(id: string): IBaseEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  /**
   * Get events caused by a specific event.
   */
  getEventsCausedBy(eventId: string): readonly IBaseEvent[] {
    return this.events.filter((e) => e.causedBy?.eventId === eventId);
  }

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  /**
   * Apply filters to events.
   */
  private applyFilters(
    events: readonly IBaseEvent[],
    filters?: IEventQueryFilters,
  ): IBaseEvent[] {
    if (!filters) return [...events];

    let result = [...events];

    // Filter by category
    if (filters.category !== undefined) {
      result = result.filter((e) => e.category === filters.category);
    }

    // Filter by types
    if (filters.types && filters.types.length > 0) {
      result = result.filter((e) => filters.types!.includes(e.type));
    }

    // Filter by context
    if (filters.context) {
      result = result.filter((e) => this.matchContext(e, filters.context!));
    }

    // Filter by sequence range
    if (filters.sequenceRange) {
      const { from, to } = filters.sequenceRange;
      result = result.filter((e) => e.sequence >= from && e.sequence <= to);
    }

    // Filter by time range
    if (filters.timeRange) {
      const { from, to } = filters.timeRange;
      result = result.filter((e) => e.timestamp >= from && e.timestamp <= to);
    }

    // Filter by causedBy event
    if (filters.causedByEventId) {
      result = result.filter(
        (e) => e.causedBy?.eventId === filters.causedByEventId,
      );
    }

    // Filter to root events only
    if (filters.rootEventsOnly) {
      result = result.filter((e) => !e.causedBy);
    }

    return result;
  }

  /**
   * Check if an event matches a partial context.
   */
  private matchContext(
    event: IBaseEvent,
    context: Partial<typeof event.context>,
  ): boolean {
    for (const [key, value] of Object.entries(context)) {
      if (
        value !== undefined &&
        event.context[key as keyof typeof event.context] !== value
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Apply sorting to events.
   */
  private applySort(
    events: IBaseEvent[],
    field: 'sequence' | 'timestamp',
    direction: 'asc' | 'desc',
  ): IBaseEvent[] {
    const sorted = [...events];
    const multiplier = direction === 'asc' ? 1 : -1;

    if (field === 'sequence') {
      sorted.sort((a, b) => (a.sequence - b.sequence) * multiplier);
    } else {
      sorted.sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp) * multiplier,
      );
    }

    return sorted;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Clear all events (for testing).
   */
  clear(): void {
    this.events = [];
    this.latestSequence = 0;
  }

  /**
   * Get events by category.
   */
  getEventsByCategory(category: EventCategory): readonly IBaseEvent[] {
    return this.events.filter((e) => e.category === category);
  }

  /**
   * Get the last N events.
   */
  getRecentEvents(count: number): readonly IBaseEvent[] {
    return this.events.slice(-count);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

const eventStoreFactory: SingletonFactory<EventStoreService> = createSingleton(
  (): EventStoreService => new EventStoreService(),
);

/**
 * Get the default event store instance.
 */
export function getEventStore(): EventStoreService {
  return eventStoreFactory.get();
}

/**
 * Reset the default event store (for testing).
 */
export function resetEventStore(): void {
  eventStoreFactory.reset();
}
