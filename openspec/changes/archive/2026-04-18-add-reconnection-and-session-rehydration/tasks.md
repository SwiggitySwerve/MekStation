# Tasks: Add Reconnection and Session Rehydration (Server)

## 1. Connection Lifecycle Model

- [x] 1.1 Extend `IMatchSeat` with `connectionStatus: 'connected' |
'pending' | 'timed-out' | 'replaced-by-ai'` _(Wave 4 keeps the
      pending state in `PendingPeerTracker` instead of denormalising
      onto `IMatchSeat`; deferred to a UI follow-up)_
- [x] 1.2 Transitions: on WebSocket attach → `connected`; on socket
      close → `pending`; on grace timer expiry → `timed-out`;
      post-fallback → `replaced-by-ai`
- [ ] 1.3 `connected` seats appear in the UI with a green dot; `pending`
      with a yellow pulse; `timed-out` with a red dot → deferred:
      lobby UI shipped without per-seat connection-status pips; UI
      indicator pass is a follow-up

## 2. Grace Window Configuration

- [x] 2.1 `IMatchMeta.config.reconnectGraceSeconds` defaults to 120
      _(constant `RECONNECT_GRACE_MS = 120_000` in Protocol.ts;
      per-match config field deferred)_
- [x] 2.2 Grace timer starts per-seat on disconnect; resets on
      reconnect
- [ ] 2.3 Host may adjust the grace window via
      `Intent {kind: 'SetGraceWindow', seconds}`, clamped to `[30,
600]`; can NOT be adjusted once a timer is already running for
      that seat → deferred: single-tenant constant
      (`RECONNECT_GRACE_MS = 120_000`) is sufficient for Phase 4;
      per-host adjustability is a follow-up

## 3. Server-Side Persistence Hooks

- [x] 3.1 `ServerMatchHost` persists every appended event through the
      `IMatchStore.appendEvent` call before broadcasting _(landed in
      Wave 1; verified in this change)_
- [ ] 3.2 On server restart, hosts load their session from the store
      (via `IMatchStore.getEvents`) before accepting new connections
      → deferred: `InMemoryMatchStore` is volatile by design;
      persistent store is a future change per proposal non-goals
- [ ] 3.3 A health check endpoint `/api/multiplayer/matches/:id/status`
      returns `{status, seats, connectionStatuses, lastEventSeq}` for
      monitoring dashboards → deferred: ops monitoring follow-up
      (no dashboard consumers exist yet)

## 4. Reconnect Handshake

- [x] 4.1 Client reconnect: opens a WebSocket with a valid token and
      sends `SessionJoin {matchId, playerId, lastSeq}`
- [x] 4.2 Server verifies `playerId` matches a seat whose
      `connectionStatus` is `'pending'` _(verified via `pendingPeers` + `attachSocket` clearing on (re)connect)_
- [x] 4.3 Server re-binds the socket to that seat and transitions the
      seat to `'connected'` _(via `handleSessionJoin`)_
- [x] 4.4 Server streams events from `lastSeq+1` via `ReplayStart` +
      chunks + `ReplayEnd` _(via `streamReplay`, 50 events/chunk)_

## 5. Pause/Resume Mechanics

- [x] 5.1 If any human seat's `connectionStatus` is `'pending'`, the
      server does NOT advance phases or process intents from other
      clients _(`isPaused` gate in `handleIntent`)_
- [x] 5.2 Exception: host can override with `Intent {kind:
'MarkSeatAi'}` _(implemented as `MarkSeatAi` per locked design;
      naming changed from `ProceedWithoutPending`)_
- [x] 5.3 Paused matches broadcast `MatchPaused {pendingSlots,
reason}`
- [x] 5.4 Resumed matches broadcast `MatchResumed`

## 6. Grace Timeout Fallback

- [x] 6.1 When a seat's grace timer expires, server broadcasts
      `SeatTimedOut {slotId, playerId}`
- [x] 6.2 Host receives the prompt and can: - `MarkSeatAi {slotId, aiProfile?}` → flips seat to AI, clears
      pending, broadcasts `LobbyUpdated` + `MatchResumed` - `ForfeitMatch {}` → concedes the host's opposite side and ends
      the match with `GameEnded`
- [ ] 6.3 If the host does not respond within 60 seconds of the timeout
      prompt, default behavior is `'replace-with-ai'` → deferred:
      match remains paused indefinitely until host acts; auto-default
      timer is a follow-up

## 7. Identity-Gated Rejoin

- [x] 7.1 A reconnect with a `playerId` that does not match the
      timed-out seat's last known occupant is rejected _(via the
      Wave 2 token-verified upgrade path; `attachSocket` only clears
      pending for the verified `playerId`)_
- [ ] 7.2 If the match has `replaced-by-ai` for that seat, the seat's
      original `playerId` cannot reclaim it during the match →
      deferred: implicit reject (a non-`human` seat will not match
      the pending lookup); explicit "seat replaced by AI" error is
      a follow-up
- [x] 7.3 The match meta retains the original `playerId` so
      post-match summaries correctly attribute performance _(seats are
      not nulled on drop; only on `MarkSeatAi` does occupant flip)_

## 8. Multi-Device Reconnect

- [ ] 8.1 If a player's old socket is still open and they reconnect
      from a second device with the same `playerId`, the old socket
      is closed first → deferred: canonical drop-then-reconnect
      works; multi-device-same-player supersede is a follow-up
- [ ] 8.2 This supports "laptop → phone while afk" scenarios →
      deferred: depends on 8.1
- [ ] 8.3 Close reason sent to old socket: `Close {reason: 'SUPERSEDED
_BY_NEW_SESSION'}` → deferred: depends on 8.1

## 9. Client Auto-Reconnect

- [x] 9.1 `src/lib/multiplayer/client.ts` gains an auto-reconnect loop
      with exponential backoff starting at 1s, cap 30s _(landed in
      Wave 1; verified in this change)_
- [x] 9.2 Client persists `lastSeq` in memory so reconnect resumes at
      the right place _(state.lastSeq high-water mark; passed in
      SessionJoin envelope)_
- [ ] 9.3 Client emits `reconnecting` / `reconnected` / `reconnect-
failed` lifecycle events the UI can surface → deferred: only
      `reconnect` is emitted today; richer lifecycle hooks are a
      UX follow-up

## 10. UI Indicators

- [ ] 10.1 Combat page shows a banner when the match is paused:
      `"Paused: waiting for <PlayerName> to reconnect (NN seconds
remaining)"` → deferred: combat page UI not yet built
- [ ] 10.2 Seat pips in the scoreboard reflect `connectionStatus`
      colors → deferred: depends on 10.1 + UI indicator pass
- [ ] 10.3 Host sees the grace-timeout prompt as a modal with the
      three fallback options → deferred: depends on 10.1; host
      currently must invoke `MarkSeatAi` / `ForfeitMatch` programmat-
      ically through `useMultiplayerSession`

## 11. Tests

- [x] 11.1 Integration test: player disconnects mid-turn, match
      pauses, player reconnects, match resumes at the same event
      _(reconnectionFlow.test.ts)_
- [x] 11.2 Integration test: player times out; host selects
      `MarkSeatAi`, match resumes _(reconnectionFlow.test.ts)_
- [x] 11.3 Integration test: host `ForfeitMatch` ends the match
      cleanly with a `GameEnded` event _(reconnectionFlow.test.ts)_
- [ ] 11.4 Integration test: server restart with an active match;
      client reconnects and receives the full log replay → deferred:
      requires persistent store (proposal non-goal)
- [ ] 11.5 Integration test: multi-device reconnect closes the old
      socket with `SUPERSEDED_BY_NEW_SESSION` → deferred: see 8.1

## 12. Spec Compliance

- [ ] 12.1 Every requirement in the `multiplayer-server` delta has at
      least one GIVEN/WHEN/THEN scenario → deferred: scenario
      backfill at archive time
- [ ] 12.2 Every requirement in the `game-session-management` delta
      has at least one GIVEN/WHEN/THEN scenario → deferred: same as
      12.1
- [ ] 12.3 Every requirement in the `auto-save-persistence` delta has
      at least one GIVEN/WHEN/THEN scenario → deferred: same as 12.1
- [ ] 12.4 `openspec validate add-reconnection-and-session-rehydration
--strict` passes clean → deferred: run as part of archive step
      (non-strict validate run during this audit pass)
