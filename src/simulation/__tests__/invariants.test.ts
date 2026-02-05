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
  describe('checkUnitPositionUniqueness', () => {
    it('should return empty array for valid state with no position conflicts', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { position: { q: 0, r: 0 } }),
          unit2: createMinimalUnit('unit2', { position: { q: 1, r: 0 } }),
          unit3: createMinimalUnit('unit3', { position: { q: 0, r: 1 } }),
        },
      });

      const violations = checkUnitPositionUniqueness(state);
      expect(violations).toEqual([]);
    });

    it('should detect when two units occupy the same hex', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { position: { q: 0, r: 0 } }),
          unit2: createMinimalUnit('unit2', { position: { q: 0, r: 0 } }),
        },
      });

      const violations = checkUnitPositionUniqueness(state);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('unit_position_uniqueness');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('Multiple units');
      expect(violations[0].context.position).toEqual({ q: 0, r: 0 });
      expect(violations[0].context.unitIds).toEqual(['unit1', 'unit2']);
    });

    it('should detect multiple position conflicts', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { position: { q: 0, r: 0 } }),
          unit2: createMinimalUnit('unit2', { position: { q: 0, r: 0 } }),
          unit3: createMinimalUnit('unit3', { position: { q: 1, r: 1 } }),
          unit4: createMinimalUnit('unit4', { position: { q: 1, r: 1 } }),
        },
      });

      const violations = checkUnitPositionUniqueness(state);
      expect(violations).toHaveLength(2);
    });

    it('should ignore destroyed units', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', {
            position: { q: 0, r: 0 },
            destroyed: true,
          }),
          unit2: createMinimalUnit('unit2', { position: { q: 0, r: 0 } }),
        },
      });

      const violations = checkUnitPositionUniqueness(state);
      expect(violations).toEqual([]);
    });
  });

  describe('checkHeatNonNegative', () => {
    it('should return empty array when all units have non-negative heat', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { heat: 0 }),
          unit2: createMinimalUnit('unit2', { heat: 10 }),
          unit3: createMinimalUnit('unit3', { heat: 30 }),
        },
      });

      const violations = checkHeatNonNegative(state);
      expect(violations).toEqual([]);
    });

    it('should detect negative heat', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { heat: -5 }),
        },
      });

      const violations = checkHeatNonNegative(state);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('heat_non_negative');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('negative heat');
      expect(violations[0].context.unitId).toBe('unit1');
      expect(violations[0].context.heat).toBe(-5);
    });

    it('should detect multiple units with negative heat', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { heat: -5 }),
          unit2: createMinimalUnit('unit2', { heat: -10 }),
        },
      });

      const violations = checkHeatNonNegative(state);
      expect(violations).toHaveLength(2);
    });
  });

  describe('checkArmorBounds', () => {
    it('should return empty array when all armor values are valid', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', {
            armor: { head: 9, centerTorso: 20 },
            structure: { head: 3, centerTorso: 10 },
          }),
        },
      });

      const violations = checkArmorBounds(state);
      expect(violations).toEqual([]);
    });

    it('should detect negative armor', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', {
            armor: { head: -1, centerTorso: 20 },
            structure: { head: 3, centerTorso: 10 },
          }),
        },
      });

      const violations = checkArmorBounds(state);
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('armor_bounds');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('negative armor');
      expect(violations[0].context.unitId).toBe('unit1');
      expect(violations[0].context.location).toBe('head');
      expect(violations[0].context.value).toBe(-1);
    });

    it('should detect negative structure', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', {
            armor: { head: 9, centerTorso: 20 },
            structure: { head: -2, centerTorso: 10 },
          }),
        },
      });

      const violations = checkArmorBounds(state);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('negative structure');
      expect(violations[0].context.location).toBe('head');
      expect(violations[0].context.value).toBe(-2);
    });

    it('should allow zero armor and structure', () => {
      const state = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', {
            armor: { head: 0, centerTorso: 0 },
            structure: { head: 0, centerTorso: 0 },
          }),
        },
      });

      const violations = checkArmorBounds(state);
      expect(violations).toEqual([]);
    });
  });

  describe('checkDestroyedUnitsStayDestroyed', () => {
    it('should return empty array when no units resurrect', () => {
      const currentState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: true }),
          unit2: createMinimalUnit('unit2', { destroyed: false }),
        },
      });

      const previousState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: true }),
          unit2: createMinimalUnit('unit2', { destroyed: false }),
        },
      });

      const violations = checkDestroyedUnitsStayDestroyed(
        currentState,
        previousState,
      );
      expect(violations).toEqual([]);
    });

    it('should detect when destroyed unit becomes active', () => {
      const currentState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: false }),
        },
      });

      const previousState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: true }),
        },
      });

      const violations = checkDestroyedUnitsStayDestroyed(
        currentState,
        previousState,
      );
      expect(violations).toHaveLength(1);
      expect(violations[0].invariant).toBe('destroyed_units_stay_destroyed');
      expect(violations[0].severity).toBe('critical');
      expect(violations[0].message).toContain('resurrected');
      expect(violations[0].context.unitId).toBe('unit1');
    });

    it('should handle undefined previous state', () => {
      const currentState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: false }),
        },
      });

      const violations = checkDestroyedUnitsStayDestroyed(
        currentState,
        undefined,
      );
      expect(violations).toEqual([]);
    });

    it('should handle new units appearing', () => {
      const currentState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: false }),
          unit2: createMinimalUnit('unit2', { destroyed: false }),
        },
      });

      const previousState = createMinimalGameState({
        units: {
          unit1: createMinimalUnit('unit1', { destroyed: false }),
        },
      });

      const violations = checkDestroyedUnitsStayDestroyed(
        currentState,
        previousState,
      );
      expect(violations).toEqual([]);
    });
  });

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
