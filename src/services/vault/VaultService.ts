/**
 * Vault Service
 *
 * High-level service for managing vault content, folders, and permissions.
 * Coordinates between folder repository and permission service.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

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

// =============================================================================
// Types
// =============================================================================

/**
 * Vault item with folder info
 */
export interface IVaultItem {
  itemId: string;
  itemType: ShareableContentType;
  folders: IVaultFolder[];
}

/**
 * Folder with permission info
 */
export interface IFolderWithPermissions extends IVaultFolder {
  sharedWith: Array<{
    contactId: string;
    contactName: string;
    level: PermissionLevel;
  }>;
}

/**
 * Content shared with user
 */
export interface ISharedContent {
  /** Source contact */
  fromContact: {
    id: string;
    friendCode: string;
    displayName: string;
  };
  /** Permission level */
  level: PermissionLevel;
  /** Scope type */
  scopeType: 'item' | 'folder' | 'category' | 'all';
  /** Scope ID (for item/folder) */
  scopeId: string | null;
  /** Category (for category scope) */
  category: ContentCategory | null;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Service for managing vault content and sharing
 */
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
    options?: {
      description?: string;
      parentId?: string;
    },
  ): Promise<IVaultFolder> {
    return folderOps.createFolder(name, options);
  }

  async getFolder(id: string): Promise<IVaultFolder | null> {
    return folderOps.getFolder(id);
  }

  async getRootFolders(): Promise<IVaultFolder[]> {
    return folderOps.getRootFolders();
  }

  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    return folderOps.getChildFolders(parentId);
  }

  async getAllFolders(): Promise<IVaultFolder[]> {
    return folderOps.getAllFolders();
  }

  async renameFolder(id: string, name: string): Promise<boolean> {
    return folderOps.renameFolder(id, name);
  }

  async setFolderDescription(
    id: string,
    description: string | null,
  ): Promise<boolean> {
    return folderOps.setFolderDescription(id, description);
  }

  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    return folderOps.moveFolder(id, newParentId);
  }

  async deleteFolder(id: string): Promise<boolean> {
    return folderOps.deleteFolder(id);
  }

  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return folderOps.addItemToFolder(folderId, itemId, itemType);
  }

  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return folderOps.removeItemFromFolder(folderId, itemId, itemType);
  }

  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    return folderOps.getFolderItems(folderId);
  }

  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IVaultFolder[]> {
    return folderOps.getItemFolders(itemId, itemType);
  }

  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string,
  ): Promise<boolean> {
    return folderOps.moveItem(itemId, itemType, fromFolderId, toFolderId);
  }

  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<number> {
    return folderOps.removeItemFromAllFolders(itemId, itemType);
  }

  // ===========================================================================
  // Sharing with Contacts
  // ===========================================================================

  async shareFolderWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<boolean> {
    return sharingOps.shareFolderWithContact(
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
      category,
      contactFriendCode,
      level,
    );
  }

  async unshareFolder(
    folderId: string,
    contactFriendCode: string,
  ): Promise<boolean> {
    return sharingOps.unshareFolder(folderId, contactFriendCode);
  }

  async getFolderWithPermissions(
    id: string,
  ): Promise<IFolderWithPermissions | null> {
    const folder = await this.folderRepo.getFolderById(id);
    if (!folder) return null;

    const sharedWith = await sharingOps.getFolderPermissions(id);

    return {
      ...folder,
      sharedWith,
    };
  }

  async getSharedFolders(): Promise<IVaultFolder[]> {
    return folderOps.getSharedFolders();
  }

  // ===========================================================================
  // Bulk Permission Operations
  // ===========================================================================

  async shareFolderWithContacts(
    folderId: string,
    contacts: Array<{
      friendCode: string;
      level: PermissionLevel;
    }>,
  ): Promise<{ success: number; failed: number }> {
    return bulkOps.shareFolderWithContacts(folderId, contacts);
  }

  async shareItemsWithContact(
    items: Array<{
      itemId: string;
      itemType: ShareableContentType;
    }>,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ success: number; failed: number }> {
    return bulkOps.shareItemsWithContact(items, contactFriendCode, level);
  }

  async shareFolderContentsWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel,
  ): Promise<{ folderShared: boolean; itemsShared: number }> {
    return bulkOps.shareFolderContentsWithContact(
      folderId,
      contactFriendCode,
      level,
    );
  }

  async revokeAllForContact(contactFriendCode: string): Promise<number> {
    return bulkOps.revokeAllForContact(contactFriendCode);
  }

  async updateContactPermissionLevel(
    contactFriendCode: string,
    newLevel: PermissionLevel,
  ): Promise<number> {
    return bulkOps.updateContactPermissionLevel(contactFriendCode, newLevel);
  }

  async canAccessFolder(
    folderId: string,
    friendCode: string,
  ): Promise<PermissionLevel | null> {
    return accessOps.canAccessFolder(folderId, friendCode);
  }

  async canAccessItem(
    itemId: string,
    itemType: ShareableContentType,
    friendCode: string,
  ): Promise<PermissionLevel | null> {
    return accessOps.canAccessItem(itemId, itemType, friendCode);
  }

  async getSharedWithMe(myFriendCode: string): Promise<ISharedContent[]> {
    return accessOps.getSharedWithMe(myFriendCode);
  }

  async makePublic(
    itemId: string,
    itemType: ShareableContentType,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makePublic(itemId, itemType, level);
  }

  async makeFolderPublic(
    folderId: string,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makeFolderPublic(folderId, level);
  }

  async makeCategoryPublic(
    category: ContentCategory,
    level: PermissionLevel = 'read',
  ): Promise<boolean> {
    return publicOps.makeCategoryPublic(category, level);
  }

  async removePublicAccess(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> {
    return publicOps.removePublicAccess(itemId, itemType);
  }

  async removeFolderPublicAccess(folderId: string): Promise<boolean> {
    return publicOps.removeFolderPublicAccess(folderId);
  }

  async isPublic(
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<PermissionLevel | null> {
    return publicOps.isPublic(itemId, itemType);
  }

  async isFolderPublic(folderId: string): Promise<PermissionLevel | null> {
    return publicOps.isFolderPublic(folderId);
  }

  async getPublicItems(): Promise<IPermissionGrant[]> {
    return publicOps.getPublicItems();
  }
}

// =============================================================================
// Singleton
// =============================================================================

const vaultServiceFactory = createSingleton(() => new VaultService());

export function getVaultService(): VaultService {
  return vaultServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetVaultService(): void {
  vaultServiceFactory.reset();
}
