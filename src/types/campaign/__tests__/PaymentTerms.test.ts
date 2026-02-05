/**
 * PaymentTerms.test.ts - Comprehensive tests for PaymentTerms entity
 *
 * Tests cover:
 * - IPaymentTerms interface structure
 * - calculateTotalPayout helper (all outcomes)
 * - calculateSalvageShare helper
 * - calculateMaxPayout / calculateMinPayout helpers
 * - hasSalvageRights / hasTransportCoverage / hasSupportCoverage helpers
 * - isPaymentTerms type guard
 * - createDefaultPaymentTerms / createPaymentTerms factories
 */

import { Money } from '../Money';
import {
  IPaymentTerms,
  calculateTotalPayout,
  calculateSalvageShare,
  calculateMaxPayout,
  calculateMinPayout,
  hasSalvageRights,
  hasTransportCoverage,
  hasSupportCoverage,
  isPaymentTerms,
  createDefaultPaymentTerms,
  createPaymentTerms,
} from '../PaymentTerms';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestTerms(overrides?: Partial<IPaymentTerms>): IPaymentTerms {
  return {
    basePayment: new Money(500000),
    successPayment: new Money(250000),
    partialPayment: new Money(100000),
    failurePayment: new Money(0),
    salvagePercent: 50,
    transportPayment: new Money(75000),
    supportPayment: new Money(25000),
    ...overrides,
  };
}

// =============================================================================
// IPaymentTerms Interface Tests
// =============================================================================

describe('PaymentTerms System', () => {
  describe('IPaymentTerms Interface', () => {
    it('should have all required fields', () => {
      const terms = createTestTerms();

      expect(terms.basePayment).toBeInstanceOf(Money);
      expect(terms.successPayment).toBeInstanceOf(Money);
      expect(terms.partialPayment).toBeInstanceOf(Money);
      expect(terms.failurePayment).toBeInstanceOf(Money);
      expect(typeof terms.salvagePercent).toBe('number');
      expect(terms.transportPayment).toBeInstanceOf(Money);
      expect(terms.supportPayment).toBeInstanceOf(Money);
    });

    it('should store correct monetary values', () => {
      const terms = createTestTerms();

      expect(terms.basePayment.amount).toBe(500000);
      expect(terms.successPayment.amount).toBe(250000);
      expect(terms.partialPayment.amount).toBe(100000);
      expect(terms.failurePayment.amount).toBe(0);
      expect(terms.transportPayment.amount).toBe(75000);
      expect(terms.supportPayment.amount).toBe(25000);
    });

    it('should store salvage percentage', () => {
      const terms = createTestTerms({ salvagePercent: 75 });
      expect(terms.salvagePercent).toBe(75);
    });

    it('should support zero values for all fields', () => {
      const terms = createTestTerms({
        basePayment: Money.ZERO,
        successPayment: Money.ZERO,
        partialPayment: Money.ZERO,
        failurePayment: Money.ZERO,
        salvagePercent: 0,
        transportPayment: Money.ZERO,
        supportPayment: Money.ZERO,
      });

      expect(terms.basePayment.isZero()).toBe(true);
      expect(terms.successPayment.isZero()).toBe(true);
      expect(terms.salvagePercent).toBe(0);
    });

    it('should support large monetary values', () => {
      const terms = createTestTerms({
        basePayment: new Money(10000000),
        successPayment: new Money(5000000),
      });

      expect(terms.basePayment.amount).toBe(10000000);
      expect(terms.successPayment.amount).toBe(5000000);
    });

    it('should support 100% salvage', () => {
      const terms = createTestTerms({ salvagePercent: 100 });
      expect(terms.salvagePercent).toBe(100);
    });

    it('should support 0% salvage', () => {
      const terms = createTestTerms({ salvagePercent: 0 });
      expect(terms.salvagePercent).toBe(0);
    });
  });

  // ===========================================================================
  // calculateTotalPayout Tests
  // ===========================================================================

  describe('calculateTotalPayout', () => {
    it('should calculate success payout correctly', () => {
      const terms = createTestTerms();
      const payout = calculateTotalPayout(terms, 'success');

      // base(500000) + success(250000) + transport(75000) + support(25000) = 850000
      expect(payout.amount).toBe(850000);
    });

    it('should calculate partial payout correctly', () => {
      const terms = createTestTerms();
      const payout = calculateTotalPayout(terms, 'partial');

      // base(500000) + partial(100000) + transport(75000) + support(25000) = 700000
      expect(payout.amount).toBe(700000);
    });

    it('should calculate failure payout correctly', () => {
      const terms = createTestTerms();
      const payout = calculateTotalPayout(terms, 'failure');

      // base(500000) + failure(0) + transport(75000) + support(25000) = 600000
      expect(payout.amount).toBe(600000);
    });

    it('should handle all-zero terms', () => {
      const terms = createDefaultPaymentTerms();
      const payout = calculateTotalPayout(terms, 'success');

      expect(payout.amount).toBe(0);
    });

    it('should handle terms with only base payment', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(1000000),
      });
      const payout = calculateTotalPayout(terms, 'success');

      expect(payout.amount).toBe(1000000);
    });

    it('should handle terms with failure payment', () => {
      const terms = createTestTerms({
        failurePayment: new Money(50000),
      });
      const payout = calculateTotalPayout(terms, 'failure');

      // base(500000) + failure(50000) + transport(75000) + support(25000) = 650000
      expect(payout.amount).toBe(650000);
    });

    it('should always include transport and support', () => {
      const terms = createPaymentTerms({
        transportPayment: new Money(100000),
        supportPayment: new Money(50000),
      });

      const successPayout = calculateTotalPayout(terms, 'success');
      const failurePayout = calculateTotalPayout(terms, 'failure');

      // Both should include transport + support = 150000
      expect(successPayout.amount).toBe(150000);
      expect(failurePayout.amount).toBe(150000);
    });

    it('should return Money instance', () => {
      const terms = createTestTerms();
      const payout = calculateTotalPayout(terms, 'success');

      expect(payout).toBeInstanceOf(Money);
    });

    it('should handle large payouts', () => {
      const terms = createTestTerms({
        basePayment: new Money(50000000),
        successPayment: new Money(25000000),
        transportPayment: new Money(5000000),
        supportPayment: new Money(2000000),
      });
      const payout = calculateTotalPayout(terms, 'success');

      expect(payout.amount).toBe(82000000);
    });
  });

  // ===========================================================================
  // calculateSalvageShare Tests
  // ===========================================================================

  describe('calculateSalvageShare', () => {
    it('should calculate 50% salvage share', () => {
      const terms = createTestTerms({ salvagePercent: 50 });
      const share = calculateSalvageShare(terms, new Money(1000000));

      expect(share.amount).toBe(500000);
    });

    it('should calculate 100% salvage share', () => {
      const terms = createTestTerms({ salvagePercent: 100 });
      const share = calculateSalvageShare(terms, new Money(1000000));

      expect(share.amount).toBe(1000000);
    });

    it('should calculate 0% salvage share', () => {
      const terms = createTestTerms({ salvagePercent: 0 });
      const share = calculateSalvageShare(terms, new Money(1000000));

      expect(share.amount).toBe(0);
    });

    it('should calculate 25% salvage share', () => {
      const terms = createTestTerms({ salvagePercent: 25 });
      const share = calculateSalvageShare(terms, new Money(400000));

      expect(share.amount).toBe(100000);
    });

    it('should handle zero salvage value', () => {
      const terms = createTestTerms({ salvagePercent: 50 });
      const share = calculateSalvageShare(terms, Money.ZERO);

      expect(share.amount).toBe(0);
    });

    it('should return Money instance', () => {
      const terms = createTestTerms();
      const share = calculateSalvageShare(terms, new Money(1000000));

      expect(share).toBeInstanceOf(Money);
    });
  });

  // ===========================================================================
  // calculateMaxPayout / calculateMinPayout Tests
  // ===========================================================================

  describe('calculateMaxPayout', () => {
    it('should return success payout', () => {
      const terms = createTestTerms();
      const max = calculateMaxPayout(terms);

      expect(max.amount).toBe(850000);
    });

    it('should handle zero terms', () => {
      const terms = createDefaultPaymentTerms();
      const max = calculateMaxPayout(terms);

      expect(max.amount).toBe(0);
    });
  });

  describe('calculateMinPayout', () => {
    it('should return failure payout', () => {
      const terms = createTestTerms();
      const min = calculateMinPayout(terms);

      // base(500000) + failure(0) + transport(75000) + support(25000) = 600000
      expect(min.amount).toBe(600000);
    });

    it('should handle zero terms', () => {
      const terms = createDefaultPaymentTerms();
      const min = calculateMinPayout(terms);

      expect(min.amount).toBe(0);
    });

    it('should be less than or equal to max payout', () => {
      const terms = createTestTerms();
      const min = calculateMinPayout(terms);
      const max = calculateMaxPayout(terms);

      expect(min.amount).toBeLessThanOrEqual(max.amount);
    });
  });

  // ===========================================================================
  // Boolean Helper Tests
  // ===========================================================================

  describe('hasSalvageRights', () => {
    it('should return true when salvagePercent > 0', () => {
      const terms = createTestTerms({ salvagePercent: 50 });
      expect(hasSalvageRights(terms)).toBe(true);
    });

    it('should return false when salvagePercent is 0', () => {
      const terms = createTestTerms({ salvagePercent: 0 });
      expect(hasSalvageRights(terms)).toBe(false);
    });

    it('should return true for 1% salvage', () => {
      const terms = createTestTerms({ salvagePercent: 1 });
      expect(hasSalvageRights(terms)).toBe(true);
    });
  });

  describe('hasTransportCoverage', () => {
    it('should return true when transportPayment is positive', () => {
      const terms = createTestTerms({ transportPayment: new Money(50000) });
      expect(hasTransportCoverage(terms)).toBe(true);
    });

    it('should return false when transportPayment is zero', () => {
      const terms = createTestTerms({ transportPayment: Money.ZERO });
      expect(hasTransportCoverage(terms)).toBe(false);
    });
  });

  describe('hasSupportCoverage', () => {
    it('should return true when supportPayment is positive', () => {
      const terms = createTestTerms({ supportPayment: new Money(25000) });
      expect(hasSupportCoverage(terms)).toBe(true);
    });

    it('should return false when supportPayment is zero', () => {
      const terms = createTestTerms({ supportPayment: Money.ZERO });
      expect(hasSupportCoverage(terms)).toBe(false);
    });
  });

  // ===========================================================================
  // Type Guard Tests
  // ===========================================================================

  describe('isPaymentTerms', () => {
    it('should return true for valid payment terms', () => {
      const terms = createTestTerms();
      expect(isPaymentTerms(terms)).toBe(true);
    });

    it('should return true for default payment terms', () => {
      const terms = createDefaultPaymentTerms();
      expect(isPaymentTerms(terms)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPaymentTerms(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPaymentTerms(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isPaymentTerms({})).toBe(false);
    });

    it('should return false for missing fields', () => {
      expect(isPaymentTerms({ basePayment: new Money(100) })).toBe(false);
    });

    it('should return false for non-Money basePayment', () => {
      const invalid = {
        ...createTestTerms(),
        basePayment: 500000, // number, not Money
      };
      expect(isPaymentTerms(invalid)).toBe(false);
    });

    it('should return false for non-number salvagePercent', () => {
      const invalid = {
        ...createTestTerms(),
        salvagePercent: '50', // string, not number
      };
      expect(isPaymentTerms(invalid)).toBe(false);
    });

    it('should return false for salvagePercent > 100', () => {
      const invalid = {
        ...createTestTerms(),
        salvagePercent: 101,
      };
      expect(isPaymentTerms(invalid)).toBe(false);
    });

    it('should return false for salvagePercent < 0', () => {
      const invalid = {
        ...createTestTerms(),
        salvagePercent: -1,
      };
      expect(isPaymentTerms(invalid)).toBe(false);
    });

    it('should return false for string value', () => {
      expect(isPaymentTerms('not payment terms')).toBe(false);
    });

    it('should return false for number value', () => {
      expect(isPaymentTerms(42)).toBe(false);
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('createDefaultPaymentTerms', () => {
    it('should create terms with all zero values', () => {
      const terms = createDefaultPaymentTerms();

      expect(terms.basePayment.amount).toBe(0);
      expect(terms.successPayment.amount).toBe(0);
      expect(terms.partialPayment.amount).toBe(0);
      expect(terms.failurePayment.amount).toBe(0);
      expect(terms.salvagePercent).toBe(0);
      expect(terms.transportPayment.amount).toBe(0);
      expect(terms.supportPayment.amount).toBe(0);
    });

    it('should create new instance each time', () => {
      const terms1 = createDefaultPaymentTerms();
      const terms2 = createDefaultPaymentTerms();

      expect(terms1).not.toBe(terms2);
    });

    it('should pass type guard', () => {
      const terms = createDefaultPaymentTerms();
      expect(isPaymentTerms(terms)).toBe(true);
    });
  });

  describe('createPaymentTerms', () => {
    it('should create terms with specified values', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(500000),
        successPayment: new Money(250000),
        salvagePercent: 50,
      });

      expect(terms.basePayment.amount).toBe(500000);
      expect(terms.successPayment.amount).toBe(250000);
      expect(terms.salvagePercent).toBe(50);
    });

    it('should default missing fields to zero', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(500000),
      });

      expect(terms.basePayment.amount).toBe(500000);
      expect(terms.successPayment.amount).toBe(0);
      expect(terms.partialPayment.amount).toBe(0);
      expect(terms.failurePayment.amount).toBe(0);
      expect(terms.salvagePercent).toBe(0);
      expect(terms.transportPayment.amount).toBe(0);
      expect(terms.supportPayment.amount).toBe(0);
    });

    it('should create terms with no arguments', () => {
      const terms = createPaymentTerms();

      expect(terms.basePayment.amount).toBe(0);
      expect(terms.salvagePercent).toBe(0);
    });

    it('should create terms with all fields specified', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(500000),
        successPayment: new Money(250000),
        partialPayment: new Money(100000),
        failurePayment: new Money(50000),
        salvagePercent: 75,
        transportPayment: new Money(80000),
        supportPayment: new Money(30000),
      });

      expect(terms.basePayment.amount).toBe(500000);
      expect(terms.successPayment.amount).toBe(250000);
      expect(terms.partialPayment.amount).toBe(100000);
      expect(terms.failurePayment.amount).toBe(50000);
      expect(terms.salvagePercent).toBe(75);
      expect(terms.transportPayment.amount).toBe(80000);
      expect(terms.supportPayment.amount).toBe(30000);
    });

    it('should pass type guard', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(500000),
        salvagePercent: 50,
      });
      expect(isPaymentTerms(terms)).toBe(true);
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should calculate payout difference between outcomes', () => {
      const terms = createTestTerms();

      const successPayout = calculateTotalPayout(terms, 'success');
      const partialPayout = calculateTotalPayout(terms, 'partial');
      const failurePayout = calculateTotalPayout(terms, 'failure');

      expect(successPayout.amount).toBeGreaterThan(partialPayout.amount);
      expect(partialPayout.amount).toBeGreaterThan(failurePayout.amount);
    });

    it('should combine payout with salvage share', () => {
      const terms = createTestTerms();
      const payout = calculateTotalPayout(terms, 'success');
      const salvage = calculateSalvageShare(terms, new Money(2000000));

      const totalEarnings = payout.add(salvage);
      // 850000 + 1000000 = 1850000
      expect(totalEarnings.amount).toBe(1850000);
    });

    it('should handle realistic contract scenario', () => {
      const terms = createPaymentTerms({
        basePayment: new Money(2000000),
        successPayment: new Money(1000000),
        partialPayment: new Money(500000),
        failurePayment: new Money(200000),
        salvagePercent: 40,
        transportPayment: new Money(300000),
        supportPayment: new Money(100000),
      });

      // Success: 2000000 + 1000000 + 300000 + 100000 = 3400000
      expect(calculateTotalPayout(terms, 'success').amount).toBe(3400000);

      // Partial: 2000000 + 500000 + 300000 + 100000 = 2900000
      expect(calculateTotalPayout(terms, 'partial').amount).toBe(2900000);

      // Failure: 2000000 + 200000 + 300000 + 100000 = 2600000
      expect(calculateTotalPayout(terms, 'failure').amount).toBe(2600000);

      // Salvage on 5M: 40% = 2000000
      expect(calculateSalvageShare(terms, new Money(5000000)).amount).toBe(
        2000000,
      );

      // Has salvage, transport, support
      expect(hasSalvageRights(terms)).toBe(true);
      expect(hasTransportCoverage(terms)).toBe(true);
      expect(hasSupportCoverage(terms)).toBe(true);
    });
  });
});
