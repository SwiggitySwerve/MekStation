/**
 * Campaign Command Actions
 *
 * The four small value-bearing mutations the command UI (CP2b —
 * `add-campaign-command-ui`) performs:
 *
 *  1. `hireCandidate` — hires a personnel-market candidate. A thin
 *     call-through to the existing `personnel-management` hiring logic
 *     (`hirePerson` + roster-store `addPilot`) plus the hire-cost debit
 *     (design D2).
 *  2. `takeLoan` — credits the principal via a `campaign-finances`
 *     transaction and appends an `ICampaignLoan` with `dailyRepayment`
 *     fixed at creation time (design D3 / D4).
 *  3. `acceptContract` — accepts a contract-market offer. A thin
 *     call-through to the existing `mission-contracts` `acceptContract`
 *     logic (design D5).
 *  4. `declineContract` — records a declined offer id so the Contract
 *     Market page hides it until the next market refresh (design D5).
 *
 * Per design D6 every mutation routes through `useCampaignStore.updateCampaign`
 * and then marks the campaign dirty via `useCampaignPersistenceStore.markDirty()`
 * so the debounced auto-save (CP0) picks it up. No command surface writes
 * to the server directly.
 *
 * Each action re-reads the current market state at invocation: a hire or
 * accept of a market entry no longer present fails gracefully with an
 * `applied: false` result rather than corrupting campaign state
 * (design D7 — "Error state on a stale action").
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module stores/campaign/campaignCommandActions
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import type { IContract, IMission } from '@/types/campaign/Mission';

import {
  addRequest,
  removeRequest,
} from '@/lib/campaign/acquisition/shoppingList';
import { acceptContract as acceptContractEngine } from '@/lib/campaign/contractMarket';
import { hirePerson } from '@/lib/campaign/markets/personnelMarket';
import {
  AvailabilityRating,
  type IAcquisitionRequest,
} from '@/types/campaign/acquisition/acquisitionTypes';
import { createCampaignLoan } from '@/types/campaign/CampaignLoan';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';
// Importing the campaign-store module registers the store accessor as a
// side effect, so `getCampaignStoreForRoster()` resolves without this
// module calling the `useCampaignStore` hook (forbidden outside a
// component). Same pattern as `campaignBayActions`.
import './useCampaignStore';

function syncMissionsStore(missions: Map<string, IMission>): void {
  const store = getCampaignStoreForRoster();
  const missionsStore = store?.getState().getMissionsStore?.();
  if (!missionsStore) return;

  const missionState = missionsStore.getState();
  missions.forEach((mission) => {
    missionState.addMission(mission);
  });
}

// =============================================================================
// Campaign Mutation Surface
// =============================================================================

/**
 * Apply a campaign mutation through the live campaign store and mark the
 * campaign dirty so the persistence store's debounced auto-save fires
 * (design D6). Shared by every command action.
 *
 * The `mutate` callback returns the partial campaign update, or `null`
 * when the action could not be applied (campaign absent, stale market
 * entry) — in which case no write and no dirty-mark happens.
 *
 * @param mutate - pure transform producing the campaign update, or `null`
 * @returns `true` when a mutation was applied
 */
function applyCampaignMutation(
  mutate: (campaign: ICampaignWithCommand) => Partial<ICampaign> | null,
): boolean {
  const store = getCampaignStoreForRoster();
  if (!store) return false;
  const campaign = store.getState().campaign as ICampaignWithCommand | null;
  if (!campaign) return false;

  const updates = mutate(campaign);
  if (!updates) return false;

  store.getState().updateCampaign(updates);
  if (updates.missions instanceof Map) {
    syncMissionsStore(updates.missions);
  }
  // Route through the persistence store so the debounced auto-save picks
  // up the change (design D6). No direct server write.
  useCampaignPersistenceStore.getState().markDirty();
  return true;
}

// =============================================================================
// Result Types
// =============================================================================

/** Result of a command action. `applied` is false on a stale/invalid action. */
export interface ICommandActionResult {
  /** True when the action mutated the campaign. */
  readonly applied: boolean;
  /** Human-readable failure reason when `applied` is false. */
  readonly reason?: string;
}

// =============================================================================
// Acquisitions - Shopping List
// =============================================================================

/** Inputs for adding an acquisition request to the campaign shopping list. */
export interface IAddAcquisitionRequestParams {
  /** Human-readable part name, e.g. "Medium Laser". */
  readonly partName: string;
  /** Quantity to acquire. */
  readonly quantity: number;
  /** Campaign availability rating. */
  readonly availability: AvailabilityRating;
  /** True for ammo/consumables, false for durable parts. */
  readonly isConsumable: boolean;
  /** Optional stable part id. Defaults to a slug from the part name. */
  readonly partId?: string;
}

/** Result of adding an acquisition request. */
export interface IAddAcquisitionRequestResult extends ICommandActionResult {
  /** The request id that was appended when applied. */
  readonly requestId?: string;
}

function slugPartName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'part';
}

function isAvailabilityRating(value: unknown): value is AvailabilityRating {
  return Object.values(AvailabilityRating).includes(
    value as AvailabilityRating,
  );
}

function createAcquisitionRequest(
  campaign: ICampaign,
  params: IAddAcquisitionRequestParams,
): IAcquisitionRequest {
  const partId = params.partId?.trim() || slugPartName(params.partName);
  const sequence = campaign.shoppingList?.items.length ?? 0;
  const requestId = `req-${campaign.id}-${partId}-${sequence}`;
  return {
    id: requestId,
    partId,
    partName: params.partName.trim(),
    quantity: params.quantity,
    availability: params.availability,
    isConsumable: params.isConsumable,
    status: 'pending',
    attempts: 0,
  };
}

/**
 * Add a player-requested part acquisition to the shopping list.
 *
 * This is intentionally a thin UI mutation over the existing shopping-list
 * helper. The acquisition day processor remains responsible for rolls,
 * transit, delivery, and parts inventory materialization.
 */
export function addAcquisitionRequest(
  params: IAddAcquisitionRequestParams,
): IAddAcquisitionRequestResult {
  const partName = params.partName.trim();
  if (!partName) {
    return { applied: false, reason: 'Part name is required' };
  }
  if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
    return { applied: false, reason: 'Quantity must be a positive integer' };
  }
  if (!isAvailabilityRating(params.availability)) {
    return { applied: false, reason: 'Availability rating is invalid' };
  }

  let result: IAddAcquisitionRequestResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  applyCampaignMutation((campaign) => {
    const request = createAcquisitionRequest(campaign, {
      ...params,
      partName,
    });
    result = { applied: true, requestId: request.id };
    return {
      shoppingList: addRequest(campaign.shoppingList ?? { items: [] }, request),
    } as Partial<ICampaign>;
  });

  return result;
}

/**
 * Remove an acquisition request from the shopping list.
 *
 * The UI uses this for completed/failed cleanup and stale entry removal. It
 * does not mutate inventory; deliveries have already materialized through the
 * acquisition processor.
 */
export function removeAcquisitionRequest(
  requestId: string,
): ICommandActionResult {
  if (!requestId) {
    return { applied: false, reason: 'Request id is required' };
  }

  let result: ICommandActionResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  applyCampaignMutation((campaign) => {
    const shoppingList = campaign.shoppingList ?? { items: [] };
    if (!shoppingList.items.some((item) => item.id === requestId)) {
      result = { applied: false, reason: 'Acquisition request not found' };
      return null;
    }
    result = { applied: true };
    return {
      shoppingList: removeRequest(shoppingList, requestId),
    } as Partial<ICampaign>;
  });

  return result;
}

// =============================================================================
// Personnel — Hire
// =============================================================================

/**
 * Map a personnel-market offer onto a fresh `ICampaignRosterEntry` (an
 * inline-statblock NPC entry — hired recruits have no vault `IPilot`).
 *
 * @param offer - the market offer being hired
 * @param hireDate - the campaign's current date
 */
function offerToRosterEntry(
  offer: IPersonnelMarketOffer,
  hireDate: Date,
): ICampaignRosterEntry {
  return {
    pilotId: `hired-${offer.id}`,
    pilotName: offer.name,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate,
    primaryRole: offer.role,
    rankIndex: 0,
  };
}

/**
 * Hire a personnel-market candidate by offer id.
 *
 * Re-reads the live personnel market, resolves the offer through the
 * existing `personnel-management` `hirePerson` logic, debits the hire
 * cost via a `campaign-finances` transaction, adds the recruit to the
 * roster store, and removes the offer from the market. Marks the
 * campaign dirty so the persistence store auto-saves (design D2 / D6).
 *
 * Fails gracefully when the offer is no longer on the market (design D7).
 *
 * @param offerId - the personnel-market offer id
 * @returns whether the hire was applied
 */
export function hireCandidate(offerId: string): ICommandActionResult {
  let result: ICommandActionResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  applyCampaignMutation((campaign) => {
    const market = campaign.personnelMarket ?? [];
    // Re-read the market at invocation — a stale hire fails gracefully.
    const { hired, reason } = hirePerson(offerId, market);
    if (!hired) {
      result = { applied: false, reason: reason ?? 'Offer not found' };
      return null;
    }

    // Debit the hire cost via a campaign-finances transaction (design D2).
    const cost = new Money(hired.hireCost);
    const transaction = {
      id: `tx-hire-${hired.id}`,
      type: TransactionType.Expense,
      amount: cost,
      date: campaign.currentDate,
      description: `Hired ${hired.name} (${hired.role})`,
    };
    const finances = {
      transactions: [...campaign.finances.transactions, transaction],
      balance: campaign.finances.balance.subtract(cost),
      loans: campaign.finances.loans,
    };

    // Add the recruit to the roster store (the canonical personnel
    // source) — this is the existing personnel-management write path.
    useCampaignRosterStore
      .getState()
      .addPilot(offerToRosterEntry(hired, campaign.currentDate));

    // Drop the hired offer from the market pool.
    const nextMarket = market.filter((offer) => offer.id !== offerId);

    result = { applied: true };
    return {
      finances,
      personnelMarket: nextMarket,
    } as Partial<ICampaign>;
  });

  return result;
}

// =============================================================================
// Finances — Take Loan
// =============================================================================

/** Inputs for taking a loan. */
export interface ITakeLoanParams {
  /** C-bills to borrow. */
  readonly principal: number;
  /** Fractional interest rate over the term, e.g. `0.10`. */
  readonly interestRate: number;
  /** Loan term in days. */
  readonly termDays: number;
}

/**
 * Take a loan.
 *
 * Credits the principal to the balance via a `campaign-finances`
 * transaction and appends an `ICampaignLoan` with `dailyRepayment` fixed
 * at creation time (design D3 / D4). Marks the campaign dirty so the
 * persistence store auto-saves (design D6).
 *
 * Rejects a non-positive principal, a negative rate, or a non-positive
 * term — those would produce a nonsensical loan record (design D7).
 *
 * @param params - principal, interest rate, term
 * @returns whether the loan was taken
 */
export function takeLoan(params: ITakeLoanParams): ICommandActionResult {
  let result: ICommandActionResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  // Validate inputs before touching the campaign — a bad loan request
  // fails gracefully rather than appending a corrupt loan record.
  if (params.principal <= 0) {
    return { applied: false, reason: 'Principal must be positive' };
  }
  if (params.interestRate < 0) {
    return { applied: false, reason: 'Interest rate cannot be negative' };
  }
  if (params.termDays <= 0) {
    return { applied: false, reason: 'Term must be at least one day' };
  }

  applyCampaignMutation((campaign) => {
    const loan: ICampaignLoan = createCampaignLoan({
      id: `loan-${campaign.id}-${campaign.currentDate.getTime()}-${campaign.finances.transactions.length}`,
      principal: params.principal,
      interestRate: params.interestRate,
      termDays: params.termDays,
      takenOnDate: campaign.currentDate.toISOString(),
    });

    // Credit the principal via a campaign-finances transaction (design D4).
    const principal = new Money(params.principal);
    const transaction = {
      id: `tx-loan-${loan.id}`,
      type: TransactionType.LoanDisbursement,
      amount: principal,
      date: campaign.currentDate,
      description: `Loan disbursement: ${principal.format()}`,
    };
    const finances = {
      transactions: [...campaign.finances.transactions, transaction],
      balance: campaign.finances.balance.add(principal),
      loans: campaign.finances.loans,
    };

    const nextLoans: readonly ICampaignLoan[] = [
      ...(campaign.loans ?? []),
      loan,
    ];

    result = { applied: true };
    return {
      finances,
      loans: nextLoans,
    } as Partial<ICampaign>;
  });

  return result;
}

// =============================================================================
// Contract Market — Accept / Decline
// =============================================================================

/**
 * Accept a contract-market offer by id.
 *
 * Re-reads the live contract market, resolves the offer, and routes it
 * through the existing `mission-contracts` `acceptContract` logic (which
 * adds the contract to `campaign.missions` with `ACTIVE` status). Removes
 * the offer from the market pool. Marks the campaign dirty so the
 * persistence store auto-saves (design D5 / D6).
 *
 * Fails gracefully when the offer is no longer on the market (design D7).
 *
 * @param contractId - the contract-market offer id
 * @returns whether the contract was accepted
 */
export function acceptContractOffer(contractId: string): ICommandActionResult {
  let result: ICommandActionResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  applyCampaignMutation((campaign) => {
    const market = campaign.contractMarket;
    const offers = market?.offers ?? [];
    // Re-read the market at invocation — a stale accept fails gracefully.
    const offer = offers.find((o) => o.id === contractId);
    if (!offer) {
      result = { applied: false, reason: 'Contract offer not found' };
      return null;
    }
    if (campaign.missions.has(offer.id)) {
      result = { applied: false, reason: 'Contract already accepted' };
      return null;
    }

    // Route through the existing mission-contracts acceptance logic
    // (design D5) — it returns a campaign with the contract added to
    // `missions`. We only need the updated `missions` map.
    const accepted: ICampaign = acceptContractEngine(campaign, offer);

    // Drop the accepted offer from the market pool.
    const nextOffers: readonly IContract[] = offers.filter(
      (o) => o.id !== contractId,
    );

    result = { applied: true };
    return {
      missions: accepted.missions,
      contractMarket: {
        offers: nextOffers,
        declinedOfferIds: market?.declinedOfferIds ?? [],
      },
    } as Partial<ICampaign>;
  });

  return result;
}

/**
 * Decline a contract-market offer by id.
 *
 * Records the offer id in the market's `declinedOfferIds` so the Contract
 * Market page hides it until the next `contractMarketProcessor` refresh
 * (design D5). The offer record stays in `offers` — only the declined-id
 * list grows. Marks the campaign dirty so the persistence store
 * auto-saves (design D6).
 *
 * @param contractId - the contract-market offer id
 * @returns whether the decline was recorded
 */
export function declineContractOffer(contractId: string): ICommandActionResult {
  let result: ICommandActionResult = {
    applied: false,
    reason: 'No campaign loaded',
  };

  applyCampaignMutation((campaign) => {
    const market = campaign.contractMarket;
    const offers = market?.offers ?? [];
    const offer = offers.find((o) => o.id === contractId);
    if (!offer) {
      result = { applied: false, reason: 'Contract offer not found' };
      return null;
    }

    const declined = market?.declinedOfferIds ?? [];
    if (declined.includes(contractId)) {
      // Already declined — idempotent, nothing to write.
      result = { applied: false, reason: 'Offer already declined' };
      return null;
    }

    result = { applied: true };
    return {
      contractMarket: {
        offers,
        declinedOfferIds: [...declined, contractId],
      },
    } as Partial<ICampaign>;
  });

  return result;
}
