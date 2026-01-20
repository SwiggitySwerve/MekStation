/**
 * Event Query Interfaces
 * Types for querying and filtering events.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { EventCategory, IEventContext } from './BaseEventInterfaces';
import { ISequenceRange, ITimeRange } from './ChunkInterfaces';

// =============================================================================
// Query Filters
// =============================================================================

/**
 * Filters for querying events.
 * All fields are optional - combine as needed.
 */
export interface IEventQueryFilters {
  /** Filter by event category */
  readonly category?: EventCategory;
  /** Filter by event type(s) */
  readonly types?: readonly string[];
  /** Filter by context (partial match) */
  readonly context?: Partial<IEventContext>;
  /** Filter by sequence range */
  readonly sequenceRange?: ISequenceRange;
  /** Filter by time range */
  readonly timeRange?: ITimeRange;
  /** Filter by causedBy event ID */
  readonly causedByEventId?: string;
  /** Filter to only root events (no causedBy) */
  readonly rootEventsOnly?: boolean;
}

/**
 * Pagination options for queries.
 */
export interface IQueryPagination {
  /** Number of events to skip */
  readonly offset?: number;
  /** Maximum number of events to return */
  readonly limit?: number;
}

/**
 * Sort options for queries.
 */
export interface IQuerySort {
  /** Field to sort by */
  readonly field: 'sequence' | 'timestamp';
  /** Sort direction */
  readonly direction: 'asc' | 'desc';
}

/**
 * Complete query options.
 */
export interface IEventQueryOptions {
  /** Filters to apply */
  readonly filters?: IEventQueryFilters;
  /** Pagination options */
  readonly pagination?: IQueryPagination;
  /** Sort options */
  readonly sort?: IQuerySort;
}

// =============================================================================
// Query Results
// =============================================================================

/**
 * Result of an event query.
 */
export interface IEventQueryResult<T = unknown> {
  /** Events matching the query */
  readonly events: readonly T[];
  /** Total number of matching events (before pagination) */
  readonly total: number;
  /** Whether there are more events to load */
  readonly hasMore: boolean;
  /** Offset used for this query */
  readonly offset: number;
  /** Limit used for this query */
  readonly limit: number;
}
