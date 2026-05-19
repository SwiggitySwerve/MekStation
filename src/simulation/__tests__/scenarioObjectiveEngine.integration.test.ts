/**
 * Scenario Objective Engine — integration tests.
 *
 * Drives generated scenarios end-to-end through placement, the per-turn
 * control pass, and the game-over check to prove a Capture / Defend /
 * Breakthrough scenario can be won by playing to objectives.
 *
 * Covers `scenario-objectives` delta-spec tasks 8.1 / 8.2 / 8.3.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { IGameState, IUnitGameState } from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { checkVictoryConditions } from '@/utils/gameplay/gameState';
import { keyToCoord } from '@/utils/gameplay/hexMath';
import { runObjectiveControlPass } from '@/utils/gameplay/objectives';

import type { ISimulationConfig } from '../core/types';

import { SeededRandom } from '../core/SeededRandom';
import {
  createDefaultTerrainWeights,
  createDefaultUnitWeights,
  ScenarioGenerator,
} from '../generator/ScenarioGenerator';

function makeGenerator(): ScenarioGenerator {
  return new ScenarioGenerator(
    createDefaultUnitWeights(),
    createDefaultTerrainWeights(),
  );
}

function baseConfig(
  objectiveType: ScenarioObjectiveType,
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: 4242,
    turnLimit: 8,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 5,
    objectiveType,
    ...overrides,
  };
}

function unit(
  id: string,
  side: GameSide,
  q: number,
  r: number,
): IUnitGameState {
  return {
    id,
    side,
    position: { q, r },
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
    destroyed: false,
    lockState: LockState.Pending,
  };
}

/** Replaces a state's units, keeping objectives + turn. */
function withUnits(state: IGameState, units: IUnitGameState[]): IGameState {
  return {
    ...state,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
  };
}

describe('integration — generated Capture scenario won by sustained hold', () => {
  it('places objectives and is won by holding for the required turns', () => {
    const generator = makeGenerator();
    const config = baseConfig(ScenarioObjectiveType.Capture);
    const session = generator.generate(config, new SeededRandom(config.seed));

    const objectives = session.currentState.objectives;
    expect(objectives).toBeDefined();
    expect(Object.keys(objectives!).length).toBeGreaterThanOrEqual(1);

    // Park a player unit on every objective hex; opponent stays away.
    const objectiveCoords = Object.values(objectives!).map((m) =>
      keyToCoord(m.hexKey),
    );
    const playerUnits = objectiveCoords.map((c, i) =>
      unit(`player-${i + 1}`, GameSide.Player, c.q, c.r),
    );
    const opponentUnits = [unit('opponent-1', GameSide.Opponent, 0, -4)];

    let state: IGameState = withUnits(session.currentState, [
      ...playerUnits,
      ...opponentUnits,
    ]);
    const holdTurns = Object.values(objectives!)[0].holdTurnsRequired;

    // Run the control pass each turn; the game must NOT be decided
    // until the hold requirement is met.
    let decidedTurn = -1;
    for (let turn = 1; turn <= holdTurns + 2; turn++) {
      state = { ...state, turn };
      const pass = runObjectiveControlPass('g', state, 0, turn, GamePhase.End);
      state = { ...state, objectives: pass.objectives };
      const winner = checkVictoryConditions(state, {
        mapRadius: 5,
        turnLimit: 8,
        victoryConditions: [],
        optionalRules: [],
      });
      if (winner !== null && decidedTurn === -1) decidedTurn = turn;
    }

    expect(decidedTurn).toBe(holdTurns);
    const finalWinner = checkVictoryConditions(state, {
      mapRadius: 5,
      turnLimit: 8,
      victoryConditions: [],
      optionalRules: [],
    });
    expect(finalWinner).toBe(GameSide.Player);
  });
});

describe('integration — generated Breakthrough scenario won at the exit edge', () => {
  it('is won by moving the required units onto an exit hex', () => {
    const generator = makeGenerator();
    const config = baseConfig(ScenarioObjectiveType.Breakthrough);
    const session = generator.generate(config, new SeededRandom(config.seed));

    const objectives = session.currentState.objectives;
    expect(objectives).toBeDefined();
    const exitCoord = keyToCoord(Object.values(objectives!)[0].hexKey);
    // Breakthrough exits sit on the north edge (opposite the attacker).
    expect(exitCoord.r).toBe(config.mapRadius);

    // Before the unit reaches the exit → undecided.
    const beforeState = withUnits(session.currentState, [
      unit('player-1', GameSide.Player, 0, 0),
      unit('opponent-1', GameSide.Opponent, 0, -4),
    ]);
    expect(
      checkVictoryConditions(beforeState, {
        mapRadius: 5,
        turnLimit: 8,
        victoryConditions: [],
        optionalRules: [],
      }),
    ).toBeNull();

    // Move the required attacker units onto the exit hex.
    const required = Object.values(objectives!)[0].holdTurnsRequired;
    const reached = Array.from({ length: required }, (_, i) =>
      unit(`player-${i + 1}`, GameSide.Player, exitCoord.q, exitCoord.r),
    );
    const afterState = withUnits(session.currentState, [
      ...reached,
      unit('opponent-1', GameSide.Opponent, 0, -4),
    ]);
    expect(
      checkVictoryConditions(afterState, {
        mapRadius: 5,
        turnLimit: 8,
        victoryConditions: [],
        optionalRules: [],
      }),
    ).toBe(GameSide.Player);
  });
});

describe('integration — generated Defend scenario won at the turn limit', () => {
  it('is won by the defender surviving to the turn limit in control', () => {
    const generator = makeGenerator();
    const config = baseConfig(ScenarioObjectiveType.Defend, { turnLimit: 6 });
    const session = generator.generate(config, new SeededRandom(config.seed));

    const objectives = session.currentState.objectives;
    expect(objectives).toBeDefined();
    const objCoord = keyToCoord(Object.values(objectives!)[0].hexKey);

    // Defender (opponent) parks a unit on the objective; attacker
    // stays off it.
    let state: IGameState = withUnits(session.currentState, [
      unit('opponent-1', GameSide.Opponent, objCoord.q, objCoord.r),
      unit('player-1', GameSide.Player, 0, -4),
    ]);

    const gameConfig = {
      mapRadius: 5,
      turnLimit: 6,
      victoryConditions: [],
      optionalRules: [],
    };

    // Undecided before the turn limit.
    for (let turn = 1; turn < 6; turn++) {
      state = { ...state, turn };
      const pass = runObjectiveControlPass('g', state, 0, turn, GamePhase.End);
      state = { ...state, objectives: pass.objectives };
      expect(checkVictoryConditions(state, gameConfig)).toBeNull();
    }

    // At the turn limit the defender wins while still in control.
    state = { ...state, turn: 6 };
    const finalPass = runObjectiveControlPass('g', state, 0, 6, GamePhase.End);
    state = { ...state, objectives: finalPass.objectives };
    expect(checkVictoryConditions(state, gameConfig)).toBe(GameSide.Opponent);
  });
});

describe('integration — markerless scenario still ends on destruction', () => {
  it('a destroy scenario generates no objectives and ends on elimination', () => {
    const generator = makeGenerator();
    const config = baseConfig(ScenarioObjectiveType.Destroy);
    const session = generator.generate(config, new SeededRandom(config.seed));
    expect(session.currentState.objectives).toBeUndefined();

    const gameConfig = {
      mapRadius: 5,
      turnLimit: 8,
      victoryConditions: [],
      optionalRules: [],
    };
    // Both alive → undecided.
    const alive: IGameState = {
      gameId: 'g',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.End,
      activationIndex: 0,
      units: {
        'player-1': unit('player-1', GameSide.Player, 0, 0),
        'opponent-1': unit('opponent-1', GameSide.Opponent, 0, 1),
      },
      turnEvents: [],
    };
    expect(checkVictoryConditions(alive, gameConfig)).toBeNull();

    // Opponent eliminated → player wins by destruction path.
    const eliminated: IGameState = {
      ...alive,
      units: {
        'player-1': unit('player-1', GameSide.Player, 0, 0),
        'opponent-1': {
          ...unit('opponent-1', GameSide.Opponent, 0, 1),
          destroyed: true,
        },
      },
    };
    expect(checkVictoryConditions(eliminated, gameConfig)).toBe(
      GameSide.Player,
    );
  });
});
