/**
 * VaultFolderRepository Tests
 *
 * Tests for vault folder persistence including folder CRUD operations
 * and folder-item assignments.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IStoredVaultFolder, IStoredFolderItem } from '@/types/vault';

// =============================================================================
// Mock Setup - must be before imports that use the mocked modules
// =============================================================================

// Mock UUID generation for predictable IDs in tests
let uuidCounter = 0;
const mockRandomUUID = jest.fn(() => `test-uuid-${++uuidCounter}`);
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
});

// Create mock database state
interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

interface MockDatabase {
  exec: jest.Mock;
  prepare: jest.Mock;
}

// In-memory storage for mock database
let mockFolders: Map<string, IStoredVaultFolder>;
let mockFolderItems: Map<string, IStoredFolderItem[]>;
let mockDatabase: MockDatabase;
let mockInitialized: boolean;

const createMockStatement = (): MockStatement => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
});

// Setup mock database behavior
const setupMockDatabase = () => {
  mockFolders = new Map();
  mockFolderItems = new Map();
  mockInitialized = false;

  mockDatabase = {
    exec: jest.fn(),
    prepare: jest.fn((sql: string) => {
      const stmt = createMockStatement();

      // INSERT INTO vault_folders
      if (sql.includes('INSERT INTO vault_folders')) {
        stmt.run.mockImplementation(
          (
            id: string,
            name: string,
            description: string | null,
            parentId: string | null,
            createdAt: string,
            updatedAt: string,
            itemCount: number,
            isShared: number
          ) => {
            const folder: IStoredVaultFolder = {
              id,
              name,
              description,
              parent_id: parentId,
              created_at: createdAt,
              updated_at: updatedAt,
              item_count: itemCount,
              is_shared: isShared,
            };
            mockFolders.set(id, folder);
            return { changes: 1 };
          }
        );
      }

      // SELECT * FROM vault_folders WHERE id = ?
      if (sql.includes('SELECT * FROM vault_folders WHERE id = ?')) {
        stmt.get.mockImplementation((id: string) => {
          return mockFolders.get(id) ?? undefined;
        });
      }

      // SELECT * FROM vault_folders WHERE parent_id IS NULL
      if (sql.includes('WHERE parent_id IS NULL')) {
        stmt.all.mockImplementation(() => {
          return Array.from(mockFolders.values())
            .filter((f) => f.parent_id === null)
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      // SELECT * FROM vault_folders WHERE parent_id = ?
      if (
        sql.includes('WHERE parent_id = ?') &&
        !sql.includes('UPDATE') &&
        !sql.includes('IS NULL')
      ) {
        stmt.all.mockImplementation((parentId: string) => {
          return Array.from(mockFolders.values())
            .filter((f) => f.parent_id === parentId)
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      // SELECT * FROM vault_folders ORDER BY name (getAllFolders)
      if (
        sql.includes('SELECT * FROM vault_folders ORDER BY name') &&
        !sql.includes('WHERE')
      ) {
        stmt.all.mockImplementation(() => {
          return Array.from(mockFolders.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });
      }

      // SELECT * FROM vault_folders WHERE is_shared = 1
      if (sql.includes('WHERE is_shared = 1')) {
        stmt.all.mockImplementation(() => {
          return Array.from(mockFolders.values())
            .filter((f) => f.is_shared === 1)
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      // UPDATE vault_folders SET name
      if (sql.includes('UPDATE vault_folders SET name')) {
        stmt.run.mockImplementation(
          (name: string, updatedAt: string, id: string) => {
            const folder = mockFolders.get(id);
            if (folder) {
              folder.name = name;
              folder.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        );
      }

      // UPDATE vault_folders SET description
      if (sql.includes('UPDATE vault_folders SET description')) {
        stmt.run.mockImplementation(
          (description: string | null, updatedAt: string, id: string) => {
            const folder = mockFolders.get(id);
            if (folder) {
              folder.description = description;
              folder.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        );
      }

      // UPDATE vault_folders SET parent_id (moveFolder)
      if (
        sql.includes('UPDATE vault_folders SET parent_id') &&
        !sql.includes('WHERE parent_id')
      ) {
        stmt.run.mockImplementation(
          (parentId: string | null, updatedAt: string, id: string) => {
            const folder = mockFolders.get(id);
            if (folder) {
              folder.parent_id = parentId;
              folder.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        );
      }

      // UPDATE vault_folders SET parent_id = ? WHERE parent_id = ? (reparent children on delete)
      if (sql.includes('UPDATE vault_folders SET parent_id = ? WHERE parent_id = ?')) {
        stmt.run.mockImplementation(
          (newParentId: string | null, oldParentId: string) => {
            let changes = 0;
            mockFolders.forEach((folder) => {
              if (folder.parent_id === oldParentId) {
                folder.parent_id = newParentId;
                changes++;
              }
            });
            return { changes };
          }
        );
      }

      // UPDATE vault_folders SET is_shared
      if (sql.includes('UPDATE vault_folders SET is_shared')) {
        stmt.run.mockImplementation(
          (isShared: number, updatedAt: string, id: string) => {
            const folder = mockFolders.get(id);
            if (folder) {
              folder.is_shared = isShared;
              folder.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        );
      }

      // DELETE FROM vault_folders WHERE id = ?
      if (sql.includes('DELETE FROM vault_folders WHERE id = ?')) {
        stmt.run.mockImplementation((id: string) => {
          const deleted = mockFolders.delete(id);
          mockFolderItems.delete(id);
          return { changes: deleted ? 1 : 0 };
        });
      }

      // INSERT OR REPLACE INTO vault_folder_items
      if (sql.includes('INSERT OR REPLACE INTO vault_folder_items')) {
        stmt.run.mockImplementation(
          (
            folderId: string,
            itemId: string,
            itemType: string,
            assignedAt: string
          ) => {
            const items = mockFolderItems.get(folderId) || [];
            const existingIndex = items.findIndex(
              (i) => i.item_id === itemId && i.item_type === itemType
            );
            const item: IStoredFolderItem = {
              folder_id: folderId,
              item_id: itemId,
              item_type: itemType as IStoredFolderItem['item_type'],
              assigned_at: assignedAt,
            };
            if (existingIndex >= 0) {
              items[existingIndex] = item;
            } else {
              items.push(item);
            }
            mockFolderItems.set(folderId, items);
            return { changes: 1 };
          }
        );
      }

      // DELETE FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?
      if (
        sql.includes('DELETE FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?')
      ) {
        stmt.run.mockImplementation(
          (folderId: string, itemId: string, itemType: string) => {
            const items = mockFolderItems.get(folderId) || [];
            const newItems = items.filter(
              (i) => !(i.item_id === itemId && i.item_type === itemType)
            );
            mockFolderItems.set(folderId, newItems);
            return { changes: items.length - newItems.length };
          }
        );
      }

      // SELECT * FROM vault_folder_items WHERE folder_id = ?
      if (sql.includes('SELECT * FROM vault_folder_items WHERE folder_id = ?')) {
        stmt.all.mockImplementation((folderId: string) => {
          const items = mockFolderItems.get(folderId) || [];
          return items.sort(
            (a, b) =>
              new Date(b.assigned_at).getTime() -
              new Date(a.assigned_at).getTime()
          );
        });
      }

      // SELECT f.* FROM vault_folders f INNER JOIN vault_folder_items fi (getItemFolders)
      if (sql.includes('INNER JOIN vault_folder_items fi ON f.id = fi.folder_id')) {
        stmt.all.mockImplementation((itemId: string, itemType: string) => {
          const folderIds: string[] = [];
          mockFolderItems.forEach((items, folderId) => {
            if (
              items.some((i) => i.item_id === itemId && i.item_type === itemType)
            ) {
              folderIds.push(folderId);
            }
          });
          return folderIds
            .map((id) => mockFolders.get(id))
            .filter(Boolean)
            .sort((a, b) => a!.name.localeCompare(b!.name));
        });
      }

      // SELECT 1 FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?
      if (
        sql.includes('SELECT 1 FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?')
      ) {
        stmt.get.mockImplementation(
          (folderId: string, itemId: string, itemType: string) => {
            const items = mockFolderItems.get(folderId) || [];
            return items.find(
              (i) => i.item_id === itemId && i.item_type === itemType
            )
              ? { '1': 1 }
              : undefined;
          }
        );
      }

      // UPDATE vault_folder_items SET folder_id (moveItem)
      if (sql.includes('UPDATE vault_folder_items')) {
        stmt.run.mockImplementation(
          (
            toFolderId: string,
            assignedAt: string,
            fromFolderId: string,
            itemId: string,
            itemType: string
          ) => {
            const fromItems = mockFolderItems.get(fromFolderId) || [];
            const itemIndex = fromItems.findIndex(
              (i) => i.item_id === itemId && i.item_type === itemType
            );
            if (itemIndex === -1) return { changes: 0 };

            // Remove from source
            const [item] = fromItems.splice(itemIndex, 1);
            mockFolderItems.set(fromFolderId, fromItems);

            // Add to destination
            const toItems = mockFolderItems.get(toFolderId) || [];
            toItems.push({
              ...item,
              folder_id: toFolderId,
              assigned_at: assignedAt,
            });
            mockFolderItems.set(toFolderId, toItems);

            return { changes: 1 };
          }
        );
      }

      // DELETE FROM vault_folder_items WHERE item_id = ? AND item_type = ?
      if (
        sql.includes('DELETE FROM vault_folder_items WHERE item_id = ? AND item_type = ?')
      ) {
        stmt.run.mockImplementation((itemId: string, itemType: string) => {
          let totalChanges = 0;
          mockFolderItems.forEach((items, folderId) => {
            const newItems = items.filter(
              (i) => !(i.item_id === itemId && i.item_type === itemType)
            );
            if (newItems.length !== items.length) {
              totalChanges += items.length - newItems.length;
              mockFolderItems.set(folderId, newItems);
            }
          });
          return { changes: totalChanges };
        });
      }

      // UPDATE vault_folders SET item_count (updateFolderItemCount - private method)
      if (sql.includes('UPDATE vault_folders') && sql.includes('item_count')) {
        stmt.run.mockImplementation(
          (folderId: string, updatedAt: string, id: string) => {
            const folder = mockFolders.get(id);
            if (folder) {
              const items = mockFolderItems.get(id) || [];
              folder.item_count = items.length;
              folder.updated_at = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }
        );
      }

      return stmt;
    }),
  };
};

// Mock the SQLite service
jest.mock('@/services/persistence', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(() => {
      mockInitialized = true;
    }),
    getDatabase: jest.fn(() => mockDatabase),
    isInitialized: jest.fn(() => mockInitialized),
  })),
}));

// =============================================================================
// Import after mocks are set up
// =============================================================================

import {
  VaultFolderRepository,
  getVaultFolderRepository,
  resetVaultFolderRepository,
} from '@/services/vault/VaultFolderRepository';

// =============================================================================
// Tests
// =============================================================================

describe('VaultFolderRepository', () => {
  let repository: VaultFolderRepository;

  beforeEach(() => {
    // Reset all state
    setupMockDatabase();
    uuidCounter = 0;
    mockRandomUUID.mockClear();
    resetVaultFolderRepository();
    repository = new VaultFolderRepository();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should initialize the repository and create tables', async () => {
      await repository.initialize();

      expect(mockDatabase.exec).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const execCall = mockDatabase.exec.mock.calls[0][0] as string;
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS vault_folders');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS vault_folder_items');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS');
    });

    it('should only initialize once', async () => {
      await repository.initialize();
      await repository.initialize();

      // exec should only be called once for table creation
      expect(mockDatabase.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Folder CRUD
  // ===========================================================================

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
        'New Name'
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
        'New description'
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
        'desc'
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
      const folder = await repository.createFolder('Shared', { isShared: true });

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

  // ===========================================================================
  // Folder Items
  // ===========================================================================

  describe('addItemToFolder', () => {
    it('should add item to folder', async () => {
      const folder = await repository.createFolder('Units');

      const result = await repository.addItemToFolder(
        folder.id,
        'unit-123',
        'unit'
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
        'unit'
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
        'unit'
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
        [folder1.id, folder2.id].sort()
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
        'unit'
      );

      expect(result).toBe(true);
    });

    it('should return false when item is not in folder', async () => {
      const folder = await repository.createFolder('Units');

      const result = await repository.isItemInFolder(
        folder.id,
        'unit-123',
        'unit'
      );

      expect(result).toBe(false);
    });

    it('should return false for wrong item type', async () => {
      const folder = await repository.createFolder('Mixed');
      await repository.addItemToFolder(folder.id, 'id-123', 'unit');

      const result = await repository.isItemInFolder(
        folder.id,
        'id-123',
        'pilot'
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
        folder2.id
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
        folder2.id
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

      const count = await repository.removeItemFromAllFolders('unit-123', 'unit');

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

      const count = await repository.removeItemFromAllFolders('unit-123', 'unit');

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

  // ===========================================================================
  // Singleton
  // ===========================================================================

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
