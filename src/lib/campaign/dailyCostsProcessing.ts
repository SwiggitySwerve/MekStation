/**
 * Daily Costs Processing - Finance phase of day advancement
 *
 * Extracted from `dayAdvancement.ts` (decompose refactor). Contains the
 * standalone `processDailyCosts` phase used by the legacy `advanceDay`
 * path, by the registry `dailyCostsProcessor`, and by direct unit tests.
 *
 * As of CP2b (`add-campaign-command-ui`, design D4) the daily-costs phase
 * also services campaign loans: each active loan's `dailyRepayment` is
 * summed into the daily cost and debited, the loan's `remainingBalance`
 * is decremented, and a loan settles to `repaid` once its balance hits
 * zero. There is no separate loan-repayment engine — repayment reuses
 * this pipeline (design D4).
 *
 * @module lib/campaign/dailyCostsProcessing
 */

import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { ICampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { getAllUnits } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { Transaction } from '@/types/campaign/Transaction';

import {
  DailyCostBreakdown,
  DEFAULT_DAILY_MAINTENANCE,
  DEFAULT_DAILY_SALARY,
} from './dayReportTypes';

/**
 * Apply one day of repayment to the campaign's active loans.
 *
 * Each active loan repays `min(dailyRepayment, remainingBalance)` — the
 * final day repays only the residual so a loan never overpays. A loan
 * whose balance reaches zero settles to `repaid` and stops contributing
 * to the daily cost (design D4).
 *
 * @param loans - the campaign's loan ledger (may be empty/undefined)
 * @returns the repaid C-bill total and the updated loan ledger
 */
function applyLoanRepayments(loans: readonly ICampaignLoan[] | undefined): {
  repaid: number;
  nextLoans: readonly ICampaignLoan[];
} {
  if (!loans || loans.length === 0) {
    return { repaid: 0, nextLoans: loans ?? [] };
  }

  let repaid = 0;
  const nextLoans = loans.map((loan): ICampaignLoan => {
    if (loan.status !== 'active') return loan;

    // The last instalment repays only what is left so a loan never
    // overpays past its remaining balance. A loan whose remaining
    // balance is within one C-bill cent of the daily instalment is
    // settled in full this pass — `Money` rounds to cents, so leaving a
    // sub-cent residual would strand the loan permanently `active`.
    const isFinalInstalment =
      loan.remainingBalance <= loan.dailyRepayment + 0.01;
    const payment = isFinalInstalment
      ? loan.remainingBalance
      : loan.dailyRepayment;
    repaid += payment;

    const remainingBalance = isFinalInstalment
      ? 0
      : loan.remainingBalance - payment;
    const status = isFinalInstalment ? 'repaid' : 'active';

    return {
      ...loan,
      remainingBalance,
      status,
    };
  });

  return { repaid, nextLoans };
}

/**
 * Process daily costs for the campaign.
 *
 * Calculates:
 * - Salary: DEFAULT_DAILY_SALARY * salaryMultiplier per active person
 * - Maintenance: DEFAULT_DAILY_MAINTENANCE * maintenanceCostMultiplier per unit
 * - Loan repayment: sum of every active loan's `dailyRepayment` (design D4)
 *
 * Deducts from campaign balance and records transactions.
 *
 * @param campaign - The campaign to process
 * @returns Updated finances, the updated loan ledger, and a cost breakdown
 */
export function processDailyCosts(campaign: ICampaign): {
  finances: { transactions: Transaction[]; balance: Money };
  loans: readonly ICampaignLoan[];
  costs: DailyCostBreakdown;
} {
  const { options } = campaign;
  const newTransactions: Transaction[] = [...campaign.finances.transactions];
  let currentBalance = campaign.finances.balance;

  // Count billable personnel for salary — read from roster store
  // (canonical source per PR4 of `wire-iperson-hard-cutover`).
  // CampaignPilotStatus.KIA is the only non-billable terminal status; Active,
  // Wounded, Critical, and MIA all still draw salary.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const personnelCount = rosterEntries.filter(
    (e) => e.status !== CampaignPilotStatus.KIA,
  ).length;

  // Calculate salary costs
  let salaries = Money.ZERO;
  if (options.payForSalaries && personnelCount > 0) {
    const dailySalaryPerPerson = new Money(
      DEFAULT_DAILY_SALARY * options.salaryMultiplier,
    );
    salaries = dailySalaryPerPerson.multiply(personnelCount);

    newTransactions.push({
      id: `tx-salary-${campaign.currentDate.toISOString()}`,
      type: TransactionType.Expense,
      amount: salaries,
      date: campaign.currentDate,
      description: `Daily salaries for ${personnelCount} personnel`,
    });

    currentBalance = currentBalance.subtract(salaries);
  }

  // Count units for maintenance
  let unitCount = 0;
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (rootForce) {
    const allUnitIds = getAllUnits(rootForce, campaign.forces);
    unitCount = allUnitIds.length;
  }

  // Calculate maintenance costs
  let maintenance = Money.ZERO;
  if (options.payForMaintenance && unitCount > 0) {
    const dailyMaintenancePerUnit = new Money(
      DEFAULT_DAILY_MAINTENANCE * options.maintenanceCostMultiplier,
    );
    maintenance = dailyMaintenancePerUnit.multiply(unitCount);

    newTransactions.push({
      id: `tx-maintenance-${campaign.currentDate.toISOString()}`,
      type: TransactionType.Maintenance,
      amount: maintenance,
      date: campaign.currentDate,
      description: `Daily maintenance for ${unitCount} units`,
    });

    currentBalance = currentBalance.subtract(maintenance);
  }

  // Service campaign loans — sum and debit each active loan's daily
  // repayment, then decrement the loan balances (design D4). Loans are
  // an additive optional campaign extension; a campaign with no loans
  // produces a zero repayment and an unchanged (empty) ledger.
  const campaignLoans = (campaign as ICampaignWithCommand).loans;
  const { repaid, nextLoans } = applyLoanRepayments(campaignLoans);
  let loanRepayment = Money.ZERO;
  if (repaid > 0) {
    loanRepayment = new Money(repaid);

    newTransactions.push({
      id: `tx-loan-repayment-${campaign.currentDate.toISOString()}`,
      type: TransactionType.LoanPayment,
      amount: loanRepayment,
      date: campaign.currentDate,
      description: `Loan repayment: ${loanRepayment.format()}`,
    });

    currentBalance = currentBalance.subtract(loanRepayment);
  }

  const total = salaries.add(maintenance).add(loanRepayment);

  return {
    finances: {
      transactions: newTransactions,
      balance: currentBalance,
    },
    loans: nextLoans,
    costs: {
      salaries,
      maintenance,
      loanRepayment,
      total,
      personnelCount,
      unitCount,
    },
  };
}
