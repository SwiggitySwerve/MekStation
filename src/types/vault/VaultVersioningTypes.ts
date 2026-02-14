/**
 * Vault Versioning Types
 *
 * Version history and offline queue type definitions.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ShareableContentType } from './VaultCoreTypes';
import type { P2PMessageType } from './VaultSyncTypes';

// =============================================================================
// Version History Types
// =============================================================================

export interface IVersionSnapshot {
  id: string;
  contentType: ShareableContentType;
  itemId: string;
  version: number;
  contentHash: string;
  content: string;
  createdAt: string;
  createdBy: string;
  message: string | null;
  sizeBytes: number;
}

export interface IStoredVersionSnapshot {
  id: string;
  content_type: ShareableContentType;
  item_id: string;
  version: number;
  content_hash: string;
  content: string;
  created_at: string;
  created_by: string;
  message: string | null;
  size_bytes: number;
}

export interface IVersionDiff {
  fromVersion: number;
  toVersion: number;
  contentType: ShareableContentType;
  itemId: string;
  changedFields: string[];
  /**
   * Intentionally typed as Record<string, unknown>:
   * Represents arbitrary JSON diff data where field names/types vary by content type.
   */
  additions: Record<string, unknown>;
  /**
   * Intentionally typed as Record<string, unknown>:
   * Represents arbitrary JSON diff data where field names/types vary by content type.
   */
  deletions: Record<string, unknown>;
  modifications: Record<string, { from: unknown; to: unknown }>;
}

export interface IVersionHistorySummary {
  itemId: string;
  contentType: ShareableContentType;
  currentVersion: number;
  totalVersions: number;
  oldestVersion: string | null;
  newestVersion: string | null;
  totalSizeBytes: number;
}

// =============================================================================
// Offline Queue Types
// =============================================================================

export type QueuedMessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'expired';

export interface IQueuedMessage {
  id: string;
  targetPeerId: string;
  messageType: P2PMessageType;
  payload: string;
  queuedAt: string;
  expiresAt: string;
  attempts: number;
  lastAttemptAt: string | null;
  status: QueuedMessageStatus;
  priority: number;
  sizeBytes: number;
}

export interface IStoredQueuedMessage {
  id: string;
  target_peer_id: string;
  message_type: P2PMessageType;
  payload: string;
  queued_at: string;
  expires_at: string;
  attempts: number;
  last_attempt_at: string | null;
  status: QueuedMessageStatus;
  priority: number;
  size_bytes: number;
}

export interface IPeerQueueSummary {
  peerId: string;
  pendingCount: number;
  pendingSizeBytes: number;
  oldestPending: string | null;
  failedCount: number;
  lastSuccessAt: string | null;
}

export interface IQueueStats {
  totalMessages: number;
  byStatus: Record<QueuedMessageStatus, number>;
  totalSizeBytes: number;
  targetPeerCount: number;
  expiringSoon: number;
}
