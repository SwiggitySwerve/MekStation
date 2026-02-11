/**
 * Version History Repository
 *
 * Handles persistence of version snapshots for shared items.
 * Enables rollback and version comparison functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVersionSnapshot,
  IStoredVersionSnapshot,
  ShareableContentType,
} from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for version history persistence
 */
export class VersionHistoryRepository {
  private initialized = false;

  /**
   * Initialize the repository (ensure tables exist)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS version_history (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL CHECK(content_type IN ('unit', 'pilot', 'force', 'encounter')),
        item_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        message TEXT,
        size_bytes INTEGER NOT NULL,
        UNIQUE(item_id, content_type, version)
      );
      
      CREATE INDEX IF NOT EXISTS idx_version_history_item 
        ON version_history(item_id, content_type);
      CREATE INDEX IF NOT EXISTS idx_version_history_version 
        ON version_history(item_id, content_type, version DESC);
      CREATE INDEX IF NOT EXISTS idx_version_history_created 
        ON version_history(created_at DESC);
    `);

    this.initialized = true;
  }

  // ===========================================================================
  // Create / Save Versions
  // ===========================================================================

  /**
   * Save a new version snapshot
   */
  async saveVersion(
    contentType: ShareableContentType,
    itemId: string,
    content: string,
    contentHash: string,
    createdBy: string,
    message?: string,
  ): Promise<IVersionSnapshot> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Get next version number
    const lastVersion = db
      .prepare(
        'SELECT MAX(version) as max_version FROM version_history WHERE item_id = ? AND content_type = ?',
      )
      .get(itemId, contentType) as { max_version: number | null } | undefined;

    const version = (lastVersion?.max_version ?? 0) + 1;
    const id = `ver-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const sizeBytes = new TextEncoder().encode(content).length;

    db.prepare(`
      INSERT INTO version_history (
        id, content_type, item_id, version, content_hash,
        content, created_at, created_by, message, size_bytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      contentType,
      itemId,
      version,
      contentHash,
      content,
      now,
      createdBy,
      message ?? null,
      sizeBytes,
    );

    return {
      id,
      contentType,
      itemId,
      version,
      contentHash,
      content,
      createdAt: now,
      createdBy,
      message: message ?? null,
      sizeBytes,
    };
  }

  // ===========================================================================
  // Query Versions
  // ===========================================================================

  /**
   * Get all versions for an item (newest first)
   */
  async getVersions(
    itemId: string,
    contentType: ShareableContentType,
    limit = 50,
  ): Promise<IVersionSnapshot[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        `SELECT * FROM version_history 
         WHERE item_id = ? AND content_type = ? 
         ORDER BY version DESC 
         LIMIT ?`,
      )
      .all(itemId, contentType, limit) as IStoredVersionSnapshot[];

    return rows.map((row) => this.rowToSnapshot(row));
  }

  /**
   * Get a specific version
   */
  async getVersion(
    itemId: string,
    contentType: ShareableContentType,
    version: number,
  ): Promise<IVersionSnapshot | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        'SELECT * FROM version_history WHERE item_id = ? AND content_type = ? AND version = ?',
      )
      .get(itemId, contentType, version) as IStoredVersionSnapshot | undefined;

    return row ? this.rowToSnapshot(row) : null;
  }

  /**
   * Get the latest version for an item
   */
  async getLatestVersion(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<IVersionSnapshot | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        `SELECT * FROM version_history 
         WHERE item_id = ? AND content_type = ? 
         ORDER BY version DESC 
         LIMIT 1`,
      )
      .get(itemId, contentType) as IStoredVersionSnapshot | undefined;

    return row ? this.rowToSnapshot(row) : null;
  }

  /**
   * Get version by ID
   */
  async getVersionById(id: string): Promise<IVersionSnapshot | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM version_history WHERE id = ?')
      .get(id) as IStoredVersionSnapshot | undefined;

    return row ? this.rowToSnapshot(row) : null;
  }

  /**
   * Get current version number for an item
   */
  async getCurrentVersionNumber(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        'SELECT MAX(version) as max_version FROM version_history WHERE item_id = ? AND content_type = ?',
      )
      .get(itemId, contentType) as { max_version: number | null } | undefined;

    return row?.max_version ?? 0;
  }

  /**
   * Get version count for an item
   */
  async getVersionCount(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        'SELECT COUNT(*) as count FROM version_history WHERE item_id = ? AND content_type = ?',
      )
      .get(itemId, contentType) as { count: number };

    return row.count;
  }

  /**
   * Get total storage used by versions for an item
   */
  async getStorageUsed(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        'SELECT SUM(size_bytes) as total FROM version_history WHERE item_id = ? AND content_type = ?',
      )
      .get(itemId, contentType) as { total: number | null };

    return row.total ?? 0;
  }

  /**
   * Get versions between two version numbers
   */
  async getVersionRange(
    itemId: string,
    contentType: ShareableContentType,
    fromVersion: number,
    toVersion: number,
  ): Promise<IVersionSnapshot[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        `SELECT * FROM version_history 
         WHERE item_id = ? AND content_type = ? 
         AND version >= ? AND version <= ?
         ORDER BY version ASC`,
      )
      .all(
        itemId,
        contentType,
        fromVersion,
        toVersion,
      ) as IStoredVersionSnapshot[];

    return rows.map((row) => this.rowToSnapshot(row));
  }

  // ===========================================================================
  // Delete Versions
  // ===========================================================================

  /**
   * Delete a specific version
   */
  async deleteVersion(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM version_history WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Delete all versions for an item
   */
  async deleteAllVersions(
    itemId: string,
    contentType: ShareableContentType,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare(
        'DELETE FROM version_history WHERE item_id = ? AND content_type = ?',
      )
      .run(itemId, contentType);

    return result.changes;
  }

  /**
   * Delete versions older than a specific version (keep N most recent)
   */
  async pruneOldVersions(
    itemId: string,
    contentType: ShareableContentType,
    keepCount: number,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Get the version number at the cutoff
    const cutoffRow = db
      .prepare(
        `SELECT version FROM version_history 
         WHERE item_id = ? AND content_type = ?
         ORDER BY version DESC 
         LIMIT 1 OFFSET ?`,
      )
      .get(itemId, contentType, keepCount - 1) as
      | { version: number }
      | undefined;

    if (!cutoffRow) {
      return 0; // Not enough versions to prune
    }

    const result = db
      .prepare(
        `DELETE FROM version_history 
         WHERE item_id = ? AND content_type = ? AND version < ?`,
      )
      .run(itemId, contentType, cutoffRow.version);

    return result.changes;
  }

  /**
   * Delete versions older than a specific date
   */
  async pruneByDate(olderThan: string): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM version_history WHERE created_at < ?')
      .run(olderThan);

    return result.changes;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Convert database row to IVersionSnapshot
   */
  private rowToSnapshot(row: IStoredVersionSnapshot): IVersionSnapshot {
    return {
      id: row.id,
      contentType: row.content_type,
      itemId: row.item_id,
      version: row.version,
      contentHash: row.content_hash,
      content: row.content,
      createdAt: row.created_at,
      createdBy: row.created_by,
      message: row.message,
      sizeBytes: row.size_bytes,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

const versionHistoryRepositoryFactory: SingletonFactory<VersionHistoryRepository> =
  createSingleton(
    (): VersionHistoryRepository => new VersionHistoryRepository(),
  );

export function getVersionHistoryRepository(): VersionHistoryRepository {
  return versionHistoryRepositoryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetVersionHistoryRepository(): void {
  versionHistoryRepositoryFactory.reset();
}
