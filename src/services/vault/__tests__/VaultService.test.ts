/**
 * Vault Service Tests
 *
 * Tests for vault folder management and sharing functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { VaultService } from '@/services/vault/VaultService';

import {
  MockPermissionService,
  MockVaultFolderRepository,
  mockContacts,
} from './vaultService.test-helpers';

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
      mockPermissionService as never,
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

  describe('Move Folder', () => {
    it('should move folder to new parent', async () => {
      const parent1 = await service.createFolder('Parent 1');
      const parent2 = await service.createFolder('Parent 2');
      const child = await service.createFolder('Child', {
        parentId: parent1.id,
      });

      await service.moveFolder(child.id, parent2.id);

      const moved = await service.getFolder(child.id);
      expect(moved?.parentId).toBe(parent2.id);
    });

    it('should move folder to root', async () => {
      const parent = await service.createFolder('Parent');
      const child = await service.createFolder('Child', {
        parentId: parent.id,
      });

      await service.moveFolder(child.id, null);

      const moved = await service.getFolder(child.id);
      expect(moved?.parentId).toBeNull();
    });
  });

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
        'read',
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
        'read',
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
        'write',
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
        'read',
      );

      expect(result).toBe(true);
    });
  });

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
});
