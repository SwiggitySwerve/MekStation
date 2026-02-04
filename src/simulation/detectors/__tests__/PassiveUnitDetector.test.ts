/**
 * PassiveUnitDetector Tests
 *
 * Comprehensive test suite covering:
 * - Inactivity detection and counter tracking
 * - Counter reset on movement and attack
 * - Destroyed/shutdown unit exemptions
 * - Anomaly structure and metadata
 * - Edge cases and boundary conditions
 */

import { PassiveUnitDetector, type BattleState } from '../PassiveUnitDetector';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMovementEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-movement-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.MovementDeclared,
  turn,
  phase: GamePhase.Movement,
  actorId: unitId,
  payload: {
    unitId,
  },
});

const createAttackEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-attack-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.AttackResolved,
  turn,
  phase: GamePhase.WeaponAttack,
  actorId: unitId,
  payload: {
    attackerId: unitId,
    targetId: 'target-unit',
    weaponId: 'weapon-1',
    roll: 10,
    toHitNumber: 8,
    hit: true,
    damage: 15,
  },
});

const createTurnEndedEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-turn-ended-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.TurnEnded,
  turn,
  phase: GamePhase.End,
  payload: {},
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

const createBattleState = (units: Array<{ id: string; name: string; side: GameSide }>): BattleState => ({
  units: units.map((u) => ({
    id: u.id,
    name: u.name,
    side: u.side,
  })),
});

// =============================================================================
// Tests
// =============================================================================

describe('PassiveUnitDetector', () => {
  let detector: PassiveUnitDetector;

  beforeEach(() => {
    detector = new PassiveUnitDetector();
  });

  // =========================================================================
  // Basic Inactivity Detection Tests
  // =========================================================================

  describe('basic inactivity detection', () => {
    it('detects unit inactive for threshold turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });

    it('ignores unit active within threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 5', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(5);
    });
  });

  // =========================================================================
  // Counter Reset Tests
  // =========================================================================

  describe('counter reset on action', () => {
    it('resets counter on movement', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createMovementEvent('game-1', 4, 'unit-1', 1),
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(9);
    });

    it('resets counter on attack', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createAttackEvent('game-1', 4, 'unit-1', 1),
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(9);
    });

    it('resets counter on movement locked', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        {
          id: 'event-movement-locked',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.MovementLocked,
          turn: 4,
          phase: GamePhase.Movement,
          actorId: 'unit-1',
          payload: { unitId: 'unit-1' },
        },
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('resets counter on attack locked', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        {
          id: 'event-attack-locked',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.AttackLocked,
          turn: 4,
          phase: GamePhase.WeaponAttack,
          actorId: 'unit-1',
          payload: {
            attackerId: 'unit-1',
            targetId: 'target-unit',
            weaponId: 'weapon-1',
            roll: 10,
            toHitNumber: 8,
            hit: true,
          },
        },
        createTurnEndedEvent('game-1', 4, 2),
        createTurnEndedEvent('game-1', 5, 3),
        createTurnEndedEvent('game-1', 6, 4),
        createTurnEndedEvent('game-1', 7, 5),
        createTurnEndedEvent('game-1', 8, 6),
        createTurnEndedEvent('game-1', 9, 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Exemption Tests
  // =========================================================================

  describe('destroyed unit exemption', () => {
    it('exempts destroyed unit from detection', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 2, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unitId).toBe('unit-2');
    });

    it('detects destroyed unit before destruction event', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createDestroyedEvent('game-1', 5, 'unit-1', 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
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
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].type).toBe('passive-unit');
      expect(anomalies[0].severity).toBe('warning');
    });

    it('includes threshold and actual value', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].thresholdUsed).toBe(5);
      expect(anomalies[0].actualValue).toBe(5);
    });

    it('includes config key', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].configKey).toBe('passiveUnitThreshold');
    });

    it('includes unit ID and name in message', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[0].message).toContain('Atlas AS7-D');
      expect(anomalies[0].message).toContain('5');
    });

    it('includes turn number', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes battle ID', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('battle-123', 1),
        createTurnEndedEvent('battle-123', 2),
        createTurnEndedEvent('battle-123', 3),
        createTurnEndedEvent('battle-123', 4),
        createTurnEndedEvent('battle-123', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].battleId).toBe('battle-123');
    });

    it('includes timestamp', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].timestamp).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Multiple Units Tests
  // =========================================================================

  describe('multiple units', () => {
    it('detects inactivity for multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].unitId).toBe('unit-1');
      expect(anomalies[1].unitId).toBe('unit-2');
    });

    it('detects selective inactivity', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unitId).toBe('unit-2');
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

      const anomalies = detector.detect([], battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no turn ended events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createAttackEvent('game-1', 2, 'unit-1', 2),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
      ];

      const anomalies = detector.detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 100);

      expect(anomalies).toHaveLength(0);
    });

    it('handles unknown unit ID gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unknown-unit', 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].unitId).toBe('unit-1');
    });

    it('handles single unit in battle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Custom Threshold Tests
  // =========================================================================

  describe('custom thresholds', () => {
    it('respects custom threshold of 3', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(3);
    });

    it('respects custom threshold of 10', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 10);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Multiple Anomalies Per Unit Tests
  // =========================================================================

  describe('multiple anomalies per unit', () => {
    it('detects multiple inactivity periods for same unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createMovementEvent('game-1', 6, 'unit-1', 1),
        createTurnEndedEvent('game-1', 6, 2),
        createTurnEndedEvent('game-1', 7, 3),
        createTurnEndedEvent('game-1', 8, 4),
        createTurnEndedEvent('game-1', 9, 5),
        createTurnEndedEvent('game-1', 10, 6),
        createTurnEndedEvent('game-1', 11, 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(5);
      expect(anomalies[1].turn).toBe(11);
    });
  });

  // =========================================================================
  // Coverage Tests
  // =========================================================================

  describe('coverage edge cases', () => {
    it('handles untracked event types', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        {
          id: 'event-phase-changed',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.PhaseChanged,
          turn: 1,
          phase: GamePhase.Movement,
          payload: {},
        },
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('handles unit name fallback for unknown units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        {
          id: 'event-destroyed-unknown',
          gameId: 'game-1',
          sequence: 1,
          timestamp: new Date().toISOString(),
          type: GameEventType.UnitDestroyed,
          turn: 1,
          phase: GamePhase.End,
          payload: { unitId: 'unknown-unit' },
        },
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].message).toContain('Atlas');
    });

  });
});
