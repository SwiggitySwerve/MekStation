/**
 * Vault Service Tests
 *
 * Tests for vault folder management and sharing functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { VaultService } from '@/services/vault/VaultService';
import type { IVaultFolder, IFolderItem, ShareableContentType } from '@/types/vault';

// =============================================================================
// Mock Folder Repository
// =============================================================================

class MockVaultFolderRepository {
  private folders: Map<string, IVaultFolder> = new Map();
  private folderItems: Map<string, IFolderItem[]> = new Map();
  private idCounter = 0;

  async createFolder(
    name: string,
    options?: { description?: string; parentId?: string; isShared?: boolean }
  ): Promise<IVaultFolder> {
    const id = `folder-mock-${++this.idCounter}`;
    const now = new Date().toISOString();
    const folder: IVaultFolder = {
      id,
      name,
      description: options?.description ?? null,
      parentId: options?.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
      isShared: options?.isShared ?? false,
    };
    this.folders.set(id, folder);
    this.folderItems.set(id, []);
    return folder;
  }

  async getFolderById(id: string): Promise<IVaultFolder | null> {
    return this.folders.get(id) || null;
  }

  async getRootFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter((f) => f.parentId === null);
  }

  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter(
      (f) => f.parentId === parentId
    );
  }

  async getAllFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values());
  }

  async getSharedFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter((f) => f.isShared);
  }

  async updateFolderName(id: string, name: string): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.name = name;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async updateFolderDescription(
    id: string,
    description: string | null
  ): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.description = description;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.parentId = newParentId;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async setFolderShared(id: string, isShared: boolean): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.isShared = isShared;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async deleteFolder(id: string): Promise<boolean> {
    this.folderItems.delete(id);
    return this.folders.delete(id);
  }

  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    const items = this.folderItems.get(folderId) || [];
    const exists = items.some(
      (i) => i.itemId === itemId && i.itemType === itemType
    );
    if (!exists) {
      items.push({
        folderId,
        itemId,
        itemType,
        assignedAt: new Date().toISOString(),
      });
      this.folderItems.set(folderId, items);
      const folder = this.folders.get(folderId);
      if (folder) folder.itemCount = items.length;
    }
    return true;
  }

  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    const items = this.folderItems.get(folderId) || [];
    const newItems = items.filter(
      (i) => !(i.itemId === itemId && i.itemType === itemType)
    );
    this.folderItems.set(folderId, newItems);
    const folder = this.folders.get(folderId);
    if (folder) folder.itemCount = newItems.length;
    return items.length !== newItems.length;
  }

  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    return this.folderItems.get(folderId) || [];
  }

  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<IVaultFolder[]> {
    const result: IVaultFolder[] = [];
    this.folderItems.forEach((items: IFolderItem[], folderId: string) => {
      if (items.some((i: IFolderItem) => i.itemId === itemId && i.itemType === itemType)) {
        const folder = this.folders.get(folderId);
        if (folder) result.push(folder);
      }
    });
    return result;
  }

  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string
  ): Promise<boolean> {
    await this.removeItemFromFolder(fromFolderId, itemId, itemType);
    return this.addItemToFolder(toFolderId, itemId, itemType);
  }

  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<number> {
    let count = 0;
    this.folderItems.forEach((items: IFolderItem[], folderId: string) => {
      const newItems = items.filter(
        (i: IFolderItem) => !(i.itemId === itemId && i.itemType === itemType)
      );
      if (newItems.length !== items.length) {
        this.folderItems.set(folderId, newItems);
        const folder = this.folders.get(folderId);
        if (folder) folder.itemCount = newItems.length;
        count++;
      }
    });
    return count;
  }

  clear(): void {
    this.folders.clear();
    this.folderItems.clear();
    this.idCounter = 0;
  }
}

// =============================================================================
// Mock Permission Service
// =============================================================================

interface MockPermission {
  id: string;
  granteeId: string;
  granteeName?: string;
  scopeType: 'item' | 'folder' | 'category' | 'all';
  scopeId: string | null;
  scopeCategory?: string | null;
  level: 'read' | 'write' | 'admin';
}

class MockPermissionService {
  private permissions: Map<string, MockPermission> = new Map();
  private idCounter = 0;

  async grant(params: {
    granteeId: string;
    granteeName?: string;
    scopeType: 'item' | 'folder' | 'category' | 'all';
    scopeId?: string | null;
    scopeCategory?: string | null;
    level: 'read' | 'write' | 'admin';
  }): Promise<{ success: boolean; id: string }> {
    const id = `perm-mock-${++this.idCounter}`;
    this.permissions.set(id, {
      id,
      granteeId: params.granteeId,
      granteeName: params.granteeName,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
      scopeCategory: params.scopeCategory ?? null,
      level: params.level,
    });
    return { success: true, id };
  }

  async revoke(id: string): Promise<{ success: boolean }> {
    return { success: this.permissions.delete(id) };
  }

  async check(
    granteeId: string,
    scopeType: string,
    scopeId: string | null,
    scopeCategory?: string | null
  ): Promise<{ hasAccess: boolean; level: 'read' | 'write' | 'admin' | null }> {
    const perms = Array.from(this.permissions.values());
    for (const perm of perms) {
      if (perm.granteeId === granteeId) {
        if (perm.scopeType === 'all') {
          return { hasAccess: true, level: perm.level };
        }
        if (perm.scopeType === scopeType && perm.scopeId === scopeId) {
          return { hasAccess: true, level: perm.level };
        }
        if (perm.scopeType === 'category' && perm.scopeCategory === scopeCategory) {
          return { hasAccess: true, level: perm.level };
        }
      }
    }
    return { hasAccess: false, level: null };
  }

  async getGrantsForGrantee(granteeId: string): Promise<MockPermission[]> {
    return Array.from(this.permissions.values()).filter(
      (p) => p.granteeId === granteeId
    );
  }

  async getGrantsForItem(scopeType: string, scopeId: string): Promise<MockPermission[]> {
    return Array.from(this.permissions.values()).filter(
      (p) => p.scopeType === scopeType && p.scopeId === scopeId
    );
  }

  async revokeAllForItem(scopeType: string, scopeId: string): Promise<number> {
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.scopeType === scopeType && perm.scopeId === scopeId) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  }

  async revokeAllForGrantee(granteeId: string): Promise<number> {
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.granteeId === granteeId) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  }

  async updateLevel(
    id: string,
    newLevel: 'read' | 'write' | 'admin'
  ): Promise<{ success: boolean }> {
    const perm = this.permissions.get(id);
    if (!perm) return { success: false };
    perm.level = newLevel;
    return { success: true };
  }

  clear(): void {
    this.permissions.clear();
    this.idCounter = 0;
  }

  seedPermission(permission: MockPermission): void {
    this.permissions.set(permission.id, { ...permission });
  }
}

// =============================================================================
// Mock Contact Repository
// =============================================================================

interface MockContact {
  id: string;
  friendCode: string;
  nickname: string | null;
  displayName: string;
}

const mockContacts: Map<string, MockContact> = new Map();

// Mock the getContactRepository function
jest.mock('../ContactRepository', () => ({
  getContactRepository: () => ({
    getByFriendCode: async (friendCode: string) => {
      return mockContacts.get(friendCode) ?? null;
    },
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('VaultService', () => {
  let service: VaultService;
  let mockFolderRepo: MockVaultFolderRepository;
  let mockPermissionService: MockPermissionService;

  beforeEach(() => {
    mockFolderRepo = new MockVaultFolderRepository();
    mockPermissionService = new MockPermissionService();
    service = new VaultService(
      mockFolderRepo as never,
      mockPermissionService as never
    );
  });

  // ===========================================================================
  // Folder Management
  // ===========================================================================

  describe('Folder Management', () => {
    it('should create a folder', async () => {
      const folder = await service.createFolder('Test Folder');

      expect(folder).toBeDefined();
      expect(folder.name).toBe('Test Folder');
      expect(folder.parentId).toBeNull();
    });

    it('should create a folder with description', async () => {
      const folder = await service.createFolder('Test', {
        description: 'A test folder',
      });

      expect(folder.description).toBe('A test folder');
    });

    it('should create a child folder', async () => {
      const parent = await service.createFolder('Parent');
      const child = await service.createFolder('Child', {
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });

    it('should get folder by ID', async () => {
      const created = await service.createFolder('Test');
      const found = await service.getFolder(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should get root folders', async () => {
      await service.createFolder('Root 1');
      await service.createFolder('Root 2');
      const parent = await service.createFolder('Parent');
      await service.createFolder('Child', { parentId: parent.id });

      const roots = await service.getRootFolders();

      expect(roots).toHaveLength(3);
    });

    it('should get child folders', async () => {
      const parent = await service.createFolder('Parent');
      await service.createFolder('Child 1', { parentId: parent.id });
      await service.createFolder('Child 2', { parentId: parent.id });

      const children = await service.getChildFolders(parent.id);

      expect(children).toHaveLength(2);
    });

    it('should rename a folder', async () => {
      const folder = await service.createFolder('Original');
      await service.renameFolder(folder.id, 'Renamed');

      const updated = await service.getFolder(folder.id);
      expect(updated?.name).toBe('Renamed');
    });

    it('should delete a folder', async () => {
      const folder = await service.createFolder('To Delete');
      await service.deleteFolder(folder.id);

      const found = await service.getFolder(folder.id);
      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // Item-Folder Assignments
  // ===========================================================================

  describe('Item-Folder Assignments', () => {
    it('should add item to folder', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-123', 'unit');

      const items = await service.getFolderItems(folder.id);
      expect(items).toHaveLength(1);
      expect(items[0].itemId).toBe('unit-123');
      expect(items[0].itemType).toBe('unit');
    });

    it('should remove item from folder', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-123', 'unit');
      await service.removeItemFromFolder(folder.id, 'unit-123', 'unit');

      const items = await service.getFolderItems(folder.id);
      expect(items).toHaveLength(0);
    });

    it('should get folders containing item', async () => {
      const folder1 = await service.createFolder('Folder 1');
      const folder2 = await service.createFolder('Folder 2');
      await service.addItemToFolder(folder1.id, 'unit-123', 'unit');
      await service.addItemToFolder(folder2.id, 'unit-123', 'unit');

      const folders = await service.getItemFolders('unit-123', 'unit');
      expect(folders).toHaveLength(2);
    });

    it('should move item between folders', async () => {
      const folder1 = await service.createFolder('From');
      const folder2 = await service.createFolder('To');
      await service.addItemToFolder(folder1.id, 'unit-123', 'unit');

      await service.moveItem('unit-123', 'unit', folder1.id, folder2.id);

      const items1 = await service.getFolderItems(folder1.id);
      const items2 = await service.getFolderItems(folder2.id);
      expect(items1).toHaveLength(0);
      expect(items2).toHaveLength(1);
    });

    it('should remove item from all folders', async () => {
      const folder1 = await service.createFolder('Folder 1');
      const folder2 = await service.createFolder('Folder 2');
      await service.addItemToFolder(folder1.id, 'unit-123', 'unit');
      await service.addItemToFolder(folder2.id, 'unit-123', 'unit');

      await service.removeItemFromAllFolders('unit-123', 'unit');

      const items1 = await service.getFolderItems(folder1.id);
      const items2 = await service.getFolderItems(folder2.id);
      expect(items1).toHaveLength(0);
      expect(items2).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Folder Item Count
  // ===========================================================================

  describe('Item Count', () => {
    it('should track item count', async () => {
      const folder = await service.createFolder('Units');

      expect(folder.itemCount).toBe(0);

      await service.addItemToFolder(folder.id, 'unit-1', 'unit');
      await service.addItemToFolder(folder.id, 'unit-2', 'unit');

      const updated = await service.getFolder(folder.id);
      expect(updated?.itemCount).toBe(2);

      await service.removeItemFromFolder(folder.id, 'unit-1', 'unit');

      const afterRemove = await service.getFolder(folder.id);
      expect(afterRemove?.itemCount).toBe(1);
    });
  });

  // ===========================================================================
  // Folder Description
  // ===========================================================================

  describe('Folder Description', () => {
    it('should set folder description', async () => {
      const folder = await service.createFolder('Units');
      await service.setFolderDescription(folder.id, 'My units collection');

      const updated = await service.getFolder(folder.id);
      expect(updated?.description).toBe('My units collection');
    });

    it('should clear folder description', async () => {
      const folder = await service.createFolder('Units', {
        description: 'Initial description',
      });
      await service.setFolderDescription(folder.id, null);

      const updated = await service.getFolder(folder.id);
      expect(updated?.description).toBeNull();
    });
  });

  // ===========================================================================
  // Move Folder
  // ===========================================================================

  describe('Move Folder', () => {
    it('should move folder to new parent', async () => {
      const parent1 = await service.createFolder('Parent 1');
      const parent2 = await service.createFolder('Parent 2');
      const child = await service.createFolder('Child', { parentId: parent1.id });

      await service.moveFolder(child.id, parent2.id);

      const moved = await service.getFolder(child.id);
      expect(moved?.parentId).toBe(parent2.id);
    });

    it('should move folder to root', async () => {
      const parent = await service.createFolder('Parent');
      const child = await service.createFolder('Child', { parentId: parent.id });

      await service.moveFolder(child.id, null);

      const moved = await service.getFolder(child.id);
      expect(moved?.parentId).toBeNull();
    });
  });

  // ===========================================================================
  // All Folders
  // ===========================================================================

  describe('All Folders', () => {
    it('should get all folders', async () => {
      await service.createFolder('Folder 1');
      await service.createFolder('Folder 2');
      const parent = await service.createFolder('Parent');
      await service.createFolder('Child', { parentId: parent.id });

      const all = await service.getAllFolders();
      expect(all).toHaveLength(4);
    });
  });

  // ===========================================================================
  // Sharing with Contacts
  // ===========================================================================

  describe('Sharing with Contacts', () => {
    beforeEach(() => {
      mockContacts.clear();
      mockPermissionService.clear();
    });

    it('should share folder with contact', async () => {
      const folder = await service.createFolder('Shared Folder');
      mockContacts.set('PEER-1234-ABCD', {
        id: 'contact-1',
        friendCode: 'PEER-1234-ABCD',
        nickname: 'TestUser',
        displayName: 'Test User',
      });

      const result = await service.shareFolderWithContact(
        folder.id,
        'PEER-1234-ABCD',
        'read'
      );

      expect(result).toBe(true);
      const updatedFolder = await service.getFolder(folder.id);
      expect(updatedFolder?.isShared).toBe(true);
    });

    it('should share folder with unknown contact using friend code as name', async () => {
      const folder = await service.createFolder('Shared Folder');

      const result = await service.shareFolderWithContact(
        folder.id,
        'UNKNOWN-CODE',
        'read'
      );

      expect(result).toBe(true);
    });

    it('should share item with contact', async () => {
      mockContacts.set('PEER-1234-ABCD', {
        id: 'contact-1',
        friendCode: 'PEER-1234-ABCD',
        nickname: null,
        displayName: 'Test User',
      });

      const result = await service.shareItemWithContact(
        'unit-123',
        'unit',
        'PEER-1234-ABCD',
        'write'
      );

      expect(result).toBe(true);
    });

    it('should share category with contact', async () => {
      mockContacts.set('PEER-1234-ABCD', {
        id: 'contact-1',
        friendCode: 'PEER-1234-ABCD',
        nickname: 'Friend',
        displayName: 'Friendly User',
      });

      const result = await service.shareCategoryWithContact(
        'units',
        'PEER-1234-ABCD',
        'read'
      );

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // Unsharing
  // ===========================================================================

  describe('Unsharing', () => {
    beforeEach(() => {
      mockContacts.clear();
      mockPermissionService.clear();
    });

    it('should unshare folder from contact', async () => {
      const folder = await service.createFolder('Shared Folder');
      mockContacts.set('PEER-1234-ABCD', {
        id: 'contact-1',
        friendCode: 'PEER-1234-ABCD',
        nickname: null,
        displayName: 'Test User',
      });

      await service.shareFolderWithContact(folder.id, 'PEER-1234-ABCD', 'read');

      const result = await service.unshareFolder(folder.id, 'PEER-1234-ABCD');

      expect(result).toBe(true);
    });

    it('should mark folder as not shared when all permissions revoked', async () => {
      const folder = await service.createFolder('Shared Folder');
      await service.shareFolderWithContact(folder.id, 'PEER-1234-ABCD', 'read');
      await service.unshareFolder(folder.id, 'PEER-1234-ABCD');

      const updatedFolder = await service.getFolder(folder.id);
      expect(updatedFolder?.isShared).toBe(false);
    });
  });

  // ===========================================================================
  // Folder with Permissions
  // ===========================================================================

  describe('Folder with Permissions', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should get folder with permission info', async () => {
      const folder = await service.createFolder('Shared Folder');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        granteeName: 'Test User',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });

      const result = await service.getFolderWithPermissions(folder.id);

      expect(result).toBeDefined();
      expect(result?.sharedWith).toHaveLength(1);
      expect(result?.sharedWith[0].contactId).toBe('PEER-1234-ABCD');
      expect(result?.sharedWith[0].level).toBe('read');
    });

    it('should return null for non-existent folder', async () => {
      const result = await service.getFolderWithPermissions('non-existent');
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Shared Folders
  // ===========================================================================

  describe('Shared Folders', () => {
    it('should get shared folders', async () => {
      const folder1 = await service.createFolder('Folder 1');
      await service.createFolder('Folder 2');
      await mockFolderRepo.setFolderShared(folder1.id, true);

      const shared = await service.getSharedFolders();

      expect(shared).toHaveLength(1);
      expect(shared[0].id).toBe(folder1.id);
    });
  });

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  describe('Bulk Operations', () => {
    beforeEach(() => {
      mockContacts.clear();
      mockPermissionService.clear();
    });

    it('should share folder with multiple contacts', async () => {
      const folder = await service.createFolder('Shared');

      const result = await service.shareFolderWithContacts(folder.id, [
        { friendCode: 'PEER-1', level: 'read' },
        { friendCode: 'PEER-2', level: 'write' },
        { friendCode: 'PEER-3', level: 'admin' },
      ]);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should share multiple items with contact', async () => {
      const result = await service.shareItemsWithContact(
        [
          { itemId: 'unit-1', itemType: 'unit' },
          { itemId: 'pilot-1', itemType: 'pilot' },
          { itemId: 'force-1', itemType: 'force' },
        ],
        'PEER-1234-ABCD',
        'read'
      );

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should share folder contents with contact', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-1', 'unit');
      await service.addItemToFolder(folder.id, 'unit-2', 'unit');

      const result = await service.shareFolderContentsWithContact(
        folder.id,
        'PEER-1234-ABCD',
        'read'
      );

      expect(result.folderShared).toBe(true);
      expect(result.itemsShared).toBe(2);
    });

    it('should revoke all permissions for contact', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'write',
      });

      const revoked = await service.revokeAllForContact('PEER-1234-ABCD');

      expect(revoked).toBe(2);
    });

    it('should update permission level for all contact shares', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });

      const updated = await service.updateContactPermissionLevel(
        'PEER-1234-ABCD',
        'write'
      );

      expect(updated).toBe(2);
    });
  });

  // ===========================================================================
  // Access Checking
  // ===========================================================================

  describe('Access Checking', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should check folder access', async () => {
      const folder = await service.createFolder('Protected');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });

      const level = await service.canAccessFolder(folder.id, 'PEER-1234-ABCD');

      expect(level).toBe('read');
    });

    it('should return null for no folder access', async () => {
      const folder = await service.createFolder('Protected');

      const level = await service.canAccessFolder(folder.id, 'UNKNOWN-PEER');

      expect(level).toBeNull();
    });

    it('should check item access via direct permission', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'write',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD'
      );

      expect(level).toBe('write');
    });

    it('should check item access via folder permission', async () => {
      const folder = await service.createFolder('Units');
      await service.addItemToFolder(folder.id, 'unit-123', 'unit');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'admin',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD'
      );

      expect(level).toBe('admin');
    });

    it('should check item access via category permission', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1234-ABCD',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'read',
      });

      const level = await service.canAccessItem(
        'unit-123',
        'unit',
        'PEER-1234-ABCD'
      );

      expect(level).toBe('read');
    });

    it('should get shared content for user', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'MY-FRIEND-CODE',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });

      const shared = await service.getSharedWithMe('MY-FRIEND-CODE');

      expect(shared).toHaveLength(1);
      expect(shared[0].scopeType).toBe('folder');
      expect(shared[0].level).toBe('read');
    });

    it('should exclude public permissions from shared with me', async () => {
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });

      const shared = await service.getSharedWithMe('MY-FRIEND-CODE');

      expect(shared).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Public Sharing
  // ===========================================================================

  describe('Public Sharing', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should make item public', async () => {
      const result = await service.makePublic('unit-123', 'unit', 'read');

      expect(result).toBe(true);
    });

    it('should make item public with default level', async () => {
      const result = await service.makePublic('unit-123', 'unit');

      expect(result).toBe(true);
    });

    it('should make folder public', async () => {
      const folder = await service.createFolder('Public Folder');

      const result = await service.makeFolderPublic(folder.id, 'read');

      expect(result).toBe(true);
      const updated = await service.getFolder(folder.id);
      expect(updated?.isShared).toBe(true);
    });

    it('should make category public', async () => {
      const result = await service.makeCategoryPublic('units', 'read');

      expect(result).toBe(true);
    });

    it('should remove public access from item', async () => {
      await service.makePublic('unit-123', 'unit');
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'read',
      });

      const result = await service.removePublicAccess('unit-123', 'unit');

      expect(result).toBe(true);
    });

    it('should remove public access from folder', async () => {
      const folder = await service.createFolder('Was Public');
      await service.makeFolderPublic(folder.id);
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });

      const result = await service.removeFolderPublicAccess(folder.id);

      expect(result).toBe(true);
    });

    it('should check if item is public', async () => {
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-123',
        level: 'read',
      });

      const level = await service.isPublic('unit-123', 'unit');

      expect(level).toBe('read');
    });

    it('should return null for non-public item', async () => {
      const level = await service.isPublic('unit-123', 'unit');

      expect(level).toBeNull();
    });

    it('should check if folder is public', async () => {
      const folder = await service.createFolder('Public');
      mockPermissionService.seedPermission({
        id: 'public-perm',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'write',
      });

      const level = await service.isFolderPublic(folder.id);

      expect(level).toBe('write');
    });

    it('should get all public items', async () => {
      mockPermissionService.seedPermission({
        id: 'pub-1',
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit:unit-1',
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'pub-2',
        granteeId: 'public',
        scopeType: 'folder',
        scopeId: 'folder-1',
        level: 'read',
      });

      const items = await service.getPublicItems();

      expect(items).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Delete Folder with Permissions
  // ===========================================================================

  describe('Delete Folder with Permissions', () => {
    beforeEach(() => {
      mockPermissionService.clear();
    });

    it('should revoke permissions when deleting folder', async () => {
      const folder = await service.createFolder('To Delete');
      mockPermissionService.seedPermission({
        id: 'perm-1',
        granteeId: 'PEER-1',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'read',
      });
      mockPermissionService.seedPermission({
        id: 'perm-2',
        granteeId: 'PEER-2',
        scopeType: 'folder',
        scopeId: folder.id,
        level: 'write',
      });

      await service.deleteFolder(folder.id);

      const perms = await mockPermissionService.getGrantsForItem(
        'folder',
        folder.id
      );
      expect(perms).toHaveLength(0);
    });
  });
});
