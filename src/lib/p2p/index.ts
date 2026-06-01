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
  answerReconnectRequest,
  applyReplayStreamEvents,
  broadcastEvent,
  broadcastIntent,
  broadcastRejection,
  createReconnectRequestEnvelope,
  createGameSessionChannel,
  createReplayStreamEnvelopes,
  deserializeGameSessionEnvelope,
  getReplayEventsAfterSeq,
  isGameIntent,
  onPeerEvent,
  onPeerIntent,
  onPeerRejection,
  serializeGameSessionEnvelope,
  tryDeserializeGameSessionEnvelope,
  type GameSessionChannelEnvelope,
  type GameSessionChannelLogger,
  type IGameEventEnvelope,
  type IGameIntentEnvelope,
  type IGameSessionChannel,
  type IGameSessionChannelOptions,
  type IPeerRejectedEnvelope,
  type IReconnectPeerMetadata,
  type IReconnectRejectEnvelope,
  type IReconnectRequestEnvelope,
  type IReplayStreamEnvelope,
  type MatchLogPersistence,
  type PeerEventCallback,
  type PeerIntentCallback,
  type PeerRejectedCallback,
  type ReconnectRejectCallback,
  type ReconnectRequestCallback,
  type ReconnectResponseChannel,
  type ReconnectResponseResult,
  type ReplayStreamCallback,
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

export {
  ReplayDiceRoller,
  createReplayDiceRoller,
  type IReplayDiceRoller,
} from './replayDiceRoller';

export {
  embedRollsIntoEvent,
  extractRollsFromEvent,
} from './hostRollEmbedding';

export {
  applyMirrorEvent,
  assertMirrorAppendForbidden,
  createMirrorSession,
  describeMirrorAppendRejection,
  isMirrorSession,
  MirrorAppendForbiddenError,
  type ICreateMirrorSessionOptions,
  type MirrorAppendRejection,
} from './mirrorSession';

export {
  buildActivateMovementEnhancementIntent,
  buildConcedeIntent,
  buildDeclareAttackIntent,
  buildDeclareMovementIntent,
  buildDeclarePhysicalIntent,
  buildEjectIntent,
  buildEndPhaseIntent,
  buildGoProneIntent,
  buildStandIntent,
  buildWithdrawIntent,
  translateIntentToEvents,
  type IActivateMovementEnhancementIntentPayload,
  type IConcedeIntentPayload,
  type IDeclareAttackIntentPayload,
  type IDeclareMovementIntentPayload,
  type IDeclarePhysicalIntentPayload,
  type IEjectIntentPayload,
  type IEndPhaseIntentPayload,
  type IGoProneIntentPayload,
  type IIntentCommandTranslation,
  type IIntentRejection,
  type IIntentTranslation,
  type IStandIntentPayload,
  type IWithdrawIntentPayload,
  type IntentTranslationCommand,
  type IntentRejectionReason,
  type IntentTranslationResult,
} from './intentTranslation';

export {
  createHostIntentRouter,
  type HostIntentRouterResult,
  type IHostIntentBufferState,
  type IHostIntentRouter,
  type IHostIntentRouterAdapter,
} from './hostIntentRouter';

export {
  MATCH_LOG_DB_NAME,
  MATCH_LOG_DB_VERSION,
  MATCH_LOG_RETENTION_MS,
  MATCH_LOG_STORES,
  MatchLogStorage,
  MatchLogStorageError,
  MatchLogStorageUnavailableError,
  appendMatchEvent,
  flushMatchLogWrites,
  getEventsForMatch,
  getLastSequence,
  getMatchMetadata,
  markMatchCompleted,
  matchLogStorage,
  migrateMatchLogDatabase,
  purgeOldMatches,
  upsertMatchMetadata,
  type IMatchEventRecord,
  type IMatchLogFlushInfo,
  type IMatchLogStorageOptions,
  type IMatchMetadataRecord,
  type IMatchMetadataUpsert,
  type IPurgeOldMatchesResult,
  type MatchLogStatus,
  type MatchLogStoreName,
} from './matchLogStorage';

// Hooks
export { useSyncRoom, type UseSyncRoomReturn } from './useSyncRoom';
