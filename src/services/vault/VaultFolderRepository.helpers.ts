import {
  IVaultFolder,
  IFolderItem,
  IStoredVaultFolder,
  IStoredFolderItem,
} from '@/types/vault';

export const VAULT_FOLDER_SCHEMA_SQL = `
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
`;

export function rowToFolder(row: IStoredVaultFolder): IVaultFolder {
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

export function rowToFolderItem(row: IStoredFolderItem): IFolderItem {
  return {
    folderId: row.folder_id,
    itemId: row.item_id,
    itemType: row.item_type,
    assignedAt: row.assigned_at,
  };
}
