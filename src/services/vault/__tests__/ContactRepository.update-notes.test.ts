/**
 * Contact Repository Tests
 *
 * Tests for contact persistence including CRUD operations and queries.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IContact, IStoredContact } from '@/types/vault';

import {
  ContactRepository,
  getContactRepository,
  resetContactRepository,
} from '@/services/vault/ContactRepository';

// =============================================================================
// Mock SQLite Service
// =============================================================================

interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

interface MockDatabase {
  exec: jest.Mock;
  prepare: jest.Mock;
}

const createMockStatement = (): MockStatement => ({
  run: jest.fn().mockReturnValue({ changes: 1 }),
  get: jest.fn(),
  all: jest.fn().mockReturnValue([]),
});

const mockStatement = createMockStatement();

const mockDatabase: MockDatabase = {
  exec: jest.fn(),
  prepare: jest.fn().mockReturnValue(mockStatement),
};

const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDatabase),
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
// Test Helpers
// =============================================================================

const createMockStoredContact = (
  overrides: Partial<IStoredContact> = {},
): IStoredContact => ({
  id: 'contact-test-123',
  friend_code: 'ABCD-EFGH-JKLM-NPQR',
  public_key: 'test-public-key-base64',
  nickname: null,
  display_name: 'Test User',
  avatar: null,
  added_at: '2024-01-01T00:00:00.000Z',
  last_seen_at: null,
  is_trusted: 0,
  notes: null,
  ...overrides,
});

const createMockContact = (overrides: Partial<IContact> = {}): IContact => ({
  id: 'contact-test-123',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  publicKey: 'test-public-key-base64',
  nickname: null,
  displayName: 'Test User',
  avatar: null,
  addedAt: '2024-01-01T00:00:00.000Z',
  lastSeenAt: null,
  isTrusted: false,
  notes: null,
  ...overrides,
});

const createContactInput = (
  overrides: Partial<Omit<IContact, 'id' | 'addedAt'>> = {},
): Omit<IContact, 'id' | 'addedAt'> => ({
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  publicKey: 'test-public-key-base64',
  nickname: null,
  displayName: 'Test User',
  avatar: null,
  lastSeenAt: null,
  isTrusted: false,
  notes: null,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('ContactRepository', () => {
  let repository: ContactRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    resetContactRepository();
    repository = new ContactRepository();

    // Reset mock statement
    mockStatement.run.mockReturnValue({ changes: 1 });
    mockStatement.get.mockReturnValue(undefined);
    mockStatement.all.mockReturnValue([]);
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('updateNotes', () => {
    it('should update notes and return true on success', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateNotes('contact-123', 'New notes');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET notes = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New notes',
        'contact-123',
      );
      expect(result).toBe(true);
    });

    it('should allow setting notes to null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateNotes('contact-123', null);

      expect(mockStatement.run).toHaveBeenCalledWith(null, 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateNotes('non-existent', 'notes');

      expect(result).toBe(false);
    });
  });

  describe('updateLastSeen', () => {
    it('should update last seen timestamp', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const timestamp = '2024-01-15T10:30:00.000Z';

      const result = await repository.updateLastSeen('contact-123', timestamp);

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET last_seen_at = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(timestamp, 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateLastSeen(
        'non-existent',
        '2024-01-15T10:30:00.000Z',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateFromIdentity', () => {
    it('should update display name and avatar', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateFromIdentity(
        'contact-123',
        'New Display Name',
        'avatar-url',
      );

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET display_name = ?, avatar = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Display Name',
        'avatar-url',
        'contact-123',
      );
      expect(result).toBe(true);
    });

    it('should allow setting avatar to null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateFromIdentity(
        'contact-123',
        'Name',
        null,
      );

      expect(mockStatement.run).toHaveBeenCalledWith(
        'Name',
        null,
        'contact-123',
      );
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateFromIdentity(
        'non-existent',
        'Name',
        null,
      );

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete contact by ID and return true', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.delete('contact-123');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_contacts WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByFriendCode', () => {
    it('should delete contact by friend code and return true', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.deleteByFriendCode('ABCD-EFGH-JKLM-NPQR');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_contacts WHERE friend_code = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR');
      expect(result).toBe(true);
    });

    it('should return false when friend code not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deleteByFriendCode('XXXX-XXXX-XXXX-XXX2');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when friend code exists', async () => {
      mockStatement.get.mockReturnValue({ '1': 1 });

      const result = await repository.exists('ABCD-EFGH-JKLM-NPQR');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT 1 FROM vault_contacts WHERE friend_code = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR');
      expect(result).toBe(true);
    });

    it('should return false when friend code does not exist', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.exists('XXXX-XXXX-XXXX-XXX2');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return the total number of contacts', async () => {
      mockStatement.get.mockReturnValue({ count: 5 });

      const result = await repository.count();

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM vault_contacts',
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no contacts exist', async () => {
      mockStatement.get.mockReturnValue({ count: 0 });

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  describe('getContactRepository', () => {
    it('should return the same instance on multiple calls', () => {
      resetContactRepository();

      const instance1 = getContactRepository();
      const instance2 = getContactRepository();

      expect(instance1).toBe(instance2);
    });
  });

  describe('resetContactRepository', () => {
    it('should create a new instance after reset', () => {
      const instance1 = getContactRepository();
      resetContactRepository();
      const instance2 = getContactRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('rowToContact conversion', () => {
    it('should correctly map all stored contact fields to contact fields', async () => {
      const storedContact: IStoredContact = {
        id: 'contact-full-test',
        friend_code: 'WXYZ-WXYZ-WXYZ-WXY2',
        public_key: 'full-public-key',
        nickname: 'Full Nickname',
        display_name: 'Full Display Name',
        avatar: 'avatar-url',
        added_at: '2024-06-15T12:00:00.000Z',
        last_seen_at: '2024-06-15T14:00:00.000Z',
        is_trusted: 1,
        notes: 'Full notes text',
      };
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getById('contact-full-test');

      expect(result).toEqual({
        id: 'contact-full-test',
        friendCode: 'WXYZ-WXYZ-WXYZ-WXY2',
        publicKey: 'full-public-key',
        nickname: 'Full Nickname',
        displayName: 'Full Display Name',
        avatar: 'avatar-url',
        addedAt: '2024-06-15T12:00:00.000Z',
        lastSeenAt: '2024-06-15T14:00:00.000Z',
        isTrusted: true,
        notes: 'Full notes text',
      });
    });

    it('should handle null values correctly', async () => {
      const storedContact: IStoredContact = {
        id: 'contact-null-test',
        friend_code: 'NNNN-NNNN-NNNN-NNN2',
        public_key: 'null-test-key',
        nickname: null,
        display_name: 'Null Test',
        avatar: null,
        added_at: '2024-01-01T00:00:00.000Z',
        last_seen_at: null,
        is_trusted: 0,
        notes: null,
      };
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getById('contact-null-test');

      expect(result?.nickname).toBeNull();
      expect(result?.avatar).toBeNull();
      expect(result?.lastSeenAt).toBeNull();
      expect(result?.notes).toBeNull();
      expect(result?.isTrusted).toBe(false);
    });
  });
});
