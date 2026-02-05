/**
 * Change Log Repository Tests
 *
 * Comprehensive tests for the ChangeLogRepository class covering
 * all CRUD operations, conflict management, and query methods.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IStoredChangeLogEntry,
  ChangeType,
  ShareableContentType,
} from '@/types/vault';

import {
  ChangeLogRepository,
  getChangeLogRepository,
  resetChangeLogRepository,
} from '../ChangeLogRepository';

// =============================================================================
// Mock Setup
// =============================================================================

interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

const createMockStatement = (
  returnValue?: unknown,
  changes = 0,
): MockStatement => ({
  run: jest.fn().mockReturnValue({ changes }),
  get: jest.fn().mockReturnValue(returnValue),
  all: jest.fn().mockReturnValue(returnValue ?? []),
});

const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn(),
};

const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDb),
};

jest.mock('@/services/persistence', () => ({
  getSQLiteService: () => mockSQLiteService,
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn().mockReturnValue(mockUUID),
  },
});

// =============================================================================
// Test Data Helpers
// =============================================================================

const createMockStoredEntry = (
  overrides: Partial<IStoredChangeLogEntry> = {},
): IStoredChangeLogEntry => ({
  id: 'change-test-123',
  change_type: 'create',
  content_type: 'unit',
  item_id: 'unit-atlas-1',
  timestamp: '2024-01-01T00:00:00.000Z',
  version: 1,
  content_hash: 'hash123',
  data: '{"name":"Atlas"}',
  synced: 0,
  source_id: null,
  ...overrides,
});

const createMockConflictRow = (
  overrides: Partial<{
    id: string;
    content_type: ShareableContentType | 'folder';
    item_id: string;
    item_name: string;
    local_version: number;
    local_hash: string;
    remote_version: number;
    remote_hash: string;
    remote_peer_id: string;
    detected_at: string;
    resolution: 'pending' | 'local' | 'remote' | 'merged' | 'forked';
  }> = {},
) => ({
  id: 'conflict-test-123',
  content_type: 'unit' as ShareableContentType | 'folder',
  item_id: 'unit-atlas-1',
  item_name: 'Atlas AS7-D',
  local_version: 1,
  local_hash: 'localhash123',
  remote_version: 2,
  remote_hash: 'remotehash456',
  remote_peer_id: 'PEER-1234',
  detected_at: '2024-01-15T10:00:00.000Z',
  resolution: 'pending' as const,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('ChangeLogRepository', () => {
  let repository: ChangeLogRepository;
  let mockStatement: MockStatement;

  beforeEach(() => {
    jest.clearAllMocks();
    resetChangeLogRepository();
    repository = new ChangeLogRepository();

    mockStatement = createMockStatement();
    mockDb.prepare.mockReturnValue(mockStatement);
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should create change log and conflict tables on first call', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS vault_change_log'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE TABLE IF NOT EXISTS vault_sync_conflicts',
        ),
      );
    });

    it('should create required indexes for change log', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_change_log_item',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_change_log_version',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_change_log_synced',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_change_log_timestamp',
        ),
      );
    });

    it('should create required indexes for sync conflicts', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_sync_conflicts_item',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_sync_conflicts_resolution',
        ),
      );
    });

    it('should only initialize once', async () => {
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalledTimes(1);
      expect(mockDb.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Record Change
  // ===========================================================================

  describe('recordChange', () => {
    beforeEach(() => {
      const maxVersionStmt = createMockStatement({ max: null });
      const insertStmt = createMockStatement(undefined, 1);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('MAX(version)')) {
          return maxVersionStmt;
        }
        if (sql.includes('INSERT INTO')) {
          return insertStmt;
        }
        return createMockStatement();
      });
    });

    it('should record a local change with version 1 for first entry', async () => {
      const result = await repository.recordChange(
        'create',
        'unit',
        'unit-123',
        'hash123',
        '{"name":"Atlas"}',
      );

      expect(result.id).toBe(`change-${mockUUID}`);
      expect(result.changeType).toBe('create');
      expect(result.contentType).toBe('unit');
      expect(result.itemId).toBe('unit-123');
      expect(result.version).toBe(1);
      expect(result.contentHash).toBe('hash123');
      expect(result.data).toBe('{"name":"Atlas"}');
      expect(result.synced).toBe(false);
      expect(result.sourceId).toBeNull();
    });

    it('should increment version number for subsequent entries', async () => {
      const maxVersionStmt = createMockStatement({ max: 5 });
      const insertStmt = createMockStatement(undefined, 1);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('MAX(version)')) {
          return maxVersionStmt;
        }
        if (sql.includes('INSERT INTO')) {
          return insertStmt;
        }
        return createMockStatement();
      });

      const result = await repository.recordChange(
        'update',
        'unit',
        'unit-123',
        'hash456',
        '{"name":"Updated"}',
      );

      expect(result.version).toBe(6);
    });

    it('should mark remote changes as synced', async () => {
      const result = await repository.recordChange(
        'create',
        'unit',
        'unit-123',
        'hash123',
        '{"name":"Atlas"}',
        'PEER-1234',
      );

      expect(result.synced).toBe(true);
      expect(result.sourceId).toBe('PEER-1234');
    });

    it('should handle null contentHash for delete operations', async () => {
      const result = await repository.recordChange(
        'delete',
        'unit',
        'unit-123',
        null,
        null,
      );

      expect(result.changeType).toBe('delete');
      expect(result.contentHash).toBeNull();
      expect(result.data).toBeNull();
    });

    it('should record changes for all content types', async () => {
      const contentTypes: Array<ShareableContentType | 'folder'> = [
        'unit',
        'pilot',
        'force',
        'encounter',
        'folder',
      ];

      for (const contentType of contentTypes) {
        const result = await repository.recordChange(
          'create',
          contentType,
          `${contentType}-123`,
          'hash',
          '{}',
        );
        expect(result.contentType).toBe(contentType);
      }
    });

    it('should record all change types', async () => {
      const changeTypes: ChangeType[] = ['create', 'update', 'delete', 'move'];

      for (const changeType of changeTypes) {
        const result = await repository.recordChange(
          changeType,
          'unit',
          'unit-123',
          changeType === 'delete' ? null : 'hash',
          changeType === 'delete' ? null : '{}',
        );
        expect(result.changeType).toBe(changeType);
      }
    });

    it('should set timestamp to current ISO date', async () => {
      const beforeRecord = new Date().toISOString();

      const result = await repository.recordChange(
        'create',
        'unit',
        'unit-123',
        'hash',
        '{}',
      );

      const afterRecord = new Date().toISOString();
      expect(result.timestamp >= beforeRecord).toBe(true);
      expect(result.timestamp <= afterRecord).toBe(true);
    });
  });

  // ===========================================================================
  // Get Unsynced
  // ===========================================================================

  describe('getUnsynced', () => {
    it('should return all unsynced changes', async () => {
      const unsyncedEntries = [
        createMockStoredEntry({ id: 'c1', version: 1, synced: 0 }),
        createMockStoredEntry({ id: 'c2', version: 2, synced: 0 }),
      ];
      mockStatement.all.mockReturnValue(unsyncedEntries);

      const result = await repository.getUnsynced();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_change_log WHERE synced = 0 ORDER BY version ASC',
      );
      expect(result).toHaveLength(2);
      expect(result.every((e) => !e.synced)).toBe(true);
    });

    it('should return empty array when no unsynced changes', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getUnsynced();

      expect(result).toEqual([]);
    });

    it('should convert stored format to IChangeLogEntry', async () => {
      const storedEntry = createMockStoredEntry({
        synced: 1,
        source_id: 'PEER-123',
      });
      mockStatement.all.mockReturnValue([storedEntry]);

      const result = await repository.getUnsynced();

      expect(result[0].changeType).toBe('create');
      expect(result[0].contentType).toBe('unit');
      expect(result[0].synced).toBe(true);
      expect(result[0].sourceId).toBe('PEER-123');
    });
  });

  // ===========================================================================
  // Get Changes Since
  // ===========================================================================

  describe('getChangesSince', () => {
    it('should return changes after specified version', async () => {
      const changes = [
        createMockStoredEntry({ id: 'c6', version: 6 }),
        createMockStoredEntry({ id: 'c7', version: 7 }),
      ];
      mockStatement.all.mockReturnValue(changes);

      const result = await repository.getChangesSince(5);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_change_log WHERE version > ? ORDER BY version ASC LIMIT ?',
      );
      expect(mockStatement.all).toHaveBeenCalledWith(5, 100);
      expect(result).toHaveLength(2);
    });

    it('should respect custom limit', async () => {
      mockStatement.all.mockReturnValue([]);

      await repository.getChangesSince(5, 50);

      expect(mockStatement.all).toHaveBeenCalledWith(5, 50);
    });

    it('should use default limit of 100', async () => {
      mockStatement.all.mockReturnValue([]);

      await repository.getChangesSince(0);

      expect(mockStatement.all).toHaveBeenCalledWith(0, 100);
    });

    it('should return empty array when no changes after version', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getChangesSince(999);

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Get Latest For Item
  // ===========================================================================

  describe('getLatestForItem', () => {
    it('should return latest change for item', async () => {
      const latestEntry = createMockStoredEntry({ version: 10 });
      mockStatement.get.mockReturnValue(latestEntry);

      const result = await repository.getLatestForItem('unit-123', 'unit');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE item_id = ? AND content_type = ?'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version DESC LIMIT 1'),
      );
      expect(mockStatement.get).toHaveBeenCalledWith('unit-123', 'unit');
      expect(result?.version).toBe(10);
    });

    it('should return null when no changes for item', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getLatestForItem('non-existent', 'unit');

      expect(result).toBeNull();
    });

    it('should work with folder content type', async () => {
      const folderEntry = createMockStoredEntry({
        content_type: 'folder',
        item_id: 'folder-123',
      });
      mockStatement.get.mockReturnValue(folderEntry);

      const result = await repository.getLatestForItem('folder-123', 'folder');

      expect(result?.contentType).toBe('folder');
    });
  });

  // ===========================================================================
  // Get Current Version
  // ===========================================================================

  describe('getCurrentVersion', () => {
    it('should return current max version', async () => {
      mockStatement.get.mockReturnValue({ max: 42 });

      const result = await repository.getCurrentVersion();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT MAX(version) as max FROM vault_change_log',
      );
      expect(result).toBe(42);
    });

    it('should return 0 when no changes exist', async () => {
      mockStatement.get.mockReturnValue({ max: null });

      const result = await repository.getCurrentVersion();

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // Mark Synced
  // ===========================================================================

  describe('markSynced', () => {
    it('should mark multiple changes as synced', async () => {
      mockStatement.run.mockReturnValue({ changes: 3 });

      const result = await repository.markSynced(['c1', 'c2', 'c3']);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_change_log SET synced = 1 WHERE id IN (?,?,?)',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('c1', 'c2', 'c3');
      expect(result).toBe(3);
    });

    it('should return 0 for empty array', async () => {
      const result = await repository.markSynced([]);

      expect(result).toBe(0);
      expect(mockDb.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
      );
    });

    it('should handle single change ID', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.markSynced(['c1']);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_change_log SET synced = 1 WHERE id IN (?)',
      );
      expect(result).toBe(1);
    });
  });

  // ===========================================================================
  // Get History For Item
  // ===========================================================================

  describe('getHistoryForItem', () => {
    it('should return all changes for an item in ascending order', async () => {
      const history = [
        createMockStoredEntry({ version: 1 }),
        createMockStoredEntry({ version: 2 }),
        createMockStoredEntry({ version: 3 }),
      ];
      mockStatement.all.mockReturnValue(history);

      const result = await repository.getHistoryForItem('unit-123', 'unit');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE item_id = ? AND content_type = ?'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version ASC'),
      );
      expect(result).toHaveLength(3);
    });

    it('should return empty array for non-existent item', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getHistoryForItem('non-existent', 'unit');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Prune Old Changes
  // ===========================================================================

  describe('pruneOldChanges', () => {
    it('should delete old synced changes keeping specified count', async () => {
      mockStatement.run.mockReturnValue({ changes: 50 });

      const result = await repository.pruneOldChanges(1000);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM vault_change_log'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE synced = 1'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(1000);
      expect(result).toBe(50);
    });

    it('should use default keepCount of 1000', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      await repository.pruneOldChanges();

      expect(mockStatement.run).toHaveBeenCalledWith(1000);
    });

    it('should return 0 when nothing to prune', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.pruneOldChanges(1000);

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // Record Conflict
  // ===========================================================================

  describe('recordConflict', () => {
    it('should record a sync conflict', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const conflictData = {
        contentType: 'unit' as const,
        itemId: 'unit-123',
        itemName: 'Atlas AS7-D',
        localVersion: 3,
        localHash: 'localhash',
        remoteVersion: 4,
        remoteHash: 'remotehash',
        remotePeerId: 'PEER-456',
      };

      const result = await repository.recordConflict(conflictData);

      expect(result).toBe(`conflict-${mockUUID}`);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vault_sync_conflicts'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        `conflict-${mockUUID}`,
        'unit',
        'unit-123',
        'Atlas AS7-D',
        3,
        'localhash',
        4,
        'remotehash',
        'PEER-456',
        expect.any(String), // detectedAt
      );
    });

    it('should record conflict for folder content type', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.recordConflict({
        contentType: 'folder',
        itemId: 'folder-123',
        itemName: 'My Folder',
        localVersion: 1,
        localHash: 'hash1',
        remoteVersion: 2,
        remoteHash: 'hash2',
        remotePeerId: 'PEER-789',
      });

      expect(result).toBe(`conflict-${mockUUID}`);
    });
  });

  // ===========================================================================
  // Get Pending Conflicts
  // ===========================================================================

  describe('getPendingConflicts', () => {
    it('should return all pending conflicts', async () => {
      const pendingConflicts = [
        createMockConflictRow({ id: 'conflict-1' }),
        createMockConflictRow({ id: 'conflict-2' }),
      ];
      mockStatement.all.mockReturnValue(pendingConflicts);

      const result = await repository.getPendingConflicts();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM vault_sync_conflicts WHERE resolution = 'pending' ORDER BY detected_at DESC",
      );
      expect(result).toHaveLength(2);
    });

    it('should convert stored format to camelCase', async () => {
      const storedConflict = createMockConflictRow();
      mockStatement.all.mockReturnValue([storedConflict]);

      const result = await repository.getPendingConflicts();

      expect(result[0]).toEqual({
        id: 'conflict-test-123',
        contentType: 'unit',
        itemId: 'unit-atlas-1',
        itemName: 'Atlas AS7-D',
        localVersion: 1,
        localHash: 'localhash123',
        remoteVersion: 2,
        remoteHash: 'remotehash456',
        remotePeerId: 'PEER-1234',
        detectedAt: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should return empty array when no pending conflicts', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getPendingConflicts();

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Resolve Conflict
  // ===========================================================================

  describe('resolveConflict', () => {
    it('should update conflict resolution to local', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.resolveConflict('conflict-123', 'local');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_sync_conflicts SET resolution = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('local', 'conflict-123');
      expect(result).toBe(true);
    });

    it('should update conflict resolution to remote', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.resolveConflict('conflict-123', 'remote');

      expect(mockStatement.run).toHaveBeenCalledWith('remote', 'conflict-123');
      expect(result).toBe(true);
    });

    it('should update conflict resolution to merged', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.resolveConflict('conflict-123', 'merged');

      expect(mockStatement.run).toHaveBeenCalledWith('merged', 'conflict-123');
      expect(result).toBe(true);
    });

    it('should update conflict resolution to forked', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.resolveConflict('conflict-123', 'forked');

      expect(mockStatement.run).toHaveBeenCalledWith('forked', 'conflict-123');
      expect(result).toBe(true);
    });

    it('should return false when conflict not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.resolveConflict('non-existent', 'local');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Singleton Functions
  // ===========================================================================

  describe('Singleton Functions', () => {
    beforeEach(() => {
      resetChangeLogRepository();
    });

    it('getChangeLogRepository should return singleton instance', () => {
      const instance1 = getChangeLogRepository();
      const instance2 = getChangeLogRepository();

      expect(instance1).toBe(instance2);
    });

    it('resetChangeLogRepository should clear singleton', () => {
      const instance1 = getChangeLogRepository();
      resetChangeLogRepository();
      const instance2 = getChangeLogRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Row Conversion
  // ===========================================================================

  describe('rowToEntry conversion', () => {
    it('should correctly map all stored fields', async () => {
      const storedEntry: IStoredChangeLogEntry = {
        id: 'change-full',
        change_type: 'update',
        content_type: 'pilot',
        item_id: 'pilot-kerensky',
        timestamp: '2024-06-15T12:00:00.000Z',
        version: 42,
        content_hash: 'fullhash123',
        data: '{"name":"Kerensky","skill":2}',
        synced: 1,
        source_id: 'PEER-REMOTE',
      };
      mockStatement.all.mockReturnValue([storedEntry]);

      const result = await repository.getUnsynced();

      expect(result[0]).toEqual({
        id: 'change-full',
        changeType: 'update',
        contentType: 'pilot',
        itemId: 'pilot-kerensky',
        timestamp: '2024-06-15T12:00:00.000Z',
        version: 42,
        contentHash: 'fullhash123',
        data: '{"name":"Kerensky","skill":2}',
        synced: true,
        sourceId: 'PEER-REMOTE',
      });
    });

    it('should handle null values correctly', async () => {
      const storedEntry: IStoredChangeLogEntry = {
        id: 'change-null',
        change_type: 'delete',
        content_type: 'unit',
        item_id: 'unit-deleted',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: 1,
        content_hash: null,
        data: null,
        synced: 0,
        source_id: null,
      };
      mockStatement.all.mockReturnValue([storedEntry]);

      const result = await repository.getUnsynced();

      expect(result[0].contentHash).toBeNull();
      expect(result[0].data).toBeNull();
      expect(result[0].synced).toBe(false);
      expect(result[0].sourceId).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty data string', async () => {
      const maxVersionStmt = createMockStatement({ max: 0 });
      const insertStmt = createMockStatement(undefined, 1);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('MAX(version)')) {
          return maxVersionStmt;
        }
        if (sql.includes('INSERT INTO')) {
          return insertStmt;
        }
        return createMockStatement();
      });

      const result = await repository.recordChange(
        'create',
        'unit',
        'unit-123',
        'hash',
        '',
      );

      expect(result.data).toBe('');
    });

    it('should handle very large version numbers', async () => {
      const maxVersionStmt = createMockStatement({ max: 999999 });
      const insertStmt = createMockStatement(undefined, 1);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('MAX(version)')) {
          return maxVersionStmt;
        }
        if (sql.includes('INSERT INTO')) {
          return insertStmt;
        }
        return createMockStatement();
      });

      const result = await repository.recordChange(
        'update',
        'unit',
        'unit-123',
        'hash',
        '{}',
      );

      expect(result.version).toBe(1000000);
    });

    it('should handle special characters in item ID', async () => {
      const specialItemId = 'item-with-special!@#$%^&*()_+';
      const entry = createMockStoredEntry({ item_id: specialItemId });
      mockStatement.get.mockReturnValue(entry);

      const result = await repository.getLatestForItem(specialItemId, 'unit');

      expect(result?.itemId).toBe(specialItemId);
    });

    it('should handle unicode content in data', async () => {
      const maxVersionStmt = createMockStatement({ max: 0 });
      const insertStmt = createMockStatement(undefined, 1);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('MAX(version)')) {
          return maxVersionStmt;
        }
        if (sql.includes('INSERT INTO')) {
          return insertStmt;
        }
        return createMockStatement();
      });

      const unicodeData = '{"name":"?????????"}';

      const result = await repository.recordChange(
        'create',
        'unit',
        'unit-123',
        'hash',
        unicodeData,
      );

      expect(result.data).toBe(unicodeData);
    });
  });
});
