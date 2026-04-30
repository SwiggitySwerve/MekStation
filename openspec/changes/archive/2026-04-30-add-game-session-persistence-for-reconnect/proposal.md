# Change: Add Game Session Persistence for Reconnect

## Why

**Sub-phase 4a.** Networked matches will lose peers to flaky wifi, laptop
sleep, and accidental browser refreshes. Because `gameSessionCore` is
event-sourced, a client can be fully re-hydrated from the event log —
but only if the log exists locally and can be fetched from the
authoritative host on reconnect. Today, session events live in memory
only. Without persistence, a guest who refreshes the tab is dropped from
the match entirely. This change adds (1) local IndexedDB persistence of
the match event log on both peers, (2) a host-served event-log replay
so a reconnecting guest can catch up, and (3) an on-session "peer
pending" status the host enters when the guest drops.

## What Changes

- Persist every appended event to IndexedDB under `match:[matchId]` on
  both host and guest
- On page reload, if a match id is present in the URL, the local session
  is re-hydrated from IndexedDB first, then reconciled with the peer
- Host maintains an in-memory event log and exposes `replayEvents(fromSeq)`
  over the peer channel
- Guest on reconnect requests events `fromSeq = localHighestSeq + 1`;
  host streams missing events; guest applies them to catch up
- Host adds a local `PeerPending` match status when the guest is absent;
  match does NOT auto-end on transient disconnect (30-second grace
  window before the host falls back to "continue solo vs AI" or
  `reason: 'aborted'`)
- Reconnect window is configurable; default 60 seconds

## Dependencies

- **Requires**: `add-p2p-game-session-sync` (peer channel + host
  authority), `add-game-session-invite-and-lobby-1v1` (session created
  with a shareable id), existing `auto-save-persistence`,
  `game-session-management`
- **Required By**: `add-reconnection-and-session-rehydration` (4b
  generalizes reconnect to server-authoritative)

## Impact

- Affected specs: `multiplayer-sync` (ADDED — replay protocol, peer
  pending state, reconnect contract), `auto-save-persistence` (MODIFIED
  — adds game-event-log storage path and multi-session support),
  `game-session-management` (MODIFIED — peer-pending local status)
- Affected code: new `src/lib/p2p/matchLogStorage.ts` (IndexedDB
  wrapper), new `src/lib/p2p/reconnectProtocol.ts`, extension of
  `src/engine/InteractiveSession.ts` with hydration-from-log factory,
  extension of `useGameplayStore.ts` for pending-peer status
- Non-goals: server-side persistence (4b), cross-device continue-where-
  you-left (4b), event log compaction
