import type { StateCreator } from 'zustand';

import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { initializePersonnelMarket } from '@/lib/campaign/markets/personnelMarket';
import { reconcileMissionCopy } from '@/lib/campaign/missionStatusMachine';
import {
  ACTIVITY_LOG_MAX_ENTRIES,
  type IActivityLogEntry,
} from '@/types/campaign/ActivityLog';
import {
  ICampaign,
  createCampaign as createCampaignEntity,
} from '@/types/campaign/Campaign';
import {
  createGuestCoopSession,
  type ICoopSession,
} from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { IForce } from '@/types/campaign/Force';

import type {
  CampaignCommitResult,
  CampaignStore,
  ICreateCampaignCoopOpts,
  IGuestMirrorSnapshot,
} from './useCampaignStore.types';

import {
  hydrateCampaignBattleState,
  mergeBattleOutcomeState,
} from './campaignBattleOutcomeState';
import {
  hasUnsettledCampaignPersistence,
  useCampaignPersistenceStore,
  type CampaignPersistenceSaveResult,
} from './useCampaignPersistenceStore';
import { createCampaignDayActions } from './useCampaignStore.dayActions';
import { persistCampaignRecord } from './useCampaignStore.persistence';
import { createCampaignSalvageActions } from './useCampaignStore.salvageActions';
import { createForcesStore } from './useForcesStore';
import { createMissionsStore } from './useMissionsStore';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

function commitResultFromPersistence(
  result: CampaignPersistenceSaveResult,
): CampaignCommitResult {
  if (result.status === 'saved' || result.status === 'skipped') {
    return { committed: true };
  }
  if (result.status === 'error') {
    return {
      committed: false,
      reason: result.errorMessage,
      ...(result.refusal ? { recoverable: true } : {}),
    };
  }
  return { committed: false, reason: 'campaign save conflict' };
}

function createRootForce(rootForceId: string, name: string): IForce {
  return {
    id: rootForceId,
    name,
    parentForceId: undefined,
    subForceIds: [],
    unitIds: [],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.REGIMENT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function initializeChildStores(campaignId: string, rootForce: IForce) {
  const forcesStore = createForcesStore(campaignId);
  const missionsStore = createMissionsStore(campaignId);
  forcesStore.getState().addForce(rootForce);
  return { forcesStore, missionsStore };
}

function initializeChildStoresFromCampaign(campaign: ICampaign) {
  const forcesStore = createForcesStore(campaign.id);
  const missionsStore = createMissionsStore(campaign.id);
  campaign.forces.forEach((force) => {
    forcesStore.getState().addForce(force);
  });
  campaign.missions.forEach((mission) => {
    missionsStore.getState().addMission(mission);
  });
  return { forcesStore, missionsStore };
}

function withRootForce(
  campaign: ICampaign,
  rootForce: IForce,
  coopSession?: ICoopSession,
): ICampaign {
  return {
    ...campaign,
    forces: new Map([[rootForce.id, rootForce]]),
    coopSession,
  };
}

function createCampaignAction(
  set: CampaignSet,
): CampaignStore['createCampaign'] {
  return (name, factionId, options, coopOpts?: ICreateCampaignCoopOpts) => {
    const campaign = createCampaignEntity(name, factionId, options);
    resetPersistenceForCreatedCampaign(campaign.id);
    const rootForce = createRootForce(campaign.rootForceId, name);
    const { forcesStore, missionsStore } = initializeChildStores(
      campaign.id,
      rootForce,
    );
    set({
      ...hydrateCampaignBattleState(
        initializePersonnelMarket(
          withRootForce(campaign, rootForce, coopOpts?.coopSession),
        ),
      ),
      forcesStore,
      missionsStore,
    });
    return campaign.id;
  };
}

function resetPersistenceForCreatedCampaign(campaignId: string): void {
  // Resetting would discard the previous campaign's pending work and save token.
  if (hasUnsettledCampaignPersistence()) {
    throw new Error(
      'Your current campaign is still saving. Try again in a moment.',
    );
  }
  useCampaignPersistenceStore.getState().reset();
  useCampaignPersistenceStore.getState().initializeCreatedCampaign(campaignId);
}

function createGuestMirrorCampaignAction(
  set: CampaignSet,
): CampaignStore['createGuestMirrorCampaign'] {
  return (hostMatchId: string, snapshot: IGuestMirrorSnapshot) => {
    const campaign = createCampaignEntity(
      snapshot.campaignName,
      snapshot.factionId,
    );
    const rootForce = createRootForce(
      campaign.rootForceId,
      snapshot.campaignName,
    );
    const localId = snapshot.campaignId || campaign.id;
    resetPersistenceForCreatedCampaign(localId);
    const { forcesStore, missionsStore } = initializeChildStores(
      localId,
      rootForce,
    );
    const guestSession = createGuestCoopSession(hostMatchId, snapshot.roomCode);
    const mirror = withRootForce(
      { ...campaign, id: localId },
      rootForce,
      guestSession,
    );
    set({
      ...hydrateCampaignBattleState(
        snapshot.authoritativeState
          ? applyAuthoritativeStateToGuestCampaign(
              mirror,
              snapshot.authoritativeState,
            )
          : mirror,
      ),
      forcesStore,
      missionsStore,
    });
    return localId;
  };
}

function switchCampaignAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['switchCampaign'] {
  return (campaign) => {
    const { forcesStore, missionsStore } =
      initializeChildStoresFromCampaign(campaign);
    set({
      ...hydrateCampaignBattleState(campaign, get()),
      forcesStore,
      missionsStore,
    });
  };
}

function collectCampaignForcesAndMissions(
  get: CampaignGet,
  campaign: ICampaign,
) {
  const { forcesStore, missionsStore } = get();
  const forces = forcesStore
    ? new Map(
        forcesStore
          .getState()
          .getAllForces()
          .map((f) => [f.id, f]),
      )
    : campaign.forces;
  // `campaign.missions` can be ahead of the child store (a retried or
  // manually applied battle settles it there only); never save the stale copy.
  const missions = missionsStore
    ? new Map(
        missionsStore
          .getState()
          .getAllMissions()
          .map((m) => [
            m.id,
            reconcileMissionCopy(m, campaign.missions.get(m.id)),
          ]),
      )
    : campaign.missions;
  if (missionsStore) {
    missions.forEach((mission) => {
      if (missionsStore.getState().getMission(mission.id) !== mission) {
        missionsStore.getState().addMission(mission);
      }
    });
  }
  return { forces, missions };
}

function saveCampaignAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['saveCampaign'] {
  return () => {
    const {
      campaign,
      pendingBattleOutcomes,
      processedBattleIds,
      reviewedBattleIds,
    } = get();
    if (!campaign) {
      return { committed: false, reason: 'no campaign loaded' };
    }
    const { forces, missions } = collectCampaignForcesAndMissions(
      get,
      campaign,
    );
    const battleState = mergeBattleOutcomeState(campaign, get());
    const updatedCampaign: ICampaign = {
      ...campaign,
      ...battleState,
      forces,
      missions,
      updatedAt: new Date().toISOString(),
    };
    set({ campaign: updatedCampaign, ...battleState });
    persistCampaignRecord(
      updatedCampaign,
      pendingBattleOutcomes,
      processedBattleIds,
      reviewedBattleIds,
    );
    if (updatedCampaign.coopSession) {
      return useCampaignPersistenceStore
        .getState()
        .saveCampaign()
        .then(commitResultFromPersistence);
    }
    return { committed: true };
  };
}

function updateCampaignAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['updateCampaign'] {
  return (updates) => {
    const { campaign } = get();
    if (!campaign) {
      return;
    }
    set({
      campaign: {
        ...campaign,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
    const nextCampaign = get().campaign;
    if (nextCampaign?.coopSession) {
      return Promise.resolve(get().saveCampaign()).then((result) => {
        if (!result.committed) {
          set({ campaign });
        }
      });
    }
  };
}

function appendActivityLogEntryAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['appendActivityLogEntry'] {
  return (entry: IActivityLogEntry) => {
    const filtered = get().activityLog.filter((e) => e.id !== entry.id);
    const next = [...filtered, entry];
    set({
      activityLog:
        next.length > ACTIVITY_LOG_MAX_ENTRIES
          ? next.slice(next.length - ACTIVITY_LOG_MAX_ENTRIES)
          : next,
    });
  };
}

export function createCampaignStoreActions(
  set: CampaignSet,
  get: CampaignGet,
): Pick<
  CampaignStore,
  | 'createCampaign'
  | 'createGuestMirrorCampaign'
  | 'switchCampaign'
  | 'saveCampaign'
  | 'advanceDay'
  | 'advanceDays'
  | 'updateCampaign'
  | 'commitRosterEnrollment'
  | 'appendActivityLogEntry'
  | 'previewTravelToSystem'
  | 'travelToSystem'
> {
  return {
    createCampaign: createCampaignAction(set),
    createGuestMirrorCampaign: createGuestMirrorCampaignAction(set),
    switchCampaign: switchCampaignAction(set, get),
    saveCampaign: saveCampaignAction(set, get),
    ...createCampaignDayActions(set, get),
    updateCampaign: updateCampaignAction(set, get),
    ...createCampaignSalvageActions(set, get),
    appendActivityLogEntry: appendActivityLogEntryAction(set, get),
  };
}
