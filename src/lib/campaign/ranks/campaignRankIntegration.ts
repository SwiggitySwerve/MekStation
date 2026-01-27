import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRankSystem } from '@/types/campaign/ranks/rankTypes';
import { getRankSystem, getDefaultRankSystem } from '@/lib/campaign/ranks/rankSystems';

export function getCampaignRankSystem(campaign: ICampaign): IRankSystem {
  const code = campaign.options.rankSystemCode ?? 'MERC';
  return getRankSystem(code) ?? getDefaultRankSystem();
}
