import type { IWeapon } from '@/simulation/ai/types';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import {
  GameSide,
  GameStatus,
  GamePhase,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit } from '../types';

import { GameEngine, InteractiveSession } from '../GameEngine';

function createTestWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createTestUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number } = { q: 0, r: 0 },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [createTestWeapon(`${id}-ml-1`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function createGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

describe('GameEngine', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const engine = new GameEngine();
      expect(engine).toBeDefined();
    });

    it('should accept custom config', () => {
      const engine = new GameEngine({
        mapRadius: 5,
        turnLimit: 10,
        seed: 42,
      });
      expect(engine).toBeDefined();
    });
  });

  describe('runToCompletion', () => {
    it('should return a completed game session', () => {
      const engine = new GameEngine({
        seed: 12345,
        turnLimit: 10,
        mapRadius: 5,
      });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 3,
      });

      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];

      const session = engine.runToCompletion([p1], [o1], gameUnits);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(
        session.currentState.status === GameStatus.Completed ||
          session.currentState.status === GameStatus.Active,
      ).toBe(true);
    });

    it('should produce events', () => {
      const engine = new GameEngine({
        seed: 99999,
        turnLimit: 5,
        mapRadius: 5,
      });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: -1, r: -2 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 1,
        r: 2,
      });

      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];

      const session = engine.runToCompletion([p1], [o1], gameUnits);
      expect(session.events.length).toBeGreaterThan(2);
    });

    it('should complete with same seed without errors', () => {
      const makeSession = () => {
        const engine = new GameEngine({
          seed: 77777,
          turnLimit: 5,
          mapRadius: 5,
        });
        const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -2 });
        const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
          q: 0,
          r: 2,
        });
        const gameUnits = [
          createGameUnit('player-1', GameSide.Player),
          createGameUnit('opponent-1', GameSide.Opponent),
        ];
        return engine.runToCompletion([p1], [o1], gameUnits);
      };

      const s1 = makeSession();
      const s2 = makeSession();
      expect(s1.events.length).toBeGreaterThan(0);
      expect(s2.events.length).toBeGreaterThan(0);
    });
  });

  describe('createInteractiveSession', () => {
    let interactive: InteractiveSession;

    beforeEach(() => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 3,
      });
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];
      interactive = engine.createInteractiveSession([p1], [o1], gameUnits);
    });

    it('should return an object with expected methods', () => {
      expect(typeof interactive.getState).toBe('function');
      expect(typeof interactive.getSession).toBe('function');
      expect(typeof interactive.getAvailableActions).toBe('function');
      expect(typeof interactive.applyMovement).toBe('function');
      expect(typeof interactive.applyAttack).toBe('function');
      expect(typeof interactive.advancePhase).toBe('function');
      expect(typeof interactive.runAITurn).toBe('function');
      expect(typeof interactive.isGameOver).toBe('function');
      expect(typeof interactive.getResult).toBe('function');
    });

    it('should start in Initiative phase', () => {
      const state = interactive.getState();
      expect(state.phase).toBe(GamePhase.Initiative);
    });

    it('should start as active', () => {
      const state = interactive.getState();
      expect(state.status).toBe(GameStatus.Active);
    });

    it('should not be game over at start', () => {
      expect(interactive.isGameOver()).toBe(false);
    });

    it('should return null for getResult when game not over', () => {
      expect(interactive.getResult()).toBeNull();
    });
  });

  describe('phase cycling', () => {
    it('should advance through phases: initiative → movement → attack → heat → end', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 3,
      });
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];
      const interactive = engine.createInteractiveSession(
        [p1],
        [o1],
        gameUnits,
      );

      expect(interactive.getState().phase).toBe(GamePhase.Initiative);

      // Initiative → Movement
      interactive.advancePhase();
      expect(interactive.getState().phase).toBe(GamePhase.Movement);

      // Movement → WeaponAttack
      interactive.advancePhase();
      expect(interactive.getState().phase).toBe(GamePhase.WeaponAttack);

      // WeaponAttack → Heat
      interactive.advancePhase();
      expect(interactive.getState().phase).toBe(GamePhase.Heat);

      // Heat → End
      interactive.advancePhase();
      expect(interactive.getState().phase).toBe(GamePhase.End);
    });
  });

  describe('isGameOver', () => {
    it('should detect game over when all units of one side are destroyed', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });

      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1: IAdaptedUnit = {
        ...createTestUnit('opponent-1', GameSide.Opponent, { q: 0, r: 3 }),
        destroyed: true,
      };
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];

      const session = engine.runToCompletion([p1], [o1], gameUnits);
      expect(session).toBeDefined();
    });
  });

  describe('getAvailableActions', () => {
    it('should return valid targets for an active unit', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 3,
      });
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];
      const interactive = engine.createInteractiveSession(
        [p1],
        [o1],
        gameUnits,
      );

      const actions = interactive.getAvailableActions('player-1');
      expect(actions.validTargets.length).toBeGreaterThan(0);
      expect(actions.validTargets[0].unitId).toBe('opponent-1');
    });

    it('should return empty for nonexistent unit', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 3,
      });
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];
      const interactive = engine.createInteractiveSession(
        [p1],
        [o1],
        gameUnits,
      );

      const actions = interactive.getAvailableActions('no-such-unit');
      expect(actions.validMoves).toHaveLength(0);
      expect(actions.validTargets).toHaveLength(0);
    });
  });
});
