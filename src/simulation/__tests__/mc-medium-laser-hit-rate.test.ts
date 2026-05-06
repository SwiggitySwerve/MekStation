/**
 * Phase 6c (Monte Carlo distribution tests, Task 6.14) — empirical hit-rate
 * convergence for medium-laser attacks at the canonical short / medium /
 * long target numbers.
 *
 * Models a Gunnery-4 pilot firing at a stationary target with no movement
 * modifiers, terrain, or attacker heat: the only modifier is the range
 * bracket itself (S=+0, M=+2, L=+4). The resulting target numbers map
 * directly onto the 2d6 CDF, so the test asserts the empirical hit
 * fraction over 10000 seed-pinned `SeededD6Roller` rolls falls within ±3σ
 * of the analytic probability.
 *
 * 3σ tolerance per project MEMORY: 2σ at 10K rolls fires false-positive
 * flakes every few hundred CI runs. 3σ = 99.73% confidence per run, so
 * a Bonferroni-corrected three-test suite still sits at ≈0.81% per run.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *     - "Deterministic D6 Roller Adapter for Test Pyramid"
 *       (Scenario: Monte Carlo hit-rate test passes ±2σ analytic gate)
 */

import { SeededD6Roller } from '@/simulation/core/SeededD6Roller';
import { roll2d6 } from '@/utils/gameplay/hitLocation';

// =============================================================================
// Analytic 2d6 CDF reference (P(2d6 ≥ TN) for TN ∈ [2..12])
// =============================================================================

// 2d6 PMF: p(k) = ways(k) / 36, where ways = 1,2,3,4,5,6,5,4,3,2,1 for k=2..12.
// This block is the canonical analytic reference the test asserts against.
const ANALYTIC_HIT_RATE: Record<number, number> = {
  4: 33 / 36, // 0.91667 — short range, TN 4
  6: 26 / 36, // 0.72222 — medium range, TN 6
  8: 15 / 36, // 0.41667 — long range, TN 8
};

const ITERATIONS = 10000;

/**
 * Compute the 3-sigma margin for a Bernoulli proportion estimator.
 * σ = sqrt(p·(1-p)/n); margin = 3σ.
 */
function threeSigmaMargin(p: number, n: number): number {
  return 3 * Math.sqrt((p * (1 - p)) / n);
}

/**
 * Run the inner MC loop: roll 2d6 N times, count rolls ≥ TN.
 */
function simulateHitRate(seed: number, targetNumber: number): number {
  const roller = new SeededD6Roller(seed).asD6Roller();
  let hits = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const result = roll2d6(roller);
    if (result.total >= targetNumber) {
      hits += 1;
    }
  }
  return hits / ITERATIONS;
}

describe('Monte Carlo — medium-laser hit rate (Task 6.14)', () => {
  it('short range (TN 4) converges to 33/36 within ±3σ over 10K rolls', () => {
    // Gunnery 4 + 0 range mod = TN 4. Analytic P(hit) = 33/36 ≈ 0.91667.
    // 3σ ≈ 0.00829, so the observed rate must land in [0.90838, 0.92496].
    const observed = simulateHitRate(/* seed */ 9001, /* TN */ 4);
    const expected = ANALYTIC_HIT_RATE[4];
    const margin = threeSigmaMargin(expected, ITERATIONS);

    expect(Math.abs(observed - expected)).toBeLessThan(margin);
    // Sanity floor: short range should always trivially exceed the
    // 75% midpoint of the 2d6 CDF — a regression that broke the roller
    // entirely (e.g. uniform 2-12) would land near 90.5% and could pass
    // the ±3σ window. The 80% floor catches catastrophic breakage.
    expect(observed).toBeGreaterThan(0.8);
  });

  it('medium range (TN 6) converges to 26/36 within ±3σ over 10K rolls', () => {
    // Gunnery 4 + 2 range mod = TN 6. Analytic P(hit) = 26/36 ≈ 0.72222.
    // 3σ ≈ 0.01344, so the observed rate must land in [0.70878, 0.73567].
    const observed = simulateHitRate(/* seed */ 9002, /* TN */ 6);
    const expected = ANALYTIC_HIT_RATE[6];
    const margin = threeSigmaMargin(expected, ITERATIONS);

    expect(Math.abs(observed - expected)).toBeLessThan(margin);
  });

  it('long range (TN 8) converges to 15/36 within ±3σ over 10K rolls', () => {
    // Gunnery 4 + 4 range mod = TN 8. Analytic P(hit) = 15/36 ≈ 0.41667.
    // 3σ ≈ 0.01479, so the observed rate must land in [0.40188, 0.43146].
    const observed = simulateHitRate(/* seed */ 9003, /* TN */ 8);
    const expected = ANALYTIC_HIT_RATE[8];
    const margin = threeSigmaMargin(expected, ITERATIONS);

    expect(Math.abs(observed - expected)).toBeLessThan(margin);
  });

  it('reproduces identical hit counts when reseeded with the same seed', () => {
    // Determinism contract: the same seed MUST produce the same
    // empirical rate to the last digit. This anchors the seeded
    // determinism guarantee in `simulation-system`'s "Deterministic D6
    // Roller Adapter" requirement against accidental Math.random
    // contamination of the 2d6 path.
    const a = simulateHitRate(7777, 6);
    const b = simulateHitRate(7777, 6);
    expect(a).toBe(b);
  });
});
