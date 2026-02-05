# Change: Add Unified Event Store

## Why

MekStation needs full auditability across games, campaigns, pilots, and repairs. Users want to:

- Replay any game turn-by-turn
- View campaign history as a timeline
- Track pilot careers across multiple campaigns
- Verify state integrity (no tampering)
- Time travel to any previous state

Current game event sourcing is limited to single sessions. A unified event store extends this to all state changes system-wide.

## What Changes

- Add base event types with causality chains
- Implement chunked event storage (one chunk per mission)
- Add checkpoints after each mission for fast state reconstruction
- Add cryptographic hashing for verification
- Add event query and filtering APIs
- Update existing game events to use new base types

## Dependencies

- Existing `src/utils/gameplay/gameEvents.ts` - will be migrated to new types
- Existing `src/utils/gameplay/gameState.ts` - patterns reused

## Impact

- Affected specs: `event-store` (new capability)
- Affected code: `src/types/events/`, `src/services/events/`, `src/utils/events/`
- Existing game code: Refactor to use unified event types
- Storage: IndexedDB for local persistence

## Success Criteria

- [x] All state changes emit events to unified store
- [x] Can reconstruct any historical state from events
- [x] Events are immutable and append-only
- [x] Chain integrity is verifiable via hashes
- [x] Query API supports filtering by type, context, time range
