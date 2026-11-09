import type { IWeapon } from '@/simulation/ai/types';
import type {
  IGameState,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { Faction } from '@/constants/scenario/rats';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import {
  calculateGameOutcome,
  calculateCombatStats,
  calculateOutcomeFromEvents,
  type IGameOutcome,
} from '@/services/game-resolution/GameOutcomeCalculator';
import { ScenarioGeneratorService } from '@/services/generators/ScenarioGeneratorService';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { MAX_TURNS } from '@/simulation/runner/SimulationRunnerConstants';
import { TerrainPreset } from '@/types/encounter';
import {
  GameSide,
  GameStatus,
  GamePhase,
  GameEventType,
  type IAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IGameEndedPayload,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { BiomeType, ScenarioObjectiveType } from '@/types/scenario';
import { Era } from '@/types/temporal/Era';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';
import { endGame } from '@/utils/gameplay/gameSession';

import type { IAdaptedUnit } from '../types';

import { GameEngine, InteractiveSession } from '../GameEngine';
import {
  createGridFromHexTerrain,
  createGridFromTerrainPreset,
} from '../GameEngine.helpers';
import { runAttackPhase, runPhysicalAttackPhase } from '../GameEngine.phases';

jest.mock('@/services/game-resolution/GameOutcomeCalculator', () => {
  const actual = jest.requireActual<
    typeof import('@/services/game-resolution/GameOutcomeCalculator')
  >('@/services/game-resolution/GameOutcomeCalculator');
  return {
    ...actual,
    calculateGameOutcome: jest.fn(actual.calculateGameOutcome),
  };
});

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

function getGameEndedPayload(session: {
  events: readonly { type: GameEventType; payload: unknown }[];
}): IGameEndedPayload {
  const ended = session.events.find(
    (event) => event.type === GameEventType.GameEnded,
  );
  if (!ended) throw new Error('Expected GameEnded event');
  return ended.payload as IGameEndedPayload;
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
    it.each<[IGameOutcome['reason'], IGameEndedPayload['reason']]>([
      ['concede', 'concede'],
      ['turn_limit', 'turn_limit'],
      ['objective', 'objective'],
      ['elimination', 'destruction'],
      ['mutual_destruction', 'destruction'],
      ['aborted', 'destruction'],
      ['timeout', 'destruction'],
    ])('preserves the existing %s -> %s reason mapping', (reason, mapped) => {
      const actual = jest.requireActual<
        typeof import('@/services/game-resolution/GameOutcomeCalculator')
      >('@/services/game-resolution/GameOutcomeCalculator');
      jest.mocked(calculateGameOutcome).mockImplementationOnce((input) => ({
        ...actual.calculateGameOutcome(input),
        reason,
      }));
      const session = new GameEngine({
        seed: 42,
        turnLimit: 1,
      }).runToCompletion(
        [createTestUnit('player-1', GameSide.Player)],
        [createTestUnit('opponent-1', GameSide.Opponent)],
        [
          createGameUnit('player-1', GameSide.Player),
          createGameUnit('opponent-1', GameSide.Opponent),
        ],
      );
      expect(getGameEndedPayload(session).reason).toBe(mapped);
    });

    it.each([42, 12345])(
      'preserves the C4 auto-resolve baseline for seed %i',
      (seed) => {
        const weapons = [
          {
            ...createTestWeapon('baseline-laser'),
            shortRange: 1,
            mediumRange: 1,
            longRange: 1,
            damage: 1,
            heat: 0,
          },
        ];
        const player = {
          ...createTestUnit('player-1', GameSide.Player),
          weapons,
        };
        const opponent = {
          ...createTestUnit('opponent-1', GameSide.Opponent),
          weapons,
        };
        const session = new GameEngine({
          seed,
          turnLimit: 20,
          mapRadius: 7,
        }).runToCompletion(
          [player],
          [opponent],
          [
            createGameUnit(player.id, player.side),
            createGameUnit(opponent.id, opponent.side),
          ],
        );
        const events = session.events.map(
          ({ type, turn, phase, actorId, payload }) => ({
            type,
            turn,
            phase,
            actorId: actorId ?? null,
            payload,
          }),
        );
        const declarations = events.filter(
          ({ type }) =>
            type === GameEventType.AttackDeclared ||
            type === GameEventType.PhysicalAttackDeclared,
        );
        expect(
          declarations.some(
            ({ type }) => type === GameEventType.AttackDeclared,
          ),
        ).toBe(true);
        expect(
          declarations.some(
            ({ type }) => type === GameEventType.PhysicalAttackDeclared,
          ),
        ).toBe(true);
        const actual = {
          seed,
          declarations: declarations.length,
          events: digestReplayCheckpointState(
            JSON.parse(JSON.stringify(events)) as unknown,
          ),
          outcome: getGameEndedPayload(session),
          units: digestReplayCheckpointState(
            JSON.parse(JSON.stringify(session.currentState.units)) as unknown,
          ),
        };
        // Captured twice on origin/main bfbf2b239 before the declaration guards;
        // rebaselined for the runToCompletion End-phase PSR drain (terrain PR5).
        // To rebaseline after an approved rule change, on a clean tree run
        //   npx jest src/engine/__tests__/GameEngine.test.ts -t "C4 auto-resolve baseline" --no-color
        // and copy the Received values from the toEqual diff. Capture twice; both
        // runs must print identical values. Never compute or edit a digest by hand.
        expect(actual).toEqual(
          {
            '42': {
              seed: 42,
              declarations: 4,
              events:
                '2e6518e7722bb8fedc5212f0a83b0b67f4568ab56326e54266cc2d94608c0de1',
              outcome: {
                winner: 'player',
                reason: 'destruction',
                turns: 8,
              },
              units:
                '46bfa4fe3634d27bfa20d25d67df4c78ffedced150cf7cfe5e1b4f013448d7e6',
            },
            '12345': {
              seed: 12345,
              declarations: 12,
              events:
                'b0d824117f9c7cdff7f78ff4a1d9aa54d1a6139a5557a85b7bb31f55c3f9399a',
              outcome: {
                winner: 'opponent',
                reason: 'turn_limit',
                turns: 20,
              },
              units:
                'ef7ae9e28848ca2c199e1aa6522b9c20d1619117c260caad3eee8e274b4f2943',
            },
          }[seed],
        );
      },
    );

    it('retains exactly one inline damage-threshold trigger when auto-resolve crosses 20 damage', () => {
      const attacker = {
        ...createTestUnit('player-1', GameSide.Player),
        walkMP: 0,
        runMP: 0,
        jumpMP: 0,
        weapons: [
          {
            ...createTestWeapon('heavy-laser'),
            name: 'Large Laser',
            damage: 20,
            heat: 0,
            shortRange: 20,
            mediumRange: 30,
            longRange: 40,
          },
        ],
      };
      const target = {
        ...createTestUnit('opponent-1', GameSide.Opponent),
        walkMP: 0,
        runMP: 0,
        jumpMP: 0,
        weapons: [],
      };
      const session = new GameEngine({
        seed: 42,
        turnLimit: 1,
        mapRadius: 7,
      }).runToCompletion(
        [attacker],
        [target],
        [
          { ...createGameUnit('player-1', GameSide.Player), gunnery: 0 },
          createGameUnit('opponent-1', GameSide.Opponent),
        ],
      );
      const hits = session.events.filter(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).hit &&
          (event.payload as IAttackResolvedPayload).damage === 20,
      );
      expect(hits).toHaveLength(1);
      const triggers = session.events.filter(
        (event) =>
          event.type === GameEventType.PSRTriggered &&
          (event.payload as IPSRTriggeredPayload).reasonCode ===
            PSRTrigger.PhaseDamage20Plus,
      );
      expect(triggers).toHaveLength(1);
      expect(triggers[0]).toMatchObject({
        turn: hits[0].turn,
        phase: GamePhase.WeaponAttack,
        payload: {
          unitId: 'opponent-1',
          triggerSource: 'phase_damage_20_plus',
        },
      });
    });

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

    it('threads configured victory conditions into auto-resolved sessions', () => {
      const engine = new GameEngine({
        seed: 1234,
        turnLimit: 4,
        mapRadius: 5,
        victoryConditions: ['custom:extract'],
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

      const session = engine.runToCompletion([p1], [o1], gameUnits);

      expect(session.config.turnLimit).toBe(4);
      expect(session.config.victoryConditions).toEqual(['custom:extract']);
    });

    it('executes combat for a generated unlimited Standup Fight', () => {
      const scenario = new ScenarioGeneratorService().generate({
        playerBV: 432,
        playerUnitCount: 1,
        scenarioType: ScenarioObjectiveType.Destroy,
        biome: BiomeType.Desert,
        faction: Faction.PIRATES,
        era: Era.LATE_SUCCESSION_WARS,
        difficulty: 1,
        maxModifiers: 0,
        allowNegativeModifiers: false,
        seed: 42,
      });
      expect(scenario.template.id).toBe('standup_fight');
      expect(scenario.turnLimit).toBe(0);

      const engine = new GameEngine({
        seed: 42,
        turnLimit: scenario.turnLimit,
        mapRadius: 5,
      });
      const session = engine.runToCompletion(
        [createTestUnit('player-1', GameSide.Player, { q: 0, r: -2 })],
        [createTestUnit('opponent-1', GameSide.Opponent, { q: 0, r: 2 })],
        [
          createGameUnit('player-1', GameSide.Player),
          createGameUnit('opponent-1', GameSide.Opponent),
        ],
      );
      expect(
        session.events.some(
          (event) => event.type === GameEventType.InitiativeRolled,
        ),
      ).toBe(true);
      expect(
        session.events.some(
          (event) => event.type === GameEventType.DamageApplied,
        ),
      ).toBe(true);
      const ended = getGameEndedPayload(session);
      const outcome = calculateGameOutcome({
        state: session.currentState,
        events: session.events,
        config: session.config,
        startedAt: session.createdAt,
        endedAt: session.updatedAt,
      });
      expect(outcome.winner).toBe(ended.winner);
      expect(outcome.reason).not.toBe('objective');
    });

    it('bounds unlimited auto-resolution and records a coherent stalemate draw', () => {
      const engine = new GameEngine({ seed: 42, turnLimit: 0, mapRadius: 5 });
      const stationary = (
        id: string,
        side: GameSide,
        r: number,
      ): IAdaptedUnit => ({
        ...createTestUnit(id, side, { q: 0, r }),
        weapons: [],
        walkMP: 0,
        runMP: 0,
        jumpMP: 0,
      });
      const session = engine.runToCompletion(
        [stationary('player-1', GameSide.Player, -3)],
        [stationary('opponent-1', GameSide.Opponent, 3)],
        [
          createGameUnit('player-1', GameSide.Player),
          createGameUnit('opponent-1', GameSide.Opponent),
        ],
      );
      const ended = getGameEndedPayload(session);
      const outcome = calculateGameOutcome({
        state: session.currentState,
        events: session.events,
        config: session.config,
        startedAt: session.createdAt,
        endedAt: session.updatedAt,
      });
      expect(session.config.turnLimit).toBe(MAX_TURNS);
      expect(ended.turns).toBe(MAX_TURNS);
      expect(ended).toMatchObject({ winner: 'draw', reason: 'turn_limit' });
      expect(outcome).toMatchObject({
        winner: 'draw',
        reason: 'turn_limit',
        turnsPlayed: MAX_TURNS,
        playerDamageDealt: 0,
        opponentDamageDealt: 0,
      });
      expect(outcome.description).not.toContain('Defeat');
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

    it('reports turn_limit only after the configured turn count is reached', () => {
      const engine = new GameEngine({
        seed: 2468,
        turnLimit: 1,
        mapRadius: 5,
      });
      const p1: IAdaptedUnit = {
        ...createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 }),
        weapons: [],
      };
      const o1: IAdaptedUnit = {
        ...createTestUnit('opponent-1', GameSide.Opponent, { q: 0, r: 3 }),
        weapons: [],
      };
      const gameUnits = [
        createGameUnit('player-1', GameSide.Player),
        createGameUnit('opponent-1', GameSide.Opponent),
      ];

      const session = engine.runToCompletion([p1], [o1], gameUnits);
      const ended = getGameEndedPayload(session);
      const outcome = calculateGameOutcome({
        state: session.currentState,
        events: session.events,
        config: session.config,
        startedAt: session.createdAt,
        endedAt: session.updatedAt,
      });

      expect(ended.reason).toBe('turn_limit');
      expect(ended.turns).toBeGreaterThanOrEqual(session.config.turnLimit);
      expect(outcome.reason).toBe('turn_limit');
      expect(outcome.turnsPlayed).toBe(ended.turns);
    });

    it('reports early elimination from the session record instead of turn_limit', () => {
      const engine = new GameEngine({
        seed: 13579,
        turnLimit: 9,
        mapRadius: 5,
      });
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
      const ended = getGameEndedPayload(session);
      const playerSurviving = Object.values(session.currentState.units).filter(
        (unit) =>
          unit.side === GameSide.Player &&
          !unit.destroyed &&
          !unit.hasRetreated &&
          !unit.hasEjected,
      ).length;
      const opponentSurviving = Object.values(
        session.currentState.units,
      ).filter(
        (unit) =>
          unit.side === GameSide.Opponent &&
          !unit.destroyed &&
          !unit.hasRetreated &&
          !unit.hasEjected,
      ).length;
      const outcome = calculateGameOutcome({
        state: session.currentState,
        events: session.events,
        config: session.config,
        startedAt: session.createdAt,
        endedAt: session.updatedAt,
      });
      const combatStats = calculateCombatStats(
        session.events,
        session.currentState.units,
      );

      expect(session.currentState.turn).toBeLessThan(session.config.turnLimit);
      expect(ended.reason).toBe('destruction');
      expect(outcome.reason).toBe('elimination');
      expect(outcome.turnsPlayed).toBe(session.currentState.turn);
      expect(outcome.opponentUnitsDestroyed).toBe(
        Object.values(session.currentState.units).filter(
          (unit) => unit.side === GameSide.Opponent && unit.destroyed,
        ).length,
      );
      expect(Math.min(playerSurviving, opponentSurviving)).toBe(0);
      expect(outcome.playerDamageDealt).toBe(combatStats.playerDamageDealt);
      expect(outcome.opponentDamageDealt).toBe(combatStats.opponentDamageDealt);
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

    it.each([
      [GameSide.Player, GameSide.Opponent],
      [GameSide.Opponent, GameSide.Player],
    ])(
      'reports the recorded concession through public and replay results for %s',
      (side, winner) => {
        const before = interactive.getSession();
        interactive.concede(side);
        const completed = interactive.getSession();
        expect(completed.currentState.result).toEqual({
          winner,
          reason: 'concede',
        });
        expect(completed.events.slice(0, before.events.length)).toEqual(
          before.events,
        );
        expect(interactive.getResult()).toMatchObject({
          winner,
          reason: 'concede',
        });
        expect(
          calculateOutcomeFromEvents(
            completed.id,
            completed.events,
            completed.config,
            completed.createdAt,
            completed.updatedAt,
          ),
        ).toMatchObject({ winner, reason: 'concede' });
      },
    );

    it('reports an actual abort without reclassifying it as an objective', () => {
      interactive.abortMatch();
      expect(interactive.getSession().currentState.result).toEqual({
        winner: 'draw',
        reason: 'aborted',
      });
      expect(interactive.getResult()).toMatchObject({
        winner: 'draw',
        reason: 'aborted',
      });
    });

    it('preserves a public explicit draw by concession after event rehydration', () => {
      const completed = endGame(interactive.getSession(), 'draw', 'concede');
      const result = calculateOutcomeFromEvents(
        completed.id,
        completed.events,
        completed.config,
        completed.createdAt,
        completed.updatedAt,
      );
      expect(result).toMatchObject({
        winner: 'draw',
        reason: 'concede',
        description: 'Match ended by concession with no winner.',
      });
      expect(completed.currentState.result).toEqual({
        winner: 'draw',
        reason: 'concede',
      });
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
      expect(configured.getSession().config.mapRadius).toBe(5);
      expect(center?.terrain).toBe(TerrainType.HeavyWoods);
      expect(center?.elevation).toBe(2);
    });

    it('threads configured victory conditions into interactive sessions', () => {
      const engine = new GameEngine({
        seed: 42,
        turnLimit: 0,
        mapRadius: 5,
        victoryConditions: ['destroy_all'],
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

      expect(configured.getSession().config.turnLimit).toBe(0);
      expect(configured.getSession().config.victoryConditions).toEqual([
        'destroy_all',
      ]);
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

    it('quick-sim winner checks treat ejected units as out of force', () => {
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
      interactive.ejectUnit('player-1');

      const winner = (
        engine as unknown as {
          determineWinnerFromState(state: IGameState): GameSide | 'draw';
        }
      ).determineWinnerFromState(interactive.getState());

      expect(winner).toBe(GameSide.Opponent);
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

it.each([GamePhase.WeaponAttack, GamePhase.PhysicalAttack])(
  'does not plan or append declarations for committed actors in %s',
  (phase) => {
    const engine = new GameEngine({ seed: 42, mapRadius: 7 });
    const player = createTestUnit('player-1', GameSide.Player);
    const opponent = createTestUnit('opponent-1', GameSide.Opponent);
    const interactive = engine.createInteractiveSession(
      [player],
      [opponent],
      [
        createGameUnit(player.id, player.side),
        createGameUnit(opponent.id, opponent.side),
      ],
    );
    interactive.advancePhase();
    interactive.advancePhase();
    if (phase === GamePhase.PhysicalAttack) interactive.advancePhase();
    const session = interactive.getSession();
    for (const [unitId, unit] of Object.entries(session.currentState.units))
      session.currentState.units[unitId] = {
        ...unit,
        lockState: LockState.Locked,
      };
    const before = JSON.stringify(session);
    const bot = new BotPlayer(new SeededRandom(42));
    const ranged = jest.spyOn(bot, 'playAttackPhase');
    const physical = jest.spyOn(bot, 'playPhysicalAttackPhase');
    const weaponsByUnit = new Map([
      [player.id, player.weapons],
      [opponent.id, opponent.weapons],
    ]);
    const result =
      phase === GamePhase.WeaponAttack
        ? runAttackPhase(session, bot, weaponsByUnit, new Map())
        : runPhysicalAttackPhase({
            session,
            botPlayer: bot,
            weaponsByUnit,
            gunneryByUnit: new Map(),
            pilotingByUnit: new Map(),
            d6Roller: () => 1,
          });
    expect(ranged).not.toHaveBeenCalled();
    expect(physical).not.toHaveBeenCalled();
    expect(result).toBe(session);
    expect(JSON.stringify(session)).toBe(before);
  },
);

it('refuses a second attack through the public interactive session without changing its journal', () => {
  const weapons = [
    {
      ...createTestWeapon('public-laser'),
      shortRange: 20,
      mediumRange: 30,
      longRange: 40,
    },
  ];
  const player = { ...createTestUnit('player-1', GameSide.Player), weapons };
  const opponent = createTestUnit('opponent-1', GameSide.Opponent);
  const session = new GameEngine({
    seed: 42,
    mapRadius: 7,
  }).createInteractiveSession(
    [player],
    [opponent],
    [
      createGameUnit(player.id, player.side),
      createGameUnit(opponent.id, opponent.side),
    ],
  );
  session.advancePhase();
  session.advancePhase();
  session.applyAttack(player.id, opponent.id, ['public-laser']);
  const before = session.getSession();
  expect(
    before.events.filter(
      (event) => event.type === GameEventType.AttackDeclared,
    ),
  ).toHaveLength(1);
  const snapshot = JSON.stringify(before);
  session.applyAttack(player.id, opponent.id, ['public-laser']);
  session.applyAttack(player.id, 'missing-target', ['public-laser']);
  expect(session.getSession()).toBe(before);
  expect(JSON.stringify(session.getSession())).toBe(snapshot);
});

it('C10 blocks EMP startup through the interactive session', () => {
  const player = createTestUnit('c10-player', GameSide.Player);
  const opponent = createTestUnit('c10-opponent', GameSide.Opponent);
  const active = new GameEngine({
    seed: 42,
    turnLimit: 5,
    mapRadius: 7,
  }).createInteractiveSession(
    [player],
    [opponent],
    [
      createGameUnit(player.id, player.side),
      createGameUnit(opponent.id, opponent.side),
    ],
  );
  for (const entry of [
    {
      type: GameEventType.PhaseChanged,
      payload: {
        fromPhase: active.getSession().currentState.phase,
        toPhase: GamePhase.Heat,
      },
    },
    {
      type: GameEventType.EmpMinefieldEffectApplied,
      payload: {
        unitId: player.id,
        hex: { q: 0, r: 0 },
        roll: 9,
        modifier: 0,
        modifiedRoll: 9,
        effect: 'shutdown',
        durationTurns: 2,
        source: 'minefield',
      },
    },
  ]) {
    const before = active.getSession();
    active.appendEvent({
      ...createEventBase(
        before.id,
        before.events.length,
        entry.type,
        before.currentState.turn,
        GamePhase.Heat,
        player.id,
      ),
      payload: entry.payload,
    });
  }
  const before = active.getSession();
  active.advancePhase();
  const result = active.getSession();
  expect(result.currentState.phase).toBe(GamePhase.End);
  expect(result.currentState.units[player.id]).toMatchObject({
    shutdown: true,
    empShutdownTurns: 2,
  });
  expect(
    result.events
      .slice(before.events.length)
      .filter(
        (e) =>
          e.type === GameEventType.StartupAttempt ||
          e.type === GameEventType.ShutdownCheck,
      ),
  ).toEqual([]);
});
