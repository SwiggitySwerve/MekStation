/**
 * Tests for armor auto-allocation algorithm
 * 
 * @spec openspec/specs/armor-system/spec.md
 */

import { 
  calculateOptimalArmorAllocation,
  getMaxTotalArmor,
} from '@/utils/construction/armorCalculations';

describe('calculateOptimalArmorAllocation', () => {
  describe('MegaMekLab distribution matching', () => {
    it('should allocate 32 points (2 tons) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(32, 50);
      
      // Expected: Head=8, CT=3+1=4, LT/RT=5 each, LA/RA=2 each, LL/RL=3 each
      expect(result.head).toBe(8);
      expect(result.centerTorsoFront).toBe(3);
      expect(result.centerTorsoRear).toBe(1);
      expect(result.leftTorsoFront).toBe(5);
      expect(result.rightTorsoFront).toBe(5);
      expect(result.leftTorsoRear).toBe(0);
      expect(result.rightTorsoRear).toBe(0);
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

    it('should allocate 160 points (10 tons) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(160, 50);
      
      // Expected from MegaMekLab screenshot:
      // HD=9, LA/RA=15, LT/RT=18+5=23, CT=24+7=31, LL/RL=22
      expect(result.head).toBe(9);
      expect(result.centerTorsoFront).toBe(24);
      expect(result.centerTorsoRear).toBe(7);
      expect(result.leftTorsoFront).toBe(18);
      expect(result.rightTorsoFront).toBe(18);
      expect(result.leftTorsoRear).toBe(5);
      expect(result.rightTorsoRear).toBe(5);
      expect(result.leftArm).toBe(15);
      expect(result.rightArm).toBe(15);
      expect(result.leftLeg).toBe(22);
      expect(result.rightLeg).toBe(22);
      expect(result.totalAllocated).toBe(160);
      expect(result.unallocated).toBe(0);
    });

    it('should allocate 152 points (9.5 tons) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(152, 50);
      
      // Expected from MegaMekLab screenshot:
      // HD=9, LA/RA=14, LT/RT=17+5=22, CT=22+7=29, LL/RL=21
      expect(result.head).toBe(9);
      expect(result.centerTorsoFront).toBe(22);
      expect(result.centerTorsoRear).toBe(7);
      expect(result.leftTorsoFront).toBe(17);
      expect(result.rightTorsoFront).toBe(17);
      expect(result.leftTorsoRear).toBe(5);
      expect(result.rightTorsoRear).toBe(5);
      expect(result.leftArm).toBe(14);
      expect(result.rightArm).toBe(14);
      expect(result.leftLeg).toBe(21);
      expect(result.rightLeg).toBe(21);
      expect(result.totalAllocated).toBe(152);
      expect(result.unallocated).toBe(0);
    });

    it('should allocate 168 points (10.5 tons) matching MegaMekLab pattern', () => {
      const result = calculateOptimalArmorAllocation(168, 50);
      
      // Expected from MegaMekLab screenshot:
      // HD=9, LA/RA=16, LT/RT=19+5=24, CT=24+7=31, LL/RL=24
      expect(result.head).toBe(9);
      expect(result.centerTorsoFront).toBe(24);
      expect(result.centerTorsoRear).toBe(7);
      expect(result.leftTorsoFront).toBe(19);
      expect(result.rightTorsoFront).toBe(19);
      expect(result.leftTorsoRear).toBe(5);
      expect(result.rightTorsoRear).toBe(5);
      expect(result.leftArm).toBe(16);
      expect(result.rightArm).toBe(16);
      expect(result.leftLeg).toBe(24);
      expect(result.rightLeg).toBe(24);
      expect(result.totalAllocated).toBe(168);
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

    it('should have all front for side torsos at low armor levels', () => {
      const result = calculateOptimalArmorAllocation(32, 50);
      
      // At low levels, side torso rear should be 0
      expect(result.leftTorsoRear).toBe(0);
      expect(result.rightTorsoRear).toBe(0);
    });
  });
});

