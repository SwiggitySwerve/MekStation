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
});
