# Change: Add P2P Game Session Sync

## Why

**Sub-phase 4a.** Phase 4 targets 2–8 player multiplayer, but a
server-authoritative backend is a multi-month lift. The existing Yjs /
WebRTC infrastructure (`src/lib/p2p/`, `useSyncRoomStore`) already
synchronizes vault items and customizer tabs between peers with a 6-char
room code. Because `gameSessionCore.ts` is already event-sourced, the
fastest path to a playable 1v1 networked match is to broadcast each
appended `IGameEvent` to a single remote peer and apply it to their
mirror session. This sub-phase delivers real two-machine play before the
server architecture is even designed, and validates the event-sync model
that 4b will formalize server-side.

## What Changes

- Introduce `multiplayer-sync` spec describing peer-event replication
  semantics for `IGameSession`
- Wire the existing Yjs room infrastructure to carry a new channel that
  transmits `IGameEvent` deltas in arrival order
- Local engine appends an event, channel broadcasts to peer, peer's
  mirror session applies it via the existing `appendEvent` reducer
- The peer who created the match is the "host": all random rolls
  (initiative, to-hit, hit location, cluster, crit, consciousness) are
  generated only on the host's engine; the guest's `DiceRoller` is
  replaced by a deterministic replayer that consumes rolls received from
  the host's events
- Host disconnect ends the session with `reason: 'aborted'`; guest
  disconnect produces a reconnect window (see
  `add-game-session-persistence-for-reconnect`)
- Add a "Networked 1v1" side to the skirmish setup screen that requires a
  connected peer before launch

## Dependencies

- **Requires**: Phase 1 MVP changes (`add-skirmish-setup-ui`,
  `add-interactive-combat-core-ui`, `wire-*` rule-accuracy changes),
  existing `p2p-sync-system`, `game-session-management`, `api-layer`,
  `dice-system`
- **Required By**: `add-game-session-invite-and-lobby-1v1`,
  `add-game-session-persistence-for-reconnect`,
  `add-multiplayer-server-infrastructure` (4b validates this sync model)

## Impact

- Affected specs: `game-session-management` (MODIFIED — host-authoritative
  roll semantics, peer-mirror sessions, abort condition),
  `multiplayer-sync` (ADDED — peer event replication), `api-layer`
  (ADDED — no new HTTP routes, but P2P channel contracts are documented)
- Affected code: new `src/lib/p2p/gameSessionChannel.ts`, extension of
  `src/engine/InteractiveSession.ts` with mirror-mode, extension of
  `src/stores/useGameplayStore.ts` for peer-event intake, new
  `src/utils/gameplay/replayDiceRoller.ts`
- Non-goals: 3+ players, server persistence, fog of war, cheating
  resistance beyond "both peers run the same engine build"
