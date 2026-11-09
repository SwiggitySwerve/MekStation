import type { Page } from '@playwright/test';

import {
  getStoreState,
  isStoreExposed,
  resetStores,
  setStoreValue,
  waitForStoreState,
} from '../../e2e/helpers/store';

jest.mock('@playwright/test', () => ({
  expect: (value: unknown) =>
    typeof value === 'function'
      ? {
          toPass: (options: { timeout: number }) => mockToPass(value, options),
        }
      : expect(value),
}));

function browserDocument() {
  const state = { ready: false, reset: jest.fn() };
  const store = {
    getState: jest.fn(() => state),
    setState: jest.fn((updates: Record<string, unknown>) => {
      Object.assign(state, updates);
    }),
  };
  const evaluate = jest.fn(
    async (callback: (arg: unknown) => unknown, arg?: unknown) => callback(arg),
  );
  const pending = new Set<{
    predicate: () => boolean;
    publish: () => void;
  }>();
  const waitForFunction = jest.fn(
    (
      predicate: () => boolean,
      _arg: undefined,
      options: { timeout: number },
    ) => {
      if (predicate()) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(wait);
          reject(new Error('Store exposure timed out'));
        }, options.timeout);
        const wait = {
          predicate,
          publish: () => {
            clearTimeout(timer);
            pending.delete(wait);
            resolve();
          },
        };
        pending.add(wait);
      });
    },
  );
  const publish = (stores: Record<string, unknown> = { campaign: store }) => {
    Object.defineProperty(window, '__ZUSTAND_STORES__', {
      configurable: true,
      writable: true,
      value: stores,
    });
    for (const wait of pending) {
      if (wait.predicate()) wait.publish();
    }
  };
  return {
    // This double implements only the public Page methods used by the helper.
    page: { evaluate, waitForFunction } as unknown as Page,
    evaluate,
    waitForFunction,
    state,
    store,
    publish,
  };
}

const mockToPass = jest.fn();

beforeEach(() => {
  delete window.__ZUSTAND_STORES__;
  mockToPass.mockReset();
});

function track<T>(promise: Promise<T>) {
  let settled = false;
  const result = promise.then(
    (value) => {
      settled = true;
      return { value };
    },
    (error: unknown) => {
      settled = true;
      return { error };
    },
  );
  return { result, isSettled: () => settled };
}

describe('store publication readiness', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for publication before reading (matrix row 1)', async () => {
    const fixture = browserDocument();
    const read = track(getStoreState(fixture.page, 'campaign'));
    await jest.advanceTimersByTimeAsync(0);

    expect(read.isSettled()).toBe(false);
    expect(fixture.store.getState).not.toHaveBeenCalled();
    fixture.publish();

    expect(await read.result).toEqual({ value: fixture.state });
    expect(fixture.store.getState).toHaveBeenCalledTimes(1);
  });

  it('waits for publication before writing (matrix row 2)', async () => {
    const fixture = browserDocument();
    const write = track(
      setStoreValue(fixture.page, 'campaign', { ready: true }),
    );
    await jest.advanceTimersByTimeAsync(0);

    expect(write.isSettled()).toBe(false);
    expect(fixture.store.setState).not.toHaveBeenCalled();
    fixture.publish();

    expect(await write.result).toEqual({ value: undefined });
    expect(fixture.store.setState).toHaveBeenCalledTimes(1);
    expect(fixture.store.setState).toHaveBeenCalledWith({ ready: true });
  });

  it('waits again after navigation replaces a previously published document', async () => {
    const fixture = browserDocument();
    fixture.publish();
    await getStoreState(fixture.page, 'campaign');

    delete window.__ZUSTAND_STORES__;
    const read = track(getStoreState(fixture.page, 'campaign'));
    await jest.advanceTimersByTimeAsync(0);
    expect(read.isSettled()).toBe(false);
    expect(fixture.store.getState).toHaveBeenCalledTimes(1);

    const nextState = { ready: true, document: 'next' };
    const nextStore = { getState: jest.fn(() => nextState) };
    fixture.publish({ campaign: nextStore });
    expect(await read.result).toEqual({ value: nextState });
    expect(nextStore.getState).toHaveBeenCalledTimes(1);
    expect(fixture.waitForFunction).toHaveBeenCalledTimes(2);
  });

  it.each(['read', 'write'])(
    'fails a %s within the existing 10-second exposure budget',
    async (operation) => {
      const fixture = browserDocument();
      const result = track(
        operation === 'read'
          ? getStoreState(fixture.page, 'campaign')
          : setStoreValue(fixture.page, 'campaign', {}),
      );
      await jest.advanceTimersByTimeAsync(9999);
      expect(result.isSettled()).toBe(false);
      await jest.advanceTimersByTimeAsync(1);

      expect(await result.result).toEqual({
        error: new Error('Store exposure timed out'),
      });
      expect(fixture.waitForFunction).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        { timeout: 10000 },
      );
      expect(fixture.store.getState).not.toHaveBeenCalled();
      expect(fixture.store.setState).not.toHaveBeenCalled();
    },
  );
});

afterEach(() => {
  delete window.__ZUSTAND_STORES__;
  jest.restoreAllMocks();
});

describe('store snapshot contract', () => {
  it('reads the exact published state and applies one exact update', async () => {
    const fixture = browserDocument();
    fixture.publish();

    await expect(getStoreState(fixture.page, 'campaign')).resolves.toEqual(
      fixture.state,
    );
    await setStoreValue(fixture.page, 'campaign', { ready: true });

    expect(fixture.store.getState).toHaveBeenCalledTimes(1);
    expect(fixture.store.setState).toHaveBeenCalledTimes(1);
    expect(fixture.store.setState).toHaveBeenCalledWith({ ready: true });
    expect(fixture.state.ready).toBe(true);
  });

  it('rejects a missing named store after the map is published', async () => {
    const fixture = browserDocument();
    fixture.publish({});

    const message = 'Store "missing" not found in window.__ZUSTAND_STORES__';
    await expect(getStoreState(fixture.page, 'missing')).rejects.toThrow(
      message,
    );
    await expect(setStoreValue(fixture.page, 'missing', {})).rejects.toThrow(
      message,
    );
    expect(fixture.store.getState).not.toHaveBeenCalled();
    expect(fixture.store.setState).not.toHaveBeenCalled();
  });

  it('keeps isStoreExposed an immediate query on the current document', async () => {
    const fixture = browserDocument();
    await expect(isStoreExposed(fixture.page)).resolves.toBe(false);
    fixture.publish();
    await expect(isStoreExposed(fixture.page)).resolves.toBe(true);
    delete window.__ZUSTAND_STORES__;
    await expect(isStoreExposed(fixture.page)).resolves.toBe(false);
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
  });

  it('keeps the existing reset skip when stores are absent', async () => {
    const fixture = browserDocument();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await resetStores(fixture.page);

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('Skipping reset'),
    );
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
    expect(mockToPass).not.toHaveBeenCalled();
  });

  it('keeps the existing reset action and settling budget', async () => {
    const fixture = browserDocument();
    fixture.publish();
    mockToPass.mockImplementation(async (callback: () => Promise<void>) =>
      callback(),
    );

    await resetStores(fixture.page, 321);

    expect(fixture.state.reset).toHaveBeenCalledTimes(1);
    expect(mockToPass).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 321,
    });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
  });

  it('polls snapshots inside one predicate budget, including before publication', async () => {
    const fixture = browserDocument();
    mockToPass.mockImplementation(async (callback: () => Promise<void>) => {
      await expect(callback()).rejects.toThrow('Stores are not exposed');
      fixture.publish();
      await expect(callback()).rejects.toThrow();
      fixture.state.ready = true;
      await callback();
    });

    await waitForStoreState(fixture.page, 'campaign', 'state.ready', 432);

    expect(mockToPass).toHaveBeenCalledTimes(1);
    expect(mockToPass).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 432,
    });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
    expect(fixture.store.getState).toHaveBeenCalledTimes(2);
  });

  it('preserves a predicate timeout instead of starting a nested readiness wait', async () => {
    const fixture = browserDocument();
    const timeout = new Error('predicate budget expired');
    mockToPass.mockImplementation(async (callback: () => Promise<void>) => {
      await expect(callback()).rejects.toThrow('Stores are not exposed');
      throw timeout;
    });

    await expect(
      waitForStoreState(fixture.page, 'campaign', 'state.ready'),
    ).rejects.toBe(timeout);

    expect(mockToPass).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 10000,
    });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
    expect(fixture.store.getState).not.toHaveBeenCalled();
  });
});
