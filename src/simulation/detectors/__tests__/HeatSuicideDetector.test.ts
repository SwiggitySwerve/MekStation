/**
 * HeatSuicideDetector Tests
 *
 * Comprehensive test suite covering:
 * - Heat threshold detection
 * - Last-ditch exemption (3:1 outnumbering)
 * - Anomaly structure and metadata
 * - Edge cases and deduplication
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { HeatSuicideDetector, type BattleState } from '../HeatSuicideDetector';

// =============================================================================
// Test Fixtures
// =============================================================================

const createHeatEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  heat: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.HeatGenerated,
  turn,
  phase: GamePhase.Heat,
  actorId: unitId,
  payload: {
    unitId,
    amount: heat,
    source: 'weapons',
    newTotal: heat,
  } as IHeatPayload,
});

const createDestroyedEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-destroyed-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.UnitDestroyed,
  turn,
  phase: GamePhase.End,
  payload: {
    unitId,
    cause: 'damage' as const,
  },
});

const createBattleState = (
  units: Array<{ id: string; name: string; side: GameSide }>,
): BattleState => ({
  units: units.map((u) => ({
    id: u.id,
    name: u.name,
    side: u.side,
  })),
});

// =============================================================================
// Tests
// =============================================================================

describe('HeatSuicideDetector', () => {
  let detector: HeatSuicideDetector;

  beforeEach(() => {
    detector = new HeatSuicideDetector();
  });

  // =========================================================================
  // Basic Detection Tests
  // =========================================================================

  describe('basic heat detection', () => {
    it('detects heat above threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'heat-suicide',
        severity: 'warning',
        unitId: 'unit-1',
        actualValue: 35,
        thresholdUsed: 30,
        configKey: 'heatSuicideThreshold',
      });
    });

    it('ignores heat at threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 30, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('ignores heat below threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 25, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 30', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 31, 1),
      ];

      const anomalies = detector.detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(30);
    });
  });

  // =========================================================================
  // Last-Ditch Exemption Tests
  // =========================================================================

  describe('last-ditch exemption (3:1 outnumbering)', () => {
    it('exempts unit outnumbered 3:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('exempts unit outnumbered 4:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
        { id: 'opponent-4', name: 'Commando', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('detects heat when outnumbered 2:1 (not last-ditch)', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('detects heat when outnumbered 1:1 (not last-ditch)', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'player-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('exempts opponent unit outnumbered 3:1', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'player-2', name: 'Jagermech', side: GameSide.Player },
        { id: 'player-3', name: 'Enforcer', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'opponent-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Anomaly Structure Tests
  // =========================================================================

  describe('anomaly structure and metadata', () => {
    it('includes correct anomaly type and severity', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].type).toBe('heat-suicide');
      expect(anomalies[0].severity).toBe('warning');
    });

    it('includes threshold and actual value', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 42, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].thresholdUsed).toBe(30);
      expect(anomalies[0].actualValue).toBe(42);
    });

    it('includes config key', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].configKey).toBe('heatSuicideThreshold');
    });

    it('includes unit ID and name in message', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[0].message).toContain('Atlas AS7-D');
      expect(anomalies[0].message).toContain('35');
      expect(anomalies[0].message).toContain('30');
    });

    it('includes turn number', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 5, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes battle ID', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('battle-123', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].battleId).toBe('battle-123');
    });

    it('includes timestamp', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Multiple Events Tests
  // =========================================================================

  describe('multiple heat events per unit', () => {
    it('detects multiple heat events from same unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 2, 'unit-1', 40, 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(1);
      expect(anomalies[1].turn).toBe(2);
    });

    it('detects heat from multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 1, 'unit-2', 32, 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });
  });

  // =========================================================================
  // Shutdown Unit Tests
  // =========================================================================

  describe('shutdown units', () => {
    it('detects heat from destroyed unit before destruction event', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createDestroyedEvent('game-1', 1, 'unit-1', 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });

    it('exempts destroyed unit from last-ditch calculation', () => {
      const battleState = createBattleState([
        { id: 'player-1', name: 'Atlas', side: GameSide.Player },
        { id: 'opponent-1', name: 'Locust', side: GameSide.Opponent },
        { id: 'opponent-2', name: 'Flea', side: GameSide.Opponent },
        { id: 'opponent-3', name: 'Spider', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        // Destroy one opponent unit first
        createDestroyedEvent('game-1', 1, 'opponent-3', 1),
        // Now player is outnumbered 2:1, not 3:1, so heat should be detected
        createHeatEvent('game-1', 2, 'player-1', 35, 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = detector.detect([], battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no heat events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 1, 'unit-1', 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(0);
    });

    it('handles zero threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 1, 1),
      ];

      const anomalies = detector.detect(events, battleState, 0);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 50, 1),
      ];

      const anomalies = detector.detect(events, battleState, 100);

      expect(anomalies).toHaveLength(0);
    });

    it('handles unknown unit ID gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unknown-unit', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].message).toContain('unknown-unit');
    });

    it('handles single unit in battle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Deduplication Tests
  // =========================================================================

  describe('deduplication per unit per turn', () => {
    it('creates separate anomalies for different turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 2, 'unit-1', 35, 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
    });

    it('creates separate anomalies for different units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 35, 1),
        createHeatEvent('game-1', 1, 'unit-2', 35, 2),
      ];

      const anomalies = detector.detect(events, battleState, 30);

      expect(anomalies).toHaveLength(2);
    });
  });

  // =========================================================================
  // Custom Threshold Tests
  // =========================================================================

  describe('custom thresholds', () => {
    it('respects custom threshold of 20', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 21, 1),
      ];

      const anomalies = detector.detect(events, battleState, 20);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(20);
    });

    it('respects custom threshold of 50', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 49, 1),
      ];

      const anomalies = detector.detect(events, battleState, 50);

      expect(anomalies).toHaveLength(0);
    });
  });
});
