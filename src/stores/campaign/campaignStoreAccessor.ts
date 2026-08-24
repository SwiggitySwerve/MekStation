import type { StoreApi } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

import type { MissionsStore } from './useMissionsStore';

interface CampaignStoreForRosterState {
  campaign: ICampaign | null;
  /**
   * Id of a campaign that entered the store by storage rehydration. The
   * persistence store reads it to tell a legacy browser copy from a
   * campaign created this session; optional so existing test doubles of
   * this accessor keep satisfying the shape.
   */
  rehydratedCampaignId?: string | null;
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
