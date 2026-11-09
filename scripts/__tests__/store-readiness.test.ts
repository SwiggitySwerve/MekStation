import type { Page } from '@playwright/test';

import { expect as playwrightExpect } from '@playwright/test';

import {
  getStoreState,
  isStoreExposed,
  resetStores,
  setStoreValue,
  waitForStoreState,
} from '../../e2e/helpers/store';

jest.mock('@playwright/test', () => ({ expect: jest.fn() }));

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
  const waitForFunction = jest.fn();
  const publish = (stores: Record<string, unknown> = { campaign: store }) => {
    Object.defineProperty(window, '__ZUSTAND_STORES__', {
      configurable: true,
      writable: true,
      value: stores,
    });
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

const mockedExpect = jest.mocked(playwrightExpect);
const toPass = jest.fn();

beforeEach(() => {
  delete window.__ZUSTAND_STORES__;
  toPass.mockReset();
  mockedExpect.mockImplementation((value: unknown) => {
    if (typeof value === 'function') {
      return {
        toPass: (options: { timeout: number }) => toPass(value, options),
      };
    }
    return expect(value);
  });
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
    expect(toPass).not.toHaveBeenCalled();
  });

  it('keeps the existing reset action and settling budget', async () => {
    const fixture = browserDocument();
    fixture.publish();
    toPass.mockImplementation(async (callback: () => Promise<void>) =>
      callback(),
    );

    await resetStores(fixture.page, 321);

    expect(fixture.state.reset).toHaveBeenCalledTimes(1);
    expect(toPass).toHaveBeenCalledWith(expect.any(Function), { timeout: 321 });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
  });

  it('polls snapshots inside one predicate budget, including before publication', async () => {
    const fixture = browserDocument();
    toPass.mockImplementation(async (callback: () => Promise<void>) => {
      await expect(callback()).rejects.toThrow('Stores are not exposed');
      fixture.publish();
      await expect(callback()).rejects.toThrow();
      fixture.state.ready = true;
      await callback();
    });

    await waitForStoreState(fixture.page, 'campaign', 'state.ready', 432);

    expect(toPass).toHaveBeenCalledTimes(1);
    expect(toPass).toHaveBeenCalledWith(expect.any(Function), { timeout: 432 });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
    expect(fixture.store.getState).toHaveBeenCalledTimes(2);
  });

  it('preserves a predicate timeout instead of starting a nested readiness wait', async () => {
    const fixture = browserDocument();
    const timeout = new Error('predicate budget expired');
    toPass.mockImplementation(async (callback: () => Promise<void>) => {
      await expect(callback()).rejects.toThrow('Stores are not exposed');
      throw timeout;
    });

    await expect(
      waitForStoreState(fixture.page, 'campaign', 'state.ready'),
    ).rejects.toBe(timeout);

    expect(toPass).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 10000,
    });
    expect(fixture.waitForFunction).not.toHaveBeenCalled();
    expect(fixture.store.getState).not.toHaveBeenCalled();
  });
});
