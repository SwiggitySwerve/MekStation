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
import {
  VaultFolderRepository,
  getVaultFolderRepository,
} from './VaultFolderRepository';
import { PermissionService, getPermissionService } from './PermissionService';
import { getContactRepository } from './ContactRepository';

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
    permissionService?: PermissionService
  ) {
    this.folderRepo = folderRepo ?? getVaultFolderRepository();
    this.permissionService = permissionService ?? getPermissionService();
  }

  // ===========================================================================
  // Folder Management
  // ===========================================================================

  /**
   * Create a new folder
   */
  async createFolder(
    name: string,
    options?: {
      description?: string;
      parentId?: string;
    }
  ): Promise<IVaultFolder> {
    return this.folderRepo.createFolder(name, options);
  }

  /**
   * Get folder by ID
   */
  async getFolder(id: string): Promise<IVaultFolder | null> {
    return this.folderRepo.getFolderById(id);
  }

  /**
   * Get all root folders
   */
  async getRootFolders(): Promise<IVaultFolder[]> {
    return this.folderRepo.getRootFolders();
  }

  /**
   * Get children of a folder
   */
  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    return this.folderRepo.getChildFolders(parentId);
  }

  /**
   * Get all folders
   */
  async getAllFolders(): Promise<IVaultFolder[]> {
    return this.folderRepo.getAllFolders();
  }

  /**
   * Rename a folder
   */
  async renameFolder(id: string, name: string): Promise<boolean> {
    return this.folderRepo.updateFolderName(id, name);
  }

  /**
   * Update folder description
   */
  async setFolderDescription(
    id: string,
    description: string | null
  ): Promise<boolean> {
    return this.folderRepo.updateFolderDescription(id, description);
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    return this.folderRepo.moveFolder(id, newParentId);
  }

  /**
   * Delete a folder
   */
  async deleteFolder(id: string): Promise<boolean> {
    // First revoke all permissions for this folder
    await this.permissionService.revokeAllForItem('folder', id);
    return this.folderRepo.deleteFolder(id);
  }

  // ===========================================================================
  // Item-Folder Assignments
  // ===========================================================================

  /**
   * Add item to folder
   */
  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    return this.folderRepo.addItemToFolder(folderId, itemId, itemType);
  }

  /**
   * Remove item from folder
   */
  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    return this.folderRepo.removeItemFromFolder(folderId, itemId, itemType);
  }

  /**
   * Get items in a folder
   */
  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    return this.folderRepo.getFolderItems(folderId);
  }

  /**
   * Get folders containing an item
   */
  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<IVaultFolder[]> {
    return this.folderRepo.getItemFolders(itemId, itemType);
  }

  /**
   * Move item between folders
   */
  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string
  ): Promise<boolean> {
    return this.folderRepo.moveItem(itemId, itemType, fromFolderId, toFolderId);
  }

  /**
   * Remove item from all folders (when item is deleted)
   */
  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<number> {
    return this.folderRepo.removeItemFromAllFolders(itemId, itemType);
  }

  // ===========================================================================
  // Sharing with Contacts
  // ===========================================================================

  /**
   * Share a folder with a contact
   */
  async shareFolderWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel
  ): Promise<boolean> {
    // Mark folder as shared
    await this.folderRepo.setFolderShared(folderId, true);

    // Get contact name for display
    const contactRepo = getContactRepository();
    const contact = await contactRepo.getByFriendCode(contactFriendCode);
    const contactName = contact
      ? contact.nickname || contact.displayName
      : contactFriendCode;

    // Grant permission
    await this.permissionService.grant({
      granteeId: contactFriendCode,
      granteeName: contactName,
      scopeType: 'folder',
      scopeId: folderId,
      level,
    });

    return true;
  }

  /**
   * Share an item with a contact
   */
  async shareItemWithContact(
    itemId: string,
    itemType: ShareableContentType,
    contactFriendCode: string,
    level: PermissionLevel
  ): Promise<boolean> {
    const contactRepo = getContactRepository();
    const contact = await contactRepo.getByFriendCode(contactFriendCode);
    const contactName = contact
      ? contact.nickname || contact.displayName
      : contactFriendCode;

    await this.permissionService.grant({
      granteeId: contactFriendCode,
      granteeName: contactName,
      scopeType: 'item',
      scopeId: `${itemType}:${itemId}`,
      level,
    });

    return true;
  }

  /**
   * Share a category with a contact
   */
  async shareCategoryWithContact(
    category: ContentCategory,
    contactFriendCode: string,
    level: PermissionLevel
  ): Promise<boolean> {
    const contactRepo = getContactRepository();
    const contact = await contactRepo.getByFriendCode(contactFriendCode);
    const contactName = contact
      ? contact.nickname || contact.displayName
      : contactFriendCode;

    await this.permissionService.grant({
      granteeId: contactFriendCode,
      granteeName: contactName,
      scopeType: 'category',
      scopeCategory: category,
      level,
    });

    return true;
  }

  /**
   * Revoke sharing from a contact for a folder
   */
  async unshareFolder(
    folderId: string,
    contactFriendCode: string
  ): Promise<boolean> {
    const permissions = await this.permissionService.getGrantsForGrantee(
      contactFriendCode
    );

    for (const perm of permissions) {
      if (perm.scopeType === 'folder' && perm.scopeId === folderId) {
        await this.permissionService.revoke(perm.id);
      }
    }

    // Check if folder is still shared with anyone
    const folderPerms = await this.permissionService.getGrantsForItem(
      'folder',
      folderId
    );
    if (folderPerms.length === 0) {
      await this.folderRepo.setFolderShared(folderId, false);
    }

    return true;
  }

  /**
   * Get folder with permission info
   */
  async getFolderWithPermissions(id: string): Promise<IFolderWithPermissions | null> {
    const folder = await this.folderRepo.getFolderById(id);
    if (!folder) return null;

    const permissions = await this.permissionService.getGrantsForItem(
      'folder',
      id
    );

    return {
      ...folder,
      sharedWith: permissions.map((p: IPermissionGrant) => ({
        contactId: p.granteeId,
        contactName: p.granteeName || p.granteeId,
        level: p.level,
      })),
    };
  }

  /**
   * Get all shared folders
   */
  async getSharedFolders(): Promise<IVaultFolder[]> {
    return this.folderRepo.getSharedFolders();
  }

  // ===========================================================================
  // Bulk Permission Operations
  // ===========================================================================

  /**
   * Share a folder with multiple contacts at once
   */
  async shareFolderWithContacts(
    folderId: string,
    contacts: Array<{
      friendCode: string;
      level: PermissionLevel;
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        await this.shareFolderWithContact(folderId, contact.friendCode, contact.level);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Share multiple items with a contact at once
   */
  async shareItemsWithContact(
    items: Array<{
      itemId: string;
      itemType: ShareableContentType;
    }>,
    contactFriendCode: string,
    level: PermissionLevel
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.shareItemWithContact(
          item.itemId,
          item.itemType,
          contactFriendCode,
          level
        );
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Share all items in a folder with a contact
   * This grants permission to the folder AND all items currently in it
   */
  async shareFolderContentsWithContact(
    folderId: string,
    contactFriendCode: string,
    level: PermissionLevel
  ): Promise<{ folderShared: boolean; itemsShared: number }> {
    // Share the folder itself
    await this.shareFolderWithContact(folderId, contactFriendCode, level);

    // Get all items in folder and share them too
    const items = await this.folderRepo.getFolderItems(folderId);
    let itemsShared = 0;

    for (const item of items) {
      try {
        await this.shareItemWithContact(
          item.itemId,
          item.itemType,
          contactFriendCode,
          level
        );
        itemsShared++;
      } catch {
        // Continue with other items
      }
    }

    return { folderShared: true, itemsShared };
  }

  /**
   * Revoke all permissions for a contact across all items and folders
   */
  async revokeAllForContact(contactFriendCode: string): Promise<number> {
    return this.permissionService.revokeAllForGrantee(contactFriendCode);
  }

  /**
   * Update permission level for all shares with a contact
   */
  async updateContactPermissionLevel(
    contactFriendCode: string,
    newLevel: PermissionLevel
  ): Promise<number> {
    const permissions = await this.permissionService.getGrantsForGrantee(contactFriendCode);
    let updated = 0;

    for (const perm of permissions) {
      const result = await this.permissionService.updateLevel(perm.id, newLevel);
      if (result.success) updated++;
    }

    return updated;
  }

  // ===========================================================================
  // Checking Access
  // ===========================================================================

  /**
   * Check if user has access to a folder
   */
  async canAccessFolder(
    folderId: string,
    friendCode: string
  ): Promise<PermissionLevel | null> {
    const result = await this.permissionService.check(
      friendCode,
      'folder',
      folderId
    );
    return result.level;
  }

  /**
   * Check if user has access to an item
   */
  async canAccessItem(
    itemId: string,
    itemType: ShareableContentType,
    friendCode: string
  ): Promise<PermissionLevel | null> {
    // Check direct item permission
    const itemResult = await this.permissionService.check(
      friendCode,
      'item',
      `${itemType}:${itemId}`
    );
    if (itemResult.level) return itemResult.level;

    // Check if item is in a shared folder
    const folders = await this.folderRepo.getItemFolders(itemId, itemType);
    for (const folder of folders) {
      const folderLevel = await this.canAccessFolder(folder.id, friendCode);
      if (folderLevel) return folderLevel;
    }

    // Check category permission
    const categoryMap: Record<ShareableContentType, ContentCategory> = {
      unit: 'units',
      pilot: 'pilots',
      force: 'forces',
      encounter: 'encounters',
    };

    const categoryResult = await this.permissionService.check(
      friendCode,
      'category',
      null,
      categoryMap[itemType]
    );
    return categoryResult.level;
  }

  /**
   * Get items shared with the current user
   */
  async getSharedWithMe(myFriendCode: string): Promise<ISharedContent[]> {
    const permissions =
      await this.permissionService.getGrantsForGrantee(myFriendCode);

    const result: ISharedContent[] = [];

    for (const perm of permissions) {
      // Skip public permissions
      if (perm.granteeId === 'public') continue;

      // We need the contact who shared this - which is stored differently
      // For now, return with placeholder contact info
      // In a real implementation, we'd track the sharer
      result.push({
        fromContact: {
          id: 'owner',
          friendCode: 'OWNER',
          displayName: 'Vault Owner',
        },
        level: perm.level,
        scopeType: perm.scopeType,
        scopeId: perm.scopeId,
        category: perm.scopeCategory,
      });
    }

    return result;
  }

  // ===========================================================================
  // Public Sharing
  // ===========================================================================

  /**
   * Make an item publicly accessible
   */
  async makePublic(
    itemId: string,
    itemType: ShareableContentType,
    level: PermissionLevel = 'read'
  ): Promise<boolean> {
    await this.permissionService.grant({
      granteeId: 'public',
      granteeName: 'Public',
      scopeType: 'item',
      scopeId: `${itemType}:${itemId}`,
      level,
    });
    return true;
  }

  /**
   * Make a folder publicly accessible
   */
  async makeFolderPublic(
    folderId: string,
    level: PermissionLevel = 'read'
  ): Promise<boolean> {
    await this.folderRepo.setFolderShared(folderId, true);
    await this.permissionService.grant({
      granteeId: 'public',
      granteeName: 'Public',
      scopeType: 'folder',
      scopeId: folderId,
      level,
    });
    return true;
  }

  /**
   * Make a category publicly accessible
   */
  async makeCategoryPublic(
    category: ContentCategory,
    level: PermissionLevel = 'read'
  ): Promise<boolean> {
    await this.permissionService.grant({
      granteeId: 'public',
      granteeName: 'Public',
      scopeType: 'category',
      scopeCategory: category,
      level,
    });
    return true;
  }

  /**
   * Remove public access from an item
   */
  async removePublicAccess(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    const scopeId = `${itemType}:${itemId}`;
    const grants = await this.permissionService.getGrantsForItem('item', scopeId);

    for (const grant of grants) {
      if (grant.granteeId === 'public') {
        await this.permissionService.revoke(grant.id);
      }
    }

    return true;
  }

  /**
   * Remove public access from a folder
   */
  async removeFolderPublicAccess(folderId: string): Promise<boolean> {
    const grants = await this.permissionService.getGrantsForItem('folder', folderId);

    for (const grant of grants) {
      if (grant.granteeId === 'public') {
        await this.permissionService.revoke(grant.id);
      }
    }

    // Check if folder is still shared with anyone (non-public)
    const remaining = await this.permissionService.getGrantsForItem('folder', folderId);
    if (remaining.length === 0) {
      await this.folderRepo.setFolderShared(folderId, false);
    }

    return true;
  }

  /**
   * Check if an item is publicly accessible
   */
  async isPublic(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<PermissionLevel | null> {
    const result = await this.permissionService.check(
      'public',
      'item',
      `${itemType}:${itemId}`
    );
    return result.level;
  }

  /**
   * Check if a folder is publicly accessible
   */
  async isFolderPublic(folderId: string): Promise<PermissionLevel | null> {
    const result = await this.permissionService.check(
      'public',
      'folder',
      folderId
    );
    return result.level;
  }

  /**
   * Get all public items
   */
  async getPublicItems(): Promise<IPermissionGrant[]> {
    return this.permissionService.getGrantsForGrantee('public');
  }
}

// =============================================================================
// Singleton
// =============================================================================

let vaultService: VaultService | null = null;

export function getVaultService(): VaultService {
  if (!vaultService) {
    vaultService = new VaultService();
  }
  return vaultService;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVaultService(): void {
  vaultService = null;
}
