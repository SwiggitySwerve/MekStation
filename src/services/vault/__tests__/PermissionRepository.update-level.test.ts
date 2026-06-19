/**
 * Permission Repository Tests
 *
 * Tests for the vault permission persistence layer using SQLite.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IPermissionGrant as _IPermissionGrant,
  PermissionLevel as _PermissionLevel,
  PermissionScopeType as _PermissionScopeType,
  ContentCategory as _ContentCategory,
} from '@/types/vault';

import {
  PermissionRepository,
  getPermissionRepository,
  resetPermissionRepository,
} from '@/services/vault/PermissionRepository';

// =============================================================================
// Mock SQLite Service
// =============================================================================

// Create a mock in-memory database for testing
const mockDatabaseTables = new Map<
  string,
  Map<string, Record<string, unknown>>
>();

type MockPermissionRow = Record<string, unknown>;
type MockPermissionTable = Map<string, MockPermissionRow>;
type MockMutationResult = { changes: number };

function getMockPermissionTable(): MockPermissionTable {
  return mockDatabaseTables.get('vault_permissions')!;
}

function insertPermissionRow(
  table: MockPermissionTable,
  params: unknown[],
): MockMutationResult {
  const id = params[0] as string;
  table.set(id, {
    id: params[0],
    grantee_id: params[1],
    scope_type: params[2],
    scope_id: params[3],
    scope_category: params[4],
    level: params[5],
    expires_at: params[6],
    created_at: params[7],
    grantee_name: params[8],
  });
  return { changes: 1 };
}

function updatePermissionRow(
  table: MockPermissionTable,
  sql: string,
  params: unknown[],
): MockMutationResult {
  const id = params[params.length - 1] as string;
  const existing = table.get(id);

  if (!existing) return { changes: 0 };

  if (sql.includes('SET level')) {
    existing.level = params[0];
  }

  if (sql.includes('SET expires_at')) {
    existing.expires_at = params[0];
  }

  return { changes: 1 };
}

function deleteById(
  table: MockPermissionTable,
  id: string,
): MockMutationResult {
  const existed = table.has(id);
  table.delete(id);
  return { changes: existed ? 1 : 0 };
}

function deleteMatchingRows(
  table: MockPermissionTable,
  matches: (row: MockPermissionRow) => boolean,
): MockMutationResult {
  let count = 0;

  for (const [id, row] of Array.from(table.entries())) {
    if (matches(row)) {
      table.delete(id);
      count++;
    }
  }

  return { changes: count };
}

function deletePermissionRows(
  table: MockPermissionTable,
  sql: string,
  params: unknown[],
): MockMutationResult {
  if (sql.includes('WHERE id = ?')) {
    return deleteById(table, params[0] as string);
  }

  if (sql.includes('WHERE grantee_id = ?')) {
    const granteeId = params[0] as string;
    return deleteMatchingRows(table, (row) => row.grantee_id === granteeId);
  }

  if (sql.includes('WHERE scope_type = ? AND scope_id = ?')) {
    const scopeType = params[0] as string;
    const scopeId = params[1] as string;
    return deleteMatchingRows(
      table,
      (row) => row.scope_type === scopeType && row.scope_id === scopeId,
    );
  }

  if (sql.includes('expires_at IS NOT NULL AND expires_at <')) {
    const now = params[0] as string;
    return deleteMatchingRows(
      table,
      (row) => Boolean(row.expires_at) && (row.expires_at as string) < now,
    );
  }

  return { changes: 0 };
}

function runMockStatement(sql: string, params: unknown[]): MockMutationResult {
  const table = getMockPermissionTable();

  if (sql.includes('INSERT INTO')) {
    return insertPermissionRow(table, params);
  }

  if (sql.includes('UPDATE')) {
    return updatePermissionRow(table, sql, params);
  }

  if (sql.includes('DELETE')) {
    return deletePermissionRows(table, sql, params);
  }

  return { changes: 0 };
}

function isActivePermission(row: MockPermissionRow, now: string): boolean {
  return !row.expires_at || (row.expires_at as string) > now;
}

function findPermissionLevel(
  rows: MockPermissionRow[],
  now: string,
  matches: (row: MockPermissionRow) => boolean,
): { level: unknown } | undefined {
  const row = rows.find(
    (currentRow) => matches(currentRow) && isActivePermission(currentRow, now),
  );

  return row ? { level: row.level } : undefined;
}

function getMockStatementResult(
  sql: string,
  params: unknown[],
): MockPermissionRow | { level: unknown } | undefined {
  const table = getMockPermissionTable();
  const rows = Array.from(table.values());

  if (sql.includes('WHERE id = ?')) {
    return table.get(params[0] as string) || undefined;
  }

  if (sql.includes("scope_type = 'item' AND scope_id = ?")) {
    const granteeId = params[0] as string;
    const scopeId = params[1] as string;
    const now = params[2] as string;
    return findPermissionLevel(
      rows,
      now,
      (row) =>
        row.grantee_id === granteeId &&
        row.scope_type === 'item' &&
        row.scope_id === scopeId,
    );
  }

  if (sql.includes("scope_type = 'category' AND scope_category = ?")) {
    const granteeId = params[0] as string;
    const category = params[1] as string;
    const now = params[2] as string;
    return findPermissionLevel(
      rows,
      now,
      (row) =>
        row.grantee_id === granteeId &&
        row.scope_type === 'category' &&
        row.scope_category === category,
    );
  }

  if (sql.includes("scope_type = 'all'")) {
    const granteeId = params[0] as string;
    const now = params[1] as string;
    return findPermissionLevel(
      rows,
      now,
      (row) => row.grantee_id === granteeId && row.scope_type === 'all',
    );
  }

  return undefined;
}

function getMockStatementRows(
  sql: string,
  params: unknown[],
): MockPermissionRow[] {
  const rows = Array.from(getMockPermissionTable().values());

  if (sql.includes('WHERE grantee_id = ?')) {
    return rows.filter((row) => row.grantee_id === params[0]);
  }

  if (sql.includes('WHERE scope_type = ? AND scope_id = ?')) {
    return rows.filter(
      (row) => row.scope_type === params[0] && row.scope_id === params[1],
    );
  }

  if (sql.includes('WHERE scope_category = ?')) {
    return rows.filter((row) => row.scope_category === params[0]);
  }

  return rows;
}

const mockDatabase = {
  statements: new Map<string, { sql: string; params: unknown[] }>(),
  tables: mockDatabaseTables,

  exec: jest.fn().mockImplementation((sql: string) => {
    // Initialize tables when exec is called (for CREATE TABLE statements)
    if (sql.includes('CREATE TABLE IF NOT EXISTS vault_permissions')) {
      mockDatabaseTables.set('vault_permissions', new Map());
    }
  }),

  prepare: jest.fn().mockImplementation((sql: string) => {
    return {
      run: jest
        .fn()
        .mockImplementation((...params: unknown[]) =>
          runMockStatement(sql, params),
        ),
      get: jest
        .fn()
        .mockImplementation((...params: unknown[]) =>
          getMockStatementResult(sql, params),
        ),
      all: jest
        .fn()
        .mockImplementation((...params: unknown[]) =>
          getMockStatementRows(sql, params),
        ),
    };
  }),
};

const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDatabase),
  close: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(true),
};

jest.mock('@/services/persistence', () => ({
  getSQLiteService: jest.fn(() => mockSQLiteService),
}));

// Mock crypto.randomUUID
let uuidCounter = 0;
const mockRandomUUID = jest.fn(() => `test-uuid-${++uuidCounter}`);
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockRandomUUID },
});

// =============================================================================
// Tests
// =============================================================================

describe('PermissionRepository', () => {
  let repository: PermissionRepository;

  beforeEach(() => {
    // Reset state
    resetPermissionRepository();
    mockDatabase.tables.clear();
    mockDatabase.tables.set('vault_permissions', new Map());
    uuidCounter = 0;
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('updateLevel', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should update permission level', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const success = await repository.updateLevel(created.id, 'write');

      expect(success).toBe(true);

      const updated = await repository.getById(created.id);
      expect(updated?.level).toBe('write');
    });

    it('should return false for non-existent permission', async () => {
      const success = await repository.updateLevel('non-existent', 'write');

      expect(success).toBe(false);
    });
  });

  describe('updateExpiry', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should update permission expiry', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const newExpiry = new Date(Date.now() + 86400000).toISOString();
      const success = await repository.updateExpiry(created.id, newExpiry);

      expect(success).toBe(true);

      const updated = await repository.getById(created.id);
      expect(updated?.expiresAt).toBe(newExpiry);
    });

    it('should clear expiry with null', async () => {
      const initialExpiry = new Date().toISOString();
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: initialExpiry,
      });

      const success = await repository.updateExpiry(created.id, null);

      expect(success).toBe(true);

      const updated = await repository.getById(created.id);
      expect(updated?.expiresAt).toBeNull();
    });

    it('should return false for non-existent permission', async () => {
      const success = await repository.updateExpiry('non-existent', null);

      expect(success).toBe(false);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should delete a permission', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const success = await repository.delete(created.id);

      expect(success).toBe(true);

      const found = await repository.getById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent permission', async () => {
      const success = await repository.delete('non-existent');

      expect(success).toBe(false);
    });
  });
});
