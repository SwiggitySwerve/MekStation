/**
 * Campaign Command Selectors
 *
 * Typed read selectors over the command-tier campaign state consumed by
 * the command UI (CP2b — `add-campaign-command-ui`): the personnel-market
 * hiring pool, the `campaign-finances` ledger, the contract-market offers,
 * and the loan ledger.
 *
 * These are PURE functions of an `ICampaign` — no store subscription, no
 * mutation. Command pages call them against `getCampaign()`. Every
 * selector degrades gracefully to an empty projection so a fresh campaign
 * (no market generated, no transactions, no loans) renders an empty state
 * rather than crashing (design D7).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module stores/campaign/campaignCommandSelectors
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignContractMarket,
  ICampaignWithCommand,
} from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import type { IContract } from '@/types/campaign/Mission';
import type { Transaction } from '@/types/campaign/Transaction';

import {
  DEFAULT_DAILY_MAINTENANCE,
  DEFAULT_DAILY_SALARY,
} from '@/lib/campaign/dayReportTypes';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { getAllUnits } from '@/types/campaign/Force';
import { isContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Empty Projection Constants
// =============================================================================

/** Frozen empty offer / loan arrays — shared for a stable reference. */
const EMPTY_PERSONNEL_OFFERS: readonly IPersonnelMarketOffer[] = Object.freeze(
  [],
);
const EMPTY_CONTRACT_OFFERS: readonly IContract[] = Object.freeze([]);
const EMPTY_LOANS: readonly ICampaignLoan[] = Object.freeze([]);
const EMPTY_TRANSACTIONS: readonly Transaction[] = Object.freeze([]);

/** Frozen empty contract-market state — shared for a stable reference. */
const EMPTY_CONTRACT_MARKET: ICampaignContractMarket = Object.freeze({
  offers: EMPTY_CONTRACT_OFFERS,
  declinedOfferIds: Object.freeze([]),
});

// =============================================================================
// Personnel Market
// =============================================================================

/**
 * Project the personnel-market hiring pool. Returns an empty array when
 * the campaign has no market this cycle (design D7 — empty, not error).
 *
 * @param campaign - the live campaign, or `null` when none is loaded
 */
export function selectPersonnelMarket(
  campaign: ICampaign | null,
): readonly IPersonnelMarketOffer[] {
  if (!campaign) return EMPTY_PERSONNEL_OFFERS;
  const extended = campaign as ICampaignWithCommand;
  return extended.personnelMarket ?? EMPTY_PERSONNEL_OFFERS;
}

// =============================================================================
// Finances
// =============================================================================

/**
 * Read the current campaign balance. Returns `Money.ZERO` for a campaign
 * with no finances (defensive — finances are always present on a real
 * campaign).
 *
 * @param campaign - the live campaign
 */
export function selectBalance(campaign: ICampaign | null): Money {
  return campaign?.finances.balance ?? Money.ZERO;
}

/**
 * Project the `campaign-finances` transaction ledger, newest first.
 * Returns an empty array for a campaign with no recorded transactions.
 *
 * @param campaign - the live campaign
 */
export function selectTransactionLedger(
  campaign: ICampaign | null,
): readonly Transaction[] {
  const transactions = campaign?.finances.transactions;
  if (!transactions || transactions.length === 0) return EMPTY_TRANSACTIONS;
  // Newest-first: the ledger reads most-recent activity at the top.
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/**
 * A daily-cost projection — the recurring C-bill drain the player faces
 * each day. Mirrors `processDailyCosts`: salary per billable pilot,
 * maintenance per unit, plus the summed daily repayment of active loans
 * (design D4 — loan repayment flows through the daily-cost pipeline).
 */
export interface IDailyCostProjection {
  /** Daily salary cost in C-bills. */
  readonly salaries: number;
  /** Daily maintenance cost in C-bills. */
  readonly maintenance: number;
  /** Summed daily repayment of all active loans, in C-bills. */
  readonly loanRepayment: number;
  /** Total daily cost in C-bills. */
  readonly total: number;
}

/**
 * Count pilots who remain billable for daily salary costs.
 */
export function selectBillablePilotCount(
  pilots: readonly ICampaignRosterEntry[],
): number {
  return pilots.filter((pilot) => pilot.status !== CampaignPilotStatus.KIA)
    .length;
}

/**
 * Sum the `dailyRepayment` of every active loan on the campaign. This is
 * the figure the daily-cost pipeline adds to the daily drain (design D4).
 *
 * @param campaign - the live campaign
 */
export function selectActiveLoanDailyRepayment(
  campaign: ICampaign | null,
): number {
  return selectLoans(campaign)
    .filter((loan) => loan.status === 'active')
    .reduce((sum, loan) => sum + loan.dailyRepayment, 0);
}

/**
 * Project the daily-cost figure for the Finances page. `pilotCount` and
 * `unitCount` are passed in because billable-personnel state lives on
 * `useCampaignRosterStore` (not the campaign aggregate) — the page
 * resolves them and hands them here so this stays a pure function.
 *
 * @param campaign - the live campaign
 * @param pilotCount - billable pilot count (roster store)
 * @param unitCount - unit count (campaign forces) — optional; derived
 *   from the campaign when omitted
 */
export function selectDailyCostProjection(
  campaign: ICampaign | null,
  pilotCount: number,
  unitCount?: number,
): IDailyCostProjection {
  if (!campaign) {
    return { salaries: 0, maintenance: 0, loanRepayment: 0, total: 0 };
  }

  const options = campaign.options;

  const salaries = options.payForSalaries
    ? DEFAULT_DAILY_SALARY * options.salaryMultiplier * pilotCount
    : 0;

  // Derive the unit count from the campaign force tree when not supplied.
  let resolvedUnitCount = unitCount;
  if (resolvedUnitCount === undefined) {
    const rootForce = campaign.forces.get(campaign.rootForceId);
    resolvedUnitCount = rootForce
      ? getAllUnits(rootForce, campaign.forces).length
      : 0;
  }

  const maintenance = options.payForMaintenance
    ? DEFAULT_DAILY_MAINTENANCE *
      options.maintenanceCostMultiplier *
      resolvedUnitCount
    : 0;

  const loanRepayment = selectActiveLoanDailyRepayment(campaign);

  return {
    salaries,
    maintenance,
    loanRepayment,
    total: salaries + maintenance + loanRepayment,
  };
}

// =============================================================================
// Loans
// =============================================================================

/**
 * Project the campaign's loan ledger. Returns an empty array for a
 * campaign that has never taken a loan (design D7).
 *
 * @param campaign - the live campaign
 */
export function selectLoans(
  campaign: ICampaign | null,
): readonly ICampaignLoan[] {
  if (!campaign) return EMPTY_LOANS;
  const extended = campaign as ICampaignWithCommand;
  return extended.loans ?? EMPTY_LOANS;
}

/**
 * Project only the active loans on the campaign — the loans the Finances
 * page lists with their remaining balance and repayment schedule.
 *
 * @param campaign - the live campaign
 */
export function selectActiveLoans(
  campaign: ICampaign | null,
): readonly ICampaignLoan[] {
  return selectLoans(campaign).filter((loan) => loan.status === 'active');
}

// =============================================================================
// Contracts
// =============================================================================

/**
 * Get the contracts eligible for scenario generation.
 *
 * A contract is eligible when its endDate is in the future or undefined.
 * This deliberately does not inspect status because scenario generation
 * historically used only the end-date predicate.
 */
export function getActiveContracts(campaign: ICampaign): readonly IContract[] {
  const now = campaign.currentDate.getTime();
  const contracts: IContract[] = [];

  Array.from(campaign.missions.values()).forEach((mission) => {
    if (!isContract(mission)) return;

    const contract = mission as IContract;
    if (!contract.endDate) {
      contracts.push(contract);
    } else {
      const endTime = new Date(contract.endDate).getTime();
      if (endTime > now) {
        contracts.push(contract);
      }
    }
  });

  return contracts;
}

/**
 * Get active-status contracts that are still eligible by the shared
 * scenario-generation end-date predicate.
 */
export function selectActiveContracts(
  campaign: ICampaign | null,
): readonly IContract[] {
  if (!campaign) return EMPTY_CONTRACT_OFFERS;
  return getActiveContracts(campaign).filter(
    (contract) => contract.status === MissionStatus.ACTIVE,
  );
}

/**
 * Get the dashboard/Missions-tab active contract, if one exists.
 */
export function selectActiveContract(
  campaign: ICampaign | null,
): IContract | null {
  return selectActiveContracts(campaign)[0] ?? null;
}

// =============================================================================
// Contract Market
// =============================================================================

/**
 * Project the full contract-market state — offers plus declined-offer
 * ids. Returns a frozen empty market for a campaign with no market this
 * cycle (design D7).
 *
 * @param campaign - the live campaign
 */
export function selectContractMarketState(
  campaign: ICampaign | null,
): ICampaignContractMarket {
  if (!campaign) return EMPTY_CONTRACT_MARKET;
  const extended = campaign as ICampaignWithCommand;
  return extended.contractMarket ?? EMPTY_CONTRACT_MARKET;
}

/**
 * Project the contract-market offers the player can still act on — the
 * market offers with declined offers filtered out (design D5: a declined
 * offer is hidden until the next refresh).
 *
 * @param campaign - the live campaign
 */
export function selectVisibleContractOffers(
  campaign: ICampaign | null,
): readonly IContract[] {
  const market = selectContractMarketState(campaign);
  if (market.declinedOfferIds.length === 0) return market.offers;
  const declined = new Set(market.declinedOfferIds);
  return market.offers.filter((offer) => !declined.has(offer.id));
}
