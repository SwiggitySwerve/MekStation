/**
 * Share Link Repository
 *
 * Handles persistence of share links to SQLite.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IShareLink,
  IStoredShareLink,
  IShareLinkOptions,
  IShareLinkRedeemResult,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';
import { getSQLiteService } from '@/services/persistence';

// =============================================================================
// Constants
// =============================================================================

/** Token length in bytes (will be base64url encoded to ~32 chars) */
const TOKEN_LENGTH = 24;

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for share link persistence
 */
export class ShareLinkRepository {
  private initialized = false;

  /**
   * Initialize the repository (ensure table exists)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    // Create share_links table if not exists
    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_share_links (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        scope_type TEXT NOT NULL CHECK(scope_type IN ('item', 'folder', 'category', 'all')),
        scope_id TEXT,
        scope_category TEXT CHECK(scope_category IS NULL OR scope_category IN ('units', 'pilots', 'forces', 'encounters')),
        level TEXT NOT NULL CHECK(level IN ('read', 'write', 'admin')),
        expires_at TEXT,
        max_uses INTEGER CHECK(max_uses IS NULL OR max_uses > 0),
        use_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        label TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_share_links_token 
        ON vault_share_links(token);
      CREATE INDEX IF NOT EXISTS idx_vault_share_links_scope 
        ON vault_share_links(scope_type, scope_id);
      CREATE INDEX IF NOT EXISTS idx_vault_share_links_active 
        ON vault_share_links(is_active);
    `);

    this.initialized = true;
  }

  /**
   * Generate a cryptographically secure URL-safe token using base64url encoding.
   * This avoids modulo bias present in alphabet-based approaches.
   */
  private generateToken(): string {
    const bytes = new Uint8Array(TOKEN_LENGTH);
    crypto.getRandomValues(bytes);
    
    // Convert to base64url (URL-safe base64 without padding)
    // In Node.js environment
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
    
    // In browser environment
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Create a new share link
   */
  async create(
    scopeType: PermissionScopeType,
    scopeId: string | null,
    scopeCategory: ContentCategory | null,
    options: IShareLinkOptions
  ): Promise<IShareLink> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `link-${crypto.randomUUID()}`;
    const token = this.generateToken();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO vault_share_links (
        id, token, scope_type, scope_id, scope_category,
        level, expires_at, max_uses, use_count, created_at, label, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)
    `);

    stmt.run(
      id,
      token,
      scopeType,
      scopeId,
      scopeCategory,
      options.level,
      options.expiresAt || null,
      options.maxUses || null,
      createdAt,
      options.label || null
    );

    return {
      id,
      token,
      scopeType,
      scopeId,
      scopeCategory,
      level: options.level,
      expiresAt: options.expiresAt || null,
      maxUses: options.maxUses || null,
      useCount: 0,
      createdAt,
      label: options.label,
      isActive: true,
    };
  }

  /**
   * Get share link by ID
   */
  async getById(id: string): Promise<IShareLink | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_share_links WHERE id = ?')
      .get(id) as IStoredShareLink | undefined;

    return row ? this.rowToLink(row) : null;
  }

  /**
   * Get share link by token
   */
  async getByToken(token: string): Promise<IShareLink | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_share_links WHERE token = ?')
      .get(token) as IStoredShareLink | undefined;

    return row ? this.rowToLink(row) : null;
  }

  /**
   * Get all share links for an item
   */
  async getByItem(scopeType: PermissionScopeType, scopeId: string): Promise<IShareLink[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_share_links WHERE scope_type = ? AND scope_id = ? ORDER BY created_at DESC')
      .all(scopeType, scopeId) as IStoredShareLink[];

    return rows.map((row) => this.rowToLink(row));
  }

  /**
   * Get all active share links
   */
  async getActive(): Promise<IShareLink[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_share_links WHERE is_active = 1 ORDER BY created_at DESC')
      .all() as IStoredShareLink[];

    return rows.map((row) => this.rowToLink(row));
  }

  /**
   * Get all share links
   */
  async getAll(): Promise<IShareLink[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_share_links ORDER BY created_at DESC')
      .all() as IStoredShareLink[];

    return rows.map((row) => this.rowToLink(row));
  }

  /**
   * Redeem a share link (validate and increment use count atomically)
   * Uses atomic UPDATE with all conditions to prevent race conditions.
   */
  async redeem(token: string): Promise<IShareLinkRedeemResult> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Atomic update with all validation conditions
    // This prevents race conditions where two requests could both pass maxUses check
    const result = db.prepare(`
      UPDATE vault_share_links 
      SET use_count = use_count + 1 
      WHERE token = ? 
        AND is_active = 1
        AND (expires_at IS NULL OR expires_at > ?)
        AND (max_uses IS NULL OR use_count < max_uses)
    `).run(token, now);

    if (result.changes === 0) {
      // Update failed - fetch link to determine specific error
      const link = await this.getByToken(token);
      
      if (!link) {
        return { success: false, error: { message: 'Share link not found', errorCode: 'NOT_FOUND' as const } };
      }

      if (!link.isActive) {
        return { success: false, error: { message: 'Share link is inactive', errorCode: 'INACTIVE' as const } };
      }

      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        return { success: false, error: { message: 'Share link has expired', errorCode: 'EXPIRED' as const } };
      }

      if (link.maxUses !== null && link.useCount >= link.maxUses) {
        return { success: false, error: { message: 'Share link has reached maximum uses', errorCode: 'MAX_USES' as const } };
      }

      // Shouldn't reach here, but handle gracefully
      return { success: false, error: { message: 'Share link validation failed', errorCode: 'INVALID' as const } };
    }

    // Return updated link
    const updatedLink = await this.getByToken(token);
    return { success: true, data: { link: updatedLink! } };
  }

  /**
   * Deactivate a share link
   */
  async deactivate(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_share_links SET is_active = 0 WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Reactivate a share link
   */
  async reactivate(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_share_links SET is_active = 1 WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Update share link label
   */
  async updateLabel(id: string, label: string | null): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_share_links SET label = ? WHERE id = ?')
      .run(label, id);

    return result.changes > 0;
  }

  /**
   * Update share link expiry
   */
  async updateExpiry(id: string, expiresAt: string | null): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_share_links SET expires_at = ? WHERE id = ?')
      .run(expiresAt, id);

    return result.changes > 0;
  }

  /**
   * Update share link max uses
   */
  async updateMaxUses(id: string, maxUses: number | null): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_share_links SET max_uses = ? WHERE id = ?')
      .run(maxUses, id);

    return result.changes > 0;
  }

  /**
   * Delete a share link
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM vault_share_links WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Delete all share links for an item
   */
  async deleteByItem(scopeType: PermissionScopeType, scopeId: string): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM vault_share_links WHERE scope_type = ? AND scope_id = ?')
      .run(scopeType, scopeId);

    return result.changes;
  }

  /**
   * Remove expired share links
   */
  async cleanupExpired(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare('DELETE FROM vault_share_links WHERE expires_at IS NOT NULL AND expires_at < ?')
      .run(now);

    return result.changes;
  }

  /**
   * Convert database row to IShareLink
   */
  private rowToLink(row: IStoredShareLink): IShareLink {
    return {
      id: row.id,
      token: row.token,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      scopeCategory: row.scope_category,
      level: row.level,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      createdAt: row.created_at,
      label: row.label || undefined,
      isActive: row.is_active === 1,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let shareLinkRepository: ShareLinkRepository | null = null;

export function getShareLinkRepository(): ShareLinkRepository {
  if (!shareLinkRepository) {
    shareLinkRepository = new ShareLinkRepository();
  }
  return shareLinkRepository;
}

/**
 * Reset the singleton (for testing)
 */
export function resetShareLinkRepository(): void {
  shareLinkRepository = null;
}
