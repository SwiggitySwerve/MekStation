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
import { setTestNodeEnv } from './storeNodeEnvironment';

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

  afterEach(() => {
    _resetDefaultMatchStore();
    setTestNodeEnv(originalNodeEnv);
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
    setTestNodeEnv('test');
    delete process.env.MULTIPLAYER_STORE;
    expect(shouldUseDurableStore()).toBe(false);
    expect(getDefaultMatchStore()).toBeInstanceOf(InMemoryMatchStore);
  });

  it('returns the durable store in production', () => {
    setTestNodeEnv('production');
    delete process.env.MULTIPLAYER_STORE;
    expect(shouldUseDurableStore()).toBe(true);
    const store = getDefaultMatchStore();
    expect(store).toBeInstanceOf(DurableMatchStore);
    (store as DurableMatchStore).close();
  });

  it('honors an explicit MULTIPLAYER_STORE=memory override even in production', () => {
    setTestNodeEnv('production');
    process.env.MULTIPLAYER_STORE = 'memory';
    expect(shouldUseDurableStore()).toBe(false);
    expect(getDefaultMatchStore()).toBeInstanceOf(InMemoryMatchStore);
  });

  it('honors an explicit MULTIPLAYER_STORE=durable override in test', () => {
    setTestNodeEnv('test');
    process.env.MULTIPLAYER_STORE = 'durable';
    expect(shouldUseDurableStore()).toBe(true);
    const store = getDefaultMatchStore();
    expect(store).toBeInstanceOf(DurableMatchStore);
    (store as DurableMatchStore).close();
  });

  it('returns a stable singleton within a process', () => {
    setTestNodeEnv('test');
    delete process.env.MULTIPLAYER_STORE;
    expect(getDefaultMatchStore()).toBe(getDefaultMatchStore());
  });

  describe('global singleton boundary', () => {
    beforeEach(() => {
      setTestNodeEnv('test');
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
