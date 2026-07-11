/**
 * Economy ledger invariants for the headless campaign fast-forward
 * suites (design R4, spec "Economy Ledger Invariants Across a
 * Fast-Forwarded Run").
 *
 * Why an explicit per-`TransactionType` sign map (design R4): `Transaction
 * .amount` stores an UNSIGNED magnitude — `campaign.finances.balance` is
 * only ever mutated via `.add(amount)` or `.subtract(amount)` at each
 * individual call site, never via a shared "apply this transaction"
 * helper that every producer goes through. A naive `sum(amounts)`
 * therefore "reconciles" wrong, and worse, the ONE existing shared
 * helper (`FinanceService.recordTransaction` / `.getBalance`,
 * `lib/finances/FinanceService.ts:61-109`) encodes a binary rule —
 * `Income` and `Salvage` are additive, everything else subtracts — that
 * a real production call site already contradicts:
 * `campaignCommandActions.ts:406-417` credits a loan's principal via
 * `TransactionType.LoanDisbursement` through a direct
 * `campaign.finances.balance.add(principal)`, bypassing
 * `FinanceService` entirely. Reusing `FinanceService`'s binary rule here
 * would silently mis-sign `LoanDisbursement`. This module's sign map is
 * therefore built from AUDITED call-site evidence, not from
 * `FinanceService`'s (demonstrably incomplete) binary shortcut:
 *
 *  - `Income` — additive. `contractClosure.ts:44`:
 *    `campaign.finances.balance.add(payout)`.
 *  - `Salvage` — additive. `FinanceService.ts:69-70`'s binary rule (the
 *    one call site class it IS internally consistent for).
 *  - `LoanDisbursement` — additive. `campaignCommandActions.ts:417`
 *    (direct `.add`, confirmed above — the carve-out `FinanceService`
 *    misses).
 *  - `ContractPayment` — additive by the enum's own doc comment
 *    ("Contract payment received"); no production processor emits it
 *    today (`contractClosure.ts` uses `Income` for the real payout), so
 *    this is a documented semantic classification, not call-site
 *    evidence — included for the map's completeness per design R4
 *    ("fails on unknown types" requires every declared type to have a
 *    definitive sign, not just the ones current processors emit).
 *  - Every other type — subtractive. Confirmed by call-site evidence for
 *    `Expense` (`dailyCostsProcessing.ts:124-132`, salary-via-Expense;
 *    `turnoverProcessor.ts:83-97`, retirement payout), `Maintenance`
 *    (`dailyCostsProcessing.ts:151-159`, `financialProcessor.ts:297-330`),
 *    `Salary`/`Overhead`/`FoodAndHousing`/`LoanPayment`/`Tax`
 *    (`financialProcessor.ts`, all `.subtract(...)`). `Repair`,
 *    `Miscellaneous`, `UnitPurchase`, `PartPurchase`, `TurnoverPayout`
 *    have no current producer in `campaign.finances.transactions` (some
 *    are reserved/unused enum values today) — classified subtractive by
 *    the established codebase default (`FinanceService.ts`'s own
 *    comment: "Income adds to balance, all other types subtract") and
 *    by their cost-natured names.
 *
 * `TRANSACTION_TYPE_SIGN` is typed as `Record<TransactionType, 1 | -1>`
 * so TypeScript itself enforces every enum member has an entry (a
 * missing member is a compile error, not a silent runtime gap); the
 * runtime helpers additionally guard against a persisted/corrupted
 * transaction whose `type` string isn't a recognized key.
 *
 * @module lib/campaign/fastForward/invariants/ledger
 */

import type { Transaction } from '@/types/campaign/Transaction';

import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Sign map
// =============================================================================

/** +1 = credits the balance, -1 = debits it. See module doc for the evidence behind every entry. */
export const TRANSACTION_TYPE_SIGN: Readonly<Record<TransactionType, 1 | -1>> =
  {
    [TransactionType.Income]: 1,
    [TransactionType.Salvage]: 1,
    [TransactionType.LoanDisbursement]: 1,
    [TransactionType.ContractPayment]: 1,
    [TransactionType.Expense]: -1,
    [TransactionType.Repair]: -1,
    [TransactionType.Maintenance]: -1,
    [TransactionType.Miscellaneous]: -1,
    [TransactionType.Salary]: -1,
    [TransactionType.LoanPayment]: -1,
    [TransactionType.Tax]: -1,
    [TransactionType.Overhead]: -1,
    [TransactionType.FoodAndHousing]: -1,
    [TransactionType.UnitPurchase]: -1,
    [TransactionType.PartPurchase]: -1,
    [TransactionType.TurnoverPayout]: -1,
  };

/** Resolve a transaction's sign, throwing on a type absent from the map (design R4: "fails on unknown types"). */
export function signFor(type: TransactionType): 1 | -1 {
  const sign = TRANSACTION_TYPE_SIGN[type];
  if (sign === undefined) {
    throw new Error(
      `ledger invariant: unknown TransactionType "${String(type)}" has no reconciliation sign — extend TRANSACTION_TYPE_SIGN before reconciling a ledger that contains it.`,
    );
  }
  return sign;
}

// =============================================================================
// Balance reconciliation
// =============================================================================

/**
 * Assert the campaign's ending balance equals the starting balance
 * adjusted by every transaction's signed amount (spec scenario:
 * "Balance reconciles per-type-signed"). Cents-based (via
 * `Money.centsValue`) so the comparison is exact, never float-fuzzy.
 *
 * @param startingBalance - balance before `transactions` were appended
 * @param transactions - the transactions appended during the run being checked
 * @param endingBalance - the campaign's actual balance after `transactions`
 */
export function assertLedgerReconciles(
  startingBalance: Money,
  transactions: readonly Transaction[],
  endingBalance: Money,
): void {
  const expectedCents = transactions.reduce(
    (cents, tx) => cents + signFor(tx.type) * tx.amount.centsValue,
    startingBalance.centsValue,
  );
  if (expectedCents !== endingBalance.centsValue) {
    const expected = Money.fromCents(expectedCents);
    throw new Error(
      `assertLedgerReconciles: ledger does not reconcile — starting balance ${startingBalance.format()} + ${transactions.length} signed transaction(s) expects ending balance ${expected.format()}, got ${endingBalance.format()} (delta ${Money.fromCents(endingBalance.centsValue - expectedCents).format()}).`,
    );
  }
}

// =============================================================================
// Contract payout exactly-once (bounded per D8 — see design R9)
// =============================================================================

/**
 * Assert a contract's closure payout posted exactly once: exactly one
 * `tx-contract-close-<contractId>-*` transaction in the ledger
 * (`contractClosure.ts:45`'s id format) AND exactly one membership of
 * `contractId` in `processedFulfilledContractIds`
 * (`postBattleProcessor.ts:224-226`). Only sound under the D8
 * bounded-contract-window fixture contract — a contract that can be
 * re-fought after first reaching terminal status will legitimately trip
 * this (R9: production's status-blind `getActiveContracts` + no
 * once-only guard on `applyContractClosure` is a documented gap, out of
 * this change's scope; fixtures bound contract windows so the shape is
 * unreachable in these suites rather than papered over here).
 */
export function assertContractPayoutExactlyOnce(
  contractId: string,
  transactions: readonly Transaction[],
  processedFulfilledContractIds: readonly string[],
): void {
  const closurePrefix = `tx-contract-close-${contractId}-`;
  const payoutPostings = transactions.filter((tx) =>
    tx.id.startsWith(closurePrefix),
  );
  if (payoutPostings.length !== 1) {
    throw new Error(
      `assertContractPayoutExactlyOnce: contract ${contractId} has ${payoutPostings.length} closure posting(s) in the ledger (expected exactly 1) — ids: [${payoutPostings.map((t) => t.id).join(', ')}].`,
    );
  }
  const fulfilledCount = processedFulfilledContractIds.filter(
    (id) => id === contractId,
  ).length;
  if (fulfilledCount !== 1) {
    throw new Error(
      `assertContractPayoutExactlyOnce: contract ${contractId} appears ${fulfilledCount} time(s) in processedFulfilledContractIds (expected exactly 1).`,
    );
  }
}

// =============================================================================
// Salary-path mutual exclusion
// =============================================================================

/**
 * Assert exactly one salary path posted personnel costs across the run,
 * per `campaign.options.useRoleBasedSalaries` (spec scenario: "Exactly
 * one salary path posts"). The legacy path (`dailyCostsProcessor` /
 * `processDailyCosts`) posts salary as `TransactionType.Expense` with a
 * `tx-salary-*` id (`dailyCostsProcessing.ts:124-133`); the role-based
 * path (`financialProcessor`) posts `TransactionType.Salary`
 * (`financialProcessor.ts:71-77`). The two processors gate on the SAME
 * option in opposite directions (`dailyCostsProcessor.ts:18`,
 * `financialProcessor.ts:346`), so they are mutually exclusive by
 * construction — this assertion catches a regression in that gating,
 * not a normal-path condition.
 */
export function assertSalaryPathMutualExclusion(
  useRoleBasedSalaries: boolean,
  transactions: readonly Transaction[],
): void {
  const legacySalaryPosted = transactions.some(
    (tx) =>
      tx.type === TransactionType.Expense && tx.id.startsWith('tx-salary-'),
  );
  const roleBasedSalaryPosted = transactions.some(
    (tx) => tx.type === TransactionType.Salary,
  );
  if (useRoleBasedSalaries && legacySalaryPosted) {
    throw new Error(
      'assertSalaryPathMutualExclusion: useRoleBasedSalaries is true but the legacy flat-rate salary path (Expense, tx-salary-*) posted a transaction — dailyCostsProcessor should have no-opped.',
    );
  }
  if (!useRoleBasedSalaries && roleBasedSalaryPosted) {
    throw new Error(
      'assertSalaryPathMutualExclusion: useRoleBasedSalaries is false but the role-based salary path (Salary) posted a transaction — financialProcessor should have no-opped.',
    );
  }
}
