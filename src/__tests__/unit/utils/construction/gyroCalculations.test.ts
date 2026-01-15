import {
  calculateGyroWeight,
  getGyroCriticalSlots,
  validateGyro,
  isGyroCompatibleWithCockpit,
} from '@/utils/construction/gyroCalculations';
import { GyroType } from '@/types/construction/GyroType';

describe('gyroCalculations', () => {
  describe('calculateGyroWeight()', () => {
    it('should calculate gyro weight', () => {
      const weight = calculateGyroWeight(250, GyroType.STANDARD);
      // ceil(250 / 100) * 1.0 = 3 tons
      expect(weight).toBeGreaterThan(0);
    });

    it('should apply compact multiplier', () => {
      const standardWeight = calculateGyroWeight(250, GyroType.STANDARD);
      const compactWeight = calculateGyroWeight(250, GyroType.COMPACT);
      
      expect(compactWeight).toBeGreaterThan(standardWeight);
    });

    it('should return 0 for zero or negative rating', () => {
      expect(calculateGyroWeight(0, GyroType.STANDARD)).toBe(0);
      expect(calculateGyroWeight(-1, GyroType.STANDARD)).toBe(0);
    });

    it('should handle unknown gyro type', () => {
      expect(calculateGyroWeight(250, 'INVALID' as any)).toBe(Math.ceil(250 / 100));
    });
  });

  describe('getGyroCriticalSlots()', () => {
    it('should return critical slots for standard gyro', () => {
      const slots = getGyroCriticalSlots(GyroType.STANDARD);
      expect(slots).toBe(4);
    });

    it('should return critical slots for compact gyro', () => {
      const slots = getGyroCriticalSlots(GyroType.COMPACT);
      expect(slots).toBeGreaterThan(0);
    });

    it('should return default 4 for unknown gyro type', () => {
      expect(getGyroCriticalSlots('INVALID' as any)).toBe(4);
    });
  });

  describe('validateGyro()', () => {
    it('should validate correct gyro', () => {
      const result = validateGyro(GyroType.STANDARD, 250);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject zero or negative engine rating', () => {
      const result = validateGyro(GyroType.STANDARD, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject unknown gyro type', () => {
      const result = validateGyro('INVALID' as any, 250);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unknown gyro type');
    });
  });

  describe('isGyroCompatibleWithCockpit()', () => {
    it('should check compatibility', () => {
      const compatible = isGyroCompatibleWithCockpit(GyroType.STANDARD, 'Standard');
      expect(compatible).toBe(true);
    });

    it('should handle compact gyro', () => {
      const compatible = isGyroCompatibleWithCockpit(GyroType.COMPACT, 'Standard');
      expect(compatible).toBeDefined();
    });
  });
});
