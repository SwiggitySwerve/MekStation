/**
 * Vault Sharing Interfaces
 *
 * Core type definitions for the vault sharing system including identity,
 * bundles, signatures, and import/export operations.
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
// Bundle Types
// =============================================================================

/**
 * Content types that can be shared
 */
export type ShareableContentType = 'unit' | 'pilot' | 'force' | 'encounter';

/**
 * Metadata about a shareable bundle
 */
export interface IBundleMetadata {
  /** Bundle format version for compatibility */
  version: string;

  /** Type of content in this bundle */
  contentType: ShareableContentType;

  /** Number of items in the bundle */
  itemCount: number;

  /** Author's public identity */
  author: IPublicIdentity;

  /** When the bundle was created */
  createdAt: string;

  /** Optional description of the bundle contents */
  description?: string;

  /** Optional tags for categorization */
  tags?: string[];

  /** MekStation version that created this bundle */
  appVersion: string;
}

/**
 * A signed, shareable bundle of content
 */
export interface IShareableBundle {
  /** Bundle metadata */
  metadata: IBundleMetadata;

  /** The actual content (JSON stringified) */
  payload: string;

  /** Ed25519 signature of (metadata + payload) */
  signature: string;
}

/**
 * Parsed bundle ready for import
 */
export interface IParsedBundle<T = unknown> {
  /** Bundle metadata */
  metadata: IBundleMetadata;

  /** Parsed payload items */
  items: T[];

  /** Whether the signature is valid */
  signatureValid: boolean;

  /** The signer's public identity */
  signer: IPublicIdentity;
}

// =============================================================================
// Import/Export Types
// =============================================================================

/**
 * Options for exporting content
 */
export interface IExportOptions {
  /** Include a description in the bundle */
  description?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Whether to include nested content (e.g., pilots in forces) */
  includeNested?: boolean;
}

/**
 * Result of an export operation
 */
export interface IExportResult {
  /** Whether the export succeeded */
  success: boolean;

  /** The generated bundle (if successful) */
  bundle?: IShareableBundle;

  /** Error message (if failed) */
  error?: string;

  /** Filename suggestion for saving */
  suggestedFilename?: string;
}

/**
 * Conflict detected during import
 */
export interface IImportConflict {
  /** Type of content that conflicts */
  contentType: ShareableContentType;

  /** ID of the conflicting item in the bundle */
  bundleItemId: string;

  /** Name of the conflicting item */
  bundleItemName: string;

  /** ID of the existing item that conflicts */
  existingItemId: string;

  /** Name of the existing item */
  existingItemName: string;

  /** Resolution strategy */
  resolution: 'skip' | 'replace' | 'rename' | 'keep_both';
}

/**
 * Options for importing content
 */
export interface IImportOptions {
  /** How to handle conflicts */
  conflictResolution: 'skip' | 'replace' | 'rename' | 'ask';

  /** Pre-resolved conflicts (when resolution is 'ask') */
  resolvedConflicts?: IImportConflict[];

  /** Whether to verify signatures (default: true) */
  verifySignature?: boolean;

  /** Whether to track import source (default: true) */
  trackSource?: boolean;
}

/**
 * Result of an import operation
 */
export interface IImportResult {
  /** Whether the import succeeded */
  success: boolean;

  /** Number of items successfully imported */
  importedCount: number;

  /** Number of items skipped */
  skippedCount: number;

  /** Number of items that replaced existing */
  replacedCount: number;

  /** Conflicts that need resolution (if any) */
  conflicts?: IImportConflict[];

  /** Error message (if failed) */
  error?: string;

  /** IDs of imported items (mapped from original to new) */
  importedIds?: Record<string, string>;

  /** Signature verification result */
  signatureValid?: boolean;
}

/**
 * Source tracking for imported items
 */
export interface IImportSource {
  /** Original bundle author */
  author: IPublicIdentity;

  /** When the item was imported */
  importedAt: string;

  /** Original ID in the source bundle */
  originalId: string;

  /** Bundle description (if any) */
  bundleDescription?: string;
}

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
