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
    finances: {
      ...campaign.finances,
      balance: new Money(state.balance),
    },
    factionStandings: buildFactionStandings(state.factionStanding),
    updatedAt: new Date().toISOString(),
  };
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
