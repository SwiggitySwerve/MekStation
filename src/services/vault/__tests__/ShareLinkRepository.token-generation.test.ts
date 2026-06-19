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

  describe('edge cases', () => {
    it('should handle all content categories', async () => {
      const categories: ContentCategory[] = [
        'units',
        'pilots',
        'forces',
        'encounters',
      ];

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
      const scopeTypes: PermissionScopeType[] = [
        'item',
        'folder',
        'category',
        'all',
      ];

      for (const scopeType of scopeTypes) {
        mockStatement.run.mockReturnValue({ changes: 1 });
        const result = await repository.create(
          scopeType,
          scopeType === 'item' || scopeType === 'folder' ? 'test-id' : null,
          scopeType === 'category' ? 'units' : null,
          { level: 'read' },
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
