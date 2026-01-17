/**
 * Vault Identity Flow Integration Tests
 *
 * Tests the complete identity lifecycle:
 * - Create identity with password
 * - Unlock identity with correct/incorrect password
 * - Sign messages with identity
 * - Verify signatures
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  createIdentity,
  unlockIdentity,
  signMessage,
  verifyMessage,
  getPublicIdentity,
  encodeFriendCode,
  decodeFriendCode,
  friendCodeMatchesPublicKey,
  isValidFriendCode,
  fromBase64,
} from '@/services/vault/IdentityService';
import type { IStoredIdentity, IVaultIdentity } from '@/types/vault';

// =============================================================================
// Test Configuration
// =============================================================================

// Skip tests if required APIs are not available (e.g., in some Node.js versions)
const hasRequiredEnvironment = async (): Promise<boolean> => {
  try {
    // Check for TextEncoder (required for crypto operations)
    if (typeof TextEncoder === 'undefined') {
      return false;
    }

    const crypto = await import('crypto');
    const testKeyPair = await crypto.webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify']
    );
    return !!testKeyPair;
  } catch {
    return false;
  }
};

// =============================================================================
// Identity Creation Tests
// =============================================================================

describe('Vault Identity Flow Integration', () => {
  let envAvailable: boolean;

  beforeAll(async () => {
    envAvailable = await hasRequiredEnvironment();
    if (!envAvailable) {
      console.log('Skipping crypto tests: required APIs not available in this environment');
    }
  });

  describe('Identity Creation and Encryption', () => {
    it('should create identity with encrypted private key', async () => {
      if (!envAvailable) return;

      const displayName = 'TestUser';
      const password = 'securePassword123';

      const stored = await createIdentity(displayName, password);

      expect(stored.id).toBeDefined();
      expect(stored.displayName).toBe(displayName);
      expect(stored.publicKey).toBeDefined();
      expect(stored.friendCode).toBeDefined();
      expect(stored.encryptedPrivateKey).toBeDefined();
      expect(stored.encryptedPrivateKey.algorithm).toBe('AES-GCM-256');
      expect(stored.createdAt).toBeDefined();
    });

    it('should generate valid friend code from public key', async () => {
      if (!envAvailable) return;

      const stored = await createIdentity('FriendCodeTest', 'password123');

      expect(isValidFriendCode(stored.friendCode)).toBe(true);
      expect(stored.friendCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      // Friend code should match the public key
      const publicKeyBytes = fromBase64(stored.publicKey);
      expect(friendCodeMatchesPublicKey(stored.friendCode, publicKeyBytes)).toBe(true);
    });

    it('should create unique identities each time', async () => {
      if (!envAvailable) return;

      const stored1 = await createIdentity('User1', 'password123');
      const stored2 = await createIdentity('User2', 'password456');

      expect(stored1.id).not.toBe(stored2.id);
      expect(stored1.publicKey).not.toBe(stored2.publicKey);
      expect(stored1.friendCode).not.toBe(stored2.friendCode);
    });
  });

  describe('Identity Unlock Flow', () => {
    let storedIdentity: IStoredIdentity;
    const testPassword = 'correctPassword123';

    beforeAll(async () => {
      if (!envAvailable) return;
      storedIdentity = await createIdentity('UnlockTestUser', testPassword);
    });

    it('should unlock identity with correct password', async () => {
      if (!envAvailable) return;

      const unlocked = await unlockIdentity(storedIdentity, testPassword);

      expect(unlocked.id).toBe(storedIdentity.id);
      expect(unlocked.displayName).toBe(storedIdentity.displayName);
      expect(unlocked.publicKey).toBe(storedIdentity.publicKey);
      expect(unlocked.privateKey).toBeDefined();
      expect(unlocked.privateKey).not.toBe(''); // Private key should be decrypted
    });

    it('should fail to unlock identity with incorrect password', async () => {
      if (!envAvailable) return;

      await expect(
        unlockIdentity(storedIdentity, 'wrongPassword')
      ).rejects.toThrow();
    });

    it('should produce consistent results with same password', async () => {
      if (!envAvailable) return;

      const unlocked1 = await unlockIdentity(storedIdentity, testPassword);
      const unlocked2 = await unlockIdentity(storedIdentity, testPassword);

      expect(unlocked1.privateKey).toBe(unlocked2.privateKey);
      expect(unlocked1.publicKey).toBe(unlocked2.publicKey);
    });
  });

  describe('Message Signing and Verification', () => {
    let identity: IVaultIdentity;

    beforeAll(async () => {
      if (!envAvailable) return;
      const stored = await createIdentity('SigningTestUser', 'signingPassword');
      identity = await unlockIdentity(stored, 'signingPassword');
    });

    it('should sign a message and verify signature', async () => {
      if (!envAvailable) return;

      const message = 'Hello, this is a test message!';
      const signature = await signMessage(message, identity);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);

      const publicIdentity = getPublicIdentity(identity);
      const isValid = await verifyMessage(message, signature, publicIdentity);

      expect(isValid).toBe(true);
    });

    it('should fail verification with tampered message', async () => {
      if (!envAvailable) return;

      const originalMessage = 'Original message';
      const tamperedMessage = 'Tampered message';

      const signature = await signMessage(originalMessage, identity);
      const publicIdentity = getPublicIdentity(identity);

      const isValid = await verifyMessage(tamperedMessage, signature, publicIdentity);

      expect(isValid).toBe(false);
    });

    it('should fail verification with different signer', async () => {
      if (!envAvailable) return;

      const message = 'Test message';
      const signature = await signMessage(message, identity);

      // Create a different identity
      const otherStored = await createIdentity('OtherUser', 'otherPassword');
      const otherIdentity = await unlockIdentity(otherStored, 'otherPassword');
      const otherPublicIdentity = getPublicIdentity(otherIdentity);

      const isValid = await verifyMessage(message, signature, otherPublicIdentity);

      expect(isValid).toBe(false);
    });

    it('should sign complex JSON payloads', async () => {
      if (!envAvailable) return;

      const complexPayload = JSON.stringify({
        units: [
          { id: 'unit-1', name: 'Atlas AS7-D', tonnage: 100 },
          { id: 'unit-2', name: 'Locust LCT-1V', tonnage: 20 },
        ],
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      });

      const signature = await signMessage(complexPayload, identity);
      const publicIdentity = getPublicIdentity(identity);
      const isValid = await verifyMessage(complexPayload, signature, publicIdentity);

      expect(isValid).toBe(true);
    });
  });

  describe('Friend Code Round-Trip', () => {
    it('should encode and decode friend codes correctly', async () => {
      if (!envAvailable) return;

      const stored = await createIdentity('FriendCodeRoundTrip', 'password123');
      const publicKeyBytes = fromBase64(stored.publicKey);

      // Encode friend code
      const friendCode = encodeFriendCode(publicKeyBytes);
      expect(friendCode).toBe(stored.friendCode);

      // Decode friend code back to bytes
      const decodedBytes = decodeFriendCode(friendCode);

      // First 10 bytes should match
      expect(decodedBytes).toEqual(publicKeyBytes.slice(0, 10));
    });

    it('should validate friend code format', () => {
      expect(isValidFriendCode('ABCD-EFGH-JKLM-NPQR')).toBe(true);
      expect(isValidFriendCode('abcd-efgh-jklm-npqr')).toBe(true); // Case insensitive
      expect(isValidFriendCode('ABCD-EFGH-JKLM-NPQR-EXTRA')).toBe(false);
      expect(isValidFriendCode('ABCD-EFGH-JKLM')).toBe(false);
      expect(isValidFriendCode('ABCD-EFGH-JKLM-OOOO')).toBe(false); // O not in alphabet
      expect(isValidFriendCode('ABCD-EFGH-JKLM-1111')).toBe(false); // 1 not in alphabet
    });
  });

  describe('Public Identity Extraction', () => {
    it('should extract only public fields from identity', async () => {
      if (!envAvailable) return;

      const stored = await createIdentity('PublicExtractTest', 'password123');
      const unlocked = await unlockIdentity(stored, 'password123');
      const publicIdentity = getPublicIdentity(unlocked);

      expect(publicIdentity.displayName).toBe(unlocked.displayName);
      expect(publicIdentity.publicKey).toBe(unlocked.publicKey);
      expect(publicIdentity.friendCode).toBe(unlocked.friendCode);
      expect(publicIdentity.avatar).toBe(unlocked.avatar);

      // Should NOT contain private key - use Object.keys to check
      const keys = Object.keys(publicIdentity);
      expect(keys).not.toContain('privateKey');
      expect(keys).not.toContain('id');
    });
  });
});
