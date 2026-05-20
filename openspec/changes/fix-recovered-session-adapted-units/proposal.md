# Change: Fix Recovered-Session Adapted Units

## Why

`InteractiveSession.fromSession()` is the recovery path that rebuilds a live session from persisted state on server restart. The Wave 3 multiplayer durability work shipped session-level recovery — a match in progress survives a server bounce. But `fromSession` currently rebuilds the session with **empty `adaptedUnits` arrays** — the per-unit adapted-state objects that the combat engine needs for move and attack resolution.

The consequence: full move/attack play after server-restart recovery is broken by design. The session resumes; the player can navigate the UI; but any combat action raises an error because the adapted-units cache is empty. Playtest gap #2 logged this as known.

The fix is to re-derive `adaptedUnits` from the canonical campaign state at recovery time, the same way the initial session-bootstrap path derives them. The data is all present in the persisted state — the recovery path just needs to call the same adapter the bootstrap path already calls.

## What Changes

- ADDED `adaptedUnitRebuilder` call inside `InteractiveSession.fromSession()` (or whichever method implements the recovery path)
- ADDED a regression test that asserts: persist a session mid-combat → simulate server restart → recover the session → a move-attack sequence executes successfully (not error-out due to empty adapted-units)
- ADDED documentation in the session-recovery doc-comment explaining the adapted-units derivation step (so a future engineer doesn't re-introduce the bug)

## Dependencies

- **Requires (already shipped)**: Wave 3 multiplayer durable-transport + session persistence
- **Requires (already shipped)**: the existing `adaptedUnitRebuilder` used by the session-bootstrap path
- **No new types, no new transport** — reuses the existing rebuild logic

## Impact

- Affected specs: `multiplayer-session-recovery` (or whichever capability owns the recovery path)
- Affected code:
  - `src/multiplayer/server/InteractiveSession.ts` (or equivalent) — `fromSession` method
  - `src/multiplayer/server/__tests__/InteractiveSession.recovery.test.ts` — new regression test
- No database migrations
- No new components, hooks, or types

## Non-Goals

- Recovery of in-flight combat actions (a player mid-move when the server crashes loses the action — recovery brings the session back to the last committed turn boundary, not the per-action boundary)
- Multi-server-instance recovery (single-server scope only — the load-balanced multi-instance case is a separate change)
- Recovering the chat/log buffer beyond what the current persistence stores
