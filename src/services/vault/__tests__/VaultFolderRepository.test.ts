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

  describe('initialize', () => {
    it('should initialize the repository and create tables', async () => {
      await repository.initialize();

      expect(mockDatabase.exec).toHaveBeenCalled();
      // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const execCall = mockDatabase.exec.mock.calls[0][0] as string;
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS vault_folders');
      expect(execCall).toContain(
        'CREATE TABLE IF NOT EXISTS vault_folder_items',
      );
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS');
    });

    it('should only initialize once', async () => {
      await repository.initialize();
      await repository.initialize();

      // exec should only be called once for table creation
      expect(mockDatabase.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe('createFolder', () => {
    it('should create a folder with default options', async () => {
      const folder = await repository.createFolder('Test Folder');

      expect(folder).toBeDefined();
      expect(folder.id).toBe('folder-test-uuid-1');
      expect(folder.name).toBe('Test Folder');
      expect(folder.description).toBeNull();
      expect(folder.parentId).toBeNull();
      expect(folder.itemCount).toBe(0);
      expect(folder.isShared).toBe(false);
      expect(folder.createdAt).toBeDefined();
      expect(folder.updatedAt).toBeDefined();
    });

    it('should create a folder with description', async () => {
      const folder = await repository.createFolder('My Units', {
        description: 'Collection of custom mechs',
      });

      expect(folder.name).toBe('My Units');
      expect(folder.description).toBe('Collection of custom mechs');
    });

    it('should create a folder with parent', async () => {
      const parent = await repository.createFolder('Parent');
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });

    it('should create a shared folder', async () => {
      const folder = await repository.createFolder('Shared Units', {
        isShared: true,
      });

      expect(folder.isShared).toBe(true);
    });

    it('should create a folder with all options', async () => {
      const parent = await repository.createFolder('Parent');
      const folder = await repository.createFolder('Complete Folder', {
        description: 'Full options test',
        parentId: parent.id,
        isShared: true,
      });

      expect(folder.name).toBe('Complete Folder');
      expect(folder.description).toBe('Full options test');
      expect(folder.parentId).toBe(parent.id);
      expect(folder.isShared).toBe(true);
    });
  });

  describe('getFolderById', () => {
    it('should return folder when found', async () => {
      const created = await repository.createFolder('Test Folder');
      const found = await repository.getFolderById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Folder');
    });

    it('should return null when folder not found', async () => {
      const found = await repository.getFolderById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should convert stored row to domain object correctly', async () => {
      const folder = await repository.createFolder('Test', {
        description: 'desc',
        isShared: true,
      });
      const found = await repository.getFolderById(folder.id);

      // Verify all fields are properly converted
      expect(found?.id).toBe(folder.id);
      expect(found?.name).toBe('Test');
      expect(found?.description).toBe('desc');
      expect(found?.parentId).toBeNull();
      expect(found?.isShared).toBe(true);
      expect(found?.itemCount).toBe(0);
      expect(typeof found?.createdAt).toBe('string');
      expect(typeof found?.updatedAt).toBe('string');
    });
  });

  describe('getRootFolders', () => {
    it('should return only folders without parents', async () => {
      await repository.createFolder('Root 1');
      await repository.createFolder('Root 2');
      const parent = await repository.createFolder('Parent Root');
      await repository.createFolder('Child', { parentId: parent.id });

      const roots = await repository.getRootFolders();

      expect(roots).toHaveLength(3);
      expect(roots.every((f) => f.parentId === null)).toBe(true);
    });

    it('should return folders sorted by name', async () => {
      await repository.createFolder('Zebra');
      await repository.createFolder('Alpha');
      await repository.createFolder('Middle');

      const roots = await repository.getRootFolders();

      expect(roots[0].name).toBe('Alpha');
      expect(roots[1].name).toBe('Middle');
      expect(roots[2].name).toBe('Zebra');
    });

    it('should return empty array when no folders exist', async () => {
      const roots = await repository.getRootFolders();

      expect(roots).toEqual([]);
    });
  });

  describe('getChildFolders', () => {
    it('should return child folders of a parent', async () => {
      const parent = await repository.createFolder('Parent');
      await repository.createFolder('Child 1', { parentId: parent.id });
      await repository.createFolder('Child 2', { parentId: parent.id });
      await repository.createFolder('Other Root');

      const children = await repository.getChildFolders(parent.id);

      expect(children).toHaveLength(2);
      expect(children.every((f) => f.parentId === parent.id)).toBe(true);
    });

    it('should return folders sorted by name', async () => {
      const parent = await repository.createFolder('Parent');
      await repository.createFolder('Zebra', { parentId: parent.id });
      await repository.createFolder('Alpha', { parentId: parent.id });

      const children = await repository.getChildFolders(parent.id);

      expect(children[0].name).toBe('Alpha');
      expect(children[1].name).toBe('Zebra');
    });

    it('should return empty array when no children exist', async () => {
      const parent = await repository.createFolder('Empty Parent');
      const children = await repository.getChildFolders(parent.id);

      expect(children).toEqual([]);
    });
  });

  describe('getAllFolders', () => {
    it('should return all folders', async () => {
      const parent = await repository.createFolder('Parent');
      await repository.createFolder('Child', { parentId: parent.id });
      await repository.createFolder('Root');

      const all = await repository.getAllFolders();

      expect(all).toHaveLength(3);
    });

    it('should return folders sorted by name', async () => {
      await repository.createFolder('Zebra');
      await repository.createFolder('Alpha');

      const all = await repository.getAllFolders();

      expect(all[0].name).toBe('Alpha');
      expect(all[1].name).toBe('Zebra');
    });
  });

  describe('getSharedFolders', () => {
    it('should return only shared folders', async () => {
      await repository.createFolder('Shared 1', { isShared: true });
      await repository.createFolder('Shared 2', { isShared: true });
      await repository.createFolder('Private');

      const shared = await repository.getSharedFolders();

      expect(shared).toHaveLength(2);
      expect(shared.every((f) => f.isShared)).toBe(true);
    });

    it('should return empty array when no shared folders exist', async () => {
      await repository.createFolder('Private');

      const shared = await repository.getSharedFolders();

      expect(shared).toEqual([]);
    });
  });

  describe('updateFolderName', () => {
    it('should update folder name', async () => {
      const folder = await repository.createFolder('Original');

      const result = await repository.updateFolderName(folder.id, 'Renamed');

      expect(result).toBe(true);

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.name).toBe('Renamed');
    });

    it('should return false for non-existent folder', async () => {
      const result = await repository.updateFolderName(
        'non-existent',
        'New Name',
      );

      expect(result).toBe(false);
    });

    it('should update the updated_at timestamp', async () => {
      const folder = await repository.createFolder('Original');
      const originalUpdatedAt = folder.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.updateFolderName(folder.id, 'Renamed');

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('updateFolderDescription', () => {
    it('should update folder description', async () => {
      const folder = await repository.createFolder('Test', {
        description: 'Old description',
      });

      const result = await repository.updateFolderDescription(
        folder.id,
        'New description',
      );

      expect(result).toBe(true);

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.description).toBe('New description');
    });

    it('should clear description with null', async () => {
      const folder = await repository.createFolder('Test', {
        description: 'Has description',
      });

      await repository.updateFolderDescription(folder.id, null);

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.description).toBeNull();
    });

    it('should return false for non-existent folder', async () => {
      const result = await repository.updateFolderDescription(
        'non-existent',
        'desc',
      );

      expect(result).toBe(false);
    });
  });

  describe('moveFolder', () => {
    it('should move folder to new parent', async () => {
      const parent1 = await repository.createFolder('Parent 1');
      const parent2 = await repository.createFolder('Parent 2');
      const child = await repository.createFolder('Child', {
        parentId: parent1.id,
      });

      const result = await repository.moveFolder(child.id, parent2.id);

      expect(result).toBe(true);

      const moved = await repository.getFolderById(child.id);
      expect(moved?.parentId).toBe(parent2.id);
    });

    it('should move folder to root (null parent)', async () => {
      const parent = await repository.createFolder('Parent');
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      const result = await repository.moveFolder(child.id, null);

      expect(result).toBe(true);

      const moved = await repository.getFolderById(child.id);
      expect(moved?.parentId).toBeNull();
    });

    it('should prevent circular reference (direct)', async () => {
      const parent = await repository.createFolder('Parent');
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      // Try to make parent a child of its own child
      const result = await repository.moveFolder(parent.id, child.id);

      expect(result).toBe(false);

      // Parent should still be at root
      const unchanged = await repository.getFolderById(parent.id);
      expect(unchanged?.parentId).toBeNull();
    });

    it('should prevent circular reference (nested)', async () => {
      const grandparent = await repository.createFolder('Grandparent');
      const parent = await repository.createFolder('Parent', {
        parentId: grandparent.id,
      });
      const child = await repository.createFolder('Child', {
        parentId: parent.id,
      });

      // Try to make grandparent a child of its grandchild
      const result = await repository.moveFolder(grandparent.id, child.id);

      expect(result).toBe(false);
    });

    it('should return false for non-existent folder', async () => {
      const parent = await repository.createFolder('Parent');

      const result = await repository.moveFolder('non-existent', parent.id);

      expect(result).toBe(false);
    });
  });

  describe('setFolderShared', () => {
    it('should set folder as shared', async () => {
      const folder = await repository.createFolder('Private');

      const result = await repository.setFolderShared(folder.id, true);

      expect(result).toBe(true);

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.isShared).toBe(true);
    });

    it('should unset folder sharing', async () => {
      const folder = await repository.createFolder('Shared', {
        isShared: true,
      });

      const result = await repository.setFolderShared(folder.id, false);

      expect(result).toBe(true);

      const updated = await repository.getFolderById(folder.id);
      expect(updated?.isShared).toBe(false);
    });

    it('should return false for non-existent folder', async () => {
      const result = await repository.setFolderShared('non-existent', true);

      expect(result).toBe(false);
    });
  });
});
