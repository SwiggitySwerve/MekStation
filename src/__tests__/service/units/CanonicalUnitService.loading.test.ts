/**
 * CanonicalUnitService loading resilience (S10 PR1).
 *
 * A transient index 404 must not mark a family absent for the life of the
 * page, concurrent loads of one unit share a single fetch, and `clearCache` /
 * `invalidateUnit` must not be undone by a load that was already in flight.
 */

import { CanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { LoadRequestCoordinator } from '@/services/units/unitLoaderService/LoadRequestCoordinator';

/** The missing-family TTL agreed for S10 (30 seconds). */
const MISSING_FAMILY_TTL_MS = 30_000;

const ATLAS_ROW = {
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  techBase: 'INNER_SPHERE',
  year: 2750,
  path: 'test/atlas-as7-d.json',
};
const ATLAS_UNIT = {
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  variant: 'AS7-D',
  unitType: 'BattleMech',
  tonnage: 100,
};

interface IFetchResponse {
  readonly ok: boolean;
  readonly status?: number;
  readonly json?: () => Promise<unknown>;
}

const indexResponse = (): IFetchResponse => ({
  ok: true,
  json: async () => ({ units: [ATLAS_ROW] }),
});
const unitResponse = (): IFetchResponse => ({
  ok: true,
  json: async () => ({ ...ATLAS_UNIT }),
});
const notFound: IFetchResponse = { ok: false, status: 404 };
const serverError: IFetchResponse = { ok: false, status: 500 };

/** A fetch response the test releases by hand. */
function deferred(): {
  readonly promise: Promise<IFetchResponse>;
  readonly resolve: (response: IFetchResponse) => void;
} {
  let resolve!: (response: IFetchResponse) => void;
  const promise = new Promise<IFetchResponse>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const fetchMock = jest.fn();
const fetchedUrls = (): string[] =>
  fetchMock.mock.calls.map(([url]: [string]) => url);
const unitFetches = (): number =>
  fetchedUrls().filter((url) => url.endsWith('atlas-as7-d.json')).length;
const indexFetches = (): number =>
  fetchedUrls().filter((url) => url.endsWith('/index.json')).length;

describe('CanonicalUnitService loading resilience', () => {
  let service: CanonicalUnitService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-08T00:00:00Z'));
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new CanonicalUnitService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('missing family TTL', () => {
    it('does not refetch a 404 family index before the TTL elapses', async () => {
      fetchMock.mockResolvedValue(notFound);

      await expect(service.getIndex()).resolves.toEqual([]);
      jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS - 1);
      await expect(service.getIndex()).resolves.toEqual([]);

      expect(indexFetches()).toBe(1);
    });

    it('refetches a 404 family index once the TTL has elapsed', async () => {
      fetchMock
        .mockResolvedValueOnce(notFound)
        .mockResolvedValueOnce(indexResponse());

      await expect(service.getIndex()).resolves.toEqual([]);
      jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS);
      const recovered = await service.getIndex();

      expect(recovered).toHaveLength(1);
      expect(indexFetches()).toBe(2);
    });

    it('reports the family present once a retried index loads', async () => {
      fetchMock
        .mockResolvedValueOnce(notFound)
        .mockResolvedValueOnce(indexResponse());

      await expect(service.hasFamily('battlemechs')).resolves.toBe(false);
      jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS);

      await expect(service.hasFamily('battlemechs')).resolves.toBe(true);
    });

    it('stays missing for another TTL when the retry 404s again', async () => {
      fetchMock.mockResolvedValue(notFound);

      await service.getIndex();
      jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS);
      await service.getIndex();
      jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS - 1);
      await service.getIndex();

      expect(indexFetches()).toBe(2);
    });
  });

  describe('in-flight unit loads', () => {
    it('shares one unit-file fetch between concurrent callers', async () => {
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : unitResponse(),
      );

      const [first, second] = await Promise.all([
        service.getById('atlas-as7-d'),
        service.getById('atlas-as7-d'),
      ]);

      expect(unitFetches()).toBe(1);
      expect(first).not.toBeNull();
      expect(second).toBe(first);
    });

    it('does not let a lenient caller inherit a strict caller failure', async () => {
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : serverError,
      );

      const [strict, lenient] = await Promise.allSettled([
        service.getById('atlas-as7-d', { strict: true }),
        service.getById('atlas-as7-d'),
      ]);

      expect(strict.status).toBe('rejected');
      expect(lenient).toEqual({ status: 'fulfilled', value: null });
    });

    it('forgets a failed load so the next call refetches', async () => {
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : serverError,
      );
      await expect(service.getById('atlas-as7-d')).resolves.toBeNull();

      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : unitResponse(),
      );
      const retried = await service.getById('atlas-as7-d');

      expect(retried).toMatchObject({ id: 'atlas-as7-d' });
      expect(unitFetches()).toBe(2);
    });
  });

  describe('cache invalidation during a load', () => {
    it('finishes a same-unit retry before the canceled read returns and preserves the newer cache', async () => {
      const requests = new LoadRequestCoordinator();
      const held = deferred();
      fetchMock
        .mockResolvedValueOnce(indexResponse())
        .mockReturnValueOnce(held.promise)
        .mockResolvedValueOnce(unitResponse());
      const oldTicket = requests.begin('canonical:atlas', () =>
        service.invalidateUnit('atlas-as7-d'),
      )!;
      const old = service.getById('atlas-as7-d', { strict: true });
      await jest.advanceTimersByTimeAsync(0);
      requests.cancel();
      const nextTicket = requests.begin('canonical:atlas')!;
      let accepted: unknown;
      const retry = service
        .getById('atlas-as7-d', { strict: true })
        .then((unit) => {
          accepted = unit;
          requests.finish(nextTicket);
          return unit;
        });
      try {
        await jest.advanceTimersByTimeAsync(0);
        expect(unitFetches()).toBe(2);
        expect(accepted).toMatchObject({ variant: 'AS7-D' });
      } finally {
        held.resolve({
          ok: true,
          json: async () => ({ ...ATLAS_UNIT, variant: 'stale' }),
        });
        await Promise.all([old, retry]);
      }
      expect(requests.isCurrent(oldTicket)).toBe(false);
      expect(await service.getById('atlas-as7-d')).toBe(accepted);
      expect(unitFetches()).toBe(2);
    });

    it('keeps two non-canceled coordinator consumers on one canonical read', async () => {
      const firstConsumer = new LoadRequestCoordinator();
      const secondConsumer = new LoadRequestCoordinator();
      const release = jest.fn(() => service.invalidateUnit('atlas-as7-d'));
      const held = deferred();
      fetchMock
        .mockResolvedValueOnce(indexResponse())
        .mockReturnValueOnce(held.promise);
      const firstTicket = firstConsumer.begin('canonical:atlas', release)!;
      const secondTicket = secondConsumer.begin('canonical:atlas', release)!;
      const first = service.getById('atlas-as7-d', { strict: true });
      const second = service.getById('atlas-as7-d', { strict: true });
      await jest.advanceTimersByTimeAsync(0);
      expect(unitFetches()).toBe(1);
      held.resolve(unitResponse());
      const [a, b] = await Promise.all([first, second]);
      expect(a).toMatchObject({ id: 'atlas-as7-d' });
      expect(b).toBe(a);
      firstConsumer.finish(firstTicket);
      secondConsumer.finish(secondTicket);
      firstConsumer.cancel();
      secondConsumer.cancel();
      expect(release).not.toHaveBeenCalled();
      expect(await service.getById('atlas-as7-d')).toBe(a);
      expect(unitFetches()).toBe(1);
    });

    it('does not cache a unit whose load was invalidated mid-flight', async () => {
      const slowUnit = deferred();
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : slowUnit.promise,
      );

      const pending = service.getById('atlas-as7-d');
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(0);
      service.invalidateUnit('atlas-as7-d');
      slowUnit.resolve(unitResponse());
      await pending;

      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : unitResponse(),
      );
      await service.getById('atlas-as7-d');

      expect(unitFetches()).toBe(2);
    });

    it('does not cache a unit whose load was cleared mid-flight', async () => {
      const slowUnit = deferred();
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : slowUnit.promise,
      );

      const pending = service.getById('atlas-as7-d');
      await jest.advanceTimersByTimeAsync(0);
      service.clearCache();
      slowUnit.resolve(unitResponse());
      await pending;

      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith('/index.json') ? indexResponse() : unitResponse(),
      );
      await service.getById('atlas-as7-d');

      expect(unitFetches()).toBe(2);
    });

    it('does not cache an index whose load was cleared mid-flight', async () => {
      const slowIndex = deferred();
      fetchMock.mockReturnValueOnce(slowIndex.promise);

      const pending = service.getIndex();
      await jest.advanceTimersByTimeAsync(0);
      service.clearCache();
      slowIndex.resolve(indexResponse());
      await pending;

      fetchMock.mockResolvedValue(indexResponse());
      await service.getIndex();

      expect(indexFetches()).toBe(2);
    });

    it('lets a load started after clearCache stay joinable when the older load settles', async () => {
      const oldIndex = deferred();
      const newIndex = deferred();
      fetchMock
        .mockReturnValueOnce(oldIndex.promise)
        .mockReturnValueOnce(newIndex.promise);

      const older = service.getIndex();
      await jest.advanceTimersByTimeAsync(0);
      service.clearCache();
      const newer = service.getIndex();
      await jest.advanceTimersByTimeAsync(0);
      oldIndex.resolve(indexResponse());
      await older;
      const joiner = service.getIndex();
      newIndex.resolve(indexResponse());
      await Promise.all([newer, joiner]);

      expect(indexFetches()).toBe(2);
    });
  });
});
