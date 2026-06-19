import type { IContact } from '@/types/vault';

export class MockContactRepository {
  private contacts: Map<string, IContact> = new Map();
  private idCounter = 0;

  create = async (
    contact: Omit<IContact, 'id' | 'addedAt'>,
  ): Promise<IContact> => {
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
  };

  getById = async (id: string): Promise<IContact | null> => {
    return this.contacts.get(id) || null;
  };

  getByFriendCode = async (friendCode: string): Promise<IContact | null> => {
    return (
      Array.from(this.contacts.values()).find(
        (c) => c.friendCode.toUpperCase() === friendCode.toUpperCase(),
      ) || null
    );
  };

  getByPublicKey = async (publicKey: string): Promise<IContact | null> => {
    return (
      Array.from(this.contacts.values()).find(
        (c) => c.publicKey === publicKey,
      ) || null
    );
  };

  getAll = async (): Promise<IContact[]> => {
    return Array.from(this.contacts.values()).sort((a, b) => {
      const nameA = a.nickname || a.displayName;
      const nameB = b.nickname || b.displayName;
      return nameA.localeCompare(nameB);
    });
  };

  getTrusted = async (): Promise<IContact[]> => {
    return Array.from(this.contacts.values())
      .filter((c) => c.isTrusted)
      .sort((a, b) => {
        const nameA = a.nickname || a.displayName;
        const nameB = b.nickname || b.displayName;
        return nameA.localeCompare(nameB);
      });
  };

  search = async (query: string): Promise<IContact[]> => {
    const q = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(
      (c) =>
        c.nickname?.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.friendCode.toLowerCase().includes(q),
    );
  };

  updateNickname = async (
    id: string,
    nickname: string | null,
  ): Promise<boolean> => {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.nickname = nickname;
    return true;
  };

  updateTrusted = async (id: string, isTrusted: boolean): Promise<boolean> => {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.isTrusted = isTrusted;
    return true;
  };

  updateNotes = async (id: string, notes: string | null): Promise<boolean> => {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.notes = notes;
    return true;
  };

  updateLastSeen = async (id: string, lastSeenAt: string): Promise<boolean> => {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.lastSeenAt = lastSeenAt;
    return true;
  };

  updateFromIdentity = async (
    id: string,
    displayName: string,
    avatar: string | null,
  ): Promise<boolean> => {
    const contact = this.contacts.get(id);
    if (!contact) return false;
    contact.displayName = displayName;
    contact.avatar = avatar;
    return true;
  };

  delete = async (id: string): Promise<boolean> => {
    return this.contacts.delete(id);
  };

  deleteByFriendCode = async (friendCode: string): Promise<boolean> => {
    const contact = await this.getByFriendCode(friendCode);
    if (!contact) return false;
    return this.contacts.delete(contact.id);
  };

  exists = async (friendCode: string): Promise<boolean> => {
    return (await this.getByFriendCode(friendCode)) !== null;
  };

  count = async (): Promise<number> => {
    return this.contacts.size;
  };

  // Helper to reset for tests
  clear = (): void => {
    this.contacts.clear();
    this.idCounter = 0;
  };
}
