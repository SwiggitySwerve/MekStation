# Tasks: Unified Event Store

## 1. Core Types

- [x] 1.1 Create base event interfaces (IBaseEvent, EventCategory, IEventContext)
- [x] 1.2 Create event factory functions (createEvent, createEventId)
- [x] 1.3 Create chunk and checkpoint interfaces (IEventChunk, ICheckpoint, IChunkSummary)
- [x] 1.4 Create query interfaces (IEventQueryFilters, IEventQueryOptions)

## 2. Storage Layer

- [x] 2.1 Implement EventStoreService (in-memory with append, query, getEventsInRange)
- [x] 2.2 Implement ChunkManagerService (createChunk, createCheckpoint)
- [x] 2.3 Create chunk factory functions (createChunk, createCheckpoint)
- [ ] 2.4 Add IndexedDB persistence via Dexie (future)
- [ ] 2.5 Implement chunk loading/saving to IndexedDB (future)

## 3. Verification

- [x] 3.1 Implement hash utilities (SHA-256 via Web Crypto API)
- [x] 3.2 Add hashEvent and hashEvents functions
- [x] 3.3 Add hashChunk for chunk integrity
- [x] 3.4 Add verifyChainIntegrity for chain verification

## 4. State Derivation

- [x] 4.1 Create state derivation utilities
- [x] 4.2 Implement event reducer pattern
- [x] 4.3 Add checkpoint-based state reconstruction

## 5. Testing

- [x] 5.1 Unit tests for base event interfaces and type guards
- [x] 5.2 Unit tests for event factory functions
- [x] 5.3 Unit tests for EventStoreService
- [x] 5.4 Unit tests for ChunkManagerService
- [x] 5.5 Unit tests for hash utilities
- [x] 5.6 Unit tests for state derivation

## 6. Integration (Future)

- [ ] 6.1 Create useEventStore Zustand store
- [ ] 6.2 Integrate with useGameplayStore
- [ ] 6.3 Add event emission to campaign actions
- [ ] 6.4 Add event emission to pilot actions
