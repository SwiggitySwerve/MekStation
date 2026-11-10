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

## Match status transitions

`src/types/multiplayer/MatchStatus.ts` owns the three persisted statuses and the
only legal edges: `lobby -> active | completed`, `active -> completed`, with
`completed` terminal. `completed` is the one end state for a finished game, a
DELETE, an expired lobby, a failed create and a reconnect timeout; the data does
not record which. Both stores enforce the table in `patchMatchMeta` (behind
`updateMatchMeta` and `closeMatch`), so a stale writer cannot reopen a completed
match, and `createMatch` accepts only `lobby` and `active`. A same-status write
is legal. A refused lobby write answers `INVALID_INTENT` and is logged.

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
- `src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts:258`, scenario
  `host MarkSeatAi clears the pending seat and broadcasts MatchResumed`, and
  `MarkSeatAi rejects %s targets without changing seats or clearing pending`
  at line 332.

The final socket detach queues spectator removal on the same host executor as
intents. The queued operation checks for reattachment both before its metadata
read and again when it derives the write. It removes only the matching spectator seat, persists it, and
broadcasts LobbyUpdated; it does not change the playing roster, side assignments,
campaign membership or human-seat grace handling. Registration uses the first
free spectator slot id so removing a middle viewer cannot duplicate another slot.

Only seats automatic cleanup may release are released (`isAutoReleasableSpectatorSeat`,
consulted by the last-socket detach and the boot sweep and by nothing else). A
co-op campaign seats its GM host in a spectator seat (`hostSeatKind: 'spectator'`)
and membership comes from owned seats, so while the match is live the seat held by
`hostPlayerId` is the GM's membership and survives a detach, and the GM's drop then
follows the normal host path (migration is refused for a campaign GM). It grants
no general immortality: a completed match releases the GM's seat on the next
detach like any other, `removeSpectatorSeat` and the rest of the seat primitives
are unchanged, and explicit close (`DELETE`, `closeMatch`) ends the match instead
of editing seats. A normal host holds a playing seat and is never affected.

Spectator departure retains delivery records, acknowledgements and cursor state
by authenticated viewer identity, not slot id. A viewer must register again to
regain membership, then resumes the same delivery numbering across rejoin and
restart. Rewind still clears the superseded delivery stream as described below.

Seat writes are compare-and-swap. `IMatchMeta.revision` (absent reads as 0, kept
only in `meta_json`, no DDL) is bumped by `updateMatchMeta`, `updateMatchMetaIf`
and `closeMatch`, not by event appends. Every seat writer (REST spectate, lobby
intents including MarkSeatAi, spectator detach) goes through
`lobby/seatUpdate.ts`'s `updateMatchSeats`: it derives a patch from the metadata it
read, stores it with `updateMatchMetaIf` at that revision, and on a conflict
derives again from the winner's metadata, up to `SEAT_UPDATE_MAX_ATTEMPTS` (5),
then answers `busy`. The durable store adds `AND meta_json = ?` to the UPDATE and
requires one changed row, so a write from another connection is a conflict, not
an overwrite. Derivations run again on a conflict, so they are pure: MarkSeatAi
drops its pending entry only after its write is applied, a refusal found on a
re-derivation is logged, and `LobbyUpdated` carries the stored metadata. Host
migration still patches only `hostPlayerId` through `updateMatchMeta`, which
merges onto the latest row and bumps the revision.

A spectator seat that outlives its sockets because the process died first is a
crash leftover. The full boot recovery pass (`recoverActiveMatches` with no match
id, run once by `bootstrapMultiplayerServer`) releases every viewer's spectator
seat of every `active` match through `updateMatchSeats`
(`lobby/spectatorBootSweep.ts`): no socket survives a restart. What counts is
`isAutoReleasableSpectatorSeat`, the same rule the last-socket detach uses, so the
co-op GM host's own spectator seat is kept. Playing seats, roster, status and the
retained delivery cursors are untouched. A viewer registers again to watch, which
the spectate page does by itself when its reconnect is refused. A recovery
scoped to one match id is the runtime co-op rebuild and never sweeps, because a
spectator may have just registered and not attached yet.

Follow-up: spectator registrations that never attach hold a seat until the next
restart or until they attach and detach. Status transition validation is the
separate table above; these rules decide only which intents a status admits.

## Match pause causes

A match pauses for three independent causes: a human seat inside its reconnect
grace (`peer-pending`), an absent campaign GM on a co-op mission (`gm-absent`),
and a faulted server-driven co-op opponent (`opponent-fault`). While any cause
holds, engine intents are refused privately with `MATCH_PAUSED` and the fixed reason
`Match is paused.`. The public pause snapshot carries the cause.

`MatchPaused` is a snapshot. Its required `reason` is the active cause with
the highest precedence, from `opponent-fault` down to `peer-pending`;
`pendingSlots` always lists the pending seats, and the grace fields ride only
with a pending seat. The host broadcasts a new snapshot whenever the cause set
changes (peer drop or rejoin, GM leave or return, opponent fault) and
`MatchResumed` only when no cause remains. Every joining socket, spectators
included, receives the current snapshot after its replay and `LobbyUpdated`.
Pause frames are transport-only: never stored, replayed or schema-packed.

The opponent fault exits explicitly. A `SessionJoin` from a seated participant
(a human player or the GM: `hostPlayerId` or `playerIds`) clears the fault and
retries the opponent once; the turn identity is deterministic, so the retry
appends nothing twice, and a repeated failure pauses again. A spectator's join
never retries. A successful `ForfeitMatch` lifts every cause and broadcasts
`MatchResumed`; a refused one changes nothing. In a co-op mission the forfeit
concedes the OpFor side, so the fault overlay does not offer it. Nothing ends
a faulted match through the legacy abort path. Restart recovery starts with no
fault; a rebuilt campaign session starts GM-absent, which joiners learn from
the snapshot.

## Viewer delivery recovery and rewind

Active-match recovery restores contiguous per-viewer delivery records and
their persisted acknowledgements before draining pending publications.
Each receipt must identify that match and viewer and name an issued delivery
slot. Missing, unreadable, or out-of-range receipts leave that viewer's
restored frames unacked; one viewer's read failure does not block another.
Stores without acknowledgement support retain unacked accounting.

A live rewind discards in-memory delivery records, acknowledgements,
isolation, and refused-event resume markers before replaying the rebuilt stream.
Match-tail supersession deletes all of that match's durable delivery records
and acknowledgements inside the same transaction as the event, publication
outbox and command-receipt supersession. Even retained events are renumbered
from zero, so keeping any old delivery prefix would collide. Other matches'
resume data stays untouched; a later transaction failure restores the deleted
rows along with the authority tail. Authority history keeps its existing
superseded sibling rows; viewer resume data is disposable.
Restart recovery on an activated rewind skips the superseded delivery
records and their acknowledgements. Both paths start the rebuilt stream
with its own delivery numbers and acknowledgement window.

Coordinated outcome correction uses the same supersession helper but does not
rebuild the live host or reset its in-memory viewer counter. Continued sends
therefore persist slots above zero without collisions. A reload through
`loadFromRecords` rejects that non-contiguous record and falls back to full replay,
so no superseded mapping can shift the restored cursor.

The resync marks that send a seated player back to the rebuilt head also
survive a restart: boot recovery of a match on an activated rewind branch marks
the host and every seated player, so their next join replays from the rebuilt
head whatever `lastSeq` they quote. Spectators are not marked, as in the live
rebuild. A match that was never rewound is not marked. Nothing is persisted;
the cost is one full replay per seat after each restart, consumed on join.

`POST /api/matches/:id/rewind-commit` rebuilds the live host before it stores
the GM's private reason. If the rebuild fails after the commit, the route still
answers 200 with the committed result. It adds `rebuildPending: true` only when
the host still serves the superseded session. The host keeps that rebuild
pending and retries it, inside its command queue, before the next command and
after the next join. Until a retry succeeds, commands are refused as
`STALE_BRANCH`. A restart folds the activated branch on boot, so the pending
state is never persisted. A failure after the host has claimed the branch,
such as a failed replay to attached sockets, is not pending: the rebuilt
session is authoritative, and folding it again would drop newer events. The
rebuild holds only a correction lease it acquired itself and never releases a
lease another owner holds. A private reason that cannot be stored after the commit is logged:
the route still answers 200 committed, with no extra field. A host that has already closed
(completion closes a host without dropping it from the registry) is neither
rebuilt nor reported pending; its branch is folded on the next boot.

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

## Private intent refusal replies

`intentRefusal.ts` owns the existing Error codes' fixed wording. Detailed engine,
authorization and store messages are logged through the server logger with match
and intent IDs. They never become wire reasons. INVALID_INTENT and AUTH_REJECTED
do not distinguish hidden-state causes. Unknown and foreign unit commands both
receive INVALID_INTENT; unknown unit IDs cannot succeed silently while known
foreign IDs return an identifiable authorization refusal.

The socket binder supplies a connection key at admission. The host binds that key
to the admitted socket and captures it in each command context. Intent, branch,
lobby, forfeit, journal and publication failures call `sendRefusal`, which uses
`safeSend` for that socket only. There is no player-wide or broadcast fallback;
other sockets, including another connection for the same player, receive nothing
from an intent refusal. Detach/release removes the binding. In-process and
server-driven commands without an inbound socket retain their return values and
server diagnostics without publishing Error frames. Existing fatal persistence
shutdown, public pause frames, successful lobby/event broadcasts and fog admission
are unchanged.

Existing clients settle only their own pending intent IDs. No client waits for
another player's refusal; observers simply stop receiving unrelated error toasts.
