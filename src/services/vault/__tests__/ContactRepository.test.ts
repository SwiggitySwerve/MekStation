/**
 * Contact Repository Tests
 *
 * Tests for contact persistence including CRUD operations and queries.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  ContactRepository,
  getContactRepository,
  resetContactRepository,
} from '@/services/vault/ContactRepository';
import type { IContact, IStoredContact } from '@/types/vault';

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

const createMockStoredContact = (overrides: Partial<IStoredContact> = {}): IStoredContact => ({
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
  overrides: Partial<Omit<IContact, 'id' | 'addedAt'>> = {}
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

  describe('initialize', () => {
    it('should initialize the database and create table', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS vault_contacts')
      );
    });

    it('should create indexes for friend_code, public_key, and added_at', async () => {
      await repository.initialize();

      const execCall = (mockDatabase.exec.mock.calls as string[][])[0][0];
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS idx_vault_contacts_friend_code');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS idx_vault_contacts_public_key');
      expect(execCall).toContain('CREATE INDEX IF NOT EXISTS idx_vault_contacts_added_at');
    });

    it('should only initialize once', async () => {
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalledTimes(1);
      expect(mockDatabase.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Create
  // ===========================================================================

  describe('create', () => {
    it('should create a new contact with generated ID and timestamp', async () => {
      const input = createContactInput();

      const result = await repository.create(input);

      expect(result.id).toBe(`contact-${mockUUID}`);
      expect(result.friendCode).toBe(input.friendCode);
      expect(result.publicKey).toBe(input.publicKey);
      expect(result.displayName).toBe(input.displayName);
      expect(result.addedAt).toBeDefined();
    });

    it('should insert contact into database with correct values', async () => {
      const input = createContactInput({
        nickname: 'Test Nickname',
        isTrusted: true,
        notes: 'Some notes',
      });

      await repository.create(input);

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vault_contacts')
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        `contact-${mockUUID}`,
        input.friendCode,
        input.publicKey,
        input.nickname,
        input.displayName,
        input.avatar,
        expect.any(String), // addedAt
        input.lastSeenAt,
        1, // isTrusted converted to integer
        input.notes
      );
    });

    it('should convert isTrusted boolean to integer 0 when false', async () => {
      const input = createContactInput({ isTrusted: false });

      await repository.create(input);

      // Verify the 9th argument (index 8) is 0 for isTrusted=false
      const runArgs = mockStatement.run.mock.calls[0] as unknown[];
      expect(runArgs[8]).toBe(0); // isTrusted = false -> 0
    });

    it('should initialize if not already initialized', async () => {
      const input = createContactInput();

      await repository.create(input);

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  describe('getById', () => {
    it('should return contact when found', async () => {
      const storedContact = createMockStoredContact();
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getById('contact-test-123');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_contacts WHERE id = ?'
      );
      expect(mockStatement.get).toHaveBeenCalledWith('contact-test-123');
      expect(result).toEqual(createMockContact());
    });

    it('should return null when contact not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should convert is_trusted integer to boolean', async () => {
      const storedContact = createMockStoredContact({ is_trusted: 1 });
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getById('contact-test-123');

      expect(result?.isTrusted).toBe(true);
    });
  });

  describe('getByFriendCode', () => {
    it('should return contact when found by friend code', async () => {
      const storedContact = createMockStoredContact();
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getByFriendCode('ABCD-EFGH-JKLM-NPQR');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_contacts WHERE friend_code = ?'
      );
      expect(mockStatement.get).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR');
      expect(result).not.toBeNull();
    });

    it('should return null when friend code not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getByFriendCode('XXXX-XXXX-XXXX-XXX2');

      expect(result).toBeNull();
    });
  });

  describe('getByPublicKey', () => {
    it('should return contact when found by public key', async () => {
      const storedContact = createMockStoredContact();
      mockStatement.get.mockReturnValue(storedContact);

      const result = await repository.getByPublicKey('test-public-key-base64');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_contacts WHERE public_key = ?'
      );
      expect(mockStatement.get).toHaveBeenCalledWith('test-public-key-base64');
      expect(result).not.toBeNull();
    });

    it('should return null when public key not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getByPublicKey('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all contacts sorted by name', async () => {
      const storedContacts = [
        createMockStoredContact({ id: 'c1', display_name: 'Zoe' }),
        createMockStoredContact({ id: 'c2', display_name: 'Alice' }),
      ];
      mockStatement.all.mockReturnValue(storedContacts);

      const result = await repository.getAll();

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_contacts ORDER BY COALESCE(nickname, display_name)'
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no contacts exist', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });

    it('should convert all contacts from stored format', async () => {
      const storedContacts = [
        createMockStoredContact({ is_trusted: 1 }),
        createMockStoredContact({ id: 'c2', is_trusted: 0 }),
      ];
      mockStatement.all.mockReturnValue(storedContacts);

      const result = await repository.getAll();

      expect(result[0].isTrusted).toBe(true);
      expect(result[1].isTrusted).toBe(false);
    });
  });

  describe('getTrusted', () => {
    it('should return only trusted contacts', async () => {
      const trustedContacts = [
        createMockStoredContact({ id: 'c1', is_trusted: 1 }),
        createMockStoredContact({ id: 'c2', is_trusted: 1 }),
      ];
      mockStatement.all.mockReturnValue(trustedContacts);

      const result = await repository.getTrusted();

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT * FROM vault_contacts WHERE is_trusted = 1 ORDER BY COALESCE(nickname, display_name)'
      );
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.isTrusted)).toBe(true);
    });

    it('should return empty array when no trusted contacts', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getTrusted();

      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should search contacts by nickname, display name, or friend code', async () => {
      const matchingContacts = [createMockStoredContact({ nickname: 'Test' })];
      mockStatement.all.mockReturnValue(matchingContacts);

      const result = await repository.search('Test');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE nickname LIKE ? OR display_name LIKE ? OR friend_code LIKE ?')
      );
      expect(mockStatement.all).toHaveBeenCalledWith('%Test%', '%Test%', '%Test%');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.search('NonExistent');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Update Operations
  // ===========================================================================

  describe('updateNickname', () => {
    it('should update nickname and return true on success', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateNickname('contact-123', 'New Nickname');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET nickname = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('New Nickname', 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateNickname('non-existent', 'Nickname');

      expect(result).toBe(false);
    });

    it('should allow setting nickname to null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateNickname('contact-123', null);

      expect(mockStatement.run).toHaveBeenCalledWith(null, 'contact-123');
      expect(result).toBe(true);
    });
  });

  describe('updateTrusted', () => {
    it('should update trusted status to true', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateTrusted('contact-123', true);

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET is_trusted = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(1, 'contact-123');
      expect(result).toBe(true);
    });

    it('should update trusted status to false', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateTrusted('contact-123', false);

      expect(mockStatement.run).toHaveBeenCalledWith(0, 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateTrusted('non-existent', true);

      expect(result).toBe(false);
    });
  });

  describe('updateNotes', () => {
    it('should update notes and return true on success', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateNotes('contact-123', 'New notes');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET notes = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith('New notes', 'contact-123');
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
        'UPDATE vault_contacts SET last_seen_at = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(timestamp, 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateLastSeen('non-existent', '2024-01-15T10:30:00.000Z');

      expect(result).toBe(false);
    });
  });

  describe('updateFromIdentity', () => {
    it('should update display name and avatar', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateFromIdentity(
        'contact-123',
        'New Display Name',
        'avatar-url'
      );

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'UPDATE vault_contacts SET display_name = ?, avatar = ? WHERE id = ?'
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Display Name',
        'avatar-url',
        'contact-123'
      );
      expect(result).toBe(true);
    });

    it('should allow setting avatar to null', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.updateFromIdentity('contact-123', 'Name', null);

      expect(mockStatement.run).toHaveBeenCalledWith('Name', null, 'contact-123');
      expect(result).toBe(true);
    });

    it('should return false when contact not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.updateFromIdentity('non-existent', 'Name', null);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Delete Operations
  // ===========================================================================

  describe('delete', () => {
    it('should delete contact by ID and return true', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.delete('contact-123');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'DELETE FROM vault_contacts WHERE id = ?'
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
        'DELETE FROM vault_contacts WHERE friend_code = ?'
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

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  describe('exists', () => {
    it('should return true when friend code exists', async () => {
      mockStatement.get.mockReturnValue({ '1': 1 });

      const result = await repository.exists('ABCD-EFGH-JKLM-NPQR');

      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'SELECT 1 FROM vault_contacts WHERE friend_code = ?'
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
        'SELECT COUNT(*) as count FROM vault_contacts'
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no contacts exist', async () => {
      mockStatement.get.mockReturnValue({ count: 0 });

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton
  // ===========================================================================

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

  // ===========================================================================
  // Row Conversion (Private Method via Public Interface)
  // ===========================================================================

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
