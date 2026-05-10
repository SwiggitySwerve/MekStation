import type { StoreApi } from 'zustand';

import type { DayReport } from '@/lib/campaign/dayAdvancement';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import type { ForcesStore } from './useForcesStore';
import type { MissionsStore } from './useMissionsStore';

export interface CampaignState {
  campaign: ICampaign | null;
  pendingBattleOutcomes: ICombatOutcome[];
  processedBattleIds: string[];
  reviewedBattleIds: Record<string, number>;
  outcomeApplyErrors: Record<string, string>;
  forcesStore: StoreApi<ForcesStore> | null;
  missionsStore: StoreApi<MissionsStore> | null;
}

export interface CampaignActions {
  createCampaign: (
    name: string,
    factionId: string,
    options?: Partial<ICampaignOptions>,
  ) => string;
  loadCampaign: (id: string) => boolean;
  saveCampaign: () => void;
  advanceDay: () => DayReport | null;
  advanceDays: (count: number) => DayReport[] | null;
  getCampaign: () => ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  getForcesStore: () => StoreApi<ForcesStore> | null;
  getMissionsStore: () => StoreApi<MissionsStore> | null;
  enqueueOutcome: (outcome: ICombatOutcome) => void;
  dequeueOutcome: (matchId: string) => boolean;
  getPendingOutcomes: () => readonly ICombatOutcome[];
  reviewReady: (matchId: string) => boolean;
  getPendingOutcomeCount: () => number;
  getProcessedBattleIds: () => readonly string[];
  markBattleReviewed: (matchId: string) => void;
  getReviewedAt: (matchId: string) => number | null;
  getOutcomeApplyErrors: () => Readonly<Record<string, string>>;
  retryOutcomeApplication: (matchId: string) => boolean;
}

export type CampaignStore = CampaignState & CampaignActions;
