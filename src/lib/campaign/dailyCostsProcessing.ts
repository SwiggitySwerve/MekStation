/**
 * Daily Costs Processing - Finance phase of day advancement
 *
 * Extracted from `dayAdvancement.ts` (decompose refactor). Contains the
 * standalone `processDailyCosts` phase used by the legacy `advanceDay`
 * path, by the registry `dailyCostsProcessor`, and by direct unit tests.
 *
 * Behavior is identical to the pre-refactor implementation — this module
 * is a pure cut/paste of the daily-costs phase with no logic change.
 *
 * @module lib/campaign/dailyCostsProcessing
 */

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
 * Process daily costs for the campaign.
 *
 * Calculates:
 * - Salary: DEFAULT_DAILY_SALARY * salaryMultiplier per active person
 * - Maintenance: DEFAULT_DAILY_MAINTENANCE * maintenanceCostMultiplier per unit
 *
 * Deducts from campaign balance and records transactions.
 *
 * @param campaign - The campaign to process
 * @returns Updated finances and cost breakdown
 */
export function processDailyCosts(campaign: ICampaign): {
  finances: { transactions: Transaction[]; balance: Money };
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

  const total = salaries.add(maintenance);

  return {
    finances: {
      transactions: newTransactions,
      balance: currentBalance,
    },
    costs: {
      salaries,
      maintenance,
      total,
      personnelCount,
      unitCount,
    },
  };
}
