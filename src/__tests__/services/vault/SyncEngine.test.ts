/**
 * Sync Engine Tests
 *
 * Tests for the SyncEngine service:
 * - Change tracking and recording
 * - Sync state management
 * - Reconciliation of remote changes
 * - Conflict detection and resolution
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  SyncEngine,
  getSyncEngine,
  resetSyncEngine,
} from '@/services/vault/SyncEngine';
import type { IChangeLogEntry } from '@/types/vault';

// =============================================================================
// Mocks
// =============================================================================

// Mock ChangeLogRepository
const mockRecordChange = jest.fn();
const mockGetChangesSince = jest.fn();
const mockGetUnsynced = jest.fn();
const mockGetCurrentVersion = jest.fn();
const mockGetLatestForItem = jest.fn();
const mockMarkSynced = jest.fn();
const mockRecordConflict = jest.fn();
const mockGetPendingConflicts = jest.fn();
const mockResolveConflict = jest.fn();

jest.mock('@/services/vault/ChangeLogRepository', () => ({
  ChangeLogRepository: jest.fn().mockImplementation(() => ({
    recordChange: mockRecordChange,
    getChangesSince: mockGetChangesSince,
    getUnsynced: mockGetUnsynced,
    getCurrentVersion: mockGetCurrentVersion,
    getLatestForItem: mockGetLatestForItem,
    markSynced: mockMarkSynced,
    recordConflict: mockRecordConflict,
    getPendingConflicts: mockGetPendingConflicts,
    resolveConflict: mockResolveConflict,
  })),
  getChangeLogRepository: () => ({
    recordChange: mockRecordChange,
    getChangesSince: mockGetChangesSince,
    getUnsynced: mockGetUnsynced,
    getCurrentVersion: mockGetCurrentVersion,
    getLatestForItem: mockGetLatestForItem,
    markSynced: mockMarkSynced,
    recordConflict: mockRecordConflict,
    getPendingConflicts: mockGetPendingConflicts,
    resolveConflict: mockResolveConflict,
  }),
}));

// =============================================================================
// Test Data
// =============================================================================

const createMockChange = (overrides: Partial<IChangeLogEntry> = {}): IChangeLogEntry => ({
  id: `change-${Math.random().toString(36).slice(2)}`,
  changeType: 'update',
  contentType: 'unit',
  itemId: 'unit-123',
  timestamp: new Date().toISOString(),
  version: 1,
  contentHash: 'hash-abc123',
  data: null,
  synced: false,
  sourceId: null,
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
    syncEngine = new SyncEngine();
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================

  describe('Singleton', () => {
    it('should return the same instance from getSyncEngine', () => {
      const instance1 = getSyncEngine();
      const instance2 = getSyncEngine();
      expect(instance1).toBe(instance2);
    });

    it('should reset the singleton when resetSyncEngine is called', () => {
      const instance1 = getSyncEngine();
      resetSyncEngine();
      const instance2 = getSyncEngine();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Change Tracking Tests
  // ===========================================================================

  describe('Change Tracking', () => {
    it('should record a local change', async () => {
      const mockChange = createMockChange();
      mockRecordChange.mockResolvedValue(mockChange);

      const result = await syncEngine.recordChange('update', 'unit', 'unit-123', 'test data');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'update',
        'unit',
        'unit-123',
        null, // contentHash (no hash function set)
        'test data'
      );
      expect(result).toEqual(mockChange);
    });

    it('should use content hash function if set', async () => {
      const mockChange = createMockChange({ contentHash: 'computed-hash' });
      mockRecordChange.mockResolvedValue(mockChange);

      syncEngine.setContentHashFn(async () => 'computed-hash');

      await syncEngine.recordChange('update', 'unit', 'unit-123');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'update',
        'unit',
        'unit-123',
        'computed-hash',
        null
      );
    });

    it('should get changes for a peer based on sync state', async () => {
      const changes = [createMockChange({ version: 5 }), createMockChange({ version: 6 })];
      mockGetChangesSince.mockResolvedValue(changes);

      const result = await syncEngine.getChangesForPeer('peer-1');

      expect(mockGetChangesSince).toHaveBeenCalledWith(0, 100);
      expect(result).toEqual(changes);
    });

    it('should use peer sync state when getting changes', async () => {
      const changes = [createMockChange({ version: 15 })];
      mockGetChangesSince.mockResolvedValue(changes);

      // Simulate having sync state for peer
      syncEngine.setSyncStatus('peer-1', 'idle');
      // Need to update sync state with version
      await syncEngine.applyRemoteChanges('peer-1', [createMockChange({ version: 10 })]);

      await syncEngine.getChangesForPeer('peer-1');

      expect(mockGetChangesSince).toHaveBeenCalledWith(10, 100);
    });

    it('should get unsynced changes', async () => {
      const unsyncedChanges = [createMockChange({ synced: false })];
      mockGetUnsynced.mockResolvedValue(unsyncedChanges);

      const result = await syncEngine.getUnsyncedChanges();

      expect(mockGetUnsynced).toHaveBeenCalled();
      expect(result).toEqual(unsyncedChanges);
    });

    it('should get current version', async () => {
      mockGetCurrentVersion.mockResolvedValue(42);

      const result = await syncEngine.getCurrentVersion();

      expect(result).toBe(42);
    });
  });

  // ===========================================================================
  // Reconciliation Tests
  // ===========================================================================

  describe('Reconciliation', () => {
    it('should apply remote changes when no local changes exist', async () => {
      const remoteChange = createMockChange({ version: 5 });
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(remoteChange);

      const result = await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      expect(result.applied).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should apply remote changes when remote is newer', async () => {
      const localChange = createMockChange({ version: 3, synced: true });
      const remoteChange = createMockChange({ version: 5 });
      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(remoteChange);

      const result = await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      expect(result.applied).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip remote changes when local is newer', async () => {
      const localChange = createMockChange({ version: 10, synced: true });
      const remoteChange = createMockChange({ version: 5 });
      mockGetLatestForItem.mockResolvedValue(localChange);

      const result = await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      expect(result.applied).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    it('should detect conflicts when both sides modified independently', async () => {
      const localChange = createMockChange({
        version: 5,
        contentHash: 'local-hash',
        synced: false,
      });
      const remoteChange = createMockChange({
        version: 6,
        contentHash: 'remote-hash',
      });
      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordConflict.mockResolvedValue('conflict-123');

      const result = await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      expect(result.applied).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].localHash).toBe('local-hash');
      expect(result.conflicts[0].remoteHash).toBe('remote-hash');
    });

    it('should not conflict when hashes match', async () => {
      const sameHash = 'identical-hash';
      const localChange = createMockChange({
        version: 5,
        contentHash: sameHash,
        synced: false,
      });
      const remoteChange = createMockChange({
        version: 6,
        contentHash: sameHash,
      });
      mockGetLatestForItem.mockResolvedValue(localChange);
      mockRecordChange.mockResolvedValue(remoteChange);

      const result = await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      expect(result.applied).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should update sync state after applying changes', async () => {
      const remoteChange = createMockChange({ version: 15 });
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(remoteChange);

      await syncEngine.applyRemoteChanges('peer-1', [remoteChange]);

      const syncState = syncEngine.getSyncState('peer-1');
      expect(syncState?.lastVersion).toBe(15);
      expect(syncState?.lastSyncAt).toBeDefined();
    });
  });

  // ===========================================================================
  // Conflict Resolution Tests
  // ===========================================================================

  describe('Conflict Resolution', () => {
    it('should get pending conflicts', async () => {
      const mockConflicts = [
        {
          id: 'conflict-1',
          contentType: 'unit',
          itemId: 'unit-123',
          itemName: 'Test Unit',
          localVersion: 5,
          localHash: 'local-hash',
          remoteVersion: 6,
          remoteHash: 'remote-hash',
          remotePeerId: 'peer-1',
          detectedAt: new Date().toISOString(),
        },
      ];
      mockGetPendingConflicts.mockResolvedValue(mockConflicts);

      const result = await syncEngine.getPendingConflicts();

      expect(result).toHaveLength(1);
      expect(result[0].resolution).toBe('pending');
    });

    it('should resolve conflict by keeping local', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveKeepLocal('conflict-1');

      expect(mockResolveConflict).toHaveBeenCalledWith('conflict-1', 'local');
      expect(result).toBe(true);
    });

    it('should resolve conflict by accepting remote', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveAcceptRemote('conflict-1');

      expect(mockResolveConflict).toHaveBeenCalledWith('conflict-1', 'remote');
      expect(result).toBe(true);
    });

    it('should resolve conflict by forking', async () => {
      mockResolveConflict.mockResolvedValue(true);

      const result = await syncEngine.resolveFork('conflict-1');

      expect(mockResolveConflict).toHaveBeenCalledWith('conflict-1', 'forked');
      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // Sync State Management Tests
  // ===========================================================================

  describe('Sync State Management', () => {
    it('should get sync state for a peer', () => {
      syncEngine.setSyncStatus('peer-1', 'syncing');

      const state = syncEngine.getSyncState('peer-1');

      expect(state).toBeDefined();
      expect(state?.peerId).toBe('peer-1');
      expect(state?.status).toBe('syncing');
    });

    it('should return undefined for unknown peer', () => {
      const state = syncEngine.getSyncState('unknown-peer');
      expect(state).toBeUndefined();
    });

    it('should set sync status', () => {
      syncEngine.setSyncStatus('peer-1', 'idle');
      expect(syncEngine.getSyncState('peer-1')?.status).toBe('idle');

      syncEngine.setSyncStatus('peer-1', 'syncing');
      expect(syncEngine.getSyncState('peer-1')?.status).toBe('syncing');

      syncEngine.setSyncStatus('peer-1', 'error');
      expect(syncEngine.getSyncState('peer-1')?.status).toBe('error');
    });

    it('should get all sync states', () => {
      syncEngine.setSyncStatus('peer-1', 'idle');
      syncEngine.setSyncStatus('peer-2', 'syncing');
      syncEngine.setSyncStatus('peer-3', 'error');

      const states = syncEngine.getAllSyncStates();

      expect(states).toHaveLength(3);
      expect(states.map((s) => s.peerId).sort()).toEqual(['peer-1', 'peer-2', 'peer-3']);
    });

    it('should reset sync state for a peer', () => {
      syncEngine.setSyncStatus('peer-1', 'syncing');
      expect(syncEngine.getSyncState('peer-1')).toBeDefined();

      syncEngine.resetSyncState('peer-1');
      expect(syncEngine.getSyncState('peer-1')).toBeUndefined();
    });

    it('should mark changes as synced to peer', async () => {
      mockMarkSynced.mockResolvedValue(2);

      await syncEngine.markSyncedToPeer('peer-1', ['change-1', 'change-2']);

      expect(mockMarkSynced).toHaveBeenCalledWith(['change-1', 'change-2']);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty remote changes array', async () => {
      const result = await syncEngine.applyRemoteChanges('peer-1', []);

      expect(result.applied).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should handle multiple changes in one reconciliation', async () => {
      const changes = [
        createMockChange({ version: 1, itemId: 'item-1' }),
        createMockChange({ version: 2, itemId: 'item-2' }),
        createMockChange({ version: 3, itemId: 'item-3' }),
      ];
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockImplementation((_, __, ___, ____, _____, ______) =>
        Promise.resolve(changes[0])
      );

      const result = await syncEngine.applyRemoteChanges('peer-1', changes);

      expect(result.applied).toHaveLength(3);
    });

    it('should handle content hash function returning null', async () => {
      const mockChange = createMockChange();
      mockRecordChange.mockResolvedValue(mockChange);

      syncEngine.setContentHashFn(async () => null);

      await syncEngine.recordChange('create', 'unit', 'unit-new');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'create',
        'unit',
        'unit-new',
        null,
        null
      );
    });
  });
});
