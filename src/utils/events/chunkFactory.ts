/**
 * Chunk Factory Functions
 * Utilities for creating event chunks and checkpoints.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IBaseEvent,
  IEventChunk,
  ICheckpoint,
  IChunkSummary,
  ICreateChunkParams,
  ICreateCheckpointParams,
} from '@/types/events';
import { hashChunk, hashState } from './hashUtils';

// =============================================================================
// Chunk Summary Creation
// =============================================================================

/**
 * Create a summary of events for a chunk.
 */
export function createChunkSummary(events: readonly IBaseEvent[]): IChunkSummary {
  const eventTypes: Record<string, number> = {};
  const unitSet = new Set<string>();
  const pilotSet = new Set<string>();

  for (const event of events) {
    // Count event types
    const typeKey = `${event.category}:${event.type}`;
    eventTypes[typeKey] = (eventTypes[typeKey] || 0) + 1;

    // Collect involved entities from context
    if (event.context.unitId) {
      unitSet.add(event.context.unitId);
    }
    if (event.context.pilotId) {
      pilotSet.add(event.context.pilotId);
    }
  }

  return {
    eventCount: events.length,
    eventTypes,
    unitsInvolved: Array.from(unitSet),
    pilotsInvolved: Array.from(pilotSet),
  };
}

// =============================================================================
// Event Chunk Creation
// =============================================================================

/**
 * Create an event chunk from a sequence of events.
 */
export function createChunk(params: ICreateChunkParams): IEventChunk {
  const { chunkId = uuidv4(), campaignId, events, previousHash = null } = params;

  if (events.length === 0) {
    throw new Error('Cannot create chunk with no events');
  }

  // Sort events by sequence to ensure correct order
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  const chunk: Omit<IEventChunk, 'hash'> = {
    chunkId,
    campaignId,
    sequenceRange: {
      from: firstEvent.sequence,
      to: lastEvent.sequence,
    },
    timeRange: {
      from: firstEvent.timestamp,
      to: lastEvent.timestamp,
    },
    events: sortedEvents,
    summary: createChunkSummary(sortedEvents),
    previousHash,
  };

  // Compute hash including all chunk data
  const hash = hashChunk(chunk);

  return {
    ...chunk,
    hash,
  };
}

// =============================================================================
// Checkpoint Creation
// =============================================================================

/**
 * Create a checkpoint at a specific sequence.
 */
export function createCheckpoint<TState>(
  params: ICreateCheckpointParams<TState>
): ICheckpoint<TState> {
  const { checkpointId = uuidv4(), campaignId, sequence, state } = params;

  const checkpoint: Omit<ICheckpoint<TState>, 'hash'> = {
    checkpointId,
    campaignId,
    sequence,
    timestamp: new Date().toISOString(),
    state,
  };

  // Compute hash of the state
  const hash = hashState(state);

  return {
    ...checkpoint,
    hash,
  };
}
