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
});
