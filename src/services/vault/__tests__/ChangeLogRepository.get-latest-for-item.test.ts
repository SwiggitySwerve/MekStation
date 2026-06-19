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
});
