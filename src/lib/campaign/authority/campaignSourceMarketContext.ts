/**
 * The server co-op host's market reader (K14b).
 *
 * A server-resident `CampaignMatchHost` holds the ledger, not the markets.
 * The markets live in the campaign's saved `campaigns` row, which the host's
 * whole-envelope saves keep current, so that row is the authority a co-op
 * `HireOffer` or `AcceptContract` is judged against - read at each intent,
 * through the same readers and the same mapping the durable commands use.
 *
 * Unlike the durable commands, this read is not inside the append's
 * transaction: the match host commits through its own single-writer
 * pipeline. A rival save landing between the read and the commit can only
 * swap one STORED offer for another; it cannot make the caller the source
 * of a recruit, a price or a contract.
 */
import type Database from 'better-sqlite3';

import type { ICampaignIntentContext } from '@/lib/multiplayer/server/CampaignMatchHostIntent';

import {
  authoritativeContractOfferOf,
  authoritativePersonnelOfferOf,
} from '@/lib/campaign/markets/authoritativeOffers';

import {
  isStoredContractOffer,
  readCampaignSourceMarket,
  storedCampaignDate,
} from './campaignAcceptContractCommand';
import { readCampaignSourcePersonnelMarket } from './campaignHireOfferCommand';

/**
 * The reader bound to `campaignId`'s saved row on `database()`. A row that
 * is absent, unreadable, not a source record, or has no market or clock to
 * judge against answers `'source-unavailable'`; a readable market without a
 * usable offer under the id answers `null`.
 */
export function sourceRowMarketIntentContext(
  campaignId: string,
  database: () => Database.Database,
): ICampaignIntentContext {
  return {
    personnelOffer: (offerId) => {
      const source = readCampaignSourcePersonnelMarket(database(), campaignId);
      if (source === null) return 'source-unavailable';
      const stored = source.storedOffers.find((one) => one.id === offerId);
      return stored === undefined
        ? null
        : authoritativePersonnelOfferOf(stored, source.campaignDate);
    },
    contractOffer: (contractId) => {
      const source = readCampaignSourceMarket(database(), campaignId);
      if (source === null) return 'source-unavailable';
      const offer = source.market.offers.find((one) => one.id === contractId);
      const stored = source.storedOffers.find((one) => one.id === contractId);
      if (
        offer === undefined ||
        stored === undefined ||
        !isStoredContractOffer(stored)
      ) {
        return null;
      }
      const sourceDate = storedCampaignDate(source.storedBody);
      if (offer.endDate && sourceDate === null) return 'source-unavailable';
      return authoritativeContractOfferOf(
        offer,
        source.market.declinedOfferIds,
        sourceDate?.toISOString(),
      );
    },
  };
}
