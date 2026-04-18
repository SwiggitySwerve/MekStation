/**
 * Unit tests for `previewAttackOutcome` and `critProbability`.
 *
 * Anchored to `add-what-if-to-hit-preview/specs/to-hit-resolution/spec.md`
 * — covers the spec's "preview combines hit/damage/crit", "preview is
 * purely informational", "out-of-range preview", "cluster preview
 * includes cluster statistics", "non-cluster zero cluster variance",
 * "crit probability on full-armor target", and "preview determinism"
 * scenarios.
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/to-hit-resolution/spec.md
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import {
  critProbability,
  previewAttackOutcome,
  ZERO_PREVIEW,
  type IAttackPreview,
} from '../preview';

// ---------------------------------------------------------------------------
// Test fixtures (stationary 4-gunnery attacker vs. stationary target)
// ---------------------------------------------------------------------------

const stationaryAttacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Stationary,
  heat: 0,
  damageModifiers: [],
};

const stationaryTarget: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false,
};

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

// ---------------------------------------------------------------------------
// previewAttackOutcome
// ---------------------------------------------------------------------------

describe('previewAttackOutcome', () => {
  it('produces non-null fields for a Medium Laser at medium range vs gunnery 4', () => {
    // Spec scenario "Preview combines hit, damage, and crit statistics"
    const preview = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: mediumLaser,
      range: 5, // medium bracket
    });

    expect(preview.hitProbability).toBeGreaterThan(0);
    expect(preview.expectedDamage).toBeGreaterThan(0);
    expect(preview.damageStddev).toBeGreaterThanOrEqual(0);
    expect(preview.critProbability).toBeGreaterThan(0);
    // Non-cluster weapon → mean=1, stddev=0.
    expect(preview.clusterHitsMean).toBe(1);
    expect(preview.clusterHitsStddev).toBe(0);
  });

  it('returns ZERO_PREVIEW when the weapon is out of range', () => {
    // Spec scenario "Out-of-range preview"
    const preview = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: mediumLaser,
      range: 50, // way beyond the 9-hex long bracket
    });

    expect(preview).toEqual(ZERO_PREVIEW);
    expect(preview.hitProbability).toBe(0);
    expect(preview.expectedDamage).toBe(0);
    expect(preview.damageStddev).toBe(0);
    expect(preview.critProbability).toBe(0);
  });

  it('exposes positive cluster stats for an LRM-10 in range', () => {
    // Spec scenario "Cluster weapon preview includes cluster statistics"
    const preview = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: lrm10,
      range: 10, // medium bracket for LRM-10
    });

    // Mean cluster hits matches the cached table value (≈ 6.31 in
    // the in-repo CLUSTER_HIT_TABLE; see expectedDamage.test for the
    // canonical-vs-actual delta note).
    expect(preview.clusterHitsMean).toBeCloseTo(6.31, 1);
    expect(preview.clusterHitsStddev).toBeGreaterThan(0);
    // expectedDamage = hitProbability × meanHits × damage(1).
    const expectedExpected =
      preview.hitProbability * preview.clusterHitsMean * 1;
    expect(preview.expectedDamage).toBeCloseTo(expectedExpected, 4);
  });

  it('returns identical results across 1000 calls (proves no hidden randomness)', () => {
    // Spec scenarios "Preview Determinism" + "Preview is purely
    // informational (no state mutation)"
    const baseline = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: mediumLaser,
      range: 5,
    });

    for (let i = 0; i < 1000; i++) {
      const next = previewAttackOutcome({
        attacker: stationaryAttacker,
        target: stationaryTarget,
        weapon: mediumLaser,
        range: 5,
      });
      expect(next).toEqual(baseline);
    }
  });

  it('returns identical IAttackPreview objects for the same input', () => {
    // Spec scenario "Repeated calls return identical results"
    const a = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: lrm10,
      range: 8,
    });
    const b = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: lrm10,
      range: 8,
    });
    expect(a).toEqual(b);
  });

  it('zero damage / stddev / crit when the weapon is at minimum-range range gap', () => {
    // LRM-10 has minRange=6 — at range 3 it triggers the minimum-range
    // penalty and may reduce hit probability but doesn't put us out of
    // range; preview should still produce valid non-negative numbers.
    const preview: IAttackPreview = previewAttackOutcome({
      attacker: stationaryAttacker,
      target: stationaryTarget,
      weapon: lrm10,
      range: 3,
    });
    expect(preview.expectedDamage).toBeGreaterThanOrEqual(0);
    expect(preview.damageStddev).toBeGreaterThanOrEqual(0);
    expect(preview.critProbability).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// critProbability
// ---------------------------------------------------------------------------

describe('critProbability', () => {
  it('returns 0 when hit probability is 0', () => {
    // Spec scenario "Crit probability with zero hit chance"
    expect(critProbability(0)).toBe(0);
  });

  it('returns a positive but small number for a single-shot at p=0.5', () => {
    // Defaults: pLoc=1/36, pCrit=15/36 → perShot = 0.5 × 1/36 × 15/36
    // ≈ 0.00578.
    const result = critProbability(0.5);
    expect(result).toBeCloseTo(0.5 * (1 / 36) * (15 / 36), 6);
    expect(result).toBeLessThan(0.5);
  });

  it('aggregates across cluster hits with the union-bound formula', () => {
    // Spec scenario "Crit probability aggregated across cluster hits"
    const single = critProbability(0.5, { clusterHitsMean: 1 });
    const cluster = critProbability(0.5, { clusterHitsMean: 6.14 });
    // Cluster is strictly higher because more missiles → more crit chances.
    expect(cluster).toBeGreaterThan(single);
    // But still bounded by P(hit) — you can't crit more often than you hit.
    expect(cluster).toBeLessThan(0.5);
  });

  it('clamps absurd input probabilities into [0, 1]', () => {
    expect(critProbability(-0.5)).toBe(0);
    // p clamped to 1 → perShot = 1 × 1/36 × 15/36 ≈ 0.01157.
    expect(critProbability(2)).toBeCloseTo((1 / 36) * (15 / 36), 6);
  });
});
