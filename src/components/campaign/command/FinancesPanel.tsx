/**
 * Finances Panel
 *
 * The Finances & Loans surface (CP2b — `add-campaign-command-ui`,
 * design D3). Renders the campaign balance, the `campaign-finances`
 * transaction ledger, a daily-cost projection, and the loan surface
 * (take a loan, view outstanding loans with their repayment schedule).
 *
 * The panel owns NO mutation: the take-loan action is a callback the page
 * wires to `campaignCommandActions.takeLoan`.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module components/campaign/command/FinancesPanel
 */

import React, { useState } from 'react';

import type { IDailyCostProjection } from '@/stores/campaign/campaignCommandSelectors';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';
import type { Transaction } from '@/types/campaign/Transaction';

import { Badge, Card } from '@/components/ui';
import { computeDailyRepayment } from '@/types/campaign/CampaignLoan';
import { Money } from '@/types/campaign/Money';

import { CommandEmpty } from './CommandStates';

// =============================================================================
// Balance + Daily Cost
// =============================================================================

interface BalanceSummaryProps {
  /** Current campaign balance. */
  readonly balance: Money;
  /** Daily-cost projection. */
  readonly dailyCost: IDailyCostProjection;
}

/**
 * The balance + daily-cost header. Shows the current C-bill balance and
 * the recurring daily drain (salary, maintenance, loan repayment).
 */
function BalanceSummary({
  balance,
  dailyCost,
}: BalanceSummaryProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="p-4" data-testid="finances-balance">
        <p className="text-text-theme-secondary text-xs uppercase">
          Current balance
        </p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            balance.isNegative() ? 'text-red-400' : 'text-text-theme-primary'
          }`}
        >
          {balance.format()}
        </p>
      </Card>

      <Card className="p-4" data-testid="finances-daily-cost">
        <p className="text-text-theme-secondary text-xs uppercase">
          Daily cost projection
        </p>
        <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
          {new Money(dailyCost.total).format()}
        </p>
        <p className="text-text-theme-secondary mt-1 text-xs">
          Salaries {new Money(dailyCost.salaries).format()} · Maintenance{' '}
          {new Money(dailyCost.maintenance).format()} · Loan repayment{' '}
          <span data-testid="finances-daily-loan-repayment">
            {new Money(dailyCost.loanRepayment).format()}
          </span>
        </p>
      </Card>
    </div>
  );
}

// =============================================================================
// Transaction Ledger
// =============================================================================

interface LedgerProps {
  /** The transaction ledger, newest first. */
  readonly transactions: readonly Transaction[];
}

/**
 * The `campaign-finances` transaction ledger. Renders an empty state when
 * the campaign has no recorded transactions (design D7).
 */
function Ledger({ transactions }: LedgerProps): React.ReactElement {
  if (transactions.length === 0) {
    return (
      <CommandEmpty
        title="No transactions yet"
        message="The campaign ledger is empty. Daily costs, contract payouts, and loans will appear here."
      />
    );
  }

  return (
    <div className="space-y-2" data-testid="finances-ledger">
      {transactions.map((tx) => (
        <Card
          key={tx.id}
          className="flex items-center justify-between p-3"
          data-testid={`ledger-row-${tx.id}`}
        >
          <div className="min-w-0">
            <p className="text-text-theme-primary truncate text-sm">
              {tx.description}
            </p>
            <p className="text-text-theme-secondary mt-0.5 text-xs">
              {new Date(tx.date).toLocaleDateString()} · {tx.type}
            </p>
          </div>
          <span className="text-text-theme-primary font-mono text-sm">
            {tx.amount.format()}
          </span>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Outstanding Loans
// =============================================================================

interface OutstandingLoansProps {
  /** The campaign's active loans. */
  readonly loans: readonly ICampaignLoan[];
}

/**
 * The outstanding-loan ledger. Each active loan shows its remaining
 * balance and repayment schedule (design D3). Renders an empty state
 * when the campaign has no active loans.
 */
function OutstandingLoans({
  loans,
}: OutstandingLoansProps): React.ReactElement {
  if (loans.length === 0) {
    return (
      <CommandEmpty
        title="No outstanding loans"
        message="The campaign carries no debt. Take a loan below to raise capital."
      />
    );
  }

  return (
    <div className="space-y-2" data-testid="finances-loan-list">
      {loans.map((loan) => (
        <Card key={loan.id} className="p-3" data-testid={`loan-row-${loan.id}`}>
          <div className="flex items-center justify-between">
            <p className="text-text-theme-primary text-sm font-semibold">
              {new Money(loan.principal).format()} principal
            </p>
            <Badge className="bg-amber-500/20 text-amber-400">
              {loan.status}
            </Badge>
          </div>
          <p className="text-text-theme-secondary mt-1 text-xs">
            Remaining {new Money(loan.remainingBalance).format()} · Repays{' '}
            {new Money(loan.dailyRepayment).format()} / day · Term{' '}
            {loan.termDays} days · Rate {(loan.interestRate * 100).toFixed(1)}%
          </p>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Take-Loan Form
// =============================================================================

interface TakeLoanFormProps {
  /** Take-loan callback — invoked with principal, rate, and term. */
  readonly onTakeLoan: (params: {
    principal: number;
    interestRate: number;
    termDays: number;
  }) => void;
  /** True while a take-loan request is in flight. */
  readonly isSubmitting: boolean;
}

/**
 * The take-loan form — principal, interest rate, and term inputs with a
 * live daily-repayment preview computed from the same `computeDailyRepayment`
 * the loan record uses (design D4).
 */
function TakeLoanForm({
  onTakeLoan,
  isSubmitting,
}: TakeLoanFormProps): React.ReactElement {
  const [principal, setPrincipal] = useState('1000000');
  const [interestPercent, setInterestPercent] = useState('10');
  const [termDays, setTermDays] = useState('365');

  const principalNum = Number(principal) || 0;
  const rateNum = (Number(interestPercent) || 0) / 100;
  const termNum = Number(termDays) || 0;

  // Live preview of the fixed daily repayment (design D4 math).
  const previewDaily =
    principalNum > 0 && termNum > 0
      ? computeDailyRepayment(principalNum, rateNum, termNum)
      : 0;

  const isValid = principalNum > 0 && rateNum >= 0 && termNum > 0;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!isValid) return;
    onTakeLoan({
      principal: principalNum,
      interestRate: rateNum,
      termDays: termNum,
    });
  };

  return (
    <Card className="p-4" data-testid="take-loan-form">
      <h3 className="text-text-theme-primary mb-3 text-sm font-semibold">
        Take a loan
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-text-theme-secondary text-xs">
              Principal (C-bills)
            </span>
            <input
              type="number"
              min="1"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="border-border-theme bg-surface-base text-text-theme-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              data-testid="loan-input-principal"
            />
          </label>
          <label className="block">
            <span className="text-text-theme-secondary text-xs">
              Interest rate (%)
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={interestPercent}
              onChange={(e) => setInterestPercent(e.target.value)}
              className="border-border-theme bg-surface-base text-text-theme-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              data-testid="loan-input-rate"
            />
          </label>
          <label className="block">
            <span className="text-text-theme-secondary text-xs">
              Term (days)
            </span>
            <input
              type="number"
              min="1"
              value={termDays}
              onChange={(e) => setTermDays(e.target.value)}
              className="border-border-theme bg-surface-base text-text-theme-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              data-testid="loan-input-term"
            />
          </label>
        </div>

        <p
          className="text-text-theme-secondary text-xs"
          data-testid="loan-daily-preview"
        >
          Daily repayment: {new Money(previewDaily).format()}
        </p>

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="bg-accent text-surface-base hover:bg-accent/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="loan-submit"
        >
          {isSubmitting ? 'Processing…' : 'Take loan'}
        </button>
      </form>
    </Card>
  );
}

// =============================================================================
// Panel
// =============================================================================

export interface FinancesPanelProps {
  /** Current campaign balance. */
  readonly balance: Money;
  /** The transaction ledger, newest first. */
  readonly transactions: readonly Transaction[];
  /** Daily-cost projection. */
  readonly dailyCost: IDailyCostProjection;
  /** The campaign's active loans. */
  readonly activeLoans: readonly ICampaignLoan[];
  /** Take-loan callback. */
  readonly onTakeLoan: (params: {
    principal: number;
    interestRate: number;
    termDays: number;
  }) => void;
  /** True while a take-loan request is in flight. */
  readonly isTakingLoan?: boolean;
}

/**
 * The Finances & Loans panel — balance + daily cost header, transaction
 * ledger, outstanding loans, and the take-loan form.
 */
export function FinancesPanel({
  balance,
  transactions,
  dailyCost,
  activeLoans,
  onTakeLoan,
  isTakingLoan = false,
}: FinancesPanelProps): React.ReactElement {
  return (
    <div className="space-y-6" data-testid="finances-panel">
      <BalanceSummary balance={balance} dailyCost={dailyCost} />

      <section>
        <h2 className="text-text-theme-primary mb-3 text-lg font-semibold">
          Transaction ledger
        </h2>
        <Ledger transactions={transactions} />
      </section>

      <section>
        <h2 className="text-text-theme-primary mb-3 text-lg font-semibold">
          Outstanding loans
        </h2>
        <OutstandingLoans loans={activeLoans} />
      </section>

      <section>
        <TakeLoanForm onTakeLoan={onTakeLoan} isSubmitting={isTakingLoan} />
      </section>
    </div>
  );
}

export default FinancesPanel;
