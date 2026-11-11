/**
 * Discard-time campaign flush — cold-reload browser proof (task 1.6 P-A of
 * `design-campaign-authority-and-sync`, shipped in #1694).
 *
 * The jsdom suite (`campaignPersistenceCrashWindow.test.ts`) proves the
 * listeners fire and shape the request correctly against a mocked `fetch`.
 * It cannot prove that request SURVIVES a real document discard and reaches
 * the server, which is the entire point of `keepalive`. This spec proves it
 * against a production build and the real SQLite route: it reads the server
 * record back, then reloads with `localStorage` cleared at document start,
 * so only the server can supply the rendered date. The discard it uses is
 * a closed tab, for the measured reason recorded above that test.
 *
 * LIMIT: `keepalive` is not directly observable from Playwright — the flag
 * lives on the `RequestInit`, never on the wire, and `request.headers()`
 * does not carry it. The discriminating evidence is that nothing has been
 * PUT when the discard happens, the revision the server lands on, and the
 * red arm below, which drops the two registrations the fix makes, discards
 * the same way, and shows the mutation is then lost.
 *
 * @tags @campaign @strict
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

import {
  formatBrowserDiagnosticEvents,
  installBrowserDiagnostics,
  isFatalBrowserDiagnosticEvent,
  type BrowserDiagnosticEvent,
} from './helpers';
import {
  advanceDayInUi,
  campaignDateText,
  openDashboard,
  seedSavedCampaign,
} from './helpers/campaignFlow';

// File-scope `test.setTimeout` is a no-op — it changes "the currently
// running test", and at import time there is none. `describe.configure`
// is the form that applies to every test in the file.
test.describe.configure({ timeout: 150_000 });

/**
 * Status of the reconciliation PUT after a flush the document survived.
 *
 * The flush still does not advance `baseVersion` — it never reads its
 * response, so it cannot. The returning document EARNS the revision
 * instead, by reading the record back and checking it is the one this
 * client wrote; only then is the ordinary save armed, and it carries the
 * earned token. Pinned rather than accepted loosely: the spec scenario
 * claims an "ordinary acknowledged save", and 200 is the whole of that
 * claim holding in a real browser. This measured 409 before the
 * reconciliation read existed.
 */
const RECONCILE_PUT_STATUS = 200;

interface CampaignRecord {
  readonly version: number;
  readonly body: { readonly currentDate: string };
}

/**
 * Pre-existing noise this spec observes rather than introduces: the
 * equipment catalogue loader reports an ABORTED static read as "missing,
 * unreadable, or malformed", so any navigation within about a second of a
 * campaign page load logs a console error that has nothing to do with
 * campaign persistence. Allowed by its exact source, never by widening the
 * gate — anything else from the app still fails the test.
 */
function isAbortedEquipmentRead(event: BrowserDiagnosticEvent): boolean {
  return event.type === 'console'
    ? event.text.startsWith('[EquipmentOfficialLoader]')
    : event.type === 'requestfailed' && event.url.includes('/data/equipment/');
}

/**
 * The sibling diagnostics gate, scoped to the measured window (seeding runs
 * before it) and minus one event the discard case EXPECTS: a keepalive PUT
 * issued as the document goes away is reported `net::ERR_ABORTED` even when
 * it lands. The gate's "an aborted API write is silent data loss" rule is
 * right in general; here the landing is proven by the server record and the
 * cold reload instead, so that event is the evidence, not a failure.
 */
async function withGate(
  page: Page,
  testInfo: TestInfo,
  allowDiscardedPut: boolean,
  run: () => Promise<void>,
): Promise<void> {
  const diagnostics = installBrowserDiagnostics(page);
  try {
    await run();
    const fatal = diagnostics.events.filter(
      (event) =>
        isFatalBrowserDiagnosticEvent(event) &&
        !isAbortedEquipmentRead(event) &&
        !(
          allowDiscardedPut &&
          event.type === 'requestfailed' &&
          event.method === 'PUT'
        ),
    );
    expect(fatal, formatBrowserDiagnosticEvents(diagnostics.events)).toEqual(
      [],
    );
  } finally {
    await diagnostics.attach(testInfo);
    diagnostics.dispose();
  }
}

/** Timestamp every campaign PUT the page issues, in order. */
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
 * The unauthenticated server-authority read for one campaign. Takes a
 * request context rather than a page because the discard case reads the
 * record after its page is gone.
 */
async function serverRecord(
  api: APIRequestContext,
  campaignId: string,
): Promise<CampaignRecord> {
  const response = await api.get(`/api/campaigns/${campaignId}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as CampaignRecord;
}

/** Wait for the next campaign PUT response. */
function waitForCampaignPut(page: Page, campaignId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`/api/campaigns/${campaignId}`),
    { timeout: 30_000 },
  );
}

/**
 * Drive `document.visibilityState` the way a tab switch does. It is not
 * settable, so it is redefined on the instance before the event is sent.
 */
async function setDocumentVisibility(
  page: Page,
  state: 'hidden' | 'visible',
): Promise<void> {
  await page.evaluate((visibility: string) => {
    const get = (value: unknown) => ({ configurable: true, get: () => value });
    Object.defineProperty(document, 'visibilityState', get(visibility));
    Object.defineProperty(document, 'hidden', get(visibility === 'hidden'));
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

/**
 * This control closes the tab. The earlier navigation-loss diagnosis was
 * incomplete: the app origin had a service worker with a fetch listener.
 * In warm Chromium contexts that worker dispatch loses pagehide keepalive
 * writes when the document is replaced. A bare page without a worker
 * delivered 80/80; with a fetch-listener worker it delivered 0/80; a worker
 * without a listener delivered 20/20. Tab close remained green. See
 * campaign-save-loss/PR1-BODY.md for the original evidence paths.
 * The warm reload sweep is now in campaign-unload-adoption.spec.ts.
 *
 * Consequence for the assertions: a request issued as the page closes is
 * not reported to Playwright at all (measured: zero `request` events, at
 * page AND context level), so "exactly one PUT" cannot be counted here. It
 * is owned by the jsdom suite, which counts requests against a mocked
 * fetch. What this spec still pins is stronger than a count: the record
 * moves to EXACTLY `before.version + 1`, which no second accepted write
 * could produce, and the red arm below shows zero movement without the
 * listeners.
 */
test('a discarded document flushes its pending mutation and the cold reload reads it back @campaign', async ({
  page,
  request,
}, testInfo) => {
  const campaignId = await seedSavedCampaign(page, 'Crash Window Flush');
  const context = page.context();
  let mutatedDate = '';
  await withGate(page, testInfo, true, async () => {
    const before = await serverRecord(request, campaignId);
    const puts = recordCampaignPuts(page, campaignId);
    mutatedDate = await advanceDayInUi(page);
    // Inside the 2 s debounce: nothing has been PUT, so the only write that
    // can reach the server is the one the discard path issues.
    expect(puts).toHaveLength(0);
    // The discard. `runBeforeUnload` so the page's own unload handlers run.
    await page.close({ runBeforeUnload: true });
    await expect
      .poll(async () => (await serverRecord(request, campaignId)).version, {
        timeout: 20_000,
      })
      .toBe(before.version + 1);
    expect((await serverRecord(request, campaignId)).body.currentDate).not.toBe(
      before.body.currentDate,
    );
  });
  // Cold reload in a NEW document with the client cache dropped at document
  // start: the rendered date can only come from the record the flush wrote.
  // Gated in its own right, so closing the first page does not buy the
  // reopened one an unwatched console.
  await context.addInitScript(() => localStorage.clear());
  const reopened = await context.newPage();
  await withGate(reopened, testInfo, false, async () => {
    await openDashboard(reopened, campaignId);
    expect(await campaignDateText(reopened)).toBe(mutatedDate);
  });
});

test('a surviving document takes the ordinary debounced save, exactly once @campaign', async ({
  page,
}, testInfo) => {
  const campaignId = await seedSavedCampaign(page, 'Crash Window Control');
  await withGate(page, testInfo, false, async () => {
    const before = await serverRecord(page.request, campaignId);
    const puts = recordCampaignPuts(page, campaignId);
    const mutatedAt = Date.now();
    await advanceDayInUi(page);
    const saved = await waitForCampaignPut(page, campaignId);
    expect(saved.status()).toBe(200);
    // Arrived on the debounce, not on a discard: no document went away here.
    expect(Date.now() - mutatedAt).toBeGreaterThan(1_000);
    expect(puts).toHaveLength(1);
    const after = await serverRecord(page.request, campaignId);
    expect(after.version).toBe(before.version + 1);
    expect(after.body.currentDate).not.toBe(before.body.currentDate);
    // The ordinary save IS an acknowledgement; the flush deliberately is not.
    await expect(
      page
        .getByTestId('campaign-save-status-card')
        .getByText('Unsaved changes'),
    ).toBeHidden();
  });
});

test('a hidden transition flushes without acknowledging, and returning re-arms a save @campaign', async ({
  page,
}, testInfo) => {
  const campaignId = await seedSavedCampaign(page, 'Crash Window Hidden');
  await withGate(page, testInfo, false, async () => {
    const before = await serverRecord(page.request, campaignId);
    const puts = recordCampaignPuts(page, campaignId);
    await advanceDayInUi(page);
    await setDocumentVisibility(page, 'hidden');
    await expect.poll(() => puts.length, { timeout: 10_000 }).toBe(1);
    await expect
      .poll(
        async () => (await serverRecord(page.request, campaignId)).version,
        {
          timeout: 20_000,
        },
      )
      .toBe(before.version + 1);
    // Its response is never read, so it never cleared the pending mutations.
    await expect(
      page
        .getByTestId('campaign-save-status-card')
        .getByText('Unsaved changes'),
    ).toBeVisible();
    await setDocumentVisibility(page, 'visible');
    const reconciled = await waitForCampaignPut(page, campaignId);
    expect(puts.length).toBeGreaterThanOrEqual(2);
    testInfo.annotations.push({
      type: 'reconcile-put-status',
      description: String(reconciled.status()),
    });
    expect(reconciled.status()).toBe(RECONCILE_PUT_STATUS);
    // The acknowledgement the spec scenario demands: an accepted save, not
    // a conflict banner produced by the flush's own successful write.
    await expect(
      page
        .getByTestId('campaign-save-status-card')
        .getByText('Unsaved changes'),
    ).toBeHidden();
    await expect(page.getByText('Save refused')).toBeHidden();
  });
});

test('RED ARM: without the discard listeners the same mutation never reaches the server @campaign', async ({
  page,
  request,
}, testInfo) => {
  const campaignId = await seedSavedCampaign(page, 'Crash Window Red Arm');
  // Drop exactly the two registrations `campaignPersistenceWiring` makes for
  // the fix, and nothing else. Applies from the next navigation onward.
  await page.addInitScript(() => {
    const drop = (
      target: EventTarget,
      blocked: string,
    ): EventTarget['addEventListener'] => {
      const original = target.addEventListener.bind(target);
      return (type, listener, options) => {
        if (type !== blocked) original(type, listener, options);
      };
    };
    window.addEventListener = drop(window, 'pagehide');
    document.addEventListener = drop(document, 'visibilitychange');
  });
  await openDashboard(page, campaignId);
  await withGate(page, testInfo, false, async () => {
    const before = await serverRecord(request, campaignId);
    const puts = recordCampaignPuts(page, campaignId);
    await advanceDayInUi(page);
    // The SAME discard the positive case uses. A red arm that discarded a
    // different way would only prove that other way loses the mutation, and
    // the pair would stop discriminating.
    await page.close({ runBeforeUnload: true });
    // Proving absence needs the 2 s debounce window to have closed.
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    const after = await serverRecord(request, campaignId);
    expect(after.version).toBe(before.version);
    expect(after.body.currentDate).toBe(before.body.currentDate);
    expect(puts).toHaveLength(0);
  });
});
