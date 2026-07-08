/**
 * getDefaultMatchStore — environment-aware `IMatchStore` selection.
 *
 * Per `harden-multiplayer-transport` design D1: the production code
 * paths (`MatchHostRegistry`, the REST routes, the WebSocket upgrade
 * handler) depend only on `IMatchStore`. This factory picks the
 * concrete implementation:
 *   - production            → `DurableMatchStore` (SQLite, survives a
 *     server process restart, satisfies "Server Restart Survives
 *     Matches" against a real backend).
 *   - development / test     → `InMemoryMatchStore` (the explicitly
 *     dev-labeled fallback — fast, isolated, no disk footprint).
 *
 * The selection is a singleton so every HTTP handler + the WebSocket
 * upgrade in one Node process share one store. Tests that want a
 * specific implementation construct it directly (or call
 * `_setDefaultMatchStoreForTests`).
 *
 * Rollback (design Migration Plan): force `getDefaultMatchStore()` back
 * to the in-memory store by setting `MULTIPLAYER_STORE=memory` — the
 * durable code paths go dormant.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import type { IMatchStore } from './IMatchStore';

import { DurableMatchStore } from './DurableMatchStore';
import { InMemoryMatchStore } from './InMemoryMatchStore';

const MATCH_STORE_SINGLETON_KEY = Symbol.for(
  'mekstation.multiplayer.matchStore',
);

type GlobalMatchStoreRegistry = typeof globalThis & {
  [MATCH_STORE_SINGLETON_KEY]?: IMatchStore;
};

function getGlobalMatchStoreRegistry(): GlobalMatchStoreRegistry {
  return globalThis as GlobalMatchStoreRegistry;
}

/**
 * True when the running process should use the durable SQLite store.
 *
 * Resolution order:
 *   1. `MULTIPLAYER_STORE` env var — explicit override
 *      (`durable` | `memory`). Lets a deploy or a stress test force a
 *      backend regardless of `NODE_ENV`.
 *   2. `NODE_ENV === 'production'` → durable; anything else → memory.
 *
 * Test runs (`NODE_ENV === 'test'`) always get the in-memory store
 * unless `MULTIPLAYER_STORE=durable` is set explicitly — the durable
 * store's own contract suite sets it per-test via direct construction.
 */
export function shouldUseDurableStore(): boolean {
  const override = process.env.MULTIPLAYER_STORE?.toLowerCase();
  if (override === 'durable') return true;
  if (override === 'memory') return false;
  return process.env.NODE_ENV === 'production';
}

/**
 * Default factory used by the REST routes, the WebSocket upgrade
 * handler, and `MatchHostRegistry`. Returns the durable store in
 * production and the in-memory fallback in dev/test.
 */
export function getDefaultMatchStore(): IMatchStore {
  const registry = getGlobalMatchStoreRegistry();
  let store = registry[MATCH_STORE_SINGLETON_KEY];
  if (!store) {
    store = shouldUseDurableStore()
      ? new DurableMatchStore()
      : new InMemoryMatchStore();
    registry[MATCH_STORE_SINGLETON_KEY] = store;
  }
  return store;
}

/**
 * Test-only: install a specific store as the process singleton so an
 * integration test can drive the production wiring against a known
 * backend (e.g. an in-memory `DurableMatchStore` at `:memory:`).
 */
export function _setDefaultMatchStoreForTests(store: IMatchStore): void {
  getGlobalMatchStoreRegistry()[MATCH_STORE_SINGLETON_KEY] = store;
}

/** Test-only: reset the singleton so suites don't bleed into each other. */
export function _resetDefaultMatchStore(): void {
  delete getGlobalMatchStoreRegistry()[MATCH_STORE_SINGLETON_KEY];
}
