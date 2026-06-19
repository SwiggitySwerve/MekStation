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
});
