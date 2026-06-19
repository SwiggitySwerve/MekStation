/**
 * VaultFolderRepository Tests
 *
 * Tests for vault folder persistence including folder CRUD operations
 * and folder-item assignments.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  createVaultFolderRepositoryTestSubject,
  getVaultFolderRepository,
  mockDatabase,
  resetVaultFolderRepository,
  type VaultFolderRepository,
} from './VaultFolderRepository.test-helpers';

describe('VaultFolderRepository', () => {
  let repository: VaultFolderRepository;

  beforeEach(() => {
    repository = createVaultFolderRepositoryTestSubject();
  });

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      const folder = await repository.createFolder('To Delete');

      const result = await repository.deleteFolder(folder.id);

      expect(result).toBe(true);

      const found = await repository.getFolderById(folder.id);
      expect(found).toBeNull();
    });

    it('should move children to deleted folders parent', async () => {
      const grandparent = await repository.createFolder('Grandparent');
      const parent = await repository.createFolder('Parent', {
        parentId: grandparent.id,
      });
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      await repository.deleteFolder(parent.id);

      // Child should now be under grandparent
      const movedChild = await repository.getFolderById(child.id);
      expect(movedChild?.parentId).toBe(grandparent.id);
    });

    it('should move children to root when deleting root folder', async () => {
      const parent = await repository.createFolder('Parent');
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      await repository.deleteFolder(parent.id);

      // Child should now be at root
      const movedChild = await repository.getFolderById(child.id);
      expect(movedChild?.parentId).toBeNull();
    });

    it('should return false for non-existent folder', async () => {
      const result = await repository.deleteFolder('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('addItemToFolder', () => {
    it('should add item to folder', async () => {
      const folder = await repository.createFolder('Units');

      const result = await repository.addItemToFolder(
        folder.id,
        'unit-123',
        'unit',
      );

      expect(result).toBe(true);

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(1);
      expect(items[0].itemId).toBe('unit-123');
      expect(items[0].itemType).toBe('unit');
      expect(items[0].folderId).toBe(folder.id);
    });

    it('should add different item types', async () => {
      const folder = await repository.createFolder('Mixed');

      await repository.addItemToFolder(folder.id, 'unit-1', 'unit');
      await repository.addItemToFolder(folder.id, 'pilot-1', 'pilot');
      await repository.addItemToFolder(folder.id, 'force-1', 'force');
      await repository.addItemToFolder(folder.id, 'encounter-1', 'encounter');

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(4);
    });

    it('should replace existing item assignment', async () => {
      const folder = await repository.createFolder('Units');

      await repository.addItemToFolder(folder.id, 'unit-123', 'unit');
      await repository.addItemToFolder(folder.id, 'unit-123', 'unit');

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(1);
    });

    it('should allow same item ID with different types', async () => {
      const folder = await repository.createFolder('Mixed');

      await repository.addItemToFolder(folder.id, 'id-123', 'unit');
      await repository.addItemToFolder(folder.id, 'id-123', 'pilot');

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(2);
    });
  });

  describe('removeItemFromFolder', () => {
    it('should remove item from folder', async () => {
      const folder = await repository.createFolder('Units');
      await repository.addItemToFolder(folder.id, 'unit-123', 'unit');

      const result = await repository.removeItemFromFolder(
        folder.id,
        'unit-123',
        'unit',
      );

      expect(result).toBe(true);

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(0);
    });

    it('should return false when item not in folder', async () => {
      const folder = await repository.createFolder('Units');

      const result = await repository.removeItemFromFolder(
        folder.id,
        'unit-123',
        'unit',
      );

      expect(result).toBe(false);
    });

    it('should only remove specific item type', async () => {
      const folder = await repository.createFolder('Mixed');
      await repository.addItemToFolder(folder.id, 'id-123', 'unit');
      await repository.addItemToFolder(folder.id, 'id-123', 'pilot');

      await repository.removeItemFromFolder(folder.id, 'id-123', 'unit');

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(1);
      expect(items[0].itemType).toBe('pilot');
    });
  });

  describe('getFolderItems', () => {
    it('should return items sorted by assigned_at descending', async () => {
      const folder = await repository.createFolder('Units');

      // Add items with slight delays to ensure different timestamps
      await repository.addItemToFolder(folder.id, 'unit-1', 'unit');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.addItemToFolder(folder.id, 'unit-2', 'unit');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.addItemToFolder(folder.id, 'unit-3', 'unit');

      const items = await repository.getFolderItems(folder.id);

      // Most recently added should be first
      expect(items[0].itemId).toBe('unit-3');
      expect(items[2].itemId).toBe('unit-1');
    });

    it('should return empty array for folder with no items', async () => {
      const folder = await repository.createFolder('Empty');

      const items = await repository.getFolderItems(folder.id);

      expect(items).toEqual([]);
    });

    it('should convert stored row to domain object', async () => {
      const folder = await repository.createFolder('Units');
      await repository.addItemToFolder(folder.id, 'unit-123', 'unit');

      const items = await repository.getFolderItems(folder.id);

      expect(items[0]).toHaveProperty('folderId');
      expect(items[0]).toHaveProperty('itemId');
      expect(items[0]).toHaveProperty('itemType');
      expect(items[0]).toHaveProperty('assignedAt');
    });
  });

  describe('getItemFolders', () => {
    it('should return folders containing item', async () => {
      const folder1 = await repository.createFolder('Folder 1');
      const folder2 = await repository.createFolder('Folder 2');
      await repository.createFolder('Folder 3');

      await repository.addItemToFolder(folder1.id, 'unit-123', 'unit');
      await repository.addItemToFolder(folder2.id, 'unit-123', 'unit');

      const folders = await repository.getItemFolders('unit-123', 'unit');

      expect(folders).toHaveLength(2);
      expect(folders.map((f) => f.id).sort()).toEqual(
        [folder1.id, folder2.id].sort(),
      );
    });

    it('should return empty array when item not in any folder', async () => {
      await repository.createFolder('Folder');

      const folders = await repository.getItemFolders('unit-123', 'unit');

      expect(folders).toEqual([]);
    });

    it('should only return folders with matching item type', async () => {
      const folder1 = await repository.createFolder('Folder 1');
      const folder2 = await repository.createFolder('Folder 2');

      await repository.addItemToFolder(folder1.id, 'id-123', 'unit');
      await repository.addItemToFolder(folder2.id, 'id-123', 'pilot');

      const unitFolders = await repository.getItemFolders('id-123', 'unit');
      const pilotFolders = await repository.getItemFolders('id-123', 'pilot');

      expect(unitFolders).toHaveLength(1);
      expect(unitFolders[0].id).toBe(folder1.id);
      expect(pilotFolders).toHaveLength(1);
      expect(pilotFolders[0].id).toBe(folder2.id);
    });
  });

  describe('isItemInFolder', () => {
    it('should return true when item is in folder', async () => {
      const folder = await repository.createFolder('Units');
      await repository.addItemToFolder(folder.id, 'unit-123', 'unit');

      const result = await repository.isItemInFolder(
        folder.id,
        'unit-123',
        'unit',
      );

      expect(result).toBe(true);
    });

    it('should return false when item is not in folder', async () => {
      const folder = await repository.createFolder('Units');

      const result = await repository.isItemInFolder(
        folder.id,
        'unit-123',
        'unit',
      );

      expect(result).toBe(false);
    });

    it('should return false for wrong item type', async () => {
      const folder = await repository.createFolder('Mixed');
      await repository.addItemToFolder(folder.id, 'id-123', 'unit');

      const result = await repository.isItemInFolder(
        folder.id,
        'id-123',
        'pilot',
      );

      expect(result).toBe(false);
    });
  });

  describe('moveItem', () => {
    it('should move item between folders', async () => {
      const folder1 = await repository.createFolder('From');
      const folder2 = await repository.createFolder('To');
      await repository.addItemToFolder(folder1.id, 'unit-123', 'unit');

      const result = await repository.moveItem(
        'unit-123',
        'unit',
        folder1.id,
        folder2.id,
      );

      expect(result).toBe(true);

      const items1 = await repository.getFolderItems(folder1.id);
      const items2 = await repository.getFolderItems(folder2.id);

      expect(items1).toHaveLength(0);
      expect(items2).toHaveLength(1);
      expect(items2[0].itemId).toBe('unit-123');
    });

    it('should return false when item not in source folder', async () => {
      const folder1 = await repository.createFolder('From');
      const folder2 = await repository.createFolder('To');

      const result = await repository.moveItem(
        'unit-123',
        'unit',
        folder1.id,
        folder2.id,
      );

      expect(result).toBe(false);
    });

    it('should update assigned_at timestamp', async () => {
      const folder1 = await repository.createFolder('From');
      const folder2 = await repository.createFolder('To');
      await repository.addItemToFolder(folder1.id, 'unit-123', 'unit');

      const itemsBefore = await repository.getFolderItems(folder1.id);
      const originalAssignedAt = itemsBefore[0].assignedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.moveItem('unit-123', 'unit', folder1.id, folder2.id);

      const itemsAfter = await repository.getFolderItems(folder2.id);
      expect(itemsAfter[0].assignedAt).not.toBe(originalAssignedAt);
    });
  });

  describe('removeItemFromAllFolders', () => {
    it('should remove item from all folders', async () => {
      const folder1 = await repository.createFolder('Folder 1');
      const folder2 = await repository.createFolder('Folder 2');
      const folder3 = await repository.createFolder('Folder 3');

      await repository.addItemToFolder(folder1.id, 'unit-123', 'unit');
      await repository.addItemToFolder(folder2.id, 'unit-123', 'unit');
      await repository.addItemToFolder(folder3.id, 'other-unit', 'unit');

      const count = await repository.removeItemFromAllFolders(
        'unit-123',
        'unit',
      );

      expect(count).toBe(2);

      const items1 = await repository.getFolderItems(folder1.id);
      const items2 = await repository.getFolderItems(folder2.id);
      const items3 = await repository.getFolderItems(folder3.id);

      expect(items1).toHaveLength(0);
      expect(items2).toHaveLength(0);
      expect(items3).toHaveLength(1);
    });

    it('should return 0 when item not in any folder', async () => {
      await repository.createFolder('Folder');

      const count = await repository.removeItemFromAllFolders(
        'unit-123',
        'unit',
      );

      expect(count).toBe(0);
    });

    it('should only remove matching item type', async () => {
      const folder = await repository.createFolder('Mixed');
      await repository.addItemToFolder(folder.id, 'id-123', 'unit');
      await repository.addItemToFolder(folder.id, 'id-123', 'pilot');

      await repository.removeItemFromAllFolders('id-123', 'unit');

      const items = await repository.getFolderItems(folder.id);
      expect(items).toHaveLength(1);
      expect(items[0].itemType).toBe('pilot');
    });
  });

  describe('getVaultFolderRepository', () => {
    it('should return singleton instance', () => {
      resetVaultFolderRepository();
      const instance1 = getVaultFolderRepository();
      const instance2 = getVaultFolderRepository();

      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = getVaultFolderRepository();
      resetVaultFolderRepository();
      const instance2 = getVaultFolderRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('resetVaultFolderRepository', () => {
    it('should clear the singleton', () => {
      const instance1 = getVaultFolderRepository();
      resetVaultFolderRepository();
      const instance2 = getVaultFolderRepository();

      expect(instance1).not.toBe(instance2);
    });
  });
});
