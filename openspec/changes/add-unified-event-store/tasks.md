# Tasks: Unified Event Store

## 1. Core Types

- [ ] 1.1 Create `IBaseEvent` interface with common fields (id, sequence, timestamp, category, type, payload, context, causedBy)
- [ ] 1.2 Create `EventCategory` enum (Game, Campaign, Pilot, Repair, Award, Meta)
- [ ] 1.3 Create `IEventContext` interface (campaignId, missionId, gameId, pilotId, unitId, forceId)
- [ ] 1.4 Create `ICausedBy` interface for causality references
- [ ] 1.5 Create type guards (`isBaseEvent`, `isEventCategory`)
- [ ] 1.6 Create event factory functions (`createEvent`, `createEventId`, `getNextSequence`)

## 2. Chunk & Checkpoint Types

- [ ] 2.1 Create `IEventChunk` interface (chunkId, campaignId, sequenceRange, timeRange, events, summary, hash, previousHash)
- [ ] 2.2 Create `IChunkSummary` interface (eventCount, eventTypes, unitsInvolved, pilotsInvolved, outcome)
- [ ] 2.3 Create `ICheckpoint` interface (checkpointId, campaignId, sequence, timestamp, state, hash)
- [ ] 2.4 Create `ICampaignManifest` interface (chunkIds, latestSequence, latestCheckpointId)
- [ ] 2.5 Create `createChunkSummary()` utility function

## 3. Event Store Service

- [ ] 3.1 Create `EventStoreService` class with in-memory storage
- [ ] 3.2 Implement `append(event)` - add single event
- [ ] 3.3 Implement `appendBatch(events)` - add multiple events atomically
- [ ] 3.4 Implement `query(filters)` - filter by category, type, context, sequence range, time range
- [ ] 3.5 Implement `getEventsInRange(from, to)` - get events by sequence
- [ ] 3.6 Implement `getLatestSequence()` - get current sequence counter

## 4. Chunk Manager Service

- [ ] 4.1 Create `ChunkManagerService` class
- [ ] 4.2 Implement `createChunk(params)` - create chunk from events in range
- [ ] 4.3 Implement `createCheckpoint(params)` - create state snapshot
- [ ] 4.4 Implement `loadChunk(chunkId)` - load chunk from storage
- [ ] 4.5 Implement `loadCheckpoint(checkpointId)` - load checkpoint from storage
- [ ] 4.6 Implement `getManifest(campaignId)` - get campaign's chunk index

## 5. Hash & Verification

- [ ] 5.1 Create `hashEvent(event)` - SHA-256 hash of single event
- [ ] 5.2 Create `hashEvents(events)` - merkle-style hash of event array
- [ ] 5.3 Create `hashChunk(chunk)` - hash including metadata and previousHash
- [ ] 5.4 Create `verifyChainIntegrity(chunks)` - verify previousHash chain
- [ ] 5.5 Add automatic hash computation on chunk creation

## 6. IndexedDB Persistence

- [ ] 6.1 Set up Dexie.js database schema
- [ ] 6.2 Create `events` table with indexes (sequence, category, type, context fields)
- [ ] 6.3 Create `chunks` table with indexes (campaignId, sequenceRange)
- [ ] 6.4 Create `checkpoints` table with indexes (campaignId, sequence)
- [ ] 6.5 Create `manifests` table
- [ ] 6.6 Implement persistence adapter for EventStoreService

## 7. State Derivation

- [ ] 7.1 Create `deriveState(events, reducers)` generic function
- [ ] 7.2 Create `deriveFromCheckpoint(checkpoint, events)` for fast reconstruction
- [ ] 7.3 Implement campaign state reducer
- [ ] 7.4 Implement pilot state reducer
- [ ] 7.5 Implement roster state reducer

## 8. Migration

- [ ] 8.1 Map existing `GameEventType` to `EventCategory.Game` + type
- [ ] 8.2 Update `createGameCreatedEvent` etc. to use `createEvent`
- [ ] 8.3 Update `gameState.ts` `applyEvent` to accept `IBaseEvent`
- [ ] 8.4 Add backwards compatibility adapter for existing game code

## 9. Zustand Integration

- [ ] 9.1 Create `useEventStore` Zustand store
- [ ] 9.2 Implement `emitEvent(params)` action
- [ ] 9.3 Implement `queryEvents(filters)` selector
- [ ] 9.4 Implement `getStateAt(sequence)` selector
- [ ] 9.5 Connect to `useGameplayStore` for game events
- [ ] 9.6 Connect to `useCampaignStore` for campaign events (when implemented)

## 10. Testing

- [ ] 10.1 Unit tests for base event types and type guards
- [ ] 10.2 Unit tests for event factory functions
- [ ] 10.3 Unit tests for EventStoreService (append, query, range)
- [ ] 10.4 Unit tests for ChunkManagerService (create chunk, checkpoint)
- [ ] 10.5 Unit tests for hash utilities (consistent hashing, chain verification)
- [ ] 10.6 Integration tests for full event flow (emit → store → chunk → checkpoint)
- [ ] 10.7 Integration tests for state derivation from events
