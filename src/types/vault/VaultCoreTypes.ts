/**
 * Vault Core Types
 *
 * Foundational type definitions for the vault system including identity,
 * key pairs, storage, and content type aliases.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

// =============================================================================
// Identity Types
// =============================================================================

/**
 * Cryptographic identity for a vault user
 */
export interface IVaultIdentity {
  /** Unique identifier for this identity */
  id: string;

  /** Human-readable display name */
  displayName: string;

  /** Ed25519 public key (base64 encoded) */
  publicKey: string;

  /** Ed25519 private key (base64 encoded, encrypted at rest) */
  privateKey: string;

  /** Friend code derived from public key (human-friendly format) */
  friendCode: string;

  /** When this identity was created */
  createdAt: string;

  /** Optional avatar/icon identifier */
  avatar?: string;
}

/**
 * Public-only view of an identity (safe to share)
 */
export interface IPublicIdentity {
  /** Display name */
  displayName: string;

  /** Ed25519 public key (base64 encoded) */
  publicKey: string;

  /** Friend code */
  friendCode: string;

  /** Optional avatar */
  avatar?: string;
}

/**
 * Key pair for cryptographic operations
 */
export interface IKeyPair {
  /** Ed25519 public key as Uint8Array */
  publicKey: Uint8Array;

  /** Ed25519 private key as Uint8Array */
  privateKey: Uint8Array;
}

// =============================================================================
// Content Type Aliases
// =============================================================================

/**
 * Content types that can be shared
 */
export type ShareableContentType = 'unit' | 'pilot' | 'force' | 'encounter';

// =============================================================================
// Storage Types
// =============================================================================

/**
 * Encrypted storage wrapper for sensitive data
 */
export interface IEncryptedData {
  /** Encrypted data (base64) */
  ciphertext: string;

  /** Initialization vector (base64) */
  iv: string;

  /** Salt used for key derivation (base64) */
  salt: string;

  /** Algorithm identifier */
  algorithm: 'AES-GCM-256';
}

/**
 * Identity storage format (persisted to disk/DB)
 */
export interface IStoredIdentity {
  /** Identity ID */
  id: string;

  /** Display name */
  displayName: string;

  /** Public key (base64, unencrypted) */
  publicKey: string;

  /** Private key (encrypted) */
  encryptedPrivateKey: IEncryptedData;

  /** Friend code */
  friendCode: string;

  /** Creation timestamp */
  createdAt: string;

  /** Optional avatar */
  avatar?: string;
}
