import type {
  IVaultFolder,
  IFolderItem,
  ShareableContentType,
  PermissionLevel,
  ContentCategory,
  IPermissionGrant,
} from '@/types/vault';

import { createSingleton } from '../core/createSingleton';
import { PermissionService, getPermissionService } from './PermissionService';
import {
  VaultFolderRepository,
  getVaultFolderRepository,
} from './VaultFolderRepository';
import * as accessOps from './VaultService.access';
import * as bulkOps from './VaultService.bulk';
import * as folderOps from './VaultService.folders';
import * as publicOps from './VaultService.public';
import * as sharingOps from './VaultService.sharing';

export interface IVaultItem {
  itemId: string;
  itemType: ShareableContentType;
  folders: IVaultFolder[];
}

export interface IFolderWithPermissions extends IVaultFolder {
  sharedWith: Array<{
    contactId: string;
    contactName: string;
    level: PermissionLevel;
  }>;
}

export interface ISharedContent {
  fromContact: {
    id: string;
    friendCode: string;
    displayName: string;
  };
  level: PermissionLevel;
  scopeType: 'item' | 'folder' | 'category' | 'all';
  scopeId: string | null;
  category: ContentCategory | null;
}

export class VaultService {
  private folderRepo: VaultFolderRepository;
  private permissionService: PermissionService;

  constructor(
    folderRepo?: VaultFolderRepository,
    permissionService?: PermissionService,
  ) {
    this.folderRepo = folderRepo ?? getVaultFolderRepository();
    this.permissionService = permissionService ?? getPermissionService();
  }

  readonly createFolder = async (
    name: string,
    options?: { description?: string; parentId?: string },
  ): Promise<IVaultFolder> => {
    return folderOps.createFolder(this.folderRepo, name, options);
  };

  readonly getFolder = async (id: string): Promise<IVaultFolder | null> => {
    return folderOps.getFolder(this.folderRepo, id);
  };

  readonly getRootFolders = async (): Promise<IVaultFolder[]> => {
    return folderOps.getRootFolders(this.folderRepo);
  };

  readonly getChildFolders = async (
    parentId: string,
  ): Promise<IVaultFolder[]> => {
    return folderOps.getChildFolders(this.folderRepo, parentId);
  };

  readonly getAllFolders = async (): Promise<IVaultFolder[]> => {
    return folderOps.getAllFolders(this.folderRepo);
  };

  readonly renameFolder = async (
    id: string,
    name: string,
  ): Promise<boolean> => {
    return folderOps.renameFolder(this.folderRepo, id, name);
  };

  readonly setFolderDescription = async (
    id: string,
    description: string | null,
  ): Promise<boolean> => {
    return folderOps.setFolderDescription(this.folderRepo, id, description);
  };

  readonly moveFolder = async (
    id: string,
    newParentId: string | null,
  ): Promise<boolean> => {
    return folderOps.moveFolder(this.folderRepo, id, newParentId);
  };

  readonly deleteFolder = async (id: string): Promise<boolean> => {
    return folderOps.deleteFolder(this.folderRepo, this.permissionService, id);
  };

  readonly addItemToFolder = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> => {
    return folderOps.addItemToFolder(
      this.folderRepo,
      folderId,
      itemId,
      itemType,
    );
  };

  readonly removeItemFromFolder = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> => {
    return folderOps.removeItemFromFolder(
      this.folderRepo,
      folderId,
      itemId,
      itemType,
    );
  };

  readonly getFolderItems = async (
    folderId: string,
  ): Promise<IFolderItem[]> => {
    return folderOps.getFolderItems(this.folderRepo, folderId);
  };

  readonly getItemFolders = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IVaultFolder[]> => {
    return folderOps.getItemFolders(this.folderRepo, itemId, itemType);
  };

  readonly moveItem = async (
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string,
  ): Promise<boolean> => {
    return folderOps.moveItem(
      this.folderRepo,
      itemId,
      itemType,
      fromFolderId,
      toFolderId,
    );
  };

  readonly removeItemFromAllFolders = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<number> => {
    return folderOps.removeItemFromAllFolders(
      this.folderRepo,
      itemId,
      itemType,
    );
  };

  readonly shareFolderWithContact = async (
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> => {
    return sharingOps.shareFolderWithContact(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
      level,
    );
  };

  readonly shareItemWithContact = async (
    itemId: string,
    itemType: ShareableContentType,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> => {
    return sharingOps.shareItemWithContact(
      this.permissionService,
      itemId,
      itemType,
      contactFriendCode,
      level,
    );
  };

  readonly shareCategoryWithContact = async (
    category: ContentCategory,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> => {
    return sharingOps.shareCategoryWithContact(
      this.permissionService,
      category,
      contactFriendCode,
      level,
    );
  };

  readonly unshareFolder = async (
    folderId: string,
    contactFriendCode: string,
  ): Promise<boolean> => {
    return sharingOps.unshareFolder(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
    );
  };

  readonly getFolderWithPermissions = async (
    id: string,
  ): Promise<IFolderWithPermissions | null> => {
    const folder = await this.folderRepo.getFolderById(id);
    if (!folder) return null;

    const sharedWith = await sharingOps.getFolderPermissions(
      this.permissionService,
      id,
    );

    return { ...folder, sharedWith };
  };

  readonly getSharedFolders = async (): Promise<IVaultFolder[]> => {
    return folderOps.getSharedFolders(this.folderRepo);
  };

  readonly shareFolderWithContacts = async (
    folderId: string,
    contacts: Array<{ friendCode: string; level: PermissionLevel }>,
  ): Promise<{ success: number; failed: number }> => {
    return bulkOps.shareFolderWithContacts(
      this.folderRepo,
      this.permissionService,
      folderId,
      contacts,
    );
  };

  readonly shareItemsWithContact = async (
    items: Array<{ itemId: string; itemType: ShareableContentType }>,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ success: number; failed: number }> => {
    return bulkOps.shareItemsWithContact(
      this.permissionService,
      items,
      contactFriendCode,
      level,
    );
  };

  readonly shareFolderContentsWithContact = async (
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ folderShared: boolean; itemsShared: number }> => {
    return bulkOps.shareFolderContentsWithContact(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
      level,
    );
  };

  readonly revokeAllForContact = async (
    contactFriendCode: string,
  ): Promise<number> => {
    return bulkOps.revokeAllForContact(
      this.permissionService,
      contactFriendCode,
    );
  };

  readonly updateContactPermissionLevel = async (
    contactFriendCode: string,
    newLevel: PermissionLevel,
  ): Promise<number> => {
    return bulkOps.updateContactPermissionLevel(
      this.permissionService,
      contactFriendCode,
      newLevel,
    );
  };

  readonly canAccessFolder = async (
    folderId: string,
    friendCode: string,
  ): Promise<PermissionLevel | null> => {
    return accessOps.canAccessFolder(
      this.permissionService,
      folderId,
      friendCode,
    );
  };

  readonly canAccessItem = async (
    itemId: string,
    itemType: ShareableContentType,
    friendCode: string,
  ): Promise<PermissionLevel | null> => {
    return accessOps.canAccessItem(
      this.folderRepo,
      this.permissionService,
      itemId,
      itemType,
      friendCode,
    );
  };

  readonly getSharedWithMe = async (
    myFriendCode: string,
  ): Promise<ISharedContent[]> => {
    return accessOps.getSharedWithMe(this.permissionService, myFriendCode);
  };

  readonly makePublic = async (
    itemId: string,
    itemType: ShareableContentType,
    level: PermissionLevel = 'read',
  ): Promise<boolean> => {
    return publicOps.makePublic(
      this.permissionService,
      itemId,
      itemType,
      level,
    );
  };

  readonly makeFolderPublic = async (
    folderId: string,
    level: PermissionLevel = 'read',
  ): Promise<boolean> => {
    return publicOps.makeFolderPublic(
      this.folderRepo,
      this.permissionService,
      folderId,
      level,
    );
  };

  readonly makeCategoryPublic = async (
    category: ContentCategory,
    level: PermissionLevel = 'read',
  ): Promise<boolean> => {
    return publicOps.makeCategoryPublic(
      this.permissionService,
      category,
      level,
    );
  };

  readonly removePublicAccess = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> => {
    return publicOps.removePublicAccess(
      this.permissionService,
      itemId,
      itemType,
    );
  };

  readonly removeFolderPublicAccess = async (
    folderId: string,
  ): Promise<boolean> => {
    return publicOps.removeFolderPublicAccess(
      this.folderRepo,
      this.permissionService,
      folderId,
    );
  };

  readonly isPublic = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<PermissionLevel | null> => {
    return publicOps.isPublic(this.permissionService, itemId, itemType);
  };

  readonly isFolderPublic = async (
    folderId: string,
  ): Promise<PermissionLevel | null> => {
    return publicOps.isFolderPublic(this.permissionService, folderId);
  };

  readonly getPublicItems = async (): Promise<IPermissionGrant[]> => {
    return publicOps.getPublicItems(this.permissionService);
  };
}

const vaultServiceFactory = createSingleton(() => new VaultService());
export const getVaultService = (): VaultService => vaultServiceFactory.get();
export const resetVaultService = (): void => vaultServiceFactory.reset();
