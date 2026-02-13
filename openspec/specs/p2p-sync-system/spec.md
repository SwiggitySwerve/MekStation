# p2p-sync-system Specification

## Purpose

The P2P Sync System provides peer-to-peer synchronization of vault items (units, pilots, forces) using WebRTC for connectivity and Yjs CRDTs for conflict-free data replication. Users can create or join sync rooms via 6-character room codes, enabling real-time collaboration without centralized servers.

## Scope

**In Scope:**

- Room code generation and validation (6-character alphanumeric, excluding I/O/0/1)
- WebRTC P2P connection management via y-webrtc
- CRDT-based vault synchronization via Yjs Y.Map
- Offline persistence via IndexedDB (y-indexeddb)
- Bidirectional sync between Zustand stores and Yjs documents
- Connection state management (disconnected, connecting, connected, error)
- Automatic reconnection with exponential backoff
- Peer awareness and presence tracking
- Selective item sync (enable/disable per item)
- One-time peer item import (copy without ongoing sync)
- 8 UI components for sync management and status display
- Mock sync provider for E2E testing (BroadcastChannel-based)

**Out of Scope:**

- WebRTC signaling server implementation (uses public y-webrtc servers)
- STUN/TURN server configuration (uses y-webrtc defaults)
- End-to-end encryption beyond optional room passwords
- Conflict resolution UI for manual merge (CRDT auto-merges)
- Sync history or version control
- Bandwidth optimization or compression
- Multi-room simultaneous connections

## Key Concepts

### Room Codes

6-character alphanumeric codes (e.g., `ABC-DEF`) generated using crypto.getRandomValues for secure randomness. Excludes confusing characters (I, O, 0, 1) to prevent transcription errors. Codes are case-insensitive and formatted with hyphen for display.

### CRDT Synchronization

Uses Yjs Y.Map to store vault items as key-value pairs (item ID → item data). CRDTs guarantee eventual consistency: concurrent edits from multiple peers automatically merge without conflicts. Changes propagate via WebRTC data channels.

### Sync States

Items track sync state through lifecycle:

- **Disabled**: Sync not enabled for this item
- **Pending**: Local changes waiting to sync
- **Syncing**: Currently transmitting to peers
- **Synced**: Fully synchronized with all peers
- **Conflict**: Manual resolution needed (reserved for future use)

### Connection Lifecycle

1. **Create/Join**: Generate room code or enter existing code
2. **Connect**: Establish WebRTC connections via signaling servers
3. **Sync**: Bidirectional CRDT sync begins automatically
4. **Disconnect**: Clean shutdown or connection loss triggers reconnect
5. **Destroy**: Explicit leave or max retry exhaustion

### Bidirectional Store Sync

Zustand `useSyncedVaultStore` observes Yjs Y.Map changes and updates local state. Local mutations trigger Y.Map updates wrapped in transactions. This keeps React UI and CRDT document synchronized.

## Requirements

### Requirement: Room Code Generation

The system SHALL generate unique, memorable room codes for P2P sync sessions.

#### Scenario: Generate room code

- **GIVEN** a user creates a new sync room
- **WHEN** the room is created without a specified code
- **THEN** a 6-character alphanumeric code is generated
- **AND** the code excludes confusing characters (I, O, 0, 1)
- **AND** the code uses crypto.getRandomValues for randomness
- **AND** the code is uppercase

#### Scenario: Validate room code

- **GIVEN** a user enters a room code to join
- **WHEN** the code is validated
- **THEN** codes with exactly 6 valid characters are accepted
- **AND** codes with invalid characters (I, O, 0, 1) are rejected
- **AND** codes too short or too long are rejected
- **AND** hyphens and spaces are stripped during normalization

#### Scenario: Format room code for display

- **GIVEN** a raw room code "ABCDEF"
- **WHEN** formatted for display
- **THEN** it is shown as "ABC-DEF" with hyphen separator
- **AND** lowercase input is converted to uppercase

### Requirement: Sync Room Management

The system SHALL manage P2P sync room lifecycle including creation, joining, and cleanup.

#### Scenario: Create sync room

- **GIVEN** a user wants to share their vault
- **WHEN** they create a room with optional password
- **THEN** a Yjs document is created
- **AND** a WebRTC provider is initialized with the room code
- **AND** IndexedDB persistence is enabled for offline support
- **AND** the room becomes the active room
- **AND** connection state transitions to "connecting"

#### Scenario: Join existing room

- **GIVEN** a user has a valid room code
- **WHEN** they join the room with optional password
- **THEN** a Yjs document is created for that room
- **AND** WebRTC provider connects to the room
- **AND** existing room data syncs from peers
- **AND** the user appears in peer lists

#### Scenario: Leave room

- **GIVEN** a user is connected to a room
- **WHEN** they leave the room
- **THEN** the WebRTC provider disconnects
- **AND** IndexedDB persistence is destroyed
- **AND** the Yjs document is destroyed
- **AND** connection state transitions to "disconnected"
- **AND** a "disconnected" event is emitted

#### Scenario: Automatic reconnection

- **GIVEN** a user is connected to a room
- **WHEN** the connection is lost unexpectedly
- **THEN** reconnection attempts begin with exponential backoff
- **AND** retry delays are: 1s, 2s, 4s, 8s, 16s (capped at 30s)
- **AND** jitter (0-20%) is added to prevent thundering herd
- **AND** after 5 failed attempts, reconnection stops
- **AND** error events are emitted with retry progress

### Requirement: CRDT Vault Synchronization

The system SHALL synchronize vault items using Yjs CRDTs for conflict-free replication.

#### Scenario: Sync item to peers

- **GIVEN** a user enables sync for a vault item
- **WHEN** the item is added to the synced vault store
- **THEN** the item is written to the Yjs Y.Map
- **AND** the Y.Map change propagates to all connected peers
- **AND** peers receive the item in their Y.Map observers
- **AND** peers update their Zustand stores with the new item

#### Scenario: Receive item from peer

- **GIVEN** a peer adds a synced item
- **WHEN** the Y.Map change arrives locally
- **THEN** the Y.Map observer fires
- **AND** the local Zustand store is updated with the item
- **AND** the item appears in the UI
- **AND** the item is marked with the peer's ID as lastModifiedBy

#### Scenario: Concurrent edits

- **GIVEN** two peers edit the same item simultaneously
- **WHEN** both changes propagate via CRDT
- **THEN** Yjs automatically merges the changes
- **AND** both peers converge to the same final state
- **AND** no manual conflict resolution is required

#### Scenario: Offline changes sync

- **GIVEN** a user makes changes while offline
- **WHEN** they reconnect to the room
- **THEN** IndexedDB persistence loads offline changes
- **AND** changes sync to the Y.Map
- **AND** changes propagate to connected peers

### Requirement: Selective Sync Control

The system SHALL allow users to enable/disable sync per vault item.

#### Scenario: Enable sync for item

- **GIVEN** a vault item with sync disabled
- **WHEN** the user toggles sync on
- **THEN** the item's syncEnabled flag is set to true
- **AND** the item's syncState transitions to "pending"
- **AND** the item is written to the Yjs Y.Map
- **AND** the item syncs to connected peers

#### Scenario: Disable sync for item

- **GIVEN** a synced vault item
- **WHEN** the user toggles sync off
- **THEN** the item's syncEnabled flag is set to false
- **AND** the item's syncState transitions to "disabled"
- **AND** the item is removed from the Yjs Y.Map
- **AND** peers retain their last-synced copy

#### Scenario: Import item from peer

- **GIVEN** a peer shares a synced item
- **WHEN** the user imports the item
- **THEN** a new local copy is created with a new ID
- **AND** the copy has syncEnabled set to false
- **AND** the copy's sync metadata is cleared
- **AND** the copy does not sync back to peers

### Requirement: Connection State Management

The system SHALL track and expose connection state for UI display.

#### Scenario: Connection state transitions

- **GIVEN** a sync room lifecycle
- **WHEN** state changes occur
- **THEN** state transitions follow: disconnected → connecting → connected
- **OR** disconnected → connecting → error → connecting (retry)
- **AND** state changes emit events to listeners

#### Scenario: Peer tracking

- **GIVEN** peers join and leave the room
- **WHEN** peer events occur
- **THEN** "peer-joined" events include peer ID and connection time
- **AND** "peer-left" events include peer ID
- **AND** the peer list is updated in the store
- **AND** peer count is calculated excluding self

#### Scenario: Retry state exposure

- **GIVEN** reconnection is in progress
- **WHEN** UI queries retry state
- **THEN** isRetrying flag indicates active retry
- **AND** attempts shows current retry count
- **AND** maxAttempts shows retry limit (5)

### Requirement: UI Components

The system SHALL provide 8 React components for sync management and status display.

#### Scenario: SyncStatusIndicator in header

- **GIVEN** the app header bar
- **WHEN** the sync status indicator is rendered
- **THEN** it shows a colored dot (green=connected, amber=connecting, red=error, gray=offline)
- **AND** it shows peer count or status label
- **AND** it shows a pulse animation when connecting
- **AND** clicking opens the room code dialog

#### Scenario: SyncBadge on vault items

- **GIVEN** a vault item with sync enabled
- **WHEN** the sync badge is rendered
- **THEN** it shows an icon for the sync state (checkmark=synced, dot=pending, spinner=syncing, warning=conflict, slash=disabled)
- **AND** it shows a tooltip on hover with state description
- **AND** colors match state (green=synced, amber=pending, cyan=syncing, red=conflict, gray=disabled)

#### Scenario: RoomCodeDialog for room management

- **GIVEN** a user opens the sync dialog
- **WHEN** not connected
- **THEN** tabs for "Create Room" and "Join Room" are shown
- **AND** create tab has optional password input and "Create Room" button
- **AND** join tab has room code input (auto-formatted) and password input
- **WHEN** connected
- **THEN** room code is displayed with copy button
- **AND** peer list is shown
- **AND** "Leave Room" button is available

#### Scenario: PeerList displays connected peers

- **GIVEN** peers are connected to the room
- **WHEN** the peer list is rendered
- **THEN** local peer is shown first with "(you)" indicator
- **AND** remote peers are listed below
- **AND** each peer shows avatar initials, name, and online indicator
- **AND** empty state shows "No peers connected" message

#### Scenario: PeerItemList for importing

- **GIVEN** peers share synced items
- **WHEN** the peer item list is rendered
- **THEN** items from peers are shown (excluding own items)
- **AND** type filter tabs (All, Units, Pilots, Forces) are available
- **AND** each item shows type icon, name, last modified date, and peer ID
- **AND** "Import" button creates a local copy
- **AND** empty state shows "No items shared by peers yet"

#### Scenario: ConnectionQualityIndicator shows signal strength

- **GIVEN** a sync connection
- **WHEN** the quality indicator is rendered
- **THEN** signal bars (0-4) show connection quality
- **AND** quality is assessed: 4 bars = connected with peers, 3 bars = connected no peers, 2 bars = connecting, 1 bar = error, 0 bars = disconnected
- **AND** clicking expands details popover with status, quality bar, peer count, retry info, and connection type

#### Scenario: ConflictResolutionDialog for manual resolution

- **GIVEN** a sync conflict is detected (reserved for future use)
- **WHEN** the conflict dialog is opened
- **THEN** local and remote versions are shown side-by-side
- **AND** each version shows name, last modified, modified by, and data preview
- **AND** user can select "Keep My Version" or "Use Remote Version"
- **AND** selected version syncs to all peers

### Requirement: Mock Sync Provider for Testing

The system SHALL provide a mock sync provider for E2E testing without WebRTC.

#### Scenario: Mock sync via BroadcastChannel

- **GIVEN** E2E tests run with ?mockSync=true URL parameter
- **WHEN** a room is created or joined
- **THEN** BroadcastChannel is used instead of WebRTC
- **AND** same-origin tabs can communicate
- **AND** Yjs updates are serialized and broadcast
- **AND** peer join/leave events are broadcast
- **AND** the mock provider implements the same ISyncRoom interface

## Data Model Requirements

### Type System

```typescript
/**
 * Connection state for a sync room.
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

/**
 * Sync state for an individual item.
 */
export enum SyncState {
  Synced = 'synced',
  Pending = 'pending',
  Syncing = 'syncing',
  Conflict = 'conflict',
  Disabled = 'disabled',
}

/**
 * Types of vault items that can be synced.
 */
export type SyncableItemType = 'unit' | 'pilot' | 'force';

/**
 * Information about a connected peer.
 */
export interface IPeer {
  readonly id: string;
  readonly name?: string;
  readonly connectedAt: string;
  readonly awarenessState?: Record<string, unknown>;
}

/**
 * Sync room instance containing all providers.
 */
export interface ISyncRoom {
  readonly doc: Y.Doc;
  readonly webrtcProvider: WebrtcProvider;
  readonly persistence: IndexeddbPersistence;
  readonly roomCode: string;
  readonly password?: string;
  readonly createdAt: string;
}

/**
 * Options for creating or joining a sync room.
 */
export interface ISyncRoomOptions {
  roomCode?: string;
  password?: string;
  signalingServers?: readonly string[];
  maxConnections?: number;
}

/**
 * A vault item that can be synchronized.
 */
export interface ISyncableVaultItem {
  readonly id: string;
  readonly type: SyncableItemType;
  readonly name: string;
  readonly data: unknown;
  syncEnabled: boolean;
  readonly syncState: SyncState;
  readonly lastModified: number;
  readonly lastSynced?: number;
  readonly lastModifiedBy?: string;
}

/**
 * Sync metadata stored alongside vault items.
 */
export interface ISyncMetadata {
  readonly itemId: string;
  readonly syncState: SyncState;
  readonly lastSynced?: number;
  readonly version: number;
  readonly lastModifiedBy?: string;
}

/**
 * Sync room store state.
 */
export interface ISyncRoomState {
  activeRoom: ISyncRoom | null;
  connectionState: ConnectionState;
  peers: readonly IPeer[];
  error: string | null;
  localPeerId: string | null;
  localPeerName: string;
}

/**
 * Sync room store actions.
 */
export interface ISyncRoomActions {
  createRoom: (options?: ISyncRoomOptions) => Promise<string>;
  joinRoom: (roomCode: string, password?: string) => Promise<void>;
  leaveRoom: () => void;
  setLocalPeerName: (name: string) => void;
  clearError: () => void;
}

/**
 * Synced vault store state.
 */
export interface ISyncedVaultState {
  items: Record<string, ISyncableVaultItem>;
  metadata: Record<string, ISyncMetadata>;
}

/**
 * Synced vault store actions.
 */
export interface ISyncedVaultActions {
  addItem: (item: ISyncableVaultItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, data: Partial<ISyncableVaultItem>) => void;
  toggleSync: (id: string, enabled: boolean) => void;
  getItemsByType: (type: SyncableItemType) => readonly ISyncableVaultItem[];
  getSyncState: (id: string) => SyncState;
  importFromPeer: (item: ISyncableVaultItem) => string;
}

/**
 * Events emitted by the sync system.
 */
export type SyncEvent =
  | { type: 'connected'; roomCode: string }
  | { type: 'disconnected'; reason?: string }
  | { type: 'peer-joined'; peer: IPeer }
  | { type: 'peer-left'; peerId: string }
  | { type: 'sync-started'; itemId: string }
  | { type: 'sync-completed'; itemId: string }
  | {
      type: 'conflict';
      itemId: string;
      localVersion: unknown;
      remoteVersion: unknown;
    }
  | { type: 'error'; message: string };

export type SyncEventListener = (event: SyncEvent) => void;
```

### Configuration

```typescript
export const P2P_CONFIG = {
  signalingServers: [
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
  ] as const,
  maxConnections: 20,
  roomCodeLength: 6,
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  dbNamePrefix: 'mekstation-sync-',
} as const;
```

## Calculation Formulas

### Room Code Generation

```typescript
// Character set: 32 chars (A-Z excluding I/O, 2-9 excluding 0/1)
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Combinations: 32^6 = 1,073,741,824 (over 1 billion unique codes)
function generateRoomCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => ROOM_CODE_CHARS[byte % ROOM_CODE_CHARS.length])
    .join('');
}
```

### Exponential Backoff

```typescript
function calculateRetryDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = delay * Math.random() * 0.2; // 0-20% jitter
  return Math.floor(delay + jitter);
}

// Retry delays: ~1s, ~2s, ~4s, ~8s, ~16s (then capped at 30s)
```

### Connection Quality Assessment

```typescript
function assessQuality(
  connectionState: ConnectionState,
  peerCount: number,
  retryAttempts: number,
): { bars: number; quality: string } {
  if (connectionState === ConnectionState.Disconnected)
    return { bars: 0, quality: 'disconnected' };
  if (connectionState === ConnectionState.Error)
    return { bars: 1, quality: 'poor' };
  if (connectionState === ConnectionState.Connecting)
    return { bars: 2, quality: 'fair' };
  if (retryAttempts > 0) return { bars: 2, quality: 'fair' };
  if (peerCount === 0) return { bars: 3, quality: 'good' };
  if (peerCount >= 1) return { bars: 4, quality: 'excellent' };
  return { bars: 3, quality: 'good' };
}
```

## Validation Rules

### Room Code Validation

```typescript
function isValidRoomCode(code: string): boolean {
  const normalized = normalizeRoomCode(code);

  // Must be exactly 6 characters
  if (normalized.length !== 6) {
    return false;
  }

  // All characters must be in allowed set
  for (const char of normalized) {
    if (!ROOM_CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}

// Error messages:
// - "Invalid room code" - code doesn't match format
// - "Room code must be 6 characters" - wrong length
// - "Room code contains invalid characters" - has I/O/0/1
```

### Sync Item Validation

```typescript
function validateSyncItem(item: ISyncableVaultItem): string[] {
  const errors: string[] = [];

  if (!item.id) {
    errors.push('Item ID is required');
  }

  if (!['unit', 'pilot', 'force'].includes(item.type)) {
    errors.push('Item type must be unit, pilot, or force');
  }

  if (!item.name || item.name.trim().length === 0) {
    errors.push('Item name is required');
  }

  if (item.lastModified <= 0) {
    errors.push('Last modified timestamp must be positive');
  }

  return errors;
}
```

### Connection State Validation

```typescript
function validateConnectionState(state: ConnectionState): boolean {
  return Object.values(ConnectionState).includes(state);
}

function validateSyncState(state: SyncState): boolean {
  return Object.values(SyncState).includes(state);
}
```

## Implementation Notes

### Performance Considerations

1. **Y.Map Observer Efficiency**: Y.Map observers fire on every change. Batch updates using `doc.transact()` to reduce observer calls.

2. **Peer Count Polling**: Awareness state updates don't always trigger events. Poll `getConnectedPeerCount()` every 1 second for accurate UI display.

3. **IndexedDB Persistence**: Persistence is asynchronous. Don't assume immediate availability after room creation.

4. **BroadcastChannel Serialization**: Mock provider serializes Uint8Array as number[] for BroadcastChannel transfer. This is less efficient than WebRTC but acceptable for testing.

### Edge Cases

1. **Simultaneous Room Creation**: Two users creating rooms with the same random code is astronomically unlikely (1 in 1 billion) but possible. No collision detection is implemented.

2. **Password Mismatch**: y-webrtc silently fails to connect if passwords don't match. No explicit error is surfaced to the user.

3. **Stale Peer List**: Peers may appear in the list briefly after disconnecting due to awareness state lag. This is a y-webrtc limitation.

4. **Import ID Collision**: Imported items generate new IDs using timestamp + random suffix. Collision is possible if importing multiple items in the same millisecond.

### Common Pitfalls

1. **Forgetting Transactions**: Always wrap Y.Map mutations in `doc.transact()` to ensure atomicity and reduce observer noise.

2. **Double Type Assertions**: Mock providers use `as unknown as X` to satisfy TypeScript. This is intentional for test mocks but should never be used in production code.

3. **Awareness vs Peers**: Awareness states include the local peer. Subtract 1 when calculating peer count.

4. **Sync State Confusion**: `syncEnabled` is user-controlled. `syncState` is system-controlled. Don't conflate them.

## Examples

### Creating and Joining Rooms

```typescript
import { useSyncRoom } from '@/lib/p2p';

function SyncPanel() {
  const {
    roomCode,
    isConnected,
    peerCount,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useSyncRoom();

  const handleCreate = async () => {
    const code = await createRoom('optional-password');
    console.log('Room created:', code); // "ABC-DEF"
  };

  const handleJoin = async () => {
    await joinRoom('ABC-DEF', 'optional-password');
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Room: {roomCode}</p>
          <p>Peers: {peerCount}</p>
          <button onClick={leaveRoom}>Leave</button>
        </div>
      ) : (
        <div>
          <button onClick={handleCreate}>Create Room</button>
          <button onClick={handleJoin}>Join Room</button>
        </div>
      )}
    </div>
  );
}
```

### Syncing Vault Items

```typescript
import { useSyncedVaultStore } from '@/lib/p2p';

function VaultItem({ itemId }: { itemId: string }) {
  const store = useSyncedVaultStore();
  const item = store.items[itemId];

  const handleToggleSync = () => {
    store.toggleSync(itemId, !item.syncEnabled);
  };

  return (
    <div>
      <h3>{item.name}</h3>
      <p>Sync: {item.syncState}</p>
      <button onClick={handleToggleSync}>
        {item.syncEnabled ? 'Disable Sync' : 'Enable Sync'}
      </button>
    </div>
  );
}
```

### Importing from Peers

```typescript
import { useSyncedVaultStore, useSyncedItems } from '@/lib/p2p';

function PeerItemBrowser() {
  const store = useSyncedVaultStore();
  const allItems = useSyncedItems();
  const localPeerId = useSyncRoomStore(state => state.localPeerId);

  // Filter to peer items only
  const peerItems = allItems.filter(
    item => item.lastModifiedBy && item.lastModifiedBy !== localPeerId
  );

  const handleImport = (item: ISyncableVaultItem) => {
    const newId = store.importFromPeer(item);
    console.log('Imported as:', newId);
  };

  return (
    <ul>
      {peerItems.map(item => (
        <li key={item.id}>
          {item.name} (from {item.lastModifiedBy})
          <button onClick={() => handleImport(item)}>Import</button>
        </li>
      ))}
    </ul>
  );
}
```

### Using UI Components

```typescript
import {
  SyncStatusIndicator,
  RoomCodeDialog,
  SyncBadge,
  PeerList,
} from '@/components/sync';
import { useSyncRoom } from '@/lib/p2p';

function AppHeader() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    connectionState,
    peerCount,
    isConnected,
    isConnecting,
    roomCode,
    peers,
    localPeerId,
    localPeerName,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
  } = useSyncRoom();

  return (
    <header>
      <SyncStatusIndicator
        connectionState={connectionState}
        peerCount={peerCount}
        onClick={() => setDialogOpen(true)}
      />

      <RoomCodeDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        isConnected={isConnected}
        isConnecting={isConnecting}
        currentRoomCode={roomCode}
        peers={peers}
        localPeerId={localPeerId}
        localPeerName={localPeerName}
        error={error}
        onClearError={clearError}
      />
    </header>
  );
}

function VaultItemCard({ item }: { item: ISyncableVaultItem }) {
  return (
    <div>
      <h3>{item.name}</h3>
      <SyncBadge state={item.syncState} size="md" />
    </div>
  );
}
```

### Event Listening

```typescript
import { onSyncEvent } from '@/lib/p2p';

function setupSyncEventLogger() {
  const unsubscribe = onSyncEvent((event) => {
    switch (event.type) {
      case 'connected':
        console.log('Connected to room:', event.roomCode);
        break;
      case 'peer-joined':
        console.log('Peer joined:', event.peer.id);
        break;
      case 'peer-left':
        console.log('Peer left:', event.peerId);
        break;
      case 'error':
        console.error('Sync error:', event.message);
        break;
    }
  });

  // Cleanup
  return unsubscribe;
}
```

### Mock Sync for Testing

```typescript
// In E2E test setup
const testUrl = 'http://localhost:3000?mockSync=true';

// In application code
import { shouldUseMockSync } from '@/lib/p2p/MockSyncProvider';

if (shouldUseMockSync()) {
  // Use mock provider (BroadcastChannel)
  const room = createMockSyncRoom({ roomCode: 'TEST42' });
} else {
  // Use real provider (WebRTC)
  const room = createSyncRoom({ roomCode: 'TEST42' });
}
```

## Dependencies

**Depends On:**

- Yjs (CRDT library)
- y-webrtc (WebRTC provider for Yjs)
- y-indexeddb (IndexedDB persistence for Yjs)
- Zustand (state management)
- React (UI components)

**Used By:**

- Vault management UI
- Unit/pilot/force editors
- Campaign system (future)

## Non-Goals

The following are explicitly out of scope for this specification:

1. **WebRTC Signaling Server**: Uses public y-webrtc servers. Custom signaling server deployment is not covered.

2. **STUN/TURN Configuration**: Uses y-webrtc defaults. Custom STUN/TURN server configuration is not covered.

3. **End-to-End Encryption**: Optional room passwords provide basic access control but not cryptographic E2E encryption.

4. **Manual Conflict Resolution UI**: CRDTs auto-merge conflicts. Manual merge UI (ConflictResolutionDialog) is reserved for future use.

5. **Sync History**: No version control or change history tracking. Only current state is synced.

6. **Bandwidth Optimization**: No compression or delta sync. Full item data is transmitted.

7. **Multi-Room Connections**: Only one active room at a time. Simultaneous multi-room sync is not supported.

## References

- **Yjs Documentation**: https://docs.yjs.dev/
- **y-webrtc**: https://github.com/yjs/y-webrtc
- **y-indexeddb**: https://github.com/yjs/y-indexeddb
- **WebRTC Specification**: https://www.w3.org/TR/webrtc/
- **CRDT Theory**: https://crdt.tech/

## Related Specifications

- `vault-sync/spec.md` - Parent specification (created by archiving add-p2p-vault-sync change)
- `unit-entity-model/spec.md` - Unit data structure for synced items
- `force-management/spec.md` - Force data structure for synced items
- `personnel-management/spec.md` - Pilot data structure for synced items

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-13  
**Status**: Active
