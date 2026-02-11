/**
 * Loan Service - Loan amortization and lifecycle management
 *
 * Provides loan calculation and management functions:
 * - calculateMonthlyPayment: Standard amortization formula
 * - createLoan: Create new ILoan instance with initial state
 * - makePayment: Process payment and return updated loan + breakdown
 * - getRemainingBalance: Get current remaining principal
 * - isLoanPaidOff: Check if loan is fully paid
 * - getLoanDefaultPenalty: Calculate penalty for missed payment
 *
 * Amortization formula:
 *   payment = principal × (rate × (1 + rate)^n) / ((1 + rate)^n - 1)
 *   where rate = annualRate / 12, n = termMonths
 *
 * @module lib/finances/loanService
 */

import { randomUUID } from 'crypto';

import type { ILoan } from '@/types/campaign/Loan';

import { Money } from '@/types/campaign/Money';

/**
 * Payment breakdown for a single loan payment
 */
export interface PaymentBreakdown {
  readonly interestPortion: Money;
  readonly principalPortion: Money;
  readonly totalPayment: Money;
}

/**
 * Result of making a payment on a loan
 */
export interface PaymentResult {
  readonly updatedLoan: ILoan;
  readonly paymentBreakdown: PaymentBreakdown;
}

/**
 * Calculates the monthly payment for a loan using standard amortization formula.
 *
 * Formula:
 *   payment = principal × (rate × (1 + rate)^n) / ((1 + rate)^n - 1)
 *   where rate = annualRate / 12, n = termMonths
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate (e.g., 0.05 = 5%)
 * @param termMonths - Total loan term in months
 * @returns Monthly payment amount as Money
 *
 * @example
 * // 100,000 C-bill loan at 5% for 12 months = ~8,560.75/month
 * calculateMonthlyPayment(new Money(100000), 0.05, 12)
 * // => Money(8560.75)
 */
export function calculateMonthlyPayment(
  principal: Money,
  annualRate: number,
  termMonths: number,
): Money {
  const rate = annualRate / 12;
  const principalAmount = principal.amount;

  if (rate === 0) {
    return new Money(principalAmount / termMonths);
  }

  const numerator = rate * Math.pow(1 + rate, termMonths);
  const denominator = Math.pow(1 + rate, termMonths) - 1;
  const payment = principalAmount * (numerator / denominator);

  return new Money(payment);
}

/**
 * Creates a new loan with initial state.
 *
 * Generates unique ID, calculates monthly payment, and sets initial values:
 * - remainingPrincipal = principal
 * - paymentsRemaining = termMonths
 * - nextPaymentDate = startDate + 1 month
 * - isDefaulted = false
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate (e.g., 0.05 = 5%)
 * @param termMonths - Total loan term in months
 * @param startDate - Date the loan is originated
 * @returns New ILoan instance
 *
 * @example
 * const loan = createLoan(new Money(100000), 0.05, 12, new Date('3025-01-01'));
 * // => ILoan with id, monthlyPayment calculated, etc.
 */
export function createLoan(
  principal: Money,
  annualRate: number,
  termMonths: number,
  startDate: Date,
): ILoan {
  const monthlyPayment = calculateMonthlyPayment(
    principal,
    annualRate,
    termMonths,
  );

  const nextPaymentDate = new Date(startDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

  return {
    id: randomUUID(),
    principal,
    annualRate,
    termMonths,
    monthlyPayment,
    remainingPrincipal: principal,
    startDate,
    nextPaymentDate,
    paymentsRemaining: termMonths,
    isDefaulted: false,
  };
}

/**
 * Processes a payment on a loan.
 *
 * Calculates interest portion (remainingPrincipal × monthlyRate),
 * principal portion (payment - interest), and returns updated loan
 * with decremented paymentsRemaining and advanced nextPaymentDate.
 *
 * @param loan - The loan to make payment on
 * @returns PaymentResult with updated loan and payment breakdown
 *
 * @example
 * const loan = createLoan(new Money(100000), 0.05, 12, new Date('3025-01-01'));
 * const result = makePayment(loan);
 * // => { updatedLoan: ILoan, paymentBreakdown: PaymentBreakdown }
 */
export function makePayment(loan: ILoan): PaymentResult {
  const monthlyRate = loan.annualRate / 12;
  const interestPortion = loan.remainingPrincipal.multiply(monthlyRate);
  const principalPortion = loan.monthlyPayment.subtract(interestPortion);

  const newRemainingPrincipal =
    loan.remainingPrincipal.subtract(principalPortion);
  const newPaymentsRemaining = Math.max(0, loan.paymentsRemaining - 1);

  const nextPaymentDate = new Date(loan.nextPaymentDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

  const updatedLoan: ILoan = {
    ...loan,
    remainingPrincipal: newRemainingPrincipal,
    paymentsRemaining: newPaymentsRemaining,
    nextPaymentDate,
  };

  const paymentBreakdown: PaymentBreakdown = {
    interestPortion,
    principalPortion,
    totalPayment: loan.monthlyPayment,
  };

  return {
    updatedLoan,
    paymentBreakdown,
  };
}

/**
 * Gets the current remaining balance on a loan.
 *
 * @param loan - The loan to check
 * @returns Remaining principal balance as Money
 *
 * @example
 * const balance = getRemainingBalance(loan);
 * // => Money(50000)
 */
export function getRemainingBalance(loan: ILoan): Money {
  return loan.remainingPrincipal;
}

/**
 * Checks if a loan is fully paid off.
 *
 * Returns true if paymentsRemaining is 0 or remainingPrincipal is zero.
 *
 * @param loan - The loan to check
 * @returns True if loan is paid off, false otherwise
 *
 * @example
 * if (isLoanPaidOff(loan)) {
 *   logger.debug('Loan is fully paid!');
 * }
 */
export function isLoanPaidOff(loan: ILoan): boolean {
  return loan.paymentsRemaining === 0 || loan.remainingPrincipal.isZero();
}

/**
 * Calculates the default penalty for a loan.
 *
 * Penalty is 10% of the remaining principal balance.
 *
 * @param loan - The loan to calculate penalty for
 * @returns Penalty amount as Money
 *
 * @example
 * const penalty = getLoanDefaultPenalty(loan);
 * // => Money(5000) for 50,000 remaining balance
 */
export function getLoanDefaultPenalty(loan: ILoan): Money {
  return loan.remainingPrincipal.multiply(0.1);
}
