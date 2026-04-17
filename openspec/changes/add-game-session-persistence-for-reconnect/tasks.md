# Tasks: Add Game Session Persistence for Reconnect

## 1. IndexedDB Schema

- [ ] 1.1 Add `matchLogStorage.ts` in `src/lib/p2p/` wrapping IndexedDB
      with an object store `matchEvents`
- [ ] 1.2 Record shape: `{matchId: string, sequence: number, event:
    IGameEvent, savedAt: ISO8601}`; primary key `[matchId, sequence]`
- [ ] 1.3 Add a `matches` object store for metadata:
      `{matchId, hostPeerId, guestPeerId, status, lastActivity}`
- [ ] 1.4 Writes SHALL be batched (single txn per animation frame)
- [ ] 1.5 Add migration path for existing IndexedDB schema

## 2. Persistence Wiring

- [ ] 2.1 `InteractiveSession.appendEvent` on both host and guest writes
      to IndexedDB after the in-memory append succeeds
- [ ] 2.2 `IGameSession` carries a `matchId` (already present after
      `add-game-session-invite-and-lobby-1v1`)
- [ ] 2.3 Persistence is fire-and-forget but errors are logged; state
      mismatch between disk and memory is surfaced as a toast

## 3. Hydration From Log

- [ ] 3.1 `InteractiveSession.fromMatchLog(matchId)` reads all events
      from IndexedDB and rebuilds the session
- [ ] 3.2 Hydration replays events into `deriveState` in sequence
- [ ] 3.3 Unit test: a session saved then hydrated produces an
      identical `currentState`

## 4. Reconnect Protocol (Guest → Host)

- [ ] 4.1 On page load, if URL has a `matchId`, guest opens the sync
      room and sends `{kind: 'reconnect-request', matchId,
    lastLocalSeq}`
- [ ] 4.2 Host responds with `{kind: 'replay-stream', events:
    IGameEvent[]}` containing all events with `seq > lastLocalSeq`
- [ ] 4.3 Guest applies the replayed events in order via `appendEvent`
- [ ] 4.4 If the host is not present within 10 seconds, the guest falls
      back to hydrate-from-local-log and enters a `HostPending` local
      state

## 5. Peer Pending Local Status

- [ ] 5.1 Add `localMatchStatus: 'live' | 'guestPending' | 'hostPending'
    | 'aborted'` to `useGameplayStore`
- [ ] 5.2 Host sets `guestPending` when the guest's Yjs awareness is
      lost and the match is mid-play
- [ ] 5.3 Guest sets `hostPending` when the host's Yjs awareness is lost
      but the local log is preserved
- [ ] 5.4 `localMatchStatus` is a local UI concern; it is NOT written
      to the session event log

## 6. Grace Window

- [ ] 6.1 Grace window defaults to 60 seconds (configurable per match)
- [ ] 6.2 During the grace window, the host pauses phase advancement
      and shows a banner: `"Waiting for opponent to reconnect
    (NN seconds remaining)..."`
- [ ] 6.3 If grace expires: host appends `GameEnded` with `reason:
    'aborted'`; the session enters `Completed` normally
- [ ] 6.4 If the guest reconnects within the grace window, `localMatch
    Status` returns to `'live'` and play resumes

## 7. Host-Side Replay API

- [ ] 7.1 Host exposes `getEventsFromSeq(seq: number): IGameEvent[]`
      from its in-memory log
- [ ] 7.2 Replay response is streamed in chunks of 64 events max per
      message to avoid large single messages
- [ ] 7.3 Host rejects `reconnect-request` if `matchId` doesn't match
      the host's current session

## 8. Guest-Side Late Join

- [ ] 8.1 If a guest loads a lobby URL after the match has launched and
      they were the original guest, the reconnect protocol activates
      automatically
- [ ] 8.2 If a different peer tries to join a running 1v1 session, the
      host rejects them with `"Match in progress"`

## 9. Persistence Cleanup

- [ ] 9.1 On `GameEnded`, mark the match metadata as `status:
    'completed'` but retain the event log for 7 days
- [ ] 9.2 Add a `purgeOldMatches()` helper that deletes match logs
      older than 7 days on app startup
- [ ] 9.3 Manual purge via debug console (`window.__mekstationDebug`)

## 10. Tests

- [ ] 10.1 Unit test: save 20 events, hydrate, verify `currentState`
- [ ] 10.2 Integration test using mock sync: guest drops after turn 3
      event 5, reconnects, catches up to turn 4 event 9
- [ ] 10.3 Integration test: guest drops, grace window expires, host
      match ends with `aborted`
- [ ] 10.4 Integration test: host drops, guest holds its local log,
      host returns, guest catches up from host's log

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `multiplayer-sync` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in the `auto-save-persistence` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 11.3 Every requirement in the `game-session-management` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 11.4 `openspec validate add-game-session-persistence-for-reconnect
    --strict` passes clean
