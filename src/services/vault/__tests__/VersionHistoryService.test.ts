/**
 * Version History Service Tests
 *
 * Tests for version history management including
 * tracking, diffing, and rollback functionality.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { VersionHistoryService, type ApplyContentFn } from '../VersionHistoryService';
import {
  MockVersionHistoryRepository,
  mockUnitContent,
  mockUnitContentV2,
} from '@/__tests__/helpers/vault';

// =============================================================================
// Tests
// =============================================================================

describe('VersionHistoryService', () => {
  let service: VersionHistoryService;
  let mockRepo: MockVersionHistoryRepository;

  beforeEach(() => {
    mockRepo = new MockVersionHistoryRepository();
    service = new VersionHistoryService(mockRepo as never);
  });

  afterEach(() => {
    mockRepo.clear();
  });

  // ===========================================================================
  // Version Tracking
  // ===========================================================================

  describe('Version Tracking', () => {
    it('should save a new version', async () => {
      const version = await service.saveVersion(
        'unit',
        'unit-atlas-1',
        mockUnitContent,
        'local'
      );

      expect(version).toBeDefined();
      expect(version?.contentType).toBe('unit');
      expect(version?.itemId).toBe('unit-atlas-1');
      expect(version?.version).toBe(1);
      expect(version?.createdBy).toBe('local');
      expect(version?.content).toBe(mockUnitContent);
    });

    it('should save version with message', async () => {
      const version = await service.saveVersion(
        'unit',
        'unit-atlas-1',
        mockUnitContent,
        'local',
        { message: 'Initial commit' }
      );

      expect(version?.message).toBe('Initial commit');
    });

    it('should increment version number for same item', async () => {
      await service.saveVersion('unit', 'unit-atlas-1', mockUnitContent, 'local');
      const v2 = await service.saveVersion('unit', 'unit-atlas-1', mockUnitContentV2, 'local');

      expect(v2?.version).toBe(2);
    });

    it('should skip unchanged content when requested', async () => {
      await service.saveVersion('unit', 'unit-atlas-1', mockUnitContent, 'local');
      
      // Same content, should skip
      const v2 = await service.saveVersion(
        'unit',
        'unit-atlas-1',
        mockUnitContent,
        'local',
        { skipIfUnchanged: true }
      );

      expect(v2).toBeNull();
    });

    it('should not skip when content changes', async () => {
      await service.saveVersion('unit', 'unit-atlas-1', mockUnitContent, 'local');
      
      const v2 = await service.saveVersion(
        'unit',
        'unit-atlas-1',
        mockUnitContentV2,
        'local',
        { skipIfUnchanged: true }
      );

      expect(v2).toBeDefined();
      expect(v2?.version).toBe(2);
    });

    it('should get version history', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":3}', 'local');

      const history = await service.getHistory('unit-1', 'unit');

      expect(history).toHaveLength(3);
      // Should be newest first
      expect(history[0].version).toBe(3);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(1);
    });

    it('should get history with limit', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":3}', 'local');

      const history = await service.getHistory('unit-1', 'unit', 2);

      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(3);
      expect(history[1].version).toBe(2);
    });

    it('should get specific version', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      const v1 = await service.getVersion('unit-1', 'unit', 1);
      const v2 = await service.getVersion('unit-1', 'unit', 2);

      expect(v1?.version).toBe(1);
      expect(v1?.content).toBe('{"v":1}');
      expect(v2?.version).toBe(2);
      expect(v2?.content).toBe('{"v":2}');
    });

    it('should return null for non-existent version', async () => {
      const v = await service.getVersion('unit-1', 'unit', 99);
      expect(v).toBeNull();
    });

    it('should get version by ID', async () => {
      const saved = await service.saveVersion('unit', 'unit-1', mockUnitContent, 'local');
      
      const found = await service.getVersionById(saved!.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(saved!.id);
      expect(found?.content).toBe(mockUnitContent);
    });

    it('should get latest version', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      const latest = await service.getLatestVersion('unit-1', 'unit');

      expect(latest?.version).toBe(2);
      expect(latest?.content).toBe('{"v":2}');
    });

    it('should return null for item with no versions', async () => {
      const latest = await service.getLatestVersion('non-existent', 'unit');
      expect(latest).toBeNull();
    });
  });

  // ===========================================================================
  // Version Diff
  // ===========================================================================

  describe('Version Diff', () => {
    it('should diff two versions', async () => {
      await service.saveVersion('unit', 'unit-1', mockUnitContent, 'local');
      await service.saveVersion('unit', 'unit-1', mockUnitContentV2, 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 2);

      expect(diff).toBeDefined();
      expect(diff?.fromVersion).toBe(1);
      expect(diff?.toVersion).toBe(2);
      expect(diff?.changedFields).toContain('model'); // AS7-D -> AS7-D-DC
      expect(diff?.changedFields).toContain('weapons');
      expect(diff?.changedFields).toContain('notes'); // New field
    });

    it('should detect additions in diff', async () => {
      const v1Content = JSON.stringify({ name: 'Test' });
      const v2Content = JSON.stringify({ name: 'Test', added: 'new' });

      await service.saveVersion('unit', 'unit-1', v1Content, 'local');
      await service.saveVersion('unit', 'unit-1', v2Content, 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 2);

      expect(diff?.additions).toHaveProperty('added', 'new');
    });

    it('should detect deletions in diff', async () => {
      const v1Content = JSON.stringify({ name: 'Test', removed: 'old' });
      const v2Content = JSON.stringify({ name: 'Test' });

      await service.saveVersion('unit', 'unit-1', v1Content, 'local');
      await service.saveVersion('unit', 'unit-1', v2Content, 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 2);

      expect(diff?.deletions).toHaveProperty('removed', 'old');
    });

    it('should detect modifications in diff', async () => {
      const v1Content = JSON.stringify({ value: 1 });
      const v2Content = JSON.stringify({ value: 2 });

      await service.saveVersion('unit', 'unit-1', v1Content, 'local');
      await service.saveVersion('unit', 'unit-1', v2Content, 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 2);

      expect(diff?.modifications).toHaveProperty('value');
      expect(diff?.modifications.value).toEqual({ from: 1, to: 2 });
    });

    it('should return null for non-existent versions', async () => {
      await service.saveVersion('unit', 'unit-1', mockUnitContent, 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 99);

      expect(diff).toBeNull();
    });

    it('should diff with latest', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":3}', 'local');

      const diff = await service.diffWithLatest('unit-1', 'unit', 1);

      expect(diff?.fromVersion).toBe(1);
      expect(diff?.toVersion).toBe(3);
    });

    it('should handle non-JSON content gracefully', async () => {
      await service.saveVersion('unit', 'unit-1', 'not json', 'local');
      await service.saveVersion('unit', 'unit-1', 'also not json', 'local');

      const diff = await service.diffVersions('unit-1', 'unit', 1, 2);

      expect(diff).toBeDefined();
      expect(diff?.modifications).toHaveProperty('_raw');
    });
  });

  // ===========================================================================
  // Rollback
  // ===========================================================================

  describe('Rollback', () => {
    it('should rollback to a previous version', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":3}', 'local');

      const result = await service.rollbackToVersion('unit-1', 'unit', 1, 'local');

      expect(result.success).toBe(true);
      expect(result.restoredVersion).toBeDefined();
      expect(result.restoredVersion?.version).toBe(4); // New version created
      expect(result.restoredVersion?.content).toBe('{"v":1}');
      expect(result.restoredVersion?.message).toBe('Rollback to version 1');
    });

    it('should fail rollback for non-existent version', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');

      const result = await service.rollbackToVersion('unit-1', 'unit', 99, 'local');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should call apply content function on rollback', async () => {
      const applyFn: ApplyContentFn = jest.fn().mockResolvedValue(true);
      service.setApplyContentFn(applyFn);

      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      await service.rollbackToVersion('unit-1', 'unit', 1, 'local');

      expect(applyFn).toHaveBeenCalledWith('unit-1', 'unit', '{"v":1}');
    });

    it('should fail rollback if apply function fails', async () => {
      const applyFn: ApplyContentFn = jest.fn().mockResolvedValue(false);
      service.setApplyContentFn(applyFn);

      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      const result = await service.rollbackToVersion('unit-1', 'unit', 1, 'local');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to apply');
    });

    it('should rollback by version ID', async () => {
      const v1 = await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      const result = await service.rollbackToVersionById(v1!.id, 'local');

      expect(result.success).toBe(true);
      expect(result.restoredVersion?.content).toBe('{"v":1}');
    });
  });

  // ===========================================================================
  // History Summary
  // ===========================================================================

  describe('History Summary', () => {
    it('should get history summary', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":3}', 'local');

      const summary = await service.getHistorySummary('unit-1', 'unit');

      expect(summary.itemId).toBe('unit-1');
      expect(summary.contentType).toBe('unit');
      expect(summary.currentVersion).toBe(3);
      expect(summary.totalVersions).toBe(3);
      expect(summary.totalSizeBytes).toBeGreaterThan(0);
      expect(summary.oldestVersion).toBeDefined();
      expect(summary.newestVersion).toBeDefined();
    });

    it('should return zero values for item with no versions', async () => {
      const summary = await service.getHistorySummary('non-existent', 'unit');

      expect(summary.currentVersion).toBe(0);
      expect(summary.totalVersions).toBe(0);
      expect(summary.totalSizeBytes).toBe(0);
    });
  });

  // ===========================================================================
  // Version Pruning
  // ===========================================================================

  describe('Version Pruning', () => {
    it('should prune old versions keeping N most recent', async () => {
      // Create 5 versions
      for (let i = 1; i <= 5; i++) {
        await service.saveVersion('unit', 'unit-1', `{"v":${i}}`, 'local');
      }

      const deleted = await service.pruneVersions('unit-1', 'unit', 3);

      expect(deleted).toBe(2); // Deleted v1 and v2

      const remaining = await service.getHistory('unit-1', 'unit');
      expect(remaining).toHaveLength(3);
      expect(remaining.map(v => v.version)).toEqual([5, 4, 3]);
    });

    it('should not prune when fewer versions than keep count', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');

      const deleted = await service.pruneVersions('unit-1', 'unit', 5);

      expect(deleted).toBe(0);
    });

    it('should delete all versions for item', async () => {
      await service.saveVersion('unit', 'unit-1', '{"v":1}', 'local');
      await service.saveVersion('unit', 'unit-1', '{"v":2}', 'local');
      await service.saveVersion('unit', 'unit-2', '{"v":1}', 'local'); // Different item

      const deleted = await service.deleteAllVersions('unit-1', 'unit');

      expect(deleted).toBe(2);

      const unit1Versions = await service.getHistory('unit-1', 'unit');
      const unit2Versions = await service.getHistory('unit-2', 'unit');

      expect(unit1Versions).toHaveLength(0);
      expect(unit2Versions).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Multi-Item Isolation
  // ===========================================================================

  describe('Multi-Item Isolation', () => {
    it('should isolate versions by item ID', async () => {
      await service.saveVersion('unit', 'unit-1', '{"id":"unit-1"}', 'local');
      await service.saveVersion('unit', 'unit-2', '{"id":"unit-2"}', 'local');

      const history1 = await service.getHistory('unit-1', 'unit');
      const history2 = await service.getHistory('unit-2', 'unit');

      expect(history1).toHaveLength(1);
      expect(history1[0].itemId).toBe('unit-1');
      expect(history2).toHaveLength(1);
      expect(history2[0].itemId).toBe('unit-2');
    });

    it('should isolate versions by content type', async () => {
      await service.saveVersion('unit', 'item-1', '{"type":"unit"}', 'local');
      await service.saveVersion('pilot', 'item-1', '{"type":"pilot"}', 'local');

      const unitHistory = await service.getHistory('item-1', 'unit');
      const pilotHistory = await service.getHistory('item-1', 'pilot');

      expect(unitHistory).toHaveLength(1);
      expect(unitHistory[0].contentType).toBe('unit');
      expect(pilotHistory).toHaveLength(1);
      expect(pilotHistory[0].contentType).toBe('pilot');
    });
  });
});
