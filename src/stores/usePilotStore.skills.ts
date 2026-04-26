/**
 * Skill / wound / ability action helpers for `usePilotStore`.
 *
 * Covers the five "mutate-by-effect" endpoints (improveGunnery,
 * improvePiloting, applyWound, healWounds, purchaseAbility) plus the
 * SPA-specific purchase / remove pair. Each function takes the same
 * `(set, get)` pair as the api slice so consumers can compose them as
 * thin pass-throughs.
 *
 * Behavior is byte-for-byte identical to the original inline
 * implementation — only the call site moved.
 */

import { IPilotAbilityDesignation, PilotStatus } from '@/types/pilot';

import type {
  PilotGetFn,
  PilotSetFn,
  SuccessResponse,
} from './usePilotStore.types';

/** Wound count above which a pilot is automatically marked KIA. */
const WOUNDS_FOR_KIA = 6;
/** Wound count above which a pilot is marked Injured (but not KIA). */
const WOUNDS_FOR_INJURED = 3;

/**
 * Generic POST-with-success helper. The five "improve / wound / heal /
 * purchase" endpoints all share the same shape: hit a path, parse a
 * `{ success, error }` response, refresh pilots on success, surface
 * the error message on failure.
 */
async function postWithSuccess(
  path: string,
  init: RequestInit,
  errorFallback: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  set({ error: null });

  try {
    const response = await fetch(path, init);
    const data = (await response.json()) as SuccessResponse;

    if (data.success) {
      await get().loadPilots();
      return true;
    }
    set({ error: data.error || errorFallback });
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : errorFallback;
    set({ error: message });
    return false;
  }
}

export function improveGunneryLogic(
  pilotId: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  return postWithSuccess(
    `/api/pilots/${pilotId}/improve-gunnery`,
    { method: 'POST' },
    'Failed to improve gunnery',
    set,
    get,
  );
}

export function improvePilotingLogic(
  pilotId: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  return postWithSuccess(
    `/api/pilots/${pilotId}/improve-piloting`,
    { method: 'POST' },
    'Failed to improve piloting',
    set,
    get,
  );
}

/**
 * Apply a wound to a pilot. Reads the current pilot from `get`, bumps
 * `wounds`, recomputes status (KIA at >=6, Injured at >=3), and routes
 * the resulting partial through `updatePilot` so the persistence flow
 * stays a single endpoint.
 */
export async function applyWoundLogic(
  pilotId: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  set({ error: null });

  try {
    const pilot = get().pilots.find((p) => p.id === pilotId);
    if (!pilot) {
      set({ error: 'Pilot not found' });
      return false;
    }

    const newWounds = pilot.wounds + 1;

    let newStatus = pilot.status;
    if (newWounds >= WOUNDS_FOR_KIA) {
      newStatus = PilotStatus.KIA;
    } else if (newWounds >= WOUNDS_FOR_INJURED) {
      newStatus = PilotStatus.Injured;
    }

    return get().updatePilot(pilotId, {
      wounds: newWounds,
      status: newStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to apply wound';
    set({ error: message });
    return false;
  }
}

/**
 * Heal a pilot back to Active. Refuses to heal a KIA pilot (matches the
 * MekHQ rule that KIA is permanent). Routes through `updatePilot` so the
 * persistence flow is a single endpoint.
 */
export async function healWoundsLogic(
  pilotId: string,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  set({ error: null });

  try {
    const pilot = get().pilots.find((p) => p.id === pilotId);
    if (!pilot) {
      set({ error: 'Pilot not found' });
      return false;
    }

    if (pilot.status === PilotStatus.KIA) {
      set({ error: 'Cannot heal a KIA pilot' });
      return false;
    }

    return get().updatePilot(pilotId, {
      wounds: 0,
      status: PilotStatus.Active,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to heal wounds';
    set({ error: message });
    return false;
  }
}

export function purchaseAbilityLogic(
  pilotId: string,
  abilityId: string,
  _xpCost: number,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  return postWithSuccess(
    `/api/pilots/${pilotId}/purchase-ability`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abilityId }),
    },
    'Failed to purchase ability',
    set,
    get,
  );
}

export function purchaseSPALogic(
  pilotId: string,
  spaId: string,
  options:
    | {
        designation?: IPilotAbilityDesignation;
        isCreationFlow?: boolean;
      }
    | undefined,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  return postWithSuccess(
    `/api/pilots/${pilotId}/purchase-ability`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaId,
        designation: options?.designation,
        isCreationFlow: options?.isCreationFlow,
      }),
    },
    'Failed to purchase SPA',
    set,
    get,
  );
}

export function removeSPALogic(
  pilotId: string,
  spaId: string,
  options: { isCreationFlow?: boolean } | undefined,
  set: PilotSetFn,
  get: PilotGetFn,
): Promise<boolean> {
  return postWithSuccess(
    `/api/pilots/${pilotId}/purchase-ability`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaId,
        isCreationFlow: options?.isCreationFlow,
      }),
    },
    'Failed to remove SPA',
    set,
    get,
  );
}
