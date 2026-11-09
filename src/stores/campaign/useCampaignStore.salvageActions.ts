/** Salvage enrollment commit, persistence and rollback actions. */
import type { StateCreator } from 'zustand';

import type { CampaignStore } from './useCampaignStore.types';

import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';
import { useCampaignRosterStore } from './useCampaignRosterStore';
import { persistCampaignRecord } from './useCampaignStore.persistence';

type CampaignSet = Parameters<StateCreator<CampaignStore>>[0];
type CampaignGet = Parameters<StateCreator<CampaignStore>>[1];

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

export function createCampaignSalvageActions(
  set: CampaignSet,
  get: CampaignGet,
): Pick<CampaignStore, 'commitRosterEnrollment'> {
  return {
    commitRosterEnrollment: commitRosterEnrollmentAction(set, get),
  };
}
