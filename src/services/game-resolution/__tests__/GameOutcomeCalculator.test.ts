/**
 * Tests for Game Outcome Calculator.
 *
 * Per `add-victory-and-post-battle-summary` design D3: turn-limit
 * tie-break uses total damage dealt with a 5% tolerance, NOT
 * surviving unit count. Tests that hit the turn-limit branch must
 * inject `DamageApplied` events into `input.events` so
 * `sumDamageBySide` has data to compare.
 */

import {
  IGameState,
  IGameConfig,
  IGameEvent,
  GameStatus,
  GamePhase,
  GameSide,
  GameEventType,
  LockState,
  IUnitGameState,
  Facing,
  MovementType,
} from '@/types/gameplay';

import {
  calculateGameOutcome,
  isGameEnded,
  determineWinner,
  IOutcomeCalculationInput,
} from '../GameOutcomeCalculator';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockUnit(
  id: string,
  side: GameSide,
  destroyed: boolean = false,
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
  turn: number = 1,
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
  config: IGameConfig,
  events: readonly IGameEvent[] = [],
): IOutcomeCalculationInput {
  return {
    state,
    events,
    config,
    startedAt: '2024-01-01T00:00:00Z',
    endedAt: '2024-01-01T01:00:00Z',
  };
}

/**
 * Build a synthetic DamageApplied event. The turn-limit tie-break
 * walks `events` and sums per-side damage from these payloads, so
 * tests that exercise the turn-limit branch need at least one
 * damage event per side to deviate from the zero-damage draw
 * outcome.
 */
function makeDamageEvent(targetUnitId: string, damage: number): IGameEvent {
  return {
    id: `dmg-${targetUnitId}-${damage}`,
    gameId: 'test-game',
    sequence: 0,
    timestamp: '2024-01-01T00:30:00Z',
    type: GameEventType.DamageApplied,
    turn: 5,
    phase: GamePhase.WeaponAttack,
    actorId: 'attacker',
    payload: {
      unitId: targetUnitId,
      location: 'center_torso',
      damage,
      armorRemaining: 0,
      structureRemaining: 0,
      locationDestroyed: false,
    },
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
        [{ id: 'o1', destroyed: true }],
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
        [{ id: 'o1', destroyed: false }],
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
        [{ id: 'o1', destroyed: true }],
      );
      const config = createMockConfig();
      const input = createMockInput(state, config);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('draw');
      expect(outcome.reason).toBe('mutual_destruction');
    });

    it('should handle turn limit with player advantage (damage delta beyond 5%)', () => {
      // Per add-victory-and-post-battle-summary D3: turn-limit
      // tie-break is now damage-based with 5% tolerance, NOT
      // surviving unit count. Player-side dealt 300 damage to o1,
      // opponent-side dealt 200 damage split across p1+p2 — outside
      // the 5% tolerance, so player wins.
      const state = createMockState(
        [
          { id: 'p1', destroyed: false },
          { id: 'p2', destroyed: false },
        ],
        [{ id: 'o1', destroyed: false }],
        10,
      );
      const config = createMockConfig(10);
      const events: IGameEvent[] = [
        makeDamageEvent('o1', 300), // player dealt 300 to opponent unit
        makeDamageEvent('p1', 100), // opponent dealt 100 to player unit
        makeDamageEvent('p2', 100), // opponent dealt 100 to player unit
      ];
      const input = createMockInput(state, config, events);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('player');
      expect(outcome.reason).toBe('turn_limit');
      expect(outcome.playerUnitsSurviving).toBe(2);
      expect(outcome.opponentUnitsSurviving).toBe(1);
    });

    it('should handle turn limit with opponent advantage (damage delta beyond 5%)', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [
          { id: 'o1', destroyed: false },
          { id: 'o2', destroyed: false },
        ],
        10,
      );
      const config = createMockConfig(10);
      const events: IGameEvent[] = [
        // Opponent dealt more damage → opponent wins under D3 rule.
        makeDamageEvent('p1', 300),
        makeDamageEvent('o1', 100),
        makeDamageEvent('o2', 100),
      ];
      const input = createMockInput(state, config, events);

      const outcome = calculateGameOutcome(input);

      expect(outcome.winner).toBe('opponent');
      expect(outcome.reason).toBe('turn_limit');
    });

    it('should handle turn limit draw', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        10,
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
        [{ id: 'o1', destroyed: true }],
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
        ],
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
        [{ id: 'o1', destroyed: false }],
      );
      const config = createMockConfig();

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return true when opponent is eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }],
      );
      const config = createMockConfig();

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return true when turn limit exceeded', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        11, // Turn 11
      );
      const config = createMockConfig(10);

      expect(isGameEnded(state, config)).toBe(true);
    });

    it('should return false when game continues', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        5,
      );
      const config = createMockConfig(10);

      expect(isGameEnded(state, config)).toBe(false);
    });

    it('should return false when no turn limit', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        100,
      );
      const config = createMockConfig(0);

      expect(isGameEnded(state, config)).toBe(false);
    });
  });

  describe('determineWinner', () => {
    it('should return player when opponent eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: true }],
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('player');
    });

    it('should return opponent when player eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: false }],
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('opponent');
    });

    it('should return draw when both eliminated', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: true }],
        [{ id: 'o1', destroyed: true }],
      );
      const config = createMockConfig();

      expect(determineWinner(state, config)).toBe('draw');
    });

    it('should return null when game not over', () => {
      const state = createMockState(
        [{ id: 'p1', destroyed: false }],
        [{ id: 'o1', destroyed: false }],
        5,
      );
      const config = createMockConfig(10);

      expect(determineWinner(state, config)).toBeNull();
    });
  });
});
