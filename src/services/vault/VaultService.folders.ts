import type {
  IVaultFolder,
  IFolderItem,
  ShareableContentType,
} from '@/types/vault';

import { getPermissionService } from './PermissionService';
import { getVaultFolderRepository } from './VaultFolderRepository';

export async function createFolder(
  name: string,
  options?: {
    description?: string;
    parentId?: string;
  },
): Promise<IVaultFolder> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.createFolder(name, options);
}

export async function getFolder(id: string): Promise<IVaultFolder | null> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getFolderById(id);
}

export async function getRootFolders(): Promise<IVaultFolder[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getRootFolders();
}

export async function getChildFolders(
  parentId: string,
): Promise<IVaultFolder[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getChildFolders(parentId);
}

export async function getAllFolders(): Promise<IVaultFolder[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getAllFolders();
}

export async function renameFolder(id: string, name: string): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.updateFolderName(id, name);
}

export async function setFolderDescription(
  id: string,
  description: string | null,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.updateFolderDescription(id, description);
}

export async function moveFolder(
  id: string,
  newParentId: string | null,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.moveFolder(id, newParentId);
}

export async function deleteFolder(id: string): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  const permissionService = getPermissionService();

  await permissionService.revokeAllForItem('folder', id);
  return folderRepo.deleteFolder(id);
}

export async function addItemToFolder(
  folderId: string,
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.addItemToFolder(folderId, itemId, itemType);
}

export async function removeItemFromFolder(
  folderId: string,
  itemId: string,
  itemType: ShareableContentType,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.removeItemFromFolder(folderId, itemId, itemType);
}

export async function getFolderItems(folderId: string): Promise<IFolderItem[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getFolderItems(folderId);
}

export async function getItemFolders(
  itemId: string,
  itemType: ShareableContentType,
): Promise<IVaultFolder[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getItemFolders(itemId, itemType);
}

export async function moveItem(
  itemId: string,
  itemType: ShareableContentType,
  fromFolderId: string,
  toFolderId: string,
): Promise<boolean> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.moveItem(itemId, itemType, fromFolderId, toFolderId);
}

export async function removeItemFromAllFolders(
  itemId: string,
  itemType: ShareableContentType,
): Promise<number> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.removeItemFromAllFolders(itemId, itemType);
}

export async function getSharedFolders(): Promise<IVaultFolder[]> {
  const folderRepo = getVaultFolderRepository();
  return folderRepo.getSharedFolders();
}
