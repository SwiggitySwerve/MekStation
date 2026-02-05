/**
 * Identity Service
 *
 * Handles cryptographic identity management including keypair generation,
 * friend code encoding/decoding, and secure key storage.
 *
 * Uses Ed25519 for signing (via Web Crypto API / Node crypto).
 * Uses AES-GCM-256 for encrypting private keys at rest.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultIdentity,
  IPublicIdentity,
  IKeyPair,
  IEncryptedData,
  IStoredIdentity,
} from '@/types/vault';

// =============================================================================
// Constants
// =============================================================================

/** Current identity format version */
const IDENTITY_VERSION = '1.0.0';

/** Friend code alphabet (unambiguous characters) */
const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Friend code length (excluding dashes) */
const FRIEND_CODE_LENGTH = 16;

/** Friend code group size (for readability) */
const FRIEND_CODE_GROUP_SIZE = 4;

/** AES key length in bits */
const AES_KEY_LENGTH = 256;

/** PBKDF2 iterations for key derivation */
const PBKDF2_ITERATIONS = 100000;

// =============================================================================
// Crypto Utilities
// =============================================================================

/**
 * Check if we're in a browser environment with Web Crypto
 */
function isWebCrypto(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}

/**
 * Get the appropriate crypto implementation
 */
async function getCrypto(): Promise<Crypto> {
  if (isWebCrypto()) {
    return window.crypto;
  }

  // Node.js environment - webcrypto is compatible but has different types
  const nodeCrypto = await import('crypto');
  // Type assertion is necessary: Node's webcrypto implements the same API
  // but TypeScript's types differ slightly from the browser Crypto type
  return nodeCrypto.webcrypto as Crypto;
}

/**
 * Generate cryptographically secure random bytes
 */
async function getRandomBytes(length: number): Promise<Uint8Array> {
  const crypto = await getCrypto();
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  // Browser - convert Uint8Array to string without spread operator
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  // Browser
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Ed25519 Key Generation
// =============================================================================

/**
 * Generate a new Ed25519 keypair
 */
export async function generateKeyPair(): Promise<IKeyPair> {
  const crypto = await getCrypto();

  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true, // extractable
    ['sign', 'verify'],
  );

  // Export keys to raw format
  const publicKeyBuffer = await crypto.subtle.exportKey(
    'raw',
    keyPair.publicKey,
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey,
  );

  return {
    publicKey: new Uint8Array(publicKeyBuffer),
    privateKey: new Uint8Array(privateKeyBuffer),
  };
}

/**
 * Sign data with a private key
 */
export async function signData(
  data: Uint8Array,
  privateKeyBytes: Uint8Array,
): Promise<Uint8Array> {
  const crypto = await getCrypto();

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('Ed25519', privateKey, data);

  return new Uint8Array(signature);
}

/**
 * Verify a signature with a public key
 */
export async function verifySignature(
  data: Uint8Array,
  signature: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<boolean> {
  const crypto = await getCrypto();

  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBytes,
    { name: 'Ed25519' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify('Ed25519', publicKey, signature, data);
}

// =============================================================================
// Friend Code Encoding/Decoding
// =============================================================================

/**
 * Encode a public key as a human-friendly friend code
 *
 * Format: XXXX-XXXX-XXXX-XXXX (16 chars from 32-char alphabet)
 * Encodes first 10 bytes of public key (80 bits)
 */
export function encodeFriendCode(publicKey: Uint8Array): string {
  // Use first 10 bytes (80 bits) of public key
  const bytes = publicKey.slice(0, 10);

  // Convert to big integer for base conversion
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }

  // Convert to friend code alphabet
  const chars: string[] = [];
  const base = BigInt(FRIEND_CODE_ALPHABET.length);

  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) {
    const index = Number(value % base);
    chars.unshift(FRIEND_CODE_ALPHABET[index]);
    value = value / base;
  }

  // Group with dashes for readability
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += FRIEND_CODE_GROUP_SIZE) {
    groups.push(chars.slice(i, i + FRIEND_CODE_GROUP_SIZE).join(''));
  }

  return groups.join('-');
}

/**
 * Decode a friend code back to partial public key bytes
 * Returns the 10-byte prefix that can be used for matching
 */
export function decodeFriendCode(friendCode: string): Uint8Array {
  // Remove dashes and convert to uppercase
  const chars = friendCode.replace(/-/g, '').toUpperCase();

  if (chars.length !== FRIEND_CODE_LENGTH) {
    throw new Error(
      `Invalid friend code length: expected ${FRIEND_CODE_LENGTH}, got ${chars.length}`,
    );
  }

  // Convert from friend code alphabet to big integer
  let value = BigInt(0);
  const base = BigInt(FRIEND_CODE_ALPHABET.length);

  for (const char of chars) {
    const index = FRIEND_CODE_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in friend code: ${char}`);
    }
    value = value * base + BigInt(index);
  }

  // Convert to bytes (10 bytes = 80 bits)
  const bytes = new Uint8Array(10);
  for (let i = 9; i >= 0; i--) {
    bytes[i] = Number(value & BigInt(0xff));
    value = value >> BigInt(8);
  }

  return bytes;
}

/**
 * Validate a friend code format
 */
export function isValidFriendCode(friendCode: string): boolean {
  const pattern = new RegExp(
    `^[${FRIEND_CODE_ALPHABET}]{4}-[${FRIEND_CODE_ALPHABET}]{4}-[${FRIEND_CODE_ALPHABET}]{4}-[${FRIEND_CODE_ALPHABET}]{4}$`,
    'i',
  );
  return pattern.test(friendCode);
}

/**
 * Check if a friend code matches a public key
 */
export function friendCodeMatchesPublicKey(
  friendCode: string,
  publicKey: Uint8Array,
): boolean {
  try {
    const decoded = decodeFriendCode(friendCode);
    const prefix = publicKey.slice(0, 10);

    if (decoded.length !== prefix.length) return false;

    for (let i = 0; i < decoded.length; i++) {
      if (decoded[i] !== prefix[i]) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Key Encryption (for storage at rest)
// =============================================================================

/**
 * Derive an AES key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const crypto = await getCrypto();

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt data with a password
 */
export async function encryptWithPassword(
  data: Uint8Array,
  password: string,
): Promise<IEncryptedData> {
  const crypto = await getCrypto();

  const salt = await getRandomBytes(16);
  const iv = await getRandomBytes(12);
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    algorithm: 'AES-GCM-256',
  };
}

/**
 * Decrypt data with a password
 */
export async function decryptWithPassword(
  encrypted: IEncryptedData,
  password: string,
): Promise<Uint8Array> {
  const crypto = await getCrypto();

  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);

  const key = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new Uint8Array(plaintext);
}

// =============================================================================
// Identity Management
// =============================================================================

/**
 * Create a new vault identity
 */
export async function createIdentity(
  displayName: string,
  password: string,
): Promise<IStoredIdentity> {
  const keyPair = await generateKeyPair();
  const friendCode = encodeFriendCode(keyPair.publicKey);
  const encryptedPrivateKey = await encryptWithPassword(
    keyPair.privateKey,
    password,
  );

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    displayName,
    publicKey: toBase64(keyPair.publicKey),
    encryptedPrivateKey,
    friendCode,
    createdAt: now,
  };
}

/**
 * Load an identity and decrypt its private key
 */
export async function unlockIdentity(
  stored: IStoredIdentity,
  password: string,
): Promise<IVaultIdentity> {
  const privateKeyBytes = await decryptWithPassword(
    stored.encryptedPrivateKey,
    password,
  );

  return {
    id: stored.id,
    displayName: stored.displayName,
    publicKey: stored.publicKey,
    privateKey: toBase64(privateKeyBytes),
    friendCode: stored.friendCode,
    createdAt: stored.createdAt,
    avatar: stored.avatar,
  };
}

/**
 * Extract public identity from full identity (safe to share)
 */
export function getPublicIdentity(identity: IVaultIdentity): IPublicIdentity {
  return {
    displayName: identity.displayName,
    publicKey: identity.publicKey,
    friendCode: identity.friendCode,
    avatar: identity.avatar,
  };
}

/**
 * Verify that a public identity matches a friend code
 */
export function verifyIdentityFriendCode(identity: IPublicIdentity): boolean {
  const publicKeyBytes = fromBase64(identity.publicKey);
  return friendCodeMatchesPublicKey(identity.friendCode, publicKeyBytes);
}

// =============================================================================
// Signing Utilities
// =============================================================================

/**
 * Sign a string message with an identity
 */
export async function signMessage(
  message: string,
  identity: IVaultIdentity,
): Promise<string> {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const privateKeyBytes = fromBase64(identity.privateKey);

  const signature = await signData(messageBytes, privateKeyBytes);
  return toBase64(signature);
}

/**
 * Verify a signed message with a public identity
 */
export async function verifyMessage(
  message: string,
  signature: string,
  publicIdentity: IPublicIdentity,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const signatureBytes = fromBase64(signature);
  const publicKeyBytes = fromBase64(publicIdentity.publicKey);

  return verifySignature(messageBytes, signatureBytes, publicKeyBytes);
}

// =============================================================================
// Export Utilities
// =============================================================================

export { toBase64, fromBase64, IDENTITY_VERSION, FRIEND_CODE_ALPHABET };
