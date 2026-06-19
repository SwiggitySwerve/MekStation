/**
 * Sync Engine Tests
 *
 * Comprehensive tests for the SyncEngine class covering
 * change tracking, reconciliation, conflict detection/resolution,
 * sync state management, and folder-level sync operations.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IChangeLogEntry,
  ISyncConflict,
  ShareableContentType,
  ChangeType,
} from '@/types/vault';

import {
  SyncEngine,
  getSyncEngine,
  resetSyncEngine,
  type ContentHashFn,
  type ContentDataFn,
} from '../SyncEngine';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the ChangeLogRepository
const mockRecordChange = jest.fn();
const mockGetChangesSince = jest.fn();
const mockGetUnsynced = jest.fn();
const mockGetCurrentVersion = jest.fn();
const mockGetLatestForItem = jest.fn();
const mockMarkSynced = jest.fn();
const mockRecordConflict = jest.fn();
const mockGetPendingConflicts = jest.fn();
const mockResolveConflict = jest.fn();

const mockChangeLogRepository = {
  recordChange: mockRecordChange,
  getChangesSince: mockGetChangesSince,
  getUnsynced: mockGetUnsynced,
  getCurrentVersion: mockGetCurrentVersion,
  getLatestForItem: mockGetLatestForItem,
  markSynced: mockMarkSynced,
  recordConflict: mockRecordConflict,
  getPendingConflicts: mockGetPendingConflicts,
  resolveConflict: mockResolveConflict,
};

jest.mock('../ChangeLogRepository', () => ({
  ChangeLogRepository: jest
    .fn()
    .mockImplementation(() => mockChangeLogRepository),
  getChangeLogRepository: jest.fn(() => mockChangeLogRepository),
}));

// =============================================================================
// Test Data Helpers
// =============================================================================

const createMockChangeLogEntry = (
  overrides: Partial<IChangeLogEntry> = {},
): IChangeLogEntry => ({
  id: `change-${Math.random().toString(36).slice(2, 11)}`,
  changeType: 'create',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  timestamp: '2024-01-15T10:00:00.000Z',
  version: 1,
  contentHash: 'hash123',
  data: '{"name":"Atlas AS7-D"}',
  synced: false,
  sourceId: null,
  ...overrides,
});

const _createMockSyncConflict = (
  overrides: Partial<ISyncConflict> = {},
): ISyncConflict => ({
  id: 'conflict-test-123',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  itemName: 'Atlas AS7-D',
  localVersion: 1,
  localHash: 'localhash123',
  remoteVersion: 2,
  remoteHash: 'remotehash456',
  remotePeerId: 'PEER-1234',
  detectedAt: '2024-01-15T10:00:00.000Z',
  resolution: 'pending',
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncEngine();
    syncEngine = new SyncEngine(mockChangeLogRepository as never);
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('applyRemoteChanges', () => {
    it('should apply new changes when no local changes exist', async () => {
      const remoteChanges = [
        createMockChangeLogEntry({ version: 1, itemId: 'item-1' }),
        createMockChangeLogEntry({ version: 2, itemId: 'item-2' }),
      ];
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyRemoteChanges(
        'PEER-123',
        remoteChanges,
      );

      expect(result.applied).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip remote changes when local is newer', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 1,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'local-hash',
        synced: true,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.skipped).toHaveLength(1);
      expect(result.applied).toHaveLength(0);
    });

    it('should apply remote changes when remote is newer', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 10,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'local-hash',
        synced: true,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.applied).toHaveLength(1);
    });

    it('should detect conflict when both have unsynced changes with different hashes', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 3,
        contentHash: 'local-hash',
        synced: false, // Local change not synced
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-new-123');

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].id).toBe('conflict-new-123');
    });

    it('should not conflict when hashes match', async () => {
      const sameHash = 'same-content-hash';
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: sameHash,
      });
      const localChange = createMockChangeLogEntry({
        version: 3,
        contentHash: sameHash,
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(0);
      // Should apply since versions differ but content is same
      expect(result.applied).toHaveLength(1);
    });

    it('should update sync state after applying changes', async () => {
      const remoteChanges = [createMockChangeLogEntry({ version: 10 })];
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.applyRemoteChanges('PEER-123', remoteChanges);

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.lastVersion).toBe(10);
      expect(state?.lastSyncAt).toBeDefined();
    });

    it('should handle empty changes array', async () => {
      const result = await syncEngine.applyRemoteChanges('PEER-123', []);

      expect(result.applied).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should handle multiple changes for same item', async () => {
      const itemId = 'unit-123';
      const remoteChanges = [
        createMockChangeLogEntry({ version: 1, itemId }),
        createMockChangeLogEntry({ version: 2, itemId }),
        createMockChangeLogEntry({ version: 3, itemId }),
      ];

      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyRemoteChanges(
        'PEER-123',
        remoteChanges,
      );

      expect(result.applied).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Conflict Detection (isConflict via applyRemoteChanges)
  // ===========================================================================

  describe('conflict detection via applyRemoteChanges', () => {
    it('should not conflict when local change is already synced', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 3,
        contentHash: 'local-hash',
        synced: true, // Already synced
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(0);
    });

    it('should not conflict when versions are equal', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5, // Same version
        contentHash: 'local-hash',
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(0);
    });

    it('should conflict with different versions, hashes, and unsynced local', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 10,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'different-local-hash',
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-123');

      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(1);
    });

    it('should handle null hashes gracefully - no conflict when both null', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: null,
      });
      const localChange = createMockChangeLogEntry({
        version: 3,
        contentHash: null,
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      // With null hashes (null !== null is false), no conflict - remote is newer so applied
      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(0);
      expect(result.applied).toHaveLength(1);
    });

    it('should conflict when one hash is null and other is not', async () => {
      const remoteChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 3,
        contentHash: null,
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-123');

      // Different hashes (null vs string), different versions, unsynced = conflict
      const result = await syncEngine.applyRemoteChanges('PEER-123', [
        remoteChange,
      ]);

      expect(result.conflicts).toHaveLength(1);
    });
  });

  // ===========================================================================
  // getPendingConflicts
  // ===========================================================================
});
