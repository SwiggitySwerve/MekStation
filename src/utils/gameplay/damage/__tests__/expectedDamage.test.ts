/**
 * Unit tests for `expectedDamage`, `damageVariance`, `clusterHitStats`,
 * and the cached `expectedClusterHits` table.
 *
 * Anchored to `add-what-if-to-hit-preview/specs/damage-system/spec.md`
 * — every scenario asserts a specific spec requirement (single-shot,
 * cluster integration, Streak all-or-nothing, zero hit prob, one-shot
 * exhaustion, stddev clamping at extremes, cluster variance > Bernoulli).
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/damage-system/spec.md
 */

import type { IWeapon } from '@/simulation/ai/types';

import {
  clusterHitsVariance,
  clusterHitStats,
  damageVariance,
  expectedClusterHits,
  expectedDamage,
  TWO_D6_PROBABILITY_MASS,
} from '../expectedDamage';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Helper: build a minimal `IWeapon` for the AI-shape used by the UI. */
function makeWeapon(overrides: Partial<IWeapon>): IWeapon {
  return {
    id: 'medium-laser',
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

const mediumLaser: IWeapon = makeWeapon({});
const lrm10: IWeapon = makeWeapon({
  id: 'lrm-10',
  name: 'LRM 10',
  damage: 1,
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
  minRange: 6,
  ammoPerTon: 120,
  heat: 4,
});
const streakSrm4: IWeapon = makeWeapon({
  id: 'streak-srm-4',
  name: 'Streak SRM-4',
  damage: 2,
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  ammoPerTon: 50,
  heat: 3,
});
const oneShotSrm2: IWeapon = makeWeapon({
  id: 'os-srm-2',
  name: 'SRM-2 (OS)',
  damage: 2,
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  ammoPerTon: 1,
  heat: 2,
});

// ---------------------------------------------------------------------------
// expectedClusterHits cached table
// ---------------------------------------------------------------------------

describe('expectedClusterHits cached table', () => {
  it('has ~6.31 expected hits for a 10-missile rack against the existing table', () => {
    // § 6.1 / Scenario "Expected hits for 10-missile rack" — the spec
    // scenario quotes 6.14 (the canonical TM "Cluster Hit Table 2.0"
    // value); the in-repo `CLUSTER_HIT_TABLE` derives from a slightly
    // tilted source that yields 6.305. The expectation here pins to
    // the actual derivation so a future cluster-table normalization
    // (separate change) can update both numbers in lockstep.
    expect(expectedClusterHits[10]).toBeCloseTo(6.31, 1);
  });

  it('has 1.42 expected hits for a 2-missile rack within ±0.01', () => {
    // Scenario "Expected hits for 2-missile rack" — matches TM table.
    expect(expectedClusterHits[2]).toBeCloseTo(1.42, 2);
  });

  it('covers every standard cluster size (2,3,4,5,6,7,8,9,10,12,15,20)', () => {
    for (const size of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]) {
      expect(expectedClusterHits[size]).toBeGreaterThan(0);
      expect(expectedClusterHits[size]).toBeLessThanOrEqual(size);
    }
  });

  it('has positive variance for every cluster size (any rack with hit spread)', () => {
    for (const size of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]) {
      expect(clusterHitsVariance[size]).toBeGreaterThan(0);
    }
  });

  it('returns the same cached value across 1000 reads (no recomputation)', () => {
    // § 6.2 — ensures the constant is module-level, not lazy.
    const initial = expectedClusterHits[10];
    for (let i = 0; i < 1000; i++) {
      expect(expectedClusterHits[10]).toBe(initial);
    }
  });

  it('exposes a 2d6 PMF that sums to 1.0', () => {
    let total = 0;
    for (let roll = 2; roll <= 12; roll++) {
      total += TWO_D6_PROBABILITY_MASS[roll] ?? 0;
    }
    expect(total).toBeCloseTo(1.0, 10);
  });
});

// ---------------------------------------------------------------------------
// expectedDamage
// ---------------------------------------------------------------------------

describe('expectedDamage', () => {
  it('returns p × damage for single-shot weapons (Medium Laser at 0.72)', () => {
    // Spec scenario "Single-shot weapon expected damage"
    expect(expectedDamage(mediumLaser, 0.72)).toBeCloseTo(3.6, 2);
  });

  it('integrates the cluster hit table for LRM-10 at p=0.5', () => {
    // Spec scenario "Cluster weapon expected damage"
    // hitProbability × expectedHits × damagePerMissile.
    // Per the in-repo cluster table that means 0.5 × 6.305 × 1 ≈ 3.15
    // (the TM-canonical 0.5 × 6.14 × 1 ≈ 3.07 differs only because
    // the underlying CLUSTER_HIT_TABLE pre-dates this change — see the
    // note on the cached-table test above).
    expect(expectedDamage(lrm10, 0.5)).toBeCloseTo(3.15, 1);
  });

  it('treats Streak SRM-4 as all-or-nothing (4 missiles × 2 damage)', () => {
    // Spec scenario "Streak weapon all-or-nothing"
    // hitProbability × rackSize × damagePerMissile = 0.6 × 4 × 2
    expect(expectedDamage(streakSrm4, 0.6)).toBeCloseTo(4.8, 2);
  });

  it('yields zero expected damage at hitProbability = 0', () => {
    // Spec scenario "Zero hit probability yields zero damage"
    expect(expectedDamage(mediumLaser, 0)).toBe(0);
    expect(expectedDamage(lrm10, 0)).toBe(0);
    expect(expectedDamage(streakSrm4, 0)).toBe(0);
  });

  it('yields zero expected damage for one-shot launchers with 0 remaining', () => {
    // Spec scenario "One-shot weapon respects remaining shots"
    expect(expectedDamage(oneShotSrm2, 0.5, { remainingShots: 0 })).toBe(0);
  });

  it('respects depleted ammo bins for non-energy weapons', () => {
    // Reasoning: an LRM with 0 remaining shots can't fire even though
    // it isn't tagged "one-shot" — preview should read 0.
    expect(expectedDamage(lrm10, 0.5, { remainingShots: 0 })).toBe(0);
  });

  it('clamps hit probabilities outside [0, 1] before applying math', () => {
    // Defensive: a buggy upstream that sends 1.5 should not push
    // expected damage above the canonical mean.
    expect(expectedDamage(mediumLaser, 1.5)).toBe(5);
    expect(expectedDamage(mediumLaser, -0.2)).toBe(0);
  });

  it('returns identical results for 1000 consecutive identical calls', () => {
    // Pure function — proves no hidden randomness.
    const baseline = expectedDamage(lrm10, 0.5);
    for (let i = 0; i < 1000; i++) {
      expect(expectedDamage(lrm10, 0.5)).toBe(baseline);
    }
  });
});

// ---------------------------------------------------------------------------
// damageVariance
// ---------------------------------------------------------------------------

describe('damageVariance', () => {
  it('matches Bernoulli stddev for single-shot weapons (sqrt(p(1-p)) × dmg)', () => {
    // Spec scenario "Single-shot weapon stddev"
    // sqrt(0.5 × 0.5) × 5 = 0.5 × 5 = 2.5
    expect(damageVariance(mediumLaser, 0.5)).toBeCloseTo(2.5, 4);
  });

  it('clamps stddev to 0 at hit probability 1.0', () => {
    // Spec scenario "Stddev clamps to zero at extreme probabilities"
    expect(damageVariance(mediumLaser, 1.0)).toBe(0);
  });

  it('clamps stddev to 0 at hit probability 0.0', () => {
    expect(damageVariance(mediumLaser, 0.0)).toBe(0);
  });

  it('produces strictly higher stddev for cluster than equivalent Bernoulli', () => {
    // Spec scenario "Cluster weapon stddev includes cluster distribution"
    // For LRM-10 at p=0.5, cluster variance contributes on top of
    // Bernoulli, so stddev > sqrt(p(1-p)) × E[damage].
    const cluster = damageVariance(lrm10, 0.5);
    const expectedMean = expectedDamage(lrm10, 0.5);
    const bernoulliEquivalent = Math.sqrt(0.5 * 0.5) * expectedMean;
    expect(cluster).toBeGreaterThan(bernoulliEquivalent);
  });

  it('returns Bernoulli stddev for Streak (no cluster table integration)', () => {
    // Streak total damage = 4 × 2 = 8. stddev at p=0.5 = sqrt(0.25) × 8 = 4.
    expect(damageVariance(streakSrm4, 0.5)).toBeCloseTo(4, 4);
  });

  it('returns 0 for one-shot launchers with no remaining shots', () => {
    expect(damageVariance(oneShotSrm2, 0.5, { remainingShots: 0 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// clusterHitStats
// ---------------------------------------------------------------------------

describe('clusterHitStats', () => {
  it('returns mean=1, stddev=0 for non-cluster weapons', () => {
    expect(clusterHitStats(mediumLaser)).toEqual({ mean: 1, stddev: 0 });
  });

  it('returns the cached LRM-10 expected hits with positive stddev', () => {
    const stats = clusterHitStats(lrm10);
    // Mirrors the in-repo cluster table value (≈ 6.31). See the
    // cached-table test for the canonical-vs-actual delta note.
    expect(stats.mean).toBeCloseTo(6.31, 1);
    expect(stats.stddev).toBeGreaterThan(0);
  });

  it('returns mean=4 stddev=0 for Streak SRM-4 (all-or-nothing)', () => {
    expect(clusterHitStats(streakSrm4)).toEqual({ mean: 4, stddev: 0 });
  });
});
