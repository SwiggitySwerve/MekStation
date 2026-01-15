import {
  getRecommendedArmorDistribution,
  validateLocationArmor,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  calculateArmorWeight,
  calculateArmorPoints,
  getArmorCriticalSlots,
  calculateOptimalArmorAllocation,
  calculateArmorCost,
  getExpectedArmorCapacity,
  getArmorFillPercent,
} from '@/utils/construction/armorCalculations';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

describe('armorCalculations utilities', () => {
  describe('getRecommendedArmorDistribution()', () => {
    it('should return distribution percentages', () => {
      const distribution = getRecommendedArmorDistribution();
      
      expect(distribution.head).toBe(0.05);
      expect(distribution.centerTorso).toBe(0.20);
      expect(distribution.leftTorso).toBe(0.12);
      expect(distribution.rightTorso).toBe(0.12);
      expect(distribution.leftArm).toBe(0.10);
      expect(distribution.rightArm).toBe(0.10);
      expect(distribution.leftLeg).toBe(0.10);
      expect(distribution.rightLeg).toBe(0.10);
    });

    it('should include rear armor percentages', () => {
      const distribution = getRecommendedArmorDistribution();
      
      expect(distribution.centerTorsoRear).toBe(0.05);
      expect(distribution.leftTorsoRear).toBe(0.03);
      expect(distribution.rightTorsoRear).toBe(0.03);
    });
  });

  describe('validateLocationArmor()', () => {
    it('should validate correct armor values', () => {
      const result = validateLocationArmor(50, 'head', 9);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject armor exceeding max for head', () => {
      const result = validateLocationArmor(50, 'head', 10);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate torso front armor', () => {
      const result = validateLocationArmor(50, 'centerTorso', 20, 5);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject torso armor exceeding max', () => {
      const max = getMaxArmorForLocation(50, 'centerTorso');
      const result = validateLocationArmor(50, 'centerTorso', max + 1, 0);
      
      expect(result.isValid).toBe(false);
    });

    it('should validate rear armor', () => {
      const result = validateLocationArmor(50, 'leftTorso', 12, 4);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject negative armor values', () => {
      expect(validateLocationArmor(50, 'head', -1).isValid).toBe(false);
      expect(validateLocationArmor(50, 'centerTorso', 10, -1).isValid).toBe(false);
    });

    it('should reject rear armor for non-torso locations', () => {
      const result = validateLocationArmor(50, 'leftArm', 10, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('does not support rear armor');
    });
  });

  describe('getMaxArmorForLocation()', () => {
    it('should return 9 for head regardless of tonnage', () => {
      expect(getMaxArmorForLocation(20, 'head')).toBe(9);
      expect(getMaxArmorForLocation(100, 'head')).toBe(9);
    });

    it('should return 2x structure for non-head locations', () => {
      // 50-ton mech has 5 structure points per location (standard)
      const max = getMaxArmorForLocation(50, 'centerTorso');
      expect(max).toBeGreaterThan(0);
    });

    it('should scale with tonnage', () => {
      const lightMax = getMaxArmorForLocation(20, 'centerTorso');
      const heavyMax = getMaxArmorForLocation(75, 'centerTorso');
      
      expect(heavyMax).toBeGreaterThan(lightMax);
    });
  });

  describe('getMaxTotalArmor()', () => {
    it('should calculate max total armor for a mech', () => {
      const max = getMaxTotalArmor(50);
      expect(max).toBeGreaterThan(0);
    });

    it('should support different configurations', () => {
      const bipedMax = getMaxTotalArmor(50, MechConfiguration.BIPED);
      const quadMax = getMaxTotalArmor(50, MechConfiguration.QUAD);
      expect(quadMax).toBeGreaterThan(bipedMax); // Quads have more leg structure than arms
    });
  });

  describe('calculateArmorWeight()', () => {
    it('should calculate weight for standard armor', () => {
      // 16 points per ton
      expect(calculateArmorWeight(16, ArmorTypeEnum.STANDARD)).toBe(1);
      expect(calculateArmorWeight(8, ArmorTypeEnum.STANDARD)).toBe(0.5);
    });

    it('should handle unknown armor type by defaulting to standard', () => {
      expect(calculateArmorWeight(16, 'INVALID' as any)).toBe(1);
    });
  });

  describe('calculateArmorPoints()', () => {
    it('should calculate points for standard armor', () => {
      expect(calculateArmorPoints(1, ArmorTypeEnum.STANDARD)).toBe(16);
    });

    it('should handle unknown armor type', () => {
      expect(calculateArmorPoints(1, 'INVALID' as any)).toBe(16);
    });
  });

  describe('getArmorCriticalSlots()', () => {
    it('should return 0 for standard armor', () => {
      expect(getArmorCriticalSlots(ArmorTypeEnum.STANDARD)).toBe(0);
    });

    it('should return correct slots for special armor', () => {
      expect(getArmorCriticalSlots(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimalArmorAllocation()', () => {
    it('should allocate armor for Biped', () => {
      const result = calculateOptimalArmorAllocation(100, 50, MechConfiguration.BIPED);
      expect(result.totalAllocated).toBeLessThanOrEqual(100);
      expect(result.head).toBeGreaterThan(0);
      expect(result.centerTorsoFront).toBeGreaterThan(0);
    });

    it('should allocate armor for Quad', () => {
      const result = calculateOptimalArmorAllocation(100, 50, MechConfiguration.QUAD);
      expect(result.totalAllocated).toBeLessThanOrEqual(100);
      expect(result.frontLeftLeg).toBeGreaterThan(0);
    });

    it('should allocate armor for Tripod', () => {
      const result = calculateOptimalArmorAllocation(100, 50, MechConfiguration.TRIPOD);
      expect(result.totalAllocated).toBeLessThanOrEqual(100);
      expect(result.centerLeg).toBeGreaterThan(0);
    });

    it('should handle high armor values by capping at max', () => {
      const max = getMaxTotalArmor(50);
      const result = calculateOptimalArmorAllocation(1000, 50);
      expect(result.totalAllocated).toBe(max);
    });
  });

  describe('calculateArmorCost()', () => {
    it('should calculate cost for standard armor', () => {
      expect(calculateArmorCost(10, ArmorTypeEnum.STANDARD)).toBe(10 * 10000);
    });
  });

  describe('UI helpers', () => {
    it('getExpectedArmorCapacity should return 75/25 split', () => {
      const capacity = getExpectedArmorCapacity(100);
      expect(capacity.front).toBe(75);
      expect(capacity.rear).toBe(25);
    });

    it('getArmorFillPercent should calculate percentage', () => {
      expect(getArmorFillPercent(50, 100)).toBe(50);
      expect(getArmorFillPercent(120, 100)).toBe(120);
      expect(getArmorFillPercent(50, 0)).toBe(0);
    });
  });
});
