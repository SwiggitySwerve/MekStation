import type {
  IVaultFolder,
  IFolderItem,
  ShareableContentType,
} from '@/types/vault';

import type { PermissionService } from './PermissionService';
import type { VaultFolderRepository } from './VaultFolderRepository';

export async function createFolder(
  folderRepo: VaultFolderRepository,
  name: string,
  options?: { description?: string; parentId?: string },
): Promise<IVaultFolder> {
  return folderRepo.createFolder(name, options);
}

export async function getFolder(
  folderRepo: VaultFolderRepository,
  id: string,
): Promise<IVaultFolder | null> {
  return folderRepo.getFolderById(id);
}

export async function getRootFolders(
  folderRepo: VaultFolderRepository,
): Promise<IVaultFolder[]> {
  return folderRepo.getRootFolders();
}

export async function getChildFolders(
  folderRepo: VaultFolderRepository,
  parentId: string,
): Promise<IVaultFolder[]> {
  return folderRepo.getChildFolders(parentId);
}

export async function getAllFolders(
  folderRepo: VaultFolderRepository,
): Promise<IVaultFolder[]> {
  return folderRepo.getAllFolders();
}

export async function renameFolder(
  folderRepo: VaultFolderRepository,
  id: string,
  name: string,
): Promise<boolean> {
  return folderRepo.updateFolderName(id, name);
}

export async function setFolderDescription(
  folderRepo: VaultFolderRepository,
  id: string,
  description: string | null,
): Promise<boolean> {
  return folderRepo.updateFolderDescription(id, description);
}

export async function moveFolder(
  folderRepo: VaultFolderRepository,
  id: string,
  newParentId: string | null,
): Promise<boolean> {
  return folderRepo.moveFolder(id, newParentId);
}

export async function deleteFolder(
  folderRepo: VaultFolderRepository,
  permissionService: PermissionService,
  id: string,
): Promise<boolean> {
  await permissionService.revokeAllForItem('folder', id);
  return folderRepo.deleteFolder(id);
}

export async function addItemToFolder(
  folderRepo: VaultFolderRepository,
  folderId: string,
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  return folderRepo.addItemToFolder(folderId, itemId, itemType);
}

export async function removeItemFromFolder(
  folderRepo: VaultFolderRepository,
  folderId: string,
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  return folderRepo.removeItemFromFolder(folderId, itemId, itemType);
}

export async function getFolderItems(
  folderRepo: VaultFolderRepository,
  folderId: string,
): Promise<IFolderItem[]> {
  return folderRepo.getFolderItems(folderId);
}

export async function getItemFolders(
  folderRepo: VaultFolderRepository,
  itemId: string,
  itemType: ShareableContentType,
): Promise<IVaultFolder[]> {
  return folderRepo.getItemFolders(itemId, itemType);
}

export async function moveItem(
  folderRepo: VaultFolderRepository,
  itemId: string,
  itemType: ShareableContentType,
  fromFolderId: string,
  toFolderId: string,
): Promise<boolean> {
  return folderRepo.moveItem(itemId, itemType, fromFolderId, toFolderId);
}

export async function removeItemFromAllFolders(
  folderRepo: VaultFolderRepository,
  itemId: string,
  itemType: ShareableContentType,
): Promise<number> {
  return folderRepo.removeItemFromAllFolders(itemId, itemType);
}

export async function getSharedFolders(
  folderRepo: VaultFolderRepository,
): Promise<IVaultFolder[]> {
  return folderRepo.getSharedFolders();
}
