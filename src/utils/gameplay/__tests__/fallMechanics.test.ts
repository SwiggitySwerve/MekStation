import { Facing } from '@/types/gameplay';

import {
  calculateFallDamage,
  splitIntoClusters,
  determineFallDirection,
  getNewFacingFromFall,
  applyFallDamage,
  resolveFall,
  FallDirection,
} from '../fallMechanics';

function makeDiceSequence(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('Fall Mechanics', () => {
  describe('calculateFallDamage', () => {
    it('should calculate 80-ton mech fall from standing (height 0)', () => {
      // ceil(80/10) * (0+1) = 8 * 1 = 8
      expect(calculateFallDamage(80, 0)).toBe(8);
    });

    it('should calculate 60-ton mech fall from elevation 2', () => {
      // ceil(60/10) * (2+1) = 6 * 3 = 18
      expect(calculateFallDamage(60, 2)).toBe(18);
    });

    it('should calculate 20-ton mech fall from standing', () => {
      // ceil(20/10) * (0+1) = 2 * 1 = 2
      expect(calculateFallDamage(20, 0)).toBe(2);
    });

    it('should calculate 100-ton mech fall from elevation 3', () => {
      // ceil(100/10) * (3+1) = 10 * 4 = 40
      expect(calculateFallDamage(100, 3)).toBe(40);
    });

    it('should handle odd tonnage with ceiling', () => {
      // ceil(75/10) * (0+1) = 8 * 1 = 8
      expect(calculateFallDamage(75, 0)).toBe(8);
    });

    it('should handle 25-ton mech', () => {
      // ceil(25/10) * (0+1) = 3 * 1 = 3
      expect(calculateFallDamage(25, 0)).toBe(3);
    });

    it('should default to height 0 when not specified', () => {
      expect(calculateFallDamage(50)).toBe(5);
    });
  });

  describe('splitIntoClusters', () => {
    it('should split 8 into [5, 3]', () => {
      expect(splitIntoClusters(8)).toEqual([5, 3]);
    });

    it('should split 18 into [5, 5, 5, 3]', () => {
      expect(splitIntoClusters(18)).toEqual([5, 5, 5, 3]);
    });

    it('should split 5 into [5]', () => {
      expect(splitIntoClusters(5)).toEqual([5]);
    });

    it('should split 10 into [5, 5]', () => {
      expect(splitIntoClusters(10)).toEqual([5, 5]);
    });

    it('should split 3 into [3]', () => {
      expect(splitIntoClusters(3)).toEqual([3]);
    });

    it('should split 40 into eight 5-pt clusters', () => {
      const clusters = splitIntoClusters(40);
      expect(clusters).toEqual([5, 5, 5, 5, 5, 5, 5, 5]);
    });

    it('should handle 0 damage', () => {
      expect(splitIntoClusters(0)).toEqual([]);
    });

    it('should handle 1 damage', () => {
      expect(splitIntoClusters(1)).toEqual([1]);
    });
  });

  describe('determineFallDirection', () => {
    const directionTests: Array<{ roll: number; expected: FallDirection }> = [
      { roll: 1, expected: 'front' },
      { roll: 2, expected: 'right' },
      { roll: 3, expected: 'right' },
      { roll: 4, expected: 'rear' },
      { roll: 5, expected: 'left' },
      { roll: 6, expected: 'left' },
    ];

    it.each(directionTests)(
      'should return $expected for D6 roll of $roll',
      ({ roll, expected }) => {
        const roller = makeDiceSequence([roll]);
        const result = determineFallDirection(roller);
        expect(result.direction).toBe(expected);
        expect(result.roll).toBe(roll);
      },
    );
  });

  describe('getNewFacingFromFall', () => {
    it('should keep same facing when falling forward', () => {
      expect(getNewFacingFromFall(Facing.North, 'front')).toBe(Facing.North);
    });

    it('should shift facing right when falling right', () => {
      expect(getNewFacingFromFall(Facing.North, 'right')).toBe(Facing.Northeast);
    });

    it('should reverse facing when falling rear', () => {
      expect(getNewFacingFromFall(Facing.North, 'rear')).toBe(Facing.South);
    });

    it('should shift facing left when falling left', () => {
      expect(getNewFacingFromFall(Facing.North, 'left')).toBe(Facing.Northwest);
    });

    it('should wrap around for south-facing mech falling rear', () => {
      expect(getNewFacingFromFall(Facing.South, 'rear')).toBe(Facing.North);
    });

    it('should handle northeast facing falling left', () => {
      // Northeast (1) + 5 = 6 % 6 = 0 (North)
      expect(getNewFacingFromFall(Facing.Northeast, 'left')).toBe(Facing.North);
    });
  });

  describe('applyFallDamage', () => {
    it('should return correct number of clusters', () => {
      // 80-ton from standing = 8 damage = 2 clusters
      const roller = makeDiceSequence([3, 3, 4, 4]); // dice for hit locations
      const clusters = applyFallDamage(80, 0, 'front', roller);
      expect(clusters).toHaveLength(2);
      expect(clusters[0].damage).toBe(5);
      expect(clusters[1].damage).toBe(3);
    });

    it('should apply each cluster to a hit location', () => {
      const roller = makeDiceSequence([3, 4, 5, 2, 1, 6]);
      const clusters = applyFallDamage(60, 2, 'front', roller);
      // 18 damage = 4 clusters
      expect(clusters).toHaveLength(4);
      for (const cluster of clusters) {
        expect(cluster.location).toBeTruthy();
        expect(cluster.damage).toBeGreaterThan(0);
        expect(cluster.damage).toBeLessThanOrEqual(5);
      }
    });

    it('should use correct hit table for fall direction', () => {
      // Different directions use different hit tables, so different locations
      const rollerFront = makeDiceSequence([6, 6]); // roll 12 on front = head
      const rollerRear = makeDiceSequence([6, 6]); // roll 12 on rear = head

      const frontClusters = applyFallDamage(20, 0, 'front', rollerFront);
      const rearClusters = applyFallDamage(20, 0, 'rear', rollerRear);

      // Both roll 12, which is head on all tables
      expect(frontClusters[0].location).toBe('head');
      expect(rearClusters[0].location).toBe('head');
    });
  });

  describe('resolveFall', () => {
    it('should resolve complete fall for 80-ton mech', () => {
      // D6 for direction: 1=front, then hit location dice
      const roller = makeDiceSequence([1, 3, 4, 5, 2]);
      const result = resolveFall(80, Facing.North, 0, roller);

      expect(result.totalDamage).toBe(8);
      expect(result.clusters).toHaveLength(2);
      expect(result.fallDirection).toBe('front');
      expect(result.newFacing).toBe(Facing.North); // front fall, no change
      expect(result.pilotDamage).toBe(1);
    });

    it('should resolve fall with elevation', () => {
      const roller = makeDiceSequence([4, 3, 3, 4, 4, 5, 5, 3, 3]);
      const result = resolveFall(60, Facing.North, 2, roller);

      expect(result.totalDamage).toBe(18);
      expect(result.clusters).toHaveLength(4); // [5, 5, 5, 3]
      expect(result.fallDirection).toBe('rear'); // roll 4 = rear
      expect(result.newFacing).toBe(Facing.South); // rear fall from North
      expect(result.pilotDamage).toBe(1);
    });

    it('should always deal 1 pilot damage', () => {
      const roller = makeDiceSequence([1, 3, 3]);
      const result = resolveFall(20, Facing.South, 0, roller);
      expect(result.pilotDamage).toBe(1);
    });

    it('should work with default height of 0', () => {
      const roller = makeDiceSequence([2, 3, 4]);
      const result = resolveFall(50, Facing.North, 0, roller);
      expect(result.totalDamage).toBe(5); // ceil(50/10) * 1 = 5
    });
  });

  describe('deterministic fall resolution', () => {
    it('should produce identical results with same dice sequence', () => {
      const roller1 = makeDiceSequence([3, 4, 5, 2, 1]);
      const roller2 = makeDiceSequence([3, 4, 5, 2, 1]);

      const result1 = resolveFall(80, Facing.North, 1, roller1);
      const result2 = resolveFall(80, Facing.North, 1, roller2);

      expect(result1.totalDamage).toBe(result2.totalDamage);
      expect(result1.fallDirection).toBe(result2.fallDirection);
      expect(result1.newFacing).toBe(result2.newFacing);
      expect(result1.clusters.length).toBe(result2.clusters.length);
      for (let i = 0; i < result1.clusters.length; i++) {
        expect(result1.clusters[i].damage).toBe(result2.clusters[i].damage);
        expect(result1.clusters[i].location).toBe(result2.clusters[i].location);
      }
    });
  });
});
