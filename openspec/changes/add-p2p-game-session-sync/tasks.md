# Tasks: Add P2P Game Session Sync

## 1. Channel Primitives

- [ ] 1.1 Add `gameSessionChannel.ts` in `src/lib/p2p/` that exposes
      `broadcastEvent(event: IGameEvent)` and `onPeerEvent(cb)`
- [ ] 1.2 Channel rides on the existing Yjs room; events go through a
      dedicated `gameEvents` Y.Array so the customizer-tab sync is
      unaffected
- [ ] 1.3 Channel serializes/deserializes `IGameEvent` with the same
      schema used by `event-store` persistence
- [ ] 1.4 Channel rejects events authored by the local peer on arrival
      (don't re-apply own events)

## 2. Host Election

- [ ] 2.1 Room creator is marked `role: 'host'` in Yjs awareness
- [ ] 2.2 Room joiner is `role: 'guest'`; second joiner is rejected (1v1
      only in this change)
- [ ] 2.3 A `HostPromoted` / `GuestJoined` lifecycle event is logged
      locally (not part of session event stream)

## 3. Host-Authoritative RNG

- [ ] 3.1 Host engine uses the existing default `DiceRoller`
- [ ] 3.2 Guest engine uses a new `replayDiceRoller` that pops rolls off a
      queue populated from incoming events' `payload.rolls`
- [ ] 3.3 Every event the host generates that consumed dice includes the
      rolled values in the event payload so the guest mirror can replay
      them deterministically
- [ ] 3.4 Unit test: a seeded host session and a guest session consuming
      its events produce identical `currentState` at every step

## 4. Mirror Session on Guest

- [ ] 4.1 Guest creates a session object from the same config as the host
- [ ] 4.2 Guest rejects any local event append; all state changes come
      from the peer channel
- [ ] 4.3 Guest's `InteractiveSession` exposes the same read API as host
- [ ] 4.4 Guest's UI can still `selectedUnitId` / hover / inspect, but
      the "Commit" buttons submit an intent event through the peer
      channel instead of calling `appendEvent` directly

## 5. Intent Events (Guest → Host)

- [ ] 5.1 Define `IGameIntent` = `{type, payload, authorPeerId}` for
      actions the guest wants the host to execute
- [ ] 5.2 Guest UI produces intents for `declareMovement`,
      `declareAttack`, `declarePhysical`, `confirmHeat`, `endPhase`,
      `concede`
- [ ] 5.3 Host consumes intents and translates them into appended events
      after running the normal validation / rule engine
- [ ] 5.4 Host rejects intents that would modify units the guest does not
      control; rejection produces a `peer-rejected` local toast

## 6. Side Ownership

- [ ] 6.1 `IGameSession` gains an optional `sideOwners: Record<GameSide,
    string>` field mapping side → peerId
- [ ] 6.2 Skirmish setup screen with "Networked 1v1" lets host pick which
      side they control; the other side is auto-assigned to the guest
- [ ] 6.3 UI disables any control that would modify a unit whose side is
      not owned by the local peer

## 7. Disconnect Handling

- [ ] 7.1 Host disconnect detected via Yjs awareness loss; guest's
      session fires `GameEnded` with `reason: 'aborted'`
- [ ] 7.2 Guest disconnect puts the session in a `PeerPending` local
      status but does NOT end the game; host continues and buffers
      events for reconnect (handled in
      `add-game-session-persistence-for-reconnect`)

## 8. Skirmish Setup Integration

- [ ] 8.1 Setup screen adds a side option `Networked 1v1`
- [ ] 8.2 Selecting it requires an active sync room; otherwise the
      "Launch" button is disabled
- [ ] 8.3 After launch, both peers render the combat surface without
      either of them hot-seating

## 9. Validation & Tests

- [ ] 9.1 Integration test using the `MockSyncProvider` with two mirror
      sessions: host fires initiative, attack, damage; guest mirror
      produces identical state
- [ ] 9.2 Integration test: guest intent to move produces a host-appended
      MovementLocked event visible in both sessions
- [ ] 9.3 Integration test: host disconnect ends the guest's session
      with `reason: 'aborted'`

## 10. Spec Compliance

- [ ] 10.1 Every requirement in the `multiplayer-sync` ADDED delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 10.2 Every requirement in the `game-session-management` MODIFIED
      delta has at least one GIVEN/WHEN/THEN scenario
- [ ] 10.3 `openspec validate add-p2p-game-session-sync --strict`
      passes clean
