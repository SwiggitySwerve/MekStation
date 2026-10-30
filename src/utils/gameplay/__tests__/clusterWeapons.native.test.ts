import type { IWeapon } from '@/simulation/ai/types';

import { resolveSpecialProjectileHit } from '@/simulation/runner/phases/weaponAttackFiringModeProjectiles';
import {
  CLUSTER_HIT_TABLE as validationTable,
  getClusterHits,
} from '@/types/validation/DamageSystem';

import {
  CLUSTER_HIT_TABLE,
  getNearestClusterSize,
  lookupClusterHits,
} from '../clusterWeapons';
import { lookupClusterHits as resolutionLookup } from '../clusterWeapons/resolution';
import { expectedClusterHits } from '../damage/expectedDamage';

// Actual Compute.calculateClusterHitTableAmount output, not local calculations.
// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587; rolls 2 through 12.
// Repeated JVM output SHA256: 2f587ba37454f0f921b8715df611832c798142b15e31668380dcee9df2c094d2.
const NATIVE_ROWS: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
  [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
  [1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
  [1, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5],
  [2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6],
  [2, 2, 3, 4, 4, 4, 4, 6, 6, 7, 7],
  [2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 8],
  [3, 3, 4, 5, 5, 5, 5, 7, 7, 9, 9],
  [3, 3, 4, 6, 6, 6, 6, 8, 8, 10, 10],
  [4, 4, 5, 7, 7, 7, 7, 9, 9, 11, 11],
  [4, 4, 5, 8, 8, 8, 8, 10, 10, 12, 12],
  [4, 4, 5, 8, 8, 8, 8, 11, 11, 13, 13],
  [5, 5, 6, 9, 9, 9, 9, 11, 11, 14, 14],
  [5, 5, 6, 9, 9, 9, 9, 12, 12, 15, 15],
  [5, 5, 7, 10, 10, 10, 10, 13, 13, 16, 16],
  [5, 5, 7, 10, 10, 10, 10, 14, 14, 17, 17],
  [6, 6, 8, 11, 11, 11, 11, 14, 14, 18, 18],
  [6, 6, 8, 11, 11, 11, 11, 15, 15, 19, 19],
  [6, 6, 9, 12, 12, 12, 12, 16, 16, 20, 20],
];

function launcher(rack: number): IWeapon {
  return {
    id: `lrm-${rack}`,
    name: `LRM ${rack}`,
    damage: rack,
    heat: 1,
    minRange: 0,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    ammoPerTon: -1,
    destroyed: false,
  };
}

describe('native cluster counts for integer racks 1-20', () => {
  it('shares the pure table and lookup through existing public exports', () => {
    expect(validationTable).toBe(CLUSTER_HIT_TABLE);
    expect(resolutionLookup).toBe(lookupClusterHits);
  });

  describe.each(NATIVE_ROWS.map((hits, index) => ({ rack: index + 1, hits })))(
    'rack $rack',
    ({ rack, hits }) => {
      it.each(hits.map((count, index) => ({ roll: index + 2, count })))(
        'roll $roll yields $count native hits through the shared consumers',
        ({ roll, count }) => {
          expect(lookupClusterHits(roll, rack)).toBe(count);
          expect(resolutionLookup(roll, rack)).toBe(count);
          expect(getClusterHits(roll, rack)).toBe(count);
          const weapon = launcher(rack);
          const firstDie = Math.min(6, roll - 1);
          const d6Roller = jest
            .fn()
            .mockReturnValueOnce(firstDie)
            .mockReturnValueOnce(roll - firstDie);
          const result = resolveSpecialProjectileHit({
            baseWeapon: weapon,
            shotWeapon: weapon,
            selectedMode: undefined,
            d6Roller,
          });
          expect(result.projectileCount).toBe(count);
          expect(result.weapon.damage).toBe(count);
          expect(result.weapon.damage).toBeLessThanOrEqual(rack);
          expect(d6Roller).toHaveBeenCalledTimes(2);
        },
      );

      it('uses the native column for the expected-damage cache and integer-roll clamps', () => {
        const weights = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
        const mean =
          hits.reduce((sum, count, i) => sum + count * weights[i], 0) / 36;
        expect(expectedClusterHits[rack]).toBeCloseTo(mean, 12);
        expect(getNearestClusterSize(rack)).toBe(rack);
        expect(lookupClusterHits(-5, rack)).toBe(hits[0]);
        expect(lookupClusterHits(25, rack)).toBe(hits[10]);
        expect(getClusterHits(1, rack)).toBe(0);
        expect(getClusterHits(13, rack)).toBe(0);
      });
    },
  );

  it.each([
    [-1, 2],
    [0, 2],
    [0.5, 2],
    [1.5, 2],
    [2.5, 3],
    [10.5, 12],
    [12.5, 15],
    [15.5, 20],
    [19.5, 20],
    [21, 20],
    [40, 20],
    [Infinity, 20],
    [-Infinity, 2],
    [NaN, 20],
  ])('preserves gameplay fallback selection for %s', (size, selected) => {
    expect(getNearestClusterSize(size)).toBe(selected);
  });

  it('retains validation floor selection over the expanded columns', () => {
    expect(getClusterHits(12, 13.5)).toBe(13);
    expect(getClusterHits(12, 0)).toBe(1);
    expect(getClusterHits(12, 40)).toBe(20);
    expect(getClusterHits(1.5, 10)).toBe(0);
  });
});
