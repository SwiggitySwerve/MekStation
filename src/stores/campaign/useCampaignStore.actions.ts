import type { StateCreator } from 'zustand';

import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
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
  CampaignStore,
  ICreateCampaignCoopOpts,
  IGuestMirrorSnapshot,
} from './useCampaignStore.types';

import { clientSafeStorage } from '../utils/clientSafeStorage';
import {
  useCampaignPersistenceStore,
  type CampaignPersistenceSaveResult,
} from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';
import { createCampaignDayActions } from './useCampaignStore.dayActions';
import {
  deserializeCampaign,
  persistCampaignRecord,
  type SerializedCampaignState,
} from './useCampaignStore.persistence';
import { createForcesStore } from './useForcesStore';
import { createMissionsStore } from './useMissionsStore';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

function commitResultFromPersistence(result: CampaignPersistenceSaveResult): {
  readonly committed: boolean;
  readonly reason?: string;
} {
  if (result.status === 'saved' || result.status === 'skipped') {
    return { committed: true };
  }
  if (result.status === 'error') {
    return { committed: false, reason: result.errorMessage };
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
    const rootForce = createRootForce(campaign.rootForceId, name);
    const { forcesStore, missionsStore } = initializeChildStores(
      campaign.id,
      rootForce,
    );
    set({
      campaign: withRootForce(campaign, rootForce, coopOpts?.coopSession),
      forcesStore,
      missionsStore,
    });
    return campaign.id;
  };
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
      campaign: snapshot.authoritativeState
        ? applyAuthoritativeStateToGuestCampaign(
            mirror,
            snapshot.authoritativeState,
          )
        : mirror,
      forcesStore,
      missionsStore,
    });
    return localId;
  };
}

function loadCampaignAction(set: CampaignSet): CampaignStore['loadCampaign'] {
  return (id: string) => {
    const stored = clientSafeStorage.getItem(`campaign-${id}`) as string | null;
    if (!stored) {
      return false;
    }
    try {
      const parsed = JSON.parse(stored) as { state: SerializedCampaignState };
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
      set({
        campaign: deserializeCampaign(serialized, forces, missions),
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
  };
}

function switchCampaignAction(
  set: CampaignSet,
): CampaignStore['switchCampaign'] {
  return (campaign) => {
    const { forcesStore, missionsStore } =
      initializeChildStoresFromCampaign(campaign);
    set({ campaign, forcesStore, missionsStore });
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
  const missions = missionsStore
    ? new Map(
        missionsStore
          .getState()
          .getAllMissions()
          .map((m) => [m.id, m]),
      )
    : campaign.missions;
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

function commitRosterEnrollmentAction(
  set: CampaignSet,
  get: CampaignGet,
): CampaignStore['commitRosterEnrollment'] {
  return async (expected, unit, updates) => {
    const roster = useCampaignRosterStore.getState();
    if (
      get().campaign !== expected ||
      roster.campaignId !== expected.id ||
      roster.units.some((entry) => entry.unitId === unit.unitId)
    ) {
      return {
        committed: false,
        reason: 'Campaign or roster changed while preparing salvage; retry.',
      };
    }
    const forcesStore = get().forcesStore;
    const oldForce = forcesStore?.getState().getForce(expected.rootForceId);
    const nextForce = updates.forces?.get(expected.rootForceId);
    if (!nextForce || (forcesStore && !oldForce))
      return {
        committed: false,
        reason: 'The campaign root force is missing.',
      };
    if (
      forcesStore
        ?.getState()
        .getAllForces()
        .some((force) => force !== expected.forces.get(force.id))
    ) {
      return {
        committed: false,
        reason:
          'Force assignments changed while preparing salvage; save and retry.',
      };
    }
    const beforeUnits = roster.units;
    const { pendingBattleOutcomes, processedBattleIds, reviewedBattleIds } =
      get();
    const nextUnits = [...beforeUnits, unit];
    const nextForces = new Map(updates.forces);
    const nextCampaign = {
      ...expected,
      ...updates,
      forces: nextForces,
      updatedAt: new Date().toISOString(),
    };
    const rollback = (): void => {
      if (get().campaign === nextCampaign) set({ campaign: expected });
      const currentRoster = useCampaignRosterStore.getState();
      if (currentRoster.units === nextUnits)
        currentRoster.replaceUnitsForCampaign(expected.id, beforeUnits);
      if (forcesStore && oldForce) {
        // A co-op conflict may already have adopted the server record. Keep
        // that record and align the child store with it instead of undoing it.
        const current = get().campaign;
        const force =
          current?.id === expected.id
            ? current.forces.get(expected.rootForceId)
            : oldForce;
        if (force) forcesStore.getState().addForce(force);
      }
      const active = get().campaign;
      persistCampaignRecord(
        active?.id === expected.id ? active : expected,
        pendingBattleOutcomes,
        processedBattleIds,
        reviewedBattleIds,
      );
    };
    try {
      if (!roster.replaceUnitsForCampaign(expected.id, nextUnits))
        return {
          committed: false,
          reason: 'The campaign roster changed; retry.',
        };
      forcesStore?.getState().updateForce(nextForce.id, nextForce);
      const committedForce = forcesStore?.getState().getForce(nextForce.id);
      if (committedForce) nextForces.set(committedForce.id, committedForce);
      set({ campaign: nextCampaign });
      // Cache writes that can fail happen before the acknowledged server write.
      persistCampaignRecord(
        nextCampaign,
        pendingBattleOutcomes,
        processedBattleIds,
        reviewedBattleIds,
      );
      useCampaignPersistenceStore.getState().markDirty();
      const result = await useCampaignPersistenceStore
        .getState()
        .saveCampaign();
      if (result.status !== 'saved') {
        rollback();
        return {
          committed: false,
          reason:
            result.status === 'error'
              ? result.errorMessage
              : 'Salvage save was refused; resync and retry.',
        };
      }
      return { committed: true };
    } catch (error) {
      try {
        rollback();
      } catch (restoreError) {
        return {
          committed: false,
          reason: `Salvage enrollment failed; restoring the local cache also failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
        };
      }
      return {
        committed: false,
        reason:
          error instanceof Error ? error.message : 'Salvage enrollment failed.',
      };
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
  | 'loadCampaign'
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
    loadCampaign: loadCampaignAction(set),
    switchCampaign: switchCampaignAction(set),
    saveCampaign: saveCampaignAction(set, get),
    ...createCampaignDayActions(set, get),
    updateCampaign: updateCampaignAction(set, get),
    commitRosterEnrollment: commitRosterEnrollmentAction(set, get),
    appendActivityLogEntry: appendActivityLogEntryAction(set, get),
  };
}
