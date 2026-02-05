/**
 * Tests for armor auto-allocation algorithm
 *
 * @spec openspec/specs/armor-system/spec.md
 */

import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  calculateOptimalArmorAllocation,
  getMaxTotalArmor,
} from '@/utils/construction/armorCalculations';

describe('calculateOptimalArmorAllocation', () => {
  describe('MegaMekLab distribution matching', () => {
    it('should allocate 32 points (2 tons) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(32, 50);

      // Head=8, CT=3+1=4, LT/RT=4+1=5 each (75/25 split), LA/RA=2 each, LL/RL=3 each
      expect(result.head).toBe(8);
      expect(result.centerTorsoFront).toBe(3);
      expect(result.centerTorsoRear).toBe(1);
      expect(result.leftTorsoFront).toBe(4);
      expect(result.rightTorsoFront).toBe(4);
      expect(result.leftTorsoRear).toBe(1);
      expect(result.rightTorsoRear).toBe(1);
      expect(result.leftArm).toBe(2);
      expect(result.rightArm).toBe(2);
      expect(result.leftLeg).toBe(3);
      expect(result.rightLeg).toBe(3);
      expect(result.totalAllocated).toBe(32);
      expect(result.unallocated).toBe(0);
    });

    it('should allocate 80 points (5 tons) with head maxed at 9', () => {
      const result = calculateOptimalArmorAllocation(80, 50);

      // Head should be maxed
      expect(result.head).toBe(9);
      // Should have no unallocated points
      expect(result.unallocated).toBe(0);
      expect(result.totalAllocated).toBe(80);
    });

    it('should allocate 160 points (10 tons) with valid distribution', () => {
      const result = calculateOptimalArmorAllocation(160, 50);

      // Verify total allocation and no waste
      expect(result.totalAllocated).toBe(160);
      expect(result.unallocated).toBe(0);

      // Head should be maxed at high armor levels
      expect(result.head).toBe(9);

      // CT should have substantial armor (front > rear)
      expect(result.centerTorsoFront).toBeGreaterThan(result.centerTorsoRear);
      expect(result.centerTorsoFront + result.centerTorsoRear).toBeGreaterThan(
        20,
      );

      // Symmetry must be maintained
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
      expect(result.leftTorsoRear).toBe(result.rightTorsoRear);
      expect(result.leftArm).toBe(result.rightArm);
      expect(result.leftLeg).toBe(result.rightLeg);
    });

    it('should allocate 152 points (9.5 tons) with valid distribution', () => {
      const result = calculateOptimalArmorAllocation(152, 50);

      // Verify total allocation and no waste
      expect(result.totalAllocated).toBe(152);
      expect(result.unallocated).toBe(0);

      // Head should be maxed
      expect(result.head).toBe(9);

      // CT should be well protected
      expect(result.centerTorsoFront + result.centerTorsoRear).toBeGreaterThan(
        18,
      );

      // Symmetry must be maintained
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
      expect(result.leftArm).toBe(result.rightArm);
      expect(result.leftLeg).toBe(result.rightLeg);
    });

    it('should allocate 168 points (10.5 tons) with valid distribution', () => {
      const result = calculateOptimalArmorAllocation(168, 50);

      // Verify total allocation and no waste
      expect(result.totalAllocated).toBe(168);
      expect(result.unallocated).toBe(0);

      // Head should be maxed
      expect(result.head).toBe(9);

      // CT should have front/rear split
      expect(result.centerTorsoFront).toBeGreaterThan(0);
      expect(result.centerTorsoRear).toBeGreaterThan(0);

      // Symmetry must be maintained
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
      expect(result.leftTorsoRear).toBe(result.rightTorsoRear);
      expect(result.leftArm).toBe(result.rightArm);
      expect(result.leftLeg).toBe(result.rightLeg);
    });

    it('should allocate 169 points (max armor) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(169, 50);

      // Expected from MegaMekLab screenshot (max armor):
      // HD=9, LA/RA=16, LT/RT=18+6=24, CT=24+8=32, LL/RL=24
      expect(result.head).toBe(9);
      expect(result.centerTorsoFront).toBe(24);
      expect(result.centerTorsoRear).toBe(8);
      expect(result.leftTorsoFront).toBe(18);
      expect(result.rightTorsoFront).toBe(18);
      expect(result.leftTorsoRear).toBe(6);
      expect(result.rightTorsoRear).toBe(6);
      expect(result.leftArm).toBe(16);
      expect(result.rightArm).toBe(16);
      expect(result.leftLeg).toBe(24);
      expect(result.rightLeg).toBe(24);
      expect(result.totalAllocated).toBe(169);
      expect(result.unallocated).toBe(0);
    });
  });

  describe('symmetry enforcement', () => {
    it('should maintain symmetry for paired locations', () => {
      const result = calculateOptimalArmorAllocation(100, 50);

      // Side torsos should be symmetric (front)
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
      // Arms should be symmetric
      expect(result.leftArm).toBe(result.rightArm);
      // Legs should be symmetric
      expect(result.leftLeg).toBe(result.rightLeg);
    });

    it('should maintain rear torso symmetry', () => {
      const result = calculateOptimalArmorAllocation(150, 50);

      expect(result.leftTorsoRear).toBe(result.rightTorsoRear);
    });
  });

  describe('no unallocated points', () => {
    it('should have 0 unallocated when points < max armor', () => {
      // Test various point values
      const testCases = [16, 32, 48, 64, 80, 96, 112, 128, 144, 160];

      for (const points of testCases) {
        const result = calculateOptimalArmorAllocation(points, 50);
        expect(result.unallocated).toBe(0);
        expect(result.totalAllocated).toBe(points);
      }
    });

    it('should not leave 1 point unallocated for odd point values', () => {
      // Test odd point values which could leave 1 point due to symmetry
      const oddTestCases = [17, 33, 49, 65, 81, 97, 113, 129, 145, 161];

      for (const points of oddTestCases) {
        const maxArmor = getMaxTotalArmor(50);
        const effectivePoints = Math.min(points, maxArmor);
        const result = calculateOptimalArmorAllocation(points, 50);

        // Should allocate all available points (up to max)
        expect(result.totalAllocated).toBe(effectivePoints);
        // Unallocated should only be excess above max armor
        expect(result.unallocated).toBe(Math.max(0, points - maxArmor));
      }
    });
  });

  describe('maximum armor capping', () => {
    it('should cap allocation at max armor for mech', () => {
      const maxArmor = getMaxTotalArmor(50); // 169 for 50-ton
      const result = calculateOptimalArmorAllocation(200, 50);

      expect(result.totalAllocated).toBe(maxArmor);
      expect(result.unallocated).toBe(200 - maxArmor);
    });

    it('should cap head at 9 points', () => {
      const result = calculateOptimalArmorAllocation(169, 50);
      expect(result.head).toBe(9);
    });
  });

  describe('edge cases', () => {
    it('should handle 0 points', () => {
      const result = calculateOptimalArmorAllocation(0, 50);

      expect(result.totalAllocated).toBe(0);
      expect(result.head).toBe(0);
      expect(result.centerTorsoFront).toBe(0);
    });

    it('should handle 1 point', () => {
      const result = calculateOptimalArmorAllocation(1, 50);

      expect(result.totalAllocated).toBe(1);
      expect(result.unallocated).toBe(0);
    });

    it('should handle points equal to max armor', () => {
      const maxArmor = getMaxTotalArmor(50);
      const result = calculateOptimalArmorAllocation(maxArmor, 50);

      expect(result.totalAllocated).toBe(maxArmor);
      expect(result.unallocated).toBe(0);
    });

    it('should work for different mech tonnages', () => {
      const tonnages = [20, 35, 50, 75, 100];

      for (const tonnage of tonnages) {
        const maxArmor = getMaxTotalArmor(tonnage);
        const result = calculateOptimalArmorAllocation(maxArmor, tonnage);

        expect(result.totalAllocated).toBe(maxArmor);
        expect(result.unallocated).toBe(0);
      }
    });
  });

  describe('front/rear torso split', () => {
    it('should have ~75/25 split for CT at high armor levels', () => {
      const result = calculateOptimalArmorAllocation(169, 50);

      const ctTotal = result.centerTorsoFront + result.centerTorsoRear;
      const frontRatio = result.centerTorsoFront / ctTotal;

      // Front should be roughly 75% (allow 60-90% range)
      expect(frontRatio).toBeGreaterThanOrEqual(0.6);
      expect(frontRatio).toBeLessThanOrEqual(0.9);
    });

    it('should have 75/25 split for side torsos at all armor levels (matching MegaMekLab)', () => {
      const result = calculateOptimalArmorAllocation(32, 50);

      // Side torsos always get 25% rear, same as CT (MegaMekLab behavior)
      const ltTotal = result.leftTorsoFront + result.leftTorsoRear;
      const rtTotal = result.rightTorsoFront + result.rightTorsoRear;

      if (ltTotal > 0) {
        expect(result.leftTorsoRear).toBe(Math.round(ltTotal * 0.25));
        expect(result.rightTorsoRear).toBe(Math.round(rtTotal * 0.25));
      }
    });
  });
});

describe('calculateOptimalArmorAllocation - Quad Configuration', () => {
  describe('location allocation', () => {
    it('should allocate to quad-specific leg locations', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.QUAD,
      );

      expect(result.frontLeftLeg).toBeGreaterThan(0);
      expect(result.frontRightLeg).toBeGreaterThan(0);
      expect(result.rearLeftLeg).toBeGreaterThan(0);
      expect(result.rearRightLeg).toBeGreaterThan(0);

      expect(result.leftArm).toBe(0);
      expect(result.rightArm).toBe(0);
      expect(result.leftLeg).toBe(0);
      expect(result.rightLeg).toBe(0);
    });

    it('should maintain symmetry for quad legs', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.QUAD,
      );

      expect(result.frontLeftLeg).toBe(result.frontRightLeg);
      expect(result.rearLeftLeg).toBe(result.rearRightLeg);
    });

    it('should allocate head and torsos like biped', () => {
      const result = calculateOptimalArmorAllocation(
        100,
        50,
        MechConfiguration.QUAD,
      );

      expect(result.head).toBeGreaterThan(0);
      expect(result.centerTorsoFront).toBeGreaterThan(0);
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
    });
  });

  describe('no unallocated points', () => {
    it('should have 0 unallocated when points < max armor', () => {
      const testCases = [32, 64, 96, 128, 160];

      for (const points of testCases) {
        const result = calculateOptimalArmorAllocation(
          points,
          50,
          MechConfiguration.QUAD,
        );
        expect(result.unallocated).toBe(0);
        expect(result.totalAllocated).toBe(points);
      }
    });
  });

  describe('max armor calculation', () => {
    it('should calculate correct max armor for quad', () => {
      const maxArmor = getMaxTotalArmor(50, MechConfiguration.QUAD);
      const result = calculateOptimalArmorAllocation(
        maxArmor,
        50,
        MechConfiguration.QUAD,
      );

      expect(result.totalAllocated).toBe(maxArmor);
      expect(result.unallocated).toBe(0);
    });
  });
});

describe('calculateOptimalArmorAllocation - Tripod Configuration', () => {
  describe('location allocation', () => {
    it('should allocate to tripod-specific center leg', () => {
      const result = calculateOptimalArmorAllocation(
        180,
        50,
        MechConfiguration.TRIPOD,
      );

      expect(result.centerLeg).toBeGreaterThan(0);
      expect(result.leftLeg).toBeGreaterThan(0);
      expect(result.rightLeg).toBeGreaterThan(0);
      expect(result.leftArm).toBeGreaterThan(0);
      expect(result.rightArm).toBeGreaterThan(0);

      expect(result.frontLeftLeg).toBe(0);
      expect(result.frontRightLeg).toBe(0);
    });

    it('should maintain symmetry for legs and arms', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.TRIPOD,
      );

      expect(result.leftLeg).toBe(result.rightLeg);
      expect(result.leftArm).toBe(result.rightArm);
    });
  });

  describe('no unallocated points', () => {
    it('should have 0 unallocated when points < max armor', () => {
      const testCases = [32, 64, 96, 128, 160];

      for (const points of testCases) {
        const result = calculateOptimalArmorAllocation(
          points,
          50,
          MechConfiguration.TRIPOD,
        );
        expect(result.unallocated).toBe(0);
        expect(result.totalAllocated).toBe(points);
      }
    });
  });

  describe('max armor calculation', () => {
    it('should calculate correct max armor for tripod (higher than biped)', () => {
      const bipedMax = getMaxTotalArmor(50, MechConfiguration.BIPED);
      const tripodMax = getMaxTotalArmor(50, MechConfiguration.TRIPOD);

      expect(tripodMax).toBeGreaterThan(bipedMax);

      const result = calculateOptimalArmorAllocation(
        tripodMax,
        50,
        MechConfiguration.TRIPOD,
      );
      expect(result.totalAllocated).toBe(tripodMax);
      expect(result.unallocated).toBe(0);
    });
  });
});

describe('calculateOptimalArmorAllocation - LAM Configuration', () => {
  describe('location allocation', () => {
    it('should allocate like biped for LAM mech mode', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.LAM,
      );

      expect(result.leftArm).toBeGreaterThan(0);
      expect(result.rightArm).toBeGreaterThan(0);
      expect(result.leftLeg).toBeGreaterThan(0);
      expect(result.rightLeg).toBeGreaterThan(0);

      expect(result.centerLeg).toBe(0);
      expect(result.frontLeftLeg).toBe(0);
    });

    it('should maintain symmetry like biped', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.LAM,
      );

      expect(result.leftArm).toBe(result.rightArm);
      expect(result.leftLeg).toBe(result.rightLeg);
      expect(result.leftTorsoFront).toBe(result.rightTorsoFront);
    });
  });
});

describe('calculateOptimalArmorAllocation - QuadVee Configuration', () => {
  describe('location allocation', () => {
    it('should allocate like quad', () => {
      const result = calculateOptimalArmorAllocation(
        150,
        50,
        MechConfiguration.QUADVEE,
      );

      expect(result.frontLeftLeg).toBeGreaterThan(0);
      expect(result.frontRightLeg).toBeGreaterThan(0);
      expect(result.rearLeftLeg).toBeGreaterThan(0);
      expect(result.rearRightLeg).toBeGreaterThan(0);

      expect(result.leftArm).toBe(0);
      expect(result.rightArm).toBe(0);
    });
  });

  describe('max armor calculation', () => {
    it('should have same max as quad', () => {
      const quadMax = getMaxTotalArmor(50, MechConfiguration.QUAD);
      const quadveeMax = getMaxTotalArmor(50, MechConfiguration.QUADVEE);

      expect(quadveeMax).toBe(quadMax);
    });
  });
});

describe('getMaxTotalArmor - configuration support', () => {
  it('should return different max armor for different configurations', () => {
    const biped = getMaxTotalArmor(50, MechConfiguration.BIPED);
    const tripod = getMaxTotalArmor(50, MechConfiguration.TRIPOD);

    expect(tripod).toBeGreaterThan(biped);
  });

  it('should default to biped when no configuration specified', () => {
    const defaultMax = getMaxTotalArmor(50);
    const bipedMax = getMaxTotalArmor(50, MechConfiguration.BIPED);

    expect(defaultMax).toBe(bipedMax);
  });
});
