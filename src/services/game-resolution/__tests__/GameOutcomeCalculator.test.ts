/**
 * Tests for Game Outcome Calculator
 */

import {
  calculateGameOutcome,
  isGameEnded,
  determineWinner,
  IOutcomeCalculationInput,
} from '../GameOutcomeCalculator';
import {
  IGameState,
  IGameConfig,
  GameStatus,
  GamePhase,
  GameSide,
  LockState,
  IUnitGameState,
  Facing,
  MovementType,
} from '@/types/gameplay';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockUnit(
  id: string,
  side: GameSide,
  destroyed: boolean = false
): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed,
    lockState: LockState.Pending,
  };
}

function createMockState(
  playerUnits: Array<{ id: string; destroyed: boolean }>,
  opponentUnits: Array<{ id: string; destroyed: boolean }>,
  turn: number = 1
): IGameState {
  const units: Record<string, IUnitGameState> = {};

  for (const u of playerUnits) {
    units[u.id] = createMockUnit(u.id, GameSide.Player, u.destroyed);
  }
  for (const u of opponentUnits) {
    units[u.id] = createMockUnit(u.id, GameSide.Opponent, u.destroyed);
  }

  return {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units,
    turnEvents: [],
  };
}

function createMockConfig(turnLimit: number = 0): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createMockInput(
  state: IGameState,
  config: IGameConfig
): IOutcomeCalculationInput {
  return {
    state,
    events: [],
    config,
    startedAt: '2024-01-01T00:00:00Z',
    endedAt: '2024-01-01T01:00:00Z',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('GameOutcomeCalculator', () => {
  describe('calculateGameOutcome', () => {
    it('should detect player victory by elimination', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('player');
      expect(outcome.reason).toBe('elimination');
      expect(outcome.playerUnitsSurviving).toBe(1);
      expect(outcome.opponentUnitsSurviving).toBe(0);
      expect(outcome.opponentUnitsDestroyed).toBe(1);
    });

    it('should detect opponent victory by elimination', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: false }]
      );
      const config = createMockConfig();
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('opponent');
      expect(outcome.reason).toBe('elimination');
      expect(outcome.playerUnitsSurviving).toBe(0);
      expect(outcome.opponentUnitsSurviving).toBe(1);
    });

    it('should detect draw by mutual destruction', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('draw');
      expect(outcome.reason).toBe('mutual_destruction');
    });

    it('should handle turn limit with player advantage', () => {
      const state = createMockState(
        [
          { id: 'p1', destroyed: false },
          { id: 'p2', destroyed: false },
        ],
        [{ id: 'o1', destroyed: false }],
        10
      );
      const config = createMockConfig(10);
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('player');
      expect(outcome.reason).toBe('turn_limit');
      expect(outcome.playerUnitsSurviving).toBe(2);
      expect(outcome.opponentUnitsSurviving).toBe(1);
    });

    it('should handle turn limit with opponent advantage', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [
          { id: 'o1', destroyed: false },
          { id: 'o2', destroyed: false },
        ],
        10
      );
      const config = createMockConfig(10);
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('opponent');
      expect(outcome.reason).toBe('turn_limit');
    });

    it('should handle turn limit draw', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        10
      );
      const config = createMockConfig(10);
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('draw');
      expect(outcome.reason).toBe('turn_limit');
    });

    it('should calculate duration correctly', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();
      const input: IOutcomeCalculationInput = {
        state,
        events: [],
        config,
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T00:30:00Z', // 30 minutes
      };

      const outcome = calculateGameOutcome(input);

      expect(outcome.durationMs).toBe(30 * 60 * 1000); // 30 minutes in ms
    });

    it('should count units correctly', () => {
      const state = createMockState(
        [
          { id: 'p1', destroyed: false },
          { id: 'p2', destroyed: true },
          { id: 'p3', destroyed: false },
        ],
        [
          { id: 'o1', destroyed: true },
          { id: 'o2', destroyed: true },
        ]
      );
      const config = createMockConfig();
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.playerUnitsSurviving).toBe(2);
      expect(outcome.playerUnitsDestroyed).toBe(1);
      expect(outcome.opponentUnitsSurviving).toBe(0);
      expect(outcome.opponentUnitsDestroyed).toBe(2);
    });
  });

  describe('isGameEnded', () => {
    it('should return true when player is eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: false }]
      );
      const config = createMockConfig();

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return true when opponent is eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return true when turn limit exceeded', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        11 // Turn 11
      );
      const config = createMockConfig(10);

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return false when game continues', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        5
      );
      const config = createMockConfig(10);

      expect(isGameEnded(state, config)).toBe(false);
    });

    it('should return false when no turn limit', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        100
      );
      const config = createMockConfig(0);

      expect(isGameEnded(state, config)).toBe(false);
    });
  });

  describe('determineWinner', () => {
    it('should return player when opponent eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('player');
    });

    it('should return opponent when player eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: false }]
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('opponent');
    });

    it('should return draw when both eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: true }]
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('draw');
    });

    it('should return null when game not over', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        5
      );
      const config = createMockConfig(10);

      expect(determineWinner(state, config)).toBeNull();
    });
  });
});
