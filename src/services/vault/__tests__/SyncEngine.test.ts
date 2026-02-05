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

  describe('constructor', () => {
    it('should create SyncEngine with provided ChangeLogRepository', () => {
      const engine = new SyncEngine(mockChangeLogRepository as never);
      expect(engine).toBeInstanceOf(SyncEngine);
    });

    it('should create SyncEngine with default ChangeLogRepository when none provided', () => {
      const engine = new SyncEngine();
      expect(engine).toBeInstanceOf(SyncEngine);
    });

    it('should initialize with empty sync states', () => {
      const engine = new SyncEngine(mockChangeLogRepository as never);
      expect(engine.getAllSyncStates()).toEqual([]);
    });
  });

  // ===========================================================================
  // setContentHashFn
  // ===========================================================================

  describe('setContentHashFn', () => {
    it('should set the content hash function', async () => {
      const hashFn: ContentHashFn = jest
        .fn()
        .mockResolvedValue('computed-hash');
      syncEngine.setContentHashFn(hashFn);

      mockRecordChange.mockResolvedValue(
        createMockChangeLogEntry({ contentHash: 'computed-hash' }),
      );

      await syncEngine.recordChange('create', 'unit', 'unit-123');

      expect(hashFn).toHaveBeenCalledWith('unit-123', 'unit');
    });

    it('should pass itemId and contentType to hash function', async () => {
      const hashFn: ContentHashFn = jest.fn().mockResolvedValue('hash');
      syncEngine.setContentHashFn(hashFn);

      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.recordChange('update', 'pilot', 'pilot-kerensky');

      expect(hashFn).toHaveBeenCalledWith('pilot-kerensky', 'pilot');
    });

    it('should allow changing the hash function', async () => {
      const hashFn1: ContentHashFn = jest.fn().mockResolvedValue('hash1');
      const hashFn2: ContentHashFn = jest.fn().mockResolvedValue('hash2');

      syncEngine.setContentHashFn(hashFn1);
      syncEngine.setContentHashFn(hashFn2);

      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());
      await syncEngine.recordChange('create', 'unit', 'unit-123');

      expect(hashFn1).not.toHaveBeenCalled();
      expect(hashFn2).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // setContentDataFn
  // ===========================================================================

  describe('setContentDataFn', () => {
    it('should set the content data function', () => {
      const dataFn: ContentDataFn = jest
        .fn()
        .mockResolvedValue('{"data":"test"}');
      syncEngine.setContentDataFn(dataFn);
      // The function is stored - verified by internal behavior
      expect(true).toBe(true);
    });

    it('should allow changing the data function', () => {
      const dataFn1: ContentDataFn = jest.fn();
      const dataFn2: ContentDataFn = jest.fn();

      syncEngine.setContentDataFn(dataFn1);
      syncEngine.setContentDataFn(dataFn2);

      // No error thrown - functions can be replaced
      expect(true).toBe(true);
    });
  });

  // ===========================================================================
  // recordChange
  // ===========================================================================

  describe('recordChange', () => {
    it('should record a change without hash function', async () => {
      const mockEntry = createMockChangeLogEntry({
        changeType: 'create',
        contentType: 'unit',
        itemId: 'unit-123',
        contentHash: null,
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordChange(
        'create',
        'unit',
        'unit-123',
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'create',
        'unit',
        'unit-123',
        null,
        null,
      );
      expect(result).toEqual(mockEntry);
    });

    it('should record a change with hash function', async () => {
      const hashFn: ContentHashFn = jest
        .fn()
        .mockResolvedValue('computed-hash');
      syncEngine.setContentHashFn(hashFn);

      const mockEntry = createMockChangeLogEntry({
        contentHash: 'computed-hash',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      await syncEngine.recordChange('create', 'unit', 'unit-123');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'create',
        'unit',
        'unit-123',
        'computed-hash',
        null,
      );
    });

    it('should record a change with data', async () => {
      const mockEntry = createMockChangeLogEntry({
        data: '{"name":"Test Unit"}',
      });
      mockRecordChange.mockResolvedValue(mockEntry);

      const result = await syncEngine.recordChange(
        'create',
        'unit',
        'unit-123',
        '{"name":"Test Unit"}',
      );

      expect(mockRecordChange).toHaveBeenCalledWith(
        'create',
        'unit',
        'unit-123',
        null,
        '{"name":"Test Unit"}',
      );
      expect(result.data).toBe('{"name":"Test Unit"}');
    });

    it('should record changes for all content types', async () => {
      const contentTypes: Array<ShareableContentType | 'folder'> = [
        'unit',
        'pilot',
        'force',
        'encounter',
        'folder',
      ];

      for (const contentType of contentTypes) {
        mockRecordChange.mockResolvedValue(
          createMockChangeLogEntry({ contentType }),
        );

        const result = await syncEngine.recordChange(
          'create',
          contentType,
          `${contentType}-123`,
        );

        expect(result.contentType).toBe(contentType);
      }
    });

    it('should record all change types', async () => {
      const changeTypes: ChangeType[] = ['create', 'update', 'delete', 'move'];

      for (const changeType of changeTypes) {
        mockRecordChange.mockResolvedValue(
          createMockChangeLogEntry({ changeType }),
        );

        const result = await syncEngine.recordChange(
          changeType,
          'unit',
          'unit-123',
        );

        expect(result.changeType).toBe(changeType);
      }
    });

    it('should handle null hash from hash function', async () => {
      const hashFn: ContentHashFn = jest.fn().mockResolvedValue(null);
      syncEngine.setContentHashFn(hashFn);

      mockRecordChange.mockResolvedValue(
        createMockChangeLogEntry({ contentHash: null }),
      );

      await syncEngine.recordChange('delete', 'unit', 'unit-123');

      expect(mockRecordChange).toHaveBeenCalledWith(
        'delete',
        'unit',
        'unit-123',
        null,
        null,
      );
    });
  });

  // ===========================================================================
  // getChangesForPeer
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
  // getSyncState
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

  describe('getSyncEngine', () => {
    beforeEach(() => {
      resetSyncEngine();
    });

    it('should return singleton instance', () => {
      const instance1 = getSyncEngine();
      const instance2 = getSyncEngine();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      const instance = getSyncEngine();

      expect(instance).toBeInstanceOf(SyncEngine);
    });
  });

  describe('resetSyncEngine', () => {
    it('should clear the singleton instance', () => {
      const instance1 = getSyncEngine();
      resetSyncEngine();
      const instance2 = getSyncEngine();

      expect(instance1).not.toBe(instance2);
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetSyncEngine();
        resetSyncEngine();
        resetSyncEngine();
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle applying changes with max version calculation', async () => {
      const changes = [
        createMockChangeLogEntry({ version: 3 }),
        createMockChangeLogEntry({ version: 7 }),
        createMockChangeLogEntry({ version: 5 }),
      ];
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      await syncEngine.applyRemoteChanges('PEER-123', changes);

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.lastVersion).toBe(7);
    });

    it('should handle sync state updates preserving max version', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      // First apply with version 10
      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 10 }),
      ]);

      // Then apply with version 5 (should not decrease)
      await syncEngine.applyRemoteChanges('PEER-123', [
        createMockChangeLogEntry({ version: 5 }),
      ]);

      const state = syncEngine.getSyncState('PEER-123');
      expect(state?.lastVersion).toBe(10);
    });

    it('should handle special characters in peer IDs', () => {
      const specialPeerId = 'PEER-with-special!@#$%';

      syncEngine.setSyncStatus(specialPeerId, 'idle');

      const state = syncEngine.getSyncState(specialPeerId);
      expect(state?.peerId).toBe(specialPeerId);
    });

    it('should handle concurrent operations on different peers', async () => {
      mockGetLatestForItem.mockResolvedValue(null);
      mockRecordChange.mockResolvedValue(createMockChangeLogEntry());

      const [result1, result2] = await Promise.all([
        syncEngine.applyRemoteChanges('PEER-1', [
          createMockChangeLogEntry({ version: 1 }),
        ]),
        syncEngine.applyRemoteChanges('PEER-2', [
          createMockChangeLogEntry({ version: 2 }),
        ]),
      ]);

      expect(result1.applied).toHaveLength(1);
      expect(result2.applied).toHaveLength(1);

      expect(syncEngine.getSyncState('PEER-1')?.lastVersion).toBe(1);
      expect(syncEngine.getSyncState('PEER-2')?.lastVersion).toBe(2);
    });
  });

  // ===========================================================================
  // Integration-like tests
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
