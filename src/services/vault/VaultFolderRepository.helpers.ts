import {
  IVaultFolder,
  IFolderItem,
  IStoredVaultFolder,
  IStoredFolderItem,
} from '@/types/vault';

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
