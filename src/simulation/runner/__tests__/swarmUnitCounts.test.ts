/**
 * Teeth test for `deriveSwarmUnitCounts` — audit 2026-06-09 E-8.
 *
 * The 2026-06-09 audit found the swarm CLI built `simConfig.unitCount`
 * and pilot generation counts from the CONFIGURED per-side counts while
 * `participants[]` / hydration / `bvTotal` were built from the ACTUAL
 * force assignments. When `generateRandomForce` widens to `count + 1`
 * on `BudgetUnsatisfiableError` (PT-010 retry), the runner fielded
 * `count` units while the swarm output described `count + 1` — phantom
 * participants plus inflated `bvTotal` in the replay manifest.
 *
 * These tests drive the REAL force generator through the PT-010 retry
 * path (tight-budget catalog fixture from the generator's own test
 * suite) and prove the derivation now follows the actual assignments,
 * not the configured count.
 *
 * @see docs/audits/2026-06-09-full-codebase-review.md (E-8)
 */

import { generateRandomForce } from '@/services/encounter/randomForceGenerator';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { deriveSwarmUnitCounts } from '../swarmUnitCounts';

/** Build a minimal IUnitIndexEntry fixture. */
function makeUnit(id: string, chassis: string, bv: number): IUnitIndexEntry {
  return {
    id,
    name: `${chassis} ${id}`,
    chassis,
    variant: id,
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    era: Era.CLAN_INVASION,
    weightClass: WeightClass.MEDIUM,
    unitType: UnitType.BATTLEMECH,
    filePath: `/units/${id}.json`,
    year: 3050,
    bv,
  };
}

/**
 * PT-010 reproduction catalog (mirrors the fixture in
 * randomForceGenerator.test.ts): 20 chassis at 3000-3475 BV. count=2
 * tops out at ~7000 BV — below the 9500 lower bound of a 10k ±5%
 * budget — so the generator MUST widen to count=3.
 */
function buildPT010Catalog(): IUnitIndexEntry[] {
  const catalog: IUnitIndexEntry[] = [];
  for (let i = 0; i < 20; i++) {
    catalog.push(makeUnit(`pt010-${i}`, `Chassis${i}`, 3000 + i * 25));
  }
  return catalog;
}

describe('deriveSwarmUnitCounts (audit E-8)', () => {
  it('PT-010 retry path: derived counts follow ACTUAL assignments, not the configured count', () => {
    const configuredCountA = 2;
    const configuredCountB = 3;
    const catalog = buildPT010Catalog();
    const random = new SeededRandom(2026);

    // Side A: tight budget forces the count+1 widening retry (2 → 3).
    const forceA = generateRandomForce({
      bvBudget: 10_000,
      bvTolerance: 0.05,
      count: configuredCountA,
      sideId: 'player',
      random,
      catalog,
    });

    // Side B: relaxed tolerance — no retry, configured count holds.
    const forceB = generateRandomForce({
      bvBudget: 10_000,
      bvTolerance: 0.3,
      count: configuredCountB,
      sideId: 'opfor',
      random,
      catalog,
    });

    // Precondition pin: the retry actually fired for side A.
    expect(forceA.assignments).toHaveLength(configuredCountA + 1);
    expect(forceB.assignments).toHaveLength(configuredCountB);

    const counts = deriveSwarmUnitCounts(forceA, forceB);

    // The E-8 bug shape: the CLI used { player: 2, opponent: 3 } here
    // (configured counts), so the runner fielded 2 player units while
    // participants[] described 3 — a phantom. The derivation MUST track
    // the actual assignments instead.
    expect(counts).toEqual({
      player: configuredCountA + 1,
      opponent: configuredCountB,
    });
    expect(counts.player).not.toBe(configuredCountA);
  });

  it('no-retry path: derived counts equal the configured counts', () => {
    const catalog = buildPT010Catalog();
    const random = new SeededRandom(2026);

    const forceA = generateRandomForce({
      bvBudget: 10_000,
      bvTolerance: 0.3,
      count: 3,
      sideId: 'player',
      random,
      catalog,
    });
    const forceB = generateRandomForce({
      bvBudget: 10_000,
      bvTolerance: 0.3,
      count: 3,
      sideId: 'opfor',
      random,
      catalog,
    });

    expect(deriveSwarmUnitCounts(forceA, forceB)).toEqual({
      player: 3,
      opponent: 3,
    });
  });

  it('keeps bvTotal consistent: force stats sum exactly the units the derived counts field', () => {
    // bvTotal in the swarm manifest is forceA.stats.totalBV +
    // forceB.stats.totalBV. With counts derived from assignments, every
    // BV point in that total corresponds to a fielded unit — assert the
    // stats themselves are computed over assignments (assignedUnits
    // matches assignments.length on the retry path).
    const catalog = buildPT010Catalog();
    const random = new SeededRandom(2026);

    const forceA = generateRandomForce({
      bvBudget: 10_000,
      bvTolerance: 0.05,
      count: 2, // forces the PT-010 retry → 3 assignments
      sideId: 'player',
      random,
      catalog,
    });

    expect(forceA.stats.assignedUnits).toBe(forceA.assignments.length);

    const perUnitBVs = forceA.assignments.map((assignment) => {
      const entry = catalog.find((e) => e.id === assignment.unitId);
      return entry?.bv ?? 0;
    });
    const summed = perUnitBVs.reduce((sum, bv) => sum + bv, 0);
    expect(forceA.stats.totalBV).toBe(summed);
  });
});
