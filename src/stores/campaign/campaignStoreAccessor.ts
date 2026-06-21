import type { StoreApi } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

interface CampaignStoreForRosterState {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

type CampaignStoreForRoster = StoreApi<CampaignStoreForRosterState>;

let getCampaignStore: (() => CampaignStoreForRoster) | null = null;

export function registerCampaignStoreAccessor(
  accessor: () => CampaignStoreForRoster,
): void {
  getCampaignStore = accessor;
}

export function getCampaignStoreForRoster(): CampaignStoreForRoster | null {
  return getCampaignStore?.() ?? null;
}
