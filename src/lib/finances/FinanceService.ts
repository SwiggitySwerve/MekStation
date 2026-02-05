/**
 * FinanceService - Financial operations for campaign management
 *
 * Provides pure functions for managing campaign finances:
 * - recordTransaction: Add a transaction to finances
 * - getBalance: Calculate balance from all transactions
 * - calculateDailyCosts: Compute salary and maintenance totals
 * - processContractPayment: Record payment based on contract outcome
 *
 * All functions are immutable - they return new IFinances objects
 * rather than mutating the input.
 *
 * @module lib/finances/FinanceService
 */

import { ICampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { getAllUnits } from '@/types/campaign/Force';
import { IFinances } from '@/types/campaign/IFinances';
import { IContract } from '@/types/campaign/Mission';
import { getTotalPayout } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { Transaction } from '@/types/campaign/Transaction';

// =============================================================================
// Constants
// =============================================================================

/** Default daily salary per person in C-bills */
export const DEFAULT_DAILY_SALARY = 50;

/** Default daily maintenance cost per unit in C-bills */
export const DEFAULT_DAILY_MAINTENANCE = 100;

// =============================================================================
// recordTransaction
// =============================================================================

/**
 * Records a transaction in the campaign finances.
 *
 * Adds the transaction to the transactions array and updates the balance.
 * Income transactions increase the balance; expense/cost transactions decrease it.
 *
 * @param finances - Current finances state
 * @param transaction - The transaction to record
 * @returns Updated IFinances with the new transaction and adjusted balance
 *
 * @example
 * const updated = recordTransaction(finances, {
 *   id: 'tx-001',
 *   type: TransactionType.Income,
 *   amount: new Money(50000),
 *   date: new Date(),
 *   description: 'Contract payment',
 * });
 */
export function recordTransaction(
  finances: IFinances,
  transaction: Transaction,
): IFinances {
  const updatedTransactions = [...finances.transactions, transaction];

  // Income adds to balance, all other types subtract
  const isIncome =
    transaction.type === TransactionType.Income ||
    transaction.type === TransactionType.Salvage;

  const updatedBalance = isIncome
    ? finances.balance.add(transaction.amount)
    : finances.balance.subtract(transaction.amount);

  return {
    transactions: updatedTransactions,
    balance: updatedBalance,
  };
}

// =============================================================================
// getBalance
// =============================================================================

/**
 * Calculates the balance by summing all transactions.
 *
 * Income and Salvage transactions are positive; all other types are negative.
 * This recomputes the balance from scratch rather than trusting the stored value.
 *
 * @param finances - The finances to compute balance for
 * @returns The computed balance as Money
 *
 * @example
 * const balance = getBalance(finances);
 * console.log(balance.format()); // "1,000,000.00 C-bills"
 */
export function getBalance(finances: IFinances): Money {
  return finances.transactions.reduce((balance, transaction) => {
    const isIncome =
      transaction.type === TransactionType.Income ||
      transaction.type === TransactionType.Salvage;

    return isIncome
      ? balance.add(transaction.amount)
      : balance.subtract(transaction.amount);
  }, Money.ZERO);
}

// =============================================================================
// calculateDailyCosts
// =============================================================================

/**
 * Breakdown of daily costs for a campaign.
 */
export interface DailyCosts {
  /** Total salary costs for the day */
  readonly salaries: Money;
  /** Total maintenance costs for the day */
  readonly maintenance: Money;
  /** Combined total of salaries + maintenance */
  readonly total: Money;
  /** Number of personnel counted for salary */
  readonly personnelCount: number;
  /** Number of units counted for maintenance */
  readonly unitCount: number;
}

/**
 * Calculates the daily costs for a campaign.
 *
 * Computes:
 * - Salary: DEFAULT_DAILY_SALARY * salaryMultiplier per eligible person
 *   (excludes KIA, RETIRED, DESERTED personnel)
 * - Maintenance: DEFAULT_DAILY_MAINTENANCE * maintenanceCostMultiplier per unit
 *
 * Respects campaign options:
 * - payForSalaries: if false, salary is zero
 * - payForMaintenance: if false, maintenance is zero
 *
 * @param campaign - The campaign to calculate costs for
 * @returns DailyCosts breakdown
 *
 * @example
 * const costs = calculateDailyCosts(campaign);
 * console.log(`Salaries: ${costs.salaries.format()}`);
 * console.log(`Maintenance: ${costs.maintenance.format()}`);
 * console.log(`Total: ${costs.total.format()}`);
 */
export function calculateDailyCosts(campaign: ICampaign): DailyCosts {
  const { options } = campaign;

  // Count eligible personnel (not KIA, RETIRED, or DESERTED)
  const eligiblePersonnel = Array.from(campaign.personnel.values()).filter(
    (p) =>
      p.status !== PersonnelStatus.KIA &&
      p.status !== PersonnelStatus.RETIRED &&
      p.status !== PersonnelStatus.DESERTED,
  );
  const personnelCount = eligiblePersonnel.length;

  // Calculate salary costs
  let salaries = Money.ZERO;
  if (options.payForSalaries && personnelCount > 0) {
    const dailySalaryPerPerson = new Money(
      DEFAULT_DAILY_SALARY * options.salaryMultiplier,
    );
    salaries = dailySalaryPerPerson.multiply(personnelCount);
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
  }

  const total = salaries.add(maintenance);

  return {
    salaries,
    maintenance,
    total,
    personnelCount,
    unitCount,
  };
}

// =============================================================================
// processContractPayment
// =============================================================================

/**
 * Processes a contract payment and records it as a transaction.
 *
 * Uses the contract's payment terms and mission status to determine
 * the payout amount via getTotalPayout(). Records the payment as an
 * Income transaction in the finances.
 *
 * Only processes contracts in terminal states (SUCCESS, PARTIAL, FAILED,
 * BREACH, CANCELLED, ABORTED). Active or pending contracts return
 * finances unchanged.
 *
 * @param campaign - The campaign (used for current date)
 * @param contract - The contract to process payment for
 * @returns Updated IFinances with the payment transaction
 *
 * @example
 * const updatedFinances = processContractPayment(campaign, completedContract);
 */
export function processContractPayment(
  campaign: ICampaign,
  contract: IContract,
): IFinances {
  // Only process terminal contracts
  const terminalStatuses: MissionStatus[] = [
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
    MissionStatus.CANCELLED,
    MissionStatus.ABORTED,
  ];

  if (!terminalStatuses.includes(contract.status)) {
    return campaign.finances;
  }

  // Calculate payout based on contract outcome
  const payout = getTotalPayout(contract);

  // Don't record zero-amount transactions
  if (payout.isZero()) {
    return campaign.finances;
  }

  // Create payment transaction
  const transaction: Transaction = {
    id: `tx-contract-${contract.id}-${Date.now()}`,
    type: TransactionType.Income,
    amount: payout,
    date: campaign.currentDate,
    description: `Contract payment: ${contract.name} (${contract.status})`,
  };

  return recordTransaction(campaign.finances, transaction);
}
