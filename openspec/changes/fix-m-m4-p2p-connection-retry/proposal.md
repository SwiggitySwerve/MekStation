# M-M4 P2P connection retry

## Why

y-webrtc 10.3.0 emits `status {connected:false}` only from an explicit
`disconnect()` call, never from network loss. `SyncProvider` listens for that
event to start its retry, and its own teardown calls `disconnect()`. Leaving a
room, or switching to another one, therefore scheduled a retry that rebuilt
the room the user had just left (with the default signaling servers, dropping
any custom ones), reported "Retrying..." as `ConnectionState.Error`, and left
the store showing Connected with no room.

## What Changes

- Intentional teardown cancels the pending retry and can never schedule one.
  Creating a room cancels a retry pending for the previous room.
- A retry re-arms the same provider (`connect()`) instead of rebuilding the
  room: the Yjs document, observers and room options survive, and no
  `disconnected` event is emitted.
- A retry emits a new in-process `reconnecting` event, not `error`. Exhausted
  retries still emit `error`.
- The store keeps its room and shows Connecting while reconnecting, ignores a
  `connected` event for a room it does not hold, and always asks the provider
  to leave (the provider can hold a room the store forgot).
- Toasts and the connection quality indicator show "Reconnecting".

## Impact

`src/lib/p2p/SyncProvider.ts`, `types.ts` (`SyncEvent`), `useSyncRoomStore.ts`,
`useSyncToasts.ts`, `ConnectionQualityIndicator.tsx`. No wire, schema,
persistence or replay changes; `reconnecting` is a local event only.

## Non-goals

Detecting real signaling drops (follow-up), `SyncState.Synced/Syncing/Conflict`
(still unassigned), and the lobby and reconnect-session fixes (M-M5, M-M6).
