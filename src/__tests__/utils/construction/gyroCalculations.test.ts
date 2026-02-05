/**
 * Tests for Gyro Calculations
 *
 * @spec openspec/specs/gyro-system/spec.md
 */

import { GyroType } from '@/types/construction/GyroType';
import {
  calculateGyroWeight,
  getGyroCriticalSlots,
  validateGyro,
  isGyroCompatibleWithCockpit,
} from '@/utils/construction/gyroCalculations';

describe('Gyro Calculations', () => {
  describe('calculateGyroWeight', () => {
    it('should return 0 for engine rating <= 0', () => {
      expect(calculateGyroWeight(0, GyroType.STANDARD)).toBe(0);
      expect(calculateGyroWeight(-100, GyroType.STANDARD)).toBe(0);
    });

    it('should calculate standard gyro weight correctly', () => {
      // 100 rating -> ceil(100/100) = 1 ton
      expect(calculateGyroWeight(100, GyroType.STANDARD)).toBe(1);

      // 200 rating -> ceil(200/100) = 2 tons
      expect(calculateGyroWeight(200, GyroType.STANDARD)).toBe(2);

      // 300 rating -> ceil(300/100) = 3 tons
      expect(calculateGyroWeight(300, GyroType.STANDARD)).toBe(3);
    });

    it('should round up engine rating to nearest 100', () => {
      // 150 rating -> ceil(150/100) = 2 tons
      expect(calculateGyroWeight(150, GyroType.STANDARD)).toBe(2);

      // 250 rating -> ceil(250/100) = 3 tons
      expect(calculateGyroWeight(250, GyroType.STANDARD)).toBe(3);
    });

    it('should apply weight multiplier for XL gyro', () => {
      // XL gyro has 0.5x weight multiplier
      // 200 rating -> ceil(200/100) = 2, then 2 * 0.5 = 1 ton
      const weight = calculateGyroWeight(200, GyroType.XL);
      expect(weight).toBeLessThan(2);
    });

    it('should apply weight multiplier for compact gyro', () => {
      // Compact gyro has 1.5x weight multiplier
      // 200 rating -> ceil(200/100) = 2, then 2 * 1.5 = 3 tons
      const weight = calculateGyroWeight(200, GyroType.COMPACT);
      expect(weight).toBe(3);
    });

    it('should apply weight multiplier for heavy-duty gyro', () => {
      // Heavy-duty gyro has 2x weight multiplier
      // 200 rating -> ceil(200/100) = 2, then 2 * 2 = 4 tons
      const weight = calculateGyroWeight(200, GyroType.HEAVY_DUTY);
      expect(weight).toBe(4);
    });
  });

  describe('getGyroCriticalSlots', () => {
    it('should return 4 slots for standard gyro', () => {
      expect(getGyroCriticalSlots(GyroType.STANDARD)).toBe(4);
    });

    it('should return 6 slots for XL gyro', () => {
      expect(getGyroCriticalSlots(GyroType.XL)).toBe(6);
    });

    it('should return 2 slots for compact gyro', () => {
      expect(getGyroCriticalSlots(GyroType.COMPACT)).toBe(2);
    });

    it('should return 4 slots for heavy-duty gyro', () => {
      expect(getGyroCriticalSlots(GyroType.HEAVY_DUTY)).toBe(4);
    });
  });

  describe('validateGyro', () => {
    it('should pass for valid gyro configuration', () => {
      const result = validateGyro(GyroType.STANDARD, 200);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for engine rating <= 0', () => {
      const result = validateGyro(GyroType.STANDARD, 0);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Engine rating'))).toBe(true);
    });

    it('should fail for negative engine rating', () => {
      const result = validateGyro(GyroType.STANDARD, -100);

      expect(result.isValid).toBe(false);
    });
  });

  describe('isGyroCompatibleWithCockpit', () => {
    it('should return true for standard gyro with standard cockpit', () => {
      expect(isGyroCompatibleWithCockpit(GyroType.STANDARD, 'Standard')).toBe(
        true,
      );
    });

    it('should return true for compact gyro with standard cockpit', () => {
      expect(isGyroCompatibleWithCockpit(GyroType.COMPACT, 'Standard')).toBe(
        true,
      );
    });

    it('should return true for XL gyro with standard cockpit', () => {
      expect(isGyroCompatibleWithCockpit(GyroType.XL, 'Standard')).toBe(true);
    });

    it('should return true for heavy-duty gyro with standard cockpit', () => {
      expect(isGyroCompatibleWithCockpit(GyroType.HEAVY_DUTY, 'Standard')).toBe(
        true,
      );
    });
  });
});
