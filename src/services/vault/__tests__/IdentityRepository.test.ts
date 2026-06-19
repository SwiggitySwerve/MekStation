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
});
