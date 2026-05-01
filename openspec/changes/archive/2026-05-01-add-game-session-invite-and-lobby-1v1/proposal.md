# Change: Add Game Session Invite and Lobby (1v1)

## Why

**Sub-phase 4a.** `add-p2p-game-session-sync` delivers the wire
protocol, but players also need a way to meet in a room, pick their
mechs + pilots, agree on map config, and launch together. The existing
sync-room UI already handles room codes for vault sharing; Phase 4a
reuses that flow and extends it with a pre-battle lobby panel where the
host and guest assemble a match before the first event is appended. No
lobby UI means no usable P2P demo, even though the transport works.

## What Changes

- Add a lobby view at `/gameplay/lobby/[roomCode]` that the host lands
  on after creating a "Networked 1v1" match
- Add a lobby join flow: guest enters a room code, sees the lobby, gets
  assigned to the open side
- Both peers pick their side's mechs + pilots from their own vault; the
  picks are shared over the Yjs room as lobby state (Y.Map), so both
  peers see the same loadout
- Host picks map radius, terrain preset, and turn limit; those are
  likewise shared
- "Ready" flags: each peer toggles ready; when both are ready, the host
  launches the match and the session is created with both loadouts
  deployed per side
- Pre-battle deployment zone selection is deferred to the MVP's existing
  Phase 1 `add-skirmish-setup-ui` rules (fixed zones per side)

## Dependencies

- **Requires**: `add-p2p-game-session-sync` (provides peer channel),
  existing `p2p-sync-system` (room codes + Yjs), existing
  `add-skirmish-setup-ui` (Phase 1 single-player setup is the fallback
  template)
- **Required By**: `add-game-session-persistence-for-reconnect`
  (reconnect re-enters at the lobby or active match depending on state),
  `add-multiplayer-lobby-and-matchmaking-2-8` (4b generalizes to 2–8)

## Impact

- Affected specs: `multiplayer-sync` (ADDED — lobby state and readiness
  protocol), `game-session-management` (MODIFIED — session creation
  accepts peer-sourced loadouts)
- Affected code: new `src/pages/gameplay/lobby/[roomCode].tsx`, new
  `src/components/gameplay/lobby/LobbyPanel.tsx`, new
  `src/lib/p2p/lobbyChannel.ts` (Y.Map wrapper), extension of
  `src/stores/useGameplayStore.ts` with a lobby slice
- Non-goals: 3+ players (4b), spectator slots (4b), chat (out of scope),
  custom deployment zone painting
