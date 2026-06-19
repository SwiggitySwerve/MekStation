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

  describe('getFolderChangesForPeer', () => {
    it('should get folder changes since last sync with peer', async () => {
      const folderChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: 'folder-123',
        version: 5,
      });
      mockGetChangesSince.mockResolvedValue([folderChange]);

      const result = await syncEngine.getFolderChangesForPeer(
        'folder-123',
        'PEER-456',
      );

      expect(mockGetChangesSince).toHaveBeenCalledWith(0, expect.any(Number));
      expect(result).toHaveLength(1);
    });

    it('should use peer sync state for fromVersion', async () => {
      // Set up sync state for peer
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      await syncEngine.applyRemoteChanges('PEER-456', [
        createMockChangeLogEntry({ version: 20 }),
      ]);

      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getFolderChangesForPeer('folder-123', 'PEER-456');

      expect(mockGetChangesSince).toHaveBeenCalledWith(20, expect.any(Number));
    });

    it('should respect custom limit', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getFolderChangesForPeer('folder-123', 'PEER-456', 25);

      expect(mockGetChangesSince).toHaveBeenCalledWith(0, 250);
    });
  });

  // ===========================================================================
  // applyFolderChanges
  // ===========================================================================

  describe('applyFolderChanges', () => {
    it('should filter and apply only folder-related changes', async () => {
      const folderChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: 'folder-123',
      });
      const unrelatedChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-999',
        data: null,
      });

      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyFolderChanges(
        'folder-123',
        'PEER-456',
        [folderChange, unrelatedChange],
      );

      expect(result.applied).toHaveLength(1);
    });

    it('should apply changes for items in the folder', async () => {
      const itemInFolder = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-in-folder',
        data: JSON.stringify({ folderId: 'folder-123' }),
      });

      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const result = await syncEngine.applyFolderChanges(
        'folder-123',
        'PEER-456',
        [itemInFolder],
      );

      expect(result.applied).toHaveLength(1);
    });

    it('should handle conflicts in folder changes', async () => {
      const remoteChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: 'folder-123',
        version: 10,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'local-hash',
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-folder');

      const result = await syncEngine.applyFolderChanges(
        'folder-123',
        'PEER-456',
        [remoteChange],
      );

      expect(result.conflicts).toHaveLength(1);
    });
  });

  // ===========================================================================
  // getFoldersWithUnsyncedChanges
  // ===========================================================================

  describe('getFoldersWithUnsyncedChanges', () => {
    it('should return folder IDs from direct folder changes', async () => {
      const folderChanges = [
        createMockChangeLogEntry({
          contentType: 'folder',
          itemId: 'folder-1',
          synced: false,
        }),
        createMockChangeLogEntry({
          contentType: 'folder',
          itemId: 'folder-2',
          synced: false,
        }),
      ];
      mockGetUnsynced.mockResolvedValue(folderChanges);

      const result = await syncEngine.getFoldersWithUnsyncedChanges();

      expect(result).toContain('folder-1');
      expect(result).toContain('folder-2');
    });

    it('should extract folder IDs from item change data', async () => {
      const itemChanges = [
        createMockChangeLogEntry({
          contentType: 'unit',
          itemId: 'unit-1',
          data: JSON.stringify({ folderId: 'folder-A' }),
          synced: false,
        }),
        createMockChangeLogEntry({
          contentType: 'pilot',
          itemId: 'pilot-1',
          data: JSON.stringify({ folderId: 'folder-B' }),
          synced: false,
        }),
      ];
      mockGetUnsynced.mockResolvedValue(itemChanges);

      const result = await syncEngine.getFoldersWithUnsyncedChanges();

      expect(result).toContain('folder-A');
      expect(result).toContain('folder-B');
    });

    it('should deduplicate folder IDs', async () => {
      const duplicateChanges = [
        createMockChangeLogEntry({
          contentType: 'folder',
          itemId: 'folder-1',
        }),
        createMockChangeLogEntry({
          contentType: 'unit',
          itemId: 'unit-1',
          data: JSON.stringify({ folderId: 'folder-1' }),
        }),
      ];
      mockGetUnsynced.mockResolvedValue(duplicateChanges);

      const result = await syncEngine.getFoldersWithUnsyncedChanges();

      expect(result).toHaveLength(1);
      expect(result).toContain('folder-1');
    });

    it('should handle invalid JSON in change data', async () => {
      const invalidChanges = [
        createMockChangeLogEntry({
          contentType: 'unit',
          itemId: 'unit-1',
          data: 'invalid-json',
        }),
      ];
      mockGetUnsynced.mockResolvedValue(invalidChanges);

      const result = await syncEngine.getFoldersWithUnsyncedChanges();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no unsynced changes', async () => {
      mockGetUnsynced.mockResolvedValue([]);

      const result = await syncEngine.getFoldersWithUnsyncedChanges();

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getFolderSyncStatus
  // ===========================================================================

  describe('getFolderSyncStatus', () => {
    it('should return pending outbound count and last sync time', async () => {
      const pendingChanges = [
        createMockChangeLogEntry({
          contentType: 'folder',
          itemId: 'folder-123',
        }),
        createMockChangeLogEntry({
          contentType: 'unit',
          data: JSON.stringify({ folderId: 'folder-123' }),
        }),
      ];
      mockGetChangesSince.mockResolvedValue(pendingChanges);

      const result = await syncEngine.getFolderSyncStatus(
        'folder-123',
        'PEER-456',
      );

      expect(result.pendingOutbound).toBe(2);
      expect(result.lastSyncAt).toBeNull();
    });

    it('should use peer sync state for last sync time', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      await syncEngine.applyRemoteChanges('PEER-456', [
        createMockChangeLogEntry({ version: 5 }),
      ]);

      mockGetChangesSince.mockResolvedValue([]);

      const result = await syncEngine.getFolderSyncStatus(
        'folder-123',
        'PEER-456',
      );

      expect(result.lastSyncAt).not.toBeNull();
    });

    it('should return 0 pending when no changes for folder', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      const result = await syncEngine.getFolderSyncStatus(
        'folder-123',
        'PEER-456',
      );

      expect(result.pendingOutbound).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton Functions
  // ===========================================================================
});
