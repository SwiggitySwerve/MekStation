/**
 * Snapshot Replay Integration Tests
 * Tests integration between SnapshotManager and replay infrastructure.
 */

import * as fs from 'fs';
import { SnapshotManager, ISnapshot } from '../snapshot/SnapshotManager';
import { ISimulationRunResult } from '../runner/types';
import { ISimulationConfig } from '../core/types';
import { IViolation } from '../invariants/types';
import { GamePhase, GameEventType, GameSide } from '@/types/gameplay/GameSessionInterfaces';

const TEST_SNAPSHOT_DIR = 'src/simulation/__snapshots__/test-replay';

function createTestResult(seed: number, violations: IViolation[] = []): ISimulationRunResult {
  return {
    seed,
    winner: 'player',
    turns: 5,
    durationMs: 100,
    events: [
      {
        id: 'evt-1',
        gameId: 'game-1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: { firstSide: GameSide.Player },
      },
      {
        id: 'evt-2',
        gameId: 'game-1',
        sequence: 2,
        timestamp: new Date().toISOString(),
        type: GameEventType.TurnStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: {},
      },
    ],
    violations,
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
  };
}

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

describe('Snapshot Replay Integration', () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    manager = new SnapshotManager(TEST_SNAPSHOT_DIR);
    
    if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
      fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
      fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
    }
  });

  describe('Event Persistence', () => {
    it('should save and load events correctly', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.events).toHaveLength(2);
      expect(session.events[0].type).toBe(GameEventType.GameStarted);
      expect(session.events[1].type).toBe(GameEventType.TurnStarted);
    });

    it('should preserve event sequence numbers', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.events[0].sequence).toBe(1);
      expect(session.events[1].sequence).toBe(2);
    });

    it('should preserve event payloads', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.events[0].payload).toEqual({ firstSide: 'player' });
    });
  });

  describe('Violation Persistence', () => {
    it('should save violations with snapshots', () => {
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

      expect(snapshot.violations).toHaveLength(1);
      expect(snapshot.violations[0].invariant).toBe('checkUnitPositionUniqueness');
    });

    it('should handle multiple violations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkUnitPositionUniqueness',
          severity: 'critical',
          message: 'Multiple units at same position',
          context: {},
        },
        {
          invariant: 'checkHeatNonNegative',
          severity: 'critical',
          message: 'Negative heat value',
          context: {},
        },
      ];
      const result = createTestResult(12345, violations);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);

      const content = fs.readFileSync(filepath, 'utf-8');
      const snapshot = JSON.parse(content) as ISnapshot;

      expect(snapshot.violations).toHaveLength(2);
    });
  });

  describe('Replay Compatibility', () => {
    it('should create IGameSession compatible with useReplayPlayer', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.id).toBeDefined();
      expect(session.config).toBeDefined();
      expect(session.events).toBeDefined();
      expect(Array.isArray(session.events)).toBe(true);
      expect(session.currentState).toBeDefined();
    });

    it('should include required IGameSession fields', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.id).toBeTruthy();
      expect(session.createdAt).toBeTruthy();
      expect(session.updatedAt).toBeTruthy();
      expect(session.config).toBeTruthy();
      expect(session.units).toBeDefined();
      expect(session.events).toBeDefined();
      expect(session.currentState).toBeTruthy();
    });

    it('should set initial game state correctly', () => {
      const result = createTestResult(12345);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.currentState.gameId).toBe('snapshot-12345');
      expect(session.currentState.status).toBe('active');
      expect(session.currentState.turn).toBe(1);
      expect(session.currentState.phase).toBe('initiative');
    });
  });

  describe('Seed-Based Reproducibility', () => {
    it('should preserve seed in snapshot ID', () => {
      const result = createTestResult(99999);
      const config = createTestConfig();

      const filepath = manager.saveFailedScenario(result, config);
      const session = manager.loadSnapshot(filepath);

      expect(session.id).toContain('99999');
    });

    it('should allow loading multiple snapshots with different seeds', () => {
      const config = createTestConfig();

      const filepath1 = manager.saveFailedScenario(createTestResult(11111), config);
      const filepath2 = manager.saveFailedScenario(createTestResult(22222), config);

      const session1 = manager.loadSnapshot(filepath1);
      const session2 = manager.loadSnapshot(filepath2);

      expect(session1.id).toContain('11111');
      expect(session2.id).toContain('22222');
    });
  });

  describe('Cleanup Utility', () => {
    it('should export cleanup function', async () => {
      const snapshotModule = await import('../snapshot');
      
      expect(typeof snapshotModule.cleanupOldSnapshots).toBe('function');
    });
  });
});
