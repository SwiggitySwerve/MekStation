/**
 * Vault Sync Types
 *
 * Change log, sync state, P2P transport type definitions.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ShareableContentType } from './VaultCoreTypes';

// =============================================================================
// Change Log Types
// =============================================================================

export type ChangeType = 'create' | 'update' | 'delete' | 'move';

export interface IChangeLogEntry {
  id: string;
  changeType: ChangeType;
  contentType: ShareableContentType | 'folder';
  itemId: string;
  timestamp: string;
  version: number;
  contentHash: string | null;
  data: string | null;
  synced: boolean;
  sourceId: string | null;
}

export interface IStoredChangeLogEntry {
  id: string;
  change_type: ChangeType;
  content_type: ShareableContentType | 'folder';
  item_id: string;
  timestamp: string;
  version: number;
  content_hash: string | null;
  data: string | null;
  synced: number;
  source_id: string | null;
}

// =============================================================================
// Sync State Types
// =============================================================================

export interface ISyncState {
  peerId: string;
  lastVersion: number;
  lastSyncAt: string | null;
  status: 'idle' | 'syncing' | 'error';
  pendingOutbound: number;
  pendingInbound: number;
}

export interface ISyncConflict {
  id: string;
  contentType: ShareableContentType | 'folder';
  itemId: string;
  itemName: string;
  localVersion: number;
  localHash: string;
  remoteVersion: number;
  remoteHash: string;
  remotePeerId: string;
  detectedAt: string;
  resolution: 'pending' | 'local' | 'remote' | 'merged' | 'forked';
}

export interface IStoredSyncConflict {
  id: string;
  content_type: ShareableContentType | 'folder';
  item_id: string;
  item_name: string;
  local_version: number;
  local_hash: string;
  remote_version: number;
  remote_hash: string;
  remote_peer_id: string;
  detected_at: string;
  resolution: 'pending' | 'local' | 'remote' | 'merged' | 'forked';
}

// =============================================================================
// P2P Transport Types
// =============================================================================

export type P2PConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed';

export type P2PMessageType =
  | 'handshake'
  | 'handshake_ack'
  | 'sync_request'
  | 'sync_response'
  | 'change'
  | 'change_ack'
  | 'ping'
  | 'pong'
  | 'error';

export interface IP2PMessage {
  type: P2PMessageType;
  messageId: string;
  senderId: string;
  timestamp: string;
  payload: unknown;
  signature?: string;
}

export interface IHandshakePayload {
  protocolVersion: string;
  publicKey: string;
  displayName: string;
  features: string[];
  lastSyncVersion: number;
}

export interface ISyncRequestPayload {
  fromVersion: number;
  limit: number;
  contentTypes: (ShareableContentType | 'folder')[] | null;
}

export interface ISyncResponsePayload {
  changes: IChangeLogEntry[];
  hasMore: boolean;
  currentVersion: number;
}

export interface IChangePayload {
  change: IChangeLogEntry;
  content?: string;
}

export interface ISignalingMessage {
  targetId: string;
  sourceId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: string;
  timestamp: string;
}

export interface IP2PConnection {
  peerId: string;
  state: P2PConnectionState;
  connectedAt: string | null;
  dataChannelState: 'connecting' | 'open' | 'closing' | 'closed';
  rtt: number | null;
  bytesSent: number;
  bytesReceived: number;
}
