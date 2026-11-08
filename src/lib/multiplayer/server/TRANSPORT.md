# Multiplayer Transport — Consolidation Contract (DP1)

> Authoritative source for the `multiplayer-sync` "Authoritative Server
> Is the Supported Transport" requirement. Frozen by
> `openspec/changes/harden-multiplayer-transport` design decision **DP1**.

## The supported transport is the authoritative server WebSocket

A networked MekStation match is played over the **authoritative server
WebSocket** (`/api/multiplayer/socket`). The server owns the single
`InteractiveSession` per match (`ServerMatchHost`), captures every die
roll (`CryptoDiceRoller` / `RollCapture`), redacts fog-of-war events,
streams replay, and — as of M2 (`harden-multiplayer-transport`) —
rate-limits and replay-protects every inbound intent.

Intents and events flow over the server WebSocket. A match's
correctness **never depends on a y-webrtc peer connection**.

## Finished match lifecycle

`matchCompletion.ts` owns the rule that a committed `GameEnded` completes
match metadata. Command handlers call it only after their events are durable.
Completion uses the store's idempotent `closeMatch`; it does not tear down
the host or invoke either outcome publisher. Attached players can receive the
terminal events, while completed metadata refuses new spectators and fresh
host construction.

Boot recovery excludes completed rows. When a validated effective history
proves that an old `active` row already ended, recovery completes that row,
logs its match id once, and skips session and host construction. A rewind is
checked against its effective branch, not its superseded terminal tail.

Pending durable combat outcomes on completed matches are retried separately,
without creating hosts. `publishDurableCombatOutcome.ts` owns the shared
read/publish/receipt sequence: stamp `publishedAt` only after a listener
consumes the outcome; skip already-published rows on every later restart.
The existing seven-day completed-match retention remains in force.

## Lobby and spectator seat lifecycle

`matchIntentKinds.ts` owns wire intent classification, host-only lobby
authorization and allowed match statuses. Setup intents (OccupySeat, LeaveSeat,
ReassignSeat, SetAiSlot, SetHumanSlot, SetReady and LaunchMatch) require `lobby`.
Completed matches reject all lobby intents. ForfeitMatch retains its lobby/active
availability and existing outcome/completion path.

MarkSeatAi is the narrow recovery exception: it requires `active` and an occupied
`human` seat whose player id **and slot id** match a pending disconnected entry.
Connected humans, empty seats, AI and spectators are refused. This preserves:

- `src/types/multiplayer/Protocol.ts:315-319`, the MarkSeatAi pending-human contract.
- `src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts:257`, scenario
  `host MarkSeatAi clears the pending seat and broadcasts MatchResumed`, and
  `MarkSeatAi rejects %s targets without changing seats or clearing pending`
  at line 300.

The final socket detach queues spectator removal on the same host executor as
intents. The queued operation checks for reattachment both before and after its
metadata read. It removes only the matching spectator seat, persists it, and
broadcasts LobbyUpdated; it does not change the playing roster, side assignments,
campaign membership or human-seat grace handling. Registration uses the first
free spectator slot id so removing a middle viewer cannot duplicate another slot.

Spectator departure retains delivery records, acknowledgements and cursor state
by authenticated viewer identity, not slot id. A viewer must register again to
regain membership, then resumes the same delivery numbering across rejoin and
restart. Rewind still clears the superseded delivery stream as described below.

Follow-ups: seats compare-and-swap across REST and host writers, abrupt-crash
leftovers, and spectator registrations that never attach. General metadata
transition validation remains separate from these intent admission rules.

## Viewer delivery recovery and rewind

Active-match recovery restores contiguous per-viewer delivery records and
their persisted acknowledgements before draining pending publications.
Each receipt must identify that match and viewer and name an issued delivery
slot. Missing, unreadable, or out-of-range receipts leave that viewer's
restored frames unacked; one viewer's read failure does not block another.
Stores without acknowledgement support retain unacked accounting.

A live rewind discards in-memory delivery records, acknowledgements,
isolation, and refused-event resume markers before replaying the rebuilt stream.
Restart recovery on an activated rewind skips the superseded delivery
records and their acknowledgements. Both paths start the rebuilt stream
with its own delivery numbers and acknowledgement window.

## y-webrtc / peer-to-peer is a non-authoritative fallback

The y-webrtc / P2P stack (`src/lib/p2p/`) is a **non-authoritative
fallback**. It receives **no further hardening**:

- Cheating defenses — authoritative roll capture, intent
  zod-refinement, fog redaction, intent rate-limiting, replay-attack
  protection — are **structurally impossible** on a peer mesh. They are
  provided **only by the server path**.
- No new feature is built on the y-webrtc path. M3 (matchmaking +
  spectators) and Wave 5 (co-op campaign sync) extend the
  server-authoritative loop only.
- The P2P code is **not deleted** — DP1 demotes it, it does not remove
  it. Deleting it is explicitly out of scope.

## The `mirrorSession` / `gameSessionChannel` pattern is retained — client-side only

The `mirrorSession` / `gameSessionChannel` event-application pattern is
**kept**, but **only as the client-side event-application layer**. It is
pointed at the **server `Event` stream** rather than at y-webrtc:

- The client builds its mirror session from the same `IGameConfig` +
  `IGameUnit` snapshot the server used.
- The mirror is advanced **solely by `Event` envelopes the server
  broadcasts** over the WebSocket — the client never appends its own
  events; only the authoritative server mutates the canonical log.
- `applyMirrorEvent` / `assertMirrorAppendForbidden` enforce that
  one-way contract at every call site.

This is exactly what M1 (`complete-multiplayer-game-surface`) wired: the
reducer is reused, the transport underneath it is the server WebSocket.

## Summary

| Concern                      | Server WebSocket (supported) | y-webrtc (fallback)       |
| ---------------------------- | ---------------------------- | ------------------------- |
| Authoritative session        | Yes (`ServerMatchHost`)      | No                        |
| Roll capture / fog redaction | Yes                          | No (impossible on a mesh) |
| Intent rate-limit / replay   | Yes (M2)                     | No                        |
| Durable store + recovery     | Yes (M2)                     | No                        |
| Receives further hardening   | Yes                          | No                        |
| `mirrorSession` reducer      | Client-side, fed by server   | (legacy, not extended)    |
