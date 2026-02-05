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
      run: jest.fn().mockImplementation((...params: unknown[]) => {
        const table = mockDatabaseTables.get('vault_permissions')!;

        if (sql.includes('INSERT INTO')) {
          // Handle INSERT
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
        } else if (sql.includes('UPDATE')) {
          // Handle UPDATE
          const id = params[params.length - 1] as string;
          const existing = table.get(id);
          if (!existing) return { changes: 0 };

          if (sql.includes('SET level')) {
            existing.level = params[0];
          } else if (sql.includes('SET expires_at')) {
            existing.expires_at = params[0];
          }
          return { changes: 1 };
        } else if (sql.includes('DELETE')) {
          // Handle DELETE
          if (sql.includes('WHERE id = ?')) {
            const id = params[0] as string;
            const existed = table.has(id);
            table.delete(id);
            return { changes: existed ? 1 : 0 };
          } else if (sql.includes('WHERE grantee_id = ?')) {
            const granteeId = params[0] as string;
            let count = 0;
            const entries = Array.from(table.entries());
            for (const [id, row] of entries) {
              if (row.grantee_id === granteeId) {
                table.delete(id);
                count++;
              }
            }
            return { changes: count };
          } else if (sql.includes('WHERE scope_type = ? AND scope_id = ?')) {
            const scopeType = params[0] as string;
            const scopeId = params[1] as string;
            let count = 0;
            const entries = Array.from(table.entries());
            for (const [id, row] of entries) {
              if (row.scope_type === scopeType && row.scope_id === scopeId) {
                table.delete(id);
                count++;
              }
            }
            return { changes: count };
          } else if (sql.includes('expires_at IS NOT NULL AND expires_at <')) {
            const now = params[0] as string;
            let count = 0;
            const entries = Array.from(table.entries());
            for (const [id, row] of entries) {
              if (row.expires_at && (row.expires_at as string) < now) {
                table.delete(id);
                count++;
              }
            }
            return { changes: count };
          }
          return { changes: 0 };
        }
        return { changes: 0 };
      }),

      get: jest.fn().mockImplementation((...params: unknown[]) => {
        const table = mockDatabaseTables.get('vault_permissions')!;
        const rows = Array.from(table.values()) as Record<string, unknown>[];

        if (sql.includes('WHERE id = ?')) {
          return table.get(params[0] as string) || undefined;
        } else if (sql.includes("scope_type = 'item' AND scope_id = ?")) {
          const granteeId = params[0] as string;
          const scopeId = params[1] as string;
          const now = params[2] as string;
          for (const row of rows) {
            if (
              row.grantee_id === granteeId &&
              row.scope_type === 'item' &&
              row.scope_id === scopeId &&
              (!row.expires_at || (row.expires_at as string) > now)
            ) {
              return { level: row.level };
            }
          }
          return undefined;
        } else if (
          sql.includes("scope_type = 'category' AND scope_category = ?")
        ) {
          const granteeId = params[0] as string;
          const category = params[1] as string;
          const now = params[2] as string;
          for (const row of rows) {
            if (
              row.grantee_id === granteeId &&
              row.scope_type === 'category' &&
              row.scope_category === category &&
              (!row.expires_at || (row.expires_at as string) > now)
            ) {
              return { level: row.level };
            }
          }
          return undefined;
        } else if (sql.includes("scope_type = 'all'")) {
          const granteeId = params[0] as string;
          const now = params[1] as string;
          for (const row of rows) {
            if (
              row.grantee_id === granteeId &&
              row.scope_type === 'all' &&
              (!row.expires_at || (row.expires_at as string) > now)
            ) {
              return { level: row.level };
            }
          }
          return undefined;
        }
        return undefined;
      }),

      all: jest.fn().mockImplementation((...params: unknown[]) => {
        const table = mockDatabaseTables.get('vault_permissions')!;
        const rows = Array.from(table.values()) as Record<string, unknown>[];

        if (sql.includes('WHERE grantee_id = ?')) {
          return rows.filter((r) => r.grantee_id === params[0]);
        } else if (sql.includes('WHERE scope_type = ? AND scope_id = ?')) {
          return rows.filter(
            (r) => r.scope_type === params[0] && r.scope_id === params[1],
          );
        } else if (sql.includes('WHERE scope_category = ?')) {
          return rows.filter((r) => r.scope_category === params[0]);
        }
        return rows;
      }),
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

  describe('initialize', () => {
    it('should initialize the repository and create table', async () => {
      repository = new PermissionRepository();
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDatabase.exec).toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      repository = new PermissionRepository();
      await repository.initialize();
      await repository.initialize();

      // exec should only be called once
      expect(mockDatabase.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Create
  // ===========================================================================

  describe('create', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should create an item permission', async () => {
      const grant = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        granteeName: 'Test User',
      });

      expect(grant.id).toBe('perm-test-uuid-1');
      expect(grant.granteeId).toBe('ABCD-EFGH-JKLM-NPQR');
      expect(grant.scopeType).toBe('item');
      expect(grant.scopeId).toBe('unit-123');
      expect(grant.level).toBe('read');
      expect(grant.granteeName).toBe('Test User');
      expect(grant.createdAt).toBeDefined();
    });

    it('should create a category permission', async () => {
      const grant = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'write',
        expiresAt: null,
      });

      expect(grant.scopeType).toBe('category');
      expect(grant.scopeCategory).toBe('units');
      expect(grant.level).toBe('write');
    });

    it('should create a vault-wide permission', async () => {
      const grant = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'all',
        scopeId: null,
        scopeCategory: null,
        level: 'admin',
        expiresAt: null,
      });

      expect(grant.scopeType).toBe('all');
      expect(grant.level).toBe('admin');
    });

    it('should create a permission with expiry', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const grant = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt,
      });

      expect(grant.expiresAt).toBe(expiresAt);
    });

    it('should create a public permission', async () => {
      const grant = await repository.create({
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit-public',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      expect(grant.granteeId).toBe('public');
    });
  });

  // ===========================================================================
  // GetById
  // ===========================================================================

  describe('getById', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should return permission by ID', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const found = await repository.getById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.granteeId).toBe('ABCD-EFGH-JKLM-NPQR');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.getById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // GetByGrantee
  // ===========================================================================

  describe('getByGrantee', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should return all permissions for a grantee', async () => {
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-2',
        scopeCategory: null,
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'OTHER-USER-CODE',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const grants = await repository.getByGrantee('ABCD-EFGH-JKLM-NPQR');

      expect(grants).toHaveLength(2);
      expect(grants.every((g) => g.granteeId === 'ABCD-EFGH-JKLM-NPQR')).toBe(
        true,
      );
    });

    it('should return empty array for unknown grantee', async () => {
      const grants = await repository.getByGrantee('unknown-grantee');

      expect(grants).toHaveLength(0);
    });
  });

  // ===========================================================================
  // GetByItem
  // ===========================================================================

  describe('getByItem', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should return all permissions for an item', async () => {
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-456',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const grants = await repository.getByItem('item', 'unit-123');

      expect(grants).toHaveLength(2);
      expect(grants.every((g) => g.scopeId === 'unit-123')).toBe(true);
    });

    it('should return empty array for unknown item', async () => {
      const grants = await repository.getByItem('item', 'unknown-item');

      expect(grants).toHaveLength(0);
    });
  });

  // ===========================================================================
  // GetByCategory
  // ===========================================================================

  describe('getByCategory', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should return all permissions for a category', async () => {
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'pilots',
        level: 'read',
        expiresAt: null,
      });

      const grants = await repository.getByCategory('units');

      expect(grants).toHaveLength(2);
      expect(grants.every((g) => g.scopeCategory === 'units')).toBe(true);
    });

    it('should return empty array for unknown category', async () => {
      const grants = await repository.getByCategory('forces');

      expect(grants).toHaveLength(0);
    });
  });

  // ===========================================================================
  // GetAll
  // ===========================================================================

  describe('getAll', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should return all permissions', async () => {
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-3',
        scopeType: 'all',
        scopeId: null,
        scopeCategory: null,
        level: 'admin',
        expiresAt: null,
      });

      const grants = await repository.getAll();

      expect(grants).toHaveLength(3);
    });

    it('should return empty array when no permissions exist', async () => {
      const grants = await repository.getAll();

      expect(grants).toHaveLength(0);
    });
  });

  // ===========================================================================
  // CheckPermission
  // ===========================================================================

  describe('checkPermission', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should find explicit item permission', async () => {
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(level).toBe('read');
    });

    it('should find category permission', async () => {
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'category',
        scopeId: null,
        scopeCategory: 'units',
        level: 'write',
        expiresAt: null,
      });

      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
        'units',
      );

      expect(level).toBe('write');
    });

    it('should find vault-wide permission', async () => {
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'all',
        scopeId: null,
        scopeCategory: null,
        level: 'admin',
        expiresAt: null,
      });

      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(level).toBe('admin');
    });

    it('should find public permission for non-public grantee', async () => {
      await repository.create({
        granteeId: 'public',
        scopeType: 'item',
        scopeId: 'unit-public',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const level = await repository.checkPermission(
        'SOME-OTHER-USER',
        'item',
        'unit-public',
      );

      expect(level).toBe('read');
    });

    it('should return null when no permission exists', async () => {
      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(level).toBeNull();
    });

    it('should not find expired permissions', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: expiredAt,
      });

      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(level).toBeNull();
    });

    it('should find non-expired permissions', async () => {
      const futureAt = new Date(Date.now() + 86400000).toISOString();
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: futureAt,
      });

      const level = await repository.checkPermission(
        'ABCD-EFGH-JKLM-NPQR',
        'item',
        'unit-123',
      );

      expect(level).toBe('read');
    });
  });

  // ===========================================================================
  // UpdateLevel
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

  // ===========================================================================
  // UpdateExpiry
  // ===========================================================================

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

  // ===========================================================================
  // Delete
  // ===========================================================================

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

  // ===========================================================================
  // DeleteByGrantee
  // ===========================================================================

  describe('deleteByGrantee', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should delete all permissions for a grantee', async () => {
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-2',
        scopeCategory: null,
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'OTHER-USER',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const count = await repository.deleteByGrantee('ABCD-EFGH-JKLM-NPQR');

      expect(count).toBe(2);

      const remaining = await repository.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].granteeId).toBe('OTHER-USER');
    });

    it('should return 0 for unknown grantee', async () => {
      const count = await repository.deleteByGrantee('unknown');

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // DeleteByItem
  // ===========================================================================

  describe('deleteByItem', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should delete all permissions for an item', async () => {
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'write',
        expiresAt: null,
      });
      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-456',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const count = await repository.deleteByItem('item', 'unit-123');

      expect(count).toBe(2);

      const remaining = await repository.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].scopeId).toBe('unit-456');
    });

    it('should return 0 for unknown item', async () => {
      const count = await repository.deleteByItem('item', 'unknown');

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // CleanupExpired
  // ===========================================================================

  describe('cleanupExpired', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should remove expired permissions', async () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 86400000).toISOString();

      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: expiredAt,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-2',
        scopeCategory: null,
        level: 'read',
        expiresAt: futureAt,
      });
      await repository.create({
        granteeId: 'user-3',
        scopeType: 'item',
        scopeId: 'unit-3',
        scopeCategory: null,
        level: 'read',
        expiresAt: null, // No expiry
      });

      const count = await repository.cleanupExpired();

      expect(count).toBe(1);

      const remaining = await repository.getAll();
      expect(remaining).toHaveLength(2);
    });

    it('should return 0 when no expired permissions', async () => {
      const futureAt = new Date(Date.now() + 86400000).toISOString();

      await repository.create({
        granteeId: 'user-1',
        scopeType: 'item',
        scopeId: 'unit-1',
        scopeCategory: null,
        level: 'read',
        expiresAt: futureAt,
      });
      await repository.create({
        granteeId: 'user-2',
        scopeType: 'item',
        scopeId: 'unit-2',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
      });

      const count = await repository.cleanupExpired();

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton
  // ===========================================================================

  describe('getPermissionRepository singleton', () => {
    it('should return the same instance', () => {
      resetPermissionRepository();

      const instance1 = getPermissionRepository();
      const instance2 = getPermissionRepository();

      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = getPermissionRepository();
      resetPermissionRepository();
      const instance2 = getPermissionRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Row Conversion
  // ===========================================================================

  describe('rowToGrant conversion', () => {
    beforeEach(() => {
      repository = new PermissionRepository();
    });

    it('should correctly convert database row to IPermissionGrant', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        granteeName: 'Test User',
      });

      const found = await repository.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toEqual(expect.any(String));
      expect(found!.granteeId).toBe('ABCD-EFGH-JKLM-NPQR');
      expect(found!.scopeType).toBe('item');
      expect(found!.scopeId).toBe('unit-123');
      expect(found!.scopeCategory).toBeNull();
      expect(found!.level).toBe('read');
      expect(found!.expiresAt).toBeNull();
      expect(found!.createdAt).toEqual(expect.any(String));
      expect(found!.granteeName).toBe('Test User');
    });

    it('should handle null granteeName correctly', async () => {
      const created = await repository.create({
        granteeId: 'ABCD-EFGH-JKLM-NPQR',
        scopeType: 'item',
        scopeId: 'unit-123',
        scopeCategory: null,
        level: 'read',
        expiresAt: null,
        // No granteeName
      });

      const found = await repository.getById(created.id);

      expect(found?.granteeName).toBeUndefined();
    });
  });
});
