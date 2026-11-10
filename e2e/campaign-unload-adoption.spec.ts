/**
 * Real-server, same-context reload sweep. Nightly discovers this file; it is
 * intentionally absent from the explicit PR census. Default proof: 100 measured
 * pairs PER mutation (date and battle outcome), estimated 24-34 min total
 * (unmeasured here). Samples below 100 per mutation are
 * INCONCLUSIVE. Delivery requires observation or an unbroken captured CAS chain.
 * The bare fetch-listener positive control must lose >= half its writes or the
 * run is INCONCLUSIVE. Browser request reports are never arrival evidence.
 * Tab-close control: campaign-crash-window-flush.spec.ts (unchanged).
 * @tags @campaign
 */
import { expect, test } from '@playwright/test';

import { isJsonRecord } from './helpers/browserWriteComparison';
import { seedSavedCampaign } from './helpers/campaignFlow';
import {
  probeController,
  reloadAtOffset,
  waitForCleanCampaign,
  type ControllerProbe,
  type ReloadTiming,
} from './helpers/campaignUnload';
import {
  classifyUnloadDelivery,
  type CampaignPollTrace,
  type ContextCampaignWrite,
} from './helpers/unloadDelivery';
import {
  assessFlushAcceptance,
  captureCampaignPuts,
  readCampaignRecord,
  readCapturedPuts,
  resetCapturedPuts,
  type CampaignRecord,
  type CapturedCampaignPut,
} from './helpers/unloadFlushEvidence';
import {
  captureContextCampaignWrites,
  startCampaignPoll,
} from './helpers/unloadObservation';
import { startUnloadPositiveControl } from './helpers/unloadPositiveControl';

const OFFSETS_MS = [40, 100, 250, 500, 1000, 1500, 1900, 2000] as const;
const MEASURED_TRIALS = Number(process.env.MEKSTATION_UNLOAD_TRIALS ?? '100');
if (!Number.isSafeInteger(MEASURED_TRIALS) || MEASURED_TRIALS < 1) {
  throw new Error('MEKSTATION_UNLOAD_TRIALS must be a positive safe integer');
}
const MIN_CONTROL_LOSSES = Math.ceil(MEASURED_TRIALS / 2);
const WARMUP_TRIALS = 2;
const OBSERVATION_MS = 3000;

test.describe.configure({
  timeout: 60_000 + MEASURED_TRIALS * 15_000,
  retries: 0,
});
test.use({ serviceWorkers: 'allow' });

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
    puts: CapturedCampaignPut[];
    contextWrites: ContextCampaignWrite[];
    workerTraffic: ReturnType<
      typeof captureContextCampaignWrites
    >['workerTraffic'];
    poll: CampaignPollTrace;
    delivery: ReturnType<typeof classifyUnloadDelivery>;
    flushAcceptance: ReturnType<typeof assessFlushAcceptance>;
    valuesPresent: boolean;
  };
  control: {
    controller: ControllerProbe;
    timing: ReloadTiming;
    arrivals: { trial: string; bytes: number }[];
    delivered: boolean;
  };
}

for (const mutation of ['date', 'battle-outcome'] as const) {
  test(`${mutation} same-context reload sweep loses zero app writes with a losing positive control @campaign`, async ({
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
    const startedAt = performance.now();
    const contextCapture = captureContextCampaignWrites(context);
    let activePoll: Awaited<ReturnType<typeof startCampaignPoll>> | undefined;
    const offsets = [
      ...Array<number>(WARMUP_TRIALS).fill(40),
      ...Array.from(
        { length: MEASURED_TRIALS },
        (_, index) => OFFSETS_MS[index % OFFSETS_MS.length],
      ),
    ];
    const readCampaign = async (id: string): Promise<CampaignRecord> => {
      const response = await request.get(`/api/campaigns/${id}`, {
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        maxRedirects: 0,
        timeout: 5000,
      });
      try {
        expect(response.status()).toBe(200);
        return readCampaignRecord(await response.json());
      } finally {
        await response.dispose();
      }
    };
    const summarize = () => {
      const totals = OFFSETS_MS.map((offsetMs) => {
        const measured = trials.filter(
          (trial) => trial.measured && trial.offsetMs === offsetMs,
        );
        return {
          offsetMs,
          measured: measured.length,
          appLost: measured.filter(
            (trial) =>
              trial.app.delivery.class === 'undelivered' ||
              trial.app.delivery.class === 'unattributable',
          ).length,
          flushAccepted: measured.filter((trial) =>
            trial.app.delivery.class.startsWith('delivered-'),
          ).length,
          deliveredObserved: measured.filter(
            (trial) => trial.app.delivery.class === 'delivered-observed',
          ).length,
          deliveredByChain: measured.filter(
            (trial) => trial.app.delivery.class === 'delivered-by-chain',
          ).length,
          undelivered: measured.filter(
            (trial) => trial.app.delivery.class === 'undelivered',
          ).length,
          unattributable: measured.filter(
            (trial) => trial.app.delivery.class === 'unattributable',
          ).length,
          ineligible: measured.filter((trial) => !trial.app.delivery.eligible)
            .length,
          valuesPresent: measured.filter((trial) => trial.app.valuesPresent)
            .length,
          valuesLost: measured.filter((trial) => !trial.app.valuesPresent)
            .length,
          controlLost: measured.filter((trial) => !trial.control.delivered)
            .length,
        };
      });
      const measured = totals.reduce((sum, row) => sum + row.measured, 0);
      const controlLost = totals.reduce((sum, row) => sum + row.controlLost, 0);
      return {
        totals,
        deliveredObserved: totals.reduce(
          (sum, row) => sum + row.deliveredObserved,
          0,
        ),
        deliveredByChain: totals.reduce(
          (sum, row) => sum + row.deliveredByChain,
          0,
        ),
        undelivered: totals.reduce((sum, row) => sum + row.undelivered, 0),
        unattributable: totals.reduce(
          (sum, row) => sum + row.unattributable,
          0,
        ),
        ineligible: totals.reduce((sum, row) => sum + row.ineligible, 0),
        measured,
        appLost: totals.reduce((sum, row) => sum + row.appLost, 0),
        flushAccepted: totals.reduce((sum, row) => sum + row.flushAccepted, 0),
        valuesPresent: totals.reduce((sum, row) => sum + row.valuesPresent, 0),
        valuesLost: totals.reduce((sum, row) => sum + row.valuesLost, 0),
        controlLost,
        controlLossRate: measured === 0 ? null : controlLost / measured,
      };
    };
    try {
      await captureCampaignPuts(page);
      for (const [index, offsetMs] of offsets.entries()) {
        const trialId = `${mutation}-trial-${index + 1}`;
        // Reuse both pages AND their browser context across the whole sweep.
        // Every trial gets a fresh server row; warm-up does real edits/discards.
        const campaignId = await seedSavedCampaign(page, `Unload ${trialId}`);
        campaignIds.push(campaignId);
        await waitForCleanCampaign(page);
        await controlPage.goto(control.origin);
        const workerTrafficStart = contextCapture.workerTraffic.length;
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
        const warmWorkerObserved = contextCapture.workerTraffic
          .slice(workerTrafficStart)
          .some(
            (entry) =>
              new URL(entry.url).pathname === `/api/campaigns/${campaignId}` &&
              new URL(entry.url).searchParams.get('warm') === String(index),
          );
        if (!warmWorkerObserved)
          harnessErrors.push(
            `${trialId}: warm SW-owned GET not visible in context events`,
          );
        const before = await readCampaign(campaignId);
        await resetCapturedPuts(page);
        const contextStart = contextCapture.writes.length;
        // Begin polling OUTSIDE the page worker before reload() can be called.
        activePoll = await startCampaignPoll(() => readCampaign(campaignId));
        const [appTiming, controlTiming] = await Promise.all([
          reloadAtOffset(
            page,
            offsetMs,
            null,
            mutation === 'battle-outcome' ? `unload-match-${campaignId}` : null,
          ),
          reloadAtOffset(controlPage, offsetMs, trialId),
        ]);
        // Always observe the full interval, including on main where the row
        // stays stale. Never fail on the first loss and truncate the census.
        await page.waitForTimeout(OBSERVATION_MS);
        const after = await readCampaign(campaignId);
        const poll = await activePoll.stop();
        activePoll = undefined;
        const puts = (await readCapturedPuts(page)).filter(
          (put) => new URL(put.url).pathname === `/api/campaigns/${campaignId}`,
        );
        const flushAcceptance = assessFlushAcceptance(puts, before, after);
        const contextWrites = contextCapture.writes
          .slice(contextStart)
          .filter(
            (write) =>
              new URL(write.url).pathname === `/api/campaigns/${campaignId}`,
          );
        const valuesPresent = appTiming.expectedMatchId
          ? Array.isArray(after.body.pendingBattleOutcomes) &&
            after.body.pendingBattleOutcomes.some(
              (outcome: unknown) =>
                isJsonRecord(outcome) &&
                outcome.matchId === appTiming.expectedMatchId,
            )
          : after.body.currentDate === appTiming.expectedDate;
        const delivery = classifyUnloadDelivery({
          puts,
          before,
          after,
          valuesPresent,
          poll,
          contextWrites,
          captureAvailable: contextCapture.available && warmWorkerObserved,
        });
        if (!delivery.eligible)
          harnessErrors.push(`${trialId}: invalid poll/context capture`);
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
            puts,
            contextWrites,
            workerTraffic:
              contextCapture.workerTraffic.slice(workerTrafficStart),
            poll,
            delivery,
            flushAcceptance,
            valuesPresent,
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
      expect(measured, 'INCONCLUSIVE: incomplete same-context sweep').toBe(
        MEASURED_TRIALS,
      );
      expect(
        measured,
        'INCONCLUSIVE: proof requires at least 100 measured trials',
      ).toBeGreaterThanOrEqual(100);
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
        'Requires undelivered = 0 AND unattributable = 0; inspect observed vs by-chain and poll trace per delay',
      ).toBe(0);
    } catch (error) {
      if (trials.filter((trial) => trial.measured).length !== MEASURED_TRIALS)
        harnessErrors.push(
          `Incomplete trial: ${error instanceof Error ? error.message : String(error)}`,
        );
      throw error;
    } finally {
      const incompletePoll = activePoll ? await activePoll.stop() : null;
      contextCapture.stop();
      const counts = summarize();
      const {
        totals,
        measured,
        appLost,
        controlLost,
        flushAccepted,
        valuesPresent,
        valuesLost,
        controlLossRate,
      } = counts;
      const verdict =
        measured !== MEASURED_TRIALS ||
        measured < 100 ||
        harnessErrors.length > 0 ||
        controlLost < MIN_CONTROL_LOSSES
          ? 'INCONCLUSIVE'
          : appLost > 0
            ? 'FAIL'
            : 'PASS';
      const elapsedMs = performance.now() - startedAt;
      const proofSide =
        process.env.MEKSTATION_UNLOAD_PROOF_SIDE ?? 'unspecified';
      const summary = `[campaign-unload-sweep] ${proofSide} ${mutation} ${verdict}: app trials ${measured}, undelivered ${counts.undelivered}, unattributable ${counts.unattributable}, delivered-observed ${counts.deliveredObserved}, delivered-by-chain ${counts.deliveredByChain}, total delivered ${flushAccepted}, values present ${valuesPresent}, values lost ${valuesLost}; control trials ${measured}, losses ${controlLost}, loss rate ${controlLossRate}; discarded ${trials.filter((trial) => !trial.measured).length} warm-up pairs; runtime ${Math.round(elapsedMs)} ms; delays=${JSON.stringify(totals)}`;
      process.stdout.write(`${summary}\n`);
      await testInfo.attach('same-context-unload-sweep', {
        contentType: 'application/json',
        body: JSON.stringify(
          {
            summary,
            verdict,
            mutation,
            proofSide,
            elapsedMs,
            counts,
            browserVersion: browser.version(),
            warmupTrials: WARMUP_TRIALS,
            configuredMeasuredTrials: MEASURED_TRIALS,
            delaysMs: OFFSETS_MS,
            observationMs: OBSERVATION_MS,
            controlOrigin: control.origin,
            totals,
            harnessErrors,
            incompletePoll,
            pollIntervalMs: 75,
            contextCaptureAvailable: contextCapture.available,
            contextCaptureStartedEpochMs: contextCapture.startedEpochMs,
            contextWrites: contextCapture.writes,
            workerTraffic: contextCapture.workerTraffic,
            byChainMisses: trials
              .filter(
                (trial) =>
                  trial.measured &&
                  trial.app.delivery.class === 'delivered-by-chain',
              )
              .map((trial) => ({
                trial: trial.trial,
                offsetMs: trial.offsetMs,
                missedVersions: trial.app.delivery.pollMissedVersions,
                poll: trial.app.poll,
              })),
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
}

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
