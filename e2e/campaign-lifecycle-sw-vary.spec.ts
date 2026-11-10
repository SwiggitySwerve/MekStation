/**
 * S1b matrix row E: the REAL service worker must not hand a campaign body
 * fetched for a newer reader level to a client that did not ask for it.
 *
 * The worker caches every ok same-origin GET in a runtime cache shared by old
 * and new bundles and replays it when the network fails. The server marks
 * `GET /api/campaigns/[id]` with `Vary: X-MekStation-Lifecycle-Rules`, which is
 * the only thing that keys that cache by reader level. This spec drives a
 * production build with the worker controlling the page:
 *
 *   1. a campaign row holding a version 2 contract is stored (header 2);
 *   2. the page, under the worker, fetches it with header 2 (cached);
 *   3. offline, a HEADER-LESS fetch (an older bundle) must NOT get that body,
 *      while the header-2 fetch still gets its own cached copy;
 *   4. online, a header-less fetch is refused 426, never served the body.
 *
 * Mutant for the coordinator: drop `varyByLifecycleRules(res)` from the GET
 * branch of `src/pages/api/campaigns/[id].ts`; step 3 must then fail.
 *
 * Not run by the S1b worker (no build, server or browser were allowed); run it
 * with the other campaign specs against a production build.
 *
 * @tags @campaign @strict
 */

import { expect, test, type Page } from '@playwright/test';

import { stagedContract } from '../src/lib/campaign/contracts/__tests__/contractCompletion.fixtures';

const HEADER = 'X-MekStation-Lifecycle-Rules';

test.describe.configure({ timeout: 150_000 });

type CampaignStoreWindow = {
  __ZUSTAND_STORES__?: {
    campaign?: {
      getState: () => {
        createCampaign: (
          name: string,
          factionId: string,
          options?: { startingFunds?: number },
        ) => string;
      };
    };
    campaignPersistence?: {
      getState: () => {
        legacyUnadopted: boolean;
        adoptLegacyCampaign: () => Promise<boolean>;
      };
    };
  };
};

interface CampaignRecord {
  readonly version: number;
  readonly body: { readonly missions: readonly (readonly unknown[])[] };
  readonly [key: string]: unknown;
}

/** Create and adopt a campaign so the server holds its row. */
async function seedSavedCampaign(page: Page): Promise<string> {
  await page.goto('/gameplay/campaigns');
  await page.waitForFunction(
    () => Boolean((window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign),
    undefined,
    { timeout: 20_000 },
  );
  const campaignId = await page.evaluate((name: string) => {
    const store = (window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign;
    if (!store) throw new Error('campaign store is not exposed');
    return store.getState().createCampaign(name, 'mercenary');
  }, `Lifecycle SW Vary ${Date.now()}`);
  await page.goto(`/gameplay/campaigns/${campaignId}`);
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  await expect
    .poll(
      async () => {
        await page.evaluate(async () => {
          const store = (window as CampaignStoreWindow).__ZUSTAND_STORES__
            ?.campaignPersistence;
          if (store?.getState().legacyUnadopted) {
            await store.getState().adoptLegacyCampaign();
          }
        });
        return (
          await page.request.get(`/api/campaigns/${campaignId}`)
        ).status();
      },
      { timeout: 30_000 },
    )
    .toBe(200);
  return campaignId;
}

test('the worker never replays a level 2 campaign body to a header-less request @campaign', async ({
  page,
  context,
  request,
}) => {
  const campaignId = await seedSavedCampaign(page);
  const url = `/api/campaigns/${campaignId}`;

  // 1. Store a version 2 contract. A reader declaring level 2 may write it.
  const stored = (await (
    await request.get(url, { headers: { [HEADER]: '1' } })
  ).json()) as CampaignRecord;
  const contract = JSON.parse(JSON.stringify(stagedContract())) as Record<
    string,
    unknown
  >;
  const envelope = {
    ...stored,
    version: stored.version + 1,
    body: {
      ...stored.body,
      missions: [...stored.body.missions, [String(contract.id), contract]],
    },
  };
  const put = await request.put(url, {
    headers: { [HEADER]: '2' },
    data: { envelope, baseVersion: stored.version },
  });
  expect(put.status()).toBe(200);

  // Online: a header-less reader is refused, never served the body.
  const refused = await request.get(url);
  expect(refused.status()).toBe(426);
  expect(await refused.text()).not.toContain('lifecycleRulesVersion');

  // 2. The page, controlled by the real worker, fetches with header 2.
  await page.goto('/');
  await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker?.ready;
      return Boolean(registration && navigator.serviceWorker.controller);
    },
    undefined,
    { timeout: 30_000 },
  );
  const online = await page.evaluate(
    async ({ target, header }) => {
      const res = await fetch(target, { headers: { [header]: '2' } });
      return { status: res.status, text: await res.text() };
    },
    { target: url, header: HEADER },
  );
  expect(online.status).toBe(200);
  expect(online.text).toContain('lifecycleRulesVersion');

  // 3. Offline: the older bundle's header-less fetch must not leak the body.
  await context.setOffline(true);
  try {
    const olderBundle = await page.evaluate(async (target) => {
      try {
        const res = await fetch(target);
        return { served: true, text: await res.text() };
      } catch {
        return { served: false, text: '' };
      }
    }, url);
    expect(olderBundle.text).not.toContain('lifecycleRulesVersion');

    // The header-2 fetch still gets its own cached copy.
    const sameLevel = await page.evaluate(
      async ({ target, header }) => {
        const res = await fetch(target, { headers: { [header]: '2' } });
        return { status: res.status, text: await res.text() };
      },
      { target: url, header: HEADER },
    );
    expect(sameLevel.status).toBe(200);
    expect(sameLevel.text).toContain('lifecycleRulesVersion');
  } finally {
    await context.setOffline(false);
  }
});
