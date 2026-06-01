import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type {
  IGameCreatedPayload,
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IMovementDeclaredPayload,
  IMovementInvalidPayload,
} from '@/types/gameplay/GameSessionMovementEvents';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { TerrainPreset } from '@/types/encounter';
import {
  GameEventType,
  GameSide,
  GameStatus,
  GamePhase,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  RangeBracket,
} from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IAdaptedUnit } from '../types';

import { GameEngine, InteractiveSession } from '../GameEngine';
import {
  createGridFromHexTerrain,
  createGridFromTerrainPreset,
  hexTerrainFromGrid,
  seedHexTerrainFromGrid,
} from '../GameEngine.helpers';
import { runAttackPhase, runMovementPhase } from '../GameEngine.phases';

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

function createAmmoWeapon(id: string): IWeapon {
  return {
    id,
    name: 'AC/5',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 1,
    minRange: 0,
    ammoPerTon: 20,
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

function setupEngineSessionAtAttackPhase(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      createGameUnit('bot-1', GameSide.Player),
      createGameUnit('target-1', GameSide.Opponent),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units['bot-1'] = {
    ...session.currentState.units['bot-1'],
    position: { q: 0, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units['target-1'] = {
    ...session.currentState.units['target-1'],
    position: { q: 5, r: 0 },
    facing: Facing.South,
    movementThisTurn: MovementType.Stationary,
  };
  return session;
}

function setupEngineSessionAtMovementPhase(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      createGameUnit('bot-1', GameSide.Player),
      createGameUnit('target-1', GameSide.Opponent),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session.currentState.units['bot-1'] = {
    ...session.currentState.units['bot-1'],
    position: { q: 0, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units['target-1'] = {
    ...session.currentState.units['target-1'],
    position: { q: 5, r: 0 },
    facing: Facing.South,
    movementThisTurn: MovementType.Stationary,
  };
  return session;
}

function placeInteractiveUnit(
  interactive: InteractiveSession,
  unitId: string,
  position: { q: number; r: number },
  facing: Facing,
): void {
  const state = interactive.getSession().currentState;
  state.units[unitId] = {
    ...state.units[unitId],
    position,
    facing,
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

  describe('runAttackPhase', () => {
    it('declares bot weapon attacks with the real distance-derived range bracket', () => {
      const session = setupEngineSessionAtAttackPhase();
      const botPlayer = {
        evaluateRetreat: jest.fn(() => null),
        playAttackPhase: jest.fn((unit: { unitId: string }) =>
          unit.unitId === 'bot-1'
            ? {
                type: 'AttackDeclared',
                payload: {
                  attackerId: 'bot-1',
                  targetId: 'target-1',
                  weapons: ['bot-laser'],
                },
              }
            : null,
        ),
      } as unknown as BotPlayer;
      const weapon = {
        ...createTestWeapon('bot-laser'),
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
      };

      const result = runAttackPhase(
        session,
        botPlayer,
        new Map([['bot-1', [weapon]]]),
        new Map([['bot-1', 4]]),
      );

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      );
      expect(declared).toBeDefined();
      const payload = declared!.payload as IAttackDeclaredPayload;
      expect(payload.range).toBe(RangeBracket.Medium);
      expect(payload.toHitNumber).toBe(6);
      expect(payload.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: `Range (${RangeBracket.Medium})`,
            value: 2,
          }),
        ]),
      );
    });
  });

  describe('runMovementPhase', () => {
    it('routes bot movement through the rules-backed movement validator', () => {
      const session = setupEngineSessionAtMovementPhase();
      const grid = createGridFromHexTerrain(12, []);
      const botPlayer = {
        evaluateRetreat: jest.fn(() => null),
        playMovementPhase: jest.fn((unit: { unitId: string }) =>
          unit.unitId === 'bot-1'
            ? {
                type: GameEventType.MovementDeclared,
                payload: {
                  unitId: 'bot-1',
                  from: { q: 0, r: 0 },
                  to: { q: 1, r: 0 },
                  facing: Facing.Southeast,
                  movementType: MovementType.Walk,
                  mpUsed: 1,
                  heatGenerated: 1,
                },
              }
            : null,
        ),
      } as unknown as BotPlayer;

      const result = runMovementPhase(
        session,
        grid,
        botPlayer,
        new Map(),
        new Map([['bot-1', { walkMP: 0, runMP: 0, jumpMP: 0 }]]),
        new Map([['bot-1', 4]]),
      );

      expect(
        result.events.some(
          (event) =>
            event.type === GameEventType.MovementDeclared &&
            event.actorId === 'bot-1',
        ),
      ).toBe(false);

      const invalid = result.events.find(
        (event) =>
          event.type === GameEventType.MovementInvalid &&
          event.actorId === 'bot-1',
      );
      expect(invalid).toBeDefined();
      expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
        unitId: 'bot-1',
        reason: 'InsufficientMP',
      });
      expect(result.currentState.units['bot-1'].lockState).toBe(
        LockState.Locked,
      );
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

    it('threads a configured terrain grid into interactive sessions', () => {
      const grid = createGridFromHexTerrain(5, [
        {
          coordinate: { q: 0, r: 0 },
          elevation: 2,
          features: [{ type: TerrainType.HeavyWoods, level: 1 }],
        },
      ]);
      const engine = new GameEngine({
        seed: 42,
        turnLimit: 20,
        grid,
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

      const configured = engine.createInteractiveSession([p1], [o1], gameUnits);

      const center = configured.getGrid().hexes.get('0,0');
      const created = configured
        .getSession()
        .events.find((event) => event.type === GameEventType.GameCreated);
      const payload = created?.payload as IGameCreatedPayload | undefined;
      const recovered = InteractiveSession.fromSession(configured.getSession());
      expect(configured.getSession().config.mapRadius).toBe(5);
      expect(center?.terrain).toBe(TerrainType.HeavyWoods);
      expect(center?.elevation).toBe(2);
      expect(payload?.hexTerrain).toEqual([
        {
          coordinate: { q: 0, r: 0 },
          elevation: 2,
          features: [{ type: TerrainType.HeavyWoods, level: 1 }],
        },
      ]);
      expect(recovered.getGrid().hexes.get('0,0')).toMatchObject({
        terrain: TerrainType.HeavyWoods,
        elevation: 2,
      });
    });

    it('creates deterministic preset terrain grids for encounter launches', () => {
      const grid = createGridFromTerrainPreset(3, TerrainPreset.Urban);

      expect(grid.config.radius).toBe(3);
      expect(grid.hexes.get('0,0')?.terrain).toBe(TerrainType.Road);
      expect(
        Array.from(grid.hexes.values()).some(
          (hex) => hex.terrain === TerrainType.Building && hex.elevation === 1,
        ),
      ).toBe(true);
    });
  });

  describe('terrain grid helpers', () => {
    it('preserves multi-feature terrain for rules-backed projection consumers', () => {
      const grid = createGridFromHexTerrain(2, [
        {
          coordinate: { q: 1, r: 0 },
          elevation: 0,
          features: [
            { type: TerrainType.LightWoods, level: 1 },
            { type: TerrainType.Building, level: 2 },
          ],
        },
      ]);

      const encoded = grid.hexes.get('1,0')?.terrain;
      expect(encoded).toContain(TerrainType.LightWoods);
      expect(encoded).toContain(TerrainType.Building);

      const roundTripped = hexTerrainFromGrid(grid).find(
        (tile) => tile.coordinate.q === 1 && tile.coordinate.r === 0,
      );
      expect(roundTripped?.features).toEqual([
        { type: TerrainType.LightWoods, level: 1 },
        { type: TerrainType.Building, level: 2 },
      ]);
    });

    it('seeds only non-default terrain and elevation for GameCreated payloads', () => {
      const grid = createGridFromHexTerrain(2, [
        {
          coordinate: { q: 1, r: 0 },
          elevation: 0,
          features: [{ type: TerrainType.Rough, level: 1 }],
        },
        {
          coordinate: { q: 0, r: 1 },
          elevation: 2,
          features: [{ type: TerrainType.Clear, level: 0 }],
        },
      ]);

      expect(seedHexTerrainFromGrid(grid)).toEqual([
        {
          coordinate: { q: 0, r: 1 },
          elevation: 2,
          features: [{ type: TerrainType.Clear, level: 0 }],
        },
        {
          coordinate: { q: 1, r: 0 },
          elevation: 0,
          features: [{ type: TerrainType.Rough, level: 1 }],
        },
      ]);
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

      // WeaponAttack → PhysicalAttack
      interactive.advancePhase();
      expect(interactive.getState().phase).toBe(GamePhase.PhysicalAttack);

      // PhysicalAttack → Heat
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
    it('returns movement destinations from rules-backed walk/run/jump projections', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1: IAdaptedUnit = {
        ...createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
        walkMP: 1,
        runMP: 2,
        jumpMP: 3,
      };
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: -5,
        r: 0,
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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: -5, r: 0 },
        Facing.North,
      );

      const moveKeys = new Set(
        interactive
          .getAvailableActions('player-1')
          .validMoves.map((hex) => `${hex.q},${hex.r}`),
      );
      expect(moveKeys).toContain('1,0');
      expect(moveKeys).toContain('2,0');
      expect(moveKeys).toContain('3,0');
      expect(moveKeys).not.toContain('4,0');
    });

    it('uses runtime conversion capability for available moves and committed movement after import', () => {
      const grid = createGridFromHexTerrain(5, []);
      const engine = new GameEngine({ seed: 42, turnLimit: 20, grid });
      const p1: IAdaptedUnit = {
        ...createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
        walkMP: 1,
        runMP: 2,
        jumpMP: 2,
        unitHeight: 1,
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
        conversionMode: 'mek',
      };
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: -5,
        r: 0,
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
      interactive.advancePhase();
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: -5, r: 0 },
        Facing.North,
      );

      const mekMoveKeys = new Set(
        interactive
          .getAvailableActions('player-1')
          .validMoves.map((hex) => `${hex.q},${hex.r}`),
      );
      expect(mekMoveKeys).not.toContain('3,0');

      const state = interactive.getSession().currentState;
      state.units['player-1'] = {
        ...state.units['player-1'],
        conversionMode: 'airmek',
      };

      expect(interactive.getMovementCapability('player-1')).toMatchObject({
        walkMP: 6,
        runMP: 9,
        movementMode: 'wige',
        movementHeatProfile: 'airmek',
        unitHeight: 0,
      });

      const airMekMoveKeys = new Set(
        interactive
          .getAvailableActions('player-1')
          .validMoves.map((hex) => `${hex.q},${hex.r}`),
      );
      expect(airMekMoveKeys).toContain('3,0');

      interactive.applyMovement(
        'player-1',
        { q: 3, r: 0 },
        Facing.Southeast,
        MovementType.Walk,
        [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 },
        ],
      );

      const declared = interactive
        .getSession()
        .events.find(
          (event) =>
            event.type === GameEventType.MovementDeclared &&
            event.actorId === 'player-1',
        );
      expect(declared).toBeDefined();
      expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
        unitId: 'player-1',
        to: { q: 3, r: 0 },
        movementType: MovementType.Walk,
        mpUsed: 3,
        heatGenerated: 1,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 },
        ],
      });
      expect(
        interactive.getSession().currentState.units['player-1'],
      ).toMatchObject({
        position: { q: 3, r: 0 },
        movementThisTurn: MovementType.Walk,
        hexesMovedThisTurn: 3,
      });
    });

    it('excludes occupied destinations from available movement actions', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1: IAdaptedUnit = {
        ...createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
        walkMP: 2,
        runMP: 2,
        jumpMP: 2,
      };
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 1,
        r: 0,
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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: 1, r: 0 },
        Facing.North,
      );

      const moveKeys = new Set(
        interactive
          .getAvailableActions('player-1')
          .validMoves.map((hex) => `${hex.q},${hex.r}`),
      );
      expect(moveKeys).not.toContain('1,0');
    });

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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: 2, r: 0 },
        Facing.North,
      );

      const actions = interactive.getAvailableActions('player-1');
      expect(actions.validTargets.length).toBeGreaterThan(0);
      expect(actions.validTargets[0].unitId).toBe('opponent-1');
      expect(actions.validTargets[0].weapons).toEqual(['player-1-ml-1']);
    });

    it('excludes weapon targets outside projected weapon range', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 10 });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 10,
        r: 0,
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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: 10, r: 0 },
        Facing.North,
      );

      const actions = interactive.getAvailableActions('player-1');
      expect(actions.validTargets).toEqual([]);
    });

    it('excludes weapon targets blocked by projected elevation LOS', () => {
      const grid = createGridFromHexTerrain(3, [
        {
          coordinate: { q: 1, r: 0 },
          elevation: 2,
          features: [{ type: TerrainType.Clear, level: 0 }],
        },
      ]);
      const engine = new GameEngine({ seed: 42, turnLimit: 20, grid });
      const p1 = createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 });
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 2,
        r: 0,
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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: 2, r: 0 },
        Facing.North,
      );

      const actions = interactive.getAvailableActions('player-1');
      expect(actions.validTargets).toEqual([]);
    });

    it('excludes ammo-fed weapon targets when no matching ammo remains', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
      const p1: IAdaptedUnit = {
        ...createTestUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
        weapons: [createAmmoWeapon('player-1-ac5-1')],
      };
      const o1 = createTestUnit('opponent-1', GameSide.Opponent, {
        q: 2,
        r: 0,
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
      placeInteractiveUnit(
        interactive,
        'player-1',
        { q: 0, r: 0 },
        Facing.Southeast,
      );
      placeInteractiveUnit(
        interactive,
        'opponent-1',
        { q: 2, r: 0 },
        Facing.North,
      );
      const state = interactive.getSession().currentState;
      state.units['player-1'] = {
        ...state.units['player-1'],
        ammoState: {
          'ac5-bin': {
            binId: 'ac5-bin',
            weaponType: 'AC/5',
            location: 'right_torso',
            remainingRounds: 0,
            maxRounds: 20,
            isExplosive: true,
          },
        },
      };

      expect(interactive.getAvailableActions('player-1').validTargets).toEqual(
        [],
      );

      state.units['player-1'] = {
        ...state.units['player-1'],
        ammoState: {
          ...state.units['player-1'].ammoState,
          'ac5-bin': {
            ...state.units['player-1'].ammoState!['ac5-bin'],
            remainingRounds: 3,
          },
        },
      };

      expect(interactive.getAvailableActions('player-1').validTargets).toEqual([
        { unitId: 'opponent-1', weapons: ['player-1-ac5-1'] },
      ]);
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
