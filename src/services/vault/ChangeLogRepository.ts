/**
 * Change Log Repository
 *
 * Handles persistence of change log entries for sync operations.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IChangeLogEntry,
  IStoredChangeLogEntry,
  ChangeType,
  ShareableContentType,
} from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for change log persistence
 */
export class ChangeLogRepository {
  private initialized = false;

  /**
   * Initialize the repository (ensure tables exist)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    // Create change log table
    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_change_log (
        id TEXT PRIMARY KEY,
        change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'delete', 'move')),
        content_type TEXT NOT NULL CHECK(content_type IN ('unit', 'pilot', 'force', 'encounter', 'folder')),
        item_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        version INTEGER NOT NULL,
        content_hash TEXT,
        data TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        source_id TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_change_log_item 
        ON vault_change_log(item_id, content_type);
      CREATE INDEX IF NOT EXISTS idx_vault_change_log_version 
        ON vault_change_log(version);
      CREATE INDEX IF NOT EXISTS idx_vault_change_log_synced 
        ON vault_change_log(synced);
      CREATE INDEX IF NOT EXISTS idx_vault_change_log_timestamp 
        ON vault_change_log(timestamp);
      
      -- Sync conflicts table
      CREATE TABLE IF NOT EXISTS vault_sync_conflicts (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        local_version INTEGER NOT NULL,
        local_hash TEXT NOT NULL,
        remote_version INTEGER NOT NULL,
        remote_hash TEXT NOT NULL,
        remote_peer_id TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolution TEXT NOT NULL DEFAULT 'pending' CHECK(resolution IN ('pending', 'local', 'remote', 'merged', 'forked'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_sync_conflicts_item 
        ON vault_sync_conflicts(item_id, content_type);
      CREATE INDEX IF NOT EXISTS idx_vault_sync_conflicts_resolution 
        ON vault_sync_conflicts(resolution);
    `);

    this.initialized = true;
  }

  // ===========================================================================
  // Change Log Operations
  // ===========================================================================

  /**
   * Record a change to the log
   */
  async recordChange(
    changeType: ChangeType,
    contentType: ShareableContentType | 'folder',
    itemId: string,
    contentHash: string | null,
    data: string | null,
    sourceId: string | null = null,
  ): Promise<IChangeLogEntry> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `change-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    // Get next version number
    const maxVersion = db
      .prepare('SELECT MAX(version) as max FROM vault_change_log')
      .get() as { max: number | null };
    const version = (maxVersion.max || 0) + 1;

    db.prepare(`
      INSERT INTO vault_change_log (
        id, change_type, content_type, item_id, timestamp, 
        version, content_hash, data, synced, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      changeType,
      contentType,
      itemId,
      timestamp,
      version,
      contentHash,
      data,
      sourceId ? 1 : 0, // Local changes start unsynced, remote changes are already synced
      sourceId,
    );

    return {
      id,
      changeType,
      contentType,
      itemId,
      timestamp,
      version,
      contentHash,
      data,
      synced: !!sourceId,
      sourceId,
    };
  }

  /**
   * Get all unsynced changes
   */
  async getUnsynced(): Promise<IChangeLogEntry[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_change_log WHERE synced = 0 ORDER BY version ASC',
      )
      .all() as IStoredChangeLogEntry[];

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get changes since a specific version
   */
  async getChangesSince(
    version: number,
    limit = 100,
  ): Promise<IChangeLogEntry[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_change_log WHERE version > ? ORDER BY version ASC LIMIT ?',
      )
      .all(version, limit) as IStoredChangeLogEntry[];

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get latest change for an item
   */
  async getLatestForItem(
    itemId: string,
    contentType: ShareableContentType | 'folder',
  ): Promise<IChangeLogEntry | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(`
        SELECT * FROM vault_change_log 
        WHERE item_id = ? AND content_type = ?
        ORDER BY version DESC LIMIT 1
      `)
      .get(itemId, contentType) as IStoredChangeLogEntry | undefined;

    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Get current version number
   */
  async getCurrentVersion(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('SELECT MAX(version) as max FROM vault_change_log')
      .get() as { max: number | null };

    return result.max || 0;
  }

  /**
   * Mark changes as synced
   */
  async markSynced(changeIds: string[]): Promise<number> {
    await this.initialize();
    if (changeIds.length === 0) return 0;

    const db = getSQLiteService().getDatabase();
    const placeholders = changeIds.map(() => '?').join(',');

    const result = db
      .prepare(
        `UPDATE vault_change_log SET synced = 1 WHERE id IN (${placeholders})`,
      )
      .run(...changeIds);

    return result.changes;
  }

  /**
   * Get all changes for an item
   */
  async getHistoryForItem(
    itemId: string,
    contentType: ShareableContentType | 'folder',
  ): Promise<IChangeLogEntry[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(`
        SELECT * FROM vault_change_log 
        WHERE item_id = ? AND content_type = ?
        ORDER BY version ASC
      `)
      .all(itemId, contentType) as IStoredChangeLogEntry[];

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Prune old synced changes (keep recent history)
   */
  async pruneOldChanges(keepCount = 1000): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare(`
      DELETE FROM vault_change_log 
      WHERE synced = 1 AND version < (
        SELECT MIN(version) FROM (
          SELECT version FROM vault_change_log ORDER BY version DESC LIMIT ?
        )
      )
    `)
      .run(keepCount);

    return result.changes;
  }

  // ===========================================================================
  // Conflict Operations
  // ===========================================================================

  /**
   * Record a sync conflict
   */
  async recordConflict(conflict: {
    contentType: ShareableContentType | 'folder';
    itemId: string;
    itemName: string;
    localVersion: number;
    localHash: string;
    remoteVersion: number;
    remoteHash: string;
    remotePeerId: string;
  }): Promise<string> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `conflict-${crypto.randomUUID()}`;
    const detectedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO vault_sync_conflicts (
        id, content_type, item_id, item_name, local_version, local_hash,
        remote_version, remote_hash, remote_peer_id, detected_at, resolution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id,
      conflict.contentType,
      conflict.itemId,
      conflict.itemName,
      conflict.localVersion,
      conflict.localHash,
      conflict.remoteVersion,
      conflict.remoteHash,
      conflict.remotePeerId,
      detectedAt,
    );

    return id;
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<
    Array<{
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
    }>
  > {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        "SELECT * FROM vault_sync_conflicts WHERE resolution = 'pending' ORDER BY detected_at DESC",
      )
      .all() as Array<{
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
    }>;

    return rows.map((row) => ({
      id: row.id,
      contentType: row.content_type,
      itemId: row.item_id,
      itemName: row.item_name,
      localVersion: row.local_version,
      localHash: row.local_hash,
      remoteVersion: row.remote_version,
      remoteHash: row.remote_hash,
      remotePeerId: row.remote_peer_id,
      detectedAt: row.detected_at,
    }));
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merged' | 'forked',
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_sync_conflicts SET resolution = ? WHERE id = ?')
      .run(resolution, conflictId);

    return result.changes > 0;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Convert database row to IChangeLogEntry
   */
  private rowToEntry(row: IStoredChangeLogEntry): IChangeLogEntry {
    return {
      id: row.id,
      changeType: row.change_type,
      contentType: row.content_type,
      itemId: row.item_id,
      timestamp: row.timestamp,
      version: row.version,
      contentHash: row.content_hash,
      data: row.data,
      synced: row.synced === 1,
      sourceId: row.source_id,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let changeLogRepository: ChangeLogRepository | null = null;

export function getChangeLogRepository(): ChangeLogRepository {
  if (!changeLogRepository) {
    changeLogRepository = new ChangeLogRepository();
  }
  return changeLogRepository;
}

/**
 * Reset the singleton (for testing)
 */
export function resetChangeLogRepository(): void {
  changeLogRepository = null;
}
