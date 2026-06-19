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

  describe('recordFolderChange', () => {
    it('should record folder create change', async () => {
      const mockEntry = createMockChangeLogEntry({
        changeType: 'create',
        contentType: 'folder',
        itemId: 'folder-123',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordFolderChange(
        'create',
        'folder-123',
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'create',
        'folder',
        'folder-123',
        null,
        null,
      );
      expect(result.contentType).toBe('folder');
    });

    it('should record folder update change with data', async () => {
      const folderData = '{"name":"Updated Folder"}';
      const mockEntry = createMockChangeLogEntry({
        changeType: 'update',
        contentType: 'folder',
        data: folderData,
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordFolderChange(
        'update',
        'folder-123',
        folderData,
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'update',
        'folder',
        'folder-123',
        null,
        folderData,
      );
      expect(result.data).toBe(folderData);
    });

    it('should record folder delete change', async () => {
      const mockEntry = createMockChangeLogEntry({
        changeType: 'delete',
        contentType: 'folder',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      await syncEngine.recordFolderChange('delete', 'folder-123');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'delete',
        'folder',
        'folder-123',
        null,
        null,
      );
    });
  });

  // ===========================================================================
  // recordFolderItemAdded
  // ===========================================================================

  describe('recordFolderItemAdded', () => {
    it('should record item addition to folder', async () => {
      const mockEntry = createMockChangeLogEntry({
        contentType: 'folder',
        changeType: 'update',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordFolderItemAdded(
        'folder-123',
        'unit-456',
        'unit',
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'update',
        'folder',
        'folder-123',
        null,
        JSON.stringify({
          action: 'item_added',
          folderId: 'folder-123',
          itemId: 'unit-456',
          itemType: 'unit',
        }),
      );
      expect(result.changeType).toBe('update');
    });

    it('should record addition for all item types', async () => {
      const itemTypes: ShareableContentType[] = [
        'unit',
        'pilot',
        'force',
        'encounter',
      ];

      for (const itemType of itemTypes) {
        mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

        await syncEngine.recordFolderItemAdded(
          'folder-123',
          `${itemType}-1`,
          itemType,
        );

        expect(mockRecordChange).toHaveBeenCalledWith(
          'update',
          'folder',
          'folder-123',
          null,
          expect.stringContaining(`"itemType":"${itemType}"`),
        );
      }
    });
  });

  // ===========================================================================
  // recordFolderItemRemoved
  // ===========================================================================

  describe('recordFolderItemRemoved', () => {
    it('should record item removal from folder', async () => {
      const mockEntry = createMockChangeLogEntry({
        contentType: 'folder',
        changeType: 'update',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordFolderItemRemoved(
        'folder-123',
        'pilot-789',
        'pilot',
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'update',
        'folder',
        'folder-123',
        null,
        JSON.stringify({
          action: 'item_removed',
          folderId: 'folder-123',
          itemId: 'pilot-789',
          itemType: 'pilot',
        }),
      );
      expect(result.changeType).toBe('update');
    });
  });

  // ===========================================================================
  // getChangesForFolder
  // ===========================================================================

  describe('getChangesForFolder', () => {
    it('should return changes for the folder itself', async () => {
      const folderChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: 'folder-123',
      });
      mockGetChangesSince.mockResolvedValue([folderChange]);

      const result = await syncEngine.getChangesForFolder('folder-123');

      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('folder-123');
    });

    it('should return changes for items with folderId in data', async () => {
      const itemChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-456',
        data: JSON.stringify({ folderId: 'folder-123' }),
      });
      mockGetChangesSince.mockResolvedValue([itemChange]);

      const result = await syncEngine.getChangesForFolder('folder-123');

      expect(result).toHaveLength(1);
    });

    it('should filter out unrelated changes', async () => {
      const relatedChange = createMockChangeLogEntry({
        contentType: 'folder',
        itemId: 'folder-123',
      });
      const unrelatedChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-789',
        data: JSON.stringify({ folderId: 'other-folder' }),
      });
      mockGetChangesSince.mockResolvedValue([relatedChange, unrelatedChange]);

      const result = await syncEngine.getChangesForFolder('folder-123');

      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('folder-123');
    });

    it('should respect fromVersion parameter', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getChangesForFolder('folder-123', 10);

      expect(mockGetChangesSince).toHaveBeenCalledWith(10, expect.any(Number));
    });

    it('should respect limit parameter', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getChangesForFolder('folder-123', 0, 50);

      // Internally multiplies limit by 10 to ensure enough changes are fetched
      expect(mockGetChangesSince).toHaveBeenCalledWith(0, 500);
    });

    it('should handle invalid JSON in change data', async () => {
      const invalidChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-456',
        data: 'not-json',
      });
      mockGetChangesSince.mockResolvedValue([invalidChange]);

      const result = await syncEngine.getChangesForFolder('folder-123');

      expect(result).toHaveLength(0);
    });

    it('should handle null data', async () => {
      const nullDataChange = createMockChangeLogEntry({
        contentType: 'unit',
        itemId: 'unit-456',
        data: null,
      });
      mockGetChangesSince.mockResolvedValue([nullDataChange]);

      const result = await syncEngine.getChangesForFolder('folder-123');

      expect(result).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getFolderChangesForPeer
  // ===========================================================================
});
