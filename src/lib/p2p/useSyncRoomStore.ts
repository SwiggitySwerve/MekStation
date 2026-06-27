/**
 * Sync Room Store
 *
 * Zustand store for managing P2P sync room state.
 * Wraps the SyncProvider for React integration.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { isValidRoomCode, normalizeRoomCode } from './roomCodes';
import {
  ISyncRoomState,
  ISyncRoomActions,
  ConnectionState,
  IPeer,
  ISyncRoomOptions,
} from './types';

// =============================================================================
// Store Type
// =============================================================================

type SyncRoomStore = ISyncRoomState & ISyncRoomActions;
type SyncProviderModule = typeof import('./SyncProvider');

let syncProviderPromise: Promise<SyncProviderModule> | null = null;

function loadSyncProvider(): Promise<SyncProviderModule> {
  syncProviderPromise ??= import('./SyncProvider');
  return syncProviderPromise;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useSyncRoomStore = create<SyncRoomStore>()(
  persist(
    (set, get) => {
      let syncEventsSubscribed = false;

      async function ensureSyncProvider(): Promise<SyncProviderModule> {
        const syncProvider = await loadSyncProvider();
        if (syncEventsSubscribed) {
          return syncProvider;
        }

        syncEventsSubscribed = true;
        syncProvider.onSyncEvent((event) => {
          switch (event.type) {
            case 'connected':
              set({
                connectionState: ConnectionState.Connected,
                localPeerId: syncProvider.getLocalPeerId(),
              });
              // Update awareness with local name
              syncProvider.setLocalAwareness({ name: get().localPeerName });
              break;

            case 'disconnected':
              set({
                activeRoom: null,
                connectionState: ConnectionState.Disconnected,
                peers: [],
                localPeerId: null,
              });
              break;

            case 'peer-joined':
              set((state) => ({
                peers: [...state.peers, event.peer],
              }));
              break;

            case 'peer-left':
              set((state) => ({
                peers: state.peers.filter((p) => p.id !== event.peerId),
              }));
              break;

            case 'error':
              set({
                connectionState: ConnectionState.Error,
                error: event.message,
              });
              break;
          }
        });
        return syncProvider;
      }

      return {
        // State
        activeRoom: null,
        connectionState: ConnectionState.Disconnected,
        peers: [],
        error: null,
        localPeerId: null,
        localPeerName: 'Anonymous',

        // Actions
        createRoom: async (options?: ISyncRoomOptions) => {
          try {
            set({ connectionState: ConnectionState.Connecting, error: null });

            const syncProvider = await ensureSyncProvider();
            const room = syncProvider.createSyncRoom(options);

            set({
              activeRoom: room,
              connectionState: ConnectionState.Connecting,
              localPeerId: syncProvider.getLocalPeerId(),
            });

            return room.roomCode;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to create room';
            set({
              connectionState: ConnectionState.Error,
              error: message,
            });
            throw error;
          }
        },

        joinRoom: async (roomCode: string, password?: string) => {
          const normalized = normalizeRoomCode(roomCode);
          if (!isValidRoomCode(normalized)) {
            set({ error: 'Invalid room code' });
            throw new Error('Invalid room code');
          }

          try {
            set({ connectionState: ConnectionState.Connecting, error: null });

            const syncProvider = await ensureSyncProvider();
            const room = syncProvider.joinSyncRoom(normalized, password);

            set({
              activeRoom: room,
              connectionState: ConnectionState.Connecting,
              localPeerId: syncProvider.getLocalPeerId(),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to join room';
            set({
              connectionState: ConnectionState.Error,
              error: message,
            });
            throw error;
          }
        },

        leaveRoom: () => {
          if (get().activeRoom) {
            void ensureSyncProvider()
              .then((syncProvider) => syncProvider.leaveCurrentRoom())
              .catch((error: unknown) => {
                set({
                  connectionState: ConnectionState.Error,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Failed to leave room',
                });
              });
          }
          set({
            activeRoom: null,
            connectionState: ConnectionState.Disconnected,
            peers: [],
            localPeerId: null,
          });
        },

        setLocalPeerName: (name: string) => {
          set({ localPeerName: name });
          // Update awareness if connected
          if (get().activeRoom) {
            void ensureSyncProvider()
              .then((syncProvider) => syncProvider.setLocalAwareness({ name }))
              .catch((error: unknown) => {
                set({
                  connectionState: ConnectionState.Error,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Failed to update local awareness',
                });
              });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      };
    },
    {
      name: 'mekstation-sync-room',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        localPeerName: state.localPeerName,
      }),
    },
  ),
);

// =============================================================================
// Selector Hooks
// =============================================================================

export function useSyncRoomSelector<T>(
  selector: (state: SyncRoomStore) => T,
): T {
  return useSyncRoomStore(selector);
}

/**
 * Get the current room code.
 */
export function useRoomCode(): string | null {
  return useSyncRoomSelector((state) => state.activeRoom?.roomCode ?? null);
}

/**
 * Get the connection state.
 */
export function useConnectionState(): ConnectionState {
  return useSyncRoomSelector((state) => state.connectionState);
}

/**
 * Get the connected peers.
 */
export function usePeers(): readonly IPeer[] {
  return useSyncRoomSelector((state) => state.peers);
}

/**
 * Get the peer count.
 */
export function usePeerCount(): number {
  return useSyncRoomSelector((state) => state.peers.length);
}

/**
 * Check if connected to a room.
 */
export function useIsConnected(): boolean {
  return useSyncRoomSelector(
    (state) => state.connectionState === ConnectionState.Connected,
  );
}

/**
 * Get the local peer name.
 */
export function useLocalPeerName(): string {
  return useSyncRoomSelector((state) => state.localPeerName);
}
