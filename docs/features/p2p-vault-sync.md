# P2P Vault Sync

Real-time peer-to-peer synchronization for sharing units, pilots, and forces between players.

## Overview

P2P Vault Sync enables players to share and collaborate on vault items in real-time without relying on a central server. Built on WebRTC and CRDTs (Conflict-free Replicated Data Types), it provides:

- **Real-time sync**: Changes propagate to all connected peers within seconds
- **Offline support**: Local changes persist and sync when reconnected
- **Conflict-free**: CRDT-based merge ensures data consistency
- **Privacy-first**: Direct peer connections, no data stored on servers

## Quick Start

### Creating a Room

1. Navigate to **Settings > Sync**
2. Click **Create Room**
3. Share the displayed room code with others

### Joining a Room

1. Navigate to **Settings > Sync**
2. Enter the room code (e.g., `ABC-DEF`)
3. Click **Join Room**

### Syncing Items

1. Open any vault item (unit, pilot, or force)
2. Toggle **Enable Sync** on the item
3. The item will automatically sync with all connected peers

## Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| P2P Layer | y-webrtc | WebRTC connections via signaling servers |
| CRDT Engine | Yjs | Conflict-free data synchronization |
| Persistence | y-indexeddb | Offline storage and recovery |
| State | Zustand | React state management |

### Connection Flow

```
┌─────────────┐     Signaling     ┌─────────────┐
│   Peer A    │◄──────────────────►│   Peer B    │
│             │                    │             │
│  ┌───────┐  │     WebRTC        │  ┌───────┐  │
│  │ Y.Doc │◄─┼────────────────────┼─►│ Y.Doc │  │
│  └───────┘  │    (direct P2P)   │  └───────┘  │
│      │      │                    │      │      │
│  ┌───────┐  │                    │  ┌───────┐  │
│  │IndexDB│  │                    │  │IndexDB│  │
│  └───────┘  │                    │  └───────┘  │
└─────────────┘                    └─────────────┘
```

1. Peers connect to signaling servers to discover each other
2. WebRTC data channel established for direct communication
3. Yjs documents sync bidirectionally via CRDT operations
4. IndexedDB provides offline persistence

### Room Codes

Room codes are 6-character alphanumeric identifiers:

- **Format**: `ABCDEF` or `ABC-DEF` (with optional hyphen)
- **Characters**: A-Z (no I, O) and 2-9 (no 0, 1) - 32 chars
- **Combinations**: 32^6 = ~1 billion unique codes
- **Case-insensitive**: `abc-def` = `ABC-DEF`

See [Room Code Format](./room-codes.md) for technical details.

## Features

### Selective Sync

Not all items sync automatically. Each vault item has a sync toggle:

- **Enabled**: Item syncs with all connected peers
- **Disabled**: Item stays local only

This allows you to share specific builds while keeping others private.

### Import from Peer

See an item you like? Import creates a local copy:

1. View peer's synced items in the peer list
2. Click **Import** on the desired item
3. A copy is created in your local vault (sync disabled)

The imported item is independent - changes won't sync back.

### Connection Status

The sync indicator shows current status:

| Status | Meaning |
|--------|---------|
| Connected (green) | Active connection to room |
| Connecting (yellow) | Establishing connection |
| Disconnected (gray) | Not in any room |
| Retrying (orange) | Connection lost, attempting reconnect |

### Automatic Reconnection

If connection drops, the system automatically:

1. Detects disconnection
2. Attempts reconnection with exponential backoff
3. Shows retry progress in UI
4. Syncs any missed changes on reconnect

Maximum 5 retry attempts before giving up.

## API Reference

### SyncProvider

```typescript
import {
  createSyncRoom,
  joinSyncRoom,
  leaveCurrentRoom,
  getConnectionState,
  getConnectedPeerCount,
  onSyncEvent,
} from '@/lib/p2p/SyncProvider';

// Create a new room
const room = createSyncRoom({ password?: string });
console.log(room.roomCode); // e.g., "ABCDEF"

// Join existing room
const room = joinSyncRoom('ABCDEF', password?);

// Leave current room
leaveCurrentRoom();

// Check connection
const state = getConnectionState(); // 'connected' | 'connecting' | 'disconnected'
const peers = getConnectedPeerCount();

// Listen to events
const unsubscribe = onSyncEvent((event) => {
  switch (event.type) {
    case 'connected': // Joined room
    case 'disconnected': // Left room
    case 'peer-joined': // New peer connected
    case 'peer-left': // Peer disconnected
    case 'error': // Error occurred
  }
});
```

### useSyncedVaultStore

```typescript
import { useSyncedVaultStore } from '@/lib/p2p/useSyncedVaultStore';

const {
  items,           // Record<string, ISyncableVaultItem>
  addItem,         // (item) => void
  removeItem,      // (id) => void
  updateItem,      // (id, data) => void
  toggleSync,      // (id, enabled) => void
  importFromPeer,  // (item) => newId
  getItemsByType,  // (type) => items[]
  getSyncState,    // (id) => SyncState
} = useSyncedVaultStore();
```

## Troubleshooting

See [Troubleshooting Guide](./sync-troubleshooting.md) for common issues and solutions.

## Security Considerations

- **No central server**: Data flows directly between peers
- **Optional encryption**: Rooms can have passwords for encryption
- **Signaling only**: Servers only help establish connections, don't see data
- **Local control**: You choose what to sync

## Limitations

- **Browser support**: Requires WebRTC (all modern browsers)
- **Network**: Peers must be able to establish WebRTC connections
- **Scale**: Optimized for small groups (< 20 peers)
- **Persistence**: Data persists per-room, clearing browser data loses offline cache
