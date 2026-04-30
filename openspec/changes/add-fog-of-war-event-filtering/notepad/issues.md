## [2026-04-30 00:00] Task: fog-broadcast-integration-map
**Issue discovered**: `ServerMatchHost` has no event-specific `broadcastEvent` helper today. Generic `broadcast()` delegates to `ServerMatchBroadcaster.broadcast()`, which stringifies one payload and sends it to every socket.

**Why it matters**: Fog integration needs a per-destination event fan-out path that can run `filterEventForPlayer(event, playerId, state)` before sending to each socket, while leaving generic lobby/error/status messages unchanged.

## [2026-04-30 00:00] Task: fog-broadcast-integration-map
**Issue discovered**: Socket player identity is stored in `ServerMatchSocketLifecycle`, but `ServerMatchBroadcaster.snapshot()` exposes sockets without player ids.

**Why it matters**: Per-client fog filtering needs either a socket metadata snapshot or an explicit lifecycle fan-out method before live broadcast filtering can be wired.

## [2026-04-30 00:00] Task: fog-broadcast-integration-map
**Issue discovered**: Replay streams currently chunk raw events without historical visibility. If fog drops hidden events, client high-water tracking may need to advance on `ReplayEnd.toSeq`, not only received event sequences.

**Why it matters**: Filtered reconnect replay must avoid leaking hidden history while still preventing repeated replay of the same hidden server events.
