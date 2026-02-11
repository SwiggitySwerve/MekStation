/**
 * Permission Repository
 *
 * Handles persistence of vault permissions to SQLite.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IPermissionGrant,
  IStoredPermission,
  PermissionLevel,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

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
 * Repository for vault permission persistence
 */
export class PermissionRepository implements ICrudRepository<IPermissionGrant> {
  private initialized = false;

  /**
   * Initialize the repository (ensure table exists)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    // Create permissions table if not exists
    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_permissions (
        id TEXT PRIMARY KEY,
        grantee_id TEXT NOT NULL,
        scope_type TEXT NOT NULL CHECK(scope_type IN ('item', 'folder', 'category', 'all')),
        scope_id TEXT,
        scope_category TEXT CHECK(scope_category IS NULL OR scope_category IN ('units', 'pilots', 'forces', 'encounters')),
        level TEXT NOT NULL CHECK(level IN ('read', 'write', 'admin')),
        expires_at TEXT,
        created_at TEXT NOT NULL,
        grantee_name TEXT
      );
      
      -- Basic indexes
      CREATE INDEX IF NOT EXISTS idx_vault_permissions_grantee 
        ON vault_permissions(grantee_id);
      CREATE INDEX IF NOT EXISTS idx_vault_permissions_scope 
        ON vault_permissions(scope_type, scope_id);
      CREATE INDEX IF NOT EXISTS idx_vault_permissions_category 
        ON vault_permissions(scope_category);
      
      -- Composite indexes for checkPermission queries
      CREATE INDEX IF NOT EXISTS idx_vault_permissions_grantee_scope 
        ON vault_permissions(grantee_id, scope_type, scope_id);
      CREATE INDEX IF NOT EXISTS idx_vault_permissions_grantee_category 
        ON vault_permissions(grantee_id, scope_type, scope_category);
    `);

    this.initialized = true;
  }

  /**
   * Create a new permission grant
   */
  async create(
    grant: Omit<IPermissionGrant, 'id' | 'createdAt'>,
  ): Promise<IPermissionGrant> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `perm-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO vault_permissions (
        id, grantee_id, scope_type, scope_id, scope_category,
        level, expires_at, created_at, grantee_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      grant.granteeId,
      grant.scopeType,
      grant.scopeId,
      grant.scopeCategory,
      grant.level,
      grant.expiresAt,
      createdAt,
      grant.granteeName || null,
    );

    return {
      id,
      granteeId: grant.granteeId,
      scopeType: grant.scopeType,
      scopeId: grant.scopeId,
      scopeCategory: grant.scopeCategory,
      level: grant.level,
      expiresAt: grant.expiresAt,
      createdAt,
      granteeName: grant.granteeName,
    };
  }

  /**
   * Get permission by ID
   */
  async getById(id: string): Promise<IPermissionGrant | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_permissions WHERE id = ?')
      .get(id) as IStoredPermission | undefined;

    return row ? this.rowToGrant(row) : null;
  }

  /**
   * Get all permissions for a grantee (by friend code)
   */
  async getByGrantee(granteeId: string): Promise<IPermissionGrant[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_permissions WHERE grantee_id = ? ORDER BY created_at DESC',
      )
      .all(granteeId) as IStoredPermission[];

    return rows.map((row) => this.rowToGrant(row));
  }

  /**
   * Get all permissions for a specific item
   */
  async getByItem(
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<IPermissionGrant[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_permissions WHERE scope_type = ? AND scope_id = ? ORDER BY created_at DESC',
      )
      .all(scopeType, scopeId) as IStoredPermission[];

    return rows.map((row) => this.rowToGrant(row));
  }

  /**
   * Get all permissions for a category
   */
  async getByCategory(category: ContentCategory): Promise<IPermissionGrant[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_permissions WHERE scope_category = ? ORDER BY created_at DESC',
      )
      .all(category) as IStoredPermission[];

    return rows.map((row) => this.rowToGrant(row));
  }

  /**
   * Get all permissions
   */
  async getAll(): Promise<IPermissionGrant[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_permissions ORDER BY created_at DESC')
      .all() as IStoredPermission[];

    return rows.map((row) => this.rowToGrant(row));
  }

  /**
   * Check if a grantee has permission for an item
   * Returns the effective permission level or null if no access
   */
  async checkPermission(
    granteeId: string,
    scopeType: PermissionScopeType,
    scopeId: string | null,
    category?: ContentCategory,
  ): Promise<PermissionLevel | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Check for explicit item permission first
    if (scopeType === 'item' && scopeId) {
      const itemPerm = db
        .prepare(`
          SELECT level FROM vault_permissions 
          WHERE grantee_id = ? AND scope_type = 'item' AND scope_id = ?
          AND (expires_at IS NULL OR expires_at > ?)
        `)
        .get(granteeId, scopeId, now) as { level: PermissionLevel } | undefined;

      if (itemPerm) return itemPerm.level;
    }

    // Check for category permission
    if (category) {
      const categoryPerm = db
        .prepare(`
          SELECT level FROM vault_permissions 
          WHERE grantee_id = ? AND scope_type = 'category' AND scope_category = ?
          AND (expires_at IS NULL OR expires_at > ?)
        `)
        .get(granteeId, category, now) as
        | { level: PermissionLevel }
        | undefined;

      if (categoryPerm) return categoryPerm.level;
    }

    // Check for vault-wide permission
    const allPerm = db
      .prepare(`
        SELECT level FROM vault_permissions 
        WHERE grantee_id = ? AND scope_type = 'all'
        AND (expires_at IS NULL OR expires_at > ?)
      `)
      .get(granteeId, now) as { level: PermissionLevel } | undefined;

    if (allPerm) return allPerm.level;

    // Check for public permission
    if (granteeId !== 'public') {
      return this.checkPermission('public', scopeType, scopeId, category);
    }

    return null;
  }

  /**
   * Check if a permission exists (ICrudRepository optional method)
   */
  async exists(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT 1 FROM vault_permissions WHERE id = ?')
      .get(id);

    return !!row;
  }

  /**
   * Update permission level
   */
  async updateLevel(id: string, level: PermissionLevel): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_permissions SET level = ? WHERE id = ?')
      .run(level, id);

    return result.changes > 0;
  }

  /**
   * Update permission expiry
   */
  async updateExpiry(id: string, expiresAt: string | null): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('UPDATE vault_permissions SET expires_at = ? WHERE id = ?')
      .run(expiresAt, id);

    return result.changes > 0;
  }

  /**
   * Update a permission (ICrudRepository interface method)
   * Updates multiple fields of a permission at once
   */
  async update(
    id: string,
    data: Partial<IPermissionGrant>,
  ): Promise<IPermissionGrant> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Get current permission
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Permission with id ${id} not found`);
    }

    // Build update statement dynamically based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.level !== undefined) {
      updates.push('level = ?');
      values.push(data.level);
    }
    if (data.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(data.expiresAt);
    }
    if (data.granteeName !== undefined) {
      updates.push('grantee_name = ?');
      values.push(data.granteeName || null);
    }

    // If no fields to update, return current permission
    if (updates.length === 0) {
      return current;
    }

    // Execute update
    values.push(id);
    const stmt = db.prepare(
      `UPDATE vault_permissions SET ${updates.join(', ')} WHERE id = ?`,
    );
    stmt.run(...values);

    // Return updated permission
    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated permission with id ${id}`);
    }
    return updated;
  }

  /**
   * Delete a permission
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM vault_permissions WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * Delete all permissions for a grantee
   */
  async deleteByGrantee(granteeId: string): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare('DELETE FROM vault_permissions WHERE grantee_id = ?')
      .run(granteeId);

    return result.changes;
  }

  /**
   * Delete all permissions for an item
   */
  async deleteByItem(
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare(
        'DELETE FROM vault_permissions WHERE scope_type = ? AND scope_id = ?',
      )
      .run(scopeType, scopeId);

    return result.changes;
  }

  /**
   * Remove expired permissions
   */
  async cleanupExpired(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        'DELETE FROM vault_permissions WHERE expires_at IS NOT NULL AND expires_at < ?',
      )
      .run(now);

    return result.changes;
  }

  /**
   * Convert database row to IPermissionGrant
   */
  private rowToGrant(row: IStoredPermission): IPermissionGrant {
    return {
      id: row.id,
      granteeId: row.grantee_id,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      scopeCategory: row.scope_category,
      level: row.level,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      granteeName: row.grantee_name || undefined,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

const permissionRepositoryFactory: SingletonFactory<PermissionRepository> =
  createSingleton((): PermissionRepository => new PermissionRepository());

export function getPermissionRepository(): PermissionRepository {
  return permissionRepositoryFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetPermissionRepository(): void {
  permissionRepositoryFactory.reset();
}
