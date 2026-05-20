import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '@/lib/campaign/dailyBattleAuditBuilder';
import {
  convertToLegacyDayReport,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import { getDayPipeline } from '@/lib/campaign/dayPipeline';
import { registerBuiltinProcessors } from '@/lib/campaign/processors';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  ICampaign,
  createCampaign as createCampaignEntity,
} from '@/types/campaign/Campaign';
import { createGuestCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { IForce } from '@/types/campaign/Force';

import type { CampaignStore } from './useCampaignStore.types';

import { registerCampaignStoreAccessor } from './campaignStoreAccessor';
import {
  dequeueCampaignOutcome,
  enqueueCampaignOutcome,
  isCampaignLinkedOutcome,
  markCampaignBattleReviewed,
  retryCampaignOutcomeApplication,
} from './useCampaignStore.outcomes';
import {
  deserializeCampaign,
  persistCampaignRecord,
  serializeCampaign,
  snapshotRosterPilots,
  withBattleQueueAttached,
  type SerializedCampaignState,
} from './useCampaignStore.persistence';
import { createForcesStore } from './useForcesStore';
import { createMissionsStore } from './useMissionsStore';
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
        createCampaign: (name, factionId, options, coopOpts) => {
          const campaign = createCampaignEntity(name, factionId, options);
          const rootForce: IForce = {
            id: campaign.rootForceId,
            name: name,
            parentForceId: undefined,
            subForceIds: [],
            unitIds: [],
            forceType: ForceRole.STANDARD,
            formationLevel: FormationLevel.REGIMENT,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const forcesStore = createForcesStore(campaign.id);
          const missionsStore = createMissionsStore(campaign.id);
          forcesStore.getState().addForce(rootForce);
          // Per `wire-coop-campaign-route` task 1.3: when the caller is the
          // "Create co-op campaign" entry point on the campaign list page,
          // `coopOpts.coopSession` is set with `mode: 'host'` — stamp it
          // directly on the campaign so every downstream gate (the
          // navigation badge, the dashboard host-review surface, the
          // mission-launch picker) sees a co-op campaign from frame zero.
          const campaignWithForce: ICampaign = {
            ...campaign,
            forces: new Map([[rootForce.id, rootForce]]),
            coopSession: coopOpts?.coopSession,
          };
          set({
            campaign: campaignWithForce,
            forcesStore,
            missionsStore,
          });
          return campaign.id;
        },
        createGuestMirrorCampaign: (hostMatchId, snapshot) => {
          // Per `wire-coop-campaign-route` task 1.4: a guest mirror campaign
          // is minted from the host snapshot the guest receives on join
          // (over CO1's session-lifecycle protocol). The mirror campaign id
          // tracks the host's campaign id so cross-window references line
          // up; the local `coopSession` is stamped with `mode: 'guest'` and
          // the host's match id so every mutation control submits an
          // `IGuestProposal` instead of mutating campaign state directly.
          const campaign = createCampaignEntity(
            snapshot.campaignName,
            snapshot.factionId,
          );
          const rootForce: IForce = {
            id: campaign.rootForceId,
            name: snapshot.campaignName,
            parentForceId: undefined,
            subForceIds: [],
            unitIds: [],
            forceType: ForceRole.STANDARD,
            formationLevel: FormationLevel.REGIMENT,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const localId = snapshot.campaignId || campaign.id;
          const forcesStore = createForcesStore(localId);
          const missionsStore = createMissionsStore(localId);
          forcesStore.getState().addForce(rootForce);
          const guestSession = createGuestCoopSession(
            hostMatchId,
            snapshot.roomCode,
          );
          const mirror: ICampaign = {
            ...campaign,
            id: localId,
            forces: new Map([[rootForce.id, rootForce]]),
            coopSession: guestSession,
          };
          set({
            campaign: mirror,
            forcesStore,
            missionsStore,
          });
          return localId;
        },
        loadCampaign: (id) => {
          const storageKey = `campaign-${id}`;
          const storedResult = clientSafeStorage.getItem(storageKey);
          const stored = storedResult as string | null;
          if (!stored) {
            return false;
          }
          try {
            const parsed = JSON.parse(stored) as {
              state: SerializedCampaignState;
            };
            const serialized = parsed.state;
            const forcesStore = createForcesStore(id);
            const missionsStore = createMissionsStore(id);
            const forces = new Map(
              forcesStore
                .getState()
                .getAllForces()
                .map((f) => [f.id, f]),
            );
            const missions = new Map(
              missionsStore
                .getState()
                .getAllMissions()
                .map((m) => [m.id, m]),
            );
            const campaign = deserializeCampaign(serialized, forces, missions);
            set({
              campaign,
              pendingBattleOutcomes: serialized.pendingBattleOutcomes,
              processedBattleIds: serialized.processedBattleIds,
              reviewedBattleIds: serialized.reviewedBattleIds,
              forcesStore,
              missionsStore,
            });
            return true;
          } catch {
            return false;
          }
        },
        saveCampaign: () => {
          const {
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
            forcesStore,
            missionsStore,
          } = get();
          if (!campaign) {
            return;
          }
          const forces = forcesStore
            ? new Map(
                forcesStore
                  .getState()
                  .getAllForces()
                  .map((f) => [f.id, f]),
              )
            : campaign.forces;
          const missions = missionsStore
            ? new Map(
                missionsStore
                  .getState()
                  .getAllMissions()
                  .map((m) => [m.id, m]),
              )
            : campaign.missions;
          const updatedCampaign: ICampaign = {
            ...campaign,
            forces,
            missions,
            updatedAt: new Date().toISOString(),
          };
          set({ campaign: updatedCampaign });
          persistCampaignRecord(
            updatedCampaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
          );
        },
        advanceDay: () => {
          const { campaign, pendingBattleOutcomes, processedBattleIds } = get();
          if (!campaign) {
            return null;
          }
          registerBuiltinProcessors();
          const campaignWithOutcomes = withBattleQueueAttached(
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
          );
          const beforeForAudit =
            campaignWithOutcomes as ICampaignWithBattleState;
          const beforeRosterPilots = snapshotRosterPilots();
          const pipeline = getDayPipeline();
          const pipelineResult = pipeline.processDay(campaignWithOutcomes);
          const report = convertToLegacyDayReport(pipelineResult);
          const postPipeline = report.campaign as ICampaign & {
            readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
            readonly processedBattleIds?: readonly string[];
            readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
          };
          const afterRosterPilots = snapshotRosterPilots();
          const auditEntry = buildDailyBattleAuditEntry({
            before: beforeForAudit,
            after: report.campaign as ICampaignWithBattleState,
            beforeRoster: beforeRosterPilots,
            afterRoster: afterRosterPilots,
            appliedOutcomes: postPipeline.recentlyAppliedOutcomes ?? [],
            events: pipelineResult.events,
            date: pipelineResult.date,
          });
          const campaignWithAudit = appendDailyBattleAuditEntry(
            report.campaign,
            auditEntry,
          );
          const previousErrors = get().outcomeApplyErrors;
          const stillQueued = new Set(
            (postPipeline.pendingBattleOutcomes ?? []).map((o) => o.matchId),
          );
          const nextErrors: Record<string, string> = {};
          for (const e of pipelineResult.events) {
            if (e.type !== 'post_battle_apply_failed') continue;
            const data = e.data ?? {};
            const matchId = data.matchId;
            const errorMsg = data.error;
            if (typeof matchId === 'string' && typeof errorMsg === 'string') {
              nextErrors[matchId] = errorMsg;
            }
          }
          for (const [matchId, msg] of Object.entries(previousErrors)) {
            if (stillQueued.has(matchId) && !(matchId in nextErrors)) {
              nextErrors[matchId] = msg;
            }
          }
          set({
            campaign: campaignWithAudit,
            pendingBattleOutcomes: [
              ...(postPipeline.pendingBattleOutcomes ?? []),
            ],
            processedBattleIds: [
              ...(postPipeline.processedBattleIds ?? processedBattleIds),
            ],
            outcomeApplyErrors: nextErrors,
          });
          const { missionsStore } = get();
          if (missionsStore) {
            const ms = missionsStore.getState();
            Array.from(report.campaign.missions.values()).forEach((mission) => {
              ms.addMission(mission);
            });
          }
          get().saveCampaign();
          return { ...report, campaign: campaignWithAudit };
        },
        advanceDays: (count: number) => {
          const { campaign } = get();
          if (!campaign) {
            return null;
          }
          const reports: DayReport[] = [];
          for (let i = 0; i < count; i++) {
            const report = get().advanceDay();
            if (!report) break;
            reports.push(report);
          }
          return reports.length > 0 ? reports : null;
        },
        getCampaign: () => get().campaign,
        updateCampaign: (updates) => {
          const { campaign } = get();
          if (!campaign) {
            return;
          }
          const updatedCampaign: ICampaign = {
            ...campaign,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          set({ campaign: updatedCampaign });
        },
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
      }),
      {
        name: 'campaign-store',
        storage: createJSONStorage(() => clientSafeStorage),
        partialize: (state) => {
          if (!state.campaign) {
            return { campaign: null };
          }
          return {
            campaign: serializeCampaign(
              state.campaign,
              state.pendingBattleOutcomes,
              state.processedBattleIds,
              state.reviewedBattleIds,
            ),
          };
        },
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as {
            campaign?: SerializedCampaignState | null;
          };
          if (!persistedData?.campaign) {
            return {
              ...current,
              campaign: null,
              forcesStore: null,
              missionsStore: null,
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
          };
        },
      },
    ),
  );
}
let campaignStoreInstance: StoreApi<CampaignStore> | null = null;
export function useCampaignStore(): StoreApi<CampaignStore> {
  if (!campaignStoreInstance) {
    campaignStoreInstance = createCampaignStore();
    busUnsubscribe = subscribeToCombatOutcome(
      (event: ICombatOutcomeReadyEvent) => {
        const store = campaignStoreInstance;
        if (!store) return;
        // Per `add-campaign-combat-loop` D7: the automatic enqueue
        // trigger only routes campaign-linked outcomes. A session that
        // carries campaign linkage (a `contractId` / `scenarioId` on
        // its outcome) is enqueued onto this campaign's
        // `pendingBattleOutcomes`; a standalone skirmish is ignored.
        // `enqueueOutcome` itself reuses the duplicate-by-`matchId`
        // guard so a re-published outcome is never enqueued twice.
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
let busUnsubscribe: (() => void) | null = null;
