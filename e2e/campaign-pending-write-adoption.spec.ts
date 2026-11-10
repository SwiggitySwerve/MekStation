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
 * The original four cases block service workers. The warm-worker cases below
 * disconnect only during discard, then load online to recover the lost write.
 *
 * MOCK MODE (for mock-mode-auditor): `hybrid`.
 *   Real: the production build, its API routes and the SQLite store; every
 *     assertion reads the real server record or the real UI. The second writer
 *     is a real second browser context driving the real UI.
 *   Faulted: the original SW-blocked cases route the campaign PUT through
 *     `injectPutFault`. The warm-worker cases take the context offline only
 *     while discarding to about:blank; the application then loads online.
 *     Offline affects that old context's network, not only its campaign PUT.
 *     No response is fabricated. Server assertions use the independent API
 *     request fixture, outside the browser context's offline emulation.
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

import { isJsonRecord, putBaseVersion } from './helpers/browserWriteComparison';
import {
  advanceDayInUi,
  campaignDateText,
  openDashboard,
  seedSavedCampaign,
} from './helpers/campaignFlow';
import {
  enqueueUnloadOutcome,
  probeController,
  waitForCleanCampaign,
  type SweepWindow,
} from './helpers/campaignUnload';
import {
  captureCampaignPuts,
  readCampaignRecord,
  readCapturedPuts,
  resetCapturedPuts,
  type CampaignRecord,
} from './helpers/unloadFlushEvidence';

// The original four cases isolate adoption from service-worker behavior.
// The nested warm-worker group explicitly overrides this setting.
test.use({ serviceWorkers: 'block' });
test.describe.configure({ timeout: 150_000 });

async function serverRecord(
  api: APIRequestContext,
  campaignId: string,
): Promise<CampaignRecord> {
  const response = await api.get(`/api/campaigns/${campaignId}`);
  try {
    expect(response.status()).toBe(200);
    return readCampaignRecord(await response.json());
  } finally {
    await response.dispose();
  }
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

/** Both states intentionally appear in navigation; Saved and Idle do not. */
async function expectSaveLabelAgreement(
  page: Page,
  label: 'Save failed' | 'Conflict',
): Promise<void> {
  const cardLabel = page
    .getByTestId('campaign-save-status-card')
    .getByText(label, { exact: true });
  const navigation = page.getByRole('link', { name: /^Campaign save:/ });
  await expect(cardLabel).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveAccessibleName(
    new RegExp(`^Campaign save: ${label}[.] .*View save details[.]$`),
  );
  await expect(navigation.getByText(label, { exact: true })).toHaveText(
    await cardLabel.innerText(),
  );
}

interface PutFault {
  /** `pass` lets PUTs through; `abort` drops them; `hold` delays until release. */
  mode: 'pass' | 'abort' | 'hold';
  /** PUTs dropped so far: evidence the fault was real, not assumed. */
  aborted: number;
  /** PUTs that arrived during a hold: proof a document pushed on its own. */
  held: number;
  /** End a hold: held PUTs continue and later ones pass. */
  release: () => void;
}

/**
 * fault-injection: the browser -> server PUT of one campaign. Aborted to model
 * a network drop (the same state a crash or a refused flush leaves), or held to
 * make a transient state observable and countable. Everything else reaches the
 * real server.
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
    held: 0,
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
      if (fault.mode === 'hold') {
        fault.held += 1;
        await gate;
      }
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
  await expect(
    page.getByTestId('campaign-save-status-card').getByText('Save failed'),
  ).toBeVisible();
  await expectSaveLabelAgreement(page, 'Save failed');
  expect((await serverRecord(request, campaignId)).version).toBe(
    before.version,
  );

  // Reload while the fault is still on, so nothing of the first document's can
  // reach the server (its unload flush is dropped too). The new document's push
  // is due 2 s after it adopts the copy, so switching to `hold` the moment the
  // load event fires is well inside that window.
  await page.reload();
  fault.mode = 'hold';
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  expect(
    (await serverRecord(request, campaignId)).version,
    'premise: the first document must not have written',
  ).toBe(before.version);

  // The new document found a copy newer than the server's and, with no click
  // and no further edit, tries to push it. Held there, so the state is
  // observable instead of racing the server: not Saved, local day kept, claim
  // still on the copy, server untouched.
  await expect.poll(() => fault.held, { timeout: 20_000 }).toBe(1);
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Saved', { exact: true }),
  ).toBeHidden();
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
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Saved', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Recovered unsaved changes'),
  ).toBeHidden();
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
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Conflict', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Saved', { exact: true }),
  ).toBeHidden();
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
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Saved', { exact: true }),
  ).toBeVisible();
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
  await expectSaveLabelAgreement(page, 'Conflict');
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
  await expect(
    page
      .getByTestId('campaign-save-status-card')
      .getByText('Saved', { exact: true }),
  ).toBeVisible();

  await letDebounceWindowClose();
  expect(puts).toHaveLength(0);
  expect(await serverRecord(request, campaignId)).toEqual(before);
  expect(await storedMarker(page)).toBeNull();
});

test.describe('browser cases standing in for engines without static routing', () => {
  test.use({ serviceWorkers: 'allow' });

  for (const mutation of ['date', 'battle outcome'] as const) {
    test(`warm service worker: a lost unload ${mutation} is adopted exactly once on reload @campaign`, async ({
      page,
      context,
      request,
    }, testInfo) => {
      await captureCampaignPuts(page);
      const campaignId = await seedSavedCampaign(
        page,
        `Lost unload ${mutation}`,
      );
      // All campaign PUT responses, without filtering keepalive or status.
      // The lost unload is evidenced by page-side capture and the server row;
      // neither request routing nor an unload request event is a premise.
      const putResponses: { postData: string | null; status: number }[] = [];
      context.on('response', (response) => {
        if (
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname === `/api/campaigns/${campaignId}`
        ) {
          putResponses.push({
            postData: response.request().postData(),
            status: response.status(),
          });
        }
      });
      try {
        await waitForCleanCampaign(page);
        const controller = await probeController(
          page,
          `/api/campaigns/${campaignId}?warm=${Date.now()}`,
        );
        expect(controller.beforeFetch.controlled).toBe(true);
        expect(controller.afterFetch).toEqual(controller.beforeFetch);
        expect(controller.afterFetch.state).toBe('activated');
        expect(controller.afterFetch.scriptURL).toMatch(
          /\/service-worker\.js$/,
        );
        expect(controller.warmFetchStatus).toBe(200);
        expect(controller.activeState).toBe('activated');
        expect(controller.activeScriptURL).toBe(
          controller.afterFetch.scriptURL,
        );
        expect(controller.visibilityState).toBe('visible');

        const before = await serverRecord(request, campaignId);
        expect(before.body.pendingBattleOutcomes ?? []).toEqual([]);
        const matchId =
          mutation === 'battle outcome' ? `lost-unload-${campaignId}` : null;
        await resetCapturedPuts(page);
        // This timestamp precedes the edit, so the <2 s discard assertion below
        // is a conservative bound that also includes the action/driver latency.
        const armedEpochMs = await page.evaluate(
          () => performance.timeOrigin + performance.now(),
        );
        if (matchId) await enqueueUnloadOutcome(page, matchId);
        else await advanceDayInUi(page);
        const expectedDate = await page.evaluate(() => {
          const selected = (
            window as SweepWindow
          ).__ZUSTAND_STORES__?.campaign.getState().campaign;
          if (!selected) throw new Error('No campaign selected');
          return new Date(selected.currentDate).toISOString();
        });
        expect(await storedMarker(page)).toMatchObject({
          campaignId,
          baseVersion: before.version,
        });
        expect(await readCapturedPuts(page)).toHaveLength(0);

        // Isolate the network loss to the old document's discard. about:blank
        // needs no network and cannot boot an offline/cached application copy.
        await context.setOffline(true);
        await page.goto('about:blank');
        const afterLostUnload = await serverRecord(request, campaignId);
        expect(afterLostUnload).toEqual(before);
        expect(putResponses).toEqual([]);
        if (mutation === 'date') {
          expect(expectedDate).not.toBe(before.body.currentDate);
          expect(afterLostUnload.body.currentDate).not.toBe(expectedDate);
        }

        // Only the next online application document can adopt and save. No
        // further edit, routing fault, held PUT, or offline reload is involved.
        await context.setOffline(false);
        await openDashboard(page, campaignId);
        const lost = (await readCapturedPuts(page))[0];
        expect(lost).toBeDefined();
        expect(lost.keepalive).toBe(true);
        expect(lost.controller).toBe(controller.afterFetch.scriptURL);
        expect(lost.lifecycle).not.toBe('document-active');
        expect(lost.issueEpochMs).toBeGreaterThanOrEqual(armedEpochMs);
        expect(lost.issueEpochMs).toBeLessThan(armedEpochMs + 2000);
        expect(putBaseVersion(lost.postData)).toBe(before.version);
        const lostPayload: unknown = JSON.parse(lost.postData ?? 'null');
        if (!isJsonRecord(lostPayload)) throw new Error('Unreadable lost PUT');
        const lostEnvelope = readCampaignRecord(lostPayload.envelope);
        expect(lostEnvelope.body.currentDate).toBe(expectedDate);
        expect(lostEnvelope.body.processedBattleIds).toEqual(
          before.body.processedBattleIds,
        );
        if (matchId) {
          expect(lostEnvelope.body.pendingBattleOutcomes).toEqual([
            expect.objectContaining({ matchId }),
          ]);
        }
        await testInfo.attach('offline-unload-before-adoption', {
          body: JSON.stringify(
            {
              controller,
              armedEpochMs,
              expectedDate,
              matchId,
              before,
              afterLostUnload,
              lost,
            },
            null,
            2,
          ),
          contentType: 'application/json',
        });

        await expect
          .poll(() => putResponses.length, { timeout: 30_000 })
          .toBe(1);
        expect(putResponses[0].status).toBe(200);
        expect(putBaseVersion(putResponses[0].postData)).toBe(before.version);
        await waitForCleanCampaign(page);
        const saveCard = page.getByTestId('campaign-save-status-card');
        await expect(
          saveCard.getByText('Saved', { exact: true }),
        ).toBeVisible();
        expect(await storedMarker(page)).toBeNull();

        // Count every page-issued PUT, including keepalive. Observe another
        // complete debounce window before excluding a duplicate adoption.
        await letDebounceWindowClose();
        const puts = await readCapturedPuts(page);
        expect(puts).toHaveLength(2);
        expect(puts.map((put) => put.keepalive)).toEqual([true, false]);
        expect(puts[1].documentOriginMs).toBeGreaterThan(armedEpochMs);
        expect(puts[1].postData).toBe(putResponses[0].postData);
        expect(putBaseVersion(puts[1].postData)).toBe(before.version);
        expect(putResponses).toHaveLength(1);
        const after = await serverRecord(request, campaignId);
        expect(after.version).toBe(before.version + 1);
        expect(after.body.currentDate).toBe(expectedDate);
        expect(after.body.processedBattleIds).toEqual(
          before.body.processedBattleIds,
        );
        if (matchId) {
          expect(after.body.pendingBattleOutcomes).toEqual([
            expect.objectContaining({ matchId }),
          ]);
        }
        await testInfo.attach('warm-worker-offline-unload-adoption', {
          body: JSON.stringify(
            {
              controller,
              armedEpochMs,
              expectedDate,
              matchId,
              before,
              afterLostUnload,
              after,
              puts,
              putResponses,
            },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      } finally {
        await context.setOffline(false);
        await page.close();
        const deleted = await request.delete(`/api/campaigns/${campaignId}`);
        expect(deleted.ok()).toBe(true);
        await deleted.dispose();
      }
    });
  }
});
