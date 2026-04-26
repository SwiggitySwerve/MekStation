/**
 * REST/CRUD action helpers for `usePilotStore`.
 *
 * Each function takes Zustand's `set` / `get` directly (typed against the
 * shared `PilotStore` shape) so the main store can compose them as thin
 * pass-throughs while keeping per-file LOC under the lint budget.
 *
 * Behavior is byte-for-byte identical to the original inline
 * implementation — only the call site moved.
 */

import {
  IPilot,
  IPilotIdentity,
  IPilotStatblock,
  ICreatePilotOptions,
  PilotExperienceLevel,
  PilotStatus,
  PilotType,
} from '@/types/pilot';

import type {
  CreatePilotResponse,
  DeletePilotResponse,
  ListPilotsResponse,
  PilotGetFn,
  PilotSetFn,
  UpdatePilotResponse,
} from './usePilotStore.types';

/** Load every pilot from the REST endpoint and replace the in-memory list. */
export async function loadPilotsLogic(set: PilotSetFn): Promise<void> {
  set({ isLoading: true, error: null });

  try {
    const response = await fetch('/api/pilots');
    if (!response.ok) {
      throw new Error(`Failed to load pilots: ${response.statusText}`);
    }
    const data = (await response.json()) as ListPilotsResponse;
    set({ pilots: data.pilots, isLoading: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load pilots';
    set({ error: message, isLoading: false });
  }
}

/**
 * Shared POST-pilot helper. The three create flows (full / template /
 * random) only differ in the JSON body shape — DRYing them avoids three
 * near-identical try/catch ladders.
 */
async function postCreatePilot(
  body: unknown,
  errorFallback: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<string | null> {
  set({ isLoading: true, error: null });

  try {
    const response = await fetch('/api/pilots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as CreatePilotResponse;

    if (data.success && data.id) {
      await get().loadPilots();
      set({ selectedPilotId: data.id, isLoading: false });
      return data.id;
    }
    set({ error: data.error || errorFallback, isLoading: false });
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : errorFallback;
    set({ error: message, isLoading: false });
    return null;
  }
}

export function createPilotLogic(
  options: ICreatePilotOptions,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<string | null> {
  return postCreatePilot(
    { mode: 'full', options },
    'Failed to create pilot',
    set,
    get,
  );
}

export function createFromTemplateLogic(
  level: PilotExperienceLevel,
  identity: IPilotIdentity,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<string | null> {
  return postCreatePilot(
    { mode: 'template', template: level, identity },
    'Failed to create pilot',
    set,
    get,
  );
}

export function createRandomLogic(
  identity: IPilotIdentity,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<string | null> {
  return postCreatePilot(
    { mode: 'random', identity },
    'Failed to create pilot',
    set,
    get,
  );
}

/**
 * Build an in-memory `IPilot` from a statblock. Statblock pilots are
 * intentionally not persisted — they exist only for the duration of a
 * scenario / pre-battle screen.
 */
export function createStatblockLogic(statblock: IPilotStatblock): IPilot {
  const now = new Date().toISOString();
  return {
    id: `statblock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: statblock.name,
    type: PilotType.Statblock,
    status: PilotStatus.Active,
    skills: {
      gunnery: statblock.gunnery,
      piloting: statblock.piloting,
    },
    wounds: 0,
    abilities: (statblock.abilityIds || []).map((id) => ({
      abilityId: id,
      acquiredDate: now,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updatePilotLogic(
  id: string,
  updates: Partial<IPilot>,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  set({ error: null });

  try {
    const response = await fetch(`/api/pilots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = (await response.json()) as UpdatePilotResponse;

    if (data.success) {
      await get().loadPilots();
      return true;
    }
    set({ error: data.error || 'Failed to update pilot' });
    return false;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update pilot';
    set({ error: message });
    return false;
  }
}

export async function deletePilotLogic(
  id: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  set({ error: null });

  try {
    const response = await fetch(`/api/pilots/${id}`, {
      method: 'DELETE',
    });

    const data = (await response.json()) as DeletePilotResponse;

    if (data.success) {
      const { selectedPilotId } = get();
      if (selectedPilotId === id) {
        set({ selectedPilotId: null });
      }
      await get().loadPilots();
      return true;
    }
    set({ error: data.error || 'Failed to delete pilot' });
    return false;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete pilot';
    set({ error: message });
    return false;
  }
}
