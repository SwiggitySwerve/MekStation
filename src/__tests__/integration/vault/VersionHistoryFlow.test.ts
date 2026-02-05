/**
 * Version History Flow Integration Tests
 *
 * Tests the complete version history lifecycle:
 * - Save versions with change tracking
 * - View version history
 * - Compare versions (diff)
 * - Rollback to previous versions
 * - Prune old versions
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { MockVersionHistoryRepository } from '@/__tests__/helpers/vault';
import {
  VersionHistoryService,
  type ApplyContentFn,
} from '@/services/vault/VersionHistoryService';

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestMech {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  armor: { total: number };
  weapons: Array<{ name: string; location: string }>;
  notes?: string;
}

const createMechContent = (overrides: Partial<TestMech> = {}): string => {
  const mech: TestMech = {
    id: 'unit-test-1',
    chassis: 'Atlas',
    model: 'AS7-D',
    tonnage: 100,
    techBase: 'Inner Sphere',
    armor: { total: 304 },
    weapons: [
      { name: 'AC/20', location: 'RT' },
      { name: 'LRM 20', location: 'LT' },
    ],
    ...overrides,
  };
  return JSON.stringify(mech);
};

// =============================================================================
// Integration Tests
// =============================================================================

describe('Version History Flow Integration', () => {
  let service: VersionHistoryService;
  let mockRepo: MockVersionHistoryRepository;
  let appliedContent: string | null;

  beforeEach(() => {
    mockRepo = new MockVersionHistoryRepository();
    service = new VersionHistoryService(mockRepo as never);
    appliedContent = null;

    // Mock apply function that tracks what was applied
    const applyFn: ApplyContentFn = async (_itemId, _contentType, content) => {
      appliedContent = content;
      return true;
    };
    service.setApplyContentFn(applyFn);
  });

  afterEach(() => {
    mockRepo.clear();
  });

  // ===========================================================================
  // Full Version Lifecycle
  // ===========================================================================

  describe('Full Version Lifecycle', () => {
    it('should track a mech through multiple version changes', async () => {
      const itemId = 'unit-atlas-1';

      // Create initial version
      const v1 = await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'AS7-D' }),
        'local',
        { message: 'Initial creation' },
      );
      expect(v1?.version).toBe(1);

      // Modify weapons
      const v2 = await service.saveVersion(
        'unit',
        itemId,
        createMechContent({
          model: 'AS7-D',
          weapons: [
            { name: 'AC/20', location: 'RT' },
            { name: 'LRM 20', location: 'LT' },
            { name: 'Medium Laser', location: 'CT' },
          ],
        }),
        'local',
        { message: 'Added Medium Laser' },
      );
      expect(v2?.version).toBe(2);

      // Change model variant
      const v3 = await service.saveVersion(
        'unit',
        itemId,
        createMechContent({
          model: 'AS7-D-DC',
          notes: 'Command variant',
          weapons: [
            { name: 'AC/20', location: 'RT' },
            { name: 'LRM 20', location: 'LT' },
            { name: 'Medium Laser', location: 'CT' },
          ],
        }),
        'local',
        { message: 'Upgraded to command variant' },
      );
      expect(v3?.version).toBe(3);

      // Verify history
      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3);
      expect(history[0].message).toBe('Upgraded to command variant');
      expect(history[2].version).toBe(1);
      expect(history[2].message).toBe('Initial creation');
    });

    it('should support collaborative version tracking', async () => {
      const itemId = 'unit-shared-1';

      // User A creates initial version
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ chassis: 'Timber Wolf' }),
        'USER-A-CODE',
        { message: 'Created by User A' },
      );

      // User B makes changes
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ chassis: 'Timber Wolf', model: 'Prime' }),
        'USER-B-CODE',
        { message: 'Updated by User B' },
      );

      // User A makes more changes
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({
          chassis: 'Timber Wolf',
          model: 'Prime',
          notes: 'Clan OmniMech',
        }),
        'USER-A-CODE',
        { message: 'User A added notes' },
      );

      const history = await service.getHistory(itemId, 'unit');

      // Should have contributions from both users
      const userAVersions = history.filter(
        (v) => v.createdBy === 'USER-A-CODE',
      );
      const userBVersions = history.filter(
        (v) => v.createdBy === 'USER-B-CODE',
      );

      expect(userAVersions).toHaveLength(2);
      expect(userBVersions).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Version Diff Workflow
  // ===========================================================================

  describe('Version Diff Workflow', () => {
    it('should show detailed changes between versions', async () => {
      const itemId = 'unit-diff-test';

      // Version 1: Base mech
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({
          model: 'AS7-D',
          tonnage: 100,
        }),
        'local',
      );

      // Version 2: Changed model and added notes
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({
          model: 'AS7-K',
          tonnage: 100,
          notes: 'Kurita variant',
        }),
        'local',
      );

      const diff = await service.diffVersions(itemId, 'unit', 1, 2);

      expect(diff).toBeDefined();
      expect(diff?.changedFields).toContain('model');
      expect(diff?.changedFields).toContain('notes');
      expect(diff?.additions).toHaveProperty('notes', 'Kurita variant');
      expect(diff?.modifications).toHaveProperty('model');
      expect(diff?.modifications.model).toEqual({
        from: 'AS7-D',
        to: 'AS7-K',
      });
    });

    it('should detect removed fields', async () => {
      const itemId = 'unit-removal-test';

      // Version 1: Has notes
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ notes: 'To be removed' }),
        'local',
      );

      // Version 2: Notes removed
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent(), // No notes
        'local',
      );

      const diff = await service.diffVersions(itemId, 'unit', 1, 2);

      expect(diff?.deletions).toHaveProperty('notes', 'To be removed');
    });

    it('should compare any version with latest', async () => {
      const itemId = 'unit-compare-latest';

      // Create multiple versions
      for (let i = 1; i <= 5; i++) {
        await service.saveVersion(
          'unit',
          itemId,
          createMechContent({ model: `Model-${i}` }),
          'local',
        );
      }

      // Compare v2 with latest (v5)
      const diff = await service.diffWithLatest(itemId, 'unit', 2);

      expect(diff?.fromVersion).toBe(2);
      expect(diff?.toVersion).toBe(5);
      expect(diff?.modifications.model).toEqual({
        from: 'Model-2',
        to: 'Model-5',
      });
    });
  });

  // ===========================================================================
  // Rollback Workflow
  // ===========================================================================

  describe('Rollback Workflow', () => {
    it('should rollback to a previous version and create new version', async () => {
      const itemId = 'unit-rollback';

      // Create versions
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'Original' }),
        'local',
        { message: 'Original version' },
      );

      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'Bad Change' }),
        'local',
        { message: 'Mistake' },
      );

      // Rollback to v1
      const result = await service.rollbackToVersion(
        itemId,
        'unit',
        1,
        'local',
      );

      expect(result.success).toBe(true);
      expect(result.restoredVersion?.version).toBe(3); // New version created
      expect(result.restoredVersion?.message).toBe('Rollback to version 1');

      // Verify content was applied
      expect(appliedContent).toBeDefined();
      const applied = JSON.parse(appliedContent!) as TestMech;
      expect(applied.model).toBe('Original');

      // History should show rollback
      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Rollback to version 1');
    });

    it('should preserve full history after rollback', async () => {
      const itemId = 'unit-rollback-history';

      // Create 3 versions
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'V1' }),
        'local',
      );
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'V2' }),
        'local',
      );
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'V3' }),
        'local',
      );

      // Rollback to v1
      await service.rollbackToVersion(itemId, 'unit', 1, 'local');

      // All versions should still exist
      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(4); // V1, V2, V3, V4(rollback)

      // Can still access V3 content
      const v3 = await service.getVersion(itemId, 'unit', 3);
      expect(v3).toBeDefined();
      const v3Content = JSON.parse(v3!.content) as TestMech;
      expect(v3Content.model).toBe('V3');
    });

    it('should fail gracefully for non-existent version', async () => {
      const itemId = 'unit-bad-rollback';

      await service.saveVersion('unit', itemId, createMechContent(), 'local');

      const result = await service.rollbackToVersion(
        itemId,
        'unit',
        99,
        'local',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ===========================================================================
  // Version Pruning Workflow
  // ===========================================================================

  describe('Version Pruning Workflow', () => {
    it('should keep only N most recent versions', async () => {
      const itemId = 'unit-prune';

      // Create 10 versions
      for (let i = 1; i <= 10; i++) {
        await service.saveVersion(
          'unit',
          itemId,
          createMechContent({ model: `V${i}` }),
          'local',
        );
      }

      // Prune to keep only 3
      const deleted = await service.pruneVersions(itemId, 'unit', 3);
      expect(deleted).toBe(7);

      // Should have versions 8, 9, 10
      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(3);
      expect(history.map((v) => v.version)).toEqual([10, 9, 8]);
    });

    it('should not prune if fewer versions than keep count', async () => {
      const itemId = 'unit-no-prune';

      // Create 2 versions
      await service.saveVersion('unit', itemId, createMechContent(), 'local');
      await service.saveVersion('unit', itemId, createMechContent(), 'local');

      // Try to prune with keepCount of 5
      const deleted = await service.pruneVersions(itemId, 'unit', 5);
      expect(deleted).toBe(0);

      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(2);
    });

    it('should delete all versions for an item', async () => {
      const itemId = 'unit-delete-all';
      const otherId = 'unit-keep';

      // Create versions for both items
      await service.saveVersion('unit', itemId, createMechContent(), 'local');
      await service.saveVersion('unit', itemId, createMechContent(), 'local');
      await service.saveVersion('unit', otherId, createMechContent(), 'local');

      // Delete all for first item
      const deleted = await service.deleteAllVersions(itemId, 'unit');
      expect(deleted).toBe(2);

      // First item should have no versions
      const itemHistory = await service.getHistory(itemId, 'unit');
      expect(itemHistory).toHaveLength(0);

      // Other item should be unaffected
      const otherHistory = await service.getHistory(otherId, 'unit');
      expect(otherHistory).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Skip Unchanged Content
  // ===========================================================================

  describe('Skip Unchanged Content', () => {
    it('should not create version for identical content', async () => {
      const itemId = 'unit-skip-unchanged';
      const content = createMechContent();

      // Create initial version
      const v1 = await service.saveVersion('unit', itemId, content, 'local');
      expect(v1?.version).toBe(1);

      // Try to create another with same content
      const v2 = await service.saveVersion('unit', itemId, content, 'local', {
        skipIfUnchanged: true,
      });
      expect(v2).toBeNull();

      // Should still have only 1 version
      const history = await service.getHistory(itemId, 'unit');
      expect(history).toHaveLength(1);
    });

    it('should create version when content changes', async () => {
      const itemId = 'unit-changed';

      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'V1' }),
        'local',
        { skipIfUnchanged: true },
      );

      const v2 = await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ model: 'V2' }),
        'local',
        { skipIfUnchanged: true },
      );

      expect(v2).toBeDefined();
      expect(v2?.version).toBe(2);
    });
  });

  // ===========================================================================
  // History Summary
  // ===========================================================================

  describe('History Summary', () => {
    it('should provide accurate history summary', async () => {
      const itemId = 'unit-summary';

      // Create several versions with varying sizes
      await service.saveVersion('unit', itemId, createMechContent(), 'local');
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ notes: 'Added notes' }),
        'local',
      );
      await service.saveVersion(
        'unit',
        itemId,
        createMechContent({ notes: 'More notes with longer content' }),
        'local',
      );

      const summary = await service.getHistorySummary(itemId, 'unit');

      expect(summary.itemId).toBe(itemId);
      expect(summary.contentType).toBe('unit');
      expect(summary.currentVersion).toBe(3);
      expect(summary.totalVersions).toBe(3);
      expect(summary.totalSizeBytes).toBeGreaterThan(0);
      expect(summary.oldestVersion).toBeDefined();
      expect(summary.newestVersion).toBeDefined();
    });
  });
});
