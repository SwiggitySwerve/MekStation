# M-M6 P2P closed-lobby guards

## Why

`canLaunchLobby` ignores `closed`, so a closed lobby can still be readied, have
its loadout edited and be launched. The host never reacts when a guest marks the
lobby `closed`, and `closed` persists in IndexedDB with the room doc, so a
returning host (whose awareness-client-id `hostPeerId` is new every session)
gets a permanently closed lobby.

## What Changes

- `canLaunchLobby` is false when `closed`; the channel rejects join, ready,
  loadout, map, host-side and launch with a local `lobby-closed` reason; the
  panel shows "This lobby is closed" and disables its controls.
- `handlePeerDisconnect` is a no-op when the disconnected peer is the local peer
  or the lobby is already closed.
- On a host route a `closed`, unlaunched lobby is replaced with a fresh lobby
  (Root decision D2: loadouts and ready flags are discarded).

## Impact

`GameLobbyInterfaces.ts`, `lobbyChannel.ts`, `useLobbyStore.ts`, the gameplay
`LobbyPanel`, `gameplayLobbyPage.helpers.tsx` and the lobby page. No wire,
schema or persistence change: `closed` is already an optional schema field and
`lobby-closed` is a local rejection that is never serialised. An old guest may
still write `closed`; a new host reopens it. An old host ignores it as today.

## Non-goals

The WebSocket-server lobby (M-H2 / M-H3), the stale `hostPeerId` of any
non-closed persisted lobby, and a channel method for reopening that keeps
loadouts.
