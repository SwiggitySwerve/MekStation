import { describe, it, expect } from '@jest/globals';
import { Money } from '@/types/campaign/Money';
import {
  TECH_PRICE_MULTIPLIER,
  CONDITION_MULTIPLIER,
  calculateUnitPrice,
  calculatePartPrice,
} from '../priceService';

describe('priceService', () => {
  describe('TECH_PRICE_MULTIPLIER', () => {
    it('should have correct unit multipliers', () => {
      expect(TECH_PRICE_MULTIPLIER.common.unit).toBe(1.0);
      expect(TECH_PRICE_MULTIPLIER.innerSphere.unit).toBe(1.0);
      expect(TECH_PRICE_MULTIPLIER.clan.unit).toBe(2.0);
      expect(TECH_PRICE_MULTIPLIER.mixed.unit).toBe(1.5);
    });

    it('should have correct part multipliers', () => {
      expect(TECH_PRICE_MULTIPLIER.common.part).toBe(1.0);
      expect(TECH_PRICE_MULTIPLIER.innerSphere.part).toBe(1.0);
      expect(TECH_PRICE_MULTIPLIER.clan.part).toBe(2.0);
      expect(TECH_PRICE_MULTIPLIER.mixed.part).toBe(1.5);
    });
  });

  describe('CONDITION_MULTIPLIER', () => {
    it('should have correct condition multipliers', () => {
      expect(CONDITION_MULTIPLIER.new).toBe(1.0);
      expect(CONDITION_MULTIPLIER.used).toBe(0.5);
      expect(CONDITION_MULTIPLIER.damaged).toBe(0.33);
      expect(CONDITION_MULTIPLIER.unrepairable).toBe(0.1);
      expect(CONDITION_MULTIPLIER.cancelledOrder).toBe(0.5);
    });
  });

  describe('calculateUnitPrice', () => {
    it('should calculate Clan unit at new condition', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'clan', 'new');
      expect(result.amount).toBe(200000);
    });

    it('should calculate Inner Sphere unit at damaged condition', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'innerSphere', 'damaged');
      expect(result.amount).toBeCloseTo(33000, 0);
    });

    it('should calculate common unit at used condition', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'common', 'used');
      expect(result.amount).toBe(50000);
    });

    it('should calculate mixed tech unit at unrepairable condition', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'mixed', 'unrepairable');
      expect(result.amount).toBeCloseTo(15000, 0);
    });

    it('should handle unknown tech base with default multiplier', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'unknown', 'new');
      expect(result.amount).toBe(100000);
    });

    it('should handle unknown condition with default multiplier', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'clan', 'unknown');
      expect(result.amount).toBe(200000);
    });

    it('should apply combined multipliers correctly', () => {
      const basePrice = new Money(100000);
      const result = calculateUnitPrice(basePrice, 'clan', 'damaged');
      expect(result.amount).toBeCloseTo(66000, 0);
    });
  });

  describe('calculatePartPrice', () => {
    it('should calculate Clan part at new condition', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'clan', 'new');
      expect(result.amount).toBe(20000);
    });

    it('should calculate Inner Sphere part at used condition', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'innerSphere', 'used');
      expect(result.amount).toBe(5000);
    });

    it('should calculate common part at damaged condition', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'common', 'damaged');
      expect(result.amount).toBeCloseTo(3300, 0);
    });

    it('should calculate mixed tech part at unrepairable condition', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'mixed', 'unrepairable');
      expect(result.amount).toBeCloseTo(1500, 0);
    });

    it('should handle unknown tech base with default multiplier', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'unknown', 'new');
      expect(result.amount).toBe(10000);
    });

    it('should handle unknown condition with default multiplier', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'clan', 'unknown');
      expect(result.amount).toBe(20000);
    });

    it('should apply combined multipliers correctly', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'clan', 'damaged');
      expect(result.amount).toBeCloseTo(6600, 0);
    });

    it('should handle cancelled order condition', () => {
      const basePrice = new Money(10000);
      const result = calculatePartPrice(basePrice, 'innerSphere', 'cancelledOrder');
      expect(result.amount).toBe(5000);
    });
  });

  describe('Unit vs Part pricing', () => {
    it('should use same multipliers for unit and part in Clan tech', () => {
      const basePrice = new Money(10000);
      const unitResult = calculateUnitPrice(basePrice, 'clan', 'new');
      const partResult = calculatePartPrice(basePrice, 'clan', 'new');
      expect(unitResult.amount).toBe(partResult.amount);
    });

    it('should use same multipliers for unit and part in mixed tech', () => {
      const basePrice = new Money(10000);
      const unitResult = calculateUnitPrice(basePrice, 'mixed', 'used');
      const partResult = calculatePartPrice(basePrice, 'mixed', 'used');
      expect(unitResult.amount).toBe(partResult.amount);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero price', () => {
      const basePrice = Money.ZERO;
      const result = calculateUnitPrice(basePrice, 'clan', 'new');
      expect(result.isZero()).toBe(true);
    });

    it('should handle very large prices', () => {
      const basePrice = new Money(1000000000);
      const result = calculateUnitPrice(basePrice, 'clan', 'new');
      expect(result.amount).toBe(2000000000);
    });

    it('should handle decimal prices', () => {
      const basePrice = new Money(100.50);
      const result = calculateUnitPrice(basePrice, 'clan', 'damaged');
      expect(result.amount).toBeCloseTo(66.33, 2);
    });
  });
});
