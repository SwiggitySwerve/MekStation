/**
 * StateCycleDetector Tests
 *
 * Comprehensive test suite covering:
 * - State cycle detection and threshold
 * - Snapshot comparison (armor, structure, heat)
 * - Cycle counter and anomaly triggering
 * - Anomaly structure and metadata
 * - Edge cases and boundary conditions
 */

import { StateCycleDetector, type BattleState } from '../StateCycleDetector';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IDamageAppliedPayload,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Test Fixtures
// =============================================================================

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

const createDamageEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  location: string,
  armorRemaining: number,
  structureRemaining: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-damage-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.DamageApplied,
  turn,
  phase: GamePhase.WeaponAttack,
  actorId: unitId,
  payload: {
    unitId,
    location,
    damage: 5,
    armorRemaining,
    structureRemaining,
    locationDestroyed: false,
  } as IDamageAppliedPayload,
});

const createHeatEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  heat: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-heat-${sequence}`,
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

describe('StateCycleDetector', () => {
  let detector: StateCycleDetector;

  beforeEach(() => {
    detector = new StateCycleDetector();
  });

  // =========================================================================
  // Basic State Cycle Detection Tests
  // =========================================================================

  describe('basic state cycle detection', () => {
    it('detects state cycle after threshold repetitions', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        // Turn 1: Initial state
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createHeatEvent('game-1', 1, 'unit-1', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        // Turn 2: Same state (cycle 1)
        createTurnEndedEvent('game-1', 2, 4),
        // Turn 3: Same state (cycle 2)
        createTurnEndedEvent('game-1', 3, 5),
        // Turn 4: Same state (cycle 3 - triggers anomaly)
        createTurnEndedEvent('game-1', 4, 6),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'state-cycle',
        severity: 'critical',
        thresholdUsed: 3,
      });
    });

    it('ignores state cycle before threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('uses default threshold of 3', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(3);
    });

    it('detects multiple state cycles', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // First cycle (turns 1-3)
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        // Break cycle with damage
        createDamageEvent('game-1', 4, 'unit-1', 'center_torso', 19, 14, 5),
        createTurnEndedEvent('game-1', 4, 6),
        // Second cycle (turns 5-7)
        createTurnEndedEvent('game-1', 5, 7),
        createTurnEndedEvent('game-1', 6, 8),
        createTurnEndedEvent('game-1', 7, 9),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(3);
    });
  });

  // =========================================================================
  // State Comparison Tests
  // =========================================================================

  describe('state comparison (armor, structure, heat)', () => {
    it('detects cycle when armor changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createDamageEvent('game-1', 2, 'unit-1', 'center_torso', 19, 15, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle when structure changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createDamageEvent('game-1', 2, 'unit-1', 'center_torso', 20, 14, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle when heat changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 10, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createHeatEvent('game-1', 2, 'unit-1', 11, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('detects cycle with multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createDamageEvent('game-1', 1, 'unit-2', 'left_arm', 10, 5, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Anomaly Structure Tests
  // =========================================================================

  describe('anomaly structure and metadata', () => {
    it('includes snapshot in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createHeatEvent('game-1', 1, 'unit-1', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].snapshot).toBeDefined();
      expect(anomalies[0].snapshot).toHaveProperty('armor');
      expect(anomalies[0].snapshot).toHaveProperty('structure');
      expect(anomalies[0].snapshot).toHaveProperty('heat');
    });

    it('sets severity to critical', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].severity).toBe('critical');
    });

    it('includes correct anomaly type', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].type).toBe('state-cycle');
    });

    it('includes battleId in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].battleId).toBe('game-1');
    });

    it('includes turn number in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].turn).toBe(3);
    });

    it('sets unitId to null', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].unitId).toBeNull();
    });

    it('includes configKey in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].configKey).toBe('stateCycleThreshold');
    });
  });

  // =========================================================================
  // Threshold Tests
  // =========================================================================

  describe('threshold variations', () => {
    it('respects custom threshold of 2', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
      ];

      const anomalies = detector.detect(events, battleState, 2);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].thresholdUsed).toBe(2);
    });

    it('respects custom threshold of 5', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('triggers at exactly threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
      ];

      const anomalies = detector.detect(events, battleState, 4);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Edge Cases and Boundary Conditions
  // =========================================================================

  describe('edge cases and boundary conditions', () => {
    it('handles empty event list', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const anomalies = detector.detect([], battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(0);
    });

    it('handles no damage events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1, 1),
        createTurnEndedEvent('game-1', 2, 2),
        createTurnEndedEvent('game-1', 3, 3),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles destroyed units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createDestroyedEvent('game-1', 2, 'unit-2', 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles multiple damage locations per unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createDamageEvent('game-1', 1, 'unit-1', 'left_arm', 10, 5, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles zero heat', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 0, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles high heat values', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 50, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles state inheritance from previous turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        // Turn 2: No damage, inherits from turn 1
        createTurnEndedEvent('game-1', 2, 3),
        // Turn 3: No damage, inherits from turn 2
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('only triggers anomaly once per cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        // Continue cycling
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles movement events without breaking cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createMovementEvent('game-1', 2, 'unit-1', 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Snapshot Tests
  // =========================================================================

  describe('snapshot serialization', () => {
    it('serializes armor in snapshot', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].snapshot?.armor).toBeDefined();
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1']).toEqual({
        center_torso: 20,
      });
    });

    it('serializes structure in snapshot', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].snapshot?.structure).toBeDefined();
      expect((anomalies[0].snapshot?.structure as Record<string, unknown>)['unit-1']).toEqual({
        center_torso: 15,
      });
    });

    it('serializes heat in snapshot', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createHeatEvent('game-1', 1, 'unit-1', 25, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].snapshot?.heat).toBeDefined();
      expect((anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-1']).toBe(25);
    });

    it('includes turn number in snapshot', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].snapshot?.turn).toBe(3);
    });
  });

  // =========================================================================
  // Additional Coverage Tests
  // =========================================================================

  describe('additional coverage', () => {
    it('handles unit name lookup in anomaly creation', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas AS7-D', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].battleId).toBe('game-1');
    });

    it('handles multiple armor locations per unit', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createDamageEvent('game-1', 1, 'unit-1', 'left_torso', 15, 10, 2),
        createDamageEvent('game-1', 1, 'unit-1', 'right_torso', 15, 10, 3),
        createTurnEndedEvent('game-1', 1, 4),
        createTurnEndedEvent('game-1', 2, 5),
        createTurnEndedEvent('game-1', 3, 6),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1']).toHaveProperty('center_torso');
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1']).toHaveProperty('left_torso');
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1']).toHaveProperty('right_torso');
    });

    it('handles threshold of 1', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
      ];

      const anomalies = detector.detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('detects cycle with heat changes across multiple units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 20, 1),
        createHeatEvent('game-1', 1, 'unit-2', 10, 2),
        createTurnEndedEvent('game-1', 1, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createTurnEndedEvent('game-1', 3, 5),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect((anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-1']).toBe(20);
      expect((anomalies[0].snapshot?.heat as Record<string, unknown>)['unit-2']).toBe(10);
    });

    it('handles very long cycle detection', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
        createTurnEndedEvent('game-1', 4, 5),
        createTurnEndedEvent('game-1', 5, 6),
        createTurnEndedEvent('game-1', 6, 7),
        createTurnEndedEvent('game-1', 7, 8),
        createTurnEndedEvent('game-1', 8, 9),
        createTurnEndedEvent('game-1', 9, 10),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(3);
    });

    it('handles unknown event types gracefully', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const unknownEvent: IGameEvent = {
        id: 'event-unknown-1',
        gameId: 'game-1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        // eslint-disable-next-line no-restricted-syntax
        type: 999 as unknown as GameEventType,
        turn: 1,
        phase: GamePhase.End,
        payload: {},
      };

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        unknownEvent,
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });

    it('handles unit not found in battle state', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-unknown', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createTurnEndedEvent('game-1', 2, 3),
        createTurnEndedEvent('game-1', 3, 4),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration scenarios', () => {
    it('handles complex multi-unit battle with cycles', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
        { id: 'unit-3', name: 'Jagermech', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // Turn 1: Initial state
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createDamageEvent('game-1', 1, 'unit-2', 'left_arm', 10, 5, 2),
        createHeatEvent('game-1', 1, 'unit-3', 15, 3),
        createTurnEndedEvent('game-1', 1, 4),
        // Turn 2: Same state
        createTurnEndedEvent('game-1', 2, 5),
        // Turn 3: Same state
        createTurnEndedEvent('game-1', 3, 6),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-1']).toEqual({
        center_torso: 20,
      });
      expect((anomalies[0].snapshot?.armor as Record<string, unknown>)['unit-2']).toEqual({
        left_arm: 10,
      });
    });

    it('handles rapid state changes followed by cycle', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // Rapid changes
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1, 2),
        createDamageEvent('game-1', 2, 'unit-1', 'center_torso', 19, 14, 3),
        createTurnEndedEvent('game-1', 2, 4),
        createDamageEvent('game-1', 3, 'unit-1', 'center_torso', 18, 13, 5),
        createTurnEndedEvent('game-1', 3, 6),
        // Then cycle
        createTurnEndedEvent('game-1', 4, 7),
        createTurnEndedEvent('game-1', 5, 8),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(5);
    });
  });
});
