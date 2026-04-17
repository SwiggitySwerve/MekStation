# Change: Add Reconnection and Session Rehydration (Server)

## Why

**Sub-phase 4b.** 4a's reconnect protocol (`add-game-session-persistence-
for-reconnect`) only covers 1v1 P2P, where the host's local log is the
authoritative source. In 4b the authoritative log lives in the
`IMatchStore` behind the server, which is both more robust (a player's
wifi dying doesn't risk their local log being the last copy) and more
flexible (a player can reconnect from a different device). This change
formalizes the server-side side of reconnection: pause/unpause on peer
loss, per-match grace windows, replay to reconnecting clients from the
match store, identity-based reconnect (same `playerId` that left can
rejoin their seat), and per-match replay limits.

## What Changes

- `multiplayer-server` spec adds a formal "player disconnection
  lifecycle" section: `connected → pending → timed-out`
- Grace window configurable per match; default 120 seconds for active
  matches (2× the 4a default because now a server keeps humming)
- Server pauses phase advancement while any human seat's occupant is
  `pending`, unless the host explicitly marks them "leave as AI"
- On reconnect, server verifies `playerId` matches the seat's
  occupant, streams the replay from `IMatchStore` starting at the
  client-provided `lastSeq`
- Clients can reconnect from any device that holds a valid player
  token for the same `playerId`
- If grace times out, server offers the host two outcomes: forfeit
  that seat's side (end match) OR replace the seat with a bot so the
  other humans can continue
- Persistent auto-save on the server ensures that a server restart
  doesn't invalidate active matches; reconnecting clients pick back
  up from the last appended event

## Dependencies

- **Requires**: `add-multiplayer-server-infrastructure` (server + match
  store), `add-player-identity-and-auth` (authenticated reconnect),
  `add-multiplayer-lobby-and-matchmaking-2-8` (seat model)
- **Required By**: production readiness of 4b — without this, any
  flaky connection ends a match

## Impact

- Affected specs: `multiplayer-server` (MODIFIED — disconnection
  lifecycle, grace window, seat fallback), `game-session-management`
  (MODIFIED — server-authored pause events), `auto-save-persistence`
  (MODIFIED — server-side persistence hooks, mirror of 4a's client-
  side contract)
- Affected code: extension of `ServerMatchHost` with
  connection-lifecycle tracking, new `src/server/multiplayer/
reconnectManager.ts`, extension of `src/lib/multiplayer/client.ts`
  with auto-reconnect + replay intake, extension of the lobby
  `IMatchMeta` with seat connection status
- Non-goals: cross-region server failover, hot-swap of the `IMatchStore`
  backend mid-match, reconnect of multi-device split brain, voice/chat
  session continuity
