/**
 * Identity Repository
 *
 * Handles persistence of vault identities to SQLite (server-side).
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IStoredIdentity, IEncryptedData } from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for vault identity persistence
 */
export class IdentityRepository {
  private initialized = false;

  /**
   * Initialize the repository (ensure table exists)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    // Create identity table if not exists
    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_identities (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        friend_code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        avatar TEXT,
        is_active INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_identities_friend_code 
        ON vault_identities(friend_code);
    `);

    this.initialized = true;
  }

  /**
   * Save a new identity
   */
  async save(identity: IStoredIdentity): Promise<void> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const stmt = db.prepare(`
      INSERT INTO vault_identities (
        id, display_name, public_key, encrypted_private_key, 
        friend_code, created_at, avatar, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      identity.id,
      identity.displayName,
      identity.publicKey,
      JSON.stringify(identity.encryptedPrivateKey),
      identity.friendCode,
      identity.createdAt,
      identity.avatar || null,
      1, // New identity is active by default
    );
  }

  /**
   * Get the active identity
   */
  async getActive(): Promise<IStoredIdentity | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_identities WHERE is_active = 1 LIMIT 1')
      .get() as StoredIdentityRow | undefined;

    return row ? this.rowToIdentity(row) : null;
  }

  /**
   * Get identity by ID
   */
  async getById(id: string): Promise<IStoredIdentity | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_identities WHERE id = ?')
      .get(id) as StoredIdentityRow | undefined;

    return row ? this.rowToIdentity(row) : null;
  }

  /**
   * Get identity by friend code
   */
  async getByFriendCode(friendCode: string): Promise<IStoredIdentity | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_identities WHERE friend_code = ?')
      .get(friendCode.toUpperCase()) as StoredIdentityRow | undefined;

    return row ? this.rowToIdentity(row) : null;
  }

  /**
   * Get all identities
   */
  async getAll(): Promise<IStoredIdentity[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_identities ORDER BY created_at DESC')
      .all() as StoredIdentityRow[];

    return rows.map((row) => this.rowToIdentity(row));
  }

  /**
   * Set an identity as active (deactivates others)
   */
  async setActive(id: string): Promise<void> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    db.exec('UPDATE vault_identities SET is_active = 0');
    db.prepare('UPDATE vault_identities SET is_active = 1 WHERE id = ?').run(
      id,
    );
  }

  /**
   * Update identity display name or avatar
   */
  async update(
    id: string,
    updates: { displayName?: string; avatar?: string },
  ): Promise<void> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (updates.displayName !== undefined) {
      sets.push('display_name = ?');
      values.push(updates.displayName);
    }

    if (updates.avatar !== undefined) {
      sets.push('avatar = ?');
      values.push(updates.avatar || null);
    }

    if (sets.length === 0) return;

    values.push(id);
    db.prepare(
      `UPDATE vault_identities SET ${sets.join(', ')} WHERE id = ?`,
    ).run(...values);
  }

  /**
   * Delete an identity
   */
  async delete(id: string): Promise<void> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    db.prepare('DELETE FROM vault_identities WHERE id = ?').run(id);
  }

  /**
   * Check if any identity exists
   */
  async hasIdentity(): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('SELECT COUNT(*) as count FROM vault_identities')
      .get() as { count: number };

    return result.count > 0;
  }

  /**
   * Convert database row to IStoredIdentity
   */
  private rowToIdentity(row: StoredIdentityRow): IStoredIdentity {
    return {
      id: row.id,
      displayName: row.display_name,
      publicKey: row.public_key,
      encryptedPrivateKey: JSON.parse(
        row.encrypted_private_key,
      ) as IEncryptedData,
      friendCode: row.friend_code,
      createdAt: row.created_at,
      avatar: row.avatar || undefined,
    };
  }
}

/**
 * Database row type
 */
interface StoredIdentityRow {
  id: string;
  display_name: string;
  public_key: string;
  encrypted_private_key: string;
  friend_code: string;
  created_at: string;
  avatar: string | null;
  is_active: number;
}

// =============================================================================
// Singleton
// =============================================================================

let identityRepository: IdentityRepository | null = null;

export function getIdentityRepository(): IdentityRepository {
  if (!identityRepository) {
    identityRepository = new IdentityRepository();
  }
  return identityRepository;
}
