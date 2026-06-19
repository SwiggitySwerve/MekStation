import type { StateCreator } from 'zustand';

import type {
  ICreateForceRequest,
  IUpdateForceRequest,
  ForcePosition,
} from '@/types/force';

import type {
  AssignmentResponse,
  CreateForceResponse,
  DeleteForceResponse,
  ForceStore,
  ListForcesResponse,
  UpdateForceResponse,
  ValidateForceResponse,
} from './useForceStore.types';

import {
  readJson,
  runLoadingStoreAction,
  type LoadingStorePatch,
} from './utils/apiStoreActions';

type ForceSet = Parameters<StateCreator<ForceStore>>[0];
type ForceGet = Parameters<StateCreator<ForceStore>>[1];

type ForceActionSet = (patch: LoadingStorePatch) => void;

function loadingSetter(set: ForceSet): ForceActionSet {
  return (patch) => set(patch);
}

function loadForcesAction(set: ForceSet): ForceStore['loadForces'] {
  return async () => {
    await runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch('/api/forces');
        if (!response.ok) {
          throw new Error('Failed to load forces');
        }
        const data = await readJson<ListForcesResponse>(response);
        set({ forces: data.forces, isLoading: false });
      },
      undefined,
    );
  };
}

function createForceAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['createForce'] {
  return async (request: ICreateForceRequest) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch('/api/forces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await readJson<CreateForceResponse>(response);
        if (!data.success || !data.id) {
          set({
            error: data.error ?? 'Failed to create force',
            isLoading: false,
          });
          return null;
        }
        await get().loadForces();
        return data.id;
      },
      null,
    );
}

function updateForceAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['updateForce'] {
  return async (id: string, request: IUpdateForceRequest) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/forces/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await readJson<UpdateForceResponse>(response);
        if (!data.success) {
          set({
            error: data.error ?? 'Failed to update force',
            isLoading: false,
          });
          return false;
        }
        await get().loadForces();
        return true;
      },
      false,
    );
}

function deleteForceAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['deleteForce'] {
  return async (id: string) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/forces/${id}`, { method: 'DELETE' });
        const data = await readJson<DeleteForceResponse>(response);
        if (!data.success) {
          set({
            error: data.error ?? 'Failed to delete force',
            isLoading: false,
          });
          return false;
        }
        if (get().selectedForceId === id) {
          set({ selectedForceId: null });
        }
        await get().loadForces();
        return true;
      },
      false,
    );
}

function assignmentAction(
  set: ForceSet,
  get: ForceGet,
  request: () => Promise<Response>,
  errorMessage: string,
): Promise<boolean> {
  return runLoadingStoreAction(
    loadingSetter(set),
    async () => {
      const data = await readJson<AssignmentResponse>(await request());
      if (!data.success) {
        set({ error: data.error ?? errorMessage, isLoading: false });
        return false;
      }
      await get().loadForces();
      return true;
    },
    false,
  );
}

function assignPilotAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['assignPilot'] {
  return (assignmentId: string, pilotId: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}/pilot`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pilotId }),
        }),
      'Failed to assign pilot',
    );
}

function assignUnitAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['assignUnit'] {
  return (assignmentId: string, unitId: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}/unit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitId }),
        }),
      'Failed to assign unit',
    );
}

function assignPilotAndUnitAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['assignPilotAndUnit'] {
  return (assignmentId: string, pilotId: string, unitId: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pilotId, unitId }),
        }),
      'Failed to assign',
    );
}

function clearAssignmentAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['clearAssignment'] {
  return (assignmentId: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}`, {
          method: 'DELETE',
        }),
      'Failed to clear assignment',
    );
}

function swapAssignmentsAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['swapAssignments'] {
  return (assignmentId1: string, assignmentId2: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch('/api/forces/assignments/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId1, assignmentId2 }),
        }),
      'Failed to swap assignments',
    );
}

function setAssignmentPositionAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['setAssignmentPosition'] {
  return (assignmentId: string, position: ForcePosition) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}/position`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position }),
        }),
      'Failed to set position',
    );
}

function promoteToLeadAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['promoteToLead'] {
  return (assignmentId: string) =>
    assignmentAction(
      set,
      get,
      () =>
        fetch(`/api/forces/assignments/${assignmentId}/promote`, {
          method: 'POST',
        }),
      'Failed to promote',
    );
}

function validateForceAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['validateForce'] {
  return async (id: string) => {
    try {
      const response = await fetch(`/api/forces/${id}/validate`);
      if (!response.ok) {
        return null;
      }
      const data = await readJson<ValidateForceResponse>(response);
      const validations = new Map(get().validations);
      validations.set(id, data.validation);
      set({ validations });
      return data.validation;
    } catch {
      return null;
    }
  };
}

function cloneForceAction(
  set: ForceSet,
  get: ForceGet,
): ForceStore['cloneForce'] {
  return async (id: string, newName: string) =>
    runLoadingStoreAction(
      loadingSetter(set),
      async () => {
        const response = await fetch(`/api/forces/${id}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName }),
        });
        const data = await readJson<CreateForceResponse>(response);
        if (!data.success || !data.id) {
          set({
            error: data.error ?? 'Failed to clone force',
            isLoading: false,
          });
          return null;
        }
        await get().loadForces();
        return data.id;
      },
      null,
    );
}

export function createForceApiActions(
  set: ForceSet,
  get: ForceGet,
): Pick<
  ForceStore,
  | 'loadForces'
  | 'createForce'
  | 'updateForce'
  | 'deleteForce'
  | 'assignPilot'
  | 'assignUnit'
  | 'assignPilotAndUnit'
  | 'clearAssignment'
  | 'swapAssignments'
  | 'setAssignmentPosition'
  | 'promoteToLead'
  | 'validateForce'
  | 'cloneForce'
> {
  return {
    loadForces: loadForcesAction(set),
    createForce: createForceAction(set, get),
    updateForce: updateForceAction(set, get),
    deleteForce: deleteForceAction(set, get),
    assignPilot: assignPilotAction(set, get),
    assignUnit: assignUnitAction(set, get),
    assignPilotAndUnit: assignPilotAndUnitAction(set, get),
    clearAssignment: clearAssignmentAction(set, get),
    swapAssignments: swapAssignmentsAction(set, get),
    setAssignmentPosition: setAssignmentPositionAction(set, get),
    promoteToLead: promoteToLeadAction(set, get),
    validateForce: validateForceAction(set, get),
    cloneForce: cloneForceAction(set, get),
  };
}
