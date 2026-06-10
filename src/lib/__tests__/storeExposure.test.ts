/**
 * Regression test for PT-004.
 *
 * `useCampaignStore` is a lazy-init wrapper function (not a raw Zustand
 * hook with `.getState`/`.setState` attached as statics). When
 * `storeExposure.ts` exposed it directly to `window.__ZUSTAND_STORES__`,
 * every E2E spec that did `stores.campaign.getState()` crashed with
 * "stores.campaign.getState is not a function" because the wrapper
 * function has no `.getState` static.
 *
 * This test pins the contract that the campaign entry is the called
 * `StoreApi` instance — so the spec pattern `stores.campaign.getState()`
 * works the same as it does for every other store on the global.
 */
/**
 * @jest-environment jsdom
 */

import { exposeStoresForE2E } from '../e2e/storeExposure';

describe('exposeStoresForE2E (PT-004)', () => {
  const originalE2EMode = process.env.NEXT_PUBLIC_E2E_MODE;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = originalE2EMode;
  });

  beforeEach(() => {
    delete (window as unknown as { __ZUSTAND_STORES__?: unknown })
      .__ZUSTAND_STORES__;
    delete (window as unknown as { __E2E_MODE__?: unknown }).__E2E_MODE__;
  });

  it('exposes campaign as a StoreApi with `.getState()` directly callable', () => {
    exposeStoresForE2E();

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: { getState?: unknown };
        };
      }
    ).__ZUSTAND_STORES__;

    expect(stores).toBeDefined();
    expect(stores?.campaign).toBeDefined();
    // The critical PT-004 invariant: `getState` MUST be a function attached
    // directly to the exposed value. Tests do `stores.campaign.getState()` —
    // if `getState` is undefined or non-callable, ~30 specs crash.
    expect(typeof stores?.campaign?.getState).toBe('function');
  });

  it('exposes the other stores as raw Zustand hooks (also with `.getState`)', () => {
    exposeStoresForE2E();

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: Record<string, { getState?: unknown }>;
      }
    ).__ZUSTAND_STORES__;

    expect(stores).toBeDefined();
    // The other six stores in storeExposure.ts are still raw Zustand
    // hooks (functions with `.getState`/`.setState`/`.subscribe`
    // attached). This test guards against a future refactor accidentally
    // breaking them the same way the campaign store was broken.
    for (const key of [
      'campaignRoster',
      'force',
      'pilot',
      'encounter',
      'gameplay',
      'quickGame',
      'repair',
      'award',
      'tabManager',
    ]) {
      expect(typeof stores?.[key]?.getState).toBe('function');
    }
  });
});
