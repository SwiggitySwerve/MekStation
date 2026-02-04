/**
 * Contact Service Tests
 *
 * Tests for contact management including adding, updating, and removing contacts.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { ContactService } from '@/services/vault/ContactService';
import type { IContact } from '@/types/vault';

// =============================================================================
// Mock Repository
// =============================================================================

class MockContactRepository {
  private contacts: Map<string, IContact> = new Map();
  private idCounter = 0;

  async create(contact: Omit<IContact, 'id' | 'addedAt'>): Promise<IContact> {
    const id = `contact-mock-${++this.idCounter}`;
    const addedAt = new Date().toISOString();
    const newContact: IContact = {
      id,
      friendCode: contact.friendCode,
      publicKey: contact.publicKey,
      nickname: contact.nickname,
      displayName: contact.displayName,
      avatar: contact.avatar,
      addedAt,
      lastSeenAt: contact.lastSeenAt,
      isTrusted: contact.isTrusted,
      notes: contact.notes,
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async getById(id: string): Promise<IContact | null> {
    return this.contacts.get(id) || null;
  }

  async getByFriendCode(friendCode: string): Promise<IContact | null> {
    return (
      Array.from(this.contacts.values()).find(
        (c) => c.friendCode.toUpperCase() === friendCode.toUpperCase()
      ) || null
    );
  }

  async getByPublicKey(publicKey: string): Promise<IContact | null> {
    return (
      Array.from(this.contacts.values()).find(
        (c) => c.publicKey === publicKey
      ) || null
    );
  }

  async getAll(): Promise<IContact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => {
      const nameA = a.nickname || a.displayName;
      const nameB = b.nickname || b.displayName;
      return nameA.localeCompare(nameB);
    });
  }

  async getTrusted(): Promise<IContact[]> {
    return Array.from(this.contacts.values())
      .filter((c) => c.isTrusted)
      .sort((a, b) => {
        const nameA = a.nickname || a.displayName;
        const nameB = b.nickname || b.displayName;
        return nameA.localeCompare(nameB);
      });
  }

  async search(query: string): Promise<IContact[]> {
    const q = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(
      (c) =>
        c.nickname?.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.friendCode.toLowerCase().includes(q)
    );
  }

  async updateNickname(id: string, nickname: string | null): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.nickname = nickname;
    return true;
  }

  async updateTrusted(id: string, isTrusted: boolean): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.isTrusted = isTrusted;
    return true;
  }

  async updateNotes(id: string, notes: string | null): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.notes = notes;
    return true;
  }

  async updateLastSeen(id: string, lastSeenAt: string): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.lastSeenAt = lastSeenAt;
    return true;
  }

  async updateFromIdentity(
    id: string,
    displayName: string,
    avatar: string | null
  ): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.displayName = displayName;
    contact.avatar = avatar;
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async deleteByFriendCode(friendCode: string): Promise<boolean> {
    const contact = await this.getByFriendCode(friendCode);
    if (!contact) return false;
    return this.contacts.delete(contact.id);
  }

  async exists(friendCode: string): Promise<boolean> {
    return (await this.getByFriendCode(friendCode)) !== null;
  }

  async count(): Promise<number> {
    return this.contacts.size;
  }

  // Helper to reset for tests
  clear(): void {
    this.contacts.clear();
    this.idCounter = 0;
  }
}

// =============================================================================
// Mock Identity Repository
// =============================================================================

const mockIdentityRepo = {
  getActive: jest.fn().mockResolvedValue(null),
};

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => mockIdentityRepo,
}));

// =============================================================================
// Tests
// =============================================================================

describe('ContactService', () => {
  let service: ContactService;
  let mockRepo: MockContactRepository;

  beforeEach(() => {
    mockRepo = new MockContactRepository();
    service = new ContactService(mockRepo as never);
    mockIdentityRepo.getActive.mockResolvedValue(null);
  });

  // ===========================================================================
  // Adding Contacts
  // ===========================================================================

  describe('addContact', () => {
    it('should add a contact with valid friend code', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact).toBeDefined();
        expect(result.data.contact.friendCode).toBe('ABCD-EFGH-JKLM-NPQR');
      }
    });

    it('should reject invalid friend code format', async () => {
      const result = await service.addContact({
        friendCode: 'invalid-code',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INVALID_CODE');
      }
    });

    it('should reject friend code with invalid characters', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLO-NPQR', // O is not in alphabet
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('INVALID_CODE');
      }
    });

    it('should prevent adding self as contact', async () => {
      mockIdentityRepo.getActive.mockResolvedValue({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });

      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('SELF_ADD');
      }
    });

    it('should prevent adding duplicate contact', async () => {
      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });

      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errorCode).toBe('ALREADY_EXISTS');
      }
    });

    it('should store nickname when provided', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        nickname: 'Test User',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact.nickname).toBe('Test User');
      }
    });

    it('should store notes when provided', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        notes: 'Met at tournament',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact.notes).toBe('Met at tournament');
      }
    });

    it('should mark as trusted when specified', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        trusted: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact.isTrusted).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Getting Contacts
  // ===========================================================================

  describe('getAllContacts', () => {
    it('should return empty array when no contacts', async () => {
      const contacts = await service.getAllContacts();
      expect(contacts).toHaveLength(0);
    });

    it('should return all contacts sorted by name', async () => {
      await service.addContact({ friendCode: 'ZZZZ-ZZZZ-ZZZZ-ZZZ2' });
      await service.addContact({ friendCode: 'AAAA-AAAA-AAAA-AAA2' });

      const contacts = await service.getAllContacts();
      expect(contacts).toHaveLength(2);
    });
  });

  describe('getContactByFriendCode', () => {
    it('should find contact by friend code', async () => {
      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });

      const contact = await service.getContactByFriendCode('ABCD-EFGH-JKLM-NPQR');
      expect(contact).not.toBeNull();
      expect(contact?.friendCode).toBe('ABCD-EFGH-JKLM-NPQR');
    });

    it('should be case-insensitive', async () => {
      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });

      const contact = await service.getContactByFriendCode('abcd-efgh-jklm-npqr');
      expect(contact).not.toBeNull();
    });

    it('should return null for non-existent contact', async () => {
      const contact = await service.getContactByFriendCode('XXXX-XXXX-XXXX-XXX2');
      expect(contact).toBeNull();
    });
  });

  describe('searchContacts', () => {
    beforeEach(async () => {
      await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        nickname: 'Alice',
      });
      await service.addContact({
        friendCode: 'WXYZ-WXYZ-WXYZ-WXY2',
        nickname: 'Bob',
      });
    });

    it('should find contacts by nickname', async () => {
      const contacts = await service.searchContacts('Alice');
      expect(contacts).toHaveLength(1);
      expect(contacts[0].nickname).toBe('Alice');
    });

    it('should find contacts by partial friend code', async () => {
      const contacts = await service.searchContacts('ABCD');
      expect(contacts).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const contacts = await service.searchContacts('NonExistent');
      expect(contacts).toHaveLength(0);
    });
  });

  describe('getTrustedContacts', () => {
    it('should return only trusted contacts', async () => {
      await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        trusted: true,
      });
      await service.addContact({
        friendCode: 'WXYZ-WXYZ-WXYZ-WXY2',
        trusted: false,
      });

      const trusted = await service.getTrustedContacts();
      expect(trusted).toHaveLength(1);
      expect(trusted[0].isTrusted).toBe(true);
    });
  });

  // ===========================================================================
  // Updating Contacts
  // ===========================================================================

  describe('setNickname', () => {
    it('should update nickname', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });
      const id = result.success ? result.data.contact.id : '';

      const updated = await service.setNickname(id, 'New Nickname');
      expect(updated).toBe(true);

      const contact = await service.getContact(id);
      expect(contact?.nickname).toBe('New Nickname');
    });

    it('should clear nickname when set to null', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        nickname: 'Original',
      });
      const id = result.success ? result.data.contact.id : '';

      await service.setNickname(id, null);

      const contact = await service.getContact(id);
      expect(contact?.nickname).toBeNull();
    });

    it('should return false for non-existent contact', async () => {
      const updated = await service.setNickname('non-existent', 'Name');
      expect(updated).toBe(false);
    });
  });

  describe('setTrusted', () => {
    it('should update trust status', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });
      const id = result.success ? result.data.contact.id : '';

      await service.setTrusted(id, true);
      let contact = await service.getContact(id);
      expect(contact?.isTrusted).toBe(true);

      await service.setTrusted(id, false);
      contact = await service.getContact(id);
      expect(contact?.isTrusted).toBe(false);
    });
  });

  describe('setNotes', () => {
    it('should update notes', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });
      const id = result.success ? result.data.contact.id : '';

      await service.setNotes(id, 'These are my notes');

      const contact = await service.getContact(id);
      expect(contact?.notes).toBe('These are my notes');
    });
  });

  describe('updateLastSeen', () => {
    it('should update last seen timestamp', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });
      const id = result.success ? result.data.contact.id : '';

      const beforeUpdate = await service.getContact(id);
      expect(beforeUpdate?.lastSeenAt).toBeNull();

      await service.updateLastSeen(id);

      const afterUpdate = await service.getContact(id);
      expect(afterUpdate?.lastSeenAt).not.toBeNull();
    });
  });

  // ===========================================================================
  // Removing Contacts
  // ===========================================================================

  describe('removeContact', () => {
    it('should remove contact by ID', async () => {
      const result = await service.addContact({
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
      });
      const id = result.success ? result.data.contact.id : '';

      const removed = await service.removeContact(id);
      expect(removed).toBe(true);

      const contact = await service.getContact(id);
      expect(contact).toBeNull();
    });

    it('should return false for non-existent contact', async () => {
      const removed = await service.removeContact('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('removeContactByFriendCode', () => {
    it('should remove contact by friend code', async () => {
      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });

      const removed = await service.removeContactByFriendCode('ABCD-EFGH-JKLM-NPQR');
      expect(removed).toBe(true);

      const contact = await service.getContactByFriendCode('ABCD-EFGH-JKLM-NPQR');
      expect(contact).toBeNull();
    });
  });

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  describe('isContact', () => {
    it('should return true for existing contact', async () => {
      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });

      const exists = await service.isContact('ABCD-EFGH-JKLM-NPQR');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent contact', async () => {
      const exists = await service.isContact('XXXX-XXXX-XXXX-XXX2');
      expect(exists).toBe(false);
    });
  });

  describe('getContactCount', () => {
    it('should return correct count', async () => {
      expect(await service.getContactCount()).toBe(0);

      await service.addContact({ friendCode: 'ABCD-EFGH-JKLM-NPQR' });
      expect(await service.getContactCount()).toBe(1);

      await service.addContact({ friendCode: 'WXYZ-WXYZ-WXYZ-WXY2' });
      expect(await service.getContactCount()).toBe(2);
    });
  });

  describe('getDisplayName', () => {
    it('should prefer nickname over display name', () => {
      const contact: IContact = {
        id: 'test',
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        publicKey: 'key',
        nickname: 'Nickname',
        displayName: 'Display Name',
        avatar: null,
        addedAt: new Date().toISOString(),
        lastSeenAt: null,
        isTrusted: false,
        notes: null,
      };

      expect(service.getDisplayName(contact)).toBe('Nickname');
    });

    it('should fall back to display name when no nickname', () => {
      const contact: IContact = {
        id: 'test',
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        publicKey: 'key',
        nickname: null,
        displayName: 'Display Name',
        avatar: null,
        addedAt: new Date().toISOString(),
        lastSeenAt: null,
        isTrusted: false,
        notes: null,
      };

      expect(service.getDisplayName(contact)).toBe('Display Name');
    });

    it('should fall back to friend code when no names', () => {
      const contact: IContact = {
        id: 'test',
        friendCode: 'ABCD-EFGH-JKLM-NPQR',
        publicKey: 'key',
        nickname: null,
        displayName: '',
        avatar: null,
        addedAt: new Date().toISOString(),
        lastSeenAt: null,
        isTrusted: false,
        notes: null,
      };

      expect(service.getDisplayName(contact)).toBe('ABCD-EFGH-JKLM-NPQR');
    });
  });
});
