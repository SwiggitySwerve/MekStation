/**
 * PaymentTerms - Financial terms for campaign contracts
 *
 * Defines the payment structure for mercenary contracts including
 * base pay, success bonuses, salvage rights, and support payments.
 * All monetary values use the immutable Money class.
 *
 * Based on MekHQ Contract.java financial fields, simplified for MVP.
 *
 * @module campaign/PaymentTerms
 */

import { Money } from './Money';

// =============================================================================
// PaymentTerms Interface
// =============================================================================

/**
 * Financial terms for a mercenary contract.
 *
 * Defines all payment amounts and percentages that govern how a
 * mercenary unit is compensated for a contract. All Money fields
 * are immutable value objects.
 *
 * @example
 * const terms: IPaymentTerms = {
 *   basePayment: new Money(500000),
 *   successPayment: new Money(250000),
 *   partialPayment: new Money(100000),
 *   failurePayment: new Money(0),
 *   salvagePercent: 50,
 *   transportPayment: new Money(75000),
 *   supportPayment: new Money(25000),
 * };
 */
export interface IPaymentTerms {
  /** Base payment (upfront or monthly base rate) */
  readonly basePayment: Money;

  /** Bonus payment on full mission success */
  readonly successPayment: Money;

  /** Payment on partial mission success */
  readonly partialPayment: Money;

  /** Payment even if mission fails (guaranteed minimum) */
  readonly failurePayment: Money;

  /** Percentage of salvage value the unit keeps (0-100) */
  readonly salvagePercent: number;

  /** Transport costs covered by employer */
  readonly transportPayment: Money;

  /** Ongoing support payment (supplies, maintenance) */
  readonly supportPayment: Money;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Outcome type for payout calculation.
 */
export type ContractOutcome = 'success' | 'partial' | 'failure';

/**
 * Calculates the total payout for a contract based on outcome.
 *
 * The total payout includes:
 * - Base payment (always included)
 * - Outcome-specific payment (success, partial, or failure)
 * - Transport payment (always included)
 * - Support payment (always included)
 *
 * Note: Salvage is NOT included in payout calculation as it depends
 * on actual salvage recovered, not contract terms alone.
 *
 * @param terms - The payment terms to calculate from
 * @param outcome - The contract outcome ('success', 'partial', 'failure')
 * @returns Total payout as Money
 *
 * @example
 * const total = calculateTotalPayout(terms, 'success');
 * console.log(total.format()); // "850,000.00 C-bills"
 */
export function calculateTotalPayout(
  terms: IPaymentTerms,
  outcome: ContractOutcome,
): Money {
  let outcomePayment: Money;

  switch (outcome) {
    case 'success':
      outcomePayment = terms.successPayment;
      break;
    case 'partial':
      outcomePayment = terms.partialPayment;
      break;
    case 'failure':
      outcomePayment = terms.failurePayment;
      break;
  }

  return terms.basePayment
    .add(outcomePayment)
    .add(terms.transportPayment)
    .add(terms.supportPayment);
}

/**
 * Calculates the estimated salvage value based on a total salvage amount.
 *
 * @param terms - The payment terms containing salvage percentage
 * @param totalSalvageValue - The total value of all salvage recovered
 * @returns The unit's share of salvage as Money
 *
 * @example
 * const share = calculateSalvageShare(terms, new Money(1000000));
 * // With 50% salvage rights: 500,000 C-bills
 */
export function calculateSalvageShare(
  terms: IPaymentTerms,
  totalSalvageValue: Money,
): Money {
  return totalSalvageValue.multiply(terms.salvagePercent / 100);
}

/**
 * Calculates the maximum possible payout (success + max salvage estimate).
 *
 * @param terms - The payment terms
 * @returns Maximum payout assuming success outcome (excludes salvage)
 *
 * @example
 * const max = calculateMaxPayout(terms);
 */
export function calculateMaxPayout(terms: IPaymentTerms): Money {
  return calculateTotalPayout(terms, 'success');
}

/**
 * Calculates the minimum guaranteed payout (failure outcome).
 *
 * @param terms - The payment terms
 * @returns Minimum payout assuming failure outcome
 *
 * @example
 * const min = calculateMinPayout(terms);
 */
export function calculateMinPayout(terms: IPaymentTerms): Money {
  return calculateTotalPayout(terms, 'failure');
}

/**
 * Checks if the payment terms include any salvage rights.
 *
 * @param terms - The payment terms to check
 * @returns true if salvagePercent > 0
 */
export function hasSalvageRights(terms: IPaymentTerms): boolean {
  return terms.salvagePercent > 0;
}

/**
 * Checks if the payment terms include transport coverage.
 *
 * @param terms - The payment terms to check
 * @returns true if transportPayment is positive
 */
export function hasTransportCoverage(terms: IPaymentTerms): boolean {
  return terms.transportPayment.isPositive();
}

/**
 * Checks if the payment terms include support coverage.
 *
 * @param terms - The payment terms to check
 * @returns true if supportPayment is positive
 */
export function hasSupportCoverage(terms: IPaymentTerms): boolean {
  return terms.supportPayment.isPositive();
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is an IPaymentTerms.
 *
 * @param value - The value to check
 * @returns true if the value is an IPaymentTerms
 *
 * @example
 * if (isPaymentTerms(obj)) {
 *   console.log(obj.basePayment.format());
 * }
 */
export function isPaymentTerms(value: unknown): value is IPaymentTerms {
  if (typeof value !== 'object' || value === null) return false;
  const terms = value as IPaymentTerms;
  return (
    terms.basePayment instanceof Money &&
    terms.successPayment instanceof Money &&
    terms.partialPayment instanceof Money &&
    terms.failurePayment instanceof Money &&
    typeof terms.salvagePercent === 'number' &&
    terms.salvagePercent >= 0 &&
    terms.salvagePercent <= 100 &&
    terms.transportPayment instanceof Money &&
    terms.supportPayment instanceof Money
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates default payment terms with zero values.
 *
 * Useful as a starting point for building custom terms.
 *
 * @returns IPaymentTerms with all zero values
 *
 * @example
 * const terms = createDefaultPaymentTerms();
 */
export function createDefaultPaymentTerms(): IPaymentTerms {
  return {
    basePayment: Money.ZERO,
    successPayment: Money.ZERO,
    partialPayment: Money.ZERO,
    failurePayment: Money.ZERO,
    salvagePercent: 0,
    transportPayment: Money.ZERO,
    supportPayment: Money.ZERO,
  };
}

/**
 * Creates payment terms with specified values.
 *
 * @param params - Partial payment terms (missing fields default to zero)
 * @returns IPaymentTerms with specified values
 *
 * @example
 * const terms = createPaymentTerms({
 *   basePayment: new Money(500000),
 *   successPayment: new Money(250000),
 *   salvagePercent: 50,
 * });
 */
export function createPaymentTerms(
  params: Partial<IPaymentTerms> = {},
): IPaymentTerms {
  const defaults = createDefaultPaymentTerms();
  return {
    basePayment: params.basePayment ?? defaults.basePayment,
    successPayment: params.successPayment ?? defaults.successPayment,
    partialPayment: params.partialPayment ?? defaults.partialPayment,
    failurePayment: params.failurePayment ?? defaults.failurePayment,
    salvagePercent: params.salvagePercent ?? defaults.salvagePercent,
    transportPayment: params.transportPayment ?? defaults.transportPayment,
    supportPayment: params.supportPayment ?? defaults.supportPayment,
  };
}
