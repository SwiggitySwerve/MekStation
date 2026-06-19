/**
 * Contact Repository
 *
 * Handles persistence of vault contacts to SQLite.
 *
 * EXCLUDED REPOSITORIES (Not Pure CRUD):
 * - PilotRepository: Has domain-specific methods (addAbility, recordKill, gainExperience)
 * - UnitRepository: Has versioning and snapshot logic (not standard CRUD)
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IContact, IStoredContact } from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { ICrudRepository } from '../core/ICrudRepository';

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for vault contact persistence
 */
export class ContactRepository implements ICrudRepository<IContact> {
  private initialized = false;

  /**
   * Initialize the repository (ensure table exists)
   */
  readonly initialize = async (): Promise<void> => {
    if (this.initialized) return;

    const sqlite = getSQLiteService();
    await sqlite.initialize();

    // Create contacts table if not exists
    sqlite.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_contacts (
        id TEXT PRIMARY KEY,
        friend_code TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        nickname TEXT,
        display_name TEXT NOT NULL,
        avatar TEXT,
        added_at TEXT NOT NULL,
        last_seen_at TEXT,
        is_trusted INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      );
      
      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_vault_contacts_friend_code 
        ON vault_contacts(friend_code);
      CREATE INDEX IF NOT EXISTS idx_vault_contacts_public_key 
        ON vault_contacts(public_key);
      CREATE INDEX IF NOT EXISTS idx_vault_contacts_added_at 
        ON vault_contacts(added_at);
    `);

    this.initialized = true;
  };

  /**
   * Create a new contact
   */
  readonly create = async (
    contact: Omit<IContact, 'id' | 'addedAt'>,
  ): Promise<IContact> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const id = `contact-${crypto.randomUUID()}`;
    const addedAt = new Date().toISOString();

    const stmt = sqlite.prepare(`
      INSERT INTO vault_contacts (
        id, friend_code, public_key, nickname, display_name,
        avatar, added_at, last_seen_at, is_trusted, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      contact.friendCode,
      contact.publicKey,
      contact.nickname,
      contact.displayName,
      contact.avatar,
      addedAt,
      contact.lastSeenAt,
      contact.isTrusted ? 1 : 0,
      contact.notes,
    );

    return {
      id,
      friendCode: contact.friendCode,
      publicKey: contact.publicKey,
      nickname: contact.nickname,
      displayName: contact.displayName,
      avatar: contact.avatar,
      addedAt,
      lastSeenAt: contact.lastSeenAt,
      isTrusted: contact.isTrusted,
      notes: contact.notes,
    };
  };

  /**
   * Get contact by ID
   */
  readonly getById = async (id: string): Promise<IContact | null> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const row = sqlite
      .prepare('SELECT * FROM vault_contacts WHERE id = ?')
      .get(id) as IStoredContact | undefined;

    return row ? this.rowToContact(row) : null;
  };

  /**
   * Get contact by friend code
   */
  readonly getByFriendCode = async (
    friendCode: string,
  ): Promise<IContact | null> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const row = sqlite
      .prepare('SELECT * FROM vault_contacts WHERE friend_code = ?')
      .get(friendCode) as IStoredContact | undefined;

    return row ? this.rowToContact(row) : null;
  };

  /**
   * Get contact by public key
   */
  readonly getByPublicKey = async (
    publicKey: string,
  ): Promise<IContact | null> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const row = sqlite
      .prepare('SELECT * FROM vault_contacts WHERE public_key = ?')
      .get(publicKey) as IStoredContact | undefined;

    return row ? this.rowToContact(row) : null;
  };

  /**
   * Get all contacts
   */
  readonly getAll = async (): Promise<IContact[]> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const rows = sqlite
      .prepare(
        'SELECT * FROM vault_contacts ORDER BY COALESCE(nickname, display_name)',
      )
      .all() as IStoredContact[];

    return rows.map((row) => this.rowToContact(row));
  };

  /**
   * Get all trusted contacts
   */
  readonly getTrusted = async (): Promise<IContact[]> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const rows = sqlite
      .prepare(
        'SELECT * FROM vault_contacts WHERE is_trusted = 1 ORDER BY COALESCE(nickname, display_name)',
      )
      .all() as IStoredContact[];

    return rows.map((row) => this.rowToContact(row));
  };

  /**
   * Search contacts by name (nickname or display name)
   */
  readonly search = async (query: string): Promise<IContact[]> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const searchPattern = `%${query}%`;
    const rows = sqlite
      .prepare(`
        SELECT * FROM vault_contacts 
        WHERE nickname LIKE ? OR display_name LIKE ? OR friend_code LIKE ?
        ORDER BY COALESCE(nickname, display_name)
      `)
      .all(searchPattern, searchPattern, searchPattern) as IStoredContact[];

    return rows.map((row) => this.rowToContact(row));
  };

  /**
   * Update contact nickname
   */
  readonly updateNickname = async (
    id: string,
    nickname: string | null,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('UPDATE vault_contacts SET nickname = ? WHERE id = ?')
      .run(nickname, id);

    return result.changes > 0;
  };

  /**
   * Update contact trust status
   */
  readonly updateTrusted = async (
    id: string,
    isTrusted: boolean,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('UPDATE vault_contacts SET is_trusted = ? WHERE id = ?')
      .run(isTrusted ? 1 : 0, id);

    return result.changes > 0;
  };

  /**
   * Update contact notes
   */
  readonly updateNotes = async (
    id: string,
    notes: string | null,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('UPDATE vault_contacts SET notes = ? WHERE id = ?')
      .run(notes, id);

    return result.changes > 0;
  };

  /**
   * Update last seen timestamp
   */
  readonly updateLastSeen = async (
    id: string,
    lastSeenAt: string,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('UPDATE vault_contacts SET last_seen_at = ? WHERE id = ?')
      .run(lastSeenAt, id);

    return result.changes > 0;
  };

  /**
   * Update contact's display info from their identity
   */
  readonly updateFromIdentity = async (
    id: string,
    displayName: string,
    avatar: string | null,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare(
        'UPDATE vault_contacts SET display_name = ?, avatar = ? WHERE id = ?',
      )
      .run(displayName, avatar, id);

    return result.changes > 0;
  };

  /**
   * Update a contact (ICrudRepository interface method)
   * Updates multiple fields of a contact at once
   */
  readonly update = async (
    id: string,
    data: Partial<IContact>,
  ): Promise<IContact> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    // Get current contact
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Contact with id ${id} not found`);
    }

    // Build update statement dynamically based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(data.nickname);
    }
    if (data.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(data.displayName);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(data.avatar);
    }
    if (data.isTrusted !== undefined) {
      updates.push('is_trusted = ?');
      values.push(data.isTrusted ? 1 : 0);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    if (data.lastSeenAt !== undefined) {
      updates.push('last_seen_at = ?');
      values.push(data.lastSeenAt);
    }

    // If no fields to update, return current contact
    if (updates.length === 0) {
      return current;
    }

    // Execute update
    values.push(id);
    const stmt = sqlite.prepare(
      `UPDATE vault_contacts SET ${updates.join(', ')} WHERE id = ?`,
    );
    stmt.run(...values);

    // Return updated contact
    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated contact with id ${id}`);
    }
    return updated;
  };

  /**
   * Delete a contact
   */
  readonly delete = async (id: string): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('DELETE FROM vault_contacts WHERE id = ?')
      .run(id);

    return result.changes > 0;
  };

  /**
   * Delete a contact by friend code
   */
  readonly deleteByFriendCode = async (
    friendCode: string,
  ): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const result = sqlite
      .prepare('DELETE FROM vault_contacts WHERE friend_code = ?')
      .run(friendCode);

    return result.changes > 0;
  };

  /**
   * Check if a friend code exists in contacts
   */
  readonly exists = async (friendCode: string): Promise<boolean> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const row = sqlite
      .prepare('SELECT 1 FROM vault_contacts WHERE friend_code = ?')
      .get(friendCode);

    return !!row;
  };

  /**
   * Get contact count
   */
  readonly count = async (): Promise<number> => {
    await this.initialize();
    const sqlite = getSQLiteService().getDatabase();

    const row = sqlite
      .prepare('SELECT COUNT(*) as count FROM vault_contacts')
      .get() as { count: number };

    return row.count;
  };

  /**
   * Convert sqlite row to IContact
   */
  private rowToContact(row: IStoredContact): IContact {
    return {
      id: row.id,
      friendCode: row.friend_code,
      publicKey: row.public_key,
      nickname: row.nickname,
      displayName: row.display_name,
      avatar: row.avatar,
      addedAt: row.added_at,
      lastSeenAt: row.last_seen_at,
      isTrusted: row.is_trusted === 1,
      notes: row.notes,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

const contactRepositoryFactory: SingletonFactory<ContactRepository> =
  createSingleton((): ContactRepository => new ContactRepository());

export function getContactRepository(): ContactRepository {
  return contactRepositoryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetContactRepository(): void {
  contactRepositoryFactory.reset();
}
