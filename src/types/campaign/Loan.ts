/**
 * Loan interface for campaign finances
 * Represents a loan with amortization details
 */

import type { IIdentifiable } from '@/types/core';

import { Money } from './Money';

/**
 * Loan interface
 * Represents a loan with principal, interest rate, and amortization schedule
 */
export interface ILoan extends IIdentifiable {
  /** Principal amount borrowed */
  readonly principal: Money;

  /** Annual interest rate (e.g. 0.05 = 5%) */
  readonly annualRate: number;

  /** Total loan term in months */
  readonly termMonths: number;

  /** Calculated monthly payment amount */
  readonly monthlyPayment: Money;

  /** Remaining principal balance */
  readonly remainingPrincipal: Money;

  /** Date the loan was originated */
  readonly startDate: Date;

  /** Date of the next scheduled payment */
  readonly nextPaymentDate: Date;

  /** Number of payments remaining */
  readonly paymentsRemaining: number;

  /** Whether the loan is in default */
  readonly isDefaulted: boolean;
}
