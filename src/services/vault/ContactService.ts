/**
 * Contact Service
 *
 * Handles contact management including adding, updating, and removing contacts.
 * Provides validation and lookup by friend code.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IContact,
  IAddContactOptions,
  IAddContactResult,
} from '@/types/vault';

import { createSingleton } from '../core/createSingleton';
import { ContactRepository, getContactRepository } from './ContactRepository';
import { getIdentityRepository } from './IdentityRepository';
import { isValidFriendCode, decodeFriendCode } from './IdentityService';

// =============================================================================
// Types
// =============================================================================

/**
 * Contact lookup result (for finding public info from friend code)
 */
export interface IContactLookupResult {
  success: boolean;
  displayName?: string;
  publicKey?: string;
  avatar?: string | null;
  error?: string;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Service for managing vault contacts
 */
export class ContactService {
  private repository: ContactRepository;

  constructor(repository?: ContactRepository) {
    this.repository = repository ?? getContactRepository();
  }

  /**
   * Add a new contact by friend code
   */
  async addContact(options: IAddContactOptions): Promise<IAddContactResult> {
    const { friendCode, nickname, notes, trusted } = options;

    // Validate friend code format
    if (!isValidFriendCode(friendCode)) {
      return {
        success: false,
        error: {
          message: 'Invalid friend code format',
          errorCode: 'INVALID_CODE' as const,
        },
      };
    }

    // Check if adding self
    try {
      const identityRepo = getIdentityRepository();
      const identity = await identityRepo.getActive();
      if (
        identity &&
        identity.friendCode.toUpperCase() === friendCode.toUpperCase()
      ) {
        return {
          success: false,
          error: {
            message: 'Cannot add yourself as a contact',
            errorCode: 'SELF_ADD' as const,
          },
        };
      }
    } catch {
      // Identity not initialized, allow adding contact
    }

    // Check if contact already exists
    const existing = await this.repository.getByFriendCode(
      friendCode.toUpperCase(),
    );
    if (existing) {
      return {
        success: false,
        error: {
          message: 'Contact already exists',
          errorCode: 'ALREADY_EXISTS' as const,
        },
      };
    }

    // Derive public key prefix from friend code
    let publicKeyPrefix: string;
    try {
      const decoded = decodeFriendCode(friendCode);
      // Store the decoded prefix as hex for now
      // In a real P2P scenario, we'd fetch the full public key via discovery
      publicKeyPrefix = Array.from(decoded)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (_err) {
      return {
        success: false,
        error: {
          message: 'Failed to decode friend code',
          errorCode: 'INVALID_CODE' as const,
        },
      };
    }

    // Create the contact
    // Note: displayName defaults to friend code until we get actual info from peer
    const contact = await this.repository.create({
      friendCode: friendCode.toUpperCase(),
      publicKey: publicKeyPrefix, // Partial key from friend code
      nickname: nickname ?? null,
      displayName: friendCode.toUpperCase(), // Default to friend code
      avatar: null,
      lastSeenAt: null,
      isTrusted: trusted ?? false,
      notes: notes ?? null,
    });

    return {
      success: true,
      data: { contact },
    };
  }

  /**
   * Get all contacts
   */
  async getAllContacts(): Promise<IContact[]> {
    return this.repository.getAll();
  }

  /**
   * Get contact by ID
   */
  async getContact(id: string): Promise<IContact | null> {
    return this.repository.getById(id);
  }

  /**
   * Get contact by friend code
   */
  async getContactByFriendCode(friendCode: string): Promise<IContact | null> {
    return this.repository.getByFriendCode(friendCode.toUpperCase());
  }

  /**
   * Search contacts by name or friend code
   */
  async searchContacts(query: string): Promise<IContact[]> {
    return this.repository.search(query);
  }

  /**
   * Get trusted contacts only
   */
  async getTrustedContacts(): Promise<IContact[]> {
    return this.repository.getTrusted();
  }

  /**
   * Update contact nickname
   */
  async setNickname(id: string, nickname: string | null): Promise<boolean> {
    return this.repository.updateNickname(id, nickname?.trim() || null);
  }

  /**
   * Update contact trust status
   */
  async setTrusted(id: string, isTrusted: boolean): Promise<boolean> {
    return this.repository.updateTrusted(id, isTrusted);
  }

  /**
   * Update contact notes
   */
  async setNotes(id: string, notes: string | null): Promise<boolean> {
    return this.repository.updateNotes(id, notes?.trim() || null);
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(id: string): Promise<boolean> {
    return this.repository.updateLastSeen(id, new Date().toISOString());
  }

  /**
   * Update contact info from peer handshake
   */
  async updateFromPeer(
    friendCode: string,
    displayName: string,
    publicKey: string,
    avatar: string | null,
  ): Promise<boolean> {
    const contact = await this.repository.getByFriendCode(friendCode);
    if (!contact) return false;

    // Update display info and public key from peer
    const updated = await this.repository.updateFromIdentity(
      contact.id,
      displayName,
      avatar,
    );

    // If we have a full public key, update it too
    if (updated && publicKey && publicKey.length > contact.publicKey.length) {
      // Need to update public key directly - add a method to repository
      const { getSQLiteService } = await import('@/services/persistence');
      const db = getSQLiteService().getDatabase();
      db.prepare('UPDATE vault_contacts SET public_key = ? WHERE id = ?').run(
        publicKey,
        contact.id,
      );
    }

    return updated;
  }

  /**
   * Remove a contact
   */
  async removeContact(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Remove a contact by friend code
   */
  async removeContactByFriendCode(friendCode: string): Promise<boolean> {
    return this.repository.deleteByFriendCode(friendCode.toUpperCase());
  }

  /**
   * Check if a friend code is already a contact
   */
  async isContact(friendCode: string): Promise<boolean> {
    return this.repository.exists(friendCode.toUpperCase());
  }

  /**
   * Get contact count
   */
  async getContactCount(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Get display name for a contact (nickname > displayName > friend code)
   */
  getDisplayName(contact: IContact): string {
    return contact.nickname || contact.displayName || contact.friendCode;
  }
}

// =============================================================================
// Singleton
// =============================================================================

const contactServiceFactory = createSingleton(() => new ContactService());

export function getContactService(): ContactService {
  return contactServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetContactService(): void {
  contactServiceFactory.reset();
}
