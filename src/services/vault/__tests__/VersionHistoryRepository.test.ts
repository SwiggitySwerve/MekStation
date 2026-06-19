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

  describe('initialize', () => {
    it('should create tables on first initialization', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS version_history'),
      );
    });

    it('should create required indexes', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_version_history_item',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_version_history_version',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_version_history_created',
        ),
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
        TEST_CREATED_BY,
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
      expect(result.sizeBytes).toBe(
        new TextEncoder().encode(TEST_CONTENT).length,
      );
    });

    it('should save version with optional message', async () => {
      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY,
        TEST_MESSAGE,
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
        TEST_CREATED_BY,
      );

      expect(result.version).toBe(3);
    });

    it('should calculate size in bytes correctly for unicode content', async () => {
      const unicodeContent = JSON.stringify({
        name: '????????????',
        emoji: '????????????',
      });

      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        unicodeContent,
        'hash123',
        TEST_CREATED_BY,
      );

      expect(result.sizeBytes).toBe(
        new TextEncoder().encode(unicodeContent).length,
      );
    });

    it('should set createdAt to current ISO timestamp', async () => {
      const beforeSave = new Date().toISOString();

      const result = await repository.saveVersion(
        TEST_CONTENT_TYPE,
        TEST_ITEM_ID,
        TEST_CONTENT,
        TEST_CONTENT_HASH,
        TEST_CREATED_BY,
      );

      const afterSave = new Date().toISOString();
      expect(result.createdAt >= beforeSave).toBe(true);
      expect(result.createdAt <= afterSave).toBe(true);
    });
  });

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

      const versions = await repository.getVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

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

      expect(stmt.all).toHaveBeenCalledWith(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        50,
      );
    });

    it('should return empty array when no versions exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement([]));

      const versions = await repository.getVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

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

      const versions = await repository.getVersions(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
      );

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

      const version = await repository.getVersion(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        2,
      );

      expect(version).toBeDefined();
      expect(version?.version).toBe(2);
      expect(stmt.get).toHaveBeenCalledWith(TEST_ITEM_ID, TEST_CONTENT_TYPE, 2);
    });

    it('should return null when version does not exist', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement(undefined));

      const version = await repository.getVersion(
        TEST_ITEM_ID,
        TEST_CONTENT_TYPE,
        999,
      );

      expect(version).toBeNull();
    });
  });
});
