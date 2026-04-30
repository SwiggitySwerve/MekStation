## [2026-04-30 00:00] Task: reconnect-integration-map
**Issue discovered**: The reconnect tasks say `IGameSession.matchId` is already present, but current source only exposes `IGameSession.id`. P2P lobby sessions already set `session.id` to the lobby `matchId`, while server-hosted matches keep an external server `matchId` that can differ from the engine session id.

**Why it matters**: Event-log persistence needs a single stable match identifier before `InteractiveSession` hydration and replay can be wired safely.

## [2026-04-30 00:00] Task: reconnect-integration-map
**Issue discovered**: Reconnect timing is inconsistent across artifacts and code. The proposal mentions 30 seconds, tasks/specs require a 60-second grace window, and the current multiplayer protocol constant is 120 seconds.

**Why it matters**: Wave 4 should implement the spec/task value of 60 seconds and update tests/constants together rather than preserving the old server default.

## [2026-04-30 00:00] Task: reconnect-integration-map
**Issue discovered**: Current server replay chunking uses 50-event chunks, while the reconnect tasks require chunks of at most 64 events.

**Why it matters**: Reconnect protocol changes must update the shared protocol constant and replay tests together.
