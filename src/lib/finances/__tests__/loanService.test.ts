import type { ILoan } from '@/types/campaign/Loan';

import { Money } from '@/types/campaign/Money';

import {
  calculateMonthlyPayment,
  createLoan,
  makePayment,
  getRemainingBalance,
  isLoanPaidOff,
  getLoanDefaultPenalty,
} from '../loanService';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestLoan(overrides?: Partial<ILoan>): ILoan {
  return {
    id: 'loan-001',
    principal: new Money(100000),
    annualRate: 0.05,
    termMonths: 12,
    monthlyPayment: new Money(8560.75),
    remainingPrincipal: new Money(100000),
    startDate: new Date('3025-01-01'),
    nextPaymentDate: new Date('3025-02-01'),
    paymentsRemaining: 12,
    isDefaulted: false,
    ...overrides,
  };
}

// =============================================================================
// calculateMonthlyPayment Tests
// =============================================================================

describe('calculateMonthlyPayment', () => {
  it('calculates correct monthly payment for 100k loan at 5% for 12 months', () => {
    const principal = new Money(100000);
    const annualRate = 0.05;
    const termMonths = 12;

    const payment = calculateMonthlyPayment(principal, annualRate, termMonths);

    // Expected: ~8560.75 C-bills per month
    expect(payment.amount).toBeCloseTo(8560.75, 2);
  });

  it('calculates correct monthly payment for 50k loan at 3% for 24 months', () => {
    const principal = new Money(50000);
    const annualRate = 0.03;
    const termMonths = 24;

    const payment = calculateMonthlyPayment(principal, annualRate, termMonths);

    // Should be approximately 2,149.06
    expect(payment.amount).toBeCloseTo(2149.06, 2);
  });

  it('handles 0% interest rate (simple division)', () => {
    const principal = new Money(12000);
    const annualRate = 0;
    const termMonths = 12;

    const payment = calculateMonthlyPayment(principal, annualRate, termMonths);

    // Should be exactly 1000 (12000 / 12)
    expect(payment.amount).toBeCloseTo(1000, 2);
  });

  it('handles 1-month term', () => {
    const principal = new Money(10000);
    const annualRate = 0.05;
    const termMonths = 1;

    const payment = calculateMonthlyPayment(principal, annualRate, termMonths);

    // Should be principal + one month of interest
    expect(payment.amount).toBeGreaterThan(10000);
  });

  it('handles very long term (360 months)', () => {
    const principal = new Money(300000);
    const annualRate = 0.04;
    const termMonths = 360;

    const payment = calculateMonthlyPayment(principal, annualRate, termMonths);

    // With interest, payment should be greater than simple division
    expect(payment.amount).toBeGreaterThan(principal.amount / termMonths);
  });

  it('returns Money instance', () => {
    const payment = calculateMonthlyPayment(new Money(100000), 0.05, 12);
    expect(payment).toBeInstanceOf(Money);
  });
});

// =============================================================================
// createLoan Tests
// =============================================================================

describe('createLoan', () => {
  it('creates loan with correct properties', () => {
    const principal = new Money(100000);
    const annualRate = 0.05;
    const termMonths = 12;
    const startDate = new Date('3025-01-01');

    const loan = createLoan(principal, annualRate, termMonths, startDate);

    expect(loan.principal.equals(principal)).toBe(true);
    expect(loan.annualRate).toBe(annualRate);
    expect(loan.termMonths).toBe(termMonths);
    expect(loan.startDate).toEqual(startDate);
  });

  it('generates unique ID for each loan', () => {
    const loan1 = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );
    const loan2 = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    expect(loan1.id).not.toBe(loan2.id);
  });

  it('calculates correct monthly payment on creation', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    expect(loan.monthlyPayment.amount).toBeCloseTo(8560.75, 2);
  });

  it('sets remaining principal equal to principal on creation', () => {
    const principal = new Money(100000);
    const loan = createLoan(principal, 0.05, 12, new Date('3025-01-01'));

    expect(loan.remainingPrincipal.equals(principal)).toBe(true);
  });

  it('sets payments remaining equal to term months', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    expect(loan.paymentsRemaining).toBe(12);
  });

  it('sets next payment date to one month after start date', () => {
    const startDate = new Date('3025-01-01');
    const loan = createLoan(new Money(100000), 0.05, 12, startDate);

    const expectedNextPaymentDate = new Date('3025-02-01');
    expect(loan.nextPaymentDate).toEqual(expectedNextPaymentDate);
  });

  it('sets isDefaulted to false on creation', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    expect(loan.isDefaulted).toBe(false);
  });
});

// =============================================================================
// makePayment Tests
// =============================================================================

describe('makePayment', () => {
  it('returns updated loan and payment breakdown', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);

    expect(result).toHaveProperty('updatedLoan');
    expect(result).toHaveProperty('paymentBreakdown');
  });

  it('payment breakdown includes interest and principal portions', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);

    expect(result.paymentBreakdown).toHaveProperty('interestPortion');
    expect(result.paymentBreakdown).toHaveProperty('principalPortion');
    expect(result.paymentBreakdown).toHaveProperty('totalPayment');
  });

  it('interest + principal = monthly payment', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);
    const { interestPortion, principalPortion, totalPayment } =
      result.paymentBreakdown;

    const sum = interestPortion.add(principalPortion);
    expect(sum.equals(totalPayment)).toBe(true);
  });

  it('decrements payments remaining', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);

    expect(result.updatedLoan.paymentsRemaining).toBe(11);
  });

  it('reduces remaining principal by principal portion of payment', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);
    const expectedRemaining = loan.remainingPrincipal.subtract(
      result.paymentBreakdown.principalPortion,
    );

    expect(
      result.updatedLoan.remainingPrincipal.equals(expectedRemaining),
    ).toBe(true);
  });

  it('advances next payment date by one month', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);

    const expectedNextDate = new Date(loan.nextPaymentDate);
    expectedNextDate.setMonth(expectedNextDate.getMonth() + 1);
    expect(result.updatedLoan.nextPaymentDate.getTime()).toBe(
      expectedNextDate.getTime(),
    );
  });

  it('calculates interest on remaining balance', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const result = makePayment(loan);

    // First payment: interest = 100000 * (0.05 / 12) = 416.67
    const expectedInterest = loan.remainingPrincipal.multiply(0.05 / 12);
    expect(result.paymentBreakdown.interestPortion.amount).toBeCloseTo(
      expectedInterest.amount,
      2,
    );
  });

  it('handles final payment correctly', () => {
    let loan = createLoan(new Money(100000), 0.05, 12, new Date('3025-01-01'));

    // Make 11 payments
    for (let i = 0; i < 11; i++) {
      const result = makePayment(loan);
      loan = result.updatedLoan;
    }

    // Make final payment
    const finalResult = makePayment(loan);

    expect(finalResult.updatedLoan.paymentsRemaining).toBe(0);
    expect(
      Math.abs(finalResult.updatedLoan.remainingPrincipal.amount),
    ).toBeLessThan(0.1);
  });
});

// =============================================================================
// getRemainingBalance Tests
// =============================================================================

describe('getRemainingBalance', () => {
  it('returns remaining principal', () => {
    const loan = createTestLoan();

    const balance = getRemainingBalance(loan);

    expect(balance.equals(loan.remainingPrincipal)).toBe(true);
  });

  it('returns zero for paid off loan', () => {
    const loan = createTestLoan({ remainingPrincipal: new Money(0) });

    const balance = getRemainingBalance(loan);

    expect(balance.isZero()).toBe(true);
  });

  it('returns partial balance during amortization', () => {
    const loan = createTestLoan({ remainingPrincipal: new Money(50000) });

    const balance = getRemainingBalance(loan);

    expect(balance.amount).toBe(50000);
  });
});

// =============================================================================
// isLoanPaidOff Tests
// =============================================================================

describe('isLoanPaidOff', () => {
  it('returns false for new loan', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    expect(isLoanPaidOff(loan)).toBe(false);
  });

  it('returns true when payments remaining is 0', () => {
    const loan = createTestLoan({
      paymentsRemaining: 0,
      remainingPrincipal: new Money(0),
    });

    expect(isLoanPaidOff(loan)).toBe(true);
  });

  it('returns true when remaining principal is zero', () => {
    const loan = createTestLoan({ remainingPrincipal: new Money(0) });

    expect(isLoanPaidOff(loan)).toBe(true);
  });

  it('returns false during amortization', () => {
    const loan = createTestLoan({
      paymentsRemaining: 6,
      remainingPrincipal: new Money(50000),
    });

    expect(isLoanPaidOff(loan)).toBe(false);
  });
});

// =============================================================================
// getLoanDefaultPenalty Tests
// =============================================================================

describe('getLoanDefaultPenalty', () => {
  it('calculates penalty as 10% of remaining balance', () => {
    const loan = createTestLoan({ remainingPrincipal: new Money(50000) });

    const penalty = getLoanDefaultPenalty(loan);

    // 10% of 50000 = 5000
    expect(penalty.amount).toBeCloseTo(5000, 2);
  });

  it('returns zero penalty for paid off loan', () => {
    const loan = createTestLoan({ remainingPrincipal: new Money(0) });

    const penalty = getLoanDefaultPenalty(loan);

    expect(penalty.isZero()).toBe(true);
  });

  it('calculates penalty on full principal for new loan', () => {
    const loan = createLoan(
      new Money(100000),
      0.05,
      12,
      new Date('3025-01-01'),
    );

    const penalty = getLoanDefaultPenalty(loan);

    // 10% of 100000 = 10000
    expect(penalty.amount).toBeCloseTo(10000, 2);
  });

  it('returns Money instance', () => {
    const loan = createTestLoan();

    const penalty = getLoanDefaultPenalty(loan);

    expect(penalty).toBeInstanceOf(Money);
  });
});
