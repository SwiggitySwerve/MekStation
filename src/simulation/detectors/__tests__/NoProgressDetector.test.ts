/**
 * NoProgressDetector Tests
 *
 * Comprehensive test suite covering:
 * - State comparison (armor, structure, heat)
 * - Movement detection and progress reset
 * - No-progress counter and threshold
 * - Anomaly structure and metadata
 * - Edge cases and boundary conditions
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IDamageAppliedPayload,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { NoProgressDetector, type BattleState } from '../NoProgressDetector';

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

describe('NoProgressDetector', () => {
  let detector: NoProgressDetector;

  beforeEach(() => {
    detector = new NoProgressDetector();
  });

  // =========================================================================
  // Basic No-Progress Detection Tests
  // =========================================================================

  describe('basic no-progress detection', () => {
    it('detects no progress after threshold turns', () => {
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

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        type: 'no-progress',
        severity: 'warning',
        actualValue: 5,
        thresholdUsed: 5,
      });
    });

    it('ignores no-progress before threshold', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
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

    it('detects multiple no-progress periods', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        // First no-progress period (turns 1-5)
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        // Progress (damage)
        createDamageEvent('game-1', 6, 'unit-1', 'center_torso', 20, 15, 6),
        createTurnEndedEvent('game-1', 6),
        // Second no-progress period (turns 7-11)
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
        createTurnEndedEvent('game-1', 9),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].turn).toBe(5);
      expect(anomalies[1].turn).toBe(11);
    });
  });

  // =========================================================================
  // Movement Detection Tests
  // =========================================================================

  describe('movement detection and progress reset', () => {
    it('resets counter when unit moves', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createMovementEvent('game-1', 4, 'unit-1', 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('counts movement-only changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createMovementEvent('game-1', 3, 'unit-1', 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects no-progress after movement stops', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(6);
    });
  });

  // =========================================================================
  // Armor Damage Detection Tests
  // =========================================================================

  describe('armor damage detection', () => {
    it('detects armor changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createDamageEvent('game-1', 3, 'unit-1', 'center_torso', 20, 15, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on armor damage', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createDamageEvent('game-1', 4, 'unit-1', 'center_torso', 20, 15, 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects multiple armor locations', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createDamageEvent('game-1', 1, 'unit-1', 'center_torso', 20, 15, 1),
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 2, 'unit-1', 'left_arm', 10, 8, 2),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Structure Damage Detection Tests
  // =========================================================================

  describe('structure damage detection', () => {
    it('detects structure changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createDamageEvent('game-1', 3, 'unit-1', 'center_torso', 20, 14, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on structure damage', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createDamageEvent('game-1', 4, 'unit-1', 'center_torso', 20, 14, 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Heat Detection Tests
  // =========================================================================

  describe('heat detection', () => {
    it('detects heat changes as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createHeatEvent('game-1', 3, 'unit-1', 15, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('resets counter on heat generation', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createHeatEvent('game-1', 4, 'unit-1', 15, 4),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects heat dissipation as progress', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createHeatEvent('game-1', 1, 'unit-1', 20, 1),
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createHeatEvent('game-1', 3, 'unit-1', 10, 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Combined State Changes Tests
  // =========================================================================

  describe('combined state changes', () => {
    it('detects any combination of armor, structure, heat changes', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDamageEvent('game-1', 2, 'unit-1', 'center_torso', 20, 15, 2),
        createHeatEvent('game-1', 2, 'unit-1', 10, 3),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('detects no-progress with multiple units', () => {
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

      expect(anomalies).toHaveLength(1);
    });
  });

  // =========================================================================
  // Destroyed Unit Tests
  // =========================================================================

  describe('destroyed unit handling', () => {
    it('tracks destroyed units', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createDestroyedEvent('game-1', 2, 'unit-2', 2),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('destroyed units do not prevent no-progress detection', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createDestroyedEvent('game-1', 1, 'unit-2', 1),
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
  // Anomaly Structure Tests
  // =========================================================================

  describe('anomaly structure and metadata', () => {
    it('creates anomaly with correct structure', () => {
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

      expect(anomalies[0]).toMatchObject({
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.stringContaining('anom-no-progress'),
        type: 'no-progress',
        severity: 'warning',
        battleId: 'game-1',
        turn: 5,
        unitId: null,
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('Battle state unchanged'),
        thresholdUsed: 5,
        actualValue: 5,
        configKey: 'noProgressThreshold',
        // oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timestamp: expect.any(Number),
      });
    });

    it('includes correct turn in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies[0].turn).toBe(5);
    });

    it('includes correct threshold in anomaly', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
      ];

      const anomalies = detector.detect(events, battleState, 3);

      expect(anomalies[0].thresholdUsed).toBe(3);
      expect(anomalies[0].actualValue).toBe(3);
    });

    it('generates unique anomaly IDs', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createDamageEvent('game-1', 6, 'unit-1', 'center_torso', 20, 15, 6),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
        createTurnEndedEvent('game-1', 9),
        createTurnEndedEvent('game-1', 10),
        createTurnEndedEvent('game-1', 11),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].id).not.toBe(anomalies[1].id);
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

      const anomalies = detector.detect([], battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles single turn', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [createTurnEndedEvent('game-1', 1)];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(0);
    });

    it('handles threshold of 1', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
      ];

      const anomalies = detector.detect(events, battleState, 1);

      expect(anomalies).toHaveLength(1);
    });

    it('handles large threshold', () => {
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

    it('handles empty battle state', () => {
      const battleState = createBattleState([]);

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

    it('handles events with non-sequential turns', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 9),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });

    it('only triggers anomaly once per no-progress period', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(5);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('integration scenarios', () => {
    it('handles realistic battle scenario with mixed events', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        // Turn 1: Both units move
        createMovementEvent('game-1', 1, 'unit-1', 1),
        createMovementEvent('game-1', 1, 'unit-2', 2),
        createTurnEndedEvent('game-1', 1),
        // Turn 2: Unit 1 takes damage
        createDamageEvent('game-1', 2, 'unit-1', 'center_torso', 20, 15, 3),
        createTurnEndedEvent('game-1', 2),
        // Turn 3: Unit 2 generates heat
        createHeatEvent('game-1', 3, 'unit-2', 10, 4),
        createTurnEndedEvent('game-1', 3),
        // Turns 4-8: No progress
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
        createTurnEndedEvent('game-1', 8),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].turn).toBe(8);
    });

    it('handles battle with unit destruction', () => {
      const battleState = createBattleState([
        { id: 'unit-1', name: 'Atlas', side: GameSide.Player },
        { id: 'unit-2', name: 'Locust', side: GameSide.Opponent },
      ]);

      const events: IGameEvent[] = [
        createTurnEndedEvent('game-1', 1),
        createTurnEndedEvent('game-1', 2),
        createDestroyedEvent('game-1', 3, 'unit-2', 3),
        createTurnEndedEvent('game-1', 3),
        createTurnEndedEvent('game-1', 4),
        createTurnEndedEvent('game-1', 5),
        createTurnEndedEvent('game-1', 6),
        createTurnEndedEvent('game-1', 7),
      ];

      const anomalies = detector.detect(events, battleState, 5);

      expect(anomalies).toHaveLength(1);
    });
  });
});
