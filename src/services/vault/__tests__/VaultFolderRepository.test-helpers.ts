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
export let mockDatabase: MockDatabase;
let mockInitialized: boolean;

const createMockStatement = (): MockStatement => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
});

type MockMutationResult = { changes: number };
type InsertFolderArgs = [
  id: string,
  name: string,
  description: string | null,
  parentId: string | null,
  createdAt: string,
  updatedAt: string,
  itemCount: number,
  isShared: number,
];

interface StatementConfigurer {
  readonly matches: (sql: string) => boolean;
  readonly configure: (stmt: MockStatement) => void;
}

function sortedFolders(
  rows: Iterable<IStoredVaultFolder>,
): IStoredVaultFolder[] {
  return Array.from(rows).sort((a, b) => a.name.localeCompare(b.name));
}

function folderItemMatches(
  item: IStoredFolderItem,
  itemId: string,
  itemType: string,
): boolean {
  return item.item_id === itemId && item.item_type === itemType;
}

function getFolderItems(folderId: string): IStoredFolderItem[] {
  return mockFolderItems.get(folderId) || [];
}

function updateFolder(
  id: string,
  apply: (folder: IStoredVaultFolder) => void,
): MockMutationResult {
  const folder = mockFolders.get(id);
  if (!folder) return { changes: 0 };

  apply(folder);
  return { changes: 1 };
}

function isStoredFolder(
  folder: IStoredVaultFolder | undefined,
): folder is IStoredVaultFolder {
  return folder !== undefined;
}

function configureInsertFolderStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation((...args: InsertFolderArgs) => {
    const [
      id,
      name,
      description,
      parentId,
      createdAt,
      updatedAt,
      itemCount,
      isShared,
    ] = args;
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
  });
}

function configureGetFolderByIdStatement(stmt: MockStatement): void {
  stmt.get.mockImplementation((id: string) => {
    return mockFolders.get(id) ?? undefined;
  });
}

function configureRootFoldersStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation(() => {
    return sortedFolders(
      Array.from(mockFolders.values()).filter((f) => f.parent_id === null),
    );
  });
}

function configureChildFoldersStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation((parentId: string) => {
    return sortedFolders(
      Array.from(mockFolders.values()).filter((f) => f.parent_id === parentId),
    );
  });
}

function configureAllFoldersStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation(() => sortedFolders(mockFolders.values()));
}

function configureSharedFoldersStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation(() => {
    return sortedFolders(
      Array.from(mockFolders.values()).filter((f) => f.is_shared === 1),
    );
  });
}

function configureUpdateFolderNameStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation((name: string, updatedAt: string, id: string) =>
    updateFolder(id, (folder) => {
      folder.name = name;
      folder.updated_at = updatedAt;
    }),
  );
}

function configureUpdateFolderDescriptionStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (description: string | null, updatedAt: string, id: string) =>
      updateFolder(id, (folder) => {
        folder.description = description;
        folder.updated_at = updatedAt;
      }),
  );
}

function configureMoveFolderStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (parentId: string | null, updatedAt: string, id: string) =>
      updateFolder(id, (folder) => {
        folder.parent_id = parentId;
        folder.updated_at = updatedAt;
      }),
  );
}

function configureReparentChildrenStatement(stmt: MockStatement): void {
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
    },
  );
}

function configureUpdateFolderSharedStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (isShared: number, updatedAt: string, id: string) =>
      updateFolder(id, (folder) => {
        folder.is_shared = isShared;
        folder.updated_at = updatedAt;
      }),
  );
}

function configureDeleteFolderStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation((id: string) => {
    const deleted = mockFolders.delete(id);
    mockFolderItems.delete(id);
    return { changes: deleted ? 1 : 0 };
  });
}

function configureUpsertFolderItemStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (
      folderId: string,
      itemId: string,
      itemType: string,
      assignedAt: string,
    ) => {
      const items = getFolderItems(folderId);
      const existingIndex = items.findIndex((i) =>
        folderItemMatches(i, itemId, itemType),
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
    },
  );
}

function configureDeleteFolderItemStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (folderId: string, itemId: string, itemType: string) => {
      const items = getFolderItems(folderId);
      const newItems = items.filter(
        (i) => !folderItemMatches(i, itemId, itemType),
      );
      mockFolderItems.set(folderId, newItems);
      return { changes: items.length - newItems.length };
    },
  );
}

function configureSelectFolderItemsStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation((folderId: string) => {
    return getFolderItems(folderId).sort(
      (a, b) =>
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
    );
  });
}

function configureSelectItemFoldersStatement(stmt: MockStatement): void {
  stmt.all.mockImplementation((itemId: string, itemType: string) => {
    const folderIds: string[] = [];
    mockFolderItems.forEach((items, folderId) => {
      if (items.some((i) => folderItemMatches(i, itemId, itemType))) {
        folderIds.push(folderId);
      }
    });
    return sortedFolders(
      folderIds.map((id) => mockFolders.get(id)).filter(isStoredFolder),
    );
  });
}

function configureIsItemInFolderStatement(stmt: MockStatement): void {
  stmt.get.mockImplementation(
    (folderId: string, itemId: string, itemType: string) => {
      return getFolderItems(folderId).find((i) =>
        folderItemMatches(i, itemId, itemType),
      )
        ? { '1': 1 }
        : undefined;
    },
  );
}

function configureMoveItemStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (
      toFolderId: string,
      assignedAt: string,
      fromFolderId: string,
      itemId: string,
      itemType: string,
    ) => {
      const fromItems = getFolderItems(fromFolderId);
      const itemIndex = fromItems.findIndex((i) =>
        folderItemMatches(i, itemId, itemType),
      );
      if (itemIndex === -1) return { changes: 0 };

      const [item] = fromItems.splice(itemIndex, 1);
      mockFolderItems.set(fromFolderId, fromItems);
      const toItems = getFolderItems(toFolderId);
      toItems.push({
        ...item,
        folder_id: toFolderId,
        assigned_at: assignedAt,
      });
      mockFolderItems.set(toFolderId, toItems);

      return { changes: 1 };
    },
  );
}

function configureDeleteItemFromAllFoldersStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation((itemId: string, itemType: string) => {
    let totalChanges = 0;
    mockFolderItems.forEach((items, folderId) => {
      const newItems = items.filter(
        (i) => !folderItemMatches(i, itemId, itemType),
      );
      if (newItems.length !== items.length) {
        totalChanges += items.length - newItems.length;
        mockFolderItems.set(folderId, newItems);
      }
    });
    return { changes: totalChanges };
  });
}

function configureUpdateFolderItemCountStatement(stmt: MockStatement): void {
  stmt.run.mockImplementation(
    (folderId: string, updatedAt: string, id: string) =>
      updateFolder(id, (folder) => {
        folder.item_count = getFolderItems(folderId).length;
        folder.updated_at = updatedAt;
      }),
  );
}

const statementConfigurers: readonly StatementConfigurer[] = [
  {
    matches: (sql) => sql.includes('INSERT INTO vault_folders'),
    configure: configureInsertFolderStatement,
  },
  {
    matches: (sql) => sql.includes('SELECT * FROM vault_folders WHERE id = ?'),
    configure: configureGetFolderByIdStatement,
  },
  {
    matches: (sql) => sql.includes('WHERE parent_id IS NULL'),
    configure: configureRootFoldersStatement,
  },
  {
    matches: (sql) =>
      sql.includes('WHERE parent_id = ?') &&
      !sql.includes('UPDATE') &&
      !sql.includes('IS NULL'),
    configure: configureChildFoldersStatement,
  },
  {
    matches: (sql) =>
      sql.includes('SELECT * FROM vault_folders ORDER BY name') &&
      !sql.includes('WHERE'),
    configure: configureAllFoldersStatement,
  },
  {
    matches: (sql) => sql.includes('WHERE is_shared = 1'),
    configure: configureSharedFoldersStatement,
  },
  {
    matches: (sql) => sql.includes('UPDATE vault_folders SET name'),
    configure: configureUpdateFolderNameStatement,
  },
  {
    matches: (sql) => sql.includes('UPDATE vault_folders SET description'),
    configure: configureUpdateFolderDescriptionStatement,
  },
  {
    matches: (sql) =>
      sql.includes(
        'UPDATE vault_folders SET parent_id = ? WHERE parent_id = ?',
      ),
    configure: configureReparentChildrenStatement,
  },
  {
    matches: (sql) =>
      sql.includes('UPDATE vault_folders SET parent_id') &&
      !sql.includes('WHERE parent_id'),
    configure: configureMoveFolderStatement,
  },
  {
    matches: (sql) => sql.includes('UPDATE vault_folders SET is_shared'),
    configure: configureUpdateFolderSharedStatement,
  },
  {
    matches: (sql) => sql.includes('DELETE FROM vault_folders WHERE id = ?'),
    configure: configureDeleteFolderStatement,
  },
  {
    matches: (sql) => sql.includes('INSERT OR REPLACE INTO vault_folder_items'),
    configure: configureUpsertFolderItemStatement,
  },
  {
    matches: (sql) =>
      sql.includes(
        'DELETE FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?',
      ),
    configure: configureDeleteFolderItemStatement,
  },
  {
    matches: (sql) =>
      sql.includes('SELECT * FROM vault_folder_items WHERE folder_id = ?'),
    configure: configureSelectFolderItemsStatement,
  },
  {
    matches: (sql) =>
      sql.includes('INNER JOIN vault_folder_items fi ON f.id = fi.folder_id'),
    configure: configureSelectItemFoldersStatement,
  },
  {
    matches: (sql) =>
      sql.includes(
        'SELECT 1 FROM vault_folder_items WHERE folder_id = ? AND item_id = ? AND item_type = ?',
      ),
    configure: configureIsItemInFolderStatement,
  },
  {
    matches: (sql) => sql.includes('UPDATE vault_folder_items'),
    configure: configureMoveItemStatement,
  },
  {
    matches: (sql) =>
      sql.includes(
        'DELETE FROM vault_folder_items WHERE item_id = ? AND item_type = ?',
      ),
    configure: configureDeleteItemFromAllFoldersStatement,
  },
  {
    matches: (sql) =>
      sql.includes('UPDATE vault_folders') && sql.includes('item_count'),
    configure: configureUpdateFolderItemCountStatement,
  },
];

function configureMockStatement(sql: string, stmt: MockStatement): void {
  for (const configurer of statementConfigurers) {
    if (configurer.matches(sql)) {
      configurer.configure(stmt);
      return;
    }
  }
}

// Setup mock database behavior
export const setupMockDatabase = (): void => {
  mockFolders = new Map();
  mockFolderItems = new Map();
  mockInitialized = false;

  mockDatabase = {
    exec: jest.fn(),
    prepare: jest.fn((sql: string) => {
      const stmt = createMockStatement();
      configureMockStatement(sql, stmt);
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

export {
  VaultFolderRepository,
  getVaultFolderRepository,
  resetVaultFolderRepository,
};

export function createVaultFolderRepositoryTestSubject(): VaultFolderRepository {
  setupMockDatabase();
  uuidCounter = 0;
  mockRandomUUID.mockClear();
  resetVaultFolderRepository();
  return new VaultFolderRepository();
}
