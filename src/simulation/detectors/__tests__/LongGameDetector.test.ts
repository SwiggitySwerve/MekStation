/**
 * LongGameDetector Tests
 *
 * Comprehensive test suite covering:
 * - Threshold detection and anomaly creation
 * - Battle-level anomaly structure (turn=null, unitId=null)
 * - Single anomaly per battle
 * - Edge cases and boundary conditions
 */

import { LongGameDetector } from '../LongGameDetector';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Test Fixtures
// =============================================================================

const createGameEvent = (
  gameId: string,
  turn: number,
  type: GameEventType = GameEventType.TurnEnded,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type,
  turn,
  phase: GamePhase.End,
  payload: {},
});

const createTurnEndedEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent => createGameEvent(gameId, turn, GameEventType.TurnEnded, sequence);

const createDamageEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent => createGameEvent(gameId, turn, GameEventType.DamageApplied, sequence);

// =============================================================================
// Tests
// =============================================================================

describe('LongGameDetector', () => {
  let detector: LongGameDetector;

  beforeEach(() => {
    detector = new LongGameDetector();
  });

  // =========================================================================
  // Basic Threshold Detection Tests
  // =========================================================================

  describe('basic threshold detection', () => {
    it('detects long game when turns exceed threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'long-game',
        severity: 'info',
        actualValue: 51,
        thresholdUsed: 50,
      });
    });

    it('ignores battles within threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 50', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(50);
    });

    it('detects long game at exact threshold + 1', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = detector.detect(events, 10);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(11);
    });

    it('does not detect at exact threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
      ];

      const anomalies = detector.detect(events, 10);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Battle-Level Anomaly Tests
  // =========================================================================

  describe('battle-level anomaly structure', () => {
    it('creates battle-level anomaly with turn=null', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].turn).toBeNull();
    });

    it('creates battle-level anomaly with unitId=null', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].unitId).toBeNull();
    });

    it('includes correct battleId in anomaly', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-123', 1),
        createTurnEndedEvent('game-123', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].battleId).toBe('game-123');
    });

    it('includes correct message format', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 75),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].message).toContain('exceeded expected duration');
      expect(anomalies[0].message).toContain('turn 75');
      expect(anomalies[0].message).toContain('threshold: 50');
    });

    it('includes correct configKey', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].configKey).toBe('longGameThreshold');
    });
  });

  // =========================================================================
  // Single Anomaly Per Battle Tests
  // =========================================================================

  describe('single anomaly per battle', () => {
    it('creates only one anomaly even if turns continue increasing', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 75),
        createTurnEndedEvent('game-1', 100),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('records max turn at time of threshold breach', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 100),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].actualValue).toBe(51);
    });

    it('does not create duplicate anomalies for same battle', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 52),
        createTurnEndedEvent('game-1', 53),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Multiple Battles Tests
  // =========================================================================

  describe('multiple battles', () => {
    it('detects long games in multiple battles', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 75),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].battleId).toBe('game-1');
      expect(anomalies[1].battleId).toBe('game-2');
    });

    it('tracks separate max turns for different battles', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 100),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].actualValue).toBe(51);
      expect(anomalies[1].actualValue).toBe(100);
    });

    it('does not detect long game in short battle when another is long', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 25),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-1');
    });
  });

  // =========================================================================
  // Event Type Handling Tests
  // =========================================================================

  describe('event type handling', () => {
    it('detects long game from any event type', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });

    it('processes events in order regardless of type', () => {
      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createDamageEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });
  });

  // =========================================================================
  // Anomaly Metadata Tests
  // =========================================================================

  describe('anomaly metadata', () => {
    it('generates unique anomaly IDs', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].id).not.toBe(anomalies[1].id);
      expect(anomalies[0].id).toContain('anom-long-game');
    });

    it('includes timestamp in anomaly', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
      expect(typeof anomalies[0].timestamp).toBe('number');
    });

    it('sets severity to info', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].severity).toBe('info');
    });

    it('includes threshold and actual value', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 75),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies[0].thresholdUsed).toBe(50);
      expect(anomalies[0].actualValue).toBe(75);
    });
  });

  // =========================================================================
  // Edge Cases and Boundary Conditions
  // =========================================================================

  describe('edge cases and boundary conditions', () => {
    it('handles empty event list', () => {
      const anomalies = detector.detect([], 50);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single event', () => {
      const events: IGameEvent[] = [createTurnEndedEvent('game-1', 1)];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
      ];

      const anomalies = detector.detect(events, 1);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(2);
    });

    it('handles very large threshold', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 100),
        createTurnEndedEvent('game-1', 1000),
      ];

      const anomalies = detector.detect(events, 10000);

      expect(anomalies).toHaveLength(0);
    });

    it('handles very large turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 999999),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(999999);
    });

    it('handles non-sequential turns', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles turns in reverse order', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 100),
        createTurnEndedEvent('game-1', 75),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(100);
    });

    it('handles duplicate turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
    });

    it('handles turn 0', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 0),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles negative turn numbers', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', -10),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });
  });

  // =========================================================================
  // Threshold Variation Tests
  // =========================================================================

  describe('threshold variations', () => {
    it('respects custom threshold of 10', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = detector.detect(events, 10);

      expect(anomalies).toHaveLength(1);
    });

    it('respects custom threshold of 100', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 101),
      ];

      const anomalies = detector.detect(events, 100);

      expect(anomalies).toHaveLength(1);
    });

    it('respects custom threshold of 200', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 150),
      ];

      const anomalies = detector.detect(events, 200);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration scenarios', () => {
    it('handles realistic battle with mixed events', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 5),
        createTurnEndedEvent('game-1', 10),
        createDamageEvent('game-1', 25),
        createTurnEndedEvent('game-1', 50),
        createTurnEndedEvent('game-1', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].actualValue).toBe(51);
    });

    it('handles multiple battles with different thresholds', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 51),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 101),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(2);
    });

    it('detects long game in second battle only', () => {
      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 25),
        createTurnEndedEvent('game-2', 1),
        createTurnEndedEvent('game-2', 51),
      ];

      const anomalies = detector.detect(events, 50);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-2');
    });
  });
});
