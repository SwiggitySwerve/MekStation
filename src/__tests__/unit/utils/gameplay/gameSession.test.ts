/**
 * Game Session Tests
 * Tests for game session management.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { describe, it, expect } from '@jest/globals';
import {
  createGameSession,
  startGame,
  endGame,
  advancePhase,
  rollInitiative,
  declareMovement,
  lockMovement,
  replayToSequence,
  replayToTurn,
  generateGameLog,
  getNextPhase,
} from '@/utils/gameplay/gameSession';
import {
  deriveState,
  createInitialGameState,
  allUnitsLocked,
  isGameOver,
} from '@/utils/gameplay/gameState';
// Event factory imports available if needed for future tests
// import { createGameCreatedEvent, createGameStartedEvent } from '@/utils/gameplay/gameEvents';
import {
  IGameConfig,
  IGameUnit,
  GameStatus,
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay';
import { Facing, MovementType } from '@/types/gameplay';

describe('gameSession', () => {
  // Test fixtures
  const testConfig: IGameConfig = {
    mapRadius: 5,
    turnLimit: 10,
    victoryConditions: ['destruction'],
    optionalRules: [],
  };

  const testUnits: IGameUnit[] = [
    {
      id: 'unit-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-2',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-3r',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    },
  ];

  // =========================================================================
  // Session Creation
  // =========================================================================

  describe('createGameSession()', () => {
    it('should create a new game session', () => {
      const session = createGameSession(testConfig, testUnits);
      
      expect(session.id).toBeDefined();
      expect(session.config).toEqual(testConfig);
      expect(session.units).toEqual(testUnits);
      expect(session.events.length).toBe(1);
      expect(session.currentState.status).toBe(GameStatus.Setup);
    });

    it('should create initial state with units', () => {
      const session = createGameSession(testConfig, testUnits);
      
      expect(Object.keys(session.currentState.units).length).toBe(2);
      expect(session.currentState.units['unit-1']).toBeDefined();
      expect(session.currentState.units['unit-2']).toBeDefined();
    });
  });

  describe('startGame()', () => {
    it('should start a game in setup state', () => {
      const session = createGameSession(testConfig, testUnits);
      const started = startGame(session, GameSide.Player);
      
      expect(started.currentState.status).toBe(GameStatus.Active);
      expect(started.currentState.turn).toBe(1);
      expect(started.events.length).toBe(2);
    });

    it('should throw if game is not in setup state', () => {
      const session = createGameSession(testConfig, testUnits);
      const started = startGame(session, GameSide.Player);
      
      expect(() => startGame(started, GameSide.Player)).toThrow();
    });
  });

  describe('endGame()', () => {
    it('should end an active game', () => {
      const session = createGameSession(testConfig, testUnits);
      const started = startGame(session, GameSide.Player);
      const ended = endGame(started, GameSide.Player, 'destruction');
      
      expect(ended.currentState.status).toBe(GameStatus.Completed);
      expect(ended.currentState.result?.winner).toBe(GameSide.Player);
    });

    it('should throw if game is not active', () => {
      const session = createGameSession(testConfig, testUnits);
      
      expect(() => endGame(session, GameSide.Player, 'destruction')).toThrow();
    });
  });

  // =========================================================================
  // Phase Management
  // =========================================================================

  describe('getNextPhase()', () => {
    it('should return correct next phase', () => {
      expect(getNextPhase(GamePhase.Initiative)).toBe(GamePhase.Movement);
      expect(getNextPhase(GamePhase.Movement)).toBe(GamePhase.WeaponAttack);
      expect(getNextPhase(GamePhase.WeaponAttack)).toBe(GamePhase.Heat);
      expect(getNextPhase(GamePhase.Heat)).toBe(GamePhase.End);
      expect(getNextPhase(GamePhase.End)).toBe(GamePhase.Initiative);
    });
  });

  describe('advancePhase()', () => {
    it('should advance to the next phase', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      
      // Start at Initiative
      expect(session.currentState.phase).toBe(GamePhase.Initiative);
      
      // Advance to Movement
      session = advancePhase(session);
      expect(session.currentState.phase).toBe(GamePhase.Movement);
    });
  });

  // =========================================================================
  // Initiative
  // =========================================================================

  describe('rollInitiative()', () => {
    it('should roll initiative and set winner', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      session = rollInitiative(session);
      
      expect(session.currentState.initiativeWinner).toBeDefined();
      expect(session.currentState.firstMover).toBeDefined();
    });

    it('should throw if not in initiative phase', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      session = advancePhase(session); // Move to Movement phase
      
      expect(() => rollInitiative(session)).toThrow();
    });
  });

  // =========================================================================
  // Movement
  // =========================================================================

  describe('declareMovement()', () => {
    it('should declare movement for a unit', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      session = advancePhase(session); // Initiative -> Movement
      
      session = declareMovement(
        session,
        'unit-1',
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        Facing.North,
        MovementType.Walk,
        1,
        1
      );
      
      const unit = session.currentState.units['unit-1'];
      expect(unit.position).toEqual({ q: 1, r: 0 });
      expect(unit.movementThisTurn).toBe(MovementType.Walk);
      expect(unit.lockState).toBe(LockState.Planning);
    });

    it('should throw if not in movement phase', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      // Still in Initiative phase
      
      expect(() => declareMovement(
        session,
        'unit-1',
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        Facing.North,
        MovementType.Walk,
        1,
        1
      )).toThrow();
    });
  });

  describe('lockMovement()', () => {
    it('should lock movement for a unit', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      session = advancePhase(session); // Initiative -> Movement
      
      session = declareMovement(
        session,
        'unit-1',
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        Facing.North,
        MovementType.Walk,
        1,
        1
      );
      session = lockMovement(session, 'unit-1');
      
      const unit = session.currentState.units['unit-1'];
      expect(unit.lockState).toBe(LockState.Locked);
    });
  });

  // =========================================================================
  // Replay
  // =========================================================================

  describe('replayToSequence()', () => {
    it('should return state at specific sequence', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      session = advancePhase(session);
      
      // Replay to before phase change
      const stateAtSeq1 = replayToSequence(session, 1);
      expect(stateAtSeq1.status).toBe(GameStatus.Active);
      expect(stateAtSeq1.phase).toBe(GamePhase.Initiative);
    });
  });

  describe('replayToTurn()', () => {
    it('should return state at specific turn', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      
      // Replay to turn 1
      const stateAtTurn1 = replayToTurn(session, 1);
      expect(stateAtTurn1.turn).toBe(1);
    });
  });

  describe('generateGameLog()', () => {
    it('should generate a text log of events', () => {
      let session = createGameSession(testConfig, testUnits);
      session = startGame(session, GameSide.Player);
      
      const log = generateGameLog(session);
      
      expect(log).toContain('Game created');
      expect(log).toContain('Game started');
    });
  });
});

describe('gameState', () => {
  describe('deriveState()', () => {
    it('should derive state from empty events', () => {
      const state = deriveState('game-1', []);
      
      expect(state.gameId).toBe('game-1');
      expect(state.status).toBe(GameStatus.Setup);
      expect(state.turn).toBe(0);
    });
  });

  describe('allUnitsLocked()', () => {
    it('should return true when all units are locked', () => {
      const state = createInitialGameState('game-1');
      // Empty game has no units, so all are "locked"
      expect(allUnitsLocked(state)).toBe(true);
    });
  });

  describe('isGameOver()', () => {
    it('should return false for active game', () => {
      const state = createInitialGameState('game-1');
      expect(isGameOver(state)).toBe(false);
    });

    it('should return true for completed game', () => {
      const state = {
        ...createInitialGameState('game-1'),
        status: GameStatus.Completed,
      };
      expect(isGameOver(state)).toBe(true);
    });
  });
});
