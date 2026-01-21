/**
 * Events Types Index
 * Re-exports all event-related types.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

// Base event types
export {
  EventCategory,
  type IEventContext,
  type ICausedBy,
  type IBaseEvent,
  type ICreateEventParams,
  type SequenceProvider,
  isBaseEvent,
  isEventCategory,
  isCausedBy,
  isEventContext,
  createEventContext,
} from './BaseEventInterfaces';

// Chunk and checkpoint types
export {
  type ISequenceRange,
  type ITimeRange,
  type IChunkSummary,
  type IEventChunk,
  type ICheckpoint,
  type ICampaignManifest,
  type ICreateChunkSummaryParams,
  type ICreateChunkParams,
  type ICreateCheckpointParams,
  isSequenceRange,
  isEventChunk,
  isCheckpoint,
} from './ChunkInterfaces';

// Query types
export {
  type IEventQueryFilters,
  type IQueryPagination,
  type IQuerySort,
  type IEventQueryOptions,
  type IEventQueryResult,
} from './QueryInterfaces';
