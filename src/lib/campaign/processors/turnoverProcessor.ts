import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';
import type { Transaction } from '@/types/campaign/Transaction';

import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import type {
  TurnoverReport,
  TurnoverCheckResult,
} from '../turnover/turnoverCheck';

import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
  getDayPipeline,
  isMonday,
  isFirstOfMonth,
  isFirstOfYear,
} from '../dayPipeline';
import { runTurnoverChecks } from '../turnover/turnoverCheck';

const QUARTER_MONTHS = new Set([0, 3, 6, 9]);

function isFirstOfQuarter(date: Date): boolean {
  return date.getUTCDate() === 1 && QUARTER_MONTHS.has(date.getUTCMonth());
}

export function shouldRunTurnover(
  options: Partial<Pick<ICampaignOptions, 'turnoverCheckFrequency'>>,
  date: Date,
): boolean {
  const frequency = options.turnoverCheckFrequency ?? 'monthly';

  switch (frequency) {
    case 'weekly':
      return isMonday(date);
    case 'monthly':
      return isFirstOfMonth(date);
    case 'quarterly':
      return isFirstOfQuarter(date);
    case 'annually':
      return isFirstOfYear(date);
    case 'never':
      return false;
  }
}

const DEPARTURE_STATUS: Record<string, PersonnelStatus> = {
  retired: PersonnelStatus.RETIRED,
  deserted: PersonnelStatus.DESERTED,
};

export function applyTurnoverResults(
  campaign: ICampaign,
  report: TurnoverReport,
  date: Date,
): ICampaign {
  const departures = report.results.filter(
    (r) => !r.passed && r.departureType !== null,
  );

  if (departures.length === 0) return campaign;

  const updatedPersonnel = new Map(campaign.personnel);
  const newTransactions: Transaction[] = [];

  for (const departure of departures) {
    const person = updatedPersonnel.get(departure.personId);
    if (!person) continue;

    const newStatus =
      DEPARTURE_STATUS[departure.departureType!] ?? PersonnelStatus.RETIRED;

    const updatedPerson: IPerson = {
      ...person,
      status: newStatus,
      departureDate: date,
      departureReason: departure.departureType!,
    };
    updatedPersonnel.set(departure.personId, updatedPerson);

    if (departure.payout.isPositive()) {
      newTransactions.push({
        id: `turnover-payout-${departure.personId}-${date.getTime()}`,
        type: TransactionType.Expense,
        amount: departure.payout,
        date,
        description: `Retirement payout for ${departure.personName}`,
      });
    }
  }

  let updatedBalance = campaign.finances.balance;
  for (const tx of newTransactions) {
    updatedBalance = updatedBalance.subtract(tx.amount);
  }

  return {
    ...campaign,
    personnel: updatedPersonnel,
    finances: {
      transactions: [...campaign.finances.transactions, ...newTransactions],
      balance: updatedBalance,
    },
  };
}

function departuresToEvents(report: TurnoverReport): IDayEvent[] {
  return report.results
    .filter((r) => !r.passed && r.departureType !== null)
    .map((d) => ({
      type: 'turnover_departure',
      description: `${d.personName} has ${d.departureType}`,
      severity: 'warning' as const,
      data: {
        personId: d.personId,
        personName: d.personName,
        departureType: d.departureType,
        roll: d.roll,
        targetNumber: d.targetNumber,
        payout: d.payout.amount,
        modifiers: d.modifiers.map((m) => ({
          modifierId: m.modifierId,
          displayName: m.displayName,
          value: m.value,
          isStub: m.isStub,
        })),
      },
    }));
}

export const turnoverProcessor: IDayProcessor = {
  id: 'turnover',
  phase: DayPhase.PERSONNEL,
  displayName: 'Turnover Check',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (!shouldRunTurnover(campaign.options, date)) {
      return { events: [], campaign };
    }

    const report = runTurnoverChecks(campaign, Math.random);
    const updatedCampaign = applyTurnoverResults(campaign, report, date);
    const events = departuresToEvents(report);

    return { events, campaign: updatedCampaign };
  },
};

export function registerTurnoverProcessor(): void {
  getDayPipeline().register(turnoverProcessor);
}
