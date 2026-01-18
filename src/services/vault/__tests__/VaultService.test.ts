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

class MockPermissionService {
  async grant(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async revoke(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async check(): Promise<{ hasAccess: boolean; level: null }> {
    return { hasAccess: false, level: null };
  }

  async getGrantsForGrantee(): Promise<[]> {
    return [];
  }

  async getGrantsForItem(): Promise<[]> {
    return [];
  }

  async revokeAllForItem(): Promise<number> {
    return 0;
  }
}

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
});
