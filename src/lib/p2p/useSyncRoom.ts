/**
 * useSyncRoom Hook
 *
 * React hook for managing P2P sync rooms.
 * Provides a simple API for creating, joining, and leaving rooms.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameplayStore } from '@/stores/useGameplayStore';

import {
  deriveLocalMatchStatusFromAwareness,
  getGameSessionAwarenessStates,
} from './gameSessionRoles';
import { formatRoomCode } from './roomCodes';
import { getConnectedPeerCount } from './SyncProvider';
import { ConnectionState, IPeer } from './types';
import { useSyncRoomSelector } from './useSyncRoomStore';

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
  const activeRoom = useSyncRoomSelector((state) => state.activeRoom);
  const connectionState = useSyncRoomSelector((state) => state.connectionState);
  const peers = useSyncRoomSelector((state) => state.peers);
  const error = useSyncRoomSelector((state) => state.error);
  const localPeerId = useSyncRoomSelector((state) => state.localPeerId);
  const localPeerNameValue = useSyncRoomSelector(
    (state) => state.localPeerName,
  );
  const createSyncRoom = useSyncRoomSelector((state) => state.createRoom);
  const joinSyncRoom = useSyncRoomSelector((state) => state.joinRoom);
  const leaveSyncRoom = useSyncRoomSelector((state) => state.leaveRoom);
  const setLocalPeerNameAction = useSyncRoomSelector(
    (state) => state.setLocalPeerName,
  );
  const clearSyncError = useSyncRoomSelector((state) => state.clearError);
  const [peerCount, setPeerCount] = useState(0);
  const previousGameSessionPeers = useRef(getGameSessionAwarenessStates());

  // Poll peer count (awareness updates don't always trigger store updates)
  useEffect(() => {
    if (!activeRoom) {
      setPeerCount(0);
      previousGameSessionPeers.current = [];
      return;
    }

    const updatePeerCount = () => {
      setPeerCount(getConnectedPeerCount());
      const currentGameSessionPeers = getGameSessionAwarenessStates(
        activeRoom.webrtcProvider.awareness,
      );
      const status = deriveLocalMatchStatusFromAwareness(
        previousGameSessionPeers.current,
        currentGameSessionPeers,
        localPeerId,
      );
      previousGameSessionPeers.current = currentGameSessionPeers;
      if (status === 'guestPending' || status === 'hostPending') {
        useGameplayStore.getState().setLocalMatchStatus(status);
      } else if (status === 'live') {
        useGameplayStore.getState().resetLocalMatchStatus();
      }
    };

    // Initial count
    updatePeerCount();

    // Poll every second (awareness can be flaky with events)
    const interval = setInterval(updatePeerCount, 1000);

    return () => clearInterval(interval);
  }, [activeRoom, localPeerId]);

  const createRoom = useCallback(
    async (password?: string) => {
      const code = await createSyncRoom({ password });
      return formatRoomCode(code);
    },
    [createSyncRoom],
  );

  const joinRoom = useCallback(
    async (roomCode: string, password?: string) => {
      await joinSyncRoom(roomCode, password);
    },
    [joinSyncRoom],
  );

  const leaveRoom = useCallback(() => {
    leaveSyncRoom();
  }, [leaveSyncRoom]);

  const setLocalPeerName = useCallback(
    (name: string) => {
      setLocalPeerNameAction(name);
    },
    [setLocalPeerNameAction],
  );

  const clearError = useCallback(() => {
    clearSyncError();
  }, [clearSyncError]);

  return {
    roomCode: activeRoom ? formatRoomCode(activeRoom.roomCode) : null,
    rawRoomCode: activeRoom?.roomCode ?? null,
    connectionState,
    isConnected: connectionState === ConnectionState.Connected,
    isConnecting: connectionState === ConnectionState.Connecting,
    peerCount,
    peers,
    error,
    localPeerName: localPeerNameValue,
    createRoom,
    joinRoom,
    leaveRoom,
    setLocalPeerName,
    clearError,
  };
}
