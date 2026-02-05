/**
 * Mock Sync Provider for E2E Testing
 *
 * Simulates P2P sync using BroadcastChannel (same-origin tabs can communicate).
 * This allows E2E tests to run without real WebRTC signaling servers.
 *
 * @internal For testing only
 */

import * as Y from 'yjs';

import { generateRoomCode } from './roomCodes';
import {
  ConnectionState,
  type ISyncRoom,
  type ISyncRoomOptions,
  type SyncEvent,
  type SyncEventListener,
  P2P_CONFIG,
} from './types';

// =============================================================================
// Types
// =============================================================================

interface MockRoom {
  doc: Y.Doc;
  roomCode: string;
  password?: string;
  createdAt: string;
  channel: BroadcastChannel;
  peerId: string;
}

interface BroadcastMessage {
  type: 'sync' | 'join' | 'leave' | 'update';
  roomCode: string;
  peerId: string;
  /** Serialized Uint8Array as number[] for BroadcastChannel transfer */
  data?: number[];
}

// =============================================================================
// State
// =============================================================================

let mockRoom: MockRoom | null = null;
let connectionState: ConnectionState = ConnectionState.Disconnected;
const listeners: Set<SyncEventListener> = new Set();
const connectedPeers: Set<string> = new Set();

// Generate a unique peer ID for this browser context
const localPeerId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// =============================================================================
// Event Emitter
// =============================================================================

export function onMockSyncEvent(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitEvent(event: SyncEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[MockSyncProvider] Error in event listener:', error);
    }
  });
}

// =============================================================================
// Room Management
// =============================================================================

export function createMockSyncRoom(options: ISyncRoomOptions = {}): ISyncRoom {
  // Clean up existing room
  if (mockRoom) {
    destroyMockSyncRoom();
  }

  const roomCode = options.roomCode ?? generateRoomCode();
  const doc = new Y.Doc();
  const channel = new BroadcastChannel(`mekstation-sync-${roomCode}`);

  // Listen for messages from other tabs
  channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
    handleBroadcastMessage(event.data);
  };

  mockRoom = {
    doc,
    roomCode,
    password: options.password,
    createdAt: new Date().toISOString(),
    channel,
    peerId: localPeerId,
  };

  connectionState = ConnectionState.Connected;

  // Announce join to other tabs
  channel.postMessage({
    type: 'join',
    roomCode,
    peerId: localPeerId,
  } as BroadcastMessage);

  // Set up doc change observer to broadcast updates
  doc.on('update', (update: Uint8Array) => {
    if (mockRoom) {
      const message: BroadcastMessage = {
        type: 'update',
        roomCode: mockRoom.roomCode,
        peerId: localPeerId,
        data: Array.from(update), // Convert to array for serialization
      };
      mockRoom.channel.postMessage(message);
    }
  });

  emitEvent({ type: 'connected', roomCode });

  // Return a compatible ISyncRoom (with mock webrtcProvider/persistence)
  return {
    doc,
    webrtcProvider: createMockWebrtcProvider(),
    persistence: createMockPersistence(),
    roomCode,
    password: options.password,
    createdAt: mockRoom.createdAt,
  };
}

export function joinMockSyncRoom(
  roomCode: string,
  password?: string,
): ISyncRoom {
  return createMockSyncRoom({ roomCode, password });
}

export function destroyMockSyncRoom(): void {
  if (!mockRoom) return;

  // Announce leave
  mockRoom.channel.postMessage({
    type: 'leave',
    roomCode: mockRoom.roomCode,
    peerId: localPeerId,
  } as BroadcastMessage);

  mockRoom.channel.close();
  mockRoom.doc.destroy();
  mockRoom = null;
  connectionState = ConnectionState.Disconnected;
  connectedPeers.clear();

  emitEvent({ type: 'disconnected', reason: 'Room destroyed' });
}

export function leaveMockCurrentRoom(): void {
  destroyMockSyncRoom();
}

// =============================================================================
// Broadcast Message Handler
// =============================================================================

function handleBroadcastMessage(message: BroadcastMessage): void {
  if (!mockRoom || message.roomCode !== mockRoom.roomCode) return;
  if (message.peerId === localPeerId) return; // Ignore own messages

  switch (message.type) {
    case 'join':
      if (!connectedPeers.has(message.peerId)) {
        connectedPeers.add(message.peerId);
        emitEvent({
          type: 'peer-joined',
          peer: {
            id: message.peerId,
            connectedAt: new Date().toISOString(),
          },
        });

        // Send current doc state to the new peer
        if (mockRoom) {
          const state = Y.encodeStateAsUpdate(mockRoom.doc);
          const syncMessage: BroadcastMessage = {
            type: 'sync',
            roomCode: mockRoom.roomCode,
            peerId: localPeerId,
            data: Array.from(state),
          };
          mockRoom.channel.postMessage(syncMessage);
        }
      }
      break;

    case 'leave':
      if (connectedPeers.has(message.peerId)) {
        connectedPeers.delete(message.peerId);
        emitEvent({ type: 'peer-left', peerId: message.peerId });
      }
      break;

    case 'sync':
    case 'update':
      if (message.data && mockRoom) {
        try {
          const update = new Uint8Array(message.data);
          Y.applyUpdate(mockRoom.doc, update);
        } catch (error) {
          console.error('[MockSyncProvider] Failed to apply update:', error);
        }
      }
      break;
  }
}

// =============================================================================
// State Accessors
// =============================================================================

export function getMockActiveRoom(): ISyncRoom | null {
  if (!mockRoom) return null;
  return {
    doc: mockRoom.doc,
    webrtcProvider: createMockWebrtcProvider(),
    persistence: createMockPersistence(),
    roomCode: mockRoom.roomCode,
    password: mockRoom.password,
    createdAt: mockRoom.createdAt,
  };
}

export function hasMockActiveRoom(): boolean {
  return mockRoom !== null;
}

export function getMockConnectionState(): ConnectionState {
  return connectionState;
}

export function getMockConnectedPeerCount(): number {
  return connectedPeers.size;
}

export function getMockLocalPeerId(): string {
  return localPeerId;
}

export function getMockYDoc(): Y.Doc | null {
  return mockRoom?.doc ?? null;
}

export function getMockYMap<T>(name: string): Y.Map<T> | null {
  return mockRoom?.doc.getMap<T>(name) ?? null;
}

export function getMockRetryState(): {
  isRetrying: boolean;
  attempts: number;
  maxAttempts: number;
} {
  return {
    isRetrying: false,
    attempts: 0,
    maxAttempts: P2P_CONFIG.maxReconnectAttempts,
  };
}

export function cancelMockReconnect(): void {
  // No-op in mock
}

// =============================================================================
// Mock Providers (for interface compatibility)
// =============================================================================

/**
 * Creates a mock WebRTC provider that implements the minimal interface
 * needed by the sync system.
 *
 * Note: Double type assertion (as unknown as X) is necessary here because
 * the mock doesn't implement the full WebrtcProvider interface - only the
 * subset needed for testing. This is intentional for mock implementations.
 */
function createMockWebrtcProvider(): ISyncRoom['webrtcProvider'] {
  const mockProvider = {
    connected: connectionState === ConnectionState.Connected,
    awareness: {
      clientID: parseInt(localPeerId.split('-')[1]) || Date.now(),
      getStates: () => {
        const states = new Map<number, Record<string, unknown>>();
        states.set(Date.now(), { user: { name: 'Mock User' } });
        connectedPeers.forEach((peerId) => {
          states.set(parseInt(peerId.split('-')[1]) || Date.now(), {
            user: { name: peerId },
          });
        });
        return states;
      },
      setLocalStateField: () => {},
    },
    disconnect: () => {},
    destroy: () => {},
    on: () => {},
  };
  return mockProvider as unknown as ISyncRoom['webrtcProvider'];
}

/**
 * Creates a mock IndexedDB persistence that implements the minimal interface.
 */
function createMockPersistence(): ISyncRoom['persistence'] {
  const mockPersistence = {
    destroy: () => {},
  };
  return mockPersistence as unknown as ISyncRoom['persistence'];
}

// =============================================================================
// Detection
// =============================================================================

/**
 * Check if we should use mock sync (for E2E testing).
 * Enabled via URL parameter: ?mockSync=true
 */
export function shouldUseMockSync(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mockSync') === 'true';
}
