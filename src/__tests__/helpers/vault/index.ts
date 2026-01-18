/**
 * Vault Test Helpers
 *
 * Exports all test fixtures and mock repositories for vault testing.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

// Fixtures
export * from './fixtures';

// Mock Repositories
export {
  MockVaultFolderRepository,
  MockVersionHistoryRepository,
  MockOfflineQueueRepository,
  MockPermissionService,
  MockP2PTransport,
} from './mockRepositories';
