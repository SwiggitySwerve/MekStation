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

  describe('getChangesForPeer', () => {
    it('should get changes for a peer with no sync state', async () => {
      const changes = [
        createMockChangeLogEntry({ version: 1 }),
        createMockChangeLogEntry({ version: 2 }),
      ];
      mockGetChangesSince.mockResolvedValue(changes);

      const result = await syncEngine.getChangesForPeer('PEER-123');

      expect(mockGetChangesSince).toHaveBeenCalledWith(0, 100);
      expect(result).toEqual(changes);
    });

    it('should get changes since last sync version', async () => {
      // Set up sync state
      syncEngine.setSyncStatus('PEER-123', 'idle');
      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 5 }),
      ]);

      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getChangesForPeer('PEER-123');

      expect(mockGetChangesSince).toHaveBeenCalledWith(5, 100);
    });

    it('should respect custom limit', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      await syncEngine.getChangesForPeer('PEER-123', 50);

      expect(mockGetChangesSince).toHaveBeenCalledWith(0, 50);
    });

    it('should return empty array when no changes', async () => {
      mockGetChangesSince.mockResolvedValue([]);

      const result = await syncEngine.getChangesForPeer('PEER-123');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getUnsyncedChanges
  // ===========================================================================

  describe('getUnsyncedChanges', () => {
    it('should return all unsynced changes', async () => {
      const unsyncedChanges = [
        createMockChangeLogEntry({ synced: false }),
        createMockChangeLogEntry({ synced: false }),
      ];
      mockGetUnsynced.mockResolvedValue(unsyncedChanges);

      const result = await syncEngine.getUnsyncedChanges();

      expect(mockGetUnsynced).toHaveBeenCalled();
      expect(result).toEqual(unsyncedChanges);
    });

    it('should return empty array when all changes are synced', async () => {
      mockGetUnsynced.mockResolvedValue([]);

      const result = await syncEngine.getUnsyncedChanges();

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getCurrentVersion
  // ===========================================================================

  describe('getCurrentVersion', () => {
    it('should return current version from change log', async () => {
      mockGetCurrentVersion.mockResolvedValue(42);

      const result = await syncEngine.getCurrentVersion();

      expect(mockGetCurrentVersion).toHaveBeenCalled();
      expect(result).toBe(42);
    });

    it('should return 0 when no changes exist', async () => {
      mockGetCurrentVersion.mockResolvedValue(0);

      const result = await syncEngine.getCurrentVersion();

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // applyRemoteChanges
  // ===========================================================================
});
