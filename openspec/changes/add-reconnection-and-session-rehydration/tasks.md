# Tasks: Add Reconnection and Session Rehydration (Server)

## 1. Connection Lifecycle Model

- [ ] 1.1 Extend `IMatchSeat` with `connectionStatus: 'connected' |
'pending' | 'timed-out' | 'replaced-by-ai'`
- [ ] 1.2 Transitions: on WebSocket attach → `connected`; on socket
      close → `pending`; on grace timer expiry → `timed-out`;
      post-fallback → `replaced-by-ai`
- [ ] 1.3 `connected` seats appear in the UI with a green dot; `pending`
      with a yellow pulse; `timed-out` with a red dot

## 2. Grace Window Configuration

- [ ] 2.1 `IMatchMeta.config.reconnectGraceSeconds` defaults to 120
- [ ] 2.2 Grace timer starts per-seat on disconnect; resets on
      reconnect
- [ ] 2.3 Host may adjust the grace window via
      `Intent {kind: 'SetGraceWindow', seconds}`, clamped to `[30,
600]`; can NOT be adjusted once a timer is already running for
      that seat

## 3. Server-Side Persistence Hooks

- [ ] 3.1 `ServerMatchHost` persists every appended event through the
      `IMatchStore.appendEvent` call before broadcasting
- [ ] 3.2 On server restart, hosts load their session from the store
      (via `IMatchStore.getEvents`) before accepting new connections
- [ ] 3.3 A health check endpoint `/api/multiplayer/matches/:id/status`
      returns `{status, seats, connectionStatuses, lastEventSeq}` for
      monitoring dashboards

## 4. Reconnect Handshake

- [ ] 4.1 Client reconnect: opens a WebSocket with a valid token and
      sends `SessionJoin {matchId, playerId, lastSeq}`
- [ ] 4.2 Server verifies `playerId` matches a seat whose
      `connectionStatus` is `'pending'`
- [ ] 4.3 Server re-binds the socket to that seat and transitions the
      seat to `'connected'`
- [ ] 4.4 Server streams events from `lastSeq+1` via `ReplayStart` +
      chunks + `ReplayEnd`

## 5. Pause/Resume Mechanics

- [ ] 5.1 If any human seat's `connectionStatus` is `'pending'`, the
      server does NOT advance phases or process intents from other
      clients
- [ ] 5.2 Exception: host can override with `Intent {kind: 'ProceedWith
outPending'}` — matches the 4b checkpoint's "AI fills empty
      slots" posture
- [ ] 5.3 Paused matches broadcast an `Event {type: 'match_paused',
payload: {pendingSeats, graceRemaining}}`
- [ ] 5.4 Resumed matches broadcast `Event {type: 'match_resumed'}`

## 6. Grace Timeout Fallback

- [ ] 6.1 When a seat's grace timer expires, server sets
      `connectionStatus: 'timed-out'` and broadcasts a `match_seat_
timed_out` event
- [ ] 6.2 Host receives an intent prompt offering three options: - `'forfeit-side'` → ends the match with the opposite side
      winning - `'replace-with-ai'` → marks the seat `replaced-by-ai`, spawns
      a bot, match resumes - `'wait-longer'` → extends the grace timer by another
      `reconnectGraceSeconds`
- [ ] 6.3 If the host does not respond within 60 seconds of the timeout
      prompt, default behavior is `'replace-with-ai'`

## 7. Identity-Gated Rejoin

- [ ] 7.1 A reconnect with a `playerId` that does not match the
      timed-out seat's last known occupant is rejected
- [ ] 7.2 If the match has `replaced-by-ai` for that seat, the seat's
      original `playerId` cannot reclaim it during the match
- [ ] 7.3 The match meta retains the original `playerId` so
      post-match summaries correctly attribute performance

## 8. Multi-Device Reconnect

- [ ] 8.1 If a player's old socket is still open and they reconnect
      from a second device with the same `playerId`, the old socket
      is closed first
- [ ] 8.2 This supports "laptop → phone while afk" scenarios
- [ ] 8.3 Close reason sent to old socket: `Close {reason: 'SUPERSEDED
_BY_NEW_SESSION'}`

## 9. Client Auto-Reconnect

- [ ] 9.1 `src/lib/multiplayer/client.ts` gains an auto-reconnect loop
      with exponential backoff starting at 1s, cap 30s
- [ ] 9.2 Client persists `lastSeq` in memory so reconnect resumes at
      the right place
- [ ] 9.3 Client emits `reconnecting` / `reconnected` / `reconnect-
failed` lifecycle events the UI can surface

## 10. UI Indicators

- [ ] 10.1 Combat page shows a banner when the match is paused:
      `"Paused: waiting for <PlayerName> to reconnect (NN seconds
remaining)"`
- [ ] 10.2 Seat pips in the scoreboard reflect `connectionStatus`
      colors
- [ ] 10.3 Host sees the grace-timeout prompt as a modal with the
      three fallback options

## 11. Tests

- [ ] 11.1 Integration test: player disconnects mid-turn, match
      pauses, player reconnects, match resumes at the same event
- [ ] 11.2 Integration test: player times out; host selects `'replace-
with-ai'`, match resumes with a bot
- [ ] 11.3 Integration test: player times out; host selects `'forfeit-
side'`, match ends cleanly
- [ ] 11.4 Integration test: server restart with an active match;
      client reconnects and receives the full log replay
- [ ] 11.5 Integration test: multi-device reconnect closes the old
      socket with `SUPERSEDED_BY_NEW_SESSION`

## 12. Spec Compliance

- [ ] 12.1 Every requirement in the `multiplayer-server` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 12.2 Every requirement in the `game-session-management` delta
      has at least one GIVEN/WHEN/THEN scenario
- [ ] 12.3 Every requirement in the `auto-save-persistence` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 12.4 `openspec validate add-reconnection-and-session-rehydration
--strict` passes clean
