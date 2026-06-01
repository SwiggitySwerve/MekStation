/**
 * Integration tests for AI objective awareness (A3b).
 *
 * Drives an `Elite` `BotPlayer` over a generated scenario — Capture, Defend,
 * Breakthrough — turn by turn, threading the objective layer through the
 * lance context, and asserts the bot plays the scenario: it walks a unit onto
 * a capture objective and holds it, holds a defend marker to the turn limit,
 * and moves units to a breakthrough exit edge. A `Veteran` bot, blind to the
 * objective map, fails to capture.
 *
 * Covers `add-ai-objective-awareness` tasks 6.1–6.3.
 *
 * @spec openspec/changes/add-ai-objective-awareness/specs/simulation-system/spec.md
 *   Requirement: Objective-Aware Lance Planning
 *   Requirement: Objective-Seeking Movement
 */

import type {
  IGameSession,
  IGameState,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import {
  advanceObjectiveControl,
  evaluateObjectiveOutcome,
} from '@/utils/gameplay/objectives';

import type { ObjectiveCostFn } from '../ai/AIObjectivePlanner';
import type { IAILanceContext } from '../ai/BotPlayer';
import type { IAIUnitState, IBotBehavior, IWeapon } from '../ai/types';

import { planTurn } from '../ai/AILancePlanner';
import { findPath } from '../ai/AITerrainPathfinder';
import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';

// =============================================================================
// Fixtures
// =============================================================================

function makeGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius }, hexes };
}

function weapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mlas',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 12,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function unitState(
  id: string,
  side: GameSide,
  pos: IHexCoordinate,
): IUnitGameState {
  return {
    id,
    side,
    position: pos,
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

/** A walking-only capability — 5 walk MP, no jump. */
const CAPABILITY: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

const ELITE: IBotBehavior = {
  retreatThreshold: 0.3,
  retreatEdge: 'nearest',
  safeHeatThreshold: 13,
  tier: 'Elite',
};

const VETERAN: IBotBehavior = {
  retreatThreshold: 0.3,
  retreatEdge: 'nearest',
  safeHeatThreshold: 13,
  tier: 'Veteran',
};

/**
 * Translate an `IUnitGameState` to the `IAIUnitState` the bot reasons over.
 * Every unit carries a single 12-range medium laser — enough to be a valid
 * combatant without dominating the objective term.
 */
function toAI(unit: IUnitGameState): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing as Facing,
    heat: unit.heat,
    weapons: [weapon()],
    ammo: {},
    destroyed: unit.destroyed,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
  };
}

/** A terrain-cost pathfinder probe — the production objective cost function. */
function makeCostFn(grid: IHexGrid): ObjectiveCostFn {
  return (u, hex) =>
    findPath({
      grid,
      origin: u.position,
      destination: hex,
      movementType: MovementType.Walk,
      capability: CAPABILITY,
    }).totalMpCost;
}

/**
 * Build the minimal `IGameSession` the planner reads — just the objective map
 * on `currentState`.
 */
function sessionWith(
  objectives: Record<string, IObjectiveMarker>,
  units: IUnitGameState[],
  turn: number,
): IGameSession {
  const currentState: IGameState = {
    gameId: 'integration-game',
    status: GameStatus.Active,
    turn,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
    turnEvents: [],
    objectives,
  };
  return {
    id: 'session-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState,
  };
}

/**
 * Run one bot-side movement turn: build the lance plan with the objective
 * layer, move every living friendly unit, and return the updated unit list.
 * The grid occupancy is kept in sync so the pathfinder routes around units.
 */
function runBotMovementTurn(
  bot: BotPlayer,
  grid: IHexGrid,
  objectives: Record<string, IObjectiveMarker>,
  units: IUnitGameState[],
  botSide: GameSide,
  turn: number,
  objectiveAware: boolean,
): IUnitGameState[] {
  let working = units.map((u) => ({ ...u }));
  const friendly = working.filter((u) => u.side === botSide && !u.destroyed);
  const enemies = working.filter((u) => u.side !== botSide && !u.destroyed);

  const session = sessionWith(objectives, working, turn);
  const plan = planTurn(
    friendly.map(toAI),
    enemies.map(toAI),
    objectiveAware ? { session, botSide, costFn: makeCostFn(grid) } : undefined,
  );
  const lanceContext: IAILanceContext = {
    plan,
    lancemates: friendly.map(toAI),
  };

  for (const unit of friendly) {
    const aiUnit = toAI(unit);
    const allAI = working.filter((u) => !u.destroyed).map(toAI);
    const moveEvent = bot.playMovementPhase(
      aiUnit,
      grid,
      CAPABILITY,
      allAI,
      lanceContext,
    );
    if (!moveEvent) continue;
    // Apply the move to the working unit list.
    working = working.map((u) =>
      u.id === unit.id
        ? {
            ...u,
            position: moveEvent.payload.to,
            facing: moveEvent.payload.facing as Facing,
          }
        : u,
    );
  }
  return working;
}

/** Run the once-per-turn objective control pass over every marker. */
function advanceControl(
  objectives: Record<string, IObjectiveMarker>,
  units: IUnitGameState[],
  turn: number,
): Record<string, IObjectiveMarker> {
  const state: IGameState = {
    gameId: 'integration-game',
    status: GameStatus.Active,
    turn,
    phase: GamePhase.End,
    activationIndex: 0,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
    turnEvents: [],
    objectives,
  };
  const next: Record<string, IObjectiveMarker> = {};
  for (const [key, marker] of Object.entries(objectives)) {
    next[key] = advanceObjectiveControl(marker, state).marker;
  }
  return next;
}

// =============================================================================
// Task 6.1 — Capture scenario
// =============================================================================

describe('A3b integration — Capture scenario', () => {
  it('an Elite bot wins a Capture scenario by taking and holding the objective', () => {
    const grid = makeGrid(12);
    // The objective sits at the origin; the Elite (Opponent/defender role is
    // not the attacker here — the bot is the Player attacker) starts 6 hexes
    // out. The far enemy never contests the objective hex.
    let objectives: Record<string, IObjectiveMarker> = {
      '0,0': {
        id: 'objective-1',
        hexKey: '0,0',
        objectiveType: 'capture',
        owningSide: 'neutral',
        controlSide: 'neutral',
        controlRule: 'sole-occupancy',
        holdTurnsRequired: 3,
        holdProgress: 0,
      },
    };
    let units: IUnitGameState[] = [
      unitState('player-1', GameSide.Player, { q: 6, r: 0 }),
      unitState('opponent-1', GameSide.Opponent, { q: 0, r: 11 }),
    ];

    const bot = new BotPlayer(new SeededRandom(7), ELITE);
    let won = false;
    for (let turn = 1; turn <= 12; turn++) {
      units = runBotMovementTurn(
        bot,
        grid,
        objectives,
        units,
        GameSide.Player,
        turn,
        true,
      );
      objectives = advanceControl(objectives, units, turn);
      const outcome = evaluateObjectiveOutcome(
        { ...sessionWith(objectives, units, turn).currentState },
        0,
      );
      if (outcome?.winningSide === GameSide.Player) {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);
  });

  it('a Veteran bot fails to capture — it never seeks the objective', () => {
    const grid = makeGrid(12);
    let objectives: Record<string, IObjectiveMarker> = {
      '0,0': {
        id: 'objective-1',
        hexKey: '0,0',
        objectiveType: 'capture',
        owningSide: 'neutral',
        controlSide: 'neutral',
        controlRule: 'sole-occupancy',
        holdTurnsRequired: 3,
        holdProgress: 0,
      },
    };
    // The Veteran bot starts AWAY from both the objective and the enemy so
    // its pure-attrition movement (close on the enemy) does not coincide
    // with walking onto the objective hex.
    let units: IUnitGameState[] = [
      unitState('player-1', GameSide.Player, { q: 8, r: 0 }),
      unitState('opponent-1', GameSide.Opponent, { q: 11, r: 0 }),
    ];

    const bot = new BotPlayer(new SeededRandom(7), VETERAN);
    let won = false;
    for (let turn = 1; turn <= 12; turn++) {
      // `objectiveAware: false` — a Veteran caller never threads the
      // objective input, mirroring the tier's disabled awareness flag.
      units = runBotMovementTurn(
        bot,
        grid,
        objectives,
        units,
        GameSide.Player,
        turn,
        false,
      );
      objectives = advanceControl(objectives, units, turn);
      const outcome = evaluateObjectiveOutcome(
        { ...sessionWith(objectives, units, turn).currentState },
        0,
      );
      if (outcome?.winningSide === GameSide.Player) won = true;
    }
    // The Veteran chases the enemy and never holds the capture hex.
    expect(won).toBe(false);
  });
});

// =============================================================================
// Task 6.2 — Defend scenario
// =============================================================================

describe('A3b integration — Defend scenario', () => {
  it('an Elite bot wins a Defend scenario by holding its marker to the turn limit', () => {
    const grid = makeGrid(12);
    const turnLimit = 6;
    // The defender (Opponent) already owns the marker and starts ON it.
    let objectives: Record<string, IObjectiveMarker> = {
      '0,0': {
        id: 'objective-1',
        hexKey: '0,0',
        objectiveType: 'defend',
        owningSide: 'opponent',
        controlSide: 'opponent',
        controlRule: 'sole-occupancy',
        holdTurnsRequired: 1,
        holdProgress: 1,
      },
    };
    let units: IUnitGameState[] = [
      unitState('opponent-1', GameSide.Opponent, { q: 0, r: 0 }),
      // The attacker is parked far away and never advances (no bot drives it).
      unitState('player-1', GameSide.Player, { q: 0, r: 11 }),
    ];

    const bot = new BotPlayer(new SeededRandom(3), ELITE);
    let defenderWon = false;
    for (let turn = 1; turn <= turnLimit; turn++) {
      units = runBotMovementTurn(
        bot,
        grid,
        objectives,
        units,
        GameSide.Opponent,
        turn,
        true,
      );
      objectives = advanceControl(objectives, units, turn);
      const outcome = evaluateObjectiveOutcome(
        sessionWith(objectives, units, turn).currentState,
        turnLimit,
      );
      if (outcome?.winningSide === GameSide.Opponent) {
        defenderWon = true;
        break;
      }
    }
    expect(defenderWon).toBe(true);
    // The hold unit must still be standing on its marker.
    const holder = units.find((u) => u.id === 'opponent-1');
    expect(holder && coordToKey(holder.position)).toBe('0,0');
  });
});

// =============================================================================
// Task 6.3 — Breakthrough scenario
// =============================================================================

describe('A3b integration — Breakthrough scenario', () => {
  it('an Elite bot wins a Breakthrough scenario by reaching the exit edge', () => {
    const grid = makeGrid(12);
    // The exit hex sits at -10,0; the attacker (Player) starts at +6,0 and
    // must walk the exit edge. `holdTurnsRequired` carries the required-units
    // count for breakthrough markers (1 here).
    let objectives: Record<string, IObjectiveMarker> = {
      '-10,0': {
        id: 'objective-1',
        hexKey: '-10,0',
        objectiveType: 'breakthrough',
        owningSide: 'neutral',
        controlSide: 'neutral',
        controlRule: 'sole-occupancy',
        holdTurnsRequired: 1,
        holdProgress: 0,
      },
    };
    let units: IUnitGameState[] = [
      unitState('player-1', GameSide.Player, { q: 6, r: 0 }),
      unitState('opponent-1', GameSide.Opponent, { q: -6, r: 6 }),
    ];

    const bot = new BotPlayer(new SeededRandom(5), ELITE);
    let won = false;
    for (let turn = 1; turn <= 20; turn++) {
      units = runBotMovementTurn(
        bot,
        grid,
        objectives,
        units,
        GameSide.Player,
        turn,
        true,
      );
      const outcome = evaluateObjectiveOutcome(
        sessionWith(objectives, units, turn).currentState,
        0,
      );
      if (outcome?.winningSide === GameSide.Player) {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);
    const runner = units.find((u) => u.id === 'player-1');
    // The runner ends on the exit hex.
    expect(runner && hexDistance(runner.position, { q: -10, r: 0 })).toBe(0);
  });
});
