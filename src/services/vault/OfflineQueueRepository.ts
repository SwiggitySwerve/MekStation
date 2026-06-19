/**
 * Offline Queue Repository
 *
 * Handles persistence of queued messages for offline peers.
 * Supports store-and-forward pattern for P2P sync.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IQueuedMessage,
  IStoredQueuedMessage,
  QueuedMessageStatus,
  P2PMessageType,
  IPeerQueueSummary,
  IQueueStats,
} from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

// =============================================================================
// Constants
// =============================================================================

/** Default message expiry time (7 days) */
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum retry attempts */
const MAX_ATTEMPTS = 5;

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for offline message queue persistence
 */
export class OfflineQueueRepository {
  private initialized = false;

  /**
   * Initialize the repository (ensure tables exist)
   */
  readonly initialize = async (): Promise<void> => {
    if (this.initialized) return;

    const database = getSQLiteService();
    await database.initialize();

    database.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        target_peer_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        queued_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sending', 'sent', 'failed', 'expired')),
        priority INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_offline_queue_peer 
        ON offline_queue(target_peer_id, status);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_status 
        ON offline_queue(status);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_expires 
        ON offline_queue(expires_at);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_priority 
        ON offline_queue(priority DESC, queued_at ASC);
    `);

    this.initialized = true;
  };

  // ===========================================================================
  // Queue Messages
  // ===========================================================================

  /**
   * Add a message to the queue
   */
  readonly enqueue = async (
    targetPeerId: string,
    messageType: P2PMessageType,
    payload: string,
    options?: {
      expiryMs?: number;
      priority?: number;
    },
  ): Promise<IQueuedMessage> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const id = `msg-${crypto.randomUUID()}`;
    const now = new Date();
    const queuedAt = now.toISOString();
    const expiryMs = options?.expiryMs ?? DEFAULT_EXPIRY_MS;
    const expiresAt = new Date(now.getTime() + expiryMs).toISOString();
    const priority = options?.priority ?? 0;
    const sizeBytes = new TextEncoder().encode(payload).length;

    database
      .prepare(`
      INSERT INTO offline_queue (
        id, target_peer_id, message_type, payload, queued_at, expires_at,
        attempts, last_attempt_at, status, priority, size_bytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        id,
        targetPeerId,
        messageType,
        payload,
        queuedAt,
        expiresAt,
        0,
        null,
        'pending',
        priority,
        sizeBytes,
      );

    return {
      id,
      targetPeerId,
      messageType,
      payload,
      queuedAt,
      expiresAt,
      attempts: 0,
      lastAttemptAt: null,
      status: 'pending',
      priority,
      sizeBytes,
    };
  };

  /**
   * Get pending messages for a peer (oldest first, respecting priority)
   */
  readonly getPendingForPeer = async (
    peerId: string,
    limit = 50,
  ): Promise<IQueuedMessage[]> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const rows = database
      .prepare(
        `SELECT * FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'pending'
         ORDER BY priority DESC, queued_at ASC
         LIMIT ?`,
      )
      .all(peerId, limit) as IStoredQueuedMessage[];

    return rows.map((row) => this.rowToMessage(row));
  };

  /**
   * Get all pending messages
   */
  readonly getAllPending = async (limit = 100): Promise<IQueuedMessage[]> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const rows = database
      .prepare(
        `SELECT * FROM offline_queue 
         WHERE status = 'pending'
         ORDER BY priority DESC, queued_at ASC
         LIMIT ?`,
      )
      .all(limit) as IStoredQueuedMessage[];

    return rows.map((row) => this.rowToMessage(row));
  };

  /**
   * Get a message by ID
   */
  readonly getById = async (id: string): Promise<IQueuedMessage | null> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const row = database
      .prepare('SELECT * FROM offline_queue WHERE id = ?')
      .get(id) as IStoredQueuedMessage | undefined;

    return row ? this.rowToMessage(row) : null;
  };

  // ===========================================================================
  // Update Status
  // ===========================================================================

  /**
   * Mark a message as sending (in progress)
   */
  readonly markSending = async (id: string): Promise<boolean> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = database
      .prepare(
        `UPDATE offline_queue 
         SET status = 'sending', attempts = attempts + 1, last_attempt_at = ?
         WHERE id = ? AND status IN ('pending', 'failed')`,
      )
      .run(now, id);

    return result.changes > 0;
  };

  /**
   * Mark a message as successfully sent
   */
  readonly markSent = async (id: string): Promise<boolean> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare("UPDATE offline_queue SET status = 'sent' WHERE id = ?")
      .run(id);

    return result.changes > 0;
  };

  /**
   * Mark a message as failed
   */
  readonly markFailed = async (id: string): Promise<boolean> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    // Check if we've exceeded max attempts
    const message = await this.getById(id);
    if (!message) return false;

    const newStatus = message.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

    const result = database
      .prepare('UPDATE offline_queue SET status = ? WHERE id = ?')
      .run(newStatus, id);

    return result.changes > 0;
  };

  /**
   * Mark expired messages
   */
  readonly markExpired = async (): Promise<number> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = database
      .prepare(
        `UPDATE offline_queue 
         SET status = 'expired' 
         WHERE status IN ('pending', 'failed') AND expires_at < ?`,
      )
      .run(now);

    return result.changes;
  };

  // ===========================================================================
  // Delete Messages
  // ===========================================================================

  /**
   * Delete a message by ID
   */
  readonly delete = async (id: string): Promise<boolean> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare('DELETE FROM offline_queue WHERE id = ?')
      .run(id);

    return result.changes > 0;
  };

  /**
   * Delete all sent messages
   */
  readonly deleteSent = async (): Promise<number> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare("DELETE FROM offline_queue WHERE status = 'sent'")
      .run();

    return result.changes;
  };

  /**
   * Delete all expired messages
   */
  readonly deleteExpired = async (): Promise<number> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare("DELETE FROM offline_queue WHERE status = 'expired'")
      .run();

    return result.changes;
  };

  /**
   * Delete all messages for a peer
   */
  readonly deleteForPeer = async (peerId: string): Promise<number> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare('DELETE FROM offline_queue WHERE target_peer_id = ?')
      .run(peerId);

    return result.changes;
  };

  /**
   * Delete messages older than a date
   */
  readonly deleteOlderThan = async (date: string): Promise<number> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const result = database
      .prepare('DELETE FROM offline_queue WHERE queued_at < ?')
      .run(date);

    return result.changes;
  };

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get queue summary for a peer
   */
  readonly getPeerSummary = async (
    peerId: string,
  ): Promise<IPeerQueueSummary> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const pending = database
      .prepare(
        `SELECT COUNT(*) as count, SUM(size_bytes) as size, MIN(queued_at) as oldest
         FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'pending'`,
      )
      .get(peerId) as {
      count: number;
      size: number | null;
      oldest: string | null;
    };

    const failed = database
      .prepare(
        `SELECT COUNT(*) as count 
         FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'failed'`,
      )
      .get(peerId) as { count: number };

    const lastSuccess = database
      .prepare(
        `SELECT MAX(last_attempt_at) as last 
         FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'sent'`,
      )
      .get(peerId) as { last: string | null };

    return {
      peerId,
      pendingCount: pending.count,
      pendingSizeBytes: pending.size ?? 0,
      oldestPending: pending.oldest,
      failedCount: failed.count,
      lastSuccessAt: lastSuccess.last,
    };
  };

  /**
   * Get overall queue statistics
   */
  readonly getStats = async (): Promise<IQueueStats> => {
    await this.initialize();
    const database = getSQLiteService().getDatabase();

    const total = database
      .prepare(
        'SELECT COUNT(*) as count, SUM(size_bytes) as size FROM offline_queue',
      )
      .get() as { count: number; size: number | null };

    const byStatus = database
      .prepare(
        `SELECT status, COUNT(*) as count 
         FROM offline_queue 
         GROUP BY status`,
      )
      .all() as Array<{ status: QueuedMessageStatus; count: number }>;

    const peers = database
      .prepare(
        'SELECT COUNT(DISTINCT target_peer_id) as count FROM offline_queue',
      )
      .get() as { count: number };

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const expiring = database
      .prepare(
        `SELECT COUNT(*) as count 
         FROM offline_queue 
         WHERE status = 'pending' AND expires_at < ?`,
      )
      .get(oneHourFromNow) as { count: number };

    const statusCounts: Record<QueuedMessageStatus, number> = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      expired: 0,
    };

    for (const row of byStatus) {
      statusCounts[row.status] = row.count;
    }

    return {
      totalMessages: total.count,
      byStatus: statusCounts,
      totalSizeBytes: total.size ?? 0,
      targetPeerCount: peers.count,
      expiringSoon: expiring.count,
    };
  };

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Convert database row to IQueuedMessage
   */
  private rowToMessage(row: IStoredQueuedMessage): IQueuedMessage {
    return {
      id: row.id,
      targetPeerId: row.target_peer_id,
      messageType: row.message_type,
      payload: row.payload,
      queuedAt: row.queued_at,
      expiresAt: row.expires_at,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at,
      status: row.status,
      priority: row.priority,
      sizeBytes: row.size_bytes,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

const offlineQueueRepositoryFactory: SingletonFactory<OfflineQueueRepository> =
  createSingleton((): OfflineQueueRepository => new OfflineQueueRepository());

export function getOfflineQueueRepository(): OfflineQueueRepository {
  return offlineQueueRepositoryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetOfflineQueueRepository(): void {
  offlineQueueRepositoryFactory.reset();
}
