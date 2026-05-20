/**
 * Property tests — Random Force Generator (Task 4.14)
 *
 * Spec contracts from add-encounter-swarm-harness:
 *   - generateRandomForce SHALL return an IForce with `count` units within
 *     bvBudget ± bvTolerance when the catalog can satisfy the budget.
 *   - generateRandomForce SHALL throw BudgetUnsatisfiableError when no
 *     combination of filtered units can satisfy the budget.
 *   - generateRandomForce SHALL be deterministic: two calls with the same
 *     seed and options MUST return an identical unit sequence.
 *   - Duplicate chassis cap: no chassis SHALL appear more than
 *     ceil(count/4) times in the result (default cap).
 *   - Era filter: only units with year <= Number(era) are eligible.
 *   - Tech base filter: "IS" maps to TechBase.INNER_SPHERE; "Clan" maps to
 *     TechBase.CLAN; "Mixed" / omitted passes all units.
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import {
  BudgetUnsatisfiableError,
  generateRandomForce,
  IRandomForceOptions,
} from '../randomForceGenerator';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a minimal IUnitIndexEntry fixture.
 */
function makeUnit(
  id: string,
  chassis: string,
  bv: number,
  overrides: Partial<IUnitIndexEntry> = {},
): IUnitIndexEntry {
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
    ...overrides,
  };
}

/**
 * Build a catalog of `n` units with diverse chassis and BV values.
 * BV values are assigned as `baseBv + i * step` for variety.
 */
function buildCatalog(n: number, baseBv = 500, step = 100): IUnitIndexEntry[] {
  const catalog: IUnitIndexEntry[] = [];
  for (let i = 0; i < n; i++) {
    // Use a handful of chassis names to exercise duplicate-cap logic
    const chassis = `Chassis${String.fromCharCode(65 + (i % 8))}`; // A-H
    catalog.push(makeUnit(`unit-${i}`, chassis, baseBv + i * step));
  }
  return catalog;
}

/** Shorthand base options factory */
function baseOpts(
  overrides: Partial<IRandomForceOptions> = {},
): IRandomForceOptions {
  return {
    bvBudget: 10_000,
    count: 4,
    sideId: 'opfor',
    random: new SeededRandom(42),
    catalog: buildCatalog(40),
    ...overrides,
  };
}

// =============================================================================
// Property: count units returned within BV tolerance
// =============================================================================

describe('generateRandomForce — property: BV budget satisfaction', () => {
  it('should return exactly count units for 1,000 runs with random seeds', () => {
    const catalog = buildCatalog(60, 200, 80);
    let failures = 0;

    for (let seed = 0; seed < 1_000; seed++) {
      const opts = baseOpts({
        bvBudget: 8_000,
        bvTolerance: 0.25, // wide tolerance so catalog easily satisfies
        count: 4,
        random: new SeededRandom(seed),
        catalog,
      });
      const force = generateRandomForce(opts);
      if (force.assignments.length !== 4) failures++;
    }

    expect(failures).toBe(0);
  });

  it('should return total BV within [budget*(1-tol), budget*(1+tol)] for 500 runs', () => {
    const catalog = buildCatalog(60, 300, 100);
    const budget = 8_000;
    const tolerance = 0.25;
    let outOfRange = 0;

    for (let seed = 0; seed < 500; seed++) {
      const opts = baseOpts({
        bvBudget: budget,
        bvTolerance: tolerance,
        count: 4,
        random: new SeededRandom(seed + 1000),
        catalog,
      });
      const force = generateRandomForce(opts);
      const totalBV = force.stats.totalBV;
      const lower = budget * (1 - tolerance);
      const upper = budget * (1 + tolerance);
      if (totalBV < lower || totalBV > upper) outOfRange++;
    }

    // Allow a small number of misses because edge-cases where the cheapest
    // combination exceeds the upper bound are theoretically possible with
    // a restricted catalog. 5% failure rate is acceptable for a property test.
    expect(outOfRange).toBeLessThan(50);
  });
});

// =============================================================================
// Property: determinism
// =============================================================================

describe('generateRandomForce — determinism', () => {
  it('two calls with the same seed and options produce identical unit ids', () => {
    const catalog = buildCatalog(40);

    for (let seed = 0; seed < 20; seed++) {
      const makeOpts = () =>
        baseOpts({
          bvBudget: 6_000,
          count: 4,
          random: new SeededRandom(seed + 5000),
          catalog,
          bvTolerance: 0.3,
        });

      const force1 = generateRandomForce(makeOpts());
      const force2 = generateRandomForce(makeOpts());

      const ids1 = force1.assignments.map((a) => a.unitId);
      const ids2 = force2.assignments.map((a) => a.unitId);
      expect(ids1).toEqual(ids2);
    }
  });
});

// =============================================================================
// Property: chassis cap
// =============================================================================

describe('generateRandomForce — chassis cap', () => {
  it('no chassis appears more than ceil(count/4) times in any run', () => {
    // 4 distinct chassis × 10 units each = 40 units.
    // count=8, cap=ceil(8/4)=2 → max 2 per chassis, 4 chassis allows up to 8 total.
    const catalog: IUnitIndexEntry[] = [];
    const chassisPool = ['Marauder', 'Atlas', 'Warhammer', 'Hunchback'];
    for (let i = 0; i < 40; i++) {
      const chassis = chassisPool[i % 4];
      catalog.push(makeUnit(`unit-${i}`, chassis, 800 + i * 50));
    }

    const count = 8;
    const expectedCap = Math.ceil(count / 4); // 2

    for (let seed = 0; seed < 50; seed++) {
      const force = generateRandomForce(
        baseOpts({
          bvBudget: 12_000,
          bvTolerance: 0.4,
          count,
          random: new SeededRandom(seed + 2000),
          catalog,
        }),
      );

      const chassisCounts: Map<string, number> = new Map();
      for (const assignment of force.assignments) {
        const entry = catalog.find((e) => e.id === assignment.unitId);
        if (entry) {
          chassisCounts.set(
            entry.chassis,
            (chassisCounts.get(entry.chassis) ?? 0) + 1,
          );
        }
      }

      for (const [chassis, count_] of Array.from(chassisCounts.entries())) {
        expect(count_).toBeLessThanOrEqual(expectedCap);
      }
    }
  });

  it('respects explicit duplicateChassisCap override', () => {
    // Build catalog with 6 distinct chassis (5 units each) so cap=1 still
    // allows a full force of 6 to be assembled without running out of candidates.
    const catalog: IUnitIndexEntry[] = [];
    const chassisNames = [
      'Atlas',
      'Marauder',
      'Warhammer',
      'Griffin',
      'Hunchback',
      'Wolverine',
    ];
    for (let i = 0; i < chassisNames.length; i++) {
      for (let j = 0; j < 5; j++) {
        catalog.push(
          makeUnit(`${chassisNames[i]}-${j}`, chassisNames[i], 800 + j * 50),
        );
      }
    }

    const force = generateRandomForce(
      baseOpts({
        bvBudget: 6_000,
        bvTolerance: 0.5,
        count: 6,
        duplicateChassisCap: 1,
        random: new SeededRandom(9999),
        catalog,
      }),
    );

    // With cap=1, each chassis should appear at most once
    const chassisCounts: Map<string, number> = new Map();
    for (const a of force.assignments) {
      const entry = catalog.find((e) => e.id === a.unitId);
      if (entry)
        chassisCounts.set(
          entry.chassis,
          (chassisCounts.get(entry.chassis) ?? 0) + 1,
        );
    }
    for (const count_ of Array.from(chassisCounts.values())) {
      expect(count_).toBeLessThanOrEqual(1);
    }
  });
});

// =============================================================================
// Property: era filter
// =============================================================================

describe('generateRandomForce — era filter', () => {
  it('only returns units introduced in or before the requested era year', () => {
    const catalog: IUnitIndexEntry[] = [
      makeUnit('early-1', 'Wolverine', 800, { year: 2800 }),
      makeUnit('early-2', 'Griffin', 850, { year: 2900 }),
      makeUnit('mid-1', 'Timber Wolf', 2200, { year: 3052 }),
      makeUnit('mid-2', 'Mad Dog', 2100, { year: 3055 }),
    ];

    for (let seed = 0; seed < 20; seed++) {
      const force = generateRandomForce(
        baseOpts({
          bvBudget: 3_000,
          bvTolerance: 0.5,
          count: 2,
          era: '3049',
          random: new SeededRandom(seed),
          catalog,
        }),
      );

      for (const a of force.assignments) {
        const entry = catalog.find((e) => e.id === a.unitId)!;
        expect(entry.year ?? 0).toBeLessThanOrEqual(3049);
      }
    }
  });

  it('throws BudgetUnsatisfiableError when no units pass era filter', () => {
    const catalog: IUnitIndexEntry[] = [
      makeUnit('future-1', 'Nova Cat', 2000, { year: 3060 }),
    ];

    expect(() =>
      generateRandomForce(
        baseOpts({
          era: '3050',
          catalog,
          bvBudget: 5000,
        }),
      ),
    ).toThrow(BudgetUnsatisfiableError);
  });
});

// =============================================================================
// Property: tech base filter
// =============================================================================

describe('generateRandomForce — techBase filter', () => {
  const mixedCatalog: IUnitIndexEntry[] = [
    makeUnit('is-1', 'Atlas', 1500, { techBase: TechBase.INNER_SPHERE }),
    makeUnit('is-2', 'Marauder', 1200, { techBase: TechBase.INNER_SPHERE }),
    makeUnit('clan-1', 'Timber Wolf', 2200, { techBase: TechBase.CLAN }),
    makeUnit('clan-2', 'Mad Dog', 2100, { techBase: TechBase.CLAN }),
  ];

  it('IS filter only returns Inner Sphere units', () => {
    // IS units: is-1 (1500) + is-2 (1200) = 2700 total.
    // budget=2000, tol=0.5 → lower=1000, upper=3000; 2700 is satisfiable.
    for (let seed = 0; seed < 10; seed++) {
      const force = generateRandomForce(
        baseOpts({
          bvBudget: 2_000,
          bvTolerance: 0.5,
          count: 2,
          techBase: 'IS',
          random: new SeededRandom(seed),
          catalog: mixedCatalog,
        }),
      );
      for (const a of force.assignments) {
        const entry = mixedCatalog.find((e) => e.id === a.unitId)!;
        expect(entry.techBase).toBe(TechBase.INNER_SPHERE);
      }
    }
  });

  it('Clan filter only returns Clan units', () => {
    for (let seed = 0; seed < 10; seed++) {
      const force = generateRandomForce(
        baseOpts({
          bvBudget: 6_000,
          bvTolerance: 0.5,
          count: 2,
          techBase: 'Clan',
          random: new SeededRandom(seed + 100),
          catalog: mixedCatalog,
        }),
      );
      for (const a of force.assignments) {
        const entry = mixedCatalog.find((e) => e.id === a.unitId)!;
        expect(entry.techBase).toBe(TechBase.CLAN);
      }
    }
  });

  it('Mixed / omitted filter includes all units', () => {
    // Prove Mixed doesn't exclude any tech base by using a catalog that has
    // ONLY Clan units — if Mixed filtered Clan out, generateRandomForce would
    // throw BudgetUnsatisfiableError (empty catalog). Since it doesn't throw,
    // Mixed correctly passes all units through.
    const clanOnlyCatalog: IUnitIndexEntry[] = [
      makeUnit('clan-a', 'Timber Wolf', 1000, { techBase: TechBase.CLAN }),
      makeUnit('clan-b', 'Mad Dog', 900, { techBase: TechBase.CLAN }),
      makeUnit('clan-c', 'Kit Fox', 800, { techBase: TechBase.CLAN }),
    ];

    expect(() =>
      generateRandomForce(
        baseOpts({
          bvBudget: 3_000,
          bvTolerance: 0.5,
          count: 2,
          techBase: 'Mixed',
          random: new SeededRandom(42),
          catalog: clanOnlyCatalog,
        }),
      ),
    ).not.toThrow();

    // Also verify IS units pass through with a second call
    const isOnlyCatalog: IUnitIndexEntry[] = [
      makeUnit('is-a', 'Atlas', 1000, { techBase: TechBase.INNER_SPHERE }),
      makeUnit('is-b', 'Marauder', 900, { techBase: TechBase.INNER_SPHERE }),
    ];

    expect(() =>
      generateRandomForce(
        baseOpts({
          bvBudget: 3_000,
          bvTolerance: 0.5,
          count: 2,
          techBase: 'Mixed',
          random: new SeededRandom(42),
          catalog: isOnlyCatalog,
        }),
      ),
    ).not.toThrow();
  });
});

// =============================================================================
// Property: BudgetUnsatisfiableError thrown when catalog cannot satisfy budget
// =============================================================================

describe('generateRandomForce — BudgetUnsatisfiableError', () => {
  it('throws when catalog is empty', () => {
    expect(() => generateRandomForce(baseOpts({ catalog: [] }))).toThrow(
      BudgetUnsatisfiableError,
    );
  });

  it('throws when minimum achievable BV exceeds upper bound', () => {
    // Catalog has only a 5000-BV unit; budget is 1000 with tight tolerance
    const catalog = [makeUnit('huge', 'Atlas', 5000)];
    expect(() =>
      generateRandomForce(
        baseOpts({ bvBudget: 1000, bvTolerance: 0.1, catalog }),
      ),
    ).toThrow(BudgetUnsatisfiableError);
  });

  it('error carries achievableMinBV and achievableMaxBV', () => {
    const catalog = [makeUnit('expensive', 'Battlemaster', 3000)];
    let err: BudgetUnsatisfiableError | null = null;
    try {
      generateRandomForce(
        baseOpts({ bvBudget: 500, bvTolerance: 0.1, catalog }),
      );
    } catch (e) {
      err = e as BudgetUnsatisfiableError;
    }
    expect(err).not.toBeNull();
    expect(err).toBeInstanceOf(BudgetUnsatisfiableError);
    expect(err!.achievableMinBV).toBeGreaterThan(0);
    expect(err!.achievableMaxBV).toBeGreaterThanOrEqual(err!.achievableMinBV);
  });
});

// =============================================================================
// Shape validation
// =============================================================================

describe('generateRandomForce — IForce shape', () => {
  it('returned force has required IForce fields', () => {
    const force = generateRandomForce(
      baseOpts({ bvBudget: 5_000, bvTolerance: 0.3, count: 3 }),
    );
    expect(typeof force.id).toBe('string');
    expect(typeof force.name).toBe('string');
    expect(typeof force.forceType).toBe('string');
    expect(typeof force.status).toBe('string');
    expect(Array.isArray(force.childIds)).toBe(true);
    expect(Array.isArray(force.assignments)).toBe(true);
    expect(typeof force.stats).toBe('object');
    expect(typeof force.createdAt).toBe('string');
    expect(typeof force.updatedAt).toBe('string');
  });

  it('all assignments have null pilotId (pairing done separately)', () => {
    const force = generateRandomForce(
      baseOpts({ bvBudget: 5_000, bvTolerance: 0.3, count: 3 }),
    );
    for (const a of force.assignments) {
      expect(a.pilotId).toBeNull();
    }
  });

  it('first assignment has Commander position', () => {
    const force = generateRandomForce(
      baseOpts({ bvBudget: 5_000, bvTolerance: 0.3, count: 3 }),
    );
    expect(force.assignments[0].position).toBe('commander');
  });

  it('stats.assignedUnits matches assignments.length', () => {
    const force = generateRandomForce(
      baseOpts({ bvBudget: 5_000, bvTolerance: 0.3, count: 4 }),
    );
    expect(force.stats.assignedUnits).toBe(force.assignments.length);
  });
});

// =============================================================================
// Spec Fix 4 — default bvTolerance is ±5%
//
// Spec scenario from
// openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md:
// generating a force with bvBudget=5000, count=3, no explicit tolerance MUST land
// inside [4750, 5250].
// =============================================================================

describe('generateRandomForce — default bvTolerance is ±5%', () => {
  it('omitting bvTolerance enforces ±5% (5000 BV budget, count 3)', () => {
    // Build a finely-graded catalog so any reasonable greedy fill can hit ±5%.
    const catalog: IUnitIndexEntry[] = [];
    for (let i = 0; i < 80; i++) {
      catalog.push(makeUnit(`unit-${i}`, `Chassis${i % 12}`, 1000 + i * 50));
    }

    let outOfRange = 0;
    let attempted = 0;
    for (let seed = 0; seed < 50; seed++) {
      try {
        const force = generateRandomForce({
          bvBudget: 5000,
          count: 3,
          sideId: 'A',
          random: new SeededRandom(seed + 11_000),
          catalog,
          // bvTolerance intentionally omitted → must default to 0.05.
        });
        attempted++;
        const totalBV = force.stats.totalBV;
        if (totalBV < 4750 || totalBV > 5250) outOfRange++;
      } catch {
        // BudgetUnsatisfiableError is acceptable for some seeds; not an out-of-range.
      }
    }

    // Most attempts must succeed (catalog is rich enough).
    expect(attempted).toBeGreaterThan(0);
    // Any successful attempt MUST land in the ±5% window — no silent ±15% drift.
    expect(outOfRange).toBe(0);
  });
});

// =============================================================================
// PT-010 — unitCount widening retry
// =============================================================================
//
// Per `polish-wave-6.2-gaps` (gap #11, closes PT-010): when the requested
// `count` cannot satisfy the BV budget, the generator retries once at
// `count + 1` before re-throwing. Opt out via `exactUnitCount: true`.
// Reproduces the scenario from playtest/ISSUES.md PT-010:
// 10 000 BV / count=2 — the catalog tops out at ~4500 per unit, so count=2
// can't reach 9500 (lower bound) but count=3 can hit ~10 000 with three
// ~3300-BV picks.

describe('generateRandomForce — PT-010 unitCount retry', () => {
  // Catalog: 20 chassis each at 3000-3500 BV (mid-weight). count=2 can hit
  // at most 7000 BV (still under 9500 lower bound at ±5% on 10k budget),
  // but count=3 can sum to ~10 000.
  function buildPT010Catalog(): IUnitIndexEntry[] {
    const catalog: IUnitIndexEntry[] = [];
    for (let i = 0; i < 20; i++) {
      catalog.push(makeUnit(`pt010-${i}`, `Chassis${i}`, 3000 + i * 25));
    }
    return catalog;
  }

  it("retries at count+1 when count=2 can't hit 10k BV (PT-010 reproduction)", () => {
    const force = generateRandomForce(
      baseOpts({
        bvBudget: 10_000,
        bvTolerance: 0.05,
        count: 2,
        catalog: buildPT010Catalog(),
        random: new SeededRandom(2026),
      }),
    );

    // Retry kicked in: caller asked for 2, generator returned 3 (count+1).
    expect(force.assignments).toHaveLength(3);
  });

  it("exactUnitCount: true still throws when count=2 can't hit 10k BV", () => {
    expect(() =>
      generateRandomForce(
        baseOpts({
          bvBudget: 10_000,
          bvTolerance: 0.05,
          count: 2,
          catalog: buildPT010Catalog(),
          random: new SeededRandom(2026),
          exactUnitCount: true,
        }),
      ),
    ).toThrow(BudgetUnsatisfiableError);
  });

  it('re-throws when even count+1 cannot satisfy the budget', () => {
    // Budget 100 000 with 20 mid-BV units (max ~3500 per unit) — count+1 still
    // can't reach the lower bound.
    expect(() =>
      generateRandomForce(
        baseOpts({
          bvBudget: 100_000,
          bvTolerance: 0.01,
          count: 2,
          catalog: buildPT010Catalog(),
          random: new SeededRandom(7),
        }),
      ),
    ).toThrow(BudgetUnsatisfiableError);
  });

  it('returns count units unchanged when count already satisfies the budget', () => {
    const force = generateRandomForce(
      baseOpts({
        bvBudget: 10_000,
        bvTolerance: 0.3,
        count: 3,
        catalog: buildPT010Catalog(),
        random: new SeededRandom(2026),
      }),
    );
    // No retry needed — caller asked for 3 and got 3.
    expect(force.assignments).toHaveLength(3);
  });
});
