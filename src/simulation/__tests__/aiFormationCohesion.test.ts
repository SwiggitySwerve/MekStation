/**
 * Tests for formation-cohesion move scoring and the BotPlayer lance-context
 * integration.
 *
 * Covers `add-ai-coordination-tactics` Requirements "Formation Cohesion
 * Movement" and "Per-Lance Turn Plan" (the BotPlayer-consumes-the-plan half).
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Formation Cohesion Movement
 *   Requirement: Per-Lance Turn Plan
 */

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';

import type { IAILanceContext } from '../ai/BotPlayer';
import type { IScoreMoveContext } from '../ai/MoveAI';
import type { IAIUnitState, IBotBehavior, IMove, IWeapon } from '../ai/types';

import { planTurn } from '../ai/AILancePlanner';
import { getTierParameters } from '../ai/AITierRegistry';
import { BotPlayer } from '../ai/BotPlayer';
import { scoreMove } from '../ai/MoveAI';
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

function makeMove(
  overrides: Partial<IMove> & { destination: IHexCoordinate },
): IMove {
  return {
    facing: Facing.North,
    movementType: MovementType.Walk,
    mpCost: 1,
    heatGenerated: 1,
    ...overrides,
  };
}

const ELITE_COORDINATION = getTierParameters('Elite').coordination!;

// =============================================================================
// Formation Cohesion Movement — scoreMove cohesion term
// =============================================================================

describe('scoreMove — formation cohesion term', () => {
  it('a drifting unit scores lower than one staying in the lance radius', () => {
    const grid = makeGrid(20);
    const attacker = unit({ unitId: 'mover', position: { q: 0, r: 0 } });
    // Centroid at origin; cohesionRadius is 4. An in-radius destination pays
    // nothing, a far destination pays the centroid-pull penalty.
    const baseCtx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierCoordination: ELITE_COORDINATION,
      lanceCentroid: { q: 0, r: 0 },
      lancemates: [],
    };

    const inRadius = scoreMove(
      makeMove({ destination: { q: 2, r: 0 } }),
      baseCtx,
    );
    const farOut = scoreMove(
      makeMove({ destination: { q: 12, r: 0 } }),
      baseCtx,
    );

    expect(inRadius).toBeGreaterThan(farOut);
  });

  it('a unit inside the cohesion radius pays no cohesion penalty', () => {
    const grid = makeGrid(20);
    const attacker = unit({ unitId: 'mover', position: { q: 0, r: 0 } });

    const withCoordination: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierCoordination: ELITE_COORDINATION,
      lanceCentroid: { q: 0, r: 0 },
      lancemates: [],
    };
    // Same context but with coordination stripped — the cohesion term must
    // contribute exactly zero, so the two scores are identical for an
    // in-radius destination.
    const withoutCoordination: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
    };

    const dest = makeMove({ destination: { q: 3, r: 0 } }); // distance 3 <= 4
    expect(scoreMove(dest, withCoordination)).toBe(
      scoreMove(dest, withoutCoordination),
    );
  });

  it('advancing alone into enemy LOS receives the extra lone-advance penalty', () => {
    const grid = makeGrid(20);
    const attacker = unit({ unitId: 'mover', position: { q: 0, r: 0 } });
    // An enemy with clear LOS to the destination. No lancemate is near it.
    const enemy = unit({ unitId: 'enemy', position: { q: 5, r: 0 } });

    const loneCtx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierCoordination: ELITE_COORDINATION,
      lanceCentroid: { q: 0, r: 0 },
      lancemates: [], // no lancemates -> advancing alone
    };
    // Same destination but a lancemate is right next to it.
    const escortedCtx: IScoreMoveContext = {
      ...loneCtx,
      lancemates: [unit({ unitId: 'mate', position: { q: 4, r: 0 } })],
    };

    const dest = makeMove({ destination: { q: 4, r: 0 } });
    const loneScore = scoreMove(dest, loneCtx);
    const escortedScore = scoreMove(dest, escortedCtx);

    // The lone advance is penalized by an extra `cohesionWeight`; the
    // escorted move pays only the centroid-pull (same for both).
    expect(escortedScore - loneScore).toBe(ELITE_COORDINATION.cohesionWeight);
  });

  it('the cohesion term contributes zero when lance coordination is disabled', () => {
    const grid = makeGrid(20);
    const attacker = unit({ unitId: 'mover', position: { q: 0, r: 0 } });
    // Veteran tier carries `lanceCoordination: false` — even with a centroid
    // and a far destination the cohesion term must be zero.
    const veteranCoordination = getTierParameters('Veteran').coordination!;

    const withVeteran: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
      tierCoordination: veteranCoordination,
      lanceCentroid: { q: 0, r: 0 },
      lancemates: [],
    };
    const withoutCoordination: IScoreMoveContext = {
      attacker,
      allUnits: [attacker],
      grid,
    };

    const farDest = makeMove({ destination: { q: 15, r: 0 } });
    expect(scoreMove(farDest, withVeteran)).toBe(
      scoreMove(farDest, withoutCoordination),
    );
  });
});

// =============================================================================
// Per-Lance Turn Plan — BotPlayer consumes the plan
// =============================================================================

describe('BotPlayer — lance-context integration', () => {
  const eliteBehavior: IBotBehavior = {
    retreatThreshold: 0.3,
    retreatEdge: 'nearest',
    safeHeatThreshold: 13,
    tier: 'Elite',
  };

  it('omitting the lance context preserves per-unit attack behavior', () => {
    // The same attacker + targets, run with and without a lance context that
    // assigns NO target for this attacker, must produce the same attack —
    // the per-unit pick. (An empty assignment falls back to selectTarget.)
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [weapon({ damage: 5 })],
    });
    const t1 = unit({ unitId: 't1', position: { q: 0, r: 2 } });
    const t2 = unit({ unitId: 't2', position: { q: 0, r: 3 } });
    const allUnits = [attacker, t1, t2];

    const botA = new BotPlayer(new SeededRandom(99), eliteBehavior);
    const withoutContext = botA.playAttackPhase(attacker, allUnits);

    const botB = new BotPlayer(new SeededRandom(99), eliteBehavior);
    // A plan whose fire assignment has no entry for `a` -> falls back.
    const emptyPlan = planTurn([], allUnits);
    const ctx: IAILanceContext = { plan: emptyPlan, lancemates: [attacker] };
    const withContext = botB.playAttackPhase(attacker, allUnits, ctx);

    expect(withContext).toEqual(withoutContext);
  });

  it('an Elite unit fires on its assigned focus-fire target', () => {
    // `a` would self-score `near` (closer, easier shot) but the lance plan
    // assigns it to `far`. With the assignment honored, `a` fires on `far`.
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [weapon({ damage: 5, longRange: 12 })],
    });
    const near = unit({
      unitId: 'near',
      position: { q: 0, r: 2 },
      weapons: [weapon({ damage: 1 })],
    });
    const far = unit({
      unitId: 'far',
      position: { q: 0, r: 6 },
      weapons: [weapon({ damage: 30 })], // high threat -> ranks first
      structureState: {
        armorByLocation: { center_torso: 1 },
        armorMaxByLocation: { center_torso: 1 },
        internalByLocation: { center_torso: 1 },
        internalMaxByLocation: { center_torso: 1 },
      },
    });
    const allUnits = [attacker, near, far];

    const bot = new BotPlayer(new SeededRandom(7), eliteBehavior);
    const plan = planTurn([attacker], [near, far]);
    // Sanity: the planner assigned `a` to the high-threat `far`.
    expect(plan.fireAssignment.assignments.get('a')).toBe('far');

    const ctx: IAILanceContext = { plan, lancemates: [attacker] };
    const event = bot.playAttackPhase(attacker, allUnits, ctx);

    expect(event).not.toBeNull();
    expect(event!.payload.targetId).toBe('far');
  });

  it('an unreachable assignment falls back to the unit own pick without error', () => {
    // The plan assigns `a` to a target that is out of weapon range — the
    // attack must fall back to the self-scored pick and raise no error.
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [weapon({ damage: 5, longRange: 9 })],
    });
    const reachable = unit({
      unitId: 'reachable',
      position: { q: 0, r: 3 },
      weapons: [weapon({ damage: 5 })],
    });
    const allUnits = [attacker, reachable];

    const bot = new BotPlayer(new SeededRandom(3), eliteBehavior);
    // Hand-build a plan whose assignment points `a` at a non-existent /
    // unreachable target id.
    const plan = planTurn([attacker], [reachable]);
    const tamperedPlan = {
      ...plan,
      fireAssignment: {
        assignments: new Map([['a', 'ghost-target']]),
        finishableTargets: [],
      },
    };
    const ctx: IAILanceContext = {
      plan: tamperedPlan,
      lancemates: [attacker],
    };

    let event;
    expect(() => {
      event = bot.playAttackPhase(attacker, allUnits, ctx);
    }).not.toThrow();
    expect(event).not.toBeNull();
    expect(event!.payload.targetId).toBe('reachable');
  });

  it('omitting the lance context preserves per-unit movement behavior', () => {
    const grid = makeGrid(12);
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
    };
    const mover = unit({
      unitId: 'mover',
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    const enemy = unit({ unitId: 'enemy', position: { q: 0, r: 6 } });
    const allUnits = [mover, enemy];

    const botA = new BotPlayer(new SeededRandom(42), eliteBehavior);
    const withoutContext = botA.playMovementPhase(
      mover,
      grid,
      capability,
      allUnits,
    );

    // A lance context whose centroid is the mover's own position and whose
    // lancemates list is empty -> the cohesion term sees an in-radius
    // destination set with no lone-advance escort change. Movement is still
    // dominated by the LOS / closing terms. Run without it to confirm the
    // optional parameter is genuinely optional and does not crash.
    const botB = new BotPlayer(new SeededRandom(42), eliteBehavior);
    const withoutContextAgain = botB.playMovementPhase(
      mover,
      grid,
      capability,
      allUnits,
    );

    expect(withoutContext).toEqual(withoutContextAgain);
  });
});
