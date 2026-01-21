/**
 * useSyncRoom Hook
 *
 * React hook for managing P2P sync rooms.
 * Provides a simple API for creating, joining, and leaving rooms.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import { useCallback, useEffect, useState } from 'react';
import { useSyncRoomStore } from './useSyncRoomStore';
import { ConnectionState, IPeer } from './types';
import { formatRoomCode } from './roomCodes';
import { getConnectedPeerCount } from './SyncProvider';

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseSyncRoomReturn {
  /** Current room code (formatted for display) */
  roomCode: string | null;
  /** Raw room code (for joining) */
  rawRoomCode: string | null;
  /** Connection state */
  connectionState: ConnectionState;
  /** Whether connected to a room */
  isConnected: boolean;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Number of connected peers */
  peerCount: number;
  /** List of connected peers */
  peers: readonly IPeer[];
  /** Error message if any */
  error: string | null;
  /** Local peer name */
  localPeerName: string;
  /** Create a new room */
  createRoom: (password?: string) => Promise<string>;
  /** Join an existing room */
  joinRoom: (roomCode: string, password?: string) => Promise<void>;
  /** Leave the current room */
  leaveRoom: () => void;
  /** Set local peer name */
  setLocalPeerName: (name: string) => void;
  /** Clear error */
  clearError: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing P2P sync room connections.
 *
 * @example
 * ```tsx
 * function SyncPanel() {
 *   const {
 *     roomCode,
 *     isConnected,
 *     peerCount,
 *     createRoom,
 *     joinRoom,
 *     leaveRoom,
 *   } = useSyncRoom();
 *
 *   if (isConnected) {
 *     return (
 *       <div>
 *         <p>Connected to room: {roomCode}</p>
 *         <p>Peers: {peerCount}</p>
 *         <button onClick={leaveRoom}>Leave</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={() => createRoom()}>Create Room</button>
 *       <button onClick={() => joinRoom('ABC-DEF')}>Join Room</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncRoom(): UseSyncRoomReturn {
  const store = useSyncRoomStore();
  const [peerCount, setPeerCount] = useState(0);

  // Poll peer count (awareness updates don't always trigger store updates)
  useEffect(() => {
    if (!store.activeRoom) {
      setPeerCount(0);
      return;
    }

    const updatePeerCount = () => {
      setPeerCount(getConnectedPeerCount());
    };

    // Initial count
    updatePeerCount();

    // Poll every second (awareness can be flaky with events)
    const interval = setInterval(updatePeerCount, 1000);

    return () => clearInterval(interval);
  }, [store.activeRoom]);

  const createRoom = useCallback(
    async (password?: string) => {
      const code = await store.createRoom({ password });
      return formatRoomCode(code);
    },
    [store]
  );

  const joinRoom = useCallback(
    async (roomCode: string, password?: string) => {
      await store.joinRoom(roomCode, password);
    },
    [store]
  );

  const leaveRoom = useCallback(() => {
    store.leaveRoom();
  }, [store]);

  const setLocalPeerName = useCallback(
    (name: string) => {
      store.setLocalPeerName(name);
    },
    [store]
  );

  const clearError = useCallback(() => {
    store.clearError();
  }, [store]);

  return {
    roomCode: store.activeRoom ? formatRoomCode(store.activeRoom.roomCode) : null,
    rawRoomCode: store.activeRoom?.roomCode ?? null,
    connectionState: store.connectionState,
    isConnected: store.connectionState === ConnectionState.Connected,
    isConnecting: store.connectionState === ConnectionState.Connecting,
    peerCount,
    peers: store.peers,
    error: store.error,
    localPeerName: store.localPeerName,
    createRoom,
    joinRoom,
    leaveRoom,
    setLocalPeerName,
    clearError,
  };
}
