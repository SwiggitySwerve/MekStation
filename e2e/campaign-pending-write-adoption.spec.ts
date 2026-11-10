/**
 * A reloaded campaign document must never silently present itself as saved
 * when its local copy is newer than the server's (`adopt-pending-campaign-write`).
 *
 * Whatever lost the write - a service worker that dropped the unload flush
 * (fixed separately), a network drop, a crash, a refused save, another
 * browser - the browser keeps a copy NEWER than the server's and a marker that
 * says so. A document reloaded over that copy has to do exactly one of three
 * things: push it at the marker's token, adopt a flush that provably landed,
 * or raise a conflict. Never "Saved" with nothing sent, never a silent replace.
 *
 * Separate from `campaign-unload-adoption.spec.ts` (the service-worker sweep).
 * This file does not depend on the worker at all: it blocks service workers,
 * so it holds with or without that fix.
 *
 * MOCK MODE (for mock-mode-auditor): `hybrid`.
 *   Real: the production build, its API routes and the SQLite store; every
 *     assertion reads the real server record or the real UI. The second writer
 *     is a real second browser context driving the real UI.
 *   Faulted: ONE boundary, the browser -> server PUT of /api/campaigns/:id,
 *     through `injectPutFault` (`context.route`): aborted (a dropped
 *     network), or held (latency). Nothing is fulfilled with a fabricated
 *     body, and no GET is touched. That is a network-fault mock over the real
 *     server, declared as fault injection and not as a stub of the data.
 *
 * Reds on a build without the fix: the fault-injected catch-up (the reloaded
 * document says Saved and sends nothing) and S3 (the stale tab drops its day,
 * shows the writer's date and "Saved"). The S2 guard and the control are green
 * before and after.
 *
 * @tags @campaign
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

// Service workers are not the subject here; with one registered, an unload
// flush can be dropped for a reason unrelated to what this file proves.
test.use({ serviceWorkers: 'block' });
test.describe.configure({ timeout: 150_000 });

interface CampaignRecord {
  readonly version: number;
  readonly body: { readonly currentDate: string };
}

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

// The helpers below mirror `campaign-crash-window-flush.spec.ts`; the
// service-worker PR extracts them into `helpers/campaignFlow.ts`, after which
// this file should import them from there instead of keeping its own copy.

async function serverRecord(
  api: APIRequestContext,
  campaignId: string,
): Promise<CampaignRecord> {
  const response = await api.get(`/api/campaigns/${campaignId}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as CampaignRecord;
}

function campaignDateText(page: Page): Promise<string> {
  return page.locator('p:has-text("Current Date") + p').innerText();
}

async function openDashboard(page: Page, campaignId: string): Promise<void> {
  await page.goto(`/gameplay/campaigns/${campaignId}`);
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
}

/** Create a campaign and adopt it, so the server row exists and is not legacy. */
async function seedSavedCampaign(page: Page, label: string): Promise<string> {
  await page.goto('/gameplay/campaigns');
  await page.waitForFunction(
    () => Boolean((window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign),
    undefined,
    { timeout: 20_000 },
  );
  const campaignId = await page.evaluate((name: string) => {
    const store = (window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign;
    if (!store) throw new Error('campaign store is not exposed');
    return store
      .getState()
      .createCampaign(name, 'mercenary', { startingFunds: 3_000_000 });
  }, `${label} ${Date.now()}`);
  await openDashboard(page, campaignId);
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

async function advanceDayInUi(page: Page): Promise<string> {
  const before = await campaignDateText(page);
  await page.getByTestId('advance-day-btn').click();
  await expect
    .poll(() => campaignDateText(page), { timeout: 10_000 })
    .not.toBe(before);
  return campaignDateText(page);
}

function waitForCampaignPut(page: Page, campaignId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`/api/campaigns/${campaignId}`),
    { timeout: 30_000 },
  );
}

/** Every campaign PUT this page issues from now on (a count, in order). */
function recordCampaignPuts(page: Page, campaignId: string): number[] {
  const issuedAt: number[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'PUT' &&
      request.url().includes(`/api/campaigns/${campaignId}`)
    ) {
      issuedAt.push(Date.now());
    }
  });
  return issuedAt;
}

/**
 * Proving that something was NOT sent needs the 2 s debounce window to have
 * closed; there is no event to wait for, which is the point. Same device as the
 * crash-window spec's red arm.
 */
function letDebounceWindowClose(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 3_500));
}

/** The unsaved-edit marker the browser carries with its copy, or null. */
function storedMarker(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('campaign-store');
    if (!raw) return null;
    const stored = JSON.parse(raw) as { state?: { pendingWrite?: unknown } };
    return stored.state?.pendingWrite ?? null;
  });
}

interface PutFault {
  /** `pass` lets PUTs through; `abort` drops them; `hold` delays until release. */
  mode: 'pass' | 'abort' | 'hold';
  /** PUTs dropped so far: evidence the fault was real, not assumed. */
  aborted: number;
  /** End a hold: held PUTs continue and later ones pass. */
  release: () => void;
}

/**
 * fault-injection: the browser -> server PUT of one campaign. Aborted to model
 * a network drop (the same state a crash or a refused flush leaves), or held to
 * make a transient state observable. Everything else reaches the real server.
 */
async function injectPutFault(
  context: BrowserContext,
  campaignId: string,
): Promise<PutFault> {
  let openGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  const fault: PutFault = {
    mode: 'pass',
    aborted: 0,
    release: () => {
      fault.mode = 'pass';
      openGate();
    },
  };
  await context.route(
    new RegExp(`/api/campaigns/${campaignId}$`),
    async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      if (fault.mode === 'abort') {
        fault.aborted += 1;
        return route.abort('failed');
      }
      if (fault.mode === 'hold') await gate;
      return route.continue();
    },
  );
  return fault;
}

/**
 * A second writer that moves the server two days past `fromDate` through the
 * real UI in its own browser context, and returns the date it wrote.
 */
async function moveServerOn(
  browser: Browser,
  baseURL: string | undefined,
  campaignId: string,
): Promise<string> {
  const writerContext = await browser.newContext({
    baseURL,
    serviceWorkers: 'block',
  });
  try {
    const writer = await writerContext.newPage();
    await openDashboard(writer, campaignId);
    const written = waitForCampaignPut(writer, campaignId);
    await advanceDayInUi(writer);
    const writerDate = await advanceDayInUi(writer);
    expect((await written).status()).toBe(200);
    return writerDate;
  } finally {
    await writerContext.close();
  }
}

test('a write the network dropped is pushed by the reloaded document, with no further edit @campaign', async ({
  page,
  context,
  request,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Pending Write Catch-up');
  const before = await serverRecord(request, campaignId);
  const fault = await injectPutFault(context, campaignId);
  fault.mode = 'abort';

  const mutatedDate = await advanceDayInUi(page);
  // The ordinary save fired and was dropped: the edit now exists only here.
  await expect
    .poll(() => fault.aborted, { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText('Save failed')).toBeVisible();
  expect((await serverRecord(request, campaignId)).version).toBe(
    before.version,
  );

  // Reload while the fault is still on, so nothing of the first document's can
  // reach the server (its unload flush is dropped too).
  await page.reload();
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  expect(
    (await serverRecord(request, campaignId)).version,
    'premise: the first document must not have written',
  ).toBe(before.version);

  // The new document found a copy newer than the server's. Hold its push so
  // the transient state is observable instead of racing the debounce.
  fault.mode = 'hold';
  await expect(page.getByText('Recovered unsaved changes')).toBeVisible({
    timeout: 20_000,
  });
  expect(await campaignDateText(page)).toBe(mutatedDate);
  expect(await storedMarker(page)).not.toBeNull();
  expect((await serverRecord(request, campaignId)).version).toBe(
    before.version,
  );

  fault.release();
  // No click, no further edit: the server catches up on its own.
  await expect
    .poll(async () => (await serverRecord(request, campaignId)).version, {
      timeout: 15_000,
    })
    .toBe(before.version + 1);
  const after = await serverRecord(request, campaignId);
  expect(after.body.currentDate).not.toBe(before.body.currentDate);
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(page.getByText('Recovered unsaved changes')).toBeHidden();
  expect(await campaignDateText(page)).toBe(mutatedDate);
  expect(await storedMarker(page)).toBeNull();
});

test('S3: a stale tab reloads over a server that moved on, keeps its day, and asks @campaign', async ({
  page,
  context,
  request,
  browser,
  baseURL,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Pending Write S3');
  const before = await serverRecord(request, campaignId);
  const fault = await injectPutFault(context, campaignId);
  fault.mode = 'abort';
  const localDate = await advanceDayInUi(page);
  await expect
    .poll(() => fault.aborted, { timeout: 10_000 })
    .toBeGreaterThan(0);

  // Someone else writes a different day to the same campaign.
  const writerDate = await moveServerOn(browser, baseURL, campaignId);
  const moved = await serverRecord(request, campaignId);
  expect(moved.version).toBe(before.version + 1);
  expect(writerDate).not.toBe(localDate);

  await page.reload();
  const puts = recordCampaignPuts(page, campaignId);
  fault.mode = 'pass';

  // Not "Saved", and not the writer's date: the player is asked.
  const conflict = page.getByTestId('campaign-pending-write-conflict');
  await expect(conflict).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Conflict', { exact: true })).toBeVisible();
  await expect(page.getByText('Saved', { exact: true })).toBeHidden();
  // The local day stays visible, and the card names both sides.
  expect(await campaignDateText(page)).toBe(localDate);
  await expect(page.getByTestId('campaign-pending-write-local')).toContainText(
    `version ${before.version}`,
  );
  await expect(page.getByTestId('campaign-pending-write-server')).toContainText(
    `version ${moved.version}`,
  );
  await expect(
    page.getByRole('button', { name: 'Use Server Version' }),
  ).toBeVisible();
  await expect(page.getByTestId('campaign-save-now-btn')).toBeHidden();

  // Nothing is sent and nothing is replaced while the player thinks.
  await letDebounceWindowClose();
  expect(puts).toHaveLength(0);
  expect(await serverRecord(request, campaignId)).toEqual(moved);
  expect(await campaignDateText(page)).toBe(localDate);
  expect(await storedMarker(page)).not.toBeNull();

  // Another reload decides the same way: the claim outlives it.
  await page.reload();
  await expect(conflict).toBeVisible({ timeout: 20_000 });
  expect(await campaignDateText(page)).toBe(localDate);

  // The explicit choice, and only then, discards the local day.
  await page.getByRole('button', { name: 'Use Server Version' }).click();
  await expect.poll(() => campaignDateText(page)).toBe(writerDate);
  await expect(conflict).toBeHidden();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(await storedMarker(page)).toBeNull();
  expect(await serverRecord(request, campaignId)).toEqual(moved);
});

test('S2 guard: a live stale tab that edits is refused by the version fence, and the server keeps the other writer @campaign', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Pending Write S2');
  const before = await serverRecord(request, campaignId);
  const writerDate = await moveServerOn(browser, baseURL, campaignId);
  const moved = await serverRecord(request, campaignId);
  expect(moved.version).toBe(before.version + 1);

  // The tab was never reloaded, so it still believes it holds `before`.
  const refused = waitForCampaignPut(page, campaignId);
  await advanceDayInUi(page);
  expect((await refused).status()).toBe(409);

  const generic = page.getByTestId('campaign-save-conflict');
  await expect(generic).toContainText('base-state-unavailable');
  await expect(generic).toContainText(`version ${moved.version}`);
  // The ordinary conflict card, not the reload one.
  await expect(
    page.getByTestId('campaign-pending-write-conflict'),
  ).toBeHidden();
  expect(await serverRecord(request, campaignId)).toEqual(moved);

  await page.getByRole('button', { name: 'Use Server Version' }).click();
  await expect.poll(() => campaignDateText(page)).toBe(writerDate);
  expect(await serverRecord(request, campaignId)).toEqual(moved);
  expect(await storedMarker(page)).toBeNull();
});

test('control: a reload with nothing pending sends no PUT and claims nothing @campaign', async ({
  page,
  request,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Pending Write Control');
  const before = await serverRecord(request, campaignId);
  expect(await storedMarker(page)).toBeNull();

  await page.reload();
  const puts = recordCampaignPuts(page, campaignId);
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  await letDebounceWindowClose();
  expect(puts).toHaveLength(0);
  expect(await serverRecord(request, campaignId)).toEqual(before);
  expect(await storedMarker(page)).toBeNull();
});
