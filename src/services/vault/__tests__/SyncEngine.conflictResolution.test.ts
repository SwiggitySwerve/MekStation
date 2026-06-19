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

  describe('getPendingConflicts', () => {
    it('should return pending conflicts from repository', async () => {
      const storedConflicts = [
        {
          id: 'conflict-1',
          contentType: 'unit' as const,
          itemId: 'unit-1',
          itemName: 'Atlas',
          localVersion: 1,
          localHash: 'local1',
          remoteVersion: 2,
          remoteHash: 'remote1',
          remotePeerId: 'PEER-1',
          detectedAt: '2024-01-15T10:00:00.000Z',
        },
        {
          id: 'conflict-2',
          contentType: 'pilot' as const,
          itemId: 'pilot-1',
          itemName: 'Kerensky',
          localVersion: 3,
          localHash: 'local2',
          remoteVersion: 4,
          remoteHash: 'remote2',
          remotePeerId: 'PEER-2',
          detectedAt: '2024-01-15T11:00:00.000Z',
        },
      ];
      mockGetPendingConflicts.mockResolvedValue(storedConflicts);

      const result = await syncEngine.getPendingConflicts();

      expect(mockGetPendingConflicts).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].resolution).toBe('pending');
      expect(result[1].resolution).toBe('pending');
    });

    it('should return empty array when no conflicts', async () => {
      mockGetPendingConflicts.mockResolvedValue([]);

      const result = await syncEngine.getPendingConflicts();

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // resolveKeepLocal
  // ===========================================================================

  describe('resolveKeepLocal', () => {
    it('should resolve conflict by keeping local version', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveKeepLocal('conflict-123');

      expect(mockResolveConflict).toHaveBeenCalledWith('conflict-123', 'local');
      expect(result).toBe(true);
    });

    it('should return false when conflict not found', async () => {
      mockResolveConflict.mockResolvedValue(false);

      const result = await syncEngine.resolveKeepLocal('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // resolveAcceptRemote
  // ===========================================================================

  describe('resolveAcceptRemote', () => {
    it('should resolve conflict by accepting remote version', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveAcceptRemote('conflict-123');

      expect(mockResolveConflict).toHaveBeenCalledWith(
        'conflict-123',
        'remote',
      );
      expect(result).toBe(true);
    });

    it('should return false when conflict not found', async () => {
      mockResolveConflict.mockResolvedValue(false);

      const result = await syncEngine.resolveAcceptRemote('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // resolveFork
  // ===========================================================================

  describe('resolveFork', () => {
    it('should resolve conflict by forking', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveFork('conflict-123');

      expect(mockResolveConflict).toHaveBeenCalledWith(
        'conflict-123',
        'forked',
      );
      expect(result).toBe(true);
    });

    it('should return false when conflict not found', async () => {
      mockResolveConflict.mockResolvedValue(false);

      const result = await syncEngine.resolveFork('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // setItemNameFn / createConflict naming
  // ===========================================================================

  describe('setItemNameFn', () => {
    it('names conflict records using the registered resolver', async () => {
      mockRecordConflict.mockResolvedValue('conflict-1');
      mockGetLatestForItem.mockResolvedValue(
        createMockChangeLogEntry({
          itemId: 'unit-atlas-1',
          version: 1,
          contentHash: 'hashA',
          synced: false,
        }),
      );
      const itemNameFn = jest
        .fn()
        .mockResolvedValue('Atlas AS7-D — Hero Variant');
      syncEngine.setItemNameFn(itemNameFn);

      const remote = createMockChangeLogEntry({
        itemId: 'unit-atlas-1',
        version: 2,
        contentHash: 'hashB',
      });
      await syncEngine.applyRemoteChanges('peer-1', [remote]);

      expect(itemNameFn).toHaveBeenCalledWith('unit-atlas-1', 'unit');
      expect(mockRecordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          itemName: 'Atlas AS7-D — Hero Variant',
        }),
      );
    });

    it('falls back to the item id when no resolver is registered', async () => {
      mockRecordConflict.mockResolvedValue('conflict-1');
      mockGetLatestForItem.mockResolvedValue(
        createMockChangeLogEntry({
          itemId: 'unit-atlas-1',
          version: 1,
          contentHash: 'hashA',
          synced: false,
        }),
      );

      const remote = createMockChangeLogEntry({
        itemId: 'unit-atlas-1',
        version: 2,
        contentHash: 'hashB',
      });
      await syncEngine.applyRemoteChanges('peer-1', [remote]);

      expect(mockRecordConflict).toHaveBeenCalledWith(
        expect.objectContaining({ itemName: 'unit-atlas-1' }),
      );
    });
  });

  // ===========================================================================
  // setContentApplyFn — applyChange + acceptRemote + fork integration
  // ===========================================================================
});
