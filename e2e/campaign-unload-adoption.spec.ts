/**
 * Real-server, same-context reload sweep. Nightly discovers this file; it is
 * intentionally absent from the explicit PR census. Expected runtime: 4–5 min.
 * The bare fetch-listener positive control must lose >= half its writes or the
 * run is INCONCLUSIVE. Browser request reports are never arrival evidence.
 * Tab-close control: campaign-crash-window-flush.spec.ts (unchanged).
 * @tags @campaign
 */
import { expect, test, type Page } from '@playwright/test';

import { seedSavedCampaign } from './helpers/campaignFlow';
import { startUnloadPositiveControl } from './helpers/unloadPositiveControl';

const OFFSETS_MS = [40, 1900, 2000] as const;
const MEASURED_PER_OFFSET = 10;
const MEASURED_TRIALS = OFFSETS_MS.length * MEASURED_PER_OFFSET;
const MIN_CONTROL_LOSSES = Math.ceil(MEASURED_TRIALS / 2);
const WARMUP_TRIALS = 2;
const OBSERVATION_MS = 3000;
const TIMING_KEY = 'campaign-unload-trial';

test.describe.configure({ timeout: 480_000, retries: 0 });
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

interface ReloadTiming {
  offsetMs: number;
  expectedDate: string | null;
  reloadCallMs: number;
  pagehideMs: number;
}

async function waitForCleanCampaign(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = (
      window as SweepWindow
    ).__ZUSTAND_STORES__?.campaignPersistence.getState();
    return state && !state.dirty && state.saveState === 'saved';
  });
  await expect(page.getByTestId('advance-day-btn')).toBeEnabled();
}

/**
 * Inspect the actual controller each trial, rather than infer it from a ready
 * registration. A controlled, unique no-store GET completes a worker fetch
 * dispatch before the edit; activated alone does not prove a worker is running.
 * Other requests keep the normal HTTP cache (no context.route/CDP overrides).
 */
async function probeController(page: Page, warmFetchPath: string) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  return page.evaluate(async (path) => {
    const snapshot = () => ({
      controlled: navigator.serviceWorker.controller !== null,
      scriptURL: navigator.serviceWorker.controller?.scriptURL ?? null,
      state: navigator.serviceWorker.controller?.state ?? null,
    });
    const beforeFetch = snapshot();
    const response = await fetch(path, { cache: 'no-store' });
    await response.text();
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      beforeFetch,
      afterFetch: snapshot(),
      warmFetchStatus: response.status,
      registrationScope: registration?.scope ?? null,
      activeScriptURL: registration?.active?.scriptURL ?? null,
      activeState: registration?.active?.state ?? null,
      installing: registration?.installing?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      visibilityState: document.visibilityState,
    };
  }, warmFetchPath);
}

type ControllerProbe = Awaited<ReturnType<typeof probeController>>;

/** One timer implementation for both arms; t0 is the mutation/arming task. */
async function reloadAtOffset(
  page: Page,
  offsetMs: number,
  controlTrial: string | null = null,
): Promise<ReloadTiming> {
  const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  const trigger = (async () => {
    await page.evaluate(
      ({ offsetMs, controlTrial, timingKey }) => {
        const start = (expectedDate: string | null) => {
          const t0 = performance.now();
          const timing: ReloadTiming = {
            offsetMs,
            expectedDate,
            reloadCallMs: 0,
            pagehideMs: 0,
          };
          const record = () =>
            sessionStorage.setItem(timingKey, JSON.stringify(timing));
          record();
          if (controlTrial) sessionStorage.setItem('armed-trial', controlTrial);
          window.addEventListener(
            'pagehide',
            () => {
              timing.pagehideMs = performance.now() - t0;
              record();
            },
            { once: true },
          );
          // Same 10 ms navigation lead as the original audit sweep. Busy wait
          // only the final slice; record actual call AND pagehide offsets.
          const target = t0 + offsetMs - 10;
          setTimeout(
            () => {
              while (performance.now() < target) {
                /* wait for the target offset */
              }
              timing.reloadCallMs = performance.now() - t0;
              record();
              window.location.reload();
            },
            Math.max(0, offsetMs - 40),
          );
        };
        if (controlTrial) {
          start(null);
          return;
        }
        const campaign = (window as SweepWindow).__ZUSTAND_STORES__?.campaign;
        if (!campaign) throw new Error('Campaign store is not exposed');
        const selected = campaign.getState().campaign;
        if (!selected) throw new Error('No campaign selected');
        const before = new Date(selected.currentDate).toISOString();
        const unsubscribe = campaign.subscribe((state) => {
          if (!state.campaign) return;
          const expectedDate = new Date(
            state.campaign.currentDate,
          ).toISOString();
          if (expectedDate === before) return;
          unsubscribe();
          start(expectedDate);
        });
      },
      { offsetMs, controlTrial, timingKey: TIMING_KEY },
    );
    if (!controlTrial) {
      await page.getByTestId('advance-day-btn').click({ noWaitAfter: true });
    }
  })();
  await Promise.all([navigation, trigger]);
  const timing = await page.evaluate(
    (key) =>
      JSON.parse(sessionStorage.getItem(key) ?? 'null') as ReloadTiming | null,
    TIMING_KEY,
  );
  if (!timing || !timing.pagehideMs)
    throw new Error('Missing reload/pagehide timing');
  return timing;
}

interface CampaignRecord {
  version: number;
  body: { currentDate: string };
}

interface Trial {
  trial: number;
  measured: boolean;
  offsetMs: number;
  campaignId: string;
  app: {
    controller: ControllerProbe;
    timing: ReloadTiming;
    before: CampaignRecord;
    after: CampaignRecord;
    delivered: boolean;
  };
  control: {
    controller: ControllerProbe;
    timing: ReloadTiming;
    arrivals: { trial: string; bytes: number }[];
    delivered: boolean;
  };
}

test('same-context reload sweep loses zero app writes with a losing positive control @campaign', async ({
  page,
  context,
  request,
  browser,
}, testInfo) => {
  const control = await startUnloadPositiveControl();
  const controlPage = await context.newPage();
  const trials: Trial[] = [];
  const campaignIds: string[] = [];
  const harnessErrors: string[] = [];
  const offsets = [
    ...Array<number>(WARMUP_TRIALS).fill(40),
    ...Array.from({ length: MEASURED_PER_OFFSET }, () => [
      ...OFFSETS_MS,
    ]).flat(),
  ];
  const readCampaign = async (id: string): Promise<CampaignRecord> => {
    const response = await request.get(`/api/campaigns/${id}`);
    expect(response.status()).toBe(200);
    const record = (await response.json()) as CampaignRecord;
    return {
      version: record.version,
      body: { currentDate: record.body.currentDate },
    };
  };
  const summarize = () => {
    const totals = OFFSETS_MS.map((offsetMs) => {
      const measured = trials.filter(
        (trial) => trial.measured && trial.offsetMs === offsetMs,
      );
      return {
        offsetMs,
        measured: measured.length,
        appLost: measured.filter((trial) => !trial.app.delivered).length,
        controlLost: measured.filter((trial) => !trial.control.delivered)
          .length,
      };
    });
    return {
      totals,
      measured: totals.reduce((sum, row) => sum + row.measured, 0),
      appLost: totals.reduce((sum, row) => sum + row.appLost, 0),
      controlLost: totals.reduce((sum, row) => sum + row.controlLost, 0),
    };
  };
  try {
    for (const [index, offsetMs] of offsets.entries()) {
      const trialId = `trial-${index + 1}`;
      // Reuse both pages AND their browser context across the whole sweep.
      // Every trial gets a fresh server row; warm-up does real edits/discards.
      const campaignId = await seedSavedCampaign(page, `Unload ${trialId}`);
      campaignIds.push(campaignId);
      await waitForCleanCampaign(page);
      await controlPage.goto(control.origin);
      const [appController, controlController] = await Promise.all([
        probeController(page, `/api/campaigns/${campaignId}?warm=${index}`),
        probeController(controlPage, `/warm-fetch?trial=${index}`),
      ]);
      for (const [arm, probe, script] of [
        ['app', appController, '/service-worker.js'],
        ['control', controlController, '/sw.js'],
      ] as const) {
        if (
          !probe.beforeFetch.controlled ||
          !probe.afterFetch.controlled ||
          !probe.afterFetch.scriptURL?.endsWith(script) ||
          probe.beforeFetch.scriptURL !== probe.afterFetch.scriptURL ||
          probe.afterFetch.state !== 'activated' ||
          probe.warmFetchStatus !== 200 ||
          probe.visibilityState !== 'visible'
        ) {
          harnessErrors.push(
            `${trialId} ${arm}: invalid controller/fetch/visibility probe`,
          );
        }
      }
      const before = await readCampaign(campaignId);
      const [appTiming, controlTiming] = await Promise.all([
        reloadAtOffset(page, offsetMs),
        reloadAtOffset(controlPage, offsetMs, trialId),
      ]);
      // Always observe the full interval, including on main where the row
      // stays stale. Never fail on the first loss and truncate the census.
      await page.waitForTimeout(OBSERVATION_MS);
      const after = await readCampaign(campaignId);
      const arrivals = control.arrivals.filter(
        (arrival) => arrival.trial === trialId,
      );
      for (const [arm, timing] of [
        ['app', appTiming],
        ['control', controlTiming],
      ] as const) {
        if (
          timing.reloadCallMs >= offsetMs + 100 ||
          timing.pagehideMs >= offsetMs + 150
        ) {
          harnessErrors.push(
            `${trialId} ${arm}: reload/pagehide exceeded timing tolerance`,
          );
        }
      }
      trials.push({
        trial: index + 1,
        measured: index >= WARMUP_TRIALS,
        offsetMs,
        campaignId,
        app: {
          controller: appController,
          timing: appTiming,
          before,
          after,
          delivered: after.body.currentDate === appTiming.expectedDate,
        },
        control: {
          controller: controlController,
          timing: controlTiming,
          arrivals,
          delivered: arrivals.length > 0,
        },
      });
    }
    const { measured, appLost, controlLost } = summarize();
    expect(measured, 'Incomplete same-context sweep').toBe(MEASURED_TRIALS);
    expect(
      controlLost,
      'INCONCLUSIVE: harness cannot detect the defect in this environment; positive control must lose at least half its measured writes',
    ).toBeGreaterThanOrEqual(MIN_CONTROL_LOSSES);
    expect(
      harnessErrors,
      'INCONCLUSIVE: invalid sweep preconditions/timing; inspect JSON',
    ).toEqual([]);
    expect(
      appLost,
      'App writes lost (post-fix requires zero); inspect per-offset loss counts in JSON',
    ).toBe(0);
  } finally {
    const { totals, measured, appLost, controlLost } = summarize();
    const verdict =
      measured !== MEASURED_TRIALS ||
      harnessErrors.length > 0 ||
      controlLost < MIN_CONTROL_LOSSES
        ? 'INCONCLUSIVE'
        : appLost > 0
          ? 'FAIL'
          : 'PASS';
    const summary = `[campaign-unload-sweep] ${verdict}: app lost ${appLost}/${measured}; control lost ${controlLost}/${measured}; discarded ${trials.filter((trial) => !trial.measured).length} warm-up pairs; offsets=${JSON.stringify(totals)}`;
    process.stdout.write(`${summary}\n`);
    await testInfo.attach('same-context-unload-sweep', {
      contentType: 'application/json',
      body: JSON.stringify(
        {
          summary,
          verdict,
          browserVersion: browser.version(),
          warmupTrials: WARMUP_TRIALS,
          measuredPerOffset: MEASURED_PER_OFFSET,
          observationMs: OBSERVATION_MS,
          controlOrigin: control.origin,
          totals,
          harnessErrors,
          trials,
        },
        null,
        2,
      ),
    });
    // Close selected documents before deletion: a teardown flush must not
    // recreate a row. Keep every row until all measurements have finished.
    try {
      await page.close({ runBeforeUnload: true });
      await controlPage.close({ runBeforeUnload: true });
      for (const id of campaignIds)
        await request.delete(`/api/campaigns/${id}`);
    } finally {
      await control.close();
    }
  }
});

test('warm reload with nothing pending sends zero PUTs @campaign', async ({
  page,
  context,
  request,
}) => {
  const campaignId = await seedSavedCampaign(page, 'Unload clean control');
  try {
    await waitForCleanCampaign(page);
    await probeController(page, `/api/campaigns/${campaignId}?warm=clean`);
    const puts: string[] = [];
    context.on('request', (req) => {
      if (
        req.method() === 'PUT' &&
        new URL(req.url()).pathname === `/api/campaigns/${campaignId}`
      )
        puts.push(req.url());
    });
    await page.reload();
    await waitForCleanCampaign(page);
    // Absence-of-dispatch control only; delivery is measured server-side above.
    await page.waitForTimeout(2500);
    expect(puts).toEqual([]);
  } finally {
    await page.close({ runBeforeUnload: true });
    await request.delete(`/api/campaigns/${campaignId}`);
  }
});
