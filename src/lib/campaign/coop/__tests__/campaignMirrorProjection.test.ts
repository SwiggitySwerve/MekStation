/**
 * K14b PR4: the ledger projection keeps a viewer's market honest.
 *
 * Every viewer - the co-op host's own browser included - projects the
 * authoritative ledger onto its campaign with this one function. A recruit
 * whose deterministic `hired-<offerId>` pilot the ledger holds, and a
 * contract the ledger holds as accepted, are consumed: the projected
 * campaign must not offer them again. A decline stays only beside an offer
 * still listed (K14a's normalizer rule).
 */

import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  SAMPLE_CANDIDATES,
  SAMPLE_OFFERS,
} from '@/components/campaign/command/__fixtures__/commandFixtures';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { applyAuthoritativeStateToGuestCampaign } from '../campaignMirrorProjection';

function campaignWithMarkets(): ICampaignWithCommand {
  return {
    ...createCampaign('Projection Co.', 'mercenary', {
      startingFunds: 1_000_000,
    }),
    id: 'campaign-projection',
    personnelMarket: SAMPLE_CANDIDATES.slice(0, 2),
    contractMarket: {
      offers: SAMPLE_OFFERS.slice(0, 2),
      declinedOfferIds: [SAMPLE_OFFERS[1].id, 'offer-long-gone'],
    },
  };
}

describe('applyAuthoritativeStateToGuestCampaign markets', () => {
  it('drops the recruits and contracts the ledger has consumed', () => {
    const [hired, open] = SAMPLE_CANDIDATES;
    const [accepted, kept] = SAMPLE_OFFERS;
    const state = {
      ...createEmptyCampaignState('campaign-projection'),
      balance: 900_000,
      pilots: {
        [`hired-${hired.id}`]: {
          pilotId: `hired-${hired.id}`,
          name: hired.name,
        },
      },
      contracts: {
        [accepted.id]: {
          contractId: accepted.id,
          name: accepted.name,
          employerFactionId: accepted.employerId,
        },
      },
    };

    const projected = applyAuthoritativeStateToGuestCampaign(
      campaignWithMarkets(),
      state,
    ) as ICampaignWithCommand;

    expect(projected.personnelMarket?.map((one) => one.id)).toEqual([open.id]);
    expect(projected.contractMarket?.offers.map((one) => one.id)).toEqual([
      kept.id,
    ]);
    expect(projected.contractMarket?.declinedOfferIds).toEqual([kept.id]);
  });

  it('leaves a campaign without markets without markets', () => {
    const { personnelMarket, contractMarket, ...bare } = campaignWithMarkets();
    void personnelMarket;
    void contractMarket;

    const projected = applyAuthoritativeStateToGuestCampaign(
      bare,
      createEmptyCampaignState('campaign-projection'),
    ) as ICampaignWithCommand;

    expect('personnelMarket' in projected).toBe(false);
    expect('contractMarket' in projected).toBe(false);
  });
});
