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

  async createFolder(
    name: string,
    options?: { description?: string; parentId?: string },
  ): Promise<IVaultFolder> {
    return folderOps.createFolder(this.folderRepo, name, options);
  }

  async getFolder(id: string): Promise<IVaultFolder | null> {
    return folderOps.getFolder(this.folderRepo, id);
  }

  async getRootFolders(): Promise<IVaultFolder[]> {
    return folderOps.getRootFolders(this.folderRepo);
  }

  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    return folderOps.getChildFolders(this.folderRepo, parentId);
  }

  async getAllFolders(): Promise<IVaultFolder[]> {
    return folderOps.getAllFolders(this.folderRepo);
  }

  async renameFolder(id: string, name: string): Promise<boolean> {
    return folderOps.renameFolder(this.folderRepo, id, name);
  }

  async setFolderDescription(
    id: string,
    description: string | null,
  ): Promise<boolean> {
    return folderOps.setFolderDescription(this.folderRepo, id, description);
  }

  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    return folderOps.moveFolder(this.folderRepo, id, newParentId);
  }

  async deleteFolder(id: string): Promise<boolean> {
    return folderOps.deleteFolder(this.folderRepo, this.permissionService, id);
  }

  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return folderOps.addItemToFolder(
      this.folderRepo,
      folderId,
      itemId,
      itemType,
    );
  }

  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return folderOps.removeItemFromFolder(
      this.folderRepo,
      folderId,
      itemId,
      itemType,
    );
  }

  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    return folderOps.getFolderItems(this.folderRepo, folderId);
  }

  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IVaultFolder[]> {
    return folderOps.getItemFolders(this.folderRepo, itemId, itemType);
  }

  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string,
  ): Promise<boolean> {
    return folderOps.moveItem(
      this.folderRepo,
      itemId,
      itemType,
      fromFolderId,
      toFolderId,
    );
  }

  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<number> {
    return folderOps.removeItemFromAllFolders(
      this.folderRepo,
      itemId,
      itemType,
    );
  }

  async shareFolderWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> {
    return sharingOps.shareFolderWithContact(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
      level,
    );
  }

  async shareItemWithContact(
    itemId: string,
    itemType: ShareableContentType,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> {
    return sharingOps.shareItemWithContact(
      this.permissionService,
      itemId,
      itemType,
      contactFriendCode,
      level,
    );
  }

  async shareCategoryWithContact(
    category: ContentCategory,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> {
    return sharingOps.shareCategoryWithContact(
      this.permissionService,
      category,
      contactFriendCode,
      level,
    );
  }

  async unshareFolder(
    folderId: string,
    contactFriendCode: string,
  ): Promise<boolean> {
    return sharingOps.unshareFolder(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
    );
  }

  async getFolderWithPermissions(
    id: string,
  ): Promise<IFolderWithPermissions | null> {
    const folder = await this.folderRepo.getFolderById(id);
    if (!folder) return null;

    const sharedWith = await sharingOps.getFolderPermissions(
      this.permissionService,
      id,
    );

    return { ...folder, sharedWith };
  }

  async getSharedFolders(): Promise<IVaultFolder[]> {
    return folderOps.getSharedFolders(this.folderRepo);
  }

  async shareFolderWithContacts(
    folderId: string,
    contacts: Array<{ friendCode: string; level: PermissionLevel }>,
  ): Promise<{ success: number; failed: number }> {
    return bulkOps.shareFolderWithContacts(
      this.folderRepo,
      this.permissionService,
      folderId,
      contacts,
    );
  }

  async shareItemsWithContact(
    items: Array<{ itemId: string; itemType: ShareableContentType }>,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ success: number; failed: number }> {
    return bulkOps.shareItemsWithContact(
      this.permissionService,
      items,
      contactFriendCode,
      level,
    );
  }

  async shareFolderContentsWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ folderShared: boolean; itemsShared: number }> {
    return bulkOps.shareFolderContentsWithContact(
      this.folderRepo,
      this.permissionService,
      folderId,
      contactFriendCode,
      level,
    );
  }

  async revokeAllForContact(contactFriendCode: string): Promise<number> {
    return bulkOps.revokeAllForContact(
      this.permissionService,
      contactFriendCode,
    );
  }

  async updateContactPermissionLevel(
    contactFriendCode: string,
    newLevel: PermissionLevel,
  ): Promise<number> {
    return bulkOps.updateContactPermissionLevel(
      this.permissionService,
      contactFriendCode,
      newLevel,
    );
  }

  async canAccessFolder(
    folderId: string,
    friendCode: string,
  ): Promise<PermissionLevel | null> {
    return accessOps.canAccessFolder(
      this.permissionService,
      folderId,
      friendCode,
    );
  }

  async canAccessItem(
    itemId: string,
    itemType: ShareableContentType,
    friendCode: string,
  ): Promise<PermissionLevel | null> {
    return accessOps.canAccessItem(
      this.folderRepo,
      this.permissionService,
      itemId,
      itemType,
      friendCode,
    );
  }

  async getSharedWithMe(myFriendCode: string): Promise<ISharedContent[]> {
    return accessOps.getSharedWithMe(this.permissionService, myFriendCode);
  }

  async makePublic(
    itemId: string,
    itemType: ShareableContentType,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makePublic(
      this.permissionService,
      itemId,
      itemType,
      level,
    );
  }

  async makeFolderPublic(
    folderId: string,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makeFolderPublic(
      this.folderRepo,
      this.permissionService,
      folderId,
      level,
    );
  }

  async makeCategoryPublic(
    category: ContentCategory,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makeCategoryPublic(
      this.permissionService,
      category,
      level,
    );
  }

  async removePublicAccess(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return publicOps.removePublicAccess(
      this.permissionService,
      itemId,
      itemType,
    );
  }

  async removeFolderPublicAccess(folderId: string): Promise<boolean> {
    return publicOps.removeFolderPublicAccess(
      this.folderRepo,
      this.permissionService,
      folderId,
    );
  }

  async isPublic(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<PermissionLevel | null> {
    return publicOps.isPublic(this.permissionService, itemId, itemType);
  }

  async isFolderPublic(folderId: string): Promise<PermissionLevel | null> {
    return publicOps.isFolderPublic(this.permissionService, folderId);
  }

  async getPublicItems(): Promise<IPermissionGrant[]> {
    return publicOps.getPublicItems(this.permissionService);
  }
}

const vaultServiceFactory = createSingleton(() => new VaultService());
export const getVaultService = (): VaultService => vaultServiceFactory.get();
export const resetVaultService = (): void => vaultServiceFactory.reset();
