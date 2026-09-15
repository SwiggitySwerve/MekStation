/**
 * Pins the hook's readiness contract against an interrupted registry init.
 *
 * An interrupted initialize resolves rather than throws, so a `.then()` that
 * unconditionally sets ready would advertise a registry whose name maps were
 * never built - every lookup would resolve nothing, with no retry. The hook
 * must read readiness from the registry itself and must not latch the attempt
 * when the init was merely cancelled.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { resetEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentRegistry,
  resetEquipmentRegistry,
} from '@/services/equipment/EquipmentRegistry';
import { disableTestMode, enableTestMode } from '@/utils/logger';

import { useEquipmentRegistry } from '../useEquipmentRegistry';

interface ControlledResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

const probeWeapon = {
  id: 'abort-probe-weapon',
  name: 'Abort Probe Laser',
  category: 'Energy',
  subType: 'Laser',
  techBase: 'INNER_SPHERE',
  rulesLevel: 'INTRODUCTORY',
  damage: 1,
  heat: 1,
  ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
  weight: 1,
  criticalSlots: 1,
  costCBills: 1000,
  battleValue: 1,
  introductionYear: 2400,
};

const indexData = {
  files: {
    weapons: { first: 'weapons/first.json' },
    ammunition: {},
    electronics: {},
    miscellaneous: {},
  },
};

function okJson(payload: unknown): ControlledResponse {
  return { ok: true, status: 200, json: async () => payload };
}

function abortRejection(): Error {
  const error = new Error('The user aborted a request.');
  error.name = 'AbortError';
  return error;
}

function signalOf(init: unknown): AbortSignal | undefined {
  return (init as { signal?: AbortSignal } | undefined)?.signal;
}

/**
 * Serves index.json immediately, then hangs every weapon read until the
 * document's abort fires. `hangAfter` loads behave that way; later loads
 * resolve normally, which is how a surviving document's retry is simulated.
 */
function installUnloadRacingFetch(hangLoads: number): {
  firstWeaponFetch: Promise<void>;
} {
  let loadsSeen = 0;
  let releaseFirstWeaponFetch: () => void = () => undefined;
  const firstWeaponFetch = new Promise<void>((resolve) => {
    releaseFirstWeaponFetch = resolve;
  });

  global.fetch = jest.fn((url: string | URL, init?: unknown) => {
    const request = String(url);
    if (request.endsWith('/index.json')) {
      loadsSeen += 1;
      return Promise.resolve(okJson(indexData));
    }
    if (loadsSeen > hangLoads) {
      return Promise.resolve(okJson({ items: [probeWeapon] }));
    }
    return new Promise<ControlledResponse>((_resolve, reject) => {
      signalOf(init)?.addEventListener('abort', () => reject(abortRejection()));
      releaseFirstWeaponFetch();
    });
  }) as unknown as typeof fetch;

  return { firstWeaponFetch };
}

describe('useEquipmentRegistry against an interrupted init', () => {
  const originalFetch = global.fetch;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    resetEquipmentLoader();
    resetEquipmentRegistry();
    enableTestMode();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    errorSpy.mockRestore();
    disableTestMode();
  });

  it('never reports ready while the registry itself is unready', async () => {
    // Every load races the unload, so the registry can never finish.
    const { firstWeaponFetch } = installUnloadRacingFetch(
      Number.MAX_SAFE_INTEGER,
    );

    const { result } = renderHook(() => useEquipmentRegistry());

    await firstWeaponFetch;
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();
    });
    // Let the interrupted initialize settle and any retry start.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const registry = getEquipmentRegistry();
    expect(registry.isReady()).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('retries after an interruption instead of latching the attempt', async () => {
    // Only the first load races the unload; the surviving document's retry
    // finds a healthy server.
    const { firstWeaponFetch } = installUnloadRacingFetch(1);

    const { result } = renderHook(() => useEquipmentRegistry());

    await firstWeaponFetch;
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const registry = getEquipmentRegistry();
    expect(registry.isReady()).toBe(true);
    expect(registry.lookup('Abort Probe Laser').found).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports ready on an uninterrupted init', async () => {
    global.fetch = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return okJson(indexData);
        }
        return okJson({ items: [probeWeapon] });
      },
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useEquipmentRegistry());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(getEquipmentRegistry().isReady()).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
