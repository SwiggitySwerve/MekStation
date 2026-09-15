/**
 * Pins the unload-cancel boundary of the official equipment load.
 *
 * Every route runs the app-global registry init, which issues ~30 fetches for
 * `/data/equipment/official/**`. A hard document navigation cancels whatever is
 * still in flight. Those cancellations are NOT load failures: they must not be
 * logged as errors and must not be recorded as partial failures. A genuine
 * network failure on a live signal must keep behaving exactly as it does today.
 */

import { disableTestMode, enableTestMode } from '@/utils/logger';

import { readJsonFile } from '../EquipmentFileReader';
import { EQUIPMENT_READ_ABORTED } from '../equipmentLoadAbort';
import {
  EquipmentLoaderService,
  resetEquipmentLoader,
} from '../EquipmentLoaderService';
import {
  getEquipmentRegistry,
  resetEquipmentRegistry,
} from '../EquipmentRegistry';

interface ControlledResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

const loadableWeapon = {
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
    weapons: {
      first: 'weapons/first.json',
      second: 'weapons/second.json',
    },
    ammunition: {},
    electronics: {},
    miscellaneous: {},
  },
};

function okJson(payload: unknown): ControlledResponse {
  return { ok: true, status: 200, json: async () => payload };
}

/**
 * The shape an unload-cancelled fetch actually surfaces in Chromium: a bare
 * `TypeError: Failed to fetch`, indistinguishable from a real network failure
 * except that the signal we passed is already aborted.
 */
function unloadCancelRejection(): Error {
  return new TypeError('Failed to fetch');
}

function abortRejection(): Error {
  const error = new Error('The user aborted a request.');
  error.name = 'AbortError';
  return error;
}

function signalOf(init: unknown): AbortSignal | undefined {
  return (init as { signal?: AbortSignal } | undefined)?.signal;
}

describe('official equipment load under an aborted signal', () => {
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

  it('returns the aborted sentinel without fetching when the signal is already aborted', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort();

    const outcome = await readJsonFile(
      'weapons/first.json',
      '/data/equipment/official',
      controller.signal,
    );

    expect(outcome).toBe(EQUIPMENT_READ_ABORTED);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('treats an unload-cancelled fetch as interrupted, not as a load failure', async () => {
    const controller = new AbortController();
    const fetchMock = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return okJson(indexData);
        }
        // The navigation lands mid-flight: the browser cancels this request
        // and only then rejects it with the ambiguous TypeError.
        controller.abort();
        throw unloadCancelRejection();
      },
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const loader = new EquipmentLoaderService();
    const result = await loader.loadOfficialEquipment(
      '/data/equipment/official',
      controller.signal,
    );

    expect(result.interrupted).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.success).toBe(false);
    expect(loader.getIsLoaded()).toBe(false);
    expect(loader.getLoadErrors()).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
    // The remaining files short-circuit instead of re-issuing doomed fetches.
    expect(fetchMock as unknown as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it('still records a genuine network failure while the signal is live', async () => {
    const controller = new AbortController();
    const fetchMock = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return okJson(indexData);
        }
        if (request.endsWith('/weapons/second.json')) {
          return okJson({ items: [loadableWeapon] });
        }
        // Same rejection shape as the unload case, but nobody aborted us.
        throw unloadCancelRejection();
      },
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const loader = new EquipmentLoaderService();
    const result = await loader.loadOfficialEquipment(
      '/data/equipment/official',
      controller.signal,
    );

    expect(controller.signal.aborted).toBe(false);
    expect(result.interrupted).toBeFalsy();
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      expect.stringContaining('weapons/first.json'),
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining('weapons/first.json'),
    ]);
    expect(
      errorSpy.mock.calls.some(([message]) =>
        String(message).includes('weapons/first.json'),
      ),
    ).toBe(true);
    // The load carried on past the failure exactly as it does today.
    expect(result.itemsLoaded).toBe(1);
  });

  it('records a genuine network failure when no signal is supplied at all', async () => {
    global.fetch = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return okJson(indexData);
        }
        throw unloadCancelRejection();
      },
    ) as unknown as typeof fetch;

    const loader = new EquipmentLoaderService();
    const result = await loader.loadOfficialEquipment();

    expect(result.interrupted).toBeFalsy();
    expect(result.errors).toHaveLength(2);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('equipment registry init cancelled by pagehide', () => {
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

  it('aborts the in-flight equipment fetches and leaves the registry unready', async () => {
    let releaseFirstFetch: () => void = () => undefined;
    const firstFetchStarted = new Promise<void>((resolve) => {
      releaseFirstFetch = resolve;
    });

    global.fetch = jest.fn((url: string | URL, init?: unknown) => {
      const request = String(url);
      if (request.endsWith('/index.json')) {
        return Promise.resolve(okJson(indexData));
      }
      // Hang until the document goes away, then reject the way the browser does.
      return new Promise<ControlledResponse>((_resolve, reject) => {
        const signal = signalOf(init);
        expect(signal).toBeDefined();
        signal?.addEventListener('abort', () => reject(abortRejection()));
        releaseFirstFetch();
      });
    }) as unknown as typeof fetch;

    const registry = getEquipmentRegistry();
    const initPromise = registry.initialize();

    await firstFetchStarted;
    window.dispatchEvent(new Event('pagehide'));
    await initPromise;

    expect(registry.isReady()).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();

    // The interruption is recoverable: a surviving document reloads cleanly.
    global.fetch = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return okJson({
            files: { weapons: { first: 'weapons/first.json' } },
          });
        }
        return okJson({ items: [loadableWeapon] });
      },
    ) as unknown as typeof fetch;

    await registry.initialize();

    expect(registry.isReady()).toBe(true);
    expect(registry.getWeapon('abort-probe-weapon')).not.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
