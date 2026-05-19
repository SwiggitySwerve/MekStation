/**
 * Campaign Loan
 *
 * The small loan record introduced by `add-campaign-command-ui` (CP2b,
 * design D4). Distinct from the amortisation-engine `ILoan`
 * (`./Loan.ts`): `ICampaignLoan` carries flat C-bill scalars and a
 * *daily* repayment so loan repayment can reuse the existing daily-cost
 * pipeline without any new amortisation math.
 *
 * The loan math is fixed at creation time:
 *   `dailyRepayment = principal * (1 + interestRate) / termDays`
 *
 * Loans live on the campaign as an optional `loans` field
 * (`ICampaignCommandExtensions`). Repayment is summed into the daily-cost
 * figure the existing `dailyCostsProcessor` already debits — there is no
 * new repayment engine.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module campaign/CampaignLoan
 */

/** Lifecycle status of a campaign loan. */
export type CampaignLoanStatus = 'active' | 'repaid' | 'defaulted';

/**
 * A campaign loan — a fixed-schedule debt repaid via the daily-cost
 * pipeline. All monetary fields are plain C-bill scalars (not `Money`)
 * so the record survives `JSON.stringify` / `JSON.parse` without a
 * custom reviver, matching the `SerializedFinances` scalar convention.
 */
export interface ICampaignLoan {
  /** Unique identifier. */
  readonly id: string;

  /** C-bills borrowed. */
  readonly principal: number;

  /** Fractional interest rate over the full term, e.g. `0.10` for 10%. */
  readonly interestRate: number;

  /** Loan term in days. */
  readonly termDays: number;

  /** ISO 8601 date the loan was taken. */
  readonly takenOnDate: string;

  /** C-bills still owed (principal + interest, decremented daily). */
  readonly remainingBalance: number;

  /** C-bills repaid per day — fixed at loan creation. */
  readonly dailyRepayment: number;

  /** Lifecycle status. */
  readonly status: CampaignLoanStatus;
}

// =============================================================================
// Loan Math (fixed at creation time — design D4)
// =============================================================================

/**
 * Compute the total amount repayable over the loan term:
 * `principal * (1 + interestRate)`.
 *
 * @param principal - C-bills borrowed
 * @param interestRate - fractional rate over the term
 */
export function computeTotalRepayable(
  principal: number,
  interestRate: number,
): number {
  return principal * (1 + interestRate);
}

/**
 * Compute the fixed daily repayment for a loan:
 * `principal * (1 + interestRate) / termDays` (design D4).
 *
 * @param principal - C-bills borrowed
 * @param interestRate - fractional rate over the term
 * @param termDays - loan term in days (must be > 0)
 */
export function computeDailyRepayment(
  principal: number,
  interestRate: number,
  termDays: number,
): number {
  if (termDays <= 0) return 0;
  return computeTotalRepayable(principal, interestRate) / termDays;
}

/**
 * Create a fresh `ICampaignLoan`. The total repayable and the daily
 * repayment are computed once here and never recomputed — repayment is
 * a pure decrement of `remainingBalance` by `dailyRepayment` (design D4).
 *
 * @param params - loan creation inputs
 */
export function createCampaignLoan(params: {
  /** Unique id. */
  readonly id: string;
  /** C-bills borrowed. */
  readonly principal: number;
  /** Fractional rate over the term. */
  readonly interestRate: number;
  /** Term in days. */
  readonly termDays: number;
  /** ISO 8601 date taken. */
  readonly takenOnDate: string;
}): ICampaignLoan {
  const total = computeTotalRepayable(params.principal, params.interestRate);
  const dailyRepayment = computeDailyRepayment(
    params.principal,
    params.interestRate,
    params.termDays,
  );

  return {
    id: params.id,
    principal: params.principal,
    interestRate: params.interestRate,
    termDays: params.termDays,
    takenOnDate: params.takenOnDate,
    remainingBalance: total,
    dailyRepayment,
    status: 'active',
  };
}

/**
 * Type guard for `ICampaignLoan`.
 *
 * @param value - candidate value
 */
export function isCampaignLoan(value: unknown): value is ICampaignLoan {
  if (typeof value !== 'object' || value === null) return false;
  const loan = value as ICampaignLoan;
  return (
    typeof loan.id === 'string' &&
    typeof loan.principal === 'number' &&
    typeof loan.interestRate === 'number' &&
    typeof loan.termDays === 'number' &&
    typeof loan.takenOnDate === 'string' &&
    typeof loan.remainingBalance === 'number' &&
    typeof loan.dailyRepayment === 'number' &&
    (loan.status === 'active' ||
      loan.status === 'repaid' ||
      loan.status === 'defaulted')
  );
}
