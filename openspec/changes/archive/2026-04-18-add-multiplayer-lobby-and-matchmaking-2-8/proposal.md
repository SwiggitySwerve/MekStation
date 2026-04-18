# Change: Add Multiplayer Lobby and Matchmaking (2-8)

## Why

**Sub-phase 4b.** The 4a lobby handles 1v1 only, and the 4b server
infrastructure is faceless — there's no way to form a 2v2, 3v3, 4v4,
or free-for-all group. Phase 4b's checkpoint requires "third player
joins the same side as co-op; AI fills remaining slots." This change
delivers a server-authoritative lobby that supports 2–8 players across
configurable team layouts, side assignment, AI slot filling, and a
room-code invite flow that scales past two seats.

## What Changes

- Extend the `multiplayer-server` spec with team-layout primitives:
  `'1v1'`, `'2v2'`, `'3v3'`, `'4v4'`, `'ffa-2'` through `'ffa-8'` (free-
  for-all with N slots)
- Host creates a match with a chosen layout; server derives the side
  roster and seat count
- Room code invitation: same 6-char convention as the vault
  `p2p-sync-system`; joining a code navigates the player to the match's
  lobby page
- Each seat is a slot with `{slotId, side, seatNumber, occupant:
IPlayerRef | null, kind: 'human' | 'ai'}`
- Host can toggle any unoccupied human slot to AI (drives `BotPlayer`
  behind the server engine) or back to human
- Players can self-assign to any open human slot; host can reassign
  players across sides until ready
- Readiness gate: match launches when all human slots are filled and
  ready, all AI slots are configured, and the host confirms
- Spectator mode deferred; all human seats are players

## Dependencies

- **Requires**: `add-multiplayer-server-infrastructure` (server + match
  store + WebSocket), `add-player-identity-and-auth` (players need a
  stable identity to occupy seats)
- **Required By**: `add-reconnection-and-session-rehydration` (must
  know the seat → player binding to re-attach on reconnect),
  `add-fog-of-war-event-filtering` (uses side assignments to filter
  events per player)

## Impact

- Affected specs: `multiplayer-server` (MODIFIED — team layouts, seat
  slots, AI-filled slots, readiness gate), `multiplayer-sync`
  (MODIFIED — room-code invite flow, lobby replication for 2–8)
- Affected code: new `src/server/multiplayer/lobby.ts`, new
  `src/pages/gameplay/mp-lobby/[matchId].tsx`, extension of
  `src/lib/multiplayer/client.ts` with lobby intent types, reuse of
  `roomCodes.ts` for invite code generation
- Non-goals: rated matchmaking (skill brackets), quick-match queue,
  spectator slots, friend lists (depends on identity work)
