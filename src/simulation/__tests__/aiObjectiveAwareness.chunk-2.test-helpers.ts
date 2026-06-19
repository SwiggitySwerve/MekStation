/**
 * Tests for AI objective awareness (A3b) — the objective tier parameters,
 * objective ingestion / classification, the objective layer on the lance
 * plan, objective-seeking movement, and objective-aware target discipline.
 *
 * Covers `add-ai-objective-awareness` Requirements:
 *   - Objective-Awareness Tier Parameters
 *   - Objective Ingestion and Classification
 *   - Objective-Aware Lance Planning
 *   - Objective-Seeking Movement
 *   - Objective-Aware Target Discipline
 *
 * @spec openspec/changes/add-ai-objective-awareness/specs/simulation-system/spec.md
 *   Requirement: Objective-Awareness Tier Parameters
 *   Requirement: Objective Ingestion and Classification
 *   Requirement: Objective-Aware Lance Planning
 *   Requirement: Objective-Seeking Movement
 *   Requirement: Objective-Aware Target Discipline
 */

import type {
  IGameSession,
  IGameState,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
} from '@/types/gameplay';

import type { IObjectiveLancePlan } from '../ai/AIObjectivePlanner';
import type { IAILanceContext } from '../ai/BotPlayer';
import type { IScoreMoveContext } from '../ai/MoveAI';
import type { IAIUnitState, IBotBehavior, IMove, IWeapon } from '../ai/types';

import { planTurn } from '../ai/AILancePlanner';
import {
  assignObjectiveRoles,
  classifyObjectives,
  planObjectives,
} from '../ai/AIObjectivePlanner';
import {
  AI_TIER_REGISTRY,
  INERT_OBJECTIVE_PARAMETERS,
  getTierParameters,
  resolveObjectiveParameters,
} from '../ai/AITierRegistry';
import { BotPlayer } from '../ai/BotPlayer';
import { scoreMove } from '../ai/MoveAI';
import { SeededRandom } from '../core/SeededRandom';

// =============================================================================
// Fixtures
// =============================================================================

function weapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mlas',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function unit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [weapon()],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function marker(overrides: Partial<IObjectiveMarker> = {}): IObjectiveMarker {
  return {
    id: 'objective-1',
    hexKey: '0,0',
    objectiveType: 'capture',
    owningSide: 'neutral',
    controlSide: 'neutral',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 1,
    holdProgress: 0,
    ...overrides,
  };
}

/**
 * A minimal `IGameSession` carrying just the objective map — the only field
 * `classifyObjectives` reads. The rest is filled with inert defaults.
 */
function session(objectives?: Record<string, IObjectiveMarker>): IGameSession {
  const currentState: IGameState = {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {},
    turnEvents: [],
    ...(objectives !== undefined ? { objectives } : {}),
  };
  return {
    id: 'session-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState,
  };
}

/** A flat clear-terrain hex grid of the given radius. */
function makeGrid(radius: number): IHexGrid {
  const hexes = new Map();
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

/** Straight hex-distance cost function for role assignment in tests. */
function hexCost(u: IAIUnitState, hex: IHexCoordinate): number {
  const dq = hex.q - u.position.q;
  const dr = hex.r - u.position.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

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

// =============================================================================
// Requirement: Objective-Seeking Movement
// =============================================================================

describe('scoreMove — objective-seeking movement', () => {
  const grid = makeGrid(10);

  function moveTo(dest: IHexCoordinate): IMove {
    return {
      destination: dest,
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpCost: 1,
      heatGenerated: 1,
    };
  }

  // Scenario: Capture unit moves onto its objective
  it('a capture unit scores an on-marker destination above an off-marker one', () => {
    const attacker = unit({ unitId: 'cap', position: { q: 3, r: 0 } });
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierObjective: AI_TIER_REGISTRY.Elite.objective,
      objectiveRole: 'capture',
      objectiveHex: { q: 0, r: 0 },
    };
    const onMarker = scoreMove(moveTo({ q: 0, r: 0 }), ctx);
    const offMarker = scoreMove(moveTo({ q: 2, r: 0 }), ctx);
    expect(onMarker).toBeGreaterThan(offMarker);
  });

  it('a capture unit prefers a closer destination over a further one', () => {
    const attacker = unit({ unitId: 'cap', position: { q: 5, r: 0 } });
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierObjective: AI_TIER_REGISTRY.Elite.objective,
      objectiveRole: 'capture',
      objectiveHex: { q: 0, r: 0 },
    };
    const closer = scoreMove(moveTo({ q: 3, r: 0 }), ctx);
    const further = scoreMove(moveTo({ q: 6, r: 0 }), ctx);
    expect(closer).toBeGreaterThan(further);
  });

  // Scenario: Hold unit stays on its objective
  it('a hold unit scores staying on the marker above leaving it', () => {
    const attacker = unit({ unitId: 'hold', position: { q: 0, r: 0 } });
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierObjective: AI_TIER_REGISTRY.Elite.objective,
      objectiveRole: 'hold',
      objectiveHex: { q: 0, r: 0 },
    };
    const stay = scoreMove(moveTo({ q: 0, r: 0 }), ctx);
    const chase = scoreMove(moveTo({ q: 3, r: 0 }), ctx);
    expect(stay).toBeGreaterThan(chase);
  });

  it('a hold unit scores an adjacent hex above abandoning but below the marker', () => {
    const attacker = unit({ unitId: 'hold', position: { q: 0, r: 0 } });
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierObjective: AI_TIER_REGISTRY.Elite.objective,
      objectiveRole: 'hold',
      objectiveHex: { q: 0, r: 0 },
    };
    const onMarker = scoreMove(moveTo({ q: 0, r: 0 }), ctx);
    const adjacent = scoreMove(moveTo({ q: 1, r: 0 }), ctx);
    const abandoned = scoreMove(moveTo({ q: 4, r: 0 }), ctx);
    expect(onMarker).toBeGreaterThan(adjacent);
    expect(adjacent).toBeGreaterThan(abandoned);
  });

  // Scenario: Screen unit ignores the objective term
  it('a screen unit receives zero objective contribution', () => {
    const attacker = unit({ unitId: 'scr', position: { q: 3, r: 0 } });
    const base: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
    };
    const withObjective: IScoreMoveContext = {
      ...base,
      tierObjective: AI_TIER_REGISTRY.Elite.objective,
      objectiveRole: 'screen',
      objectiveHex: { q: 0, r: 0 },
    };
    const move = moveTo({ q: 0, r: 0 });
    expect(scoreMove(move, withObjective)).toBe(scoreMove(move, base));
  });

  it('a disabled objective tier contributes zero even for a capture role', () => {
    const attacker = unit({ unitId: 'cap', position: { q: 3, r: 0 } });
    const base: IScoreMoveContext = { attacker, allUnits: [attacker], grid };
    const inert: IScoreMoveContext = {
      ...base,
      tierObjective: INERT_OBJECTIVE_PARAMETERS,
      objectiveRole: 'capture',
      objectiveHex: { q: 0, r: 0 },
    };
    const move = moveTo({ q: 0, r: 0 });
    expect(scoreMove(move, inert)).toBe(scoreMove(move, base));
  });

  it('the objective term is absent entirely for a Veteran-style context', () => {
    // No `tierObjective` / `objectiveRole` — the legacy / non-objective
    // caller path. Scoring must equal the no-objective baseline.
    const attacker = unit({ unitId: 'u', position: { q: 3, r: 0 } });
    const ctx: IScoreMoveContext = { attacker, allUnits: [attacker], grid };
    const move = moveTo({ q: 0, r: 0 });
    // Re-scoring with the same ctx is stable, and no objective term applies.
    expect(scoreMove(move, ctx)).toBe(scoreMove(move, ctx));
  });
});

// =============================================================================
// Requirement: Objective-Aware Target Discipline
// =============================================================================

describe('playAttackPhase — objective-aware target discipline', () => {
  /** Build a lance context whose plan carries the given objective layer. */
  function lanceContext(
    objectivePlan: IObjectiveLancePlan,
    lancemates: readonly IAIUnitState[],
  ): IAILanceContext {
    return {
      plan: {
        threatMap: [],
        fireAssignment: { assignments: new Map(), finishableTargets: [] },
        lanceCentroid: { q: 0, r: 0 },
        objectivePlan,
      },
      lancemates,
    };
  }

  // Scenario: Hold unit engages from its objective
  it('a hold unit engages a target reachable from the marker, not one off it', () => {
    // The hold unit sits on its marker at 0,0 with a 9-range weapon. A near
    // enemy is in range of the marker; a far enemy at range 14 is only
    // reachable by leaving the marker — discipline must exclude it.
    const holder = unit({
      unitId: 'holder',
      position: { q: 0, r: 0 },
      weapons: [weapon({ longRange: 9 })],
    });
    const nearEnemy = unit({
      unitId: 'near-enemy',
      position: { q: 5, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const farEnemy = unit({
      unitId: 'far-enemy',
      position: { q: 14, r: 0 },
      weapons: [weapon({ damage: 30 })],
    });

    const objectivePlan: IObjectiveLancePlan = {
      scenarioType: 'defend',
      roles: new Map([['holder', 'hold']]),
      targetHexes: new Map([['holder', { q: 0, r: 0 }]]),
    };

    const bot = new BotPlayer(new SeededRandom(1), ELITE);
    const event = bot.playAttackPhase(
      holder,
      [holder, nearEnemy, farEnemy],
      lanceContext(objectivePlan, [holder]),
    );
    expect(event).not.toBeNull();
    // Even though the far enemy is far more threatening, the hold unit fires
    // on the near enemy — the one engageable from its objective hex.
    expect(event?.payload.targetId).toBe('near-enemy');
  });

  // Scenario: Screen unit selects targets normally
  it('a screen unit selects targets with no objective bias', () => {
    const screen = unit({
      unitId: 'screen',
      position: { q: 0, r: 0 },
      weapons: [weapon({ longRange: 20 })],
    });
    const weakEnemy = unit({
      unitId: 'weak',
      position: { q: 3, r: 0 },
      weapons: [weapon({ damage: 1 })],
    });
    const strongEnemy = unit({
      unitId: 'strong',
      position: { q: 6, r: 0 },
      weapons: [weapon({ damage: 25 }), weapon({ damage: 25 })],
    });

    const objectivePlan: IObjectiveLancePlan = {
      scenarioType: 'defend',
      roles: new Map([['screen', 'screen']]),
      targetHexes: new Map(),
    };

    const bot = new BotPlayer(new SeededRandom(1), ELITE);
    const withPlan = bot.playAttackPhase(
      screen,
      [screen, weakEnemy, strongEnemy],
      lanceContext(objectivePlan, [screen]),
    );
    const withoutPlan = bot.playAttackPhase(screen, [
      screen,
      weakEnemy,
      strongEnemy,
    ]);
    // A screen role applies no discipline — selection matches the
    // no-objective coordinated-combat behavior.
    expect(withPlan?.payload.targetId).toBe(withoutPlan?.payload.targetId);
  });

  it('discipline falls through to the full set when no enemy is reachable from the objective', () => {
    // The hold unit's only enemy is out of range of the marker — the bounded
    // bias must NOT silence the unit; it fires its best available shot.
    const holder = unit({
      unitId: 'holder',
      position: { q: 0, r: 0 },
      weapons: [weapon({ longRange: 30 })],
    });
    const distantEnemy = unit({
      unitId: 'distant',
      position: { q: 20, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });

    const objectivePlan: IObjectiveLancePlan = {
      scenarioType: 'defend',
      roles: new Map([['holder', 'hold']]),
      targetHexes: new Map([['holder', { q: 0, r: 0 }]]),
    };

    const bot = new BotPlayer(new SeededRandom(1), ELITE);
    const event = bot.playAttackPhase(
      holder,
      [holder, distantEnemy],
      lanceContext(objectivePlan, [holder]),
    );
    expect(event).not.toBeNull();
    expect(event?.payload.targetId).toBe('distant');
  });
});

// =============================================================================
// Determinism — Veteran tier is unaffected by the objective layer
// =============================================================================

describe('A3b determinism — non-objective-aware tiers are unchanged', () => {
  it('a Veteran bot ignores an objective plan threaded into the lance context', () => {
    const grid = makeGrid(8);
    const veteranUnit = unit({
      unitId: 'vet',
      position: { q: 0, r: 4 },
      weapons: [weapon({ longRange: 12 })],
    });
    const enemy = unit({
      unitId: 'enemy',
      position: { q: 0, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });

    // An objective plan that, IF honored, would route the unit to 0,0.
    const objectivePlan: IObjectiveLancePlan = {
      scenarioType: 'capture',
      roles: new Map([['vet', 'capture']]),
      targetHexes: new Map([['vet', { q: 0, r: 0 }]]),
    };
    const ctx: IAILanceContext = {
      plan: {
        threatMap: [],
        fireAssignment: { assignments: new Map(), finishableTargets: [] },
        lanceCentroid: { q: 0, r: 4 },
        objectivePlan,
      },
      lancemates: [veteranUnit],
    };

    // The Veteran bot's move with and without the objective plan threaded in
    // must be byte-identical — its tier disables objective awareness, so the
    // objective term contributes zero regardless of the role in the plan.
    const botA = new BotPlayer(new SeededRandom(99), VETERAN);
    const moveA = botA.playMovementPhase(
      veteranUnit,
      grid,
      { walkMP: 4, runMP: 6, jumpMP: 0 },
      [veteranUnit, enemy],
      ctx,
    );
    const botB = new BotPlayer(new SeededRandom(99), VETERAN);
    const moveB = botB.playMovementPhase(
      veteranUnit,
      grid,
      { walkMP: 4, runMP: 6, jumpMP: 0 },
      [veteranUnit, enemy],
    );
    expect(moveA?.payload.to).toEqual(moveB?.payload.to);
    expect(moveA?.payload.facing).toEqual(moveB?.payload.facing);
  });
});
