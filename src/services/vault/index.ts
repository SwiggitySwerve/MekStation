/**
 * Vault Services Index
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

// Phase 1: Identity & Bundle Services
export * from './IdentityService';
export * from './IdentityRepository';
export * from './BundleService';
export * from './ExportService';
export * from './ImportService';

// Phase 2: Permission & Share Link Services
export * from './PermissionRepository';
export * from './PermissionService';
export * from './ShareLinkRepository';
export * from './ShareLinkService';

// Phase 3: Contact & Sync Services
export * from './ContactRepository';
export * from './ContactService';
export * from './VaultFolderRepository';
export * from './VaultService';
export * from './ChangeLogRepository';
export * from './SyncEngine';
export * from './P2PTransport';

// Phase 4: Version History
export * from './VersionHistoryRepository';
export * from './VersionHistoryService';

// Phase 4: Offline Queue
export * from './OfflineQueueRepository';
export * from './OfflineQueueService';
