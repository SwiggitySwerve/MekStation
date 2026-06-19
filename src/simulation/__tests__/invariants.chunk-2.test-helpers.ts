/**
 * Tests for invariant checkers
 */

import {
  IGameState,
  IUnitGameState,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
  IGameEvent,
  GameEventType,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay';

import {
  checkUnitPositionUniqueness,
  checkHeatNonNegative,
  checkArmorBounds,
  checkDestroyedUnitsStayDestroyed,
  checkPhaseTransitions,
  checkSequenceMonotonicity,
  checkTurnNonDecreasing,
} from '../invariants/checkers';

function createMinimalGameState(overrides?: Partial<IGameState>): IGameState {
  return {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {},
    turnEvents: [],
    ...overrides,
  };
}

function createMinimalUnit(
  id: string,
  overrides?: Partial<IUnitGameState>,
): IUnitGameState {
  return {
    id,
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { head: 9, centerTorso: 20 },
    structure: { head: 3, centerTorso: 10 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

describe('Invariant Checkers', () => {
  describe('checkPhaseTransitions', () => {
    it('should return empty array for valid phase transition', () => {
      const currentState = createMinimalGameState({
        phase: GamePhase.Movement,
      });
      const previousState = createMinimalGameState({
        phase: GamePhase.Initiative,
      });

      const violations = checkPhaseTransitions(currentState, previousState);
      expect(violations).toEqual([]);
    });

    it('should detect invalid phase transition', () => {
      const currentState = createMinimalGameState({
        phase: GamePhase.Initiative,
      });
      const previousState = createMinimalGameState({
        phase: GamePhase.Movement,
      });

      const violations = checkPhaseTransitions(currentState, previousState);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('phase_transitions');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('Invalid phase transition');
      expect(violations[0].context.fromPhase).toBe(GamePhase.Movement);
      expect(violations[0].context.toPhase).toBe(GamePhase.Initiative);
    });

    it('should allow same phase (no transition)', () => {
      const currentState = createMinimalGameState({
        phase: GamePhase.Movement,
      });
      const previousState = createMinimalGameState({
        phase: GamePhase.Movement,
      });

      const violations = checkPhaseTransitions(currentState, previousState);
      expect(violations).toEqual([]);
    });

    it('should handle undefined previous state', () => {
      const currentState = createMinimalGameState({
        phase: GamePhase.Initiative,
      });

      const violations = checkPhaseTransitions(currentState, undefined);
      expect(violations).toEqual([]);
    });

    it('should allow full phase cycle', () => {
      const phases = [
        GamePhase.Initiative,
        GamePhase.Movement,
        GamePhase.WeaponAttack,
        GamePhase.Heat,
        GamePhase.End,
      ];

      for (let i = 0; i < phases.length - 1; i++) {
        const currentState = createMinimalGameState({ phase: phases[i + 1] });
        const previousState = createMinimalGameState({ phase: phases[i] });

        const violations = checkPhaseTransitions(currentState, previousState);
        expect(violations).toEqual([]);
      }
    });
  });

  describe('checkSequenceMonotonicity', () => {
    it('should return empty array when event sequences increase', () => {
      const events: IGameEvent[] = [
        {
          id: 'evt1',
          gameId: 'test',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
          type: GameEventType.GameStarted,
          turn: 1,
          phase: GamePhase.Initiative,
          payload: { firstSide: GameSide.Player },
        },
        {
          id: 'evt2',
          gameId: 'test',
          sequence: 2,
          timestamp: '2024-01-01T00:00:01Z',
          type: GameEventType.TurnStarted,
          turn: 1,
          phase: GamePhase.Initiative,
          payload: { _type: 'turn_started' },
        },
        {
          id: 'evt3',
          gameId: 'test',
          sequence: 3,
          timestamp: '2024-01-01T00:00:02Z',
          type: GameEventType.PhaseChanged,
          turn: 1,
          phase: GamePhase.Movement,
          payload: {
            fromPhase: GamePhase.Initiative,
            toPhase: GamePhase.Movement,
          },
        },
      ];

      const violations = checkSequenceMonotonicity(events);
      expect(violations).toEqual([]);
    });

    it('should detect non-increasing sequence numbers', () => {
      const events: IGameEvent[] = [
        {
          id: 'evt1',
          gameId: 'test',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
          type: GameEventType.GameStarted,
          turn: 1,
          phase: GamePhase.Initiative,
          payload: { firstSide: GameSide.Player },
        },
        {
          id: 'evt2',
          gameId: 'test',
          sequence: 3,
          timestamp: '2024-01-01T00:00:01Z',
          type: GameEventType.TurnStarted,
          turn: 1,
          phase: GamePhase.Initiative,
          payload: { _type: 'turn_started' },
        },
        {
          id: 'evt3',
          gameId: 'test',
          sequence: 2,
          timestamp: '2024-01-01T00:00:02Z',
          type: GameEventType.PhaseChanged,
          turn: 1,
          phase: GamePhase.Movement,
          payload: {
            fromPhase: GamePhase.Initiative,
            toPhase: GamePhase.Movement,
          },
        },
      ];

      const violations = checkSequenceMonotonicity(events);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('sequence_monotonicity');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('out of order');
      expect(violations[0].context.previousSequence).toBe(3);
      expect(violations[0].context.currentSequence).toBe(2);
    });

    it('should handle empty event list', () => {
      const violations = checkSequenceMonotonicity([]);
      expect(violations).toEqual([]);
    });

    it('should handle single event', () => {
      const events: IGameEvent[] = [
        {
          id: 'evt1',
          gameId: 'test',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
          type: GameEventType.GameStarted,
          turn: 1,
          phase: GamePhase.Initiative,
          payload: { firstSide: GameSide.Player },
        },
      ];

      const violations = checkSequenceMonotonicity(events);
      expect(violations).toEqual([]);
    });
  });

  describe('checkTurnNonDecreasing', () => {
    it('should return empty array when turn increases', () => {
      const currentState = createMinimalGameState({ turn: 2 });
      const previousState = createMinimalGameState({ turn: 1 });

      const violations = checkTurnNonDecreasing(currentState, previousState);
      expect(violations).toEqual([]);
    });

    it('should allow turn to stay the same', () => {
      const currentState = createMinimalGameState({ turn: 1 });
      const previousState = createMinimalGameState({ turn: 1 });

      const violations = checkTurnNonDecreasing(currentState, previousState);
      expect(violations).toEqual([]);
    });

    it('should detect turn decrease', () => {
      const currentState = createMinimalGameState({ turn: 1 });
      const previousState = createMinimalGameState({ turn: 2 });

      const violations = checkTurnNonDecreasing(currentState, previousState);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('turn_non_decreasing');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('decreased');
      expect(violations[0].context.previousTurn).toBe(2);
      expect(violations[0].context.currentTurn).toBe(1);
    });

    it('should handle undefined previous state', () => {
      const currentState = createMinimalGameState({ turn: 1 });

      const violations = checkTurnNonDecreasing(currentState, undefined);
      expect(violations).toEqual([]);
    });
  });
});
