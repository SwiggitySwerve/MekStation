/**
 * Warm service-worker reload sweep over the real campaign server (no mocks).
 * Red on the stock fetch-listener worker; green with static API write routes.
 * PR 2 owns fault-injected adoption when no unload write reaches the server.
 * Tab-close control: campaign-crash-window-flush.spec.ts.
 * @tags @campaign
 */
import { expect, test, type Page } from '@playwright/test';

import { seedSavedCampaign } from './helpers/campaignFlow';

// One trial per test keeps both red polling and warm-up within a 55 second
// budget, and gives C4 a separate result for every requested trial.
test.describe.configure({ timeout: 55_000 });
test.use({ serviceWorkers: 'allow' });

interface CampaignSnapshot {
  campaign: { currentDate: string | Date } | null;
}

type SweepWindow = {
  __ZUSTAND_STORES__?: {
    campaign: {
      getState: () => CampaignSnapshot;
      subscribe: (listener: (state: CampaignSnapshot) => void) => () => void;
    };
    campaignPersistence: {
      getState: () => { dirty: boolean; saveState: string };
    };
  };
};

async function waitForCleanCampaign(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = (
      window as SweepWindow
    ).__ZUSTAND_STORES__?.campaignPersistence.getState();
    return state && !state.dirty && state.saveState === 'saved';
  });
  await expect(page.getByTestId('advance-day-btn')).toBeEnabled();
}

async function warmController(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  // Fresh-context first documents can deliver despite the defect. Measure
  // only after the worker has controlled several replacement documents.
  for (let reload = 0; reload < 3; reload += 1) {
    await page.reload();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await waitForCleanCampaign(page);
  }
}

async function reloadAfterDateChange(
  page: Page,
  offsetMs: number,
): Promise<void> {
  await page.evaluate((offset) => {
    const campaign = (window as SweepWindow).__ZUSTAND_STORES__?.campaign;
    if (!campaign) throw new Error('Campaign store is not exposed');
    const before = new Date(
      campaign.getState().campaign!.currentDate,
    ).toISOString();
    const unsubscribe = campaign.subscribe((state) => {
      if (!state.campaign) return;
      const expectedDate = new Date(state.campaign.currentDate).toISOString();
      if (expectedDate === before) return;
      unsubscribe();
      const t0 = performance.now();
      const timing = { offset, expectedDate, reloadCallMs: 0, pagehideMs: 0 };
      const record = () =>
        sessionStorage.setItem('campaign-unload-trial', JSON.stringify(timing));
      record();
      window.addEventListener(
        'pagehide',
        () => {
          timing.pagehideMs = performance.now() - t0;
          record();
        },
        { once: true },
      );
      // Same measurement origin as the original sweep: the store date change.
      // Leave 10 ms for reload -> pagehide; busy-wait only the final slice.
      const target = t0 + offset - 10;
      setTimeout(
        () => {
          while (performance.now() < target) {
            /* wait for the target offset */
          }
          timing.reloadCallMs = performance.now() - t0;
          record();
          window.location.reload();
        },
        Math.max(0, offset - 40),
      );
    });
  }, offsetMs);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.getByTestId('advance-day-btn').click({ noWaitAfter: true }),
  ]);
}

for (const [offsetMs, trials] of [
  [40, 2],
  [1800, 3],
  [1900, 3],
  [2000, 3],
  [2100, 1],
]) {
  for (let trial = 1; trial <= trials; trial += 1) {
    test(`warm reload at ${offsetMs} ms, trial ${trial} @campaign`, async ({
      page,
      request,
    }, testInfo) => {
      const campaignId = await seedSavedCampaign(
        page,
        `Unload ${offsetMs}-${trial}`,
      );
      try {
        await waitForCleanCampaign(page);
        await warmController(page);
        await reloadAfterDateChange(page, offsetMs);
        const timing = await page.evaluate(
          () =>
            JSON.parse(
              sessionStorage.getItem('campaign-unload-trial') ?? 'null',
            ) as {
              expectedDate: string;
              reloadCallMs: number;
              pagehideMs: number;
            } | null,
        );
        expect(timing).not.toBeNull();
        await testInfo.attach('reload-timing', {
          body: JSON.stringify(timing),
          contentType: 'application/json',
        });
        // A late 40 ms case could otherwise pass via the ordinary 2 s save.
        expect(timing!.reloadCallMs).toBeLessThan(offsetMs + 100);
        await expect
          .poll(
            async () => {
              const response = await request.get(
                `/api/campaigns/${campaignId}`,
              );
              expect(response.status()).toBe(200);
              const record = (await response.json()) as {
                body: { currentDate: string };
              };
              return record.body.currentDate;
            },
            { timeout: 10_000 },
          )
          .toBe(timing!.expectedDate);
        await waitForCleanCampaign(page);
        const card = page.getByTestId('campaign-save-status-card');
        await expect(card.getByText('Saved', { exact: true })).toBeVisible();
        await expect(
          card.getByText('Unsaved changes', { exact: true }),
        ).toBeHidden();
      } finally {
        // Stop the selected document before deleting its row so teardown cannot
        // recreate it with an unload write or a still-armed debounce.
        await page.close({ runBeforeUnload: true });
        await request.delete(`/api/campaigns/${campaignId}`);
      }
    });
  }
}

test('warm reload with nothing pending sends zero PUTs @campaign', async ({
  page,
  context,
  request,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Unload clean control');
  try {
    await waitForCleanCampaign(page);
    await warmController(page);
    const puts: string[] = [];
    // Context observes worker requests as well as document requests.
    context.on('request', (req) => {
      if (
        req.method() === 'PUT' &&
        new URL(req.url()).pathname === `/api/campaigns/${campaignId}`
      )
        puts.push(req.url());
    });
    await page.reload();
    await waitForCleanCampaign(page);
    // Observe beyond the debounce to catch an accidental load-triggered save.
    await page.waitForTimeout(2_500);
    expect(puts).toEqual([]);
  } finally {
    await page.close({ runBeforeUnload: true });
    await request.delete(`/api/campaigns/${campaignId}`);
  }
});

// Intentionally omitted in PR 1: serviceWorkers:'block' + aborting the first
// document's PUTs is a declared network-fault mock for PR 2's adoption contract.
