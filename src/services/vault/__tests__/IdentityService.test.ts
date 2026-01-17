/**
 * Identity Service Tests
 *
 * Tests for cryptographic identity management including keypair generation,
 * friend codes, encryption, and signing.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  encodeFriendCode,
  decodeFriendCode,
  isValidFriendCode,
  friendCodeMatchesPublicKey,
  toBase64,
  fromBase64,
  FRIEND_CODE_ALPHABET,
} from '@/services/vault/IdentityService';

// =============================================================================
// Base64 Utilities
// =============================================================================

describe('Base64 Utilities', () => {
  describe('toBase64 / fromBase64', () => {
    it('should round-trip binary data', () => {
      const original = new Uint8Array([0, 1, 2, 255, 128, 64]);
      const encoded = toBase64(original);
      const decoded = fromBase64(encoded);

      expect(decoded).toEqual(original);
    });

    it('should handle empty array', () => {
      const original = new Uint8Array([]);
      const encoded = toBase64(original);
      const decoded = fromBase64(encoded);

      expect(decoded).toEqual(original);
    });

    it('should produce valid base64 strings', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = toBase64(data);

      // Base64 should only contain valid characters
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]*$/);
    });
  });
});

// =============================================================================
// Friend Code Encoding/Decoding
// =============================================================================

describe('Friend Code', () => {
  describe('encodeFriendCode', () => {
    it('should produce a valid friend code format', () => {
      const publicKey = new Uint8Array(32);
      // Fill with test data
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i * 8;
      }

      const friendCode = encodeFriendCode(publicKey);

      // Should be XXXX-XXXX-XXXX-XXXX format
      expect(friendCode).toMatch(
        /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
      );
    });

    it('should only use unambiguous characters', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i * 7 + 13;
      }

      const friendCode = encodeFriendCode(publicKey);
      const chars = friendCode.replace(/-/g, '');

      // All characters should be in the alphabet
      for (const char of chars) {
        expect(FRIEND_CODE_ALPHABET).toContain(char);
      }

      // Should not contain ambiguous characters (O, 0, I, 1 are excluded)
      // Note: L is included as it's not ambiguous with other chars in our alphabet
      expect(chars).not.toContain('O');
      expect(chars).not.toContain('I');
      // 0 and 1 are digits not in our alphabet (we use 2-9)
      expect(chars).not.toContain('0');
      expect(chars).not.toContain('1');
    });

    it('should produce different codes for different keys', () => {
      const key1 = new Uint8Array(32);
      const key2 = new Uint8Array(32);

      key1.fill(1);
      key2.fill(2);

      const code1 = encodeFriendCode(key1);
      const code2 = encodeFriendCode(key2);

      expect(code1).not.toBe(code2);
    });

    it('should produce same code for same key', () => {
      const key = new Uint8Array(32);
      key.fill(42);

      const code1 = encodeFriendCode(key);
      const code2 = encodeFriendCode(key);

      expect(code1).toBe(code2);
    });
  });

  describe('decodeFriendCode', () => {
    it('should decode a valid friend code', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i * 5;
      }

      const friendCode = encodeFriendCode(publicKey);
      const decoded = decodeFriendCode(friendCode);

      // Decoded should match first 10 bytes of public key
      expect(decoded.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(decoded[i]).toBe(publicKey[i]);
      }
    });

    it('should handle lowercase input', () => {
      const publicKey = new Uint8Array(32);
      publicKey.fill(100);

      const friendCode = encodeFriendCode(publicKey);
      const decoded = decodeFriendCode(friendCode.toLowerCase());

      expect(decoded.length).toBe(10);
    });

    it('should throw on invalid length', () => {
      expect(() => decodeFriendCode('ABCD-EFGH')).toThrow();
    });

    it('should throw on invalid characters', () => {
      expect(() => decodeFriendCode('OOOO-OOOO-OOOO-OOOO')).toThrow();
    });
  });

  describe('isValidFriendCode', () => {
    it('should accept valid friend codes', () => {
      expect(isValidFriendCode('ABCD-EFGH-JKLM-NPQR')).toBe(true);
      expect(isValidFriendCode('2345-6789-STUV-WXYZ')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidFriendCode('ABCDEFGHJKLMNPQR')).toBe(false); // No dashes
      expect(isValidFriendCode('ABC-DEFG-HIJK-LMNO')).toBe(false); // Wrong group size
      expect(isValidFriendCode('ABCD-EFGH-JKLM')).toBe(false); // Too short
      expect(isValidFriendCode('')).toBe(false);
    });

    it('should reject ambiguous characters', () => {
      expect(isValidFriendCode('OOOO-OOOO-OOOO-OOOO')).toBe(false); // O not in alphabet
      expect(isValidFriendCode('1111-1111-1111-1111')).toBe(false); // 1 not in alphabet
      expect(isValidFriendCode('IIII-IIII-IIII-IIII')).toBe(false); // I not in alphabet
    });

    it('should be case-insensitive', () => {
      expect(isValidFriendCode('abcd-efgh-jklm-npqr')).toBe(true);
      expect(isValidFriendCode('AbCd-EfGh-JkLm-NpQr')).toBe(true);
    });
  });

  describe('friendCodeMatchesPublicKey', () => {
    it('should match correct public key', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i * 3;
      }

      const friendCode = encodeFriendCode(publicKey);
      expect(friendCodeMatchesPublicKey(friendCode, publicKey)).toBe(true);
    });

    it('should not match different public key', () => {
      const publicKey1 = new Uint8Array(32);
      const publicKey2 = new Uint8Array(32);

      publicKey1.fill(1);
      publicKey2.fill(2);

      const friendCode = encodeFriendCode(publicKey1);
      expect(friendCodeMatchesPublicKey(friendCode, publicKey2)).toBe(false);
    });

    it('should return false for invalid friend code', () => {
      const publicKey = new Uint8Array(32);
      expect(friendCodeMatchesPublicKey('invalid', publicKey)).toBe(false);
    });
  });
});

// =============================================================================
// Cryptographic Operations (require Web Crypto / Node crypto)
// =============================================================================

// These tests require Ed25519 support which may not be available in all environments
// They are conditionally skipped if not available

describe('Cryptographic Operations', () => {
  let cryptoAvailable = false;

  beforeAll(async () => {
    try {
      // Check if Ed25519 is available
      const crypto = globalThis.crypto || (await import('crypto')).webcrypto;
      if (crypto?.subtle) {
        await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
          'sign',
          'verify',
        ]);
        cryptoAvailable = true;
      }
    } catch {
      cryptoAvailable = false;
    }
  });

  describe('generateKeyPair', () => {
    it('should generate valid Ed25519 keypair', async () => {
      if (!cryptoAvailable) {
        console.log('Skipping: Ed25519 not available in this environment');
        return;
      }

      const { generateKeyPair } = await import('@/services/vault/IdentityService');
      const keyPair = await generateKeyPair();

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32); // Ed25519 public key is 32 bytes
    });

    it('should generate unique keypairs', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { generateKeyPair } = await import('@/services/vault/IdentityService');
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();

      expect(toBase64(keyPair1.publicKey)).not.toBe(toBase64(keyPair2.publicKey));
    });
  });

  describe('signData / verifySignature', () => {
    it('should sign and verify data', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { generateKeyPair, signData, verifySignature } = await import(
        '@/services/vault/IdentityService'
      );

      const keyPair = await generateKeyPair();
      const message = new TextEncoder().encode('Hello, World!');

      const signature = await signData(message, keyPair.privateKey);
      const isValid = await verifySignature(
        message,
        signature,
        keyPair.publicKey
      );

      expect(isValid).toBe(true);
    });

    it('should reject tampered data', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { generateKeyPair, signData, verifySignature } = await import(
        '@/services/vault/IdentityService'
      );

      const keyPair = await generateKeyPair();
      const message = new TextEncoder().encode('Hello, World!');
      const tampered = new TextEncoder().encode('Hello, World?');

      const signature = await signData(message, keyPair.privateKey);
      const isValid = await verifySignature(
        tampered,
        signature,
        keyPair.publicKey
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature from different key', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { generateKeyPair, signData, verifySignature } = await import(
        '@/services/vault/IdentityService'
      );

      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      const message = new TextEncoder().encode('Hello, World!');

      const signature = await signData(message, keyPair1.privateKey);
      const isValid = await verifySignature(
        message,
        signature,
        keyPair2.publicKey
      );

      expect(isValid).toBe(false);
    });
  });

  describe('encryptWithPassword / decryptWithPassword', () => {
    it('should encrypt and decrypt data', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { encryptWithPassword, decryptWithPassword } = await import(
        '@/services/vault/IdentityService'
      );

      const data = new TextEncoder().encode('Secret message');
      const password = 'testpassword123';

      const encrypted = await encryptWithPassword(data, password);
      const decrypted = await decryptWithPassword(encrypted, password);

      expect(new TextDecoder().decode(decrypted)).toBe('Secret message');
    });

    it('should fail with wrong password', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { encryptWithPassword, decryptWithPassword } = await import(
        '@/services/vault/IdentityService'
      );

      const data = new TextEncoder().encode('Secret message');
      const encrypted = await encryptWithPassword(data, 'correctpassword');

      await expect(
        decryptWithPassword(encrypted, 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should produce different ciphertext each time', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { encryptWithPassword } = await import(
        '@/services/vault/IdentityService'
      );

      const data = new TextEncoder().encode('Secret message');
      const password = 'testpassword123';

      const encrypted1 = await encryptWithPassword(data, password);
      const encrypted2 = await encryptWithPassword(data, password);

      // Different IV/salt means different ciphertext
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('createIdentity', () => {
    it('should create a complete identity', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { createIdentity } = await import('@/services/vault/IdentityService');

      const stored = await createIdentity('TestUser', 'password123');

      expect(stored.id).toBeDefined();
      expect(stored.displayName).toBe('TestUser');
      expect(stored.publicKey).toBeDefined();
      expect(stored.encryptedPrivateKey).toBeDefined();
      expect(stored.friendCode).toMatch(
        /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
      );
      expect(stored.createdAt).toBeDefined();
    });
  });

  describe('unlockIdentity', () => {
    it('should unlock with correct password', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { createIdentity, unlockIdentity } = await import(
        '@/services/vault/IdentityService'
      );

      const stored = await createIdentity('TestUser', 'password123');
      const identity = await unlockIdentity(stored, 'password123');

      expect(identity.displayName).toBe('TestUser');
      expect(identity.privateKey).toBeDefined();
      expect(identity.publicKey).toBe(stored.publicKey);
    });

    it('should fail with wrong password', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const { createIdentity, unlockIdentity } = await import(
        '@/services/vault/IdentityService'
      );

      const stored = await createIdentity('TestUser', 'password123');

      await expect(unlockIdentity(stored, 'wrongpassword')).rejects.toThrow();
    });
  });

  describe('signMessage / verifyMessage', () => {
    it('should sign and verify string messages', async () => {
      if (!cryptoAvailable) {
        return;
      }

      const {
        createIdentity,
        unlockIdentity,
        signMessage,
        verifyMessage,
        getPublicIdentity,
      } = await import('@/services/vault/IdentityService');

      const stored = await createIdentity('TestUser', 'password123');
      const identity = await unlockIdentity(stored, 'password123');
      const publicIdentity = getPublicIdentity(identity);

      const message = 'This is a test message';
      const signature = await signMessage(message, identity);
      const isValid = await verifyMessage(message, signature, publicIdentity);

      expect(isValid).toBe(true);
    });
  });
});
