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

  describe('Integration scenarios', () => {
    it('should handle full sync workflow', async () => {
      // 1. Record local changes
      const localEntry = createMockChangeLogEntry({
        id: 'local-change-1',
        changeType: 'create',
        contentType: 'unit',
        itemId: 'unit-new',
        version: 1,
      });
      mockRecordChange.mockResolvedValue(localEntry);
      await syncEngine.recordChange('create', 'unit', 'unit-new', '{}');

      // 2. Get changes for peer
      mockGetChangesSince.mockResolvedValue([localEntry]);
      const toSend = await syncEngine.getChangesForPeer('PEER-A');
      expect(toSend).toHaveLength(1);

      // 3. Mark changes as synced
      await syncEngine.markSyncedToPeer('PEER-A', [localEntry.id]);
      expect(mockMarkSynced).toHaveBeenCalledWith([localEntry.id]);

      // 4. Receive changes from peer
      const remoteEntry = createMockChangeLogEntry({
        id: 'remote-change-1',
        changeType: 'create',
        contentType: 'pilot',
        itemId: 'pilot-remote',
        version: 5,
      });
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(remoteEntry);

      const result = await syncEngine.applyRemoteChanges('PEER-A', [
        remoteEntry,
      ]);
      expect(result.applied).toHaveLength(1);

      // 5. Verify sync state
      const state = syncEngine.getSyncState('PEER-A');
      expect(state?.lastVersion).toBe(5);
    });

    it('should handle conflict resolution workflow', async () => {
      // 1. Apply remote change that causes conflict
      const remoteChange = createMockChangeLogEntry({
        id: 'remote-conflict',
        version: 10,
        contentHash: 'remote-hash',
      });
      const localChange = createMockChangeLogEntry({
        version: 5,
        contentHash: 'local-hash',
        synced: false,
      });

      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-123');

      const applyResult = await syncEngine.applyRemoteChanges('PEER-B', [
        remoteChange,
      ]);
      expect(applyResult.conflicts).toHaveLength(1);

      // 2. List pending conflicts
      mockGetPendingConflicts.mockResolvedValue([
        {
          id: 'conflict-123',
          contentType: 'unit' as const,
          itemId: localChange.itemId,
          itemName: 'Test Unit',
          localVersion: 5,
          localHash: 'local-hash',
          remoteVersion: 10,
          remoteHash: 'remote-hash',
          remotePeerId: 'PEER-B',
          detectedAt: new Date().toISOString(),
        },
      ]);

      const conflicts = await syncEngine.getPendingConflicts();
      expect(conflicts).toHaveLength(1);

      // 3. Resolve conflict
      mockResolveConflict.mockResolvedValue(true);
      const resolved = await syncEngine.resolveKeepLocal('conflict-123');
      expect(resolved).toBe(true);
    });

    it('should handle folder sync workflow', async () => {
      const folderId = 'folder-shared';

      // 1. Record folder creation
      mockRecordChange.mockResolvedValue(
        createMockChangeLogEntry({
          contentType: 'folder',
          itemId: folderId,
          changeType: 'create',
        }),
      );
      await syncEngine.recordFolderChange(
        'create',
        folderId,
        '{"name":"Shared"}',
      );

      // 2. Add items to folder
      await syncEngine.recordFolderItemAdded(folderId, 'unit-1', 'unit');
      await syncEngine.recordFolderItemAdded(folderId, 'pilot-1', 'pilot');

      // 3. Get folder changes for peer
      const folderChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: folderId,
      });
      const itemChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-1',
        data: JSON.stringify({ folderId }),
      });
      mockGetChangesSince.mockResolvedValue([folderChange, itemChange]);

      const changes = await syncEngine.getFolderChangesForPeer(
        folderId,
        'PEER-C',
      );
      expect(changes.length).toBeGreaterThan(0);

      // 4. Get folder sync status
      const status = await syncEngine.getFolderSyncStatus(folderId, 'PEER-C');
      expect(status.pendingOutbound).toBe(2);
    });
  });
});
