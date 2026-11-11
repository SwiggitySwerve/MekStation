import type { StoreApi } from 'zustand';

import type { ICampaignCacheKey } from '@/lib/campaign/persistence/campaignCacheKey';
import type { IPendingWrite } from '@/lib/campaign/persistence/campaignPendingWrite';
import type { ICampaign } from '@/types/campaign/Campaign';

import type { CampaignPendingOutcomeSource } from './campaignBattleOutcomeState';
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
  /** Identity of the persisted copy (task 1.3); optional for test doubles. */
  cachedCampaignKey?: ICampaignCacheKey | null;
  setCachedCampaignKey?: (key: ICampaignCacheKey | null) => void;
  /** The unsaved-edit marker (`campaignPendingWrite`); optional for test doubles. */
  pendingWrite?: IPendingWrite | null;
  setPendingWrite?: (marker: IPendingWrite | null) => void;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (
    campaign: ICampaign,
    pendingSource?: CampaignPendingOutcomeSource,
  ) => void;
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

// Zustand subscriptions run synchronously inside switchCampaign. Keep the cause
// scoped to that one store installation; it is neither persisted nor an edit.
let serverInstallStore: CampaignStoreForRoster | null = null;

export function isInstallingServerCampaign(
  store: CampaignStoreForRoster,
): boolean {
  return serverInstallStore === store;
}

/** Install an authoritative row without making the dirty bridge treat it as an edit. */
export function installServerCampaign(campaign: ICampaign): void {
  const store = getCampaignStoreForRoster();
  if (!store) return;
  const previous = serverInstallStore;
  serverInstallStore = store;
  try {
    store.getState().switchCampaign(campaign, 'server');
  } finally {
    serverInstallStore = previous;
  }
}
