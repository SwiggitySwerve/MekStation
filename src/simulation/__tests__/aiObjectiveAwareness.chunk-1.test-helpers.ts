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
// Requirement: Objective-Awareness Tier Parameters
// =============================================================================

describe('Objective-Awareness Tier Parameters', () => {
  // Scenario: Every tier resolves an objective block
  it('every tier returns a populated objective block', () => {
    for (const name of ['Green', 'Regular', 'Veteran', 'Elite'] as const) {
      const params = getTierParameters(name);
      const objective = resolveObjectiveParameters(params);
      expect(objective).toBeDefined();
      expect(typeof objective.objectiveAwareness).toBe('boolean');
      expect(typeof objective.objectiveSeekingWeight).toBe('number');
      expect(typeof objective.objectiveHoldWeight).toBe('number');
    }
  });

  it('Green / Regular / Veteran leave objective awareness inert', () => {
    for (const name of ['Green', 'Regular', 'Veteran'] as const) {
      const objective = resolveObjectiveParameters(getTierParameters(name));
      expect(objective.objectiveAwareness).toBe(false);
      expect(objective.objectiveSeekingWeight).toBe(0);
      expect(objective.objectiveHoldWeight).toBe(0);
    }
  });

  it('Elite populates the objective block with active values', () => {
    const objective = resolveObjectiveParameters(AI_TIER_REGISTRY.Elite);
    expect(objective.objectiveAwareness).toBe(true);
    expect(objective.objectiveSeekingWeight).toBeGreaterThan(0);
    expect(objective.objectiveHoldWeight).toBeGreaterThan(0);
  });

  it('the inert objective block is fully disabled', () => {
    expect(INERT_OBJECTIVE_PARAMETERS.objectiveAwareness).toBe(false);
    expect(INERT_OBJECTIVE_PARAMETERS.objectiveSeekingWeight).toBe(0);
    expect(INERT_OBJECTIVE_PARAMETERS.objectiveHoldWeight).toBe(0);
  });

  it('a tier record without an objective block resolves to inert', () => {
    const noBlock = {
      tier: 'Veteran' as const,
      movement: AI_TIER_REGISTRY.Veteran.movement,
    };
    expect(resolveObjectiveParameters(noBlock)).toBe(
      INERT_OBJECTIVE_PARAMETERS,
    );
  });
});

// Scenario: Lower tiers ignore the objective map — `planTurn` is never given
// an objective input by an objective-blind tier, so the plan carries no
// objective layer and the bot plays pure attrition.
describe('Objective-Awareness Tier Parameters — lower tiers play Destroy', () => {
  it('a Veteran lance plan carries no objective layer even with markers present', () => {
    // A Veteran caller never threads the objective input (its tier disables
    // awareness), so `planTurn` produces a plain A3a plan.
    const friendly = [unit({ unitId: 'f1' })];
    const enemies = [unit({ unitId: 'e1', position: { q: 5, r: 0 } })];
    const plan = planTurn(friendly, enemies);
    expect(plan.objectivePlan).toBeUndefined();
  });
});

// =============================================================================
// Requirement: Objective Ingestion and Classification
// =============================================================================

describe('classifyObjectives — objective ingestion', () => {
  // Scenario: Attacker capture marker classifies as take
  it('classifies a capture marker as take for the attacking side', () => {
    const s = session({ '0,0': marker({ objectiveType: 'capture' }) });
    const classified = classifyObjectives(s, GameSide.Player);
    expect(classified).toHaveLength(1);
    expect(classified[0].intent).toBe('take');
  });

  it('classifies a capture marker as deny for the defending side', () => {
    const s = session({ '0,0': marker({ objectiveType: 'capture' }) });
    const classified = classifyObjectives(s, GameSide.Opponent);
    expect(classified[0].intent).toBe('deny');
  });

  // Scenario: Defender objective marker classifies as hold
  it('classifies a defend marker as hold for the defending side', () => {
    const s = session({ '0,0': marker({ objectiveType: 'defend' }) });
    const classified = classifyObjectives(s, GameSide.Opponent);
    expect(classified[0].intent).toBe('hold');
  });

  it('classifies a defend marker as take for the attacking side', () => {
    const s = session({ '0,0': marker({ objectiveType: 'defend' }) });
    const classified = classifyObjectives(s, GameSide.Player);
    expect(classified[0].intent).toBe('take');
  });

  it('classifies a breakthrough exit hex as take for the attacker', () => {
    const s = session({ '0,0': marker({ objectiveType: 'breakthrough' }) });
    expect(classifyObjectives(s, GameSide.Player)[0].intent).toBe('take');
    expect(classifyObjectives(s, GameSide.Opponent)[0].intent).toBe('deny');
  });

  // Scenario: Destroy scenario yields no objectives
  it('an empty objective map yields no classified objectives', () => {
    expect(classifyObjectives(session({}), GameSide.Player)).toEqual([]);
  });

  it('an absent objective map yields no classified objectives', () => {
    expect(classifyObjectives(session(), GameSide.Player)).toEqual([]);
  });

  it('classification never mutates a marker', () => {
    const m = marker({ objectiveType: 'capture' });
    const frozen = Object.freeze({ ...m });
    const s = session({ '0,0': frozen });
    const classified = classifyObjectives(s, GameSide.Player);
    expect(classified[0].marker).toEqual(frozen);
  });

  it('is deterministic — multiple markers come back in canonical hex order', () => {
    const s = session({
      '3,0': marker({ id: 'o-b', hexKey: '3,0' }),
      '1,0': marker({ id: 'o-a', hexKey: '1,0' }),
    });
    const a = classifyObjectives(s, GameSide.Player);
    const b = classifyObjectives(s, GameSide.Player);
    expect(a.map((c) => c.marker.hexKey)).toEqual(['1,0', '3,0']);
    expect(a).toEqual(b);
  });
});

// =============================================================================
// Requirement: Objective-Aware Lance Planning
// =============================================================================

describe('assignObjectiveRoles — objective layer on the lance plan', () => {
  // Scenario: Capture role goes to the nearest unit
  it('assigns the capture role to the unit closest to a take marker', () => {
    const near = unit({ unitId: 'near', position: { q: 1, r: 0 } });
    const far = unit({ unitId: 'far', position: { q: 8, r: 0 } });
    const classified = classifyObjectives(
      session({ '0,0': marker({ objectiveType: 'capture' }) }),
      GameSide.Player,
    );
    const { roles, targetHexes } = assignObjectiveRoles(
      [near, far],
      classified,
      hexCost,
    );
    expect(roles.get('near')).toBe('capture');
    expect(roles.get('far')).toBe('screen');
    expect(targetHexes.get('near')).toEqual({ q: 0, r: 0 });
  });

  // Scenario: Hold role goes to the unit on the marker
  it('assigns the hold role to the unit standing on a hold marker', () => {
    const onMarker = unit({ unitId: 'holder', position: { q: 0, r: 0 } });
    const elsewhere = unit({ unitId: 'other', position: { q: 4, r: 0 } });
    const classified = classifyObjectives(
      session({ '0,0': marker({ objectiveType: 'defend' }) }),
      GameSide.Opponent,
    );
    const { roles, targetHexes } = assignObjectiveRoles(
      [onMarker, elsewhere],
      classified,
      hexCost,
    );
    expect(roles.get('holder')).toBe('hold');
    expect(targetHexes.get('holder')).toEqual({ q: 0, r: 0 });
  });

  // Scenario: Remaining units screen
  it('every non-objective unit receives the screen role with no objective hex', () => {
    const seeker = unit({ unitId: 'a-seeker', position: { q: 1, r: 0 } });
    const screen1 = unit({ unitId: 'b-screen', position: { q: 6, r: 0 } });
    const screen2 = unit({ unitId: 'c-screen', position: { q: 7, r: 0 } });
    const classified = classifyObjectives(
      session({ '0,0': marker({ objectiveType: 'capture' }) }),
      GameSide.Player,
    );
    const { roles, targetHexes } = assignObjectiveRoles(
      [seeker, screen1, screen2],
      classified,
      hexCost,
    );
    expect(roles.get('a-seeker')).toBe('capture');
    expect(roles.get('b-screen')).toBe('screen');
    expect(roles.get('c-screen')).toBe('screen');
    expect(targetHexes.has('b-screen')).toBe(false);
    expect(targetHexes.has('c-screen')).toBe(false);
  });

  it('a Destroy scenario assigns every unit the screen role', () => {
    const units = [unit({ unitId: 'f1' }), unit({ unitId: 'f2' })];
    const { roles, targetHexes } = assignObjectiveRoles(units, [], hexCost);
    expect(roles.get('f1')).toBe('screen');
    expect(roles.get('f2')).toBe('screen');
    expect(targetHexes.size).toBe(0);
  });

  it('a unit never receives two objective roles', () => {
    const u1 = unit({ unitId: 'u1', position: { q: 1, r: 0 } });
    const u2 = unit({ unitId: 'u2', position: { q: 2, r: 0 } });
    const classified = classifyObjectives(
      session({
        '0,0': marker({ id: 'o1', hexKey: '0,0', objectiveType: 'capture' }),
        '5,0': marker({ id: 'o2', hexKey: '5,0', objectiveType: 'capture' }),
      }),
      GameSide.Player,
    );
    const { roles } = assignObjectiveRoles([u1, u2], classified, hexCost);
    // Two markers, two units — each unit takes exactly one capture role.
    expect(roles.get('u1')).toBe('capture');
    expect(roles.get('u2')).toBe('capture');
  });

  it('role assignment is deterministic across repeated runs', () => {
    const friendly = [
      unit({ unitId: 'f1', position: { q: 3, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 3, r: 0 } }),
    ];
    const classified = classifyObjectives(
      session({ '0,0': marker({ objectiveType: 'capture' }) }),
      GameSide.Player,
    );
    const a = assignObjectiveRoles(friendly, classified, hexCost);
    const b = assignObjectiveRoles(friendly, classified, hexCost);
    expect(Array.from(a.roles.entries())).toEqual(
      Array.from(b.roles.entries()),
    );
    // Equal-cost tie broken by canonical unit id — `f1` wins the capture.
    expect(a.roles.get('f1')).toBe('capture');
    expect(a.roles.get('f2')).toBe('screen');
  });

  it('planObjectives reports the scenario type and omits the layer for Destroy', () => {
    const captured = planObjectives(
      session({ '0,0': marker({ objectiveType: 'capture' }) }),
      GameSide.Player,
      [unit({ unitId: 'f1' })],
      hexCost,
    );
    expect(captured.scenarioType).toBe('capture');

    const destroy = planObjectives(
      session({}),
      GameSide.Player,
      [unit({ unitId: 'f1' })],
      hexCost,
    );
    expect(destroy.scenarioType).toBe('destroy');
    expect(destroy.roles.get('f1')).toBe('screen');
  });

  it('planTurn attaches the objective layer only for a non-Destroy scenario', () => {
    const friendly = [unit({ unitId: 'f1', position: { q: 2, r: 0 } })];
    const enemies = [unit({ unitId: 'e1', position: { q: 8, r: 0 } })];

    const capturePlan = planTurn(friendly, enemies, {
      session: session({ '0,0': marker({ objectiveType: 'capture' }) }),
      botSide: GameSide.Player,
      costFn: hexCost,
    });
    expect(capturePlan.objectivePlan).toBeDefined();
    expect(capturePlan.objectivePlan?.scenarioType).toBe('capture');

    const destroyPlan = planTurn(friendly, enemies, {
      session: session({}),
      botSide: GameSide.Player,
      costFn: hexCost,
    });
    expect(destroyPlan.objectivePlan).toBeUndefined();
  });
});
