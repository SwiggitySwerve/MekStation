/**
 * Vault Folder Repository
 *
 * Handles persistence of vault folders and folder-item assignments to SQLite.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultFolder,
  IStoredVaultFolder,
  IFolderItem,
  IStoredFolderItem,
  ShareableContentType,
} from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

import { ICrudRepository } from '../core/ICrudRepository';

// =============================================================================
// Repository
// =============================================================================

/**
 * Repository for vault folder persistence
 */
export class VaultFolderRepository implements ICrudRepository<IVaultFolder> {
  private initialized = false;

  /**
   * Initialize the repository (ensure tables exist)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const db = getSQLiteService();
    await db.initialize();

    // Create folders table
    db.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS vault_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        item_count INTEGER NOT NULL DEFAULT 0,
        is_shared INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES vault_folders(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_folders_parent 
        ON vault_folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_vault_folders_shared 
        ON vault_folders(is_shared);

      -- Create folder items junction table
      CREATE TABLE IF NOT EXISTS vault_folder_items (
        folder_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('unit', 'pilot', 'force', 'encounter')),
        assigned_at TEXT NOT NULL,
        PRIMARY KEY (folder_id, item_id, item_type),
        FOREIGN KEY (folder_id) REFERENCES vault_folders(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_folder_items_folder 
        ON vault_folder_items(folder_id);
      CREATE INDEX IF NOT EXISTS idx_vault_folder_items_item 
        ON vault_folder_items(item_id, item_type);
    `);

    this.initialized = true;
  }

  // ===========================================================================
  // Folder CRUD
  // ===========================================================================

  /**
   * Create a new folder
   */
  async createFolder(
    name: string,
    options?: {
      description?: string;
      parentId?: string;
      isShared?: boolean;
    },
  ): Promise<IVaultFolder> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const id = `folder-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO vault_folders (
        id, name, description, parent_id, created_at, updated_at, item_count, is_shared
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      options?.description ?? null,
      options?.parentId ?? null,
      now,
      now,
      0,
      options?.isShared ? 1 : 0,
    );

    return {
      id,
      name,
      description: options?.description ?? null,
      parentId: options?.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
      isShared: options?.isShared ?? false,
    };
  }

  /**
   * Get folder by ID
   */
  async getFolderById(id: string): Promise<IVaultFolder | null> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT * FROM vault_folders WHERE id = ?')
      .get(id) as IStoredVaultFolder | undefined;

    return row ? this.rowToFolder(row) : null;
  }

  /**
   * Get all root folders (no parent)
   */
  async getRootFolders(): Promise<IVaultFolder[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_folders WHERE parent_id IS NULL ORDER BY name',
      )
      .all() as IStoredVaultFolder[];

    return rows.map((row) => this.rowToFolder(row));
  }

  /**
   * Get child folders of a parent
   */
  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_folders WHERE parent_id = ? ORDER BY name')
      .all(parentId) as IStoredVaultFolder[];

    return rows.map((row) => this.rowToFolder(row));
  }

  /**
   * Get all folders
   */
  async getAllFolders(): Promise<IVaultFolder[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_folders ORDER BY name')
      .all() as IStoredVaultFolder[];

    return rows.map((row) => this.rowToFolder(row));
  }

  /**
   * Get shared folders only
   */
  async getSharedFolders(): Promise<IVaultFolder[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare('SELECT * FROM vault_folders WHERE is_shared = 1 ORDER BY name')
      .all() as IStoredVaultFolder[];

    return rows.map((row) => this.rowToFolder(row));
  }

  /**
   * Update folder name
   */
  async updateFolderName(id: string, name: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare('UPDATE vault_folders SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, id);

    return result.changes > 0;
  }

  /**
   * Update folder description
   */
  async updateFolderDescription(
    id: string,
    description: string | null,
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        'UPDATE vault_folders SET description = ?, updated_at = ? WHERE id = ?',
      )
      .run(description, now, id);

    return result.changes > 0;
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    // Prevent circular reference
    if (newParentId) {
      let parent = await this.getFolderById(newParentId);
      while (parent) {
        if (parent.id === id) {
          return false; // Would create circular reference
        }
        parent = parent.parentId
          ? await this.getFolderById(parent.parentId)
          : null;
      }
    }

    const result = db
      .prepare(
        'UPDATE vault_folders SET parent_id = ?, updated_at = ? WHERE id = ?',
      )
      .run(newParentId, now, id);

    return result.changes > 0;
  }

  /**
   * Set folder shared status
   */
  async setFolderShared(id: string, isShared: boolean): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(
        'UPDATE vault_folders SET is_shared = ?, updated_at = ? WHERE id = ?',
      )
      .run(isShared ? 1 : 0, now, id);

    return result.changes > 0;
  }

  /**
   * Delete a folder (and all its items assignments)
   */
  async deleteFolder(id: string): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Move child folders to parent
    const folder = await this.getFolderById(id);
    if (folder) {
      db.prepare(
        'UPDATE vault_folders SET parent_id = ? WHERE parent_id = ?',
      ).run(folder.parentId, id);
    }

    const result = db.prepare('DELETE FROM vault_folders WHERE id = ?').run(id);

    return result.changes > 0;
  }

  // ===========================================================================
  // ICrudRepository Interface Methods
  // ===========================================================================

  /**
   * Create a new folder (ICrudRepository interface method)
   * Wraps createFolder with standard CRUD signature
   */
  async create(data: Partial<IVaultFolder>): Promise<IVaultFolder> {
    if (!data.name) {
      throw new Error('Folder name is required');
    }
    return this.createFolder(data.name, {
      description: data.description ?? undefined,
      parentId: data.parentId ?? undefined,
      isShared: data.isShared ?? undefined,
    });
  }

  /**
   * Get folder by ID (ICrudRepository interface method)
   * Wraps getFolderById with standard CRUD signature
   */
  async getById(id: string): Promise<IVaultFolder | null> {
    return this.getFolderById(id);
  }

  /**
   * Get all folders (ICrudRepository interface method)
   * Wraps getAllFolders with standard CRUD signature
   */
  async getAll(): Promise<IVaultFolder[]> {
    return this.getAllFolders();
  }

  /**
   * Update a folder (ICrudRepository interface method)
   * Updates multiple fields of a folder at once
   */
  async update(id: string, data: Partial<IVaultFolder>): Promise<IVaultFolder> {
    const current = await this.getFolderById(id);
    if (!current) {
      throw new Error(`Folder with id ${id} not found`);
    }

    // Apply updates
    if (data.name !== undefined && data.name !== current.name) {
      await this.updateFolderName(id, data.name);
    }
    if (
      data.description !== undefined &&
      data.description !== current.description
    ) {
      await this.updateFolderDescription(id, data.description);
    }
    if (data.parentId !== undefined && data.parentId !== current.parentId) {
      await this.moveFolder(id, data.parentId);
    }
    if (data.isShared !== undefined && data.isShared !== current.isShared) {
      await this.setFolderShared(id, data.isShared);
    }

    // Return updated folder
    const updated = await this.getFolderById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated folder with id ${id}`);
    }
    return updated;
  }

  /**
   * Delete a folder (ICrudRepository interface method)
   * Wraps deleteFolder with standard CRUD signature
   */
  async delete(id: string): Promise<boolean> {
    return this.deleteFolder(id);
  }

  /**
   * Count total folders (ICrudRepository optional method)
   */
  async count(): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare('SELECT COUNT(*) as count FROM vault_folders')
      .get() as { count: number };

    return row.count;
  }

  // ===========================================================================
  // Folder Items
  // ===========================================================================

  /**
   * Add item to folder
   */
  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        INSERT OR REPLACE INTO vault_folder_items (folder_id, item_id, item_type, assigned_at)
        VALUES (?, ?, ?, ?)
      `).run(folderId, itemId, itemType, now);

      // Update item count
      this.updateFolderItemCount(folderId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove item from folder
   */
  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const result = db
      .prepare(
        'DELETE FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?',
      )
      .run(folderId, itemId, itemType);

    if (result.changes > 0) {
      this.updateFolderItemCount(folderId);
    }

    return result.changes > 0;
  }

  /**
   * Get all items in a folder
   */
  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(
        'SELECT * FROM vault_folder_items WHERE folder_id = ? ORDER BY assigned_at DESC',
      )
      .all(folderId) as IStoredFolderItem[];

    return rows.map((row) => this.rowToFolderItem(row));
  }

  /**
   * Get folders containing an item
   */
  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IVaultFolder[]> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const rows = db
      .prepare(`
        SELECT f.* FROM vault_folders f
        INNER JOIN vault_folder_items fi ON f.id = fi.folder_id
        WHERE fi.item_id = ? AND fi.item_type = ?
        ORDER BY f.name
      `)
      .all(itemId, itemType) as IStoredVaultFolder[];

    return rows.map((row) => this.rowToFolder(row));
  }

  /**
   * Check if item is in folder
   */
  async isItemInFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    const row = db
      .prepare(
        'SELECT 1 FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?',
      )
      .get(folderId, itemId, itemType);

    return !!row;
  }

  /**
   * Move item from one folder to another
   */
  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string,
  ): Promise<boolean> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare(`
        UPDATE vault_folder_items 
        SET folder_id = ?, assigned_at = ?
        WHERE folder_id = ? AND item_id = ? AND item_type = ?
      `)
      .run(toFolderId, now, fromFolderId, itemId, itemType);

    if (result.changes > 0) {
      this.updateFolderItemCount(fromFolderId);
      this.updateFolderItemCount(toFolderId);
    }

    return result.changes > 0;
  }

  /**
   * Remove all item assignments (when item is deleted)
   */
  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<number> {
    await this.initialize();
    const db = getSQLiteService().getDatabase();

    // Get affected folders first
    const folders = await this.getItemFolders(itemId, itemType);

    const result = db
      .prepare(
        'DELETE FROM vault_folder_items WHERE item_id = ? AND item_type = ?',
      )
      .run(itemId, itemType);

    // Update item counts
    for (const folder of folders) {
      this.updateFolderItemCount(folder.id);
    }

    return result.changes;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Update the item count for a folder
   */
  private updateFolderItemCount(folderId: string): void {
    const db = getSQLiteService().getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE vault_folders 
      SET item_count = (
        SELECT COUNT(*) FROM vault_folder_items WHERE folder_id = ?
      ), updated_at = ?
      WHERE id = ?
    `).run(folderId, now, folderId);
  }

  /**
   * Convert database row to IVaultFolder
   */
  private rowToFolder(row: IStoredVaultFolder): IVaultFolder {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      itemCount: row.item_count,
      isShared: row.is_shared === 1,
    };
  }

  /**
   * Convert database row to IFolderItem
   */
  private rowToFolderItem(row: IStoredFolderItem): IFolderItem {
    return {
      folderId: row.folder_id,
      itemId: row.item_id,
      itemType: row.item_type,
      assignedAt: row.assigned_at,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let vaultFolderRepository: VaultFolderRepository | null = null;

export function getVaultFolderRepository(): VaultFolderRepository {
  if (!vaultFolderRepository) {
    vaultFolderRepository = new VaultFolderRepository();
  }
  return vaultFolderRepository;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVaultFolderRepository(): void {
  vaultFolderRepository = null;
}
