/** Local offer eligibility and compatible recovery. Authority stays on the host. */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type {
  IPersonnelMarketOffer,
  IUnitMarketOffer,
} from '@/types/campaign/markets/marketTypes';

import { Money } from '@/types/campaign/Money';

import { removeExpiredOffers } from './personnelMarket';

export const COOP_MARKET_REFUSAL =
  'Use the co-op proposal controls for market changes.';

/** Used by local actions and seeding; never by authoritative co-op proposals. */
export function localMarketRefusal(
  campaign: Pick<ICampaign, 'coopSession'>,
  dayAdvanceInFlight = false,
): string | undefined {
  if (campaign.coopSession) return COOP_MARKET_REFUSAL;
  if (dayAdvanceInFlight)
    return 'Wait for the campaign clock to finish advancing.';
  return undefined;
}

/** Co-op has no host-authoritative decline command (K14b). */
export const COOP_DECLINE_REFUSAL =
  "Declining isn't available in co-op yet — there is no host-authoritative decline.";

/** A co-op guest receives no market, so it has no real offer to name (K14b). */
export const COOP_GUEST_MARKET_REFUSAL =
  "Co-op guests can't propose hires or contracts yet — guests don't receive the host's market.";

/**
 * Why a market page control is unavailable, per action (K14b). A solo
 * campaign keeps `localMarketRefusal`. In co-op, decline has no authority
 * at all, a guest names no real offer, and the host's Hire goes to the
 * campaign host as a `HireOffer` - so it is available unless the clock is
 * moving. The host's Accept keeps the K14a refusal.
 */
export function coopMarketActionRefusal(
  campaign: Pick<ICampaign, 'coopSession'>,
  action: 'hire' | 'accept' | 'decline',
  dayAdvanceInFlight = false,
): string | undefined {
  const session = campaign.coopSession;
  if (!session) return localMarketRefusal(campaign, dayAdvanceInFlight);
  if (action === 'decline') return COOP_DECLINE_REFUSAL;
  if (session.mode === 'guest') return COOP_GUEST_MARKET_REFUSAL;
  if (action === 'accept') return COOP_MARKET_REFUSAL;
  return localMarketRefusal({}, dayAdvanceInFlight);
}

export function hiredPilotId(offerId: string): string {
  return `hired-${offerId}`;
}
export function hireTransactionId(offerId: string): string {
  return `tx-hire-${offerId}`;
}
export function purchaseTransactionId(offerId: string): string {
  return `tx-purchase-${offerId}`;
}

export function marketFundsRefusal(
  campaign: ICampaign,
  cost: Money,
): string | undefined {
  if (!Number.isFinite(cost.amount) || cost.isNegative())
    return 'Invalid offer cost';
  return campaign.finances.balance.compareTo(cost) < 0
    ? 'Insufficient funds'
    : undefined;
}

export function contractExpired(
  endDate: string | undefined,
  date: Date,
): boolean {
  return !!endDate && endDate.slice(0, 10) < date.toISOString().split('T')[0];
}

function unitOfferExpired(offer: IUnitMarketOffer, date: Date): boolean {
  return offer.expirationDate < date.toISOString().split('T')[0];
}

export function unitOfferRefusal(
  campaign: ICampaign,
  offer: IUnitMarketOffer | undefined,
): string | undefined {
  if (!offer) return 'Offer not found';
  if (isUnitOfferConsumed(campaign, offer)) return 'Offer already consumed';
  if (unitOfferExpired(offer, campaign.currentDate)) return 'Offer expired';
  return undefined;
}

interface IBoundPersonnelRoster {
  readonly campaignId: string | null;
  readonly pilots: readonly { readonly pilotId: string }[];
}

export function isPersonnelOfferConsumed(
  campaign: ICampaign,
  offerId: string,
  roster?: IBoundPersonnelRoster,
): boolean {
  return (
    campaign.finances.transactions.some(
      (tx) => tx.id === hireTransactionId(offerId),
    ) ||
    (roster?.campaignId === campaign.id &&
      roster.pilots.some((pilot) => pilot.pilotId === hiredPilotId(offerId)))
  );
}

export function isUnitOfferConsumed(
  campaign: ICampaign,
  offer: IUnitMarketOffer,
): boolean {
  return (
    campaign.finances.transactions.some(
      (tx) => tx.id === purchaseTransactionId(offer.id),
    ) ||
    Array.from(campaign.forces.values()).some((force) =>
      force.unitIds.includes(offer.unitId),
    )
  );
}

export function personnelOfferRefusal(
  campaign: ICampaign,
  offer: IPersonnelMarketOffer | undefined,
  roster?: IBoundPersonnelRoster,
): string | undefined {
  if (!offer) return 'Offer not found';
  if (isPersonnelOfferConsumed(campaign, offer.id, roster))
    return 'Offer already consumed';
  if (
    !removeExpiredOffers(
      [offer],
      campaign.currentDate.toISOString().split('T')[0],
    ).length
  )
    return 'Offer expired';
  return undefined;
}

export function contractOfferRefusal(
  campaign: ICampaignWithCommand,
  offerId: string,
): string | undefined {
  if (campaign.missions.has(offerId)) return 'Contract already accepted';
  const market = campaign.contractMarket;
  const offer = market?.offers.find((one) => one.id === offerId);
  if (!offer) return 'Contract offer not found';
  if (market?.declinedOfferIds.includes(offerId))
    return 'Offer already declined';
  // Contracts have mission dates, not a separate offer deadline. Monthly
  // refresh owns market-cycle expiry; a finished contract cannot be signed.
  if (contractExpired(offer.endDate, campaign.currentDate))
    return 'Offer expired';
  return undefined;
}

/** Keep identity when unchanged so disabled processors remain genuine no-ops. */
function sameEntries<T>(before: readonly T[], after: readonly T[]): boolean {
  return (
    before.length === after.length &&
    before.every((entry, i) => entry === after[i])
  );
}

/**
 * Prune existing evidence only. Never create payments or enrollment. Personnel
 * enrollment in the separate bound roster is checked again at the action.
 * Co-op saved source/private payload reconciliation belongs to K14b.
 */
export function normalizeMarketOffers<T extends ICampaign>(
  campaign: T,
  date = campaign.currentDate,
): T {
  if (campaign.coopSession) return campaign;
  const extended: ICampaignWithCommand = campaign;
  const dateKey = date.toISOString().split('T')[0];
  let next = campaign;
  const market = extended.contractMarket;
  if (market) {
    const offers = market.offers.filter(
      (offer) =>
        !campaign.missions.has(offer.id) &&
        !contractExpired(offer.endDate, date),
    );
    const retained = new Set(offers.map((offer) => offer.id));
    // Keep the decline for every retained offer; pruning a marker alone would
    // silently resurrect that offer. Duplicated/obsolete markers carry no fact.
    const declinedOfferIds = [...new Set(market.declinedOfferIds)].filter(
      (id) => retained.has(id),
    );
    if (
      !sameEntries(market.offers, offers) ||
      !sameEntries(market.declinedOfferIds, declinedOfferIds)
    ) {
      next = {
        ...next,
        contractMarket: { ...market, offers, declinedOfferIds },
      };
    }
  }
  if (extended.personnelMarket) {
    const offers = removeExpiredOffers(
      extended.personnelMarket,
      dateKey,
    ).filter((offer) => !isPersonnelOfferConsumed(campaign, offer.id));
    if (!sameEntries(extended.personnelMarket, offers))
      next = { ...next, personnelMarket: offers };
  }
  if (extended.unitMarket) {
    const offers = extended.unitMarket.filter(
      (offer) =>
        !unitOfferExpired(offer, date) && !isUnitOfferConsumed(campaign, offer),
    );
    if (!sameEntries(extended.unitMarket, offers))
      next = { ...next, unitMarket: offers };
  }
  return next;
}
