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
        TEST_CREATED_BY,
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
        TEST_CREATED_BY,
      );

      expect(result.sizeBytes).toBe(1000000);
    });

    it('should handle special characters in item ID', async () => {
      const specialItemId = 'item-with-special!@#$%^&*()_+';
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      await repository.getVersions(specialItemId, TEST_CONTENT_TYPE);

      expect(stmt.all).toHaveBeenCalledWith(
        specialItemId,
        TEST_CONTENT_TYPE,
        50,
      );
    });

    it('should handle all shareable content types', async () => {
      const contentTypes: ShareableContentType[] = [
        'unit',
        'pilot',
        'force',
        'encounter',
      ];
      const stmt = createMockStatement([]);
      mockDb.prepare.mockReturnValue(stmt);

      for (const contentType of contentTypes) {
        await repository.getVersions('item-1', contentType);
      }

      expect(stmt.all).toHaveBeenCalledTimes(4);
    });
  });
});
