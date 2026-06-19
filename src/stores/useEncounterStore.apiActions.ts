import type { StateCreator } from 'zustand';

import type {
  ICreateEncounterInput,
  IUpdateEncounterInput,
  ScenarioTemplateType,
} from '@/types/encounter';

import type {
  EncounterResponse,
  EncounterStore,
  LaunchEncounterOptions,
  LaunchResponse,
  ListEncountersResponse,
  SeedSamplesResponse,
  ValidationResponse,
} from './useEncounterStoreTypes';

import {
  readJson,
  runLoadingStoreAction,
  type LoadingStorePatch,
} from './utils/apiStoreActions';

type EncounterSet = Parameters<StateCreator<EncounterStore>>[0];
type EncounterGet = Parameters<StateCreator<EncounterStore>>[1];

function loadingSetter(set: EncounterSet): (patch: LoadingStorePatch) => void {
  return (patch) => set(patch);
}

function loadEncountersAction(
  set: EncounterSet,
): EncounterStore['loadEncounters'] {
  return async () => {
    await runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch('/api/encounters');
        if (!response.ok) {
          throw new Error('Failed to load encounters');
        }
        const data = await readJson<ListEncountersResponse>(response);
        set({
          encounters: data.encounters,
          rawForceIds: data.rawForceIds ?? {},
          isLoading: false,
        });
      },
      undefined,
    );
  };
}

function createEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['createEncounter'] {
  return async (input: ICreateEncounterInput) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch('/api/encounters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await readJson<EncounterResponse>(response);
        if (!data.success || !data.id) {
          set({
            error: data.error ?? 'Failed to create encounter',
            isLoading: false,
          });
          return null;
        }
        await get().loadEncounters();
        return data.id;
      },
      null,
    );
}

function updateEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['updateEncounter'] {
  return async (id: string, input: IUpdateEncounterInput) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/encounters/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await readJson<EncounterResponse>(response);
        if (!data.success) {
          set({
            error: data.error ?? 'Failed to update encounter',
            isLoading: false,
          });
          return false;
        }
        await get().loadEncounters();
        return true;
      },
      false,
    );
}

function deleteEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['deleteEncounter'] {
  return async (id: string) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/encounters/${id}`, {
          method: 'DELETE',
        });
        const data = await readJson<EncounterResponse>(response);
        if (!data.success) {
          set({
            error: data.error ?? 'Failed to delete encounter',
            isLoading: false,
          });
          return false;
        }
        if (get().selectedEncounterId === id) {
          set({ selectedEncounterId: null });
        }
        await get().loadEncounters();
        return true;
      },
      false,
    );
}

function forceLinkAction(
  set: EncounterSet,
  get: EncounterGet,
  request: () => Promise<Response>,
  errorMessage: string,
): Promise<boolean> {
  return runLoadingStoreAction(
    loadingSetter(set),
    async () => {
      const data = await readJson<EncounterResponse>(await request());
      if (!data.success) {
        set({ error: data.error ?? errorMessage, isLoading: false });
        return false;
      }
      await get().loadEncounters();
      return true;
    },
    false,
  );
}

function setPlayerForceAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['setPlayerForce'] {
  return (encounterId: string, forceId: string) =>
    forceLinkAction(
      set,
      get,
      () =>
        fetch(`/api/encounters/${encounterId}/player-force`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceId }),
        }),
      'Failed to set player force',
    );
}

function clearPlayerForceAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['clearPlayerForce'] {
  return (encounterId: string) =>
    forceLinkAction(
      set,
      get,
      () =>
        fetch(`/api/encounters/${encounterId}/player-force`, {
          method: 'DELETE',
        }),
      'Failed to clear player force',
    );
}

function setOpponentForceAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['setOpponentForce'] {
  return (encounterId: string, forceId: string) =>
    forceLinkAction(
      set,
      get,
      () =>
        fetch(`/api/encounters/${encounterId}/opponent-force`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceId }),
        }),
      'Failed to set opponent force',
    );
}

function clearOpponentForceAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['clearOpponentForce'] {
  return (encounterId: string) =>
    forceLinkAction(
      set,
      get,
      () =>
        fetch(`/api/encounters/${encounterId}/opponent-force`, {
          method: 'DELETE',
        }),
      'Failed to clear opponent force',
    );
}

function seedSampleEncountersAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['seedSampleEncounters'] {
  return async () =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch('/api/encounters/seed-samples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await readJson<SeedSamplesResponse>(response);
        if (!data.success || !data.ids) {
          set({
            error: data.error ?? 'Failed to seed sample encounters',
            isLoading: false,
          });
          return null;
        }
        await get().loadEncounters();
        return data.ids;
      },
      null,
    );
}

function applyTemplateAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['applyTemplate'] {
  return (encounterId: string, template: ScenarioTemplateType) =>
    forceLinkAction(
      set,
      get,
      () =>
        fetch(`/api/encounters/${encounterId}/template`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template }),
        }),
      'Failed to apply template',
    );
}

function validateEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['validateEncounter'] {
  return async (id: string) => {
    try {
      const response = await fetch(`/api/encounters/${id}/validate`);
      if (!response.ok) {
        return null;
      }
      const data = await readJson<ValidationResponse>(response);
      const validations = new Map(get().validations);
      validations.set(id, data.validation);
      set({ validations });
      return data.validation;
    } catch {
      return null;
    }
  };
}

function launchEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['launchEncounter'] {
  return async (id: string, options?: LaunchEncounterOptions) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/encounters/${id}/launch`, {
          method: 'POST',
          headers: options ? { 'Content-Type': 'application/json' } : undefined,
          body: options ? JSON.stringify(options) : undefined,
        });
        const data = await readJson<LaunchResponse>(response);
        if (!data.success) {
          set({
            error: data.error ?? 'Failed to launch encounter',
            isLoading: false,
          });
          return null;
        }
        await get().loadEncounters();
        return data.gameSessionId ?? null;
      },
      null,
    );
}

function cloneEncounterAction(
  set: EncounterSet,
  get: EncounterGet,
): EncounterStore['cloneEncounter'] {
  return async (id: string, newName: string) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/encounters/${id}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName }),
        });
        const data = await readJson<EncounterResponse>(response);
        if (!data.success || !data.id) {
          set({
            error: data.error ?? 'Failed to clone encounter',
            isLoading: false,
          });
          return null;
        }
        await get().loadEncounters();
        return data.id;
      },
      null,
    );
}

export function createEncounterApiActions(
  set: EncounterSet,
  get: EncounterGet,
): Pick<
  EncounterStore,
  | 'loadEncounters'
  | 'createEncounter'
  | 'updateEncounter'
  | 'deleteEncounter'
  | 'setPlayerForce'
  | 'clearPlayerForce'
  | 'setOpponentForce'
  | 'clearOpponentForce'
  | 'seedSampleEncounters'
  | 'applyTemplate'
  | 'validateEncounter'
  | 'launchEncounter'
  | 'cloneEncounter'
> {
  return {
    loadEncounters: loadEncountersAction(set),
    createEncounter: createEncounterAction(set, get),
    updateEncounter: updateEncounterAction(set, get),
    deleteEncounter: deleteEncounterAction(set, get),
    setPlayerForce: setPlayerForceAction(set, get),
    clearPlayerForce: clearPlayerForceAction(set, get),
    setOpponentForce: setOpponentForceAction(set, get),
    clearOpponentForce: clearOpponentForceAction(set, get),
    seedSampleEncounters: seedSampleEncountersAction(set, get),
    applyTemplate: applyTemplateAction(set, get),
    validateEncounter: validateEncounterAction(set, get),
    launchEncounter: launchEncounterAction(set, get),
    cloneEncounter: cloneEncounterAction(set, get),
  };
}
