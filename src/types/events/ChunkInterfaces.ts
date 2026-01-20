/**
 * Chunk and Checkpoint Interfaces
 * Types for chunked event storage and checkpoints.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { IBaseEvent } from './BaseEventInterfaces';

// =============================================================================
// Sequence Range
// =============================================================================

/**
 * A range of sequence numbers (inclusive).
 */
export interface ISequenceRange {
  /** First sequence number (inclusive) */
  readonly from: number;
  /** Last sequence number (inclusive) */
  readonly to: number;
}

/**
 * A time range for filtering events.
 */
export interface ITimeRange {
  /** Start timestamp (inclusive) */
  readonly from: string;
  /** End timestamp (inclusive) */
  readonly to: string;
}

// =============================================================================
// Chunk Summary
// =============================================================================

/**
 * Summary of events in a chunk.
 * Used for quick filtering without loading full chunk.
 */
export interface IChunkSummary {
  /** Total number of events in chunk */
  readonly eventCount: number;
  /** Map of event type to count */
  readonly eventTypes: Record<string, number>;
  /** Unit IDs involved in this chunk */
  readonly unitsInvolved: readonly string[];
  /** Pilot IDs involved in this chunk */
  readonly pilotsInvolved: readonly string[];
  /** Outcome summary (if applicable) */
  readonly outcome?: {
    readonly type: 'victory' | 'defeat' | 'draw' | 'incomplete';
    readonly reason?: string;
  };
}

// =============================================================================
// Event Chunk
// =============================================================================

/**
 * A chunk of events, typically aligned to mission boundaries.
 */
export interface IEventChunk {
  /** Unique chunk ID */
  readonly chunkId: string;
  /** Campaign this chunk belongs to (if any) */
  readonly campaignId?: string;
  /** Sequence range of events in this chunk */
  readonly sequenceRange: ISequenceRange;
  /** Time range of events in this chunk */
  readonly timeRange: ITimeRange;
  /** Events in this chunk */
  readonly events: readonly IBaseEvent[];
  /** Summary of chunk contents */
  readonly summary: IChunkSummary;
  /** SHA-256 hash of the chunk contents */
  readonly hash: string;
  /** Hash of the previous chunk (for chain verification) */
  readonly previousHash: string | null;
}

// =============================================================================
// Checkpoint
// =============================================================================

/**
 * A checkpoint containing derived state at a specific sequence.
 * Used for fast state reconstruction.
 */
export interface ICheckpoint<TState = unknown> {
  /** Unique checkpoint ID */
  readonly checkpointId: string;
  /** Campaign this checkpoint belongs to (if any) */
  readonly campaignId?: string;
  /** Sequence number at which this checkpoint was created */
  readonly sequence: number;
  /** Timestamp when checkpoint was created */
  readonly timestamp: string;
  /** Derived state at this checkpoint */
  readonly state: TState;
  /** SHA-256 hash of the state */
  readonly hash: string;
}

// =============================================================================
// Campaign Manifest
// =============================================================================

/**
 * Index of chunks and checkpoints for a campaign.
 */
export interface ICampaignManifest {
  /** Campaign ID */
  readonly campaignId: string;
  /** Ordered list of chunk IDs */
  readonly chunkIds: readonly string[];
  /** Latest sequence number across all chunks */
  readonly latestSequence: number;
  /** ID of the latest checkpoint */
  readonly latestCheckpointId: string | null;
  /** Last updated timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Factory Function Types
// =============================================================================

/**
 * Parameters for creating a chunk summary.
 */
export interface ICreateChunkSummaryParams {
  events: readonly IBaseEvent[];
}

/**
 * Parameters for creating an event chunk.
 */
export interface ICreateChunkParams {
  chunkId?: string;
  campaignId?: string;
  events: readonly IBaseEvent[];
  previousHash?: string | null;
}

/**
 * Parameters for creating a checkpoint.
 */
export interface ICreateCheckpointParams<TState> {
  checkpointId?: string;
  campaignId?: string;
  sequence: number;
  state: TState;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for ISequenceRange.
 */
export function isSequenceRange(obj: unknown): obj is ISequenceRange {
  if (typeof obj !== 'object' || obj === null) return false;
  const range = obj as ISequenceRange;
  return typeof range.from === 'number' && typeof range.to === 'number';
}

/**
 * Type guard for IEventChunk.
 */
export function isEventChunk(obj: unknown): obj is IEventChunk {
  if (typeof obj !== 'object' || obj === null) return false;
  const chunk = obj as IEventChunk;
  return (
    typeof chunk.chunkId === 'string' &&
    isSequenceRange(chunk.sequenceRange) &&
    Array.isArray(chunk.events) &&
    typeof chunk.summary === 'object' &&
    typeof chunk.hash === 'string'
  );
}

/**
 * Type guard for ICheckpoint.
 */
export function isCheckpoint(obj: unknown): obj is ICheckpoint {
  if (typeof obj !== 'object' || obj === null) return false;
  const checkpoint = obj as ICheckpoint;
  return (
    typeof checkpoint.checkpointId === 'string' &&
    typeof checkpoint.sequence === 'number' &&
    typeof checkpoint.timestamp === 'string' &&
    typeof checkpoint.hash === 'string'
  );
}
