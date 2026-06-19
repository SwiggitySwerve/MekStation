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

  describe('setContentApplyFn', () => {
    it('invokes the apply callback for non-conflicting remote changes', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      const applyFn = jest.fn().mockResolvedValue(undefined);
      syncEngine.setContentApplyFn(applyFn);

      const remote = createMockChangeLogEntry({
        itemId: 'unit-atlas-1',
        data: '{"name":"Atlas AS7-D"}',
      });
      await syncEngine.applyRemoteChanges('peer-1', [remote]);

      expect(applyFn).toHaveBeenCalledWith(
        'unit-atlas-1',
        'unit',
        '{"name":"Atlas AS7-D"}',
      );
    });

    it('skips the apply callback when the remote change has no data', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      const applyFn = jest.fn();
      syncEngine.setContentApplyFn(applyFn);

      const remote = createMockChangeLogEntry({ data: null });
      await syncEngine.applyRemoteChanges('peer-1', [remote]);

      expect(applyFn).not.toHaveBeenCalled();
    });

    it('resolveAcceptRemote applies remote data via the callback', async () => {
      mockResolveConflict.mockResolvedValue(true);
      mockGetPendingConflicts.mockResolvedValue([
        {
          id: 'conflict-1',
          contentType: 'unit' as ShareableContentType,
          itemId: 'unit-atlas-1',
          itemName: 'Atlas',
          localVersion: 1,
          localHash: 'a',
          remoteVersion: 2,
          remoteHash: 'b',
          remotePeerId: 'peer-1',
          detectedAt: '2024-01-15T10:00:00.000Z',
        },
      ]);
      const applyFn = jest.fn().mockResolvedValue(undefined);
      syncEngine.setContentApplyFn(applyFn);

      const ok = await syncEngine.resolveAcceptRemote(
        'conflict-1',
        '{"remote":"payload"}',
      );

      expect(ok).toBe(true);
      expect(applyFn).toHaveBeenCalledWith(
        'unit-atlas-1',
        'unit',
        '{"remote":"payload"}',
      );
    });

    it('resolveAcceptRemote skips apply when no remote data is supplied', async () => {
      mockResolveConflict.mockResolvedValue(true);
      const applyFn = jest.fn();
      syncEngine.setContentApplyFn(applyFn);

      await syncEngine.resolveAcceptRemote('conflict-1');

      expect(applyFn).not.toHaveBeenCalled();
    });

    it('resolveFork creates a forked item via the callback and returns its id', async () => {
      mockResolveConflict.mockResolvedValue(true);
      mockGetPendingConflicts.mockResolvedValue([
        {
          id: 'conflict-1',
          contentType: 'unit' as ShareableContentType,
          itemId: 'unit-atlas-1',
          itemName: 'Atlas',
          localVersion: 1,
          localHash: 'a',
          remoteVersion: 2,
          remoteHash: 'b',
          remotePeerId: 'peer-1',
          detectedAt: '2024-01-15T10:00:00.000Z',
        },
      ]);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      const applyFn = jest.fn().mockResolvedValue(undefined);
      syncEngine.setContentApplyFn(applyFn);

      const result = await syncEngine.resolveFork(
        'conflict-1',
        '{"remote":"payload"}',
      );

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.forkedItemId).toMatch(/^unit-atlas-1-fork-\d+$/);
        expect(applyFn).toHaveBeenCalledWith(
          result.forkedItemId,
          'unit',
          '{"remote":"payload"}',
        );
      }
    });

    it('resolveFork marks resolved without forking when no data is supplied', async () => {
      mockResolveConflict.mockResolvedValue(true);
      const applyFn = jest.fn();
      syncEngine.setContentApplyFn(applyFn);

      const result = await syncEngine.resolveFork('conflict-1');

      expect(result).toBe(true);
      expect(applyFn).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getSyncState
  // ===========================================================================
});
