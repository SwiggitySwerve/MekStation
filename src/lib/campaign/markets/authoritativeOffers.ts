/**
 * Market offers as an AUTHORITY holds them (K14b).
 *
 * Every campaign authority judges a `HireOffer` or an `AcceptContract`
 * against the market it holds - the durable source row, the server co-op
 * host's saved row, the in-browser host's own campaign. These are the one
 * mapping from a stored offer to the facts `validateCampaignIntent` reads,
 * so the three authorities cannot disagree about what an offer says.
 */
import type {
  IAuthoritativeContractOffer,
  IAuthoritativePersonnelOffer,
  ICampaignIntentContext,
} from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { IContract } from '@/types/campaign/Mission';

/**
 * A stored personnel offer as an authoritative hire fact, or `null` when it
 * is not one. Every field the hire commits must be PRESENT: a missing price
 * must never become a free recruit, and a missing name must never become a
 * pilot the market did not offer. Takes the offer as untrusted JSON because
 * a saved row is read as JSON.
 */
export function authoritativePersonnelOfferOf(
  stored: Readonly<Record<string, unknown>>,
  campaignDate: string,
): IAuthoritativePersonnelOffer | null {
  const { id, name, hireCost, expirationDate } = stored;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof hireCost !== 'number' ||
    !Number.isFinite(hireCost) ||
    hireCost < 0 ||
    typeof expirationDate !== 'string' ||
    expirationDate.length === 0
  ) {
    return null;
  }
  return { offerId: id, name, hireCost, expirationDate, campaignDate };
}

/** A contract offer as an authoritative acceptance fact. */
export function authoritativeContractOfferOf(
  offer: Pick<IContract, 'id' | 'name' | 'employerId' | 'endDate'>,
  declinedOfferIds: readonly string[],
  campaignDate: string | undefined,
): IAuthoritativeContractOffer {
  return {
    contractId: offer.id,
    name: offer.name,
    employerFactionId: offer.employerId,
    declined: declinedOfferIds.includes(offer.id),
    ...(offer.endDate === undefined ? {} : { endDate: offer.endDate }),
    ...(campaignDate === undefined ? {} : { campaignDate }),
  };
}

/**
 * The market reader for an authority whose market is a LIVE campaign - the
 * in-browser co-op host. Read at every intent, so a market refreshed after
 * the session opened is the one judged. A campaign that is gone or is not
 * `campaignId` holds no market for this host, and every hire and acceptance
 * is then refused rather than judged against the wrong campaign.
 */
export function campaignMarketIntentContext(
  campaignId: string,
  read: () => ICampaignWithCommand | null,
): ICampaignIntentContext {
  const live = (): ICampaignWithCommand | null => {
    const campaign = read();
    return campaign?.id === campaignId ? campaign : null;
  };
  return {
    personnelOffer: (offerId) => {
      const campaign = live();
      if (campaign === null) return 'source-unavailable';
      const offer = campaign.personnelMarket?.find((one) => one.id === offerId);
      return offer === undefined
        ? null
        : authoritativePersonnelOfferOf(
            offer as unknown as Readonly<Record<string, unknown>>,
            campaign.currentDate.toISOString(),
          );
    },
    contractOffer: (contractId) => {
      const campaign = live();
      if (campaign === null) return 'source-unavailable';
      const market = campaign.contractMarket;
      const offer = market?.offers.find((one) => one.id === contractId);
      return market === undefined || offer === undefined
        ? null
        : authoritativeContractOfferOf(
            offer,
            market.declinedOfferIds,
            campaign.currentDate.toISOString(),
          );
    },
  };
}
