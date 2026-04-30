/**
 * P2P Vault Sync Module
 *
 * Provides peer-to-peer synchronization for vault items using
 * WebRTC (via y-webrtc) and CRDTs (via Yjs).
 *
 * @example
 * ```tsx
 * import { useSyncRoom, useSyncedVaultStore } from '@/lib/p2p';
 *
 * function SyncPanel() {
 *   const { roomCode, isConnected, createRoom, joinRoom, leaveRoom } = useSyncRoom();
 *   const { items, addItem, toggleSync } = useSyncedVaultStore();
 *
 *   // Create or join a room, then sync items
 * }
 * ```
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

// Types
export {
  ConnectionState,
  SyncState,
  type IPeer,
  type ISyncRoom,
  type ISyncRoomOptions,
  type ISyncableVaultItem,
  type ISyncMetadata,
  type SyncableItemType,
  type SyncEvent,
  type SyncEventListener,
  P2P_CONFIG,
} from './types';

// Room Codes
export {
  generateRoomCode,
  formatRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  parseRoomCode,
  getRoomCodeHint,
  getRoomCodePlaceholder,
} from './roomCodes';

// Sync Provider
export {
  createSyncRoom,
  joinSyncRoom,
  destroySyncRoom,
  leaveCurrentRoom,
  getActiveRoom,
  hasActiveRoom,
  getConnectionState,
  getConnectedPeerCount,
  getLocalPeerId,
  setLocalAwareness,
  getAllAwarenessStates,
  getYDoc,
  getYMap,
  getYArray,
  onSyncEvent,
  // Retry management
  getRetryState,
  cancelReconnect,
} from './SyncProvider';

// Stores
export {
  useSyncRoomStore,
  useRoomCode,
  useConnectionState,
  usePeers,
  usePeerCount,
  useIsConnected,
  useLocalPeerName,
  useSyncRoomSelector,
} from './useSyncRoomStore';

export {
  useSyncedVaultStore,
  useSyncedItems,
  useSyncedItemsByType,
  useSyncedUnits,
  useSyncedPilots,
  useSyncedForces,
  useSyncedItem,
  useItemSyncState,
} from './useSyncedVaultStore';

export {
  GAME_SESSION_EVENTS_ARRAY,
  broadcastEvent,
  broadcastIntent,
  broadcastRejection,
  createGameSessionChannel,
  deserializeGameSessionEnvelope,
  isGameIntent,
  onPeerEvent,
  onPeerIntent,
  onPeerRejection,
  serializeGameSessionEnvelope,
  tryDeserializeGameSessionEnvelope,
  type GameSessionChannelEnvelope,
  type IGameEventEnvelope,
  type IGameIntentEnvelope,
  type IGameSessionChannel,
  type IGameSessionChannelOptions,
  type IPeerRejectedEnvelope,
  type PeerEventCallback,
  type PeerIntentCallback,
  type PeerRejectedCallback,
} from './gameSessionChannel';

export {
  GAME_SESSION_AWARENESS_FIELD,
  getGameSessionAwarenessStates,
  joinLocalPeerAsGuest,
  onGameSessionLifecycleEvent,
  promoteLocalPeerToHost,
  type GameSessionLifecycleEvent,
  type GameSessionPeerRole,
  type IGameSessionAwarenessAdapter,
  type IGameSessionAwarenessState,
  type IGameSessionRoleOptions,
} from './gameSessionRoles';

export {
  LOBBY_MAP_NAME,
  LOBBY_STATE_KEY,
  createLobbyChannel,
  readLobbyState,
  type ILobbyChannel,
  type ILobbyChannelOptions,
  type ILobbyChannelResult,
  type LobbyRejectionCallback,
  type LobbyRejectionReason,
  type LobbyStateCallback,
} from './lobbyChannel';

// Hooks
export { useSyncRoom, type UseSyncRoomReturn } from './useSyncRoom';
