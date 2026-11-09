import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';

import { hiredPilotId } from '@/lib/campaign/markets/offerLifecycle';
import { getStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';
import { Money } from '@/types/campaign/Money';

/**
 * Project an authoritative ledger state onto a campaign record.
 *
 * Despite the historical `Guest` in the name this is role-agnostic and
 * is the ONE projection every viewer uses — including the GM/host's own
 * browser surface, which holds the all-scopes grant and is therefore
 * just another consumer of the stream it publishes (design D9: "same
 * mechanism, no special path").
 */
export function applyAuthoritativeStateToGuestCampaign(
  campaign: ICampaign,
  state: ICampaignAuthoritativeState,
): ICampaign {
  return {
    ...campaign,
    currentDate: latestCampaignDate(
      campaign.currentDate,
      dateForCampaignDay(campaign, state.day),
    ),
    finances: {
      ...campaign.finances,
      balance: new Money(state.balance),
    },
    factionStandings: buildFactionStandings(
      campaign.factionStandings,
      state.factionStanding,
    ),
    ...withoutConsumedOffers(campaign, state),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * The viewer's markets without the offers the ledger has consumed (K14b): a
 * recruit whose deterministic `hired-<offerId>` pilot the ledger holds, and a
 * contract the ledger holds as accepted. So the co-op host's own page never
 * offers a hired recruit again. A decline stays only beside an offer still
 * listed (K14a's normalizer rule); a campaign without a market gains none.
 * The saved record is pruned the same way when a co-op command rewrites it.
 */
function withoutConsumedOffers(
  campaign: ICampaignWithCommand,
  state: ICampaignAuthoritativeState,
): Pick<ICampaignWithCommand, 'personnelMarket' | 'contractMarket'> {
  const market = campaign.contractMarket;
  const offers = market?.offers.filter(
    (offer) => state.contracts[offer.id] === undefined,
  );
  const retained = new Set(offers?.map((offer) => offer.id));
  return {
    ...(campaign.personnelMarket === undefined
      ? {}
      : {
          personnelMarket: campaign.personnelMarket.filter(
            (offer) => state.pilots[hiredPilotId(offer.id)] === undefined,
          ),
        }),
    ...(market === undefined || offers === undefined
      ? {}
      : {
          contractMarket: {
            ...market,
            offers,
            declinedOfferIds: market.declinedOfferIds.filter((id) =>
              retained.has(id),
            ),
          },
        }),
  };
}

/**
 * The campaign record a viewer should now hold, or `null` when there is
 * nothing to project: no authoritative state yet, no loaded campaign, or
 * a campaign that is not the one this surface is bound to.
 *
 * Both live surfaces — the guest's mirror and the GM/host's own fold —
 * call this rather than repeating the guard-then-project dance, so the
 * two roles cannot drift apart in WHEN they project any more than they
 * can in HOW (design D9).
 */
export function projectAuthoritativeStateOntoCampaign(
  current: ICampaign | null | undefined,
  campaignId: string | undefined,
  state: ICampaignAuthoritativeState | null | undefined,
): ICampaign | null {
  if (!state || !current || current.id !== campaignId) return null;
  return applyAuthoritativeStateToGuestCampaign(current, state);
}

function latestCampaignDate(current: Date, projected: Date): Date {
  return projected.getTime() >= current.getTime() ? projected : current;
}

function dateForCampaignDay(campaign: ICampaign, day: number): Date {
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
  const next = new Date(startDate);
  next.setUTCDate(next.getUTCDate() + day);
  return next;
}

/**
 * Merge the ledger's regard numbers into the campaign's standings.
 *
 * The ledger carries regard ONLY — accolade, censure, and the regard
 * history are campaign-record facts it cannot round-trip. Rebuilding the
 * map from the ledger therefore erased them, which was harmless while
 * the only consumer was a guest mirror that never held them and is
 * information loss now that the GM/host folds its own richer record
 * through this same projection. So: update regard (and the level derived
 * from it) in place, keep everything else the record already knows, and
 * seed a fresh entry only for a faction the record has never seen.
 */
function buildFactionStandings(
  current: Readonly<Record<string, IFactionStanding>>,
  standing: Readonly<Record<string, number>>,
): Record<string, IFactionStanding> {
  const result: Record<string, IFactionStanding> = { ...current };
  for (const [factionId, regard] of Object.entries(standing)) {
    const existing = current[factionId];
    result[factionId] = existing
      ? { ...existing, regard, level: getStandingLevel(regard) }
      : {
          factionId,
          regard,
          level: getStandingLevel(regard),
          accoladeLevel: 0,
          censureLevel: 0,
          history: [],
        };
  }
  return result;
}
