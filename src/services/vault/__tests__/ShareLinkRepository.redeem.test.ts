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
        expect.stringContaining('UPDATE vault_share_links'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SET use_count = use_count + 1'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token = ?'),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = 1'),
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

  describe('deactivate', () => {
    it('should deactivate an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.deactivate('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET is_active = 0 WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deactivate('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('should reactivate an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.reactivate('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET is_active = 1 WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.reactivate('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateLabel', () => {
    it('should update the label', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateLabel('link-123', 'New Label');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET label = ? WHERE id = ?',
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

  describe('updateExpiry', () => {
    it('should update the expiry date', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const newExpiry = '2025-06-01T00:00:00.000Z';

      const result = await repository.updateExpiry('link-123', newExpiry);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET expires_at = ? WHERE id = ?',
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

      const result = await repository.updateExpiry(
        'non-existent',
        '2025-01-01T00:00:00.000Z',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateMaxUses', () => {
    it('should update max uses', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateMaxUses('link-123', 20);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_share_links SET max_uses = ? WHERE id = ?',
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

  describe('delete', () => {
    it('should delete an existing link', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.delete('link-123');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('link-123');
    });

    it('should return false when link does not exist', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByItem', () => {
    it('should delete all links for an item', async () => {
      mockStatement.run.mockReturnValue({ changes: 3 });

      const result = await repository.deleteByItem('item', 'unit-123');

      expect(result).toBe(3);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE scope_type = ? AND scope_id = ?',
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

  describe('cleanupExpired', () => {
    it('should delete expired links', async () => {
      mockStatement.run.mockReturnValue({ changes: 5 });

      const result = await repository.cleanupExpired();

      expect(result).toBe(5);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_share_links WHERE expires_at IS NOT NULL AND expires_at < ?',
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
});
