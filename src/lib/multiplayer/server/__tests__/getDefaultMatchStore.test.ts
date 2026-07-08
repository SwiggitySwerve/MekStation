/**
 * getDefaultMatchStore unit tests — harden-multiplayer-transport (M2),
 * task 1.5: environment-aware store selection.
 */

import type { IMatchStore } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
  shouldUseDurableStore,
} from '../getDefaultMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

type IsolatedDefaultMatchStoreModule = Pick<
  typeof import('../getDefaultMatchStore'),
  'getDefaultMatchStore'
>;

function loadDefaultMatchStoreFromIsolatedModule(): IMatchStore {
  let store: IMatchStore | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module =
      require('../getDefaultMatchStore') as IsolatedDefaultMatchStoreModule;
    store = module.getDefaultMatchStore();
  });
  if (!store) {
    throw new Error(
      'isolated getDefaultMatchStore load did not return a store',
    );
  }
  return store;
}

describe('getDefaultMatchStore', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalStoreEnv = process.env.MULTIPLAYER_STORE;
  const originalDbPath = process.env.MULTIPLAYER_DB_PATH;

  beforeEach(() => {
    // Keep the durable-store branches off-disk for this suite.
    process.env.MULTIPLAYER_DB_PATH = ':memory:';
  });

  // `NODE_ENV` is typed read-only on `process.env`; cast through a
  // mutable view so the test can flip it per-case.
  const env = process.env as Record<string, string | undefined>;
  const setNodeEnv = (value: string | undefined): void => {
    if (value === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = value;
    }
  };

  afterEach(() => {
    _resetDefaultMatchStore();
    setNodeEnv(originalNodeEnv);
    if (originalStoreEnv === undefined) {
      delete process.env.MULTIPLAYER_STORE;
    } else {
      process.env.MULTIPLAYER_STORE = originalStoreEnv;
    }
    if (originalDbPath === undefined) {
      delete process.env.MULTIPLAYER_DB_PATH;
    } else {
      process.env.MULTIPLAYER_DB_PATH = originalDbPath;
    }
  });

  it('returns the in-memory store in development / test', () => {
    setNodeEnv('test');
    delete process.env.MULTIPLAYER_STORE;
    expect(shouldUseDurableStore()).toBe(false);
    expect(getDefaultMatchStore()).toBeInstanceOf(InMemoryMatchStore);
  });

  it('returns the durable store in production', () => {
    setNodeEnv('production');
    delete process.env.MULTIPLAYER_STORE;
    expect(shouldUseDurableStore()).toBe(true);
    const store = getDefaultMatchStore();
    expect(store).toBeInstanceOf(DurableMatchStore);
    (store as DurableMatchStore).close();
  });

  it('honors an explicit MULTIPLAYER_STORE=memory override even in production', () => {
    setNodeEnv('production');
    process.env.MULTIPLAYER_STORE = 'memory';
    expect(shouldUseDurableStore()).toBe(false);
    expect(getDefaultMatchStore()).toBeInstanceOf(InMemoryMatchStore);
  });

  it('honors an explicit MULTIPLAYER_STORE=durable override in test', () => {
    setNodeEnv('test');
    process.env.MULTIPLAYER_STORE = 'durable';
    expect(shouldUseDurableStore()).toBe(true);
    const store = getDefaultMatchStore();
    expect(store).toBeInstanceOf(DurableMatchStore);
    (store as DurableMatchStore).close();
  });

  it('returns a stable singleton within a process', () => {
    setNodeEnv('test');
    delete process.env.MULTIPLAYER_STORE;
    expect(getDefaultMatchStore()).toBe(getDefaultMatchStore());
  });

  describe('global singleton boundary', () => {
    beforeEach(() => {
      setNodeEnv('test');
      delete process.env.MULTIPLAYER_STORE;
    });

    it('shares one store across isolated module graphs', () => {
      const firstStore = loadDefaultMatchStoreFromIsolatedModule();
      const secondStore = loadDefaultMatchStoreFromIsolatedModule();

      expect(secondStore).toBe(firstStore);
    });

    it('_resetDefaultMatchStore clears the process-global singleton slot', () => {
      const firstStore = getDefaultMatchStore();

      _resetDefaultMatchStore();
      const secondStore = getDefaultMatchStore();

      expect(secondStore).not.toBe(firstStore);
    });
  });
});
