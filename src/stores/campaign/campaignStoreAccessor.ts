import type { StoreApi } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

import type { MissionsStore } from './useMissionsStore';

interface CampaignStoreForRosterState {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
  getMissionsStore?: () => StoreApi<MissionsStore> | null;
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
