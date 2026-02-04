/**
 * Share Link Repository Tests
 *
 * Tests for share link persistence to SQLite including CRUD operations,
 * token generation, and atomic redemption.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  ShareLinkRepository,
  getShareLinkRepository,
  resetShareLinkRepository,
} from '@/services/vault/ShareLinkRepository';
import type {
  IStoredShareLink,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

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
  overrides: Partial<IStoredShareLink> = {}
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
        expect.stringContaining('CREATE TABLE IF NOT EXISTS vault_share_links')
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
      expect(execCall).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_share_links_token');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS idx_vault_share_links_scope');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS idx_vault_share_links_active');
    });
  });

  // ===========================================================================
  // Create
  // ===========================================================================

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
        null // label
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
        null
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
        'Test Link'
      );

      expect(result.expiresAt).toBe(expiresAt);
      expect(result.maxUses).toBe(10);
      expect(result.label).toBe('Test Link');
    });

    it('should generate a unique token for each link', async () => {
      const result1 = await repository.create('item', 'unit-1', null, { level: 'read' });
      const result2 = await repository.create('item', 'unit-2', null, { level: 'read' });

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

  // ===========================================================================
  // Get By ID
  // ===========================================================================

  describe('getById', () => {
    it('should return null when link not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_share_links WHERE id = ?'
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

  // ===========================================================================
  // Get By Token
  // ===========================================================================

  describe('getByToken', () => {
    it('should return null when token not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getByToken('invalid-token');

      expect(result).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_share_links WHERE token = ?'
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

  // ===========================================================================
  // Get By Item
  // ===========================================================================

  describe('getByItem', () => {
    it('should return empty array when no links for item', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getByItem('item', 'unit-no-links');

      expect(result).toEqual([]);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE scope_type = ? AND scope_id = ?')
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
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });
  });

  // ===========================================================================
  // Get Active
  // ===========================================================================

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
        expect.stringContaining('WHERE is_active = 1')
      );
    });

    it('should return empty array when no active links', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getActive();

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Get All
  // ===========================================================================

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
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });
  });

  // ===========================================================================
  // Redeem
  // ===========================================================================

  describe('redeem', () => {
    it('should successfully redeem a valid link', async () => {
      // First call: atomic update succeeds
      mockStatement.run.mockReturnValue({ changes: 1 });
      // Second call: getByToken returns updated link
      const updatedLink = createMockStoredLink({ use_count: 1 });
      mockStatement.get.mockReturnValue(updatedLink);

      const result = await repository.redeem('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link).toBeDefined();
        expect(result.data.link.useCount).toBe(1);
      }
    });

    it('should return NOT_FOUND error for non-existent token', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.redeem('non-existent-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('NOT_FOUND');
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return INACTIVE error for deactivated link', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      const inactiveLink = createMockStoredLink({ is_active: 0 });
      mockStatement.get.mockReturnValue(inactiveLink);

      const result = await repository.redeem('inactive-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INACTIVE');
        expect(result.error.message).toContain('inactive');
      }
    });

    it('should return EXPIRED error for expired link', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      const expiredLink = createMockStoredLink({
        expires_at: '2020-01-01T00:00:00.000Z',
      });
      mockStatement.get.mockReturnValue(expiredLink);

      const result = await repository.redeem('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('EXPIRED');
        expect(result.error.message).toContain('expired');
      }
    });

    it('should return MAX_USES error when max uses reached', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      const maxedLink = createMockStoredLink({
        max_uses: 5,
        use_count: 5,
      });
      mockStatement.get.mockReturnValue(maxedLink);

      const result = await repository.redeem('maxed-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('MAX_USES');
        expect(result.error.message).toContain('maximum uses');
      }
    });

    it('should use atomic update to prevent race conditions', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const updatedLink = createMockStoredLink({ use_count: 1 });
      mockStatement.get.mockReturnValue(updatedLink);

      await repository.redeem('valid-token');

      // Verify the atomic UPDATE was called with all conditions
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vault_share_links')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SET use_count = use_count + 1')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token = ?')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = 1')
      );
    });

    it('should return INVALID error when all validation conditions fail unexpectedly', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      // Link exists, is active, not expired, not maxed - but update still failed
      const validLink = createMockStoredLink({
        is_active: 1,
        expires_at: '2099-01-01T00:00:00.000Z',
        max_uses: 10,
        use_count: 0,
      });
      mockStatement.get.mockReturnValue(validLink);

      const result = await repository.redeem('valid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INVALID');
      }
    });
  });

  // ===========================================================================
  // Deactivate
  // ===========================================================================

  describe('deactivate', () => {
    it('should deactivate an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.deactivate('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET is_active = 0 WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deactivate('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Reactivate
  // ===========================================================================

  describe('reactivate', () => {
    it('should reactivate an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.reactivate('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET is_active = 1 WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.reactivate('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Update Label
  // ===========================================================================

  describe('updateLabel', () => {
    it('should update the label', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateLabel('link-123', 'New Label');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET label = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('New Label', 'link-123');
    });

    it('should clear the label with null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateLabel('link-123', null);

      expect(result).toBe(true);
      expect(mockStatement.run).toHaveBeenCalledWith(null, 'link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateLabel('non-existent', 'Label');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Update Expiry
  // ===========================================================================

  describe('updateExpiry', () => {
    it('should update the expiry date', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const newExpiry = '2025-06-01T00:00:00.000Z';

      const result = await repository.updateExpiry('link-123', newExpiry);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET expires_at = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(newExpiry, 'link-123');
    });

    it('should remove expiry with null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateExpiry('link-123', null);

      expect(result).toBe(true);
      expect(mockStatement.run).toHaveBeenCalledWith(null, 'link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateExpiry('non-existent', '2025-01-01T00:00:00.000Z');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Update Max Uses
  // ===========================================================================

  describe('updateMaxUses', () => {
    it('should update max uses', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateMaxUses('link-123', 20);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET max_uses = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(20, 'link-123');
    });

    it('should remove max uses limit with null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateMaxUses('link-123', null);

      expect(result).toBe(true);
      expect(mockStatement.run).toHaveBeenCalledWith(null, 'link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateMaxUses('non-existent', 10);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Delete
  // ===========================================================================

  describe('delete', () => {
    it('should delete an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.delete('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Delete By Item
  // ===========================================================================

  describe('deleteByItem', () => {
    it('should delete all links for an item', async () => {
      mockStatement.run.mockReturnValue({ changes: 3 });

      const result = await repository.deleteByItem('item', 'unit-123');

      expect(result).toBe(3);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE scope_type = ? AND scope_id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('item', 'unit-123');
    });

    it('should return 0 when no links exist for item', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deleteByItem('item', 'unit-no-links');

      expect(result).toBe(0);
    });

    it('should work with folder scope type', async () => {
      mockStatement.run.mockReturnValue({ changes: 2 });

      const result = await repository.deleteByItem('folder', 'folder-123');

      expect(result).toBe(2);
      expect(mockStatement.run).toHaveBeenCalledWith('folder', 'folder-123');
    });
  });

  // ===========================================================================
  // Cleanup Expired
  // ===========================================================================

  describe('cleanupExpired', () => {
    it('should delete expired links', async () => {
      mockStatement.run.mockReturnValue({ changes: 5 });

      const result = await repository.cleanupExpired();

      expect(result).toBe(5);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE expires_at IS NOT NULL AND expires_at < ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(expect.any(String));
    });

    it('should return 0 when no expired links', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.cleanupExpired();

      expect(result).toBe(0);
    });

    it('should use current timestamp for comparison', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const before = Date.now();
      await repository.cleanupExpired();
      const after = Date.now();

      const runCalls = mockStatement.run.mock.calls as [[string]];
      const runCall = runCalls[0][0];
      const callTime = new Date(runCall).getTime();

      expect(callTime).toBeGreaterThanOrEqual(before);
      expect(callTime).toBeLessThanOrEqual(after);
    });
  });

  // ===========================================================================
  // Singleton
  // ===========================================================================

  describe('singleton', () => {
    beforeEach(() => {
      resetShareLinkRepository();
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = getShareLinkRepository();
      const instance2 = getShareLinkRepository();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getShareLinkRepository();
      resetShareLinkRepository();
      const instance2 = getShareLinkRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Token Generation
  // ===========================================================================

  describe('token generation', () => {
    it('should generate base64url encoded token', async () => {
      const result = await repository.create('item', 'unit-123', null, {
        level: 'read',
      });

      // Token should be URL-safe (no +, /, or = characters)
      expect(result.token).not.toMatch(/[+/=]/);
    });

    it('should generate token of appropriate length', async () => {
      const result = await repository.create('item', 'unit-123', null, {
        level: 'read',
      });

      // 24 bytes -> 32 base64 chars (minus padding)
      expect(result.token.length).toBeGreaterThanOrEqual(30);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle all content categories', async () => {
      const categories: ContentCategory[] = ['units', 'pilots', 'forces', 'encounters'];

      for (const category of categories) {
        mockStatement.run.mockReturnValue({ changes: 1 });
        const result = await repository.create('category', null, category, {
          level: 'read',
        });
        expect(result.scopeCategory).toBe(category);
      }
    });

    it('should handle all permission levels', async () => {
      const levels = ['read', 'write', 'admin'] as const;

      for (const level of levels) {
        mockStatement.run.mockReturnValue({ changes: 1 });
        const result = await repository.create('item', 'unit-123', null, {
          level,
        });
        expect(result.level).toBe(level);
      }
    });

    it('should handle all scope types', async () => {
      const scopeTypes: PermissionScopeType[] = ['item', 'folder', 'category', 'all'];

      for (const scopeType of scopeTypes) {
        mockStatement.run.mockReturnValue({ changes: 1 });
        const result = await repository.create(
          scopeType,
          scopeType === 'item' || scopeType === 'folder' ? 'test-id' : null,
          scopeType === 'category' ? 'units' : null,
          { level: 'read' }
        );
        expect(result.scopeType).toBe(scopeType);
      }
    });

    it('should handle link with zero use count correctly', async () => {
      const storedLink = createMockStoredLink({ use_count: 0 });
      mockStatement.get.mockReturnValue(storedLink);

      const result = await repository.getById('link-123');

      expect(result?.useCount).toBe(0);
    });

    it('should handle link with very high use count', async () => {
      const storedLink = createMockStoredLink({ use_count: 999999 });
      mockStatement.get.mockReturnValue(storedLink);

      const result = await repository.getById('link-123');

      expect(result?.useCount).toBe(999999);
    });
  });
});
