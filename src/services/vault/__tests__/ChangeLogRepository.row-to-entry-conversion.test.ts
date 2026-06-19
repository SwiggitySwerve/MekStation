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
