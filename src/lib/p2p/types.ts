/**
 * P2P Vault Sync Types
 *
 * Type definitions for peer-to-peer synchronization infrastructure.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import type * as Y from 'yjs';
import type { WebrtcProvider } from 'y-webrtc';
import type { IndexeddbPersistence } from 'y-indexeddb';

// =============================================================================
// Connection Types
// =============================================================================

/**
 * Connection state for a sync room.
 */
export enum ConnectionState {
  /** Not connected to any room */
  Disconnected = 'disconnected',
  /** Attempting to connect */
  Connecting = 'connecting',
  /** Connected to room, peers may or may not be present */
  Connected = 'connected',
  /** Connection error occurred */
  Error = 'error',
}

/**
 * Sync state for an individual item.
 */
export enum SyncState {
  /** Item is fully synced */
  Synced = 'synced',
  /** Item has pending local changes */
  Pending = 'pending',
  /** Item is currently syncing */
  Syncing = 'syncing',
  /** Item has a conflict (manual resolution needed) */
  Conflict = 'conflict',
  /** Item is not enabled for sync */
  Disabled = 'disabled',
}

/**
 * Information about a connected peer.
 */
export interface IPeer {
  /** Unique peer identifier */
  readonly id: string;
  /** Display name (if available) */
  readonly name?: string;
  /** When the peer connected */
  readonly connectedAt: string;
  /** Peer awareness state */
  readonly awarenessState?: Record<string, unknown>;
}

/**
 * Sync room instance containing all providers.
 */
export interface ISyncRoom {
  /** Yjs document for this room */
  readonly doc: Y.Doc;
  /** WebRTC provider for P2P sync */
  readonly webrtcProvider: WebrtcProvider;
  /** IndexedDB persistence for offline support */
  readonly persistence: IndexeddbPersistence;
  /** Room code for this room */
  readonly roomCode: string;
  /** Optional password for encryption */
  readonly password?: string;
  /** When the room was created/joined */
  readonly createdAt: string;
}

/**
 * Options for creating or joining a sync room.
 */
export interface ISyncRoomOptions {
  /** Room code (generated if not provided for create) */
  roomCode?: string;
  /** Optional password for encryption */
  password?: string;
  /** Custom signaling servers (defaults to y-webrtc public servers) */
  signalingServers?: readonly string[];
  /** Maximum number of connections */
  maxConnections?: number;
}

// =============================================================================
// Vault Sync Types
// =============================================================================

/**
 * Types of vault items that can be synced.
 */
export type SyncableItemType = 'unit' | 'pilot' | 'force';

/**
 * A vault item that can be synchronized.
 */
export interface ISyncableVaultItem {
  /** Unique item identifier */
  readonly id: string;
  /** Type of vault item */
  readonly type: SyncableItemType;
  /** Display name */
  readonly name: string;
  /** The actual item data */
  readonly data: unknown;
  /** Whether sync is enabled for this item */
  syncEnabled: boolean;
  /** Current sync state */
  readonly syncState: SyncState;
  /** Last modified timestamp (local) */
  readonly lastModified: number;
  /** Last synced timestamp */
  readonly lastSynced?: number;
  /** ID of peer that last modified (for conflict resolution) */
  readonly lastModifiedBy?: string;
}

/**
 * Sync metadata stored alongside vault items.
 */
export interface ISyncMetadata {
  /** Item ID */
  readonly itemId: string;
  /** Current sync state */
  readonly syncState: SyncState;
  /** Last synced timestamp */
  readonly lastSynced?: number;
  /** Version vector for conflict detection */
  readonly version: number;
  /** Peer ID that last modified */
  readonly lastModifiedBy?: string;
}

// =============================================================================
// Store Types
// =============================================================================

/**
 * Sync room store state.
 */
export interface ISyncRoomState {
  /** Currently active room (null if not connected) */
  activeRoom: ISyncRoom | null;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Connected peers */
  peers: readonly IPeer[];
  /** Error message if any */
  error: string | null;
  /** Local peer ID */
  localPeerId: string | null;
  /** Local peer name */
  localPeerName: string;
}

/**
 * Sync room store actions.
 */
export interface ISyncRoomActions {
  /** Create a new sync room */
  createRoom: (options?: ISyncRoomOptions) => Promise<string>;
  /** Join an existing sync room */
  joinRoom: (roomCode: string, password?: string) => Promise<void>;
  /** Leave the current room */
  leaveRoom: () => void;
  /** Set local peer name */
  setLocalPeerName: (name: string) => void;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Synced vault store state.
 */
export interface ISyncedVaultState {
  /** Vault items indexed by ID */
  items: Record<string, ISyncableVaultItem>;
  /** Sync metadata indexed by item ID */
  metadata: Record<string, ISyncMetadata>;
}

/**
 * Synced vault store actions.
 */
export interface ISyncedVaultActions {
  /** Add an item to the synced vault */
  addItem: (item: ISyncableVaultItem) => void;
  /** Remove an item from the synced vault */
  removeItem: (id: string) => void;
  /** Update an item in the synced vault */
  updateItem: (id: string, data: Partial<ISyncableVaultItem>) => void;
  /** Enable or disable sync for an item */
  toggleSync: (id: string, enabled: boolean) => void;
  /** Get all items of a specific type */
  getItemsByType: (type: SyncableItemType) => readonly ISyncableVaultItem[];
  /** Get sync state for an item */
  getSyncState: (id: string) => SyncState;
}

// =============================================================================
// Event Types
// =============================================================================

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
  | { type: 'conflict'; itemId: string; localVersion: unknown; remoteVersion: unknown }
  | { type: 'error'; message: string };

/**
 * Listener for sync events.
 */
export type SyncEventListener = (event: SyncEvent) => void;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default configuration for P2P sync.
 */
export const P2P_CONFIG = {
  /** Default signaling servers (y-webrtc public servers) */
  signalingServers: [
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
  ] as const,
  /** Maximum number of peer connections */
  maxConnections: 20,
  /** Room code length */
  roomCodeLength: 6,
  /** Reconnection attempts before giving up */
  maxReconnectAttempts: 5,
  /** Base delay for exponential backoff (ms) */
  reconnectBaseDelay: 1000,
  /** IndexedDB database name prefix */
  dbNamePrefix: 'mekstation-sync-',
} as const;
