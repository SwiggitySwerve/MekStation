/**
 * Phase 6c (Monte Carlo distribution tests, Task 6.16) — empirical
 * critical-trigger rate convergence for `checkCriticalHitTrigger`.
 *
 * Per Total Warfare p. 41, any structure damage triggers a 2d6 critical-
 * hit roll: 8+ → 1 crit. The trigger rate is therefore
 * P(2d6 ≥ 8) = 15/36 ≈ 0.41667, regardless of the magnitude of the
 * structure damage applied (the rule is binary, not graduated by damage).
 *
 * Test asserts the empirical trigger rate over 10000 seed-pinned rolls
 * lies within ±3σ of the analytic probability. 3σ tolerance per project
 * MEMORY anti-flake rule.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *     - "Deterministic D6 Roller Adapter for Test Pyramid" — covers any
 *       seeded distribution test exercising the gameplay-layer dice path.
 *   openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 *     - critical-hit table (re-asserted as a distribution invariant).
 */

import { SeededD6Roller } from '@/simulation/core/SeededD6Roller';
import { checkCriticalHitTrigger } from '@/utils/gameplay/damage/critical';

const ITERATIONS = 10000;
const STRUCTURE_DAMAGE = 10; // any positive value triggers the binary rule
const ANALYTIC_TRIGGER_RATE = 15 / 36; // P(2d6 ≥ 8) = 0.41667

/**
 * 3-sigma Bernoulli proportion margin for a binary trigger.
 * 3σ = 3 * sqrt(p (1 - p) / n) ≈ 0.01479 at p=0.41667, n=10000.
 */
function threeSigmaMargin(p: number, n: number): number {
  return 3 * Math.sqrt((p * (1 - p)) / n);
}

/**
 * Run the MC loop: call `checkCriticalHitTrigger` N times, count
 * `triggered: true` results.
 */
function simulateTriggerRate(seed: number): number {
  const roller = new SeededD6Roller(seed).asD6Roller();
  let triggered = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const result = checkCriticalHitTrigger(STRUCTURE_DAMAGE, roller);
    if (result.triggered) {
      triggered += 1;
    }
  }
  return triggered / ITERATIONS;
}

describe('Monte Carlo — critical-hit trigger rate (Task 6.16)', () => {
  it('converges to P(2d6 ≥ 8) = 15/36 within ±3σ over 10K rolls', () => {
    // Analytic P(trigger) = 15/36 ≈ 0.41667. 3σ ≈ 0.01479, so the
    // observed rate must land in [0.40188, 0.43146].
    const observed = simulateTriggerRate(/* seed */ 6001);
    const margin = threeSigmaMargin(ANALYTIC_TRIGGER_RATE, ITERATIONS);

    expect(Math.abs(observed - ANALYTIC_TRIGGER_RATE)).toBeLessThan(margin);
  });

  it('returns triggered=false when structureDamage = 0 regardless of seed', () => {
    // Structural sanity: the function short-circuits on
    // `structureDamage <= 0` per `damage/critical.ts:29`. The roller is
    // never advanced in that branch — verifying both invariants.
    const roller = new SeededD6Roller(6002).asD6Roller();
    for (let i = 0; i < 100; i++) {
      const result = checkCriticalHitTrigger(0, roller);
      expect(result.triggered).toBe(false);
      expect(result.roll.total).toBe(0);
    }
  });

  it('reproduces identical trigger counts when reseeded with the same seed', () => {
    // Determinism contract: same seed ⇒ same trigger rate to the digit.
    const a = simulateTriggerRate(4242);
    const b = simulateTriggerRate(4242);
    expect(a).toBe(b);
  });
});
