/**
 * Campaign Store
 *
 * Owns campaign-scoped state, including the nested `useForcesStore` campaign
 * roster concern. Standalone deployment / force-builder state remains owned by
 * `src/stores/useForceStore.ts`; this store references campaign forces through
 * its nested forces store rather than duplicating that UI concern.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  isActivityLogEntry,
  type IActivityLogEntry,
} from '@/types/campaign/ActivityLog';

import type { CampaignStore } from './useCampaignStore.types';

import { registerCampaignStoreAccessor } from './campaignStoreAccessor';
import { createCampaignStoreActions } from './useCampaignStore.actions';
import {
  dequeueCampaignOutcome,
  enqueueCampaignOutcome,
  isCampaignLinkedOutcome,
  markCampaignBattleReviewed,
  retryCampaignOutcomeApplication,
} from './useCampaignStore.outcomes';
import {
  deserializeCampaign,
  serializeCampaign,
  type SerializedCampaignState,
} from './useCampaignStore.persistence';

export function createCampaignStore(): StoreApi<CampaignStore> {
  return create<CampaignStore>()(
    persist(
      (set, get) => ({
        campaign: null,
        pendingBattleOutcomes: [],
        processedBattleIds: [],
        reviewedBattleIds: {},
        outcomeApplyErrors: {},
        forcesStore: null,
        missionsStore: null,
        activityLog: [],
        ...createCampaignStoreActions(set, get),
        getCampaign: () => get().campaign,
        getForcesStore: () => get().forcesStore,
        getMissionsStore: () => get().missionsStore,
        enqueueOutcome: (outcome) => enqueueCampaignOutcome(get, set, outcome),
        dequeueOutcome: (matchId) => dequeueCampaignOutcome(get, set, matchId),
        getPendingOutcomes: () => get().pendingBattleOutcomes,
        getPendingOutcomeCount: () => get().pendingBattleOutcomes.length,
        getProcessedBattleIds: () => get().processedBattleIds,
        reviewReady: (matchId) => {
          if (!matchId) return false;
          return get().pendingBattleOutcomes.some((o) => o.matchId === matchId);
        },
        markBattleReviewed: (matchId) =>
          markCampaignBattleReviewed(get, set, matchId),
        getReviewedAt: (matchId) => {
          if (!matchId) return null;
          return get().reviewedBattleIds[matchId] ?? null;
        },
        getOutcomeApplyErrors: () => get().outcomeApplyErrors,
        retryOutcomeApplication: (matchId) =>
          retryCampaignOutcomeApplication(get, set, matchId),
        getActivityLog: () => get().activityLog,
      }),
      {
        name: 'campaign-store',
        storage: createJSONStorage(() => clientSafeStorage),
        partialize: (state) => {
          if (!state.campaign) {
            return { campaign: null, activityLog: state.activityLog };
          }
          return {
            campaign: serializeCampaign(
              state.campaign,
              state.pendingBattleOutcomes,
              state.processedBattleIds,
              state.reviewedBattleIds,
            ),
            activityLog: state.activityLog,
          };
        },
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as {
            campaign?: SerializedCampaignState | null;
            activityLog?: IActivityLogEntry[];
          };
          const activityLog = Array.isArray(persistedData?.activityLog)
            ? persistedData.activityLog.filter(isActivityLogEntry)
            : [];
          if (!persistedData?.campaign) {
            return {
              ...current,
              campaign: null,
              forcesStore: null,
              missionsStore: null,
              activityLog,
            };
          }
          const serialized = persistedData.campaign;
          const campaign = deserializeCampaign(
            serialized,
            new Map(),
            new Map(),
          );
          return {
            ...current,
            campaign,
            pendingBattleOutcomes: serialized.pendingBattleOutcomes,
            processedBattleIds: serialized.processedBattleIds,
            reviewedBattleIds: serialized.reviewedBattleIds,
            forcesStore: null,
            missionsStore: null,
            activityLog,
          };
        },
      },
    ),
  );
}

let campaignStoreInstance: StoreApi<CampaignStore> | null = null;
let busUnsubscribe: (() => void) | null = null;

export function useCampaignStore(): StoreApi<CampaignStore> {
  if (!campaignStoreInstance) {
    campaignStoreInstance = createCampaignStore();
    busUnsubscribe = subscribeToCombatOutcome(
      (event: ICombatOutcomeReadyEvent) => {
        const store = campaignStoreInstance;
        if (!store) return;
        if (!isCampaignLinkedOutcome(event.outcome)) return;
        store.getState().enqueueOutcome(event.outcome);
      },
    );
  }
  return campaignStoreInstance;
}

export function resetCampaignStore(): void {
  if (busUnsubscribe) {
    busUnsubscribe();
    busUnsubscribe = null;
  }
  campaignStoreInstance = null;
}

registerCampaignStoreAccessor(useCampaignStore);
