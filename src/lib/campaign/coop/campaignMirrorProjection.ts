import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';

import { getStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';
import { Money } from '@/types/campaign/Money';

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
    factionStandings: buildFactionStandings(state.factionStanding),
    updatedAt: new Date().toISOString(),
  };
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

function buildFactionStandings(
  standing: Readonly<Record<string, number>>,
): Record<string, IFactionStanding> {
  const result: Record<string, IFactionStanding> = {};
  for (const [factionId, regard] of Object.entries(standing)) {
    result[factionId] = {
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
