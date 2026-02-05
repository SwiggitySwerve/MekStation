# Change: Add Unified Event Store

## Why

MekStation needs full auditability across games, campaigns, pilots, and repairs. Users want to:

- **Replay** any game turn-by-turn
- **View campaign history** as a timeline of missions, outcomes, and roster changes
- **Track pilot careers** across multiple campaigns (kills, wounds, XP, awards)
- **Verify state integrity** - prove state wasn't tampered with
- **Time travel** to any previous state and replay from there

Current game event sourcing (`gameEvents.ts`, `gameState.ts`) is limited to single sessions. A unified event store extends this pattern to all state changes system-wide, with chunked storage for scalability.

## What Changes

- Add base event types with causality chains (`IBaseEvent`, `EventCategory`, `ICausedBy`)
- Implement chunked event storage (one chunk per mission)
- Add checkpoints after each mission for O(1) state reconstruction
- Add cryptographic hashing for chain verification
- Add event query and filtering APIs
- Migrate existing game events to unified types

## Philosophy: Events as Source of Truth

**State is never stored - only events.** All state (campaign progress, pilot XP, unit damage) is derived by replaying events through reducers. This enables:

- Perfect replay and time travel
- Full audit trail with causality
- Verification via hash chains
- No state/event divergence bugs

## Dependencies

- Existing `src/utils/gameplay/gameEvents.ts` - patterns reused, types migrated
- Existing `src/utils/gameplay/gameState.ts` - reducer pattern extended

## Impact

- Affected specs: `event-store` (new capability)
- Affected code: `src/types/events/`, `src/services/events/`, `src/utils/events/`
- Existing game code: Refactor to use unified event types
- Storage: IndexedDB (Dexie.js) for local persistence
- All Phase 5 specs depend on this: campaigns, awards, repairs emit events here

## Success Criteria

- [ ] All state changes emit events to unified store
- [ ] Can reconstruct any historical state from events
- [ ] Events are immutable and append-only
- [ ] Chain integrity verifiable via SHA-256 hashes
- [ ] Query API supports filtering by category, type, context, time range
- [ ] Checkpoint per mission enables fast state lookup
