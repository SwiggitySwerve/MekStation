/**
 * Sync Provider
 *
 * Creates and manages P2P sync rooms using Yjs, y-webrtc, and y-indexeddb.
 * Handles WebRTC connections, CRDT sync, and offline persistence.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  ISyncRoom,
  ISyncRoomOptions,
  ConnectionState,
  P2P_CONFIG,
  type SyncEvent,
  type SyncEventListener,
} from './types';
import { generateRoomCode } from './roomCodes';

// =============================================================================
// Event Emitter
// =============================================================================

type EventListeners = Map<SyncEventListener, boolean>;
const listeners: EventListeners = new Map();

/**
 * Subscribe to sync events.
 */
export function onSyncEvent(listener: SyncEventListener): () => void {
  listeners.set(listener, true);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Emit a sync event to all listeners.
 */
function emitEvent(event: SyncEvent): void {
  listeners.forEach((_, listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[SyncProvider] Error in event listener:', error);
    }
  });
}

// =============================================================================
// Retry State
// =============================================================================

interface RetryState {
  attempts: number;
  lastAttemptAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  isRetrying: boolean;
}

let retryState: RetryState = {
  attempts: 0,
  lastAttemptAt: 0,
  timeoutId: null,
  isRetrying: false,
};

/**
 * Calculate delay for exponential backoff.
 * @param attempt Current attempt number (0-based)
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelay = P2P_CONFIG.reconnectBaseDelay;
  const maxDelay = 30000; // Cap at 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (0-20% of delay)
  const jitter = delay * Math.random() * 0.2;
  return Math.floor(delay + jitter);
}

/**
 * Reset retry state.
 */
function resetRetryState(): void {
  if (retryState.timeoutId) {
    clearTimeout(retryState.timeoutId);
  }
  retryState = {
    attempts: 0,
    lastAttemptAt: 0,
    timeoutId: null,
    isRetrying: false,
  };
}

/**
 * Get current retry state for UI display.
 */
export function getRetryState(): { isRetrying: boolean; attempts: number; maxAttempts: number } {
  return {
    isRetrying: retryState.isRetrying,
    attempts: retryState.attempts,
    maxAttempts: P2P_CONFIG.maxReconnectAttempts,
  };
}

// =============================================================================
// Active Room Management
// =============================================================================

let activeRoom: ISyncRoom | null = null;

/**
 * Get the currently active sync room.
 */
export function getActiveRoom(): ISyncRoom | null {
  return activeRoom;
}

/**
 * Check if there's an active sync room.
 */
export function hasActiveRoom(): boolean {
  return activeRoom !== null;
}

// =============================================================================
// Reconnection Logic
// =============================================================================

/**
 * Attempt to reconnect with exponential backoff.
 */
function attemptReconnect(roomCode: string, password?: string): void {
  // Check if we've exceeded max attempts
  if (retryState.attempts >= P2P_CONFIG.maxReconnectAttempts) {
    emitEvent({
      type: 'error',
      message: `Connection failed after ${retryState.attempts} attempts. Please try again.`,
    });
    resetRetryState();
    return;
  }

  retryState.isRetrying = true;
  retryState.attempts++;
  retryState.lastAttemptAt = Date.now();

  const delay = calculateRetryDelay(retryState.attempts - 1);

  console.log(
    `[SyncProvider] Reconnect attempt ${retryState.attempts}/${P2P_CONFIG.maxReconnectAttempts} in ${delay}ms`
  );

  emitEvent({
    type: 'error',
    message: `Connection lost. Retrying in ${Math.round(delay / 1000)}s (${retryState.attempts}/${P2P_CONFIG.maxReconnectAttempts})...`,
  });

  retryState.timeoutId = setTimeout(() => {
    try {
      // Clean up current room if exists
      if (activeRoom) {
        try {
          activeRoom.webrtcProvider.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      }

      // Attempt to reconnect
      createSyncRoom({ roomCode, password });
      retryState.isRetrying = false;
    } catch (error) {
      console.error('[SyncProvider] Reconnect failed:', error);
      retryState.isRetrying = false;
      // Schedule next retry
      attemptReconnect(roomCode, password);
    }
  }, delay);
}

/**
 * Cancel any pending reconnection attempts.
 */
export function cancelReconnect(): void {
  resetRetryState();
}

// =============================================================================
// Room Creation / Joining
// =============================================================================

/**
 * Create a new sync room.
 *
 * @param options Room options (password, custom signaling servers)
 * @returns The created sync room
 */
export function createSyncRoom(options: ISyncRoomOptions = {}): ISyncRoom {
  // Clean up any existing room
  if (activeRoom) {
    destroySyncRoom(activeRoom);
  }

  const roomCode = options.roomCode ?? generateRoomCode();
  const doc = new Y.Doc();
  const now = new Date().toISOString();

  // Create IndexedDB persistence for offline support
  const dbName = `${P2P_CONFIG.dbNamePrefix}${roomCode}`;
  const persistence = new IndexeddbPersistence(dbName, doc);

  // Create WebRTC provider for P2P sync
  const webrtcProvider = new WebrtcProvider(roomCode, doc, {
    signaling: options.signalingServers
      ? [...options.signalingServers]
      : [...P2P_CONFIG.signalingServers],
    password: options.password,
    maxConns: options.maxConnections ?? P2P_CONFIG.maxConnections,
  });

  // Set up event handlers
  webrtcProvider.on('synced', () => {
    // Connection successful, reset retry state
    resetRetryState();
    emitEvent({ type: 'connected', roomCode });
  });

  webrtcProvider.on('peers', (event: { added: string[]; removed: string[] }) => {
    // Handle peer changes
    for (const peerId of event.added) {
      emitEvent({
        type: 'peer-joined',
        peer: {
          id: peerId,
          connectedAt: new Date().toISOString(),
        },
      });
    }
    for (const peerId of event.removed) {
      emitEvent({ type: 'peer-left', peerId });
    }
  });

  // Handle connection status changes for retry logic
  webrtcProvider.on('status', (event: { connected: boolean }) => {
    if (!event.connected && activeRoom && !retryState.isRetrying) {
      // Connection lost, start retry sequence
      attemptReconnect(activeRoom.roomCode, activeRoom.password);
    }
  });

  const room: ISyncRoom = {
    doc,
    webrtcProvider,
    persistence,
    roomCode,
    password: options.password,
    createdAt: now,
  };

  activeRoom = room;
  return room;
}

/**
 * Join an existing sync room.
 *
 * @param roomCode The room code to join
 * @param password Optional password
 * @returns The joined sync room
 */
export function joinSyncRoom(roomCode: string, password?: string): ISyncRoom {
  return createSyncRoom({ roomCode, password });
}

/**
 * Destroy a sync room and clean up resources.
 *
 * @param room The room to destroy
 */
export function destroySyncRoom(room: ISyncRoom): void {
  try {
    room.webrtcProvider.disconnect();
    room.webrtcProvider.destroy();
  } catch (error) {
    console.error('[SyncProvider] Error destroying WebRTC provider:', error);
  }

  try {
    room.persistence.destroy();
  } catch (error) {
    console.error('[SyncProvider] Error destroying IndexedDB persistence:', error);
  }

  try {
    room.doc.destroy();
  } catch (error) {
    console.error('[SyncProvider] Error destroying Y.Doc:', error);
  }

  if (activeRoom === room) {
    activeRoom = null;
    emitEvent({ type: 'disconnected', reason: 'Room destroyed' });
  }
}

/**
 * Leave the current room (if any).
 */
export function leaveCurrentRoom(): void {
  if (activeRoom) {
    destroySyncRoom(activeRoom);
  }
}

// =============================================================================
// Connection State
// =============================================================================

/**
 * Get the current connection state.
 */
export function getConnectionState(): ConnectionState {
  if (!activeRoom) {
    return ConnectionState.Disconnected;
  }

  if (activeRoom.webrtcProvider.connected) {
    return ConnectionState.Connected;
  }

  return ConnectionState.Connecting;
}

/**
 * Get the number of connected peers.
 */
export function getConnectedPeerCount(): number {
  if (!activeRoom) {
    return 0;
  }

  // Awareness states include our own, so subtract 1
  const states = activeRoom.webrtcProvider.awareness.getStates();
  return Math.max(0, states.size - 1);
}

/**
 * Get local peer ID.
 */
export function getLocalPeerId(): string | null {
  if (!activeRoom) {
    return null;
  }

  return String(activeRoom.webrtcProvider.awareness.clientID);
}

// =============================================================================
// Awareness (Presence)
// =============================================================================

/**
 * Set local awareness state (name, cursor position, etc.).
 */
export function setLocalAwareness(state: Record<string, unknown>): void {
  if (!activeRoom) {
    return;
  }

  activeRoom.webrtcProvider.awareness.setLocalStateField('user', state);
}

/**
 * Get awareness states of all connected peers.
 */
export function getAllAwarenessStates(): Map<number, Record<string, unknown>> {
  if (!activeRoom) {
    return new Map();
  }

  return activeRoom.webrtcProvider.awareness.getStates() as Map<number, Record<string, unknown>>;
}

// =============================================================================
// Document Access
// =============================================================================

/**
 * Get the Yjs document for the active room.
 */
export function getYDoc(): Y.Doc | null {
  return activeRoom?.doc ?? null;
}

/**
 * Get or create a Y.Map for storing synced data.
 *
 * @param name The name of the map
 * @returns The Y.Map or null if no active room
 */
export function getYMap<T>(name: string): Y.Map<T> | null {
  if (!activeRoom) {
    return null;
  }

  return activeRoom.doc.getMap<T>(name);
}

/**
 * Get or create a Y.Array for storing synced data.
 *
 * @param name The name of the array
 * @returns The Y.Array or null if no active room
 */
export function getYArray<T>(name: string): Y.Array<T> | null {
  if (!activeRoom) {
    return null;
  }

  return activeRoom.doc.getArray<T>(name);
}
