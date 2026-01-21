/**
 * Version History Repository Tests
 *
 * Comprehensive tests for the VersionHistoryRepository class
 * covering all CRUD operations and query methods.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  VersionHistoryRepository,
  getVersionHistoryRepository,
  resetVersionHistoryRepository,
} from '../VersionHistoryRepository';
import type { ShareableContentType } from '@/types/vault';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock statement results
const createMockStatement = (
  returnValue?: unknown,
  changes = 0
) => ({
  run: jest.fn().mockReturnValue({ changes }),
  get: jest.fn().mockReturnValue(returnValue),
  all: jest.fn().mockReturnValue(returnValue ?? []),
});

// Mock database object
const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn(),
};

// Mock SQLite service
const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDb),
};

// Mock the persistence module
jest.mock('@/services/persistence', () => ({
  getSQLiteService: () => mockSQLiteService,
}));

// =============================================================================
// Test Data
// =============================================================================

const TEST_CONTENT_TYPE: ShareableContentType = 'unit';
const TEST_ITEM_ID = 'unit-atlas-1';
const TEST_CONTENT = JSON.stringify({
  name: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
});
const TEST_CONTENT_HASH = 'abc123hash';
const TEST_CREATED_BY = 'local';
const TEST_MESSAGE = 'Initial save';

// =============================================================================
// Tests
// =============================================================================

describe('VersionHistoryRepository', () => {
  let repository: VersionHistoryRepository;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    resetVersionHistoryRepository();

    // Create fresh repository instance
    repository = new VersionHistoryRepository();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should create tables on first initialization', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS version_history')
      );
    });

    it('should create required indexes', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_version_history_item')
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_version_history_version')
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_version_history_created')
      );
    });

    it('should only initialize once (idempotent)', async () => {
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      // exec should only be called once for table creation
      expect(mockDb.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // saveVersion
  // ===========================================================================

  describe('saveVersion', () => {
    beforeEach(() => {
      // Mock MAX(version) query - no existing versions
      const maxVersionStmt = createMockStatement({ max_version: null });
      // Mock INSERT statement
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

    it('should save a new version with version number 1 for first version', async () => {
      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ver-/);
      expect(result.contentType).toBe(TEST_CONTENT_TYPE);
      expect(result.itemId).toBe(TEST_ITEM_ID);
      expect(result.version).toBe(1);
      expect(result.content).toBe(TEST_CONTENT);
      expect(result.contentHash).toBe(TEST_CONTENT_HASH);
      expect(result.createdBy).toBe(TEST_CREATED_BY);
      expect(result.message).toBeNull();
      expect(result.sizeBytes).toBe(new TextEncoder().encode(TEST_CONTENT).length);
    });

    it('should save version with optional message', async () => {
      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY,
        TEST_MESSAGE
      );

      expect(result.message).toBe(TEST_MESSAGE);
    });

    it('should increment version number for existing versions', async () => {
      // Mock MAX(version) query - existing version 2
      const maxVersionStmt = createMockStatement({ max_version: 2 });
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

      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY
      );

      expect(result.version).toBe(3);
    });

    it('should calculate size in bytes correctly for unicode content', async () => {
      const unicodeContent = JSON.stringify({ name: '????????????', emoji: '????????????' });
      
      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        unicodeContent,
        'hash123',
        TEST_CREATED_BY
      );

      expect(result.sizeBytes).toBe(new TextEncoder().encode(unicodeContent).length);
    });

    it('should set createdAt to current ISO timestamp', async () => {
      const beforeSave = new Date().toISOString();
      
      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY
      );

      const afterSave = new Date().toISOString();
      expect(result.createdAt >= beforeSave).toBe(true);
      expect(result.createdAt <= afterSave).toBe(true);
    });
  });

  // ===========================================================================
  // getVersions
  // ===========================================================================

  describe('getVersions', () => {
    it('should return versions sorted by version number descending (newest first)', async () => {
      const mockRows = [
        {
          id: 'ver-3',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 3,
          content_hash: 'hash3',
          content: '{"v":3}',
          created_at: '2024-01-03T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
        {
          id: 'ver-2',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 2,
          content_hash: 'hash2',
          content: '{"v":2}',
          created_at: '2024-01-02T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
        {
          id: 'ver-1',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 1,
          content_hash: 'hash1',
          content: '{"v":1}',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
      ];

      mockDb.prepare.mockReturnValue(createMockStatement(mockRows));

      const versions = await repository.getVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    it('should respect limit parameter', async () => {
      const mockRows = [
        {
          id: 'ver-3',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 3,
          content_hash: 'hash3',
          content: '{"v":3}',
          created_at: '2024-01-03T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
        {
          id: 'ver-2',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 2,
          content_hash: 'hash2',
          content: '{"v":2}',
          created_at: '2024-01-02T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
      ];

      const stmt = createMockStatement(mockRows);
      mockDb.prepare.mockReturnValue(stmt);

      await repository.getVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE, 2);

      expect(stmt.all).toHaveBeenCalledWith(TEST_ITEM_ID, TEST_CONTENT_TYPE, 2);
    });

    it('should use default limit of 50', async () => {
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      await repository.getVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(stmt.all).toHaveBeenCalledWith(TEST_ITEM_ID, TEST_CONTENT_TYPE, 50);
    });

    it('should return empty array when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement([]));

      const versions = await repository.getVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(versions).toEqual([]);
    });

    it('should convert database row format to IVersionSnapshot', async () => {
      const mockRow = {
        id: 'ver-1',
        content_type: 'unit',
        item_id: TEST_ITEM_ID,
        version: 1,
        content_hash: 'hash1',
        content: TEST_CONTENT,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'local',
        message: 'Test message',
        size_bytes: 50,
      };

      mockDb.prepare.mockReturnValue(createMockStatement([mockRow]));

      const versions = await repository.getVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(versions[0]).toEqual({
        id: 'ver-1',
        contentType: 'unit',
        itemId: TEST_ITEM_ID,
        version: 1,
        contentHash: 'hash1',
        content: TEST_CONTENT,
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'local',
        message: 'Test message',
        sizeBytes: 50,
      });
    });
  });

  // ===========================================================================
  // getVersion
  // ===========================================================================

  describe('getVersion', () => {
    it('should return specific version when it exists', async () => {
      const mockRow = {
        id: 'ver-2',
        content_type: 'unit',
        item_id: TEST_ITEM_ID,
        version: 2,
        content_hash: 'hash2',
        content: '{"v":2}',
        created_at: '2024-01-02T00:00:00Z',
        created_by: 'local',
        message: null,
        size_bytes: 10,
      };

      const stmt = createMockStatement(mockRow);
      mockDb.prepare.mockReturnValue(stmt);

      const version = await repository.getVersion(TEST_ITEM_ID, TEST_CONTENT_TYPE, 2);

      expect(version).toBeDefined();
      expect(version?.version).toBe(2);
      expect(stmt.get).toHaveBeenCalledWith(TEST_ITEM_ID, TEST_CONTENT_TYPE, 2);
    });

    it('should return null when version does not exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const version = await repository.getVersion(TEST_ITEM_ID, TEST_CONTENT_TYPE, 999);

      expect(version).toBeNull();
    });
  });

  // ===========================================================================
  // getLatestVersion
  // ===========================================================================

  describe('getLatestVersion', () => {
    it('should return the highest version number', async () => {
      const mockRow = {
        id: 'ver-5',
        content_type: 'unit',
        item_id: TEST_ITEM_ID,
        version: 5,
        content_hash: 'hash5',
        content: '{"v":5}',
        created_at: '2024-01-05T00:00:00Z',
        created_by: 'local',
        message: 'Latest',
        size_bytes: 10,
      };

      mockDb.prepare.mockReturnValue(createMockStatement(mockRow));

      const latest = await repository.getLatestVersion(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(latest).toBeDefined();
      expect(latest?.version).toBe(5);
      expect(latest?.message).toBe('Latest');
    });

    it('should return null when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const latest = await repository.getLatestVersion(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(latest).toBeNull();
    });
  });

  // ===========================================================================
  // getVersionById
  // ===========================================================================

  describe('getVersionById', () => {
    it('should return version when found by ID', async () => {
      const mockRow = {
        id: 'ver-abc123',
        content_type: 'pilot',
        item_id: 'pilot-1',
        version: 3,
        content_hash: 'hashxyz',
        content: '{"name":"Kerensky"}',
        created_at: '2024-01-15T00:00:00Z',
        created_by: 'sync-peer-1',
        message: 'Synced from peer',
        size_bytes: 25,
      };

      mockDb.prepare.mockReturnValue(createMockStatement(mockRow));

      const version = await repository.getVersionById('ver-abc123');

      expect(version).toBeDefined();
      expect(version?.id).toBe('ver-abc123');
      expect(version?.contentType).toBe('pilot');
    });

    it('should return null when ID not found', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const version = await repository.getVersionById('non-existent-id');

      expect(version).toBeNull();
    });
  });

  // ===========================================================================
  // getCurrentVersionNumber
  // ===========================================================================

  describe('getCurrentVersionNumber', () => {
    it('should return current max version number', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ max_version: 7 }));

      const versionNum = await repository.getCurrentVersionNumber(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(versionNum).toBe(7);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ max_version: null }));

      const versionNum = await repository.getCurrentVersionNumber(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(versionNum).toBe(0);
    });
  });

  // ===========================================================================
  // getVersionCount
  // ===========================================================================

  describe('getVersionCount', () => {
    it('should return count of versions for item', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ count: 12 }));

      const count = await repository.getVersionCount(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(count).toBe(12);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ count: 0 }));

      const count = await repository.getVersionCount(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // getStorageUsed
  // ===========================================================================

  describe('getStorageUsed', () => {
    it('should return total storage in bytes', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ total: 15000 }));

      const storage = await repository.getStorageUsed(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(storage).toBe(15000);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ total: null }));

      const storage = await repository.getStorageUsed(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(storage).toBe(0);
    });
  });

  // ===========================================================================
  // getVersionRange
  // ===========================================================================

  describe('getVersionRange', () => {
    it('should return versions within specified range', async () => {
      const mockRows = [
        {
          id: 'ver-3',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 3,
          content_hash: 'hash3',
          content: '{"v":3}',
          created_at: '2024-01-03T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
        {
          id: 'ver-4',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 4,
          content_hash: 'hash4',
          content: '{"v":4}',
          created_at: '2024-01-04T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
        {
          id: 'ver-5',
          content_type: 'unit',
          item_id: TEST_ITEM_ID,
          version: 5,
          content_hash: 'hash5',
          content: '{"v":5}',
          created_at: '2024-01-05T00:00:00Z',
          created_by: 'local',
          message: null,
          size_bytes: 10,
        },
      ];

      const stmt = createMockStatement(mockRows);
      mockDb.prepare.mockReturnValue(stmt);

      const versions = await repository.getVersionRange(TEST_ITEM_ID, TEST_CONTENT_TYPE, 3, 5);

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3); // Ascending order
      expect(versions[2].version).toBe(5);
      expect(stmt.all).toHaveBeenCalledWith(TEST_ITEM_ID, TEST_CONTENT_TYPE, 3, 5);
    });

    it('should return empty array when no versions in range', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement([]));

      const versions = await repository.getVersionRange(TEST_ITEM_ID, TEST_CONTENT_TYPE, 100, 200);

      expect(versions).toEqual([]);
    });
  });

  // ===========================================================================
  // deleteVersion
  // ===========================================================================

  describe('deleteVersion', () => {
    it('should return true when version is deleted', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 1));

      const result = await repository.deleteVersion('ver-123');

      expect(result).toBe(true);
    });

    it('should return false when version does not exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 0));

      const result = await repository.deleteVersion('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // deleteAllVersions
  // ===========================================================================

  describe('deleteAllVersions', () => {
    it('should return count of deleted versions', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 5));

      const count = await repository.deleteAllVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE);

      expect(count).toBe(5);
    });

    it('should return 0 when no versions to delete', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 0));

      const count = await repository.deleteAllVersions('no-such-item', TEST_CONTENT_TYPE);

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // pruneOldVersions
  // ===========================================================================

  describe('pruneOldVersions', () => {
    it('should delete versions older than keepCount', async () => {
      // First call gets cutoff version
      const cutoffStmt = createMockStatement({ version: 3 });
      // Second call deletes old versions
      const deleteStmt = createMockStatement(undefined, 2);

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('OFFSET')) {
          return cutoffStmt;
        }
        if (sql.includes('DELETE')) {
          return deleteStmt;
        }
        return createMockStatement();
      });

      const deleted = await repository.pruneOldVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE, 3);

      expect(deleted).toBe(2);
    });

    it('should return 0 when not enough versions to prune', async () => {
      // No cutoff row found (fewer versions than keepCount)
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const deleted = await repository.pruneOldVersions(TEST_ITEM_ID, TEST_CONTENT_TYPE, 10);

      expect(deleted).toBe(0);
    });
  });

  // ===========================================================================
  // pruneByDate
  // ===========================================================================

  describe('pruneByDate', () => {
    it('should delete versions older than specified date', async () => {
      const stmt = createMockStatement(undefined, 15);
      mockDb.prepare.mockReturnValue(stmt);

      const deleted = await repository.pruneByDate('2023-01-01T00:00:00Z');

      expect(deleted).toBe(15);
      expect(stmt.run).toHaveBeenCalledWith('2023-01-01T00:00:00Z');
    });

    it('should return 0 when no old versions', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 0));

      const deleted = await repository.pruneByDate('2020-01-01T00:00:00Z');

      expect(deleted).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton Functions
  // ===========================================================================

  describe('Singleton Functions', () => {
    beforeEach(() => {
      resetVersionHistoryRepository();
    });

    it('getVersionHistoryRepository should return singleton instance', () => {
      const instance1 = getVersionHistoryRepository();
      const instance2 = getVersionHistoryRepository();

      expect(instance1).toBe(instance2);
    });

    it('resetVersionHistoryRepository should clear singleton', () => {
      const instance1 = getVersionHistoryRepository();
      resetVersionHistoryRepository();
      const instance2 = getVersionHistoryRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Content Type Isolation
  // ===========================================================================

  describe('Content Type Isolation', () => {
    it('should isolate versions by content type', async () => {
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      await repository.getVersions('item-1', 'unit');
      await repository.getVersions('item-1', 'pilot');

      // Verify different content types are queried separately
      expect(stmt.all).toHaveBeenNthCalledWith(1, 'item-1', 'unit', 50);
      expect(stmt.all).toHaveBeenNthCalledWith(2, 'item-1', 'pilot', 50);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const maxVersionStmt = createMockStatement({ max_version: null });
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

      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        '',
        'empty-hash',
        TEST_CREATED_BY
      );

      expect(result.content).toBe('');
      expect(result.sizeBytes).toBe(0);
    });

    it('should handle very long content', async () => {
      const longContent = 'x'.repeat(1000000); // 1MB of data

      const maxVersionStmt = createMockStatement({ max_version: null });
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

      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        longContent,
        'long-hash',
        TEST_CREATED_BY
      );

      expect(result.sizeBytes).toBe(1000000);
    });

    it('should handle special characters in item ID', async () => {
      const specialItemId = 'item-with-special!@#$%^&*()_+';
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      await repository.getVersions(specialItemId, TEST_CONTENT_TYPE);

      expect(stmt.all).toHaveBeenCalledWith(specialItemId, TEST_CONTENT_TYPE, 50);
    });

    it('should handle all shareable content types', async () => {
      const contentTypes: ShareableContentType[] = ['unit', 'pilot', 'force', 'encounter'];
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      for (const contentType of contentTypes) {
        await repository.getVersions('item-1', contentType);
      }

      expect(stmt.all).toHaveBeenCalledTimes(4);
    });
  });
});
