/**
 * Vault Sharing Interfaces
 *
 * Core type definitions for the vault sharing system including identity,
 * bundles, signatures, and import/export operations.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

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
 * Success data for export operations
 */
export interface IExportData {
  /** The generated bundle */
  bundle: IShareableBundle;

  /** Filename suggestion for saving */
  suggestedFilename?: string;
}

/**
 * Error data for export operations
 */
export interface IExportError {
  /** Error message */
  message: string;
}

/**
 * Result of an export operation - discriminated union via ResultType
 */
export type IExportResult = ResultType<IExportData, IExportError>;

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
 * Success data for import operations
 */
export interface IImportData {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  conflicts?: IImportConflict[];
  importedIds?: Record<string, string>;
  signatureValid?: boolean;
}

/**
 * Error data for import operations
 */
export interface IImportError {
  message: string;
}

/**
 * Result of an import operation - discriminated union via ResultType
 */
export type IImportResult = ResultType<IImportData, IImportError>;

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
// Exportable Content Types
// =============================================================================

/**
 * Exportable unit data (subset of full unit for sharing)
 */
export interface IExportableUnit {
  /** Original unit ID (will be remapped on import) */
  id: string;

  /** Unit name */
  name: string;

  /** Unit chassis */
  chassis: string;

  /** Unit model/variant */
  model: string;

  /** Full serialized unit data */
  data: unknown;

  /** Source of the unit (custom, imported, etc.) */
  source?: string;
}

/**
 * Exportable pilot data
 */
export interface IExportablePilot {
  /** Original pilot ID */
  id: string;

  /** Pilot name */
  name: string;

  /** Pilot callsign */
  callsign?: string;

  /** Full serialized pilot data */
  data: unknown;
}

/**
 * Exportable force data (with nested pilots and units)
 */
export interface IExportableForce {
  /** Original force ID */
  id: string;

  /** Force name */
  name: string;

  /** Force description */
  description?: string;

  /** Full serialized force data */
  data: unknown;

  /** Nested pilots (if includeNested) */
  pilots?: IExportablePilot[];

  /** Nested units (if includeNested) */
  units?: IExportableUnit[];
}

// =============================================================================
// Import Handler Types
// =============================================================================

export type ExistsChecker = (id: string) => Promise<boolean>;

export type NameChecker = (
  name: string,
) => Promise<{ id: string; name: string } | null>;

export type ItemSaver<T> = (item: T, source: IImportSource) => Promise<string>;

export interface IImportHandlers<T> {
  checkExists: ExistsChecker;
  checkNameConflict: NameChecker;
  save: ItemSaver<T>;
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

// =============================================================================
// Permission Types (Phase 2)
// =============================================================================

/**
 * Permission levels for shared content
 * - read: View and copy content
 * - write: View, copy, and edit content
 * - admin: All above plus re-share permissions
 */
export type PermissionLevel = 'read' | 'write' | 'admin';

/**
 * Permission scope types
 * - item: Single item (unit, pilot, force)
 * - folder: Shared folder
 * - category: All items of a type (units, pilots, forces)
 * - all: Entire vault
 */
export type PermissionScopeType = 'item' | 'folder' | 'category' | 'all';

/**
 * Content categories for category-level permissions
 */
export type ContentCategory = 'units' | 'pilots' | 'forces' | 'encounters';

/**
 * A permission grant to a grantee (friend code or 'public')
 */
export interface IPermissionGrant {
  /** Unique identifier for this grant */
  id: string;

  /** Friend code of the grantee, or 'public' for public access */
  granteeId: string;

  /** Type of scope */
  scopeType: PermissionScopeType;

  /** ID of the specific item or folder (null for category/all scope) */
  scopeId: string | null;

  /** Category for category-level permissions */
  scopeCategory: ContentCategory | null;

  /** Permission level granted */
  level: PermissionLevel;

  /** When this permission expires (null for never) */
  expiresAt: string | null;

  /** When this permission was created */
  createdAt: string;

  /** Display name of the grantee (cached for UI) */
  granteeName?: string;
}

/**
 * Database row format for permissions
 */
export interface IStoredPermission {
  id: string;
  grantee_id: string;
  scope_type: PermissionScopeType;
  scope_id: string | null;
  scope_category: ContentCategory | null;
  level: PermissionLevel;
  expires_at: string | null;
  created_at: string;
  grantee_name: string | null;
}

// =============================================================================
// Share Link Types (Phase 2)
// =============================================================================

/**
 * A shareable link for content
 */
export interface IShareLink {
  /** Unique identifier for this link */
  id: string;

  /** Unique token used in the share URL */
  token: string;

  /** Type of scope */
  scopeType: PermissionScopeType;

  /** ID of the specific item or folder (null for category/all) */
  scopeId: string | null;

  /** Category for category-level shares */
  scopeCategory: ContentCategory | null;

  /** Permission level for link users */
  level: PermissionLevel;

  /** When this link expires (null for never) */
  expiresAt: string | null;

  /** Maximum number of uses (null for unlimited) */
  maxUses: number | null;

  /** Current use count */
  useCount: number;

  /** When this link was created */
  createdAt: string;

  /** Optional label for the link */
  label?: string;

  /** Whether the link is currently active */
  isActive: boolean;
}

/**
 * Database row format for share links
 */
export interface IStoredShareLink {
  id: string;
  token: string;
  scope_type: PermissionScopeType;
  scope_id: string | null;
  scope_category: ContentCategory | null;
  level: PermissionLevel;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  label: string | null;
  is_active: number;
}

/**
 * Options for creating a share link
 */
export interface IShareLinkOptions {
  /** Permission level */
  level: PermissionLevel;

  /** Expiration time (null for never) */
  expiresAt?: string | null;

  /** Max uses (null for unlimited) */
  maxUses?: number | null;

  /** Optional label for organization */
  label?: string;
}

/**
 * Success data for share link redemption
 */
export interface IShareLinkData {
  link: IShareLink;
}

/**
 * Error data for share link redemption
 */
export interface IShareLinkError {
  message: string;
  errorCode: 'NOT_FOUND' | 'EXPIRED' | 'MAX_USES' | 'INACTIVE' | 'INVALID';
}

/**
 * Result of redeeming a share link - discriminated union via ResultType
 */
export type IShareLinkRedeemResult = ResultType<
  IShareLinkData,
  IShareLinkError
>;

// =============================================================================
// Contact Types (Phase 3)
// =============================================================================

/**
 * Connection status for a contact
 */
export type ContactStatus = 'online' | 'offline' | 'connecting' | 'syncing';

/**
 * A contact in the user's contact list
 */
export interface IContact {
  /** Unique identifier for this contact record */
  id: string;

  /** Friend code of the contact */
  friendCode: string;

  /** Public key of the contact (base64) */
  publicKey: string;

  /** User-defined nickname (optional, overrides displayName) */
  nickname: string | null;

  /** Display name from the contact's identity */
  displayName: string;

  /** Optional avatar from contact's identity */
  avatar: string | null;

  /** When this contact was added */
  addedAt: string;

  /** Last time this contact was seen online */
  lastSeenAt: string | null;

  /** Whether this contact is trusted (verified out-of-band) */
  isTrusted: boolean;

  /** Optional notes about this contact */
  notes: string | null;
}

/**
 * Database row format for contacts
 */
export interface IStoredContact {
  id: string;
  friend_code: string;
  public_key: string;
  nickname: string | null;
  display_name: string;
  avatar: string | null;
  added_at: string;
  last_seen_at: string | null;
  is_trusted: number;
  notes: string | null;
}

/**
 * Options for adding a contact
 */
export interface IAddContactOptions {
  /** Friend code of the contact to add */
  friendCode: string;

  /** Optional nickname */
  nickname?: string;

  /** Optional notes */
  notes?: string;

  /** Whether to mark as trusted (default: false) */
  trusted?: boolean;
}

/**
 * Success data for adding a contact
 */
export interface IAddContactData {
  contact: IContact;
}

/**
 * Error data for adding a contact
 */
export interface IAddContactError {
  message: string;
  errorCode: 'INVALID_CODE' | 'ALREADY_EXISTS' | 'SELF_ADD' | 'LOOKUP_FAILED';
}

/**
 * Result of adding a contact - discriminated union via ResultType
 */
export type IAddContactResult = ResultType<IAddContactData, IAddContactError>;

// =============================================================================
// Vault Folder Types (Phase 3)
// =============================================================================

/**
 * A shared folder in the vault
 */
export interface IVaultFolder {
  /** Unique identifier for this folder */
  id: string;

  /** Folder name */
  name: string;

  /** Optional description */
  description: string | null;

  /** Parent folder ID (null for root) */
  parentId: string | null;

  /** When this folder was created */
  createdAt: string;

  /** When this folder was last modified */
  updatedAt: string;

  /** Number of items in this folder */
  itemCount: number;

  /** Whether this folder is shared */
  isShared: boolean;
}

/**
 * Database row format for vault folders
 */
export interface IStoredVaultFolder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  is_shared: number;
}

/**
 * An item's assignment to a folder
 */
export interface IFolderItem {
  /** Folder ID */
  folderId: string;

  /** Item ID */
  itemId: string;

  /** Item type */
  itemType: ShareableContentType;

  /** When this assignment was made */
  assignedAt: string;
}

/**
 * Database row format for folder items
 */
export interface IStoredFolderItem {
  folder_id: string;
  item_id: string;
  item_type: ShareableContentType;
  assigned_at: string;
}

// =============================================================================
// Sync Types (Phase 3)
// =============================================================================

/**
 * Type of change in the change log
 */
export type ChangeType = 'create' | 'update' | 'delete' | 'move';

/**
 * A change log entry for sync
 */
export interface IChangeLogEntry {
  /** Unique identifier for this change */
  id: string;

  /** Type of change */
  changeType: ChangeType;

  /** Type of content changed */
  contentType: ShareableContentType | 'folder';

  /** ID of the changed item */
  itemId: string;

  /** Timestamp of the change (ISO 8601) */
  timestamp: string;

  /** Vector clock / version for ordering */
  version: number;

  /** Hash of the item after this change (null for delete) */
  contentHash: string | null;

  /** The changed data (null for delete, partial for update) */
  data: string | null;

  /** Whether this change has been synced */
  synced: boolean;

  /** ID of the peer this change came from (null for local) */
  sourceId: string | null;
}

/**
 * Database row format for change log
 */
export interface IStoredChangeLogEntry {
  id: string;
  change_type: ChangeType;
  content_type: ShareableContentType | 'folder';
  item_id: string;
  timestamp: string;
  version: number;
  content_hash: string | null;
  data: string | null;
  synced: number;
  source_id: string | null;
}

/**
 * Sync state with a specific peer
 */
export interface ISyncState {
  /** Peer's friend code */
  peerId: string;

  /** Last known version from this peer */
  lastVersion: number;

  /** Last sync timestamp */
  lastSyncAt: string | null;

  /** Current sync status */
  status: 'idle' | 'syncing' | 'error';

  /** Pending changes to send */
  pendingOutbound: number;

  /** Pending changes to receive */
  pendingInbound: number;
}

/**
 * Conflict detected during sync
 */
export interface ISyncConflict {
  /** Unique identifier for this conflict */
  id: string;

  /** Type of content in conflict */
  contentType: ShareableContentType | 'folder';

  /** ID of the conflicting item */
  itemId: string;

  /** Name of the item for display */
  itemName: string;

  /** Local version */
  localVersion: number;

  /** Local content hash */
  localHash: string;

  /** Remote version */
  remoteVersion: number;

  /** Remote content hash */
  remoteHash: string;

  /** Remote peer ID */
  remotePeerId: string;

  /** When the conflict was detected */
  detectedAt: string;

  /** Resolution status */
  resolution: 'pending' | 'local' | 'remote' | 'merged' | 'forked';
}

/**
 * Database row format for sync conflicts
 */
export interface IStoredSyncConflict {
  id: string;
  content_type: ShareableContentType | 'folder';
  item_id: string;
  item_name: string;
  local_version: number;
  local_hash: string;
  remote_version: number;
  remote_hash: string;
  remote_peer_id: string;
  detected_at: string;
  resolution: 'pending' | 'local' | 'remote' | 'merged' | 'forked';
}

// =============================================================================
// P2P Transport Types (Phase 3)
// =============================================================================

/**
 * Connection state for P2P
 */
export type P2PConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed';

/**
 * P2P message types
 */
export type P2PMessageType =
  | 'handshake'
  | 'handshake_ack'
  | 'sync_request'
  | 'sync_response'
  | 'change'
  | 'change_ack'
  | 'ping'
  | 'pong'
  | 'error';

/**
 * Base P2P message structure
 */
export interface IP2PMessage {
  /** Message type */
  type: P2PMessageType;

  /** Unique message ID */
  messageId: string;

  /** Sender's friend code */
  senderId: string;

  /** Timestamp */
  timestamp: string;

  /** Message payload (type-specific) */
  payload: unknown;

  /** Optional signature */
  signature?: string;
}

/**
 * Handshake message payload
 */
export interface IHandshakePayload {
  /** Protocol version */
  protocolVersion: string;

  /** Public key for verification */
  publicKey: string;

  /** Display name */
  displayName: string;

  /** Supported features */
  features: string[];

  /** Last known sync version with this peer */
  lastSyncVersion: number;
}

/**
 * Sync request payload
 */
export interface ISyncRequestPayload {
  /** Start from this version */
  fromVersion: number;

  /** Maximum changes to return */
  limit: number;

  /** Filter by content types (null for all) */
  contentTypes: (ShareableContentType | 'folder')[] | null;
}

/**
 * Sync response payload
 */
export interface ISyncResponsePayload {
  /** Changes since requested version */
  changes: IChangeLogEntry[];

  /** Whether there are more changes */
  hasMore: boolean;

  /** Current version on the sender */
  currentVersion: number;
}

/**
 * Change message payload
 */
export interface IChangePayload {
  /** The change entry */
  change: IChangeLogEntry;

  /** Full content if needed */
  content?: string;
}

/**
 * WebRTC signaling message
 */
export interface ISignalingMessage {
  /** Target peer's friend code */
  targetId: string;

  /** Source peer's friend code */
  sourceId: string;

  /** Signaling type */
  type: 'offer' | 'answer' | 'ice-candidate';

  /** SDP or ICE candidate data */
  data: string;

  /** Timestamp */
  timestamp: string;
}

/**
 * P2P connection info
 */
export interface IP2PConnection {
  /** Peer's friend code */
  peerId: string;

  /** Current connection state */
  state: P2PConnectionState;

  /** When connection was established */
  connectedAt: string | null;

  /** Data channel state */
  dataChannelState: 'connecting' | 'open' | 'closing' | 'closed';

  /** Round-trip time in milliseconds */
  rtt: number | null;

  /** Bytes sent */
  bytesSent: number;

  /** Bytes received */
  bytesReceived: number;
}

// =============================================================================
// Version History Types (Phase 4)
// =============================================================================

/**
 * A version snapshot of a shared item
 */
export interface IVersionSnapshot {
  /** Unique identifier for this version */
  id: string;

  /** Type of content */
  contentType: ShareableContentType;

  /** ID of the item */
  itemId: string;

  /** Version number (monotonically increasing) */
  version: number;

  /** Content hash for quick comparison */
  contentHash: string;

  /** Full serialized content at this version */
  content: string;

  /** When this version was created */
  createdAt: string;

  /** Who created this version (friend code or 'local') */
  createdBy: string;

  /** Optional commit message or change description */
  message: string | null;

  /** Size of the content in bytes */
  sizeBytes: number;
}

/**
 * Database row format for version snapshots
 */
export interface IStoredVersionSnapshot {
  id: string;
  content_type: ShareableContentType;
  item_id: string;
  version: number;
  content_hash: string;
  content: string;
  created_at: string;
  created_by: string;
  message: string | null;
  size_bytes: number;
}

/**
 * Version diff between two snapshots
 */
export interface IVersionDiff {
  /** From version number */
  fromVersion: number;

  /** To version number */
  toVersion: number;

  /** Content type */
  contentType: ShareableContentType;

  /** Item ID */
  itemId: string;

  /** Fields that changed */
  changedFields: string[];

  /**
   * Additions (new fields/values in the new version)
   *
   * Note: Intentionally typed as Record<string, unknown> because:
   * - Represents arbitrary JSON diff data
   * - Field names and types vary by content type and specific changes
   * - Used for display purposes, not type-safe operations
   */
  additions: Record<string, unknown>;

  /**
   * Deletions (removed fields/values from the old version)
   *
   * Note: Intentionally typed as Record<string, unknown> because:
   * - Represents arbitrary JSON diff data
   * - Field names and types vary by content type and specific changes
   * - Used for display purposes, not type-safe operations
   */
  deletions: Record<string, unknown>;

  /** Modifications (changed values) */
  modifications: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Version history summary for an item
 */
export interface IVersionHistorySummary {
  /** Item ID */
  itemId: string;

  /** Content type */
  contentType: ShareableContentType;

  /** Current version number */
  currentVersion: number;

  /** Total number of versions */
  totalVersions: number;

  /** Oldest version timestamp */
  oldestVersion: string | null;

  /** Newest version timestamp */
  newestVersion: string | null;

  /** Total storage used by all versions (bytes) */
  totalSizeBytes: number;
}

// =============================================================================
// Offline Queue Types (Phase 4)
// =============================================================================

/**
 * Status of a queued message
 */
export type QueuedMessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'expired';

/**
 * A queued message waiting for delivery to an offline peer
 */
export interface IQueuedMessage {
  /** Unique identifier for this queued message */
  id: string;

  /** Target peer's friend code */
  targetPeerId: string;

  /** Message type */
  messageType: P2PMessageType;

  /** Serialized message payload */
  payload: string;

  /** When this message was queued */
  queuedAt: string;

  /** When this message expires */
  expiresAt: string;

  /** Number of delivery attempts */
  attempts: number;

  /** Last attempt timestamp */
  lastAttemptAt: string | null;

  /** Current status */
  status: QueuedMessageStatus;

  /** Priority (higher = more important) */
  priority: number;

  /** Size of the payload in bytes */
  sizeBytes: number;
}

/**
 * Database row format for queued messages
 */
export interface IStoredQueuedMessage {
  id: string;
  target_peer_id: string;
  message_type: P2PMessageType;
  payload: string;
  queued_at: string;
  expires_at: string;
  attempts: number;
  last_attempt_at: string | null;
  status: QueuedMessageStatus;
  priority: number;
  size_bytes: number;
}

/**
 * Summary of queue status for a peer
 */
export interface IPeerQueueSummary {
  /** Peer's friend code */
  peerId: string;

  /** Number of pending messages */
  pendingCount: number;

  /** Total size of pending messages in bytes */
  pendingSizeBytes: number;

  /** Oldest pending message timestamp */
  oldestPending: string | null;

  /** Number of failed messages */
  failedCount: number;

  /** Last successful send timestamp */
  lastSuccessAt: string | null;
}

/**
 * Overall queue statistics
 */
export interface IQueueStats {
  /** Total messages in queue */
  totalMessages: number;

  /** Messages by status */
  byStatus: Record<QueuedMessageStatus, number>;

  /** Total storage used */
  totalSizeBytes: number;

  /** Number of unique target peers */
  targetPeerCount: number;

  /** Messages expiring soon (within 1 hour) */
  expiringSoon: number;
}
