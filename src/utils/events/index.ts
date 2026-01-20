/**
 * Events Utilities Index
 * Re-exports all event-related utilities.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

// Event factory
export {
  createEventId,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  setSequence,
  createEvent,
  createGameEvent,
  createCampaignEvent,
  createPilotEvent,
  createRepairEvent,
  createAwardEvent,
  createMetaEvent,
} from './eventFactory';

// Chunk factory
export { createChunkSummary, createChunk, createCheckpoint } from './chunkFactory';

// Hash utilities
export {
  toCanonicalJson,
  sha256,
  sha256Sync,
  hashEvent,
  hashEvents,
  hashChunk,
  hashState,
  verifyChainIntegrity,
  verifyChunk,
  type IChainVerificationResult,
} from './hashUtils';

// State derivation
export {
  deriveState,
  deriveFromCheckpoint,
  deriveStateAtSequence,
  deriveStateWithCheckpoint,
  createReducerBuilder,
  ReducerBuilder,
  type EventReducer,
  type ReducerMap,
} from './stateDerivation';
