import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { createCampaign } from '@/types/campaign/Campaign';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import {
  UnitMarketRarity,
  UnitMarketType,
} from '@/types/campaign/markets/marketTypes';
import { MarketExperienceLevel } from '@/types/campaign/markets/marketTypes';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';

import {
  normalizeMarketOffers,
  personnelOfferRefusal,
  hiredPilotId,
} from '../offerLifecycle';

function campaignWithOffers(): ICampaignWithCommand {
  const contract = createContract({
    id: 'live',
    name: 'Live',
    employerId: 'davion',
    targetId: 'liao',
  });
  return {
    ...createCampaign('Market', 'mercenary'),
    currentDate: new Date('3025-01-31'),
    contractMarket: {
      offers: [
        contract,
        { ...contract, id: 'accepted' },
        { ...contract, id: 'expired', endDate: '3025-01-30' },
      ],
      declinedOfferIds: ['live', 'accepted', 'missing', 'live', 'expired'],
    },
    personnelMarket: [
      {
        id: 'candidate',
        name: 'Recruit',
        role: CampaignPersonnelRole.PILOT,
        experienceLevel: MarketExperienceLevel.REGULAR,
        skills: {},
        hireCost: 100,
        expirationDate: '3025-01-31',
      },
    ],
  };
}

describe('local offer recovery', () => {
  it('removes an enrolled unpaid unit offer without inventing a payment', () => {
    const campaign: ICampaignWithCommand = {
      ...campaignWithOffers(),
      forces: new Map([
        [
          'root',
          {
            id: 'root',
            name: 'Root',
            subForceIds: [],
            unitIds: ['owned'],
            forceType: ForceRole.STANDARD,
            formationLevel: FormationLevel.LANCE,
            createdAt: '3025-01-01',
            updatedAt: '3025-01-01',
          },
        ],
      ]),
      unitMarket: [
        {
          id: 'old-unit',
          unitId: 'owned',
          unitName: 'Owned',
          rarity: UnitMarketRarity.COMMON,
          marketType: UnitMarketType.OPEN,
          quality: 'C',
          pricePercent: 100,
          baseCost: 100,
          expirationDate: '3025-01-31',
        },
      ],
    };
    const next = normalizeMarketOffers(campaign);
    expect(next.unitMarket).toEqual([]);
    expect(next.finances).toBe(campaign.finances);
    expect(next.finances.transactions).toEqual([]);
    expect(next.forces).toBe(campaign.forces);
  });
  it('accepted evidence wins, retained declines remain terminal, and normalization is idempotent', () => {
    const campaign = campaignWithOffers();
    const accepted = campaign.contractMarket?.offers[1];
    if (!accepted) throw new Error('Missing fixture');
    campaign.missions.set(accepted.id, accepted);
    const next = normalizeMarketOffers(campaign);
    expect(next.contractMarket?.offers.map((offer) => offer.id)).toEqual([
      'live',
    ]);
    expect(next.contractMarket?.declinedOfferIds).toEqual(['live']);
    expect(next.personnelMarket).toEqual(campaign.personnelMarket);
    expect(normalizeMarketOffers(next)).toBe(next);
    expect(next.finances).toBe(campaign.finances);
  });

  it('uses inclusive personnel expiry and persisted payment evidence without creating money or enrollment', () => {
    const campaign = campaignWithOffers();
    const expired = normalizeMarketOffers(campaign, new Date('3025-02-01'));
    expect(expired.personnelMarket).toEqual([]);
    const paid = {
      ...campaign,
      finances: {
        ...campaign.finances,
        transactions: [
          {
            id: 'tx-hire-candidate',
            type: TransactionType.Expense,
            amount: new Money(100),
            date: campaign.currentDate,
            description: 'Old payment',
          },
        ],
      },
    };
    const next = normalizeMarketOffers(paid);
    expect(next.personnelMarket).toEqual([]);
    expect(next.finances).toBe(paid.finances);
    expect(next.missions).toBe(paid.missions);
  });

  it('only trusts personnel enrollment in the matching bound roster', () => {
    const campaign = campaignWithOffers();
    const offer = campaign.personnelMarket?.[0];
    const pilots = [{ pilotId: hiredPilotId('candidate') }];
    expect(
      personnelOfferRefusal(campaign, offer, {
        campaignId: campaign.id,
        pilots,
      }),
    ).toBe('Offer already consumed');
    expect(
      personnelOfferRefusal(campaign, offer, { campaignId: 'other', pilots }),
    ).toBeUndefined();
  });
});
