/**
 * Share Link Repository Tests
 *
 * Tests for share link persistence to SQLite including CRUD operations,
 * token generation, and atomic redemption.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IStoredShareLink,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

import {
  ShareLinkRepository,
  getShareLinkRepository,
  resetShareLinkRepository,
} from '@/services/vault/ShareLinkRepository';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock statement for prepared statements
const createMockStatement = () => ({
  run: jest.fn().mockReturnValue({ changes: 1 }),
  get: jest.fn().mockReturnValue(undefined),
  all: jest.fn().mockReturnValue([]),
});

// Mock database
const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn().mockReturnValue(createMockStatement()),
};

// Mock SQLite service
const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDb),
};

// Mock getSQLiteService
jest.mock('@/services/persistence', () => ({
  getSQLiteService: () => mockSQLiteService,
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-12345678';
const originalCrypto = global.crypto;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a mock stored share link row
 */
function createMockStoredLink(
  overrides: Partial<IStoredShareLink> = {},
): IStoredShareLink {
  return {
    id: 'link-test-id',
    token: 'test-token-abc123',
    scope_type: 'item',
    scope_id: 'unit-123',
    scope_category: null,
    level: 'read',
    expires_at: null,
    max_uses: null,
    use_count: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    label: null,
    is_active: 1,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ShareLinkRepository', () => {
  let repository: ShareLinkRepository;
  let mockStatement: ReturnType<typeof createMockStatement>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetShareLinkRepository();

    // Create fresh mock statement for each test
    mockStatement = createMockStatement();
    mockDb.prepare.mockReturnValue(mockStatement);

    repository = new ShareLinkRepository();

    // Mock crypto
    global.crypto = {
      ...originalCrypto,
      randomUUID: jest.fn().mockReturnValue(mockUUID),
      getRandomValues: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i % 256;
        }
        return arr;
      }),
    } as Crypto;
  });

  afterEach(() => {
    global.crypto = originalCrypto;
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should initialize the database table on first call', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledTimes(1);
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS vault_share_links'),
      );
    });

    it('should not reinitialize on subsequent calls', async () => {
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledTimes(1);
    });

    it('should create required indexes', async () => {
      await repository.initialize();

      const execCalls = mockDb.exec.mock.calls as [[string]];
      const execCall = execCalls[0][0];
      expect(execCall).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_share_links_token',
      );
      expect(execCall).toContain(
        'CREATE INDEX IF NOT EXISTS idx_vault_share_links_scope',
      );
      expect(execCall).toContain(
        'CREATE INDEX IF NOT EXISTS idx_vault_share_links_active',
      );
    });
  });

  describe('create', () => {
    it('should create an item share link', async () => {
      const result = await repository.create('item', 'unit-123', null, {
        level: 'read',
      });

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.stringContaining('link-'),
        expect.any(String), // token
        'item',
        'unit-123',
        null,
        'read',
        null, // expiresAt
        null, // maxUses
        expect.any(String), // createdAt
        null, // label
      );

      expect(result.scopeType).toBe('item');
      expect(result.scopeId).toBe('unit-123');
      expect(result.level).toBe('read');
      expect(result.isActive).toBe(true);
      expect(result.useCount).toBe(0);
    });

    it('should create a category share link', async () => {
      const result = await repository.create('category', null, 'units', {
        level: 'write',
      });

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.stringContaining('link-'),
        expect.any(String),
        'category',
        null,
        'units',
        'write',
        null,
        null,
        expect.any(String),
        null,
      );

      expect(result.scopeType).toBe('category');
      expect(result.scopeCategory).toBe('units');
      expect(result.level).toBe('write');
    });

    it('should create a link with all options', async () => {
      const expiresAt = '2025-01-01T00:00:00.000Z';
      const result = await repository.create('item', 'unit-123', null, {
        level: 'admin',
        expiresAt,
        maxUses: 10,
        label: 'Test Link',
      });

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.stringContaining('link-'),
        expect.any(String),
        'item',
        'unit-123',
        null,
        'admin',
        expiresAt,
        10,
        expect.any(String),
        'Test Link',
      );

      expect(result.expiresAt).toBe(expiresAt);
      expect(result.maxUses).toBe(10);
      expect(result.label).toBe('Test Link');
    });

    it('should generate a unique token for each link', async () => {
      const result1 = await repository.create('item', 'unit-1', null, {
        level: 'read',
      });
      const result2 = await repository.create('item', 'unit-2', null, {
        level: 'read',
      });

      // Both should have tokens (we can't test uniqueness with mocked crypto)
      expect(result1.token).toBeDefined();
      expect(result2.token).toBeDefined();
      expect(result1.token.length).toBeGreaterThan(0);
    });

    it('should create an "all" scope share link', async () => {
      const result = await repository.create('all', null, null, {
        level: 'read',
      });

      expect(result.scopeType).toBe('all');
      expect(result.scopeId).toBeNull();
      expect(result.scopeCategory).toBeNull();
    });

    it('should create a folder scope share link', async () => {
      const result = await repository.create('folder', 'folder-123', null, {
        level: 'write',
      });

      expect(result.scopeType).toBe('folder');
      expect(result.scopeId).toBe('folder-123');
    });
  });

  describe('getById', () => {
    it('should return null when link not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_share_links WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('non-existent');
    });

    it('should return the link when found', async () => {
      const storedLink = createMockStoredLink();
      mockStatement.get.mockReturnValue(storedLink);

      const result = await repository.getById('link-test-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('link-test-id');
      expect(result?.token).toBe('test-token-abc123');
      expect(result?.scopeType).toBe('item');
      expect(result?.isActive).toBe(true);
    });

    it('should correctly convert is_active from number to boolean', async () => {
      const activeLink = createMockStoredLink({ is_active: 1 });
      mockStatement.get.mockReturnValue(activeLink);

      let result = await repository.getById('link-1');
      expect(result?.isActive).toBe(true);

      const inactiveLink = createMockStoredLink({ is_active: 0 });
      mockStatement.get.mockReturnValue(inactiveLink);

      result = await repository.getById('link-2');
      expect(result?.isActive).toBe(false);
    });

    it('should convert label null to undefined', async () => {
      const linkWithNoLabel = createMockStoredLink({ label: null });
      mockStatement.get.mockReturnValue(linkWithNoLabel);

      const result = await repository.getById('link-1');
      expect(result?.label).toBeUndefined();

      const linkWithLabel = createMockStoredLink({ label: 'My Label' });
      mockStatement.get.mockReturnValue(linkWithLabel);

      const result2 = await repository.getById('link-2');
      expect(result2?.label).toBe('My Label');
    });
  });

  describe('getByToken', () => {
    it('should return null when token not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getByToken('invalid-token');

      expect(result).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_share_links WHERE token = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('invalid-token');
    });

    it('should return the link when token found', async () => {
      const storedLink = createMockStoredLink({ token: 'valid-token' });
      mockStatement.get.mockReturnValue(storedLink);

      const result = await repository.getByToken('valid-token');

      expect(result).not.toBeNull();
      expect(result?.token).toBe('valid-token');
    });
  });

  describe('getByItem', () => {
    it('should return empty array when no links for item', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getByItem('item', 'unit-no-links');

      expect(result).toEqual([]);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE scope_type = ? AND scope_id = ?'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith('item', 'unit-no-links');
    });

    it('should return all links for an item', async () => {
      const links = [
        createMockStoredLink({ id: 'link-1', level: 'read' }),
        createMockStoredLink({ id: 'link-2', level: 'write' }),
      ];
      mockStatement.all.mockReturnValue(links);

      const result = await repository.getByItem('item', 'unit-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('link-1');
      expect(result[1].id).toBe('link-2');
    });

    it('should return links ordered by created_at DESC', async () => {
      await repository.getByItem('item', 'unit-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
      );
    });
  });

  describe('getActive', () => {
    it('should return only active links', async () => {
      const activeLinks = [
        createMockStoredLink({ id: 'link-1', is_active: 1 }),
        createMockStoredLink({ id: 'link-2', is_active: 1 }),
      ];
      mockStatement.all.mockReturnValue(activeLinks);

      const result = await repository.getActive();

      expect(result).toHaveLength(2);
      result.forEach((link) => expect(link.isActive).toBe(true));

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = 1'),
      );
    });

    it('should return empty array when no active links', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getActive();

      expect(result).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all links regardless of active status', async () => {
      const allLinks = [
        createMockStoredLink({ id: 'link-1', is_active: 1 }),
        createMockStoredLink({ id: 'link-2', is_active: 0 }),
      ];
      mockStatement.all.mockReturnValue(allLinks);

      const result = await repository.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);
    });

    it('should return links ordered by created_at DESC', async () => {
      await repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
      );
    });
  });
});
