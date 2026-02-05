/**
 * Identity Repository Tests
 *
 * Comprehensive tests for the IdentityRepository class covering
 * identity persistence, retrieval, and management operations.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IStoredIdentity, IEncryptedData } from '@/types/vault';

import {
  IdentityRepository,
  getIdentityRepository,
} from '../IdentityRepository';

// =============================================================================
// Mock Setup
// =============================================================================

interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

interface StoredIdentityRow {
  id: string;
  display_name: string;
  public_key: string;
  encrypted_private_key: string;
  friend_code: string;
  created_at: string;
  avatar: string | null;
  is_active: number;
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

// =============================================================================
// Test Data Helpers
// =============================================================================

const createMockEncryptedData = (
  overrides: Partial<IEncryptedData> = {},
): IEncryptedData => ({
  ciphertext: 'encrypted-private-key-base64',
  iv: 'initialization-vector-base64',
  salt: 'salt-base64',
  algorithm: 'AES-GCM-256',
  ...overrides,
});

const createMockStoredIdentity = (
  overrides: Partial<IStoredIdentity> = {},
): IStoredIdentity => ({
  id: 'identity-test-123',
  displayName: 'Test User',
  publicKey: 'public-key-base64',
  encryptedPrivateKey: createMockEncryptedData(),
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  createdAt: '2024-01-01T00:00:00.000Z',
  avatar: undefined,
  ...overrides,
});

const createMockStoredIdentityRow = (
  overrides: Partial<StoredIdentityRow> = {},
): StoredIdentityRow => ({
  id: 'identity-test-123',
  display_name: 'Test User',
  public_key: 'public-key-base64',
  encrypted_private_key: JSON.stringify(createMockEncryptedData()),
  friend_code: 'ABCD-EFGH-JKLM-NPQR',
  created_at: '2024-01-01T00:00:00.000Z',
  avatar: null,
  is_active: 1,
  ...overrides,
});

// =============================================================================
// Singleton Reset Helper
// =============================================================================

// Access internal module state for reset
function resetIdentityRepository(): void {
  // Reset is handled by jest.clearAllMocks()
}

// =============================================================================
// Tests
// =============================================================================

describe('IdentityRepository', () => {
  let repository: IdentityRepository;
  let mockStatement: MockStatement;

  beforeEach(() => {
    jest.clearAllMocks();
    resetIdentityRepository();
    repository = new IdentityRepository();

    mockStatement = createMockStatement();
    mockDb.prepare.mockReturnValue(mockStatement);
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should create identity table on first call', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS vault_identities'),
      );
    });

    it('should create required columns', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('id TEXT PRIMARY KEY'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('display_name TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('public_key TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('encrypted_private_key TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('friend_code TEXT NOT NULL UNIQUE'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('created_at TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('avatar TEXT'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('is_active INTEGER DEFAULT 0'),
      );
    });

    it('should create friend_code index', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_vault_identities_friend_code',
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

  // ===========================================================================
  // Save
  // ===========================================================================

  describe('save', () => {
    it('should save a new identity', async () => {
      const identity = createMockStoredIdentity();

      await repository.save(identity);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vault_identities'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        identity.id,
        identity.displayName,
        identity.publicKey,
        JSON.stringify(identity.encryptedPrivateKey),
        identity.friendCode,
        identity.createdAt,
        null, // avatar
        1, // is_active = 1 by default
      );
    });

    it('should save identity with avatar', async () => {
      const identity = createMockStoredIdentity({ avatar: 'avatar-url-123' });

      await repository.save(identity);

      expect(mockStatement.run).toHaveBeenCalledWith(
        identity.id,
        identity.displayName,
        identity.publicKey,
        JSON.stringify(identity.encryptedPrivateKey),
        identity.friendCode,
        identity.createdAt,
        'avatar-url-123',
        1,
      );
    });

    it('should serialize encrypted private key as JSON', async () => {
      const encryptedKey = createMockEncryptedData({
        ciphertext: 'custom-cipher',
        iv: 'custom-iv',
        salt: 'custom-salt',
      });
      const identity = createMockStoredIdentity({
        encryptedPrivateKey: encryptedKey,
      });

      await repository.save(identity);

      const runArgs = mockStatement.run.mock.calls[0] as unknown[];
      expect(runArgs[3]).toBe(JSON.stringify(encryptedKey));
    });

    it('should initialize repository before saving', async () => {
      const identity = createMockStoredIdentity();

      await repository.save(identity);

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Get Active
  // ===========================================================================

  describe('getActive', () => {
    it('should return active identity when exists', async () => {
      const storedRow = createMockStoredIdentityRow({ is_active: 1 });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getActive();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_identities WHERE is_active = 1 LIMIT 1',
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('identity-test-123');
      expect(result?.displayName).toBe('Test User');
    });

    it('should return null when no active identity', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getActive();

      expect(result).toBeNull();
    });

    it('should parse encrypted private key from JSON', async () => {
      const encryptedKey = createMockEncryptedData({
        ciphertext: 'parsed-cipher',
      });
      const storedRow = createMockStoredIdentityRow({
        encrypted_private_key: JSON.stringify(encryptedKey),
      });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getActive();

      expect(result?.encryptedPrivateKey).toEqual(encryptedKey);
    });

    it('should convert avatar null to undefined', async () => {
      const storedRow = createMockStoredIdentityRow({ avatar: null });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getActive();

      expect(result?.avatar).toBeUndefined();
    });

    it('should preserve avatar when present', async () => {
      const storedRow = createMockStoredIdentityRow({ avatar: 'my-avatar' });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getActive();

      expect(result?.avatar).toBe('my-avatar');
    });
  });

  // ===========================================================================
  // Get By ID
  // ===========================================================================

  describe('getById', () => {
    it('should return identity when found', async () => {
      const storedRow = createMockStoredIdentityRow();
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getById('identity-test-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_identities WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('identity-test-123');
      expect(result?.id).toBe('identity-test-123');
    });

    it('should return null when identity not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Get By Friend Code
  // ===========================================================================

  describe('getByFriendCode', () => {
    it('should return identity when friend code found', async () => {
      const storedRow = createMockStoredIdentityRow({
        friend_code: 'WXYZ-WXYZ-WXYZ-WXY2',
      });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getByFriendCode('wxyz-wxyz-wxyz-wxy2');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_identities WHERE friend_code = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('WXYZ-WXYZ-WXYZ-WXY2');
      expect(result?.friendCode).toBe('WXYZ-WXYZ-WXYZ-WXY2');
    });

    it('should uppercase friend code for lookup', async () => {
      mockStatement.get.mockReturnValue(undefined);

      await repository.getByFriendCode('abcd-efgh-jklm-npqr');

      expect(mockStatement.get).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR');
    });

    it('should return null when friend code not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getByFriendCode('XXXX-XXXX-XXXX-XXX2');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Get All
  // ===========================================================================

  describe('getAll', () => {
    it('should return all identities sorted by created_at DESC', async () => {
      const rows = [
        createMockStoredIdentityRow({
          id: 'id-1',
          created_at: '2024-03-01T00:00:00.000Z',
        }),
        createMockStoredIdentityRow({
          id: 'id-2',
          created_at: '2024-02-01T00:00:00.000Z',
        }),
        createMockStoredIdentityRow({
          id: 'id-3',
          created_at: '2024-01-01T00:00:00.000Z',
        }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = await repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_identities ORDER BY created_at DESC',
      );
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('id-1');
    });

    it('should return empty array when no identities', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });

    it('should convert all rows correctly', async () => {
      const rows = [
        createMockStoredIdentityRow({ avatar: 'avatar1' }),
        createMockStoredIdentityRow({ id: 'id-2', avatar: null }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = await repository.getAll();

      expect(result[0].avatar).toBe('avatar1');
      expect(result[1].avatar).toBeUndefined();
    });
  });

  // ===========================================================================
  // Set Active
  // ===========================================================================

  describe('setActive', () => {
    it('should deactivate all identities then activate specified one', async () => {
      await repository.setActive('identity-123');

      expect(mockDb.exec).toHaveBeenCalledWith(
        'UPDATE vault_identities SET is_active = 0',
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_identities SET is_active = 1 WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('identity-123');
    });

    it('should initialize before setting active', async () => {
      await repository.setActive('identity-123');

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Update
  // ===========================================================================

  describe('update', () => {
    it('should update display name only', async () => {
      await repository.update('identity-123', { displayName: 'New Name' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_identities SET display_name = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Name',
        'identity-123',
      );
    });

    it('should update avatar only', async () => {
      await repository.update('identity-123', { avatar: 'new-avatar' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_identities SET avatar = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'new-avatar',
        'identity-123',
      );
    });

    it('should update both display name and avatar', async () => {
      await repository.update('identity-123', {
        displayName: 'Updated Name',
        avatar: 'updated-avatar',
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE vault_identities SET display_name = ?, avatar = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'Updated Name',
        'updated-avatar',
        'identity-123',
      );
    });

    it('should handle empty string avatar as null', async () => {
      await repository.update('identity-123', { avatar: '' });

      expect(mockStatement.run).toHaveBeenCalledWith(null, 'identity-123');
    });

    it('should do nothing when no updates provided', async () => {
      await repository.update('identity-123', {});

      // prepare should only be called for initialization, not for update
      expect(mockDb.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vault_identities SET'),
      );
    });

    it('should handle undefined avatar to clear it', async () => {
      // When avatar is explicitly set but empty, it should become null
      await repository.update('identity-123', { avatar: '' });

      expect(mockStatement.run).toHaveBeenCalledWith(null, 'identity-123');
    });
  });

  // ===========================================================================
  // Delete
  // ===========================================================================

  describe('delete', () => {
    it('should delete identity by ID', async () => {
      await repository.delete('identity-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_identities WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('identity-123');
    });

    it('should initialize before deleting', async () => {
      await repository.delete('identity-123');

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Has Identity
  // ===========================================================================

  describe('hasIdentity', () => {
    it('should return true when at least one identity exists', async () => {
      mockStatement.get.mockReturnValue({ count: 1 });

      const result = await repository.hasIdentity();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM vault_identities',
      );
      expect(result).toBe(true);
    });

    it('should return true when multiple identities exist', async () => {
      mockStatement.get.mockReturnValue({ count: 5 });

      const result = await repository.hasIdentity();

      expect(result).toBe(true);
    });

    it('should return false when no identities exist', async () => {
      mockStatement.get.mockReturnValue({ count: 0 });

      const result = await repository.hasIdentity();

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Singleton Functions
  // ===========================================================================

  describe('getIdentityRepository', () => {
    it('should return singleton instance', () => {
      const instance1 = getIdentityRepository();
      const instance2 = getIdentityRepository();

      expect(instance1).toBe(instance2);
    });
  });

  // ===========================================================================
  // Row Conversion
  // ===========================================================================

  describe('rowToIdentity conversion', () => {
    it('should correctly map all stored fields', async () => {
      const encryptedKey: IEncryptedData = {
        ciphertext: 'full-cipher',
        iv: 'full-iv',
        salt: 'full-salt',
        algorithm: 'AES-GCM-256',
      };

      const storedRow: StoredIdentityRow = {
        id: 'identity-full',
        display_name: 'Full Name',
        public_key: 'full-public-key',
        encrypted_private_key: JSON.stringify(encryptedKey),
        friend_code: 'FULL-CODE-FULL-CODE',
        created_at: '2024-06-15T12:00:00.000Z',
        avatar: 'full-avatar',
        is_active: 1,
      };
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getById('identity-full');

      expect(result).toEqual({
        id: 'identity-full',
        displayName: 'Full Name',
        publicKey: 'full-public-key',
        encryptedPrivateKey: encryptedKey,
        friendCode: 'FULL-CODE-FULL-CODE',
        createdAt: '2024-06-15T12:00:00.000Z',
        avatar: 'full-avatar',
      });
    });

    it('should handle avatar conversion from null to undefined', async () => {
      const storedRow = createMockStoredIdentityRow({ avatar: null });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getById('identity-test');

      expect(result?.avatar).toBeUndefined();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in display name', async () => {
      const identity = createMockStoredIdentity({
        displayName: 'User "Special" <Test> & More',
      });

      await repository.save(identity);

      const runArgs = mockStatement.run.mock.calls[0] as unknown[];
      expect(runArgs[1]).toBe('User "Special" <Test> & More');
    });

    it('should handle unicode in display name', async () => {
      const storedRow = createMockStoredIdentityRow({
        display_name: '??????',
      });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getById('identity-test');

      expect(result?.displayName).toBe('??????');
    });

    it('should handle complex encrypted key structure', async () => {
      const complexKey: IEncryptedData = {
        ciphertext: 'very-long-ciphertext-'.repeat(100),
        iv: 'long-iv-value',
        salt: 'long-salt-value',
        algorithm: 'AES-GCM-256',
      };

      const storedRow = createMockStoredIdentityRow({
        encrypted_private_key: JSON.stringify(complexKey),
      });
      mockStatement.get.mockReturnValue(storedRow);

      const result = await repository.getById('identity-test');

      expect(result?.encryptedPrivateKey.ciphertext).toBe(
        complexKey.ciphertext,
      );
    });

    it('should handle friend code with different formats', async () => {
      // Friend codes should be uppercased for consistency
      mockStatement.get.mockReturnValue(undefined);

      await repository.getByFriendCode('abcd-EFGH-jklm-NPQR');

      expect(mockStatement.get).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR');
    });

    it('should handle empty avatar string as null in update', async () => {
      await repository.update('identity-123', { avatar: '' });

      const runArgs = mockStatement.run.mock.calls[0] as unknown[];
      expect(runArgs[0]).toBeNull();
    });
  });
});
