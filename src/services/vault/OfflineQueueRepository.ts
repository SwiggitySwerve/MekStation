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
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    db.getDatabase().exec(`
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
  }

  // ===========================================================================
  // Queue Messages
  // ===========================================================================

  /**
   * Add a message to the queue
   */
  async enqueue(
    targetPeerId: string,
    messageType: P2PMessageType,
    payload: string,
    options?: {
      expiryMs?: number;
      priority?: number;
    },
  ): Promise<IQueuedMessage> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `msg-${crypto.randomUUID()}`;
    const now = new Date();
    const queuedAt = now.toISOString();
    const expiryMs = options?.expiryMs ?? DEFAULT_EXPIRY_MS;
    const expiresAt = new Date(now.getTime() + expiryMs).toISOString();
    const priority = options?.priority ?? 0;
    const sizeBytes = new TextEncoder().encode(payload).length;

    db.prepare(`
      INSERT INTO offline_queue (
        id, target_peer_id, message_type, payload, queued_at, expires_at,
        attempts, last_attempt_at, status, priority, size_bytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
  }

  /**
   * Get pending messages for a peer (oldest first, respecting priority)
   */
  async getPendingForPeer(
    peerId: string,
    limit = 50,
  ): Promise<IQueuedMessage[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        `SELECT * FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'pending'
         ORDER BY priority DESC, queued_at ASC
         LIMIT ?`,
      )
      .all(peerId, limit) as IStoredQueuedMessage[];

    return rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Get all pending messages
   */
  async getAllPending(limit = 100): Promise<IQueuedMessage[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        `SELECT * FROM offline_queue 
         WHERE status = 'pending'
         ORDER BY priority DESC, queued_at ASC
         LIMIT ?`,
      )
      .all(limit) as IStoredQueuedMessage[];

    return rows.map((row) => this.rowToMessage(row));
  }

  /**
   * Get a message by ID
   */
  async getById(id: string): Promise<IQueuedMessage | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM offline_queue WHERE id = ?')
      .get(id) as IStoredQueuedMessage | undefined;

    return row ? this.rowToMessage(row) : null;
  }

  // ===========================================================================
  // Update Status
  // ===========================================================================

  /**
   * Mark a message as sending (in progress)
   */
  async markSending(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        `UPDATE offline_queue 
         SET status = 'sending', attempts = attempts + 1, last_attempt_at = ?
         WHERE id = ? AND status IN ('pending', 'failed')`,
      )
      .run(now, id);

    return result.changes > 0;
  }

  /**
   * Mark a message as successfully sent
   */
  async markSent(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare("UPDATE offline_queue SET status = 'sent' WHERE id = ?")
      .run(id);

    return result.changes > 0;
  }

  /**
   * Mark a message as failed
   */
  async markFailed(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Check if we've exceeded max attempts
    const message = await this.getById(id);
    if (!message) return false;

    const newStatus = message.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

    const result = db
      .prepare('UPDATE offline_queue SET status = ? WHERE id = ?')
      .run(newStatus, id);

    return result.changes > 0;
  }

  /**
   * Mark expired messages
   */
  async markExpired(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        `UPDATE offline_queue 
         SET status = 'expired' 
         WHERE status IN ('pending', 'failed') AND expires_at < ?`,
      )
      .run(now);

    return result.changes;
  }

  // ===========================================================================
  // Delete Messages
  // ===========================================================================

  /**
   * Delete a message by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db.prepare('DELETE FROM offline_queue WHERE id = ?').run(id);

    return result.changes > 0;
  }

  /**
   * Delete all sent messages
   */
  async deleteSent(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare("DELETE FROM offline_queue WHERE status = 'sent'")
      .run();

    return result.changes;
  }

  /**
   * Delete all expired messages
   */
  async deleteExpired(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare("DELETE FROM offline_queue WHERE status = 'expired'")
      .run();

    return result.changes;
  }

  /**
   * Delete all messages for a peer
   */
  async deleteForPeer(peerId: string): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM offline_queue WHERE target_peer_id = ?')
      .run(peerId);

    return result.changes;
  }

  /**
   * Delete messages older than a date
   */
  async deleteOlderThan(date: string): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM offline_queue WHERE queued_at < ?')
      .run(date);

    return result.changes;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get queue summary for a peer
   */
  async getPeerSummary(peerId: string): Promise<IPeerQueueSummary> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const pending = db
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

    const failed = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM offline_queue 
         WHERE target_peer_id = ? AND status = 'failed'`,
      )
      .get(peerId) as { count: number };

    const lastSuccess = db
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
  }

  /**
   * Get overall queue statistics
   */
  async getStats(): Promise<IQueueStats> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const total = db
      .prepare(
        'SELECT COUNT(*) as count, SUM(size_bytes) as size FROM offline_queue',
      )
      .get() as { count: number; size: number | null };

    const byStatus = db
      .prepare(
        `SELECT status, COUNT(*) as count 
         FROM offline_queue 
         GROUP BY status`,
      )
      .all() as Array<{ status: QueuedMessageStatus; count: number }>;

    const peers = db
      .prepare(
        'SELECT COUNT(DISTINCT target_peer_id) as count FROM offline_queue',
      )
      .get() as { count: number };

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const expiring = db
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
  }

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

let offlineQueueRepository: OfflineQueueRepository | null = null;

export function getOfflineQueueRepository(): OfflineQueueRepository {
  if (!offlineQueueRepository) {
    offlineQueueRepository = new OfflineQueueRepository();
  }
  return offlineQueueRepository;
}

/**
 * Reset the singleton (for testing)
 */
export function resetOfflineQueueRepository(): void {
  offlineQueueRepository = null;
}
