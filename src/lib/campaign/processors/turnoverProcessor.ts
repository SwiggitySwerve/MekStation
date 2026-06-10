import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { Transaction } from '@/types/campaign/Transaction';

import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { TransactionType } from '@/types/campaign/enums/TransactionType';

import type { TurnoverReport } from '../turnover/turnoverCheck';

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

/**
 * Apply turnover results to the roster store + campaign finances.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: writes departure markers as
 * roster patches via `applyPilotPatches` (no personnel Map). Departure
 * is signalled via `departureReason` since `CampaignPilotStatus` has no
 * Retired/Deserted variants — downstream filters on `departureReason !=
 * null` to identify departed personnel. Finance side (transactions +
 * balance) stays on the campaign object as before.
 */
export function applyTurnoverResults(
  campaign: ICampaign,
  report: TurnoverReport,
  date: Date,
): ICampaign {
  const departures = report.results.filter(
    (r) => !r.passed && r.departureType !== null,
  );

  if (departures.length === 0) return campaign;

  const newTransactions: Transaction[] = [];
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();

  for (const departure of departures) {
    patches.set(departure.personId, {
      departureReason: departure.departureType!,
    });

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

  if (patches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(patches);
  }

  let updatedBalance = campaign.finances.balance;
  for (const tx of newTransactions) {
    updatedBalance = updatedBalance.subtract(tx.amount);
  }

  return {
    ...campaign,
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

    // Pre-join vault once so each checkTurnover call is O(1) instead of O(N).
    // NPC entries whose pilotId has no vault counterpart resolve to null.
    // Per PR4: roster store is the canonical entry source.
    const entries: readonly ICampaignRosterEntry[] =
      useCampaignRosterStore.getState().pilots;
    const vault = usePilotStore.getState().pilots;
    const pilotsByPilotId = buildPilotLookup(vault);

    const report = runTurnoverChecks(
      entries,
      pilotsByPilotId,
      campaign,
      // D-10 (2026-06-09 audit, W3.4): turnover target rolls draw from
      // the campaign's seeded daily stream so days are replayable.
      createDailyRandom(campaign, date, 'turnover'),
    );
    const updatedCampaign = applyTurnoverResults(campaign, report, date);
    const events = departuresToEvents(report);

    return { events, campaign: updatedCampaign };
  },
};

export function registerTurnoverProcessor(): void {
  getDayPipeline().register(turnoverProcessor);
}
