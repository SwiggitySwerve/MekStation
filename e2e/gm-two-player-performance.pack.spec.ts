/**
 * Controlled loopback performance pack (umbrella 23.1, 23.2, 23.4).
 *
 * PROVEN HERE (letters quoted from
 * openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md,
 * requirement "Strict Performance UX Evidence and Hygiene Catalog"):
 *
 * E2E-71: "WHEN the controlled measured command set completes THEN
 *   nearest-rank p95 accepted-command-to-eligible-render latency SHALL
 *   be at most 250 milliseconds."
 * E2E-72: "WHEN the measured command set runs against the committed
 *   long-log fixture THEN nearest-rank p99 ... SHALL be at most 750
 *   milliseconds."
 * E2E-73: "WHEN an eligible context cold-recovers a 1,000-event
 *   authorized tail THEN catch-up SHALL finish within 2 seconds and
 *   within chunk, queue, and memory limits."
 *
 * HOW THE NUMBERS ARE PRODUCED. The configuration is committed in
 * `src/lib/multiplayer/performance/controlledLoopbackFixture.ts` and
 * unit-pinned there, so nothing on this page decides what p95 means:
 *
 *   - ONE campaign, ONE active co-op session, THREE contexts (GM, P1,
 *     P2), opened through the production co-op surfaces.
 *   - 20 warm-up commands, then at least 200 measured commands from the
 *     committed representative mix, issued ONE AT A TIME. Single-in-
 *     flight is what makes "correlated by command identity" true: the
 *     one new campaign sequence that appears between issuing command k
 *     and issuing command k+1 IS command k's, and a command that
 *     produces no new sequence fails the run instead of being scored.
 *   - Server clock: `event.ts`, the host's commit stamp, placed on the
 *     server's monotonic timeline through the paired reading taken from
 *     `/api/e2e/performance-probe`. Browser clock: `performance.now()`
 *     at the first animation frame after the delivering socket frame -
 *     the earliest paint at which the applied event is eligible to be on
 *     screen. One offset, taken once post-warm-up, crosses between them.
 *   - The 2,000 ms wait below is a FUNCTIONAL timeout: the point at
 *     which the runner gives up waiting for a frame and fails the run.
 *     It is never the latency gate; the gate is `runner.evaluate`.
 *
 * WHAT THIS DOES NOT CLAIM. The queue observation is APPLICATION level,
 * not `ws.bufferedAmount` (finding #19: the OS pending-write backlog
 * sits at 0 at this volume, so a bufferedAmount assertion cannot trip).
 * It is the count and byte size of frames delivered to a context but not
 * yet reflected in a paint - the client's own inbound depth. Frame bytes
 * are measured by re-serializing the parsed message, which is within a
 * few bytes of the wire rather than identical to it. And the campaign
 * channel satisfies a cold join with a baseline plus tail rather than
 * fixed-size `ReplayChunk` frames (that shape is the TACTICAL replay
 * path; `RESYNC_SNAPSHOT_GAP` is 50 on this channel), so E2E-73's
 * "1,000-event authorized tail" is measured as the tail DEPTH a cold
 * context recovers, with the chunk, queue and memory ceilings proving it
 * stayed bounded while doing so.
 *
 * @tags @performance @E2E-71 @E2E-72 @E2E-73
 */

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CONTROLLED_LOOPBACK_FIXTURE as FIXTURE,
  ControlledLoopbackPerformanceRunner,
  correlateClocks,
  type ControlledCommandKind,
} from '@/lib/multiplayer/performance/controlledLoopbackFixture';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

type Fixture = Awaited<ReturnType<typeof createGmTwoPlayerCampaignFixture>>;
type Client = Fixture['clients'][number];
type Role = Client['role'];
type SessionAddress = { readonly matchId: string; readonly campaignId: string };
type GuestRole = 'future-player-1' | 'future-player-2';

interface IIssuedToken {
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
}

interface IObserverReading {
  readonly frames: readonly {
    readonly sequence: number;
    readonly serverTs: string;
    readonly renderedAtMs: number;
  }[];
  readonly highestSequence: number;
  readonly peakPendingEnvelopes: number;
  readonly peakPendingBytes: number;
  readonly maxFrameEvents: number;
  readonly maxFrameBytes: number;
  readonly wallMs: number;
  readonly monotonicMs: number;
}

const GUEST_ROLES: readonly GuestRole[] = [
  'future-player-1',
  'future-player-2',
];

test('E2E-71/72/73 controlled loopback latency, catch-up and memory stay inside budget @performance @E2E-71 @E2E-72 @E2E-73', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(900_000);
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  const runner = new ControlledLoopbackPerformanceRunner(fixture.runId);
  let coldContext: BrowserContext | null = null;
  try {
    const gm = clientByRole(fixture, 'future-gm');
    const guests = {
      'future-player-1': clientByRole(fixture, 'future-player-1'),
      'future-player-2': clientByRole(fixture, 'future-player-2'),
    };
    const everyone = [gm, guests['future-player-1'], guests['future-player-2']];
    const issued = {} as Record<Role, IIssuedToken>;
    for (const client of everyone) {
      issued[client.role] = await readIssuedToken(
        client.page,
        fixture.session.id,
      );
      await fulfilMintWith(client.page, issued[client.role]);
    }

    const session = await openCoopSession(gm.page, fixture.seed);
    for (const role of GUEST_ROLES) {
      await joinGuestByRoomCode(guests[role], session.roomCode, fixture.seed);
    }
    const address: SessionAddress = {
      matchId: session.matchId,
      campaignId: campaignIdFromUrl(gm.page),
    };
    for (const client of everyone) await installObserver(client.page, address);

    // WARM-UP. Excluded from the gate by ordinal. The wait is RELATIVE -
    // a command may commit more than one event, and the log does not
    // necessarily start at zero - so "one more than before" is the only
    // safe progress condition.
    const pages = everyone.map((client) => client.page);
    // Warm-up windows are recorded alongside the measured ones so the
    // archive SHOWS what was discarded. The runner excludes them by
    // ordinal, which is the exclusion under test - a report that simply
    // never saw them could not demonstrate it.
    const windows: {
      readonly ordinal: number;
      readonly kind: ControlledCommandKind;
      readonly intentId: string;
      readonly after: number;
    }[] = [];
    for (let ordinal = 0; ordinal < FIXTURE.warmUpCommands; ordinal += 1) {
      const kind = runner.kindForOrdinal(ordinal);
      const before = await converge(pages);
      windows.push({
        ordinal,
        kind,
        intentId: `perf-${kind}-${ordinal}`,
        after: before,
      });
      await issueCommand(gm.page, address, kind, ordinal);
      await waitForSequence(guests['future-player-1'].page, before + 1);
    }
    await gm.page.waitForTimeout(1_000);

    // The paired clock readings and memory baselines, taken once, AFTER
    // warm-up: the ceilings in the letter are growth ABOVE this point.
    const serverAnchor = await readServerProbe(gm.page, fixture.runId);
    const correlation = {} as Record<
      GuestRole,
      ReturnType<typeof correlateClocks>
    >;
    for (const role of GUEST_ROLES) {
      const anchor = await readObserver(guests[role].page);
      correlation[role] = correlateClocks(serverAnchor, anchor);
    }
    for (const client of everyone) await heapGrowthBytes(client.page);

    // MEASURED SET. One command in flight at a time, and each command's
    // sequence WINDOW recorded as it goes: a command may commit more
    // than one event, so "the k-th delivery is the k-th command" is not
    // safe. The window is - nothing else was in flight to produce a
    // sequence inside it.
    const total = FIXTURE.warmUpCommands + FIXTURE.minimumMeasuredCommands;
    for (let ordinal = FIXTURE.warmUpCommands; ordinal < total; ordinal += 1) {
      const kind = runner.kindForOrdinal(ordinal);
      const after = await converge(pages);
      windows.push({
        ordinal,
        kind,
        intentId: `perf-${kind}-${ordinal}`,
        after,
      });
      await issueCommand(gm.page, address, kind, ordinal);
      await waitForSequence(guests['future-player-1'].page, after + 1);
    }
    await gm.page.waitForTimeout(1_000);

    // Per-role, because the letter gates each healthy sample population
    // rather than a pooled one. The sample for a command is its window's
    // FIRST delivery - the earliest paint at which that command's effect
    // was eligible to be on screen.
    for (const role of GUEST_ROLES) {
      const reading = await readObserver(guests[role].page);
      let attributed = 0;
      for (const window of windows) {
        const frame = reading.frames.find(
          (candidate) => candidate.sequence > window.after,
        );
        if (!frame) continue;
        attributed += 1;
        runner.record({
          commandOrdinal: window.ordinal,
          intentId: window.intentId,
          kind: window.kind,
          role,
          sequence: frame.sequence,
          latencyMs: Math.max(
            0,
            correlation[role].toServerMonotonicMs(frame.renderedAtMs) -
              serverMonotonicOf(frame.serverTs, serverAnchor),
          ),
        });
      }
      expect(
        attributed,
        `${role} attributed ${attributed} of ${windows.length} commands`,
      ).toBe(total);
    }

    // The measured set is done: read the server here, so the long-log
    // tail and the cold rejoin that follow can be told apart from it.
    const serverAfterMeasured = await readServerProbe(gm.page, fixture.runId);

    // A LONG LOG, then a COLD context against it. The tail is built with
    // unmeasured commands: their latency is not the statistic, the log
    // depth is.
    let ordinal = total;
    while ((await readHighestSequence(gm.page)) < FIXTURE.coldCatchUp.events) {
      // ONE kind, and deliberately not a progression command: the
      // authority refuses `AdvanceDay` with CAMPAIGN_NOT_CONVERGED until
      // every participant has acknowledged the current revision, and the
      // tail is built without waiting for the guests. The tail's
      // composition is not a measured statistic - only its DEPTH is - so
      // the mix belongs to the measured set, not here.
      //
      // STILL ONE AT A TIME, and this is a PRODUCT FINDING rather than a
      // harness preference. Two host intents in flight on one campaign
      // connection race in `CampaignMatchHost.applyHostIntent`: both read
      // the same next sequence, the second commit throws
      // `CampaignEventSequenceCollisionError`, and
      // `bindCampaignSyncConnection` answers by closing the GM's socket
      // with `dispatch-failed`. MEASURED here at 50 unwaited intents: the
      // authority dropped the host connection at sequence 222. A GM who
      // double-clicks fast enough reaches the same state, so the tail
      // builder waits for each commit rather than papering over it.
      for (let batch = 0; batch < 50; batch += 1, ordinal += 1) {
        const before = await readHighestSequence(gm.page);
        await issueCommand(gm.page, address, 'AllocateSalvage', ordinal);
        await waitForSequence(gm.page, before + 1);
      }
      expect(
        ordinal,
        'tail build never reached the 1,000-event log',
      ).toBeLessThan(6_000);
    }
    // Read the server again once the log is long: the growth between
    // this and the previous reading is the tail SCAFFOLDING, and the
    // growth from here to the end is the cold catch-up E2E-73 gates.
    const serverBeforeCatchUp = await readServerProbe(gm.page, fixture.runId);
    const target = await readHighestSequence(gm.page);
    const cold = await measureColdCatchUp({
      browser,
      baseURL: baseURL ?? '',
      guest: guests['future-player-2'],
      issued: issued['future-player-2'],
      roomCode: session.roomCode,
      seed: fixture.seed,
      address,
      target,
    });
    coldContext = cold.context;

    const readings = [
      await readObserver(gm.page),
      await readObserver(guests['future-player-1'].page),
      cold.reading,
    ];
    const serverAfter = await readServerProbe(gm.page, fixture.runId);
    const contextMemoryGrowthBytes: Record<string, number> = {};
    const contextHeapBytes: Record<string, { baseline: number; used: number }> =
      {};
    for (const client of [gm, guests['future-player-1']]) {
      const heap = await heapGrowthBytes(client.page);
      contextMemoryGrowthBytes[client.role] = heap.growth;
      contextHeapBytes[client.role] = {
        baseline: heap.baseline,
        used: heap.used,
      };
    }

    const observations = {
      coldCatchUpMs: cold.elapsedMs,
      coldCatchUpEvents: cold.recoveredSequence,
      serverMemory: {
        measured: growthBetween(serverAnchor, serverAfterMeasured),
        catchUp: growthBetween(serverBeforeCatchUp, serverAfter),
        tailBuild: growthBetween(serverAfterMeasured, serverBeforeCatchUp),
      },
      contextMemoryGrowthBytes,
      contextHeapBytes,
      peakQueueEnvelopes: Math.max(
        ...readings.map((reading) => reading.peakPendingEnvelopes),
      ),
      peakQueueBytes: Math.max(
        ...readings.map((reading) => reading.peakPendingBytes),
      ),
      maxReplayChunkEvents: Math.max(
        ...readings.map((reading) => reading.maxFrameEvents),
      ),
      maxReplayChunkBytes: Math.max(
        ...readings.map((reading) => reading.maxFrameBytes),
      ),
    };

    // ARCHIVE FIRST, then gate on what was archived - and prove the file
    // read back is this run's, so a crash that left a previous run's
    // green report on disk cannot be mistaken for a pass.
    const bundle = fixture.openEvidenceBundle();
    const report = runner.buildReport(observations, {
      node: process.version,
      chromium: browser.version(),
      os: `${os.platform()} ${os.release()}`,
      runnerClass: `${FIXTURE.runnerClass}:controlled-loopback-local`,
    });
    const entry = bundle.write(
      'latency',
      'controlled',
      'performance.json',
      JSON.stringify(report, null, 2),
    );
    bundle.finalize({
      node: process.version,
      chromium: browser.version(),
      os: `${os.platform()} ${os.release()}`,
      runnerClass: FIXTURE.runnerClass,
    });
    const archived: unknown = JSON.parse(
      fs.readFileSync(path.join(bundle.root, entry.file), 'utf8'),
    );
    expect(runner.assertArchiveIsFresh(archived)).toBe(true);

    const verdict = runner.evaluate(observations);
    expect(verdict.failures.join('; ')).toBe('');
    expect(verdict.passed).toBe(true);
  } finally {
    await coldContext?.close();
    await fixture.cleanup();
  }
});

// ---------------------------------------------------------------------------
// The controlled runner's page-side halves
// ---------------------------------------------------------------------------

/**
 * Installs the per-context observer on the LIVE co-op transport.
 *
 * Registered on the surface's own transport rather than a second socket:
 * a second GM socket reads as a host reconnect and pauses the session,
 * and a second guest socket would be a fourth identity the membership
 * cap refuses.
 */
async function installObserver(
  page: Page,
  address: SessionAddress,
): Promise<void> {
  await page.waitForFunction(
    (input) => {
      const lookup = window.__CAMPAIGN_SYNC_TRANSPORT__;
      return Boolean(lookup?.(input.matchId) ?? lookup?.(input.campaignId));
    },
    address,
    { timeout: 120_000 },
  );
  await page.evaluate(observerScript, address);
}

/**
 * Arms the observer BEFORE the page has a transport.
 *
 * A cold context's whole recovery arrives in the frames right after the
 * socket opens, so an observer installed once the transport exists has
 * already missed it. This runs at document start and attaches the
 * instant the transport registers - which happens when the socket is
 * constructed, before any frame can land.
 */
async function armObserver(
  target: BrowserContext,
  address: SessionAddress,
): Promise<void> {
  await target.addInitScript(
    ({ input, source }) => {
      const attach = new Function(`return (${source})`)() as (
        value: typeof input,
      ) => void;
      const timer = window.setInterval(() => {
        const lookup = window.__CAMPAIGN_SYNC_TRANSPORT__;
        if (!(lookup?.(input.matchId) ?? lookup?.(input.campaignId))) return;
        window.clearInterval(timer);
        attach(input);
      }, 5);
    },
    { input: address, source: observerScript.toString() },
  );
}

/**
 * The page-side observer.
 *
 * Declared as a standalone function so it can be both `evaluate`d into a
 * live page and stringified into an init script - one body, so the warm
 * and cold contexts are never observed by two different definitions.
 */
function observerScript(input: SessionAddress): void {
  {
    const lookup = window.__CAMPAIGN_SYNC_TRANSPORT__;
    const transport = lookup?.(input.matchId) ?? lookup?.(input.campaignId);
    if (!transport) throw new Error('no active campaign sync transport');
    if (window.__PERFORMANCE_OBSERVER_STATE__) return;
    const frames: {
      sequence: number;
      serverTs: string;
      renderedAtMs: number;
    }[] = [];
    const state = {
      highestSequence: 0,
      appliedSequence: 0,
      recoveredRevision: -1,
      peakPendingEnvelopes: 0,
      peakPendingBytes: 0,
      maxFrameEvents: 0,
      maxFrameBytes: 0,
      pendingEnvelopes: 0,
      pendingBytes: 0,
    };
    transport.onFrame((message) => {
      const record = message as unknown as {
        kind?: unknown;
        event?: { sequence?: unknown; ts?: unknown; payload?: unknown };
        events?: unknown[];
      };
      if (
        record.kind !== 'CampaignEvent' &&
        record.kind !== 'CampaignSnapshot'
      ) {
        return;
      }
      const bytes = JSON.stringify(message).length;
      const eventCount = Array.isArray(record.events)
        ? record.events.length
        : 1;
      state.maxFrameBytes = Math.max(state.maxFrameBytes, bytes);
      state.maxFrameEvents = Math.max(state.maxFrameEvents, eventCount);
      // APPLICATION-LEVEL depth: delivered, not yet painted.
      state.pendingEnvelopes += 1;
      state.pendingBytes += bytes;
      state.peakPendingEnvelopes = Math.max(
        state.peakPendingEnvelopes,
        state.pendingEnvelopes,
      );
      state.peakPendingBytes = Math.max(
        state.peakPendingBytes,
        state.pendingBytes,
      );
      const sequence =
        typeof record.event?.sequence === 'number' ? record.event.sequence : -1;
      // A resync baseline is stamped sequence -1 but leaves the client
      // holding the state at `payload.revision`; that revision IS the
      // depth this context recovered, and without it a cold join looks
      // like it recovered nothing.
      const payload = record.event?.payload;
      const revision =
        typeof payload === 'object' &&
        payload !== null &&
        typeof (payload as { revision?: unknown }).revision === 'number'
          ? ((payload as { revision: number }).revision as number)
          : -1;
      state.recoveredRevision = Math.max(
        state.recoveredRevision,
        sequence,
        revision,
      );
      const serverTs =
        typeof record.event?.ts === 'string' ? record.event.ts : '';
      if (sequence >= 0) {
        state.appliedSequence = Math.max(state.appliedSequence, sequence);
      }
      const drainedEnvelopes = state.pendingEnvelopes;
      const drainedBytes = state.pendingBytes;
      requestAnimationFrame(() => {
        state.pendingEnvelopes -= drainedEnvelopes;
        state.pendingBytes -= drainedBytes;
        if (sequence < 0 || serverTs === '') return;
        state.highestSequence = Math.max(state.highestSequence, sequence);
        frames.push({ sequence, serverTs, renderedAtMs: performance.now() });
      });
    });
    window.__PERFORMANCE_OBSERVER_STATE__ = { frames, state };
  }
}

/** Reads one context's accumulated observation, with its clock anchor. */
async function readObserver(page: Page): Promise<IObserverReading> {
  return page.evaluate(() => {
    const observer = window.__PERFORMANCE_OBSERVER_STATE__;
    if (!observer) throw new Error('performance observer not installed');
    return {
      frames: observer.frames,
      highestSequence: observer.state.highestSequence,
      peakPendingEnvelopes: observer.state.peakPendingEnvelopes,
      peakPendingBytes: observer.state.peakPendingBytes,
      maxFrameEvents: observer.state.maxFrameEvents,
      maxFrameBytes: observer.state.maxFrameBytes,
      // Paired, in this order, to match the server probe.
      wallMs: Date.now(),
      monotonicMs: performance.now(),
    };
  });
}

/**
 * Reads ONLY the highest painted sequence.
 *
 * The polling loops run thousands of times and the frame list grows to
 * four figures; serializing it on every poll would make the harness's
 * own overhead a visible part of the numbers it is measuring.
 */
async function readHighestSequence(page: Page): Promise<number> {
  return page.evaluate(
    () => window.__PERFORMANCE_OBSERVER_STATE__?.state.highestSequence ?? -1,
  );
}

/** Issues one representative command on the GM's live transport. */
async function issueCommand(
  page: Page,
  address: SessionAddress,
  kind: ControlledCommandKind,
  ordinal: number,
): Promise<void> {
  const intent = ControlledLoopbackPerformanceRunner.buildIntent(
    kind,
    address.campaignId,
    ordinal,
  );
  await page.evaluate(
    (input) => {
      const lookup = window.__CAMPAIGN_SYNC_TRANSPORT__;
      const transport =
        lookup?.(input.address.matchId) ?? lookup?.(input.address.campaignId);
      if (!transport) throw new Error('no active campaign sync transport');
      transport.sendHostIntent(
        input.intent as unknown as Parameters<
          typeof transport.sendHostIntent
        >[0],
      );
    },
    { address, intent },
  );
}

/**
 * Waits for a context to have PAINTED a given campaign sequence.
 *
 * On timeout it reports the applied sequence alongside the painted one.
 * The two answer different questions - "did the authority commit and
 * deliver it" versus "did this context get a frame in which to show it"
 * - and a bare painted number cannot tell a stalled authority from a
 * throttled animation callback.
 */
async function waitForSequence(page: Page, sequence: number): Promise<void> {
  // FUNCTIONAL timeout, not the gate: a command that produces no frame
  // at all fails the run rather than being scored as slow.
  try {
    await expect
      .poll(async () => readHighestSequence(page), {
        timeout: FIXTURE.functionalWaitMs,
        intervals: [10, 10, 25, 50, 100],
      })
      .toBeGreaterThanOrEqual(sequence);
  } catch (error) {
    const progress = await readProgress(page);
    throw new Error(
      `no painted delivery reached ${sequence}: painted=${progress.painted} ` +
        `applied=${progress.applied} frames=${progress.frames} ` +
        `pendingEnvelopes=${progress.pending} (${String(error)})`,
    );
  }
}

/**
 * Waits until EVERY context has applied the current head, and returns it.
 *
 * Progression commands are gated on convergence: the authority refuses
 * `AdvanceDay` with `CAMPAIGN_NOT_CONVERGED` while any participant's
 * acknowledged revision is behind. MEASURED: without this the run died
 * around the fiftieth command, on an `AdvanceDay`, with the guests one
 * revision behind - the refusal commits nothing, so the harness saw a
 * command that produced no event and could not tell that from a stall.
 *
 * Waiting here rather than inside the measurement is deliberate: the
 * settle is spent BEFORE the command is issued, so it is not part of any
 * command's accepted-to-rendered latency.
 */
async function converge(pages: readonly Page[]): Promise<number> {
  const head = Math.max(
    ...(await Promise.all(pages.map((page) => readHighestSequence(page)))),
  );
  for (const page of pages) {
    await expect
      .poll(async () => (await readProgress(page)).applied, {
        timeout: FIXTURE.functionalWaitMs * 5,
        intervals: [10, 10, 25, 50, 100],
      })
      .toBeGreaterThanOrEqual(head);
  }
  // The acknowledgement is sent when the frame is applied; this is the
  // one-way flight time back to the authority.
  await pages[0]?.waitForTimeout(25);
  return head;
}

/** Painted versus applied progress, for telling those two apart. */
async function readProgress(page: Page): Promise<{
  painted: number;
  applied: number;
  frames: number;
  pending: number;
}> {
  return page.evaluate(() => {
    const observer = window.__PERFORMANCE_OBSERVER_STATE__;
    return {
      painted: observer?.state.highestSequence ?? -1,
      applied: observer?.state.appliedSequence ?? -1,
      frames: observer?.frames.length ?? -1,
      pending: observer?.state.pendingEnvelopes ?? -1,
    };
  });
}

/** The server's paired clock reading and resident memory. */
async function readServerProbe(
  page: Page,
  runId: string,
): Promise<{
  wallMs: number;
  monotonicMs: number;
  rss: number;
  heapUsed: number;
}> {
  const probe = await page.evaluate(async (input) => {
    const response = await fetch('/api/e2e/performance-probe', {
      headers: { 'x-playwright-e2e-run-id': input },
    });
    return {
      status: response.status,
      body: (await response.json()) as unknown,
    };
  }, runId);
  expect(probe.status, JSON.stringify(probe.body)).toBe(200);
  const body = probe.body as {
    wallMs: number;
    monotonicMs: number;
    memory: { rss: number; heapUsed: number };
  };
  return {
    wallMs: body.wallMs,
    monotonicMs: body.monotonicMs,
    rss: body.memory.rss,
    heapUsed: body.memory.heapUsed,
  };
}

/** Growth between two server probe readings, never negative. */
function growthBetween(
  before: { rss: number; heapUsed: number },
  after: { rss: number; heapUsed: number },
): { rssGrowthBytes: number; heapGrowthBytes: number } {
  return {
    rssGrowthBytes: Math.max(0, after.rss - before.rss),
    heapGrowthBytes: Math.max(0, after.heapUsed - before.heapUsed),
  };
}

/** A commit stamp, placed on the server's monotonic timeline. */
function serverMonotonicOf(
  ts: string,
  anchor: { readonly wallMs: number; readonly monotonicMs: number },
): number {
  return anchor.monotonicMs + (Date.parse(ts) - anchor.wallMs);
}

/**
 * This context's JS heap growth since its own baseline.
 *
 * The FIRST call establishes the baseline and reports zero - the letter
 * gates growth above the post-warm-up reading, not absolute heap.
 */
async function heapGrowthBytes(
  page: Page,
): Promise<{ baseline: number; used: number; growth: number }> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Performance.enable');
    const metrics = await session.send('Performance.getMetrics');
    const used =
      metrics.metrics.find((metric) => metric.name === 'JSHeapUsedSize')
        ?.value ?? 0;
    const baseline = await page.evaluate(
      () => window.__PERFORMANCE_HEAP_BASELINE__ ?? null,
    );
    if (baseline === null) {
      await page.evaluate((value) => {
        window.__PERFORMANCE_HEAP_BASELINE__ = value;
      }, used);
      return { baseline: used, used, growth: 0 };
    }
    // The absolute readings travel with the growth: a zero from two real
    // heap readings and a zero from a metric that was never populated
    // look identical otherwise.
    return { baseline, used, growth: Math.max(0, used - baseline) };
  } finally {
    await session.detach();
  }
}

/**
 * A cold context recovers the long log.
 *
 * "Cold" is literal: Player 2's warm context is closed and its identity
 * re-joins through the production join dialog in a brand-new browser
 * context, so nothing local survives. A FOURTH identity is not an option
 * - the membership cap refuses it - and re-joining as the GM would read
 * as a host reconnect and pause the session.
 *
 * The recovery target is read from the transport's own `lastSeq`, not
 * from the observer: the observer can only be installed once a transport
 * exists, by which time part of the tail has already been applied.
 */
async function measureColdCatchUp(input: {
  readonly browser: Browser;
  readonly baseURL: string;
  readonly guest: Client;
  readonly issued: IIssuedToken;
  readonly roomCode: string;
  readonly seed: string;
  readonly address: SessionAddress;
  readonly target: number;
}): Promise<{
  context: BrowserContext;
  reading: IObserverReading;
  elapsedMs: number;
  recoveredSequence: number;
}> {
  await input.guest.context.close();

  const context = await input.browser.newContext({ baseURL: input.baseURL });
  await armObserver(context, input.address);
  const page = await context.newPage();
  await fulfilMintWith(page, input.issued);
  await page.goto('/gameplay/campaigns');
  const started = Date.now();
  await joinGuestByRoomCode(
    { page, role: input.guest.role },
    input.roomCode,
    input.seed,
  );
  await expect
    .poll(async () => readRecoveredRevision(page), { timeout: 120_000 })
    .toBeGreaterThanOrEqual(input.target);
  const elapsedMs = Date.now() - started;
  const reading = await readObserver(page);
  return {
    context,
    reading,
    elapsedMs,
    recoveredSequence: await readRecoveredRevision(page),
  };
}

/** How deep a tail this context has recovered, snapshot baselines included. */
async function readRecoveredRevision(page: Page): Promise<number> {
  return page.evaluate(
    () => window.__PERFORMANCE_OBSERVER_STATE__?.state.recoveredRevision ?? -1,
  );
}

// ---------------------------------------------------------------------------
// Fixture driving (helpers modelled on
// e2e/gm-two-player-proposals.pack.spec.ts, which owns the co-op UI join
// rig; consolidating the two is its own seam)
// ---------------------------------------------------------------------------

function fixturePassword(role: Role, seed: string): string {
  return `GM2P-${role}-${seed.slice(0, 16)}!`;
}

function clientByRole(fixture: Fixture, role: Role): Client {
  const found = fixture.clients.find((client) => client.role === role);
  if (!found) throw new Error(`fixture client missing for ${role}`);
  return found;
}

/**
 * Reads the wire identity the fixture stored for this context.
 *
 * The vault mint unlocks the ACTIVE identity only, and the fixture seeds
 * three in one process, so only the last-seeded vault would answer a
 * password form. Every context therefore replays the token it was
 * already issued. Note the reshape: the stored blob names the credential
 * `wireToken`, the mint route answers `token`, and fulfilling the route
 * with the blob verbatim silently produces a response the client cannot
 * read - which is exactly how the first run of this pack failed, with a
 * 60-second wait for a create request that was never sent.
 */
async function readIssuedToken(
  page: Page,
  fixtureSessionId: string,
): Promise<IIssuedToken> {
  const raw = await page.evaluate((id) => {
    return sessionStorage.getItem(`mekstation.coopCampaign.token.${id}`);
  }, fixtureSessionId);
  if (raw === null) {
    throw new Error(`co-op token missing for session ${fixtureSessionId}`);
  }
  const stored = JSON.parse(raw) as {
    wireToken?: string;
    playerId?: string;
    displayName?: string;
  };
  if (!stored.wireToken || !stored.playerId || !stored.displayName) {
    throw new Error(`co-op token malformed for session ${fixtureSessionId}`);
  }
  return {
    token: stored.wireToken,
    playerId: stored.playerId,
    displayName: stored.displayName,
  };
}

/** Fulfils the mint route with an already-issued identity. */
async function fulfilMintWith(page: Page, issued: IIssuedToken): Promise<void> {
  await page.route('**/api/multiplayer/auth/token', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(issued),
    });
  });
}

/** Host opens a co-op session from the dashboard. */
async function openCoopSession(
  page: Page,
  seed: string,
): Promise<{ roomCode: string; matchId: string }> {
  await expect(page.getByTestId('create-coop-campaign-btn')).toBeVisible({
    timeout: 60_000,
  });
  await page
    .getByTestId('create-coop-password-input')
    .fill(fixturePassword('future-gm', seed));
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/multiplayer/matches') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
    { timeout: 60_000 },
  );
  await Promise.all([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 60_000 }),
    page.getByTestId('create-coop-campaign-btn').click(),
  ]);
  const body = (await (await created).json()) as {
    readonly matchId?: string;
    readonly roomCode?: string;
    readonly meta?: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta?.roomCode ?? null;
  if (roomCode === null || !body.matchId) {
    throw new Error('co-op session response lacked matchId or roomCode');
  }
  await expect(page.getByTestId('coop-session-badge')).toContainText(
    'Co-op session: Host',
    { timeout: 60_000 },
  );
  return { roomCode, matchId: body.matchId };
}

async function joinGuestByRoomCode(
  client: { readonly page: Page; readonly role: Role },
  roomCode: string,
  seed: string,
): Promise<void> {
  const { page } = client;
  await page.goto('/gameplay/campaigns');
  await page.waitForLoadState('domcontentloaded');
  await page.getByTestId('join-coop-campaign-btn').click();
  await expect(page.getByTestId('join-coop-dialog')).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId('join-coop-room-code-input').fill(roomCode);
  await page
    .getByTestId('join-coop-password-input')
    .fill(fixturePassword(client.role, seed));
  await Promise.all([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 60_000 }),
    page.getByTestId('join-coop-submit-btn').click(),
  ]);
  await expect(page.getByTestId('guest-mirror-sync-status')).toContainText(
    'synced',
    { timeout: 120_000 },
  );
}

function campaignIdFromUrl(page: Page): string {
  const match = /\/gameplay\/campaigns\/([^/?#]+)/.exec(page.url());
  if (!match?.[1]) throw new Error(`campaign id missing from ${page.url()}`);
  return decodeURIComponent(match[1]);
}
