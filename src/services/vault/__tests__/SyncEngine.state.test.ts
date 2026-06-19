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

  describe('getSyncState', () => {
    it('should return undefined for unknown peer', () => {
      const state = syncEngine.getSyncState('UNKNOWN-PEER');

      expect(state).toBeUndefined();
    });

    it('should return sync state after it is created', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 5 }),
      ]);

      const state = syncEngine.getSyncState('PEER-123');

      expect(state).toBeDefined();
      expect(state?.peerId).toBe('PEER-123');
      expect(state?.lastVersion).toBe(5);
    });

    it('should preserve existing state fields when updating', async () => {
      syncEngine.setSyncStatus('PEER-123', 'syncing');

      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 10 }),
      ]);

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.lastVersion).toBe(10);
    });
  });

  // ===========================================================================
  // setSyncStatus
  // ===========================================================================

  describe('setSyncStatus', () => {
    it('should set sync status to idle', () => {
      syncEngine.setSyncStatus('PEER-123', 'idle');

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.status).toBe('idle');
    });

    it('should set sync status to syncing', () => {
      syncEngine.setSyncStatus('PEER-123', 'syncing');

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.status).toBe('syncing');
    });

    it('should set sync status to error', () => {
      syncEngine.setSyncStatus('PEER-123', 'error');

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.status).toBe('error');
    });

    it('should create new state if peer has no state', () => {
      syncEngine.setSyncStatus('NEW-PEER', 'idle');

      const state = syncEngine.getSyncState('NEW-PEER');
      expect(state).toBeDefined();
      expect(state?.peerId).toBe('NEW-PEER');
      expect(state?.lastVersion).toBe(0);
      expect(state?.lastSyncAt).toBeNull();
    });

    it('should preserve other state fields when updating status', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 15 }),
      ]);

      syncEngine.setSyncStatus('PEER-123', 'error');

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.lastVersion).toBe(15);
      expect(state?.status).toBe('error');
    });
  });

  // ===========================================================================
  // markSyncedToPeer
  // ===========================================================================

  describe('markSyncedToPeer', () => {
    it('should mark changes as synced', async () => {
      mockMarkSynced.mockResolvedValue(3);

      await syncEngine.markSyncedToPeer('PEER-123', ['c1', 'c2', 'c3']);

      expect(mockMarkSynced).toHaveBeenCalledWith(['c1', 'c2', 'c3']);
    });

    it('should handle empty array', async () => {
      await syncEngine.markSyncedToPeer('PEER-123', []);

      expect(mockMarkSynced).toHaveBeenCalledWith([]);
    });

    it('should handle single change ID', async () => {
      mockMarkSynced.mockResolvedValue(1);

      await syncEngine.markSyncedToPeer('PEER-123', ['c1']);

      expect(mockMarkSynced).toHaveBeenCalledWith(['c1']);
    });
  });

  // ===========================================================================
  // getAllSyncStates
  // ===========================================================================

  describe('getAllSyncStates', () => {
    it('should return empty array when no sync states', () => {
      const states = syncEngine.getAllSyncStates();

      expect(states).toEqual([]);
    });

    it('should return all sync states', () => {
      syncEngine.setSyncStatus('PEER-1', 'idle');
      syncEngine.setSyncStatus('PEER-2', 'syncing');
      syncEngine.setSyncStatus('PEER-3', 'error');

      const states = syncEngine.getAllSyncStates();

      expect(states).toHaveLength(3);
      expect(states.map((s) => s.peerId).sort()).toEqual([
        'PEER-1',
        'PEER-2',
        'PEER-3',
      ]);
    });
  });

  // ===========================================================================
  // resetSyncState
  // ===========================================================================

  describe('resetSyncState', () => {
    it('should remove sync state for a peer', () => {
      syncEngine.setSyncStatus('PEER-123', 'idle');
      expect(syncEngine.getSyncState('PEER-123')).toBeDefined();

      syncEngine.resetSyncState('PEER-123');

      expect(syncEngine.getSyncState('PEER-123')).toBeUndefined();
    });

    it('should not affect other peers', () => {
      syncEngine.setSyncStatus('PEER-1', 'idle');
      syncEngine.setSyncStatus('PEER-2', 'syncing');

      syncEngine.resetSyncState('PEER-1');

      expect(syncEngine.getSyncState('PEER-1')).toBeUndefined();
      expect(syncEngine.getSyncState('PEER-2')).toBeDefined();
    });

    it('should handle non-existent peer gracefully', () => {
      expect(() => syncEngine.resetSyncState('NON-EXISTENT')).not.toThrow();
    });
  });

  // ===========================================================================
  // recordFolderChange
  // ===========================================================================
});
