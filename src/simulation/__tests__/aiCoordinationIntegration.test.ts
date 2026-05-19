/**
 * Integration tests for AI lance-coordination tactics.
 *
 * Covers `add-ai-coordination-tactics` tasks 6.1–6.3:
 *   - An `Elite` lance focus-fires and concentrates damage where a `Veteran`
 *     lance spreads it.
 *   - An `Elite` lance moves in formation where a `Veteran` lance lets a
 *     unit wander ahead.
 *   - `Veteran`-tier decisions are byte-identical with and without the
 *     coordination wiring present — the determinism contract (task 6.3).
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Focus-Fire Coordination
 *   Requirement: Formation Cohesion Movement
 *   Requirement: Per-Lance Turn Plan
 */

import type { IHex, IHexGrid, IMovementCapability } from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';

import type { IAILanceContext } from '../ai/BotPlayer';
import type { IAIUnitState, IBotBehavior, IWeapon } from '../ai/types';

import { planTurn } from '../ai/AILancePlanner';
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

function unit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.South,
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
// Task 6.1 — Elite focus-fires; Veteran spreads
// =============================================================================

describe('Elite lance focus-fires where a Veteran lance spreads damage', () => {
  /**
   * Two friendly units, two enemies. `weakEnemy` is a brittle high-threat
   * target both friendlies can finish together. `otherEnemy` is a tougher
   * lower-threat target. An Elite lance, driven by the shared lance plan,
   * concentrates BOTH units on `weakEnemy` to finish it. A Veteran lance
   * has no plan — each unit picks independently.
   */
  function buildScenario() {
    const f1 = unit({
      unitId: 'f1',
      position: { q: 0, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const f2 = unit({
      unitId: 'f2',
      position: { q: 1, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const weakEnemy = unit({
      unitId: 'weakEnemy',
      position: { q: 0, r: 4 },
      weapons: [weapon({ damage: 30 })], // highest aggregate threat
      structureState: {
        armorByLocation: { center_torso: 3 },
        armorMaxByLocation: { center_torso: 3 },
        internalByLocation: { center_torso: 2 },
        internalMaxByLocation: { center_torso: 2 },
      },
    });
    const otherEnemy = unit({
      unitId: 'otherEnemy',
      position: { q: 2, r: 4 },
      weapons: [weapon({ damage: 4 })], // lower threat
      structureState: {
        armorByLocation: { center_torso: 30 },
        armorMaxByLocation: { center_torso: 30 },
        internalByLocation: { center_torso: 20 },
        internalMaxByLocation: { center_torso: 20 },
      },
    });
    return { f1, f2, weakEnemy, otherEnemy };
  }

  it('an Elite lance assigns both units to the finishable target', () => {
    const { f1, f2, weakEnemy, otherEnemy } = buildScenario();
    const friendly = [f1, f2];
    const enemies = [weakEnemy, otherEnemy];
    const allUnits = [...friendly, ...enemies];

    const plan = planTurn(friendly, enemies);
    expect(plan.fireAssignment.finishableTargets).toContain('weakEnemy');

    const ctxFor = (u: IAIUnitState): IAILanceContext => ({
      plan,
      lancemates: friendly.filter((m) => m.unitId !== u.unitId),
    });

    const bot1 = new BotPlayer(new SeededRandom(11), ELITE);
    const bot2 = new BotPlayer(new SeededRandom(22), ELITE);
    const attack1 = bot1.playAttackPhase(f1, allUnits, ctxFor(f1));
    const attack2 = bot2.playAttackPhase(f2, allUnits, ctxFor(f2));

    // Both Elite units concentrate fire on the same finishable target.
    expect(attack1!.payload.targetId).toBe('weakEnemy');
    expect(attack2!.payload.targetId).toBe('weakEnemy');
    expect(attack1!.payload.targetId).toBe(attack2!.payload.targetId);
  });

  it('a Veteran lance does not coordinate — units pick independently', () => {
    // The Veteran tier never consults the lance plan even if a context is
    // passed (its `lanceCoordination` is false). Each unit runs its own
    // threat-scored pick. With `f1` closer to `weakEnemy` and `f2` closer to
    // `otherEnemy`, the per-unit picks need not agree.
    const { f1, f2, weakEnemy, otherEnemy } = buildScenario();
    // Pull f2 right next to `otherEnemy` so its self-scored pick differs.
    const f2Near = { ...f2, position: { q: 2, r: 3 } };
    const friendly = [f1, f2Near];
    const enemies = [weakEnemy, otherEnemy];
    const allUnits = [...friendly, ...enemies];

    const plan = planTurn(friendly, enemies);
    const ctxFor = (u: IAIUnitState): IAILanceContext => ({
      plan,
      lancemates: friendly.filter((m) => m.unitId !== u.unitId),
    });

    const bot1 = new BotPlayer(new SeededRandom(11), VETERAN);
    const bot2 = new BotPlayer(new SeededRandom(22), VETERAN);
    const attack1 = bot1.playAttackPhase(f1, allUnits, ctxFor(f1));
    const attack2 = bot2.playAttackPhase(f2Near, allUnits, ctxFor(f2Near));

    // A Veteran context is ignored — confirm both produce a valid attack but
    // are NOT forced onto a shared target by a plan.
    expect(attack1).not.toBeNull();
    expect(attack2).not.toBeNull();
    // The same units WITHOUT a context produce the identical Veteran picks —
    // proving the context had no effect on the Veteran tier.
    const v1 = new BotPlayer(new SeededRandom(11), VETERAN).playAttackPhase(
      f1,
      allUnits,
    );
    const v2 = new BotPlayer(new SeededRandom(22), VETERAN).playAttackPhase(
      f2Near,
      allUnits,
    );
    expect(attack1).toEqual(v1);
    expect(attack2).toEqual(v2);
  });
});

// =============================================================================
// Task 6.2 — Elite advances in formation; Veteran lets a unit wander
// =============================================================================

describe('Elite lance advances in formation; Veteran lets a unit wander ahead', () => {
  it('an Elite unit far from the lance is pulled back toward the centroid', () => {
    // The lance centroid sits at the rear; a lone unit choosing a move far
    // ahead of the centroid pays the cohesion penalty. With the lance
    // context the Elite unit picks a destination no further from the
    // centroid than the same unit's pick under a Veteran (no-cohesion) bot.
    const grid = makeGrid(20);
    const capability: IMovementCapability = { walkMP: 6, runMP: 9, jumpMP: 0 };

    // Lance: three units clustered at the rear, one mover that could sprint.
    const mate1 = unit({ unitId: 'mate1', position: { q: 0, r: 0 } });
    const mate2 = unit({ unitId: 'mate2', position: { q: 1, r: 0 } });
    const mate3 = unit({ unitId: 'mate3', position: { q: 0, r: 1 } });
    const mover = unit({ unitId: 'mover', position: { q: 1, r: 1 } });
    const enemy = unit({ unitId: 'enemy', position: { q: 0, r: 14 } });

    const friendly = [mate1, mate2, mate3, mover];
    const allUnits = [...friendly, enemy];
    const plan = planTurn(friendly, [enemy]);

    const ctx: IAILanceContext = {
      plan,
      lancemates: friendly.filter((m) => m.unitId !== 'mover'),
    };

    const eliteBot = new BotPlayer(new SeededRandom(5), ELITE);
    const eliteMove = eliteBot.playMovementPhase(
      mover,
      grid,
      capability,
      allUnits,
      ctx,
    );

    const veteranBot = new BotPlayer(new SeededRandom(5), VETERAN);
    const veteranMove = veteranBot.playMovementPhase(
      mover,
      grid,
      capability,
      allUnits,
      ctx,
    );

    expect(eliteMove).not.toBeNull();
    expect(veteranMove).not.toBeNull();

    // Distance of each chosen destination from the lance centroid. The Elite
    // bot's cohesion term keeps it tighter to the lance than the Veteran bot,
    // which has no cohesion term and chases the distant enemy freely.
    const dist = (a: { q: number; r: number }, b: { q: number; r: number }) => {
      const dq = a.q - b.q;
      const dr = a.r - b.r;
      const ds = -dq - dr;
      return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
    };
    const centroid = plan.lanceCentroid;
    const eliteDist = dist(eliteMove!.payload.to, centroid);
    const veteranDist = dist(veteranMove!.payload.to, centroid);

    expect(eliteDist).toBeLessThanOrEqual(veteranDist);
  });
});

// =============================================================================
// Task 6.3 — Determinism: Veteran tier is byte-identical with the
// coordination wiring present.
// =============================================================================

describe('Veteran-tier determinism — coordination wiring is inert', () => {
  it('Veteran movement decisions are identical with and without a lance context', () => {
    const grid = makeGrid(16);
    const capability: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };
    const mover = unit({ unitId: 'mover', position: { q: 0, r: 0 } });
    const enemy = unit({ unitId: 'enemy', position: { q: 0, r: 8 } });
    const allUnits = [mover, enemy];

    const plan = planTurn([mover], [enemy]);
    const ctx: IAILanceContext = { plan, lancemates: [] };

    // Run the SAME seed twice — once with the lance context, once without.
    // A Veteran bot's `lanceCoordination` is false, so the cohesion term is
    // inert and the two runs must be byte-identical.
    const withCtx = new BotPlayer(
      new SeededRandom(2026),
      VETERAN,
    ).playMovementPhase(mover, grid, capability, allUnits, ctx);
    const withoutCtx = new BotPlayer(
      new SeededRandom(2026),
      VETERAN,
    ).playMovementPhase(mover, grid, capability, allUnits);

    expect(withCtx).toEqual(withoutCtx);
  });

  it('Veteran attack decisions are identical with and without a lance context', () => {
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const t1 = unit({ unitId: 't1', position: { q: 0, r: 3 } });
    const t2 = unit({ unitId: 't2', position: { q: 0, r: 5 } });
    const allUnits = [attacker, t1, t2];

    const plan = planTurn([attacker], [t1, t2]);
    const ctx: IAILanceContext = { plan, lancemates: [attacker] };

    const withCtx = new BotPlayer(
      new SeededRandom(2026),
      VETERAN,
    ).playAttackPhase(attacker, allUnits, ctx);
    const withoutCtx = new BotPlayer(
      new SeededRandom(2026),
      VETERAN,
    ).playAttackPhase(attacker, allUnits);

    expect(withCtx).toEqual(withoutCtx);
  });

  it('Green-tier movement is unchanged by the coordination wiring', () => {
    // The determinism golden traces run on the legacy tiers — confirm Green
    // (the strictest legacy tier) is also unaffected by an inert context.
    const green: IBotBehavior = { ...VETERAN, tier: 'Green' };
    const grid = makeGrid(14);
    const capability: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };
    const mover = unit({ unitId: 'mover', position: { q: 0, r: 0 } });
    const enemy = unit({ unitId: 'enemy', position: { q: 0, r: 7 } });
    const allUnits = [mover, enemy];

    const plan = planTurn([mover], [enemy]);
    const ctx: IAILanceContext = { plan, lancemates: [] };

    const withCtx = new BotPlayer(new SeededRandom(1), green).playMovementPhase(
      mover,
      grid,
      capability,
      allUnits,
      ctx,
    );
    const withoutCtx = new BotPlayer(
      new SeededRandom(1),
      green,
    ).playMovementPhase(mover, grid, capability, allUnits);

    expect(withCtx).toEqual(withoutCtx);
  });
});
