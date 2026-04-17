# Tasks: Add Game Session Invite and Lobby (1v1)

## 1. Lobby State Contract

- [ ] 1.1 Define `ILobbyState` with `{mode: '1v1', hostPeerId,
    guestPeerId, hostLoadout, guestLoadout, mapConfig, hostReady,
    guestReady, matchId?}`
- [ ] 1.2 Define `ILoadout` with `{units: ISelectedUnit[],
    pilots: ISelectedPilot[]}` for a single side
- [ ] 1.3 Define `IMapConfig` with `{radius: number, terrainPreset:
    string, turnLimit: number}`
- [ ] 1.4 Schema validation (zod) for incoming lobby updates from
      remote peers

## 2. Lobby Channel

- [ ] 2.1 Add `lobbyChannel.ts` that wraps a Y.Map named `lobby` in the
      existing sync room
- [ ] 2.2 Channel exposes `getState()`, `updateLoadout(side, loadout)`,
      `updateMapConfig(config)`, `setReady(peerId, ready)`, `launch()`
- [ ] 2.3 Channel rejects updates authored by a peer for a loadout slot
      they don't own
- [ ] 2.4 Store mirrors lobby state in Zustand so UI can render
      reactively

## 3. Lobby Page

- [ ] 3.1 Add route `/gameplay/lobby/[roomCode]`
- [ ] 3.2 Page renders two loadout cards (host / guest), the map config
      panel, and two ready toggles
- [ ] 3.3 Cards for the local peer are editable; the remote peer's card
      is read-only (shows what they've picked so far)
- [ ] 3.4 A shareable room code is prominently displayed with
      copy-to-clipboard

## 4. Loadout Picker

- [ ] 4.1 Each peer picks 1–4 mechs from their own vault
- [ ] 4.2 Each peer picks 1 pilot per mech from their own vault
- [ ] 4.3 Picks publish to the lobby channel on change
- [ ] 4.4 Invalid loadouts (no mechs, pilot count mismatch) disable the
      ready toggle
- [ ] 4.5 For 4a scope, mech counts between the two sides must match
      (1v1, 2v2, up to 4v4)

## 5. Map Config

- [ ] 5.1 Host picks map radius, terrain preset, turn limit
- [ ] 5.2 Guest can see but not change map config
- [ ] 5.3 Changes propagate in real time via the lobby channel

## 6. Readiness + Launch

- [ ] 6.1 Each peer toggles their own ready flag
- [ ] 6.2 When both peers are ready, host sees a "Launch Match" button
- [ ] 6.3 Clicking launch: host creates the session with both loadouts,
      writes `matchId` into lobby state, both peers navigate to
      `/gameplay/games/[matchId]`
- [ ] 6.4 Guest cannot launch; button is host-only

## 7. Invite Flow

- [ ] 7.1 Adding "Networked 1v1" to the skirmish setup (from
      `add-p2p-game-session-sync`) now routes to a newly created lobby
      instead of launching directly
- [ ] 7.2 Joining a networked match: user enters a room code in the
      existing sync-join UI; if the room has an active lobby, the UI
      routes to `/gameplay/lobby/[roomCode]`

## 8. Guest Assignment

- [ ] 8.1 On guest join, the first unassigned side slot is assigned
      (`hostPeerId` owns one side, `guestPeerId` owns the other)
- [ ] 8.2 The host side is chosen at room creation; guest gets the
      remaining side
- [ ] 8.3 Assignment writes `sideOwners` on the eventual session

## 9. Disconnect Mid-Lobby

- [ ] 9.1 If either peer disconnects before launch, their ready flag
      auto-resets to false
- [ ] 9.2 If the host disconnects, the lobby closes and the guest is
      kicked back to the landing page with a toast
- [ ] 9.3 If the guest disconnects, the host sees "Waiting for
      opponent..." until a new guest joins

## 10. Tests

- [ ] 10.1 Integration test: host creates lobby, guest joins, both pick
      loadouts, both ready, host launches, both land on the combat page
- [ ] 10.2 Integration test: host disconnect closes the lobby
- [ ] 10.3 Integration test: guest cannot modify the host's loadout
- [ ] 10.4 Integration test: third peer joining the room cannot join
      the 1v1 lobby

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `multiplayer-sync` delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in the `game-session-management` delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 11.3 `openspec validate add-game-session-invite-and-lobby-1v1
    --strict` passes clean
