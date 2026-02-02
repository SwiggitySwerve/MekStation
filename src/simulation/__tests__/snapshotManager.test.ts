/**
 * SnapshotManager Tests
 * TDD tests for snapshot persistence and loading.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SnapshotManager } from '../snapshot/SnapshotManager';
import { ISimulationRunResult } from '../runner/types';
import { ISimulationConfig } from '../core/types';
import { IViolation } from '../invariants/types';
import { ISnapshot } from '../snapshot/SnapshotManager';

// Test directory
const TEST_SNAPSHOT_DIR = 'src/simulation/__snapshots__/test';

// Helper to create test result
function createTestResult(seed: number, violations: IViolation[] = []): ISimulationRunResult {
  return {
    seed,
    winner: 'player',
    turns: 5,
    durationMs: 100,
    events: [],
    violations,
  };
}

// Helper to create test config
function createTestConfig(): ISimulationConfig {
  return {
    seed: 12345,
    turnLimit: 10,
    unitCount: {
      player: 2,
      opponent: 2,
    },
    mapRadius: 5,
  };
}

describe('SnapshotManager', () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    // Use test directory
    manager = new SnapshotManager(TEST_SNAPSHOT_DIR);
    
    // Clean test directory
    if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
      fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
      fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
    }
  });

  describe('saveFailedScenario', () => {
    it('should create snapshot directory if missing', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      manager.saveFailedScenario(result, config);

      expect(fs.existsSync(TEST_SNAPSHOT_DIR)).toBe(true);
    });

    it('should create file with correct name format', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      expect(filepath).toMatch(/12345_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(filepath.endsWith('.json')).toBe(true);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should save valid JSON with all required fields', () => {
      const violation: IViolation = {
        invariant: 'checkUnitPositionUniqueness',
        severity: 'critical',
        message: 'Multiple units at same position',
        context: { position: { q: 0, r: 0 } },
      };
      const result = createTestResult(12345, [violation]);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      const content = fs.readFileSync(filepath, 'utf-8');
      const snapshot = JSON.parse(content) as ISnapshot;

      expect(snapshot.seed).toBe(12345);
      expect(snapshot.config).toEqual(config);
      expect(snapshot.events).toEqual([]);
      expect(snapshot.violations).toHaveLength(1);
      expect(snapshot.violations[0]).toEqual(violation);
      expect(snapshot.timestamp).toBeDefined();
      expect(new Date(snapshot.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should pretty-print JSON with 2-space indentation', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Check for indentation
      expect(content).toContain('  "seed"');
      expect(content).toContain('  "config"');
    });

    it('should return absolute filepath', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      expect(path.isAbsolute(filepath)).toBe(true);
    });

    it('should handle multiple snapshots with same seed', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath1 = manager.saveFailedScenario(result, config);
      
      // Wait 1ms to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Busy wait
      }
      
      const filepath2 = manager.saveFailedScenario(result, config);

      expect(filepath1).not.toBe(filepath2);
      expect(fs.existsSync(filepath1)).toBe(true);
      expect(fs.existsSync(filepath2)).toBe(true);
    });
  });

  describe('loadSnapshot', () => {
    it('should load snapshot and return IGameSession', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.id).toMatch(/^snapshot-12345/);
      expect(session.config.mapRadius).toBe(5);
      expect(session.config.turnLimit).toBe(10);
      expect(session.events).toEqual([]);
    });

    it('should throw error if file does not exist', () => {
      const fakePath = path.join(TEST_SNAPSHOT_DIR, 'nonexistent.json');

      expect(() => manager.loadSnapshot(fakePath)).toThrow();
    });

    it('should throw error if JSON is invalid', () => {
      // Create invalid JSON file
      fs.mkdirSync(TEST_SNAPSHOT_DIR, { recursive: true });
      const filepath = path.join(TEST_SNAPSHOT_DIR, 'invalid.json');
      fs.writeFileSync(filepath, 'not valid json', 'utf-8');

      expect(() => manager.loadSnapshot(filepath)).toThrow();
    });
  });

  describe('listSnapshots', () => {
    it('should return empty array if directory does not exist', () => {
      const snapshots = manager.listSnapshots();

      expect(snapshots).toEqual([]);
    });

    it('should return array of snapshot filepaths', () => {
      const result1 = createTestResult(12345);
      const result2 = createTestResult(67890);
      const config = createTestConfig();

      manager.saveFailedScenario(result1, config);
      manager.saveFailedScenario(result2, config);

      const snapshots = manager.listSnapshots();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).toMatch(/12345_.*\.json/);
      expect(snapshots[1]).toMatch(/67890_.*\.json/);
    });

    it('should only return .json files', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      manager.saveFailedScenario(result, config);

      // Create non-JSON file
      fs.writeFileSync(path.join(TEST_SNAPSHOT_DIR, 'readme.txt'), 'test', 'utf-8');

      const snapshots = manager.listSnapshots();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].endsWith('.json')).toBe(true);
    });
  });

  describe('deleteOldSnapshots', () => {
    it('should delete snapshots older than specified days', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      // Set file mtime to 31 days ago
      const oldTime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      fs.utimesSync(filepath, oldTime, oldTime);

      const deletedCount = manager.deleteOldSnapshots(30);

      expect(deletedCount).toBe(1);
      expect(fs.existsSync(filepath)).toBe(false);
    });

    it('should not delete recent snapshots', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      const deletedCount = manager.deleteOldSnapshots(30);

      expect(deletedCount).toBe(0);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should return count of deleted files', () => {
      const config = createTestConfig();

      // Create 3 old snapshots
      for (let i = 0; i < 3; i++) {
        const result = createTestResult(12345 + i);
        const filepath = manager.saveFailedScenario(result, config);
        const oldTime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
        fs.utimesSync(filepath, oldTime, oldTime);
      }

      const deletedCount = manager.deleteOldSnapshots(30);

      expect(deletedCount).toBe(3);
    });

    it('should handle empty directory', () => {
      const deletedCount = manager.deleteOldSnapshots(30);

      expect(deletedCount).toBe(0);
    });
  });
});
