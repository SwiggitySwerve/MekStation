/**
 * Phase 6c (Monte Carlo distribution tests, Task 6.15) — empirical hit-
 * location histogram convergence for each of the four firing arcs.
 *
 * For each arc (Front, Left, Right, Rear), call `determineHitLocation`
 * 10000 times against a seed-pinned `SeededD6Roller`, then assert the
 * per-location frequency lies within ±3σ of the analytic 2d6-table
 * probability. The analytic probabilities are the canonical
 * 1/36-per-(d1,d2)-pair distribution summed over each location's
 * triangle entries (e.g. front-arc Center Torso = ways(2)/36 + ways(7)/36
 * = (1+6)/36 = 7/36).
 *
 * Tolerance: ±3σ Bernoulli proportion margin per bin (≈0.4–1.5% across
 * locations at N=10K). 3σ chosen per project MEMORY anti-flake rule —
 * 2σ at N=10K with 8 simultaneous bins gives Bonferroni-corrected
 * per-run failure probability ≈ 36% which would be unusable.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *     - "Deterministic D6 Roller Adapter for Test Pyramid" — covers any
 *       seeded distribution test exercising the gameplay-layer dice path.
 *   openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 *     - hit location tables (re-asserted as a distribution invariant).
 */

import { SeededD6Roller } from '@/simulation/core/SeededD6Roller';
import { FiringArc } from '@/types/gameplay';
import { CombatLocation } from '@/types/gameplay';
import {
  determineHitLocation,
  FRONT_HIT_LOCATION_TABLE,
  LEFT_HIT_LOCATION_TABLE,
  REAR_HIT_LOCATION_TABLE,
  RIGHT_HIT_LOCATION_TABLE,
} from '@/utils/gameplay/hitLocation';

// =============================================================================
// Analytic distribution helpers
// =============================================================================

const ITERATIONS = 10000;

/**
 * Canonical 2d6 PMF: ways[k] / 36 for k ∈ [2,12], where the ways
 * triangle is 1,2,3,4,5,6,5,4,3,2,1.
 */
const TWO_D6_WAYS: Readonly<Record<number, number>> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

/**
 * Aggregate per-roll probabilities into per-location probabilities.
 * E.g. front arc: { center_torso: 7/36, right_arm: 5/36, head: 1/36, ... }.
 */
function analyticDistribution(
  table: Readonly<Record<number, CombatLocation>>,
): Map<CombatLocation, number> {
  const dist = new Map<CombatLocation, number>();
  for (const rollKey of Object.keys(table)) {
    const roll = Number(rollKey);
    const location = table[roll];
    const ways = TWO_D6_WAYS[roll] ?? 0;
    const previous = dist.get(location) ?? 0;
    dist.set(location, previous + ways / 36);
  }
  return dist;
}

/**
 * Bernoulli 3-sigma proportion margin: 3 * sqrt(p (1 - p) / n).
 * At N=10K this is ≈ 0.00494 for p=1/36 (head) up to ≈ 0.01188 for
 * p=7/36 (front-arc CT).
 */
function threeSigmaMargin(p: number, n: number): number {
  return 3 * Math.sqrt((p * (1 - p)) / n);
}

/**
 * Run the MC loop: roll the hit table N times, return per-location
 * frequencies normalized by N.
 */
function simulateHistogram(
  arc: FiringArc,
  seed: number,
): Map<CombatLocation, number> {
  const roller = new SeededD6Roller(seed).asD6Roller();
  const counts = new Map<CombatLocation, number>();
  for (let i = 0; i < ITERATIONS; i++) {
    const result = determineHitLocation(arc, roller);
    counts.set(result.location, (counts.get(result.location) ?? 0) + 1);
  }
  const observed = new Map<CombatLocation, number>();
  for (const [loc, count] of Array.from(counts.entries())) {
    observed.set(loc, count / ITERATIONS);
  }
  return observed;
}

/**
 * Assert that observed frequency for every analytic-listed location is
 * within ±3σ of the analytic probability. Logs a tabular diff line on
 * any failure to make CI debugging immediate.
 */
function assertHistogramMatches(
  arc: FiringArc,
  expected: Map<CombatLocation, number>,
  observed: Map<CombatLocation, number>,
): void {
  for (const [loc, expectedP] of Array.from(expected.entries())) {
    const observedP = observed.get(loc) ?? 0;
    const margin = threeSigmaMargin(expectedP, ITERATIONS);
    const delta = Math.abs(observedP - expectedP);
    if (delta >= margin) {
      // The default `expect` failure message strips the diagnostic; this
      // surfaces the per-bin breakdown so we can see which bucket drifted.
      // eslint-disable-next-line no-console
      console.error(
        `[arc=${arc}] ${loc}: expected=${expectedP.toFixed(5)} observed=${observedP.toFixed(5)} delta=${delta.toFixed(5)} margin=${margin.toFixed(5)}`,
      );
    }
    expect(delta).toBeLessThan(margin);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Monte Carlo — hit-location histogram (Task 6.15)', () => {
  it('Front arc histogram converges to canonical 2d6 distribution within ±3σ', () => {
    // Front arc analytic distribution (per FRONT_HIT_LOCATION_TABLE):
    //   CT 7/36 ≈ 0.1944, RA 5/36 ≈ 0.1389, RL 4/36 ≈ 0.1111,
    //   RT 5/36 ≈ 0.1389, LT 5/36 ≈ 0.1389, LL 4/36 ≈ 0.1111,
    //   LA 5/36 ≈ 0.1389, H 1/36 ≈ 0.0278.
    const expected = analyticDistribution(FRONT_HIT_LOCATION_TABLE);
    const observed = simulateHistogram(FiringArc.Front, /* seed */ 8001);
    assertHistogramMatches(FiringArc.Front, expected, observed);

    // Sanity check from the boss-spec brief: "front arc rolls cluster
    // on CT (most populated bucket per the 2d6 PMF)". CT must beat
    // every other location.
    const ctFrequency = observed.get('center_torso') ?? 0;
    for (const [loc, freq] of Array.from(observed.entries())) {
      if (loc !== 'center_torso') {
        expect(ctFrequency).toBeGreaterThan(freq);
      }
    }
  });

  it('Left arc histogram converges to canonical 2d6 distribution within ±3σ', () => {
    const expected = analyticDistribution(LEFT_HIT_LOCATION_TABLE);
    const observed = simulateHistogram(FiringArc.Left, /* seed */ 8002);
    assertHistogramMatches(FiringArc.Left, expected, observed);
  });

  it('Right arc histogram converges to canonical 2d6 distribution within ±3σ', () => {
    const expected = analyticDistribution(RIGHT_HIT_LOCATION_TABLE);
    const observed = simulateHistogram(FiringArc.Right, /* seed */ 8003);
    assertHistogramMatches(FiringArc.Right, expected, observed);
  });

  it('Rear arc histogram converges to canonical 2d6 distribution within ±3σ', () => {
    // Rear arc routes torso hits to the `*_torso_rear` bins; analytic
    // distribution and the per-bin margin is the same, only the
    // location names change.
    const expected = analyticDistribution(REAR_HIT_LOCATION_TABLE);
    const observed = simulateHistogram(FiringArc.Rear, /* seed */ 8004);
    assertHistogramMatches(FiringArc.Rear, expected, observed);
  });

  it('reproduces identical histograms when reseeded with the same seed', () => {
    // Determinism contract: same seed ⇒ same per-bin counts.
    const a = simulateHistogram(FiringArc.Front, 5555);
    const b = simulateHistogram(FiringArc.Front, 5555);
    for (const [loc, freq] of Array.from(a.entries())) {
      expect(b.get(loc)).toBe(freq);
    }
  });
});
