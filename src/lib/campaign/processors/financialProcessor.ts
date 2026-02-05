import type { ICampaign } from '@/types/campaign/Campaign';
import type { ILoan } from '@/types/campaign/Loan';
import type { Transaction } from '@/types/campaign/Transaction';

import { makePayment, isLoanPaidOff } from '@/lib/finances/loanService';
import { calculateTotalMonthlySalary } from '@/lib/finances/salaryService';
import {
  calculateTaxes,
  calculateMonthlyOverhead,
  calculateFoodAndHousing,
} from '@/lib/finances/taxService';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { getAllUnits } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';

import { DEFAULT_DAILY_MAINTENANCE } from '../dayAdvancement';
import {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
  DayPhase,
  getDayPipeline,
  isFirstOfMonth,
} from '../dayPipeline';

interface FinancialStepResult {
  readonly events: IDayEvent[];
  readonly campaign: ICampaign;
}

function createTransactionEvent(
  txType: TransactionType,
  amount: Money,
  description: string,
  balance: Money,
): IDayEvent {
  return {
    type: 'transaction',
    description,
    severity: balance.isNegative() ? 'warning' : 'info',
    data: {
      transactionType: txType,
      amount: amount.amount,
      description,
      balance: balance.amount,
    },
  };
}

function processMonthlySalaries(
  campaign: ICampaign,
  date: Date,
): FinancialStepResult {
  const salaryBreakdown = calculateTotalMonthlySalary(campaign);

  if (salaryBreakdown.total.isZero()) {
    return { events: [], campaign };
  }

  const newBalance = campaign.finances.balance.subtract(salaryBreakdown.total);
  const tx: Transaction = {
    id: `tx-salary-${date.toISOString()}`,
    type: TransactionType.Salary,
    amount: salaryBreakdown.total,
    date,
    description: `Monthly salaries for ${salaryBreakdown.personnelCount} personnel`,
  };

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions: [...campaign.finances.transactions, tx],
      balance: newBalance,
    },
  };

  return {
    events: [
      createTransactionEvent(
        TransactionType.Salary,
        salaryBreakdown.total,
        tx.description,
        newBalance,
      ),
    ],
    campaign: updatedCampaign,
  };
}

function processOverhead(campaign: ICampaign, date: Date): FinancialStepResult {
  const overhead = calculateMonthlyOverhead(campaign);

  if (overhead.isZero()) {
    return { events: [], campaign };
  }

  const newBalance = campaign.finances.balance.subtract(overhead);
  const tx: Transaction = {
    id: `tx-overhead-${date.toISOString()}`,
    type: TransactionType.Overhead,
    amount: overhead,
    date,
    description: `Monthly overhead (${campaign.options.overheadPercent}% of salary)`,
  };

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions: [...campaign.finances.transactions, tx],
      balance: newBalance,
    },
  };

  return {
    events: [
      createTransactionEvent(
        TransactionType.Overhead,
        overhead,
        tx.description,
        newBalance,
      ),
    ],
    campaign: updatedCampaign,
  };
}

function processFoodAndHousing(
  campaign: ICampaign,
  date: Date,
): FinancialStepResult {
  const foodCost = calculateFoodAndHousing(campaign);

  if (foodCost.isZero()) {
    return { events: [], campaign };
  }

  const newBalance = campaign.finances.balance.subtract(foodCost);
  const tx: Transaction = {
    id: `tx-food-housing-${date.toISOString()}`,
    type: TransactionType.FoodAndHousing,
    amount: foodCost,
    date,
    description: 'Monthly food and housing costs',
  };

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions: [...campaign.finances.transactions, tx],
      balance: newBalance,
    },
  };

  return {
    events: [
      createTransactionEvent(
        TransactionType.FoodAndHousing,
        foodCost,
        tx.description,
        newBalance,
      ),
    ],
    campaign: updatedCampaign,
  };
}

function processLoanPayments(
  campaign: ICampaign,
  date: Date,
): FinancialStepResult {
  const loans = campaign.finances.loans;
  if (!loans || loans.length === 0 || !campaign.options.useLoanSystem) {
    return { events: [], campaign };
  }

  const events: IDayEvent[] = [];
  let currentBalance = campaign.finances.balance;
  const transactions = [...campaign.finances.transactions];
  const updatedLoans: ILoan[] = [];

  for (const loan of loans) {
    if (isLoanPaidOff(loan)) {
      updatedLoans.push(loan);
      continue;
    }

    const paymentResult = makePayment(loan);
    currentBalance = currentBalance.subtract(
      paymentResult.paymentBreakdown.totalPayment,
    );

    const tx: Transaction = {
      id: `tx-loan-${loan.id}-${date.toISOString()}`,
      type: TransactionType.LoanPayment,
      amount: paymentResult.paymentBreakdown.totalPayment,
      date,
      description: `Loan payment (${paymentResult.paymentBreakdown.principalPortion.format()} principal, ${paymentResult.paymentBreakdown.interestPortion.format()} interest)`,
    };

    transactions.push(tx);
    updatedLoans.push(paymentResult.updatedLoan);
    events.push(
      createTransactionEvent(
        TransactionType.LoanPayment,
        paymentResult.paymentBreakdown.totalPayment,
        tx.description,
        currentBalance,
      ),
    );
  }

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions,
      balance: currentBalance,
      loans: updatedLoans,
    },
  };

  return { events, campaign: updatedCampaign };
}

function processTaxes(campaign: ICampaign, date: Date): FinancialStepResult {
  const taxAmount = calculateTaxes(campaign);

  if (taxAmount.isZero()) {
    return { events: [], campaign };
  }

  const newBalance = campaign.finances.balance.subtract(taxAmount);
  const tx: Transaction = {
    id: `tx-tax-${date.toISOString()}`,
    type: TransactionType.Tax,
    amount: taxAmount,
    date,
    description: `Monthly taxes (${campaign.options.taxRate}% on profits)`,
  };

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions: [...campaign.finances.transactions, tx],
      balance: newBalance,
    },
  };

  return {
    events: [
      createTransactionEvent(
        TransactionType.Tax,
        taxAmount,
        tx.description,
        newBalance,
      ),
    ],
    campaign: updatedCampaign,
  };
}

function processDailyMaintenance(
  campaign: ICampaign,
  date: Date,
): FinancialStepResult {
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (!rootForce) {
    return { events: [], campaign };
  }

  const allUnitIds = getAllUnits(rootForce, campaign.forces);
  const unitCount = allUnitIds.length;
  if (unitCount === 0) {
    return { events: [], campaign };
  }

  const dailyMaintenancePerUnit = new Money(
    DEFAULT_DAILY_MAINTENANCE * campaign.options.maintenanceCostMultiplier,
  );
  const totalMaintenance = dailyMaintenancePerUnit.multiply(unitCount);

  const newBalance = campaign.finances.balance.subtract(totalMaintenance);
  const tx: Transaction = {
    id: `tx-maintenance-${date.toISOString()}`,
    type: TransactionType.Maintenance,
    amount: totalMaintenance,
    date,
    description: `Daily maintenance for ${unitCount} units`,
  };

  const updatedCampaign: ICampaign = {
    ...campaign,
    finances: {
      ...campaign.finances,
      transactions: [...campaign.finances.transactions, tx],
      balance: newBalance,
    },
  };

  return {
    events: [
      createTransactionEvent(
        TransactionType.Maintenance,
        totalMaintenance,
        tx.description,
        newBalance,
      ),
    ],
    campaign: updatedCampaign,
  };
}

export const financialProcessor: IDayProcessor = {
  id: 'financial',
  phase: DayPhase.FINANCES,
  displayName: 'Financial Processing',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const events: IDayEvent[] = [];
    let updatedCampaign = campaign;

    if (isFirstOfMonth(date)) {
      const salaryResult = processMonthlySalaries(updatedCampaign, date);
      updatedCampaign = salaryResult.campaign;
      events.push(...salaryResult.events);

      const overheadResult = processOverhead(updatedCampaign, date);
      updatedCampaign = overheadResult.campaign;
      events.push(...overheadResult.events);

      const foodResult = processFoodAndHousing(updatedCampaign, date);
      updatedCampaign = foodResult.campaign;
      events.push(...foodResult.events);

      const loanResult = processLoanPayments(updatedCampaign, date);
      updatedCampaign = loanResult.campaign;
      events.push(...loanResult.events);

      const taxResult = processTaxes(updatedCampaign, date);
      updatedCampaign = taxResult.campaign;
      events.push(...taxResult.events);
    }

    if (campaign.options.payForMaintenance) {
      const maintenanceResult = processDailyMaintenance(updatedCampaign, date);
      updatedCampaign = maintenanceResult.campaign;
      events.push(...maintenanceResult.events);
    }

    return { events, campaign: updatedCampaign };
  },
};

export function registerFinancialProcessor(): void {
  getDayPipeline().register(financialProcessor);
}
