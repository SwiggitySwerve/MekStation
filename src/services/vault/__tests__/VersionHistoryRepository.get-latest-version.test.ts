/**
 * Version History Repository Tests
 *
 * Comprehensive tests for the VersionHistoryRepository class
 * covering all CRUD operations and query methods.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ShareableContentType } from '@/types/vault';

import {
  VersionHistoryRepository,
  getVersionHistoryRepository,
  resetVersionHistoryRepository,
} from '../VersionHistoryRepository';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock statement results
const createMockStatement = (returnValue?: unknown, changes = 0) => ({
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

      const latest = await repository.getLatestVersion(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(latest).toBeDefined();
      expect(latest?.version).toBe(5);
      expect(latest?.message).toBe('Latest');
    });

    it('should return null when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const latest = await repository.getLatestVersion(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(latest).toBeNull();
    });
  });

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

  describe('getCurrentVersionNumber', () => {
    it('should return current max version number', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ max_version: 7 }));

      const versionNum = await repository.getCurrentVersionNumber(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(versionNum).toBe(7);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(
        createMockStatement({ max_version: null }),
      );

      const versionNum = await repository.getCurrentVersionNumber(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(versionNum).toBe(0);
    });
  });

  describe('getVersionCount', () => {
    it('should return count of versions for item', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ count: 12 }));

      const count = await repository.getVersionCount(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(count).toBe(12);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ count: 0 }));

      const count = await repository.getVersionCount(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(count).toBe(0);
    });
  });

  describe('getStorageUsed', () => {
    it('should return total storage in bytes', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ total: 15000 }));

      const storage = await repository.getStorageUsed(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(storage).toBe(15000);
    });

    it('should return 0 when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ total: null }));

      const storage = await repository.getStorageUsed(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(storage).toBe(0);
    });
  });

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

      const versions = await repository.getVersionRange(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        3,
        5,
      );

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3); // Ascending order
      expect(versions[2].version).toBe(5);
      expect(stmt.all).toHaveBeenCalledWith(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        3,
        5,
      );
    });

    it('should return empty array when no versions in range', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement([]));

      const versions = await repository.getVersionRange(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        100,
        200,
      );

      expect(versions).toEqual([]);
    });
  });

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

  describe('deleteAllVersions', () => {
    it('should return count of deleted versions', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 5));

      const count = await repository.deleteAllVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

      expect(count).toBe(5);
    });

    it('should return 0 when no versions to delete', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined, 0));

      const count = await repository.deleteAllVersions(
        'no-such-item',
        TEST_CONTENT_TYPE,
      );

      expect(count).toBe(0);
    });
  });

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

      const deleted = await repository.pruneOldVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        3,
      );

      expect(deleted).toBe(2);
    });

    it('should return 0 when not enough versions to prune', async () => {
      // No cutoff row found (fewer versions than keepCount)
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const deleted = await repository.pruneOldVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        10,
      );

      expect(deleted).toBe(0);
    });
  });

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
});
