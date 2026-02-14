/**
 * Vault Sharing Interfaces — Barrel Re-export
 *
 * Re-exports all vault types from domain-specific modules.
 * Import from '@/types/vault' (via index.ts) for all consumers.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

// 1. Core: Identity, KeyPair, Storage, ShareableContentType
export * from './VaultCoreTypes';

// 2. Import/Export: Bundle, Export, Import, Exportable, Handler types
export * from './VaultImportExportTypes';

// 3. Sharing: Permission, ShareLink types
export * from './VaultSharingTypes';

// 4. Contact: Contact, VaultFolder types
export * from './VaultContactTypes';

// 5. Sync: ChangeLog, SyncState, P2P types
export * from './VaultSyncTypes';

// 6. Versioning: Version history, Offline queue types
export * from './VaultVersioningTypes';
