/**
 * Slow-client backpressure pack (E2E-74, umbrella 22.3).
 *
 * LETTER, verbatim from specs/e2e-testing/spec.md, requirement "Strict
 * Performance UX Evidence and Hygiene Catalog": "WHEN Player 2 is slowed
 * through the controlled send seam THEN its queue and memory SHALL
 * remain within the declared limits and each healthy GM/Player 1 sample
 * population SHALL retain nearest-rank p95 at or below 250 milliseconds
 * and p99 at or below 750 milliseconds."
 *
 * THE CONTROLLED SEND SEAM is the per-viewer unacked-frame bound
 * (`MAX_VIEWER_UNACKED` = 64 on `ViewerDeliveryCursors`), driven by
 * swallowing only Player 2's outgoing `DeliveryAck` frames. NOT
 * `socket.bufferedAmount`: finding #19 records that the OS pending-write
 * backlog sits at 0 on match traffic, so such an assertion cannot trip.
 * E2E-14 drives the same seam; E2E-74 adds the quantitative half E2E-14
 * does not claim - the declared ceilings and the healthy percentiles.
 *
 * THE DECLARED LIMITS are read, never redeclared, from
 * `controlledLoopbackFixture.ts`: 256 envelopes or 1 MiB per connection,
 * 128 MiB server RSS growth, 64 MiB growth per controlled browser client.
 *
 * WHY THE CAP IS A FLOOR AND 256 IS THE CEILING. The server's bound is
 * "stopped growing", not "exactly 64" - a mid-burst refusal can leave the
 * window slightly above the cap (ServerMatchHostViewerBound). So the row
 * asserts the window REACHED the cap, stayed inside the declared
 * 256-envelope limit, and that `issued` then FROZE while the healthy
 * viewers kept being issued; the three together are what "bounded" means.
 *
 * NOT CLAIMED: the client-side queue reading is APPLICATION level
 * (delivered-but-unpainted envelopes and their serialized bytes), matching
 * the performance pack rather than the socket's own buffer, and frame
 * bytes are the received string's length - within a few bytes of the wire,
 * not identical to it. No campaign-channel seam is touched: that channel
 * has no ack-based queue bound and adding one would be a `src/` change
 * this unit does not own.
 *
 * @tags @backpressure @E2E-74
 */

import { expect, test } from '@playwright/test';

import { CONTROLLED_LOOPBACK_FIXTURE as FIXTURE } from '@/lib/multiplayer/performance/controlledLoopbackFixture';

import {
  deleteIdentities,
  e2eRunId,
  openContextPage,
} from './helpers/gmTwoPlayerMatchFlow';
import {
  armTacticalObserver,
  heapGrowthBytes,
  readServerProbe,
  readTacticalObserver,
  scoreViewerLatency,
  type ITacticalObserverReading,
} from './helpers/tacticalBackpressureObserver';
import {
  driveTwoMoreAdvances,
  driveUntilPlayer2Capped,
  installAckSwallow,
  installIntentTap,
  launchThreeViewersToMovement,
  playerUnacked,
  readViewerBoundEvidence,
  VIEWER_UNACKED_CAP,
} from './helpers/viewerUnackedBound';

/**
 * Floor on each healthy viewer's scored population.
 *
 * Small rather than the campaign fixture's 200: this drive is bounded by
 * how many frames it takes Player 2 to hit a 64-frame window, not by a
 * committed command mix. A small population makes the nearest-rank p95
 * STRICTER (it approaches the maximum sample), so the floor protects
 * against scoring an empty or near-empty population, never against a
 * slow one.
 */
const MIN_HEALTHY_SAMPLES = 24;

/** Highest delivery number this viewer has already painted. */
function highestDelivery(reading: ITacticalObserverReading): number {
  let highest = -1;
  for (const frame of reading.frames) {
    if (frame.deliverySequence > highest) highest = frame.deliverySequence;
  }
  return highest;
}

test('E2E-74 a slowed Player 2 stays inside the declared queue and memory limits while GM and Player 1 hold their latency budgets @backpressure @E2E-74', async ({
  browser,
  request,
}) => {
  test.setTimeout(600_000);
  const gmPage = await openContextPage(browser);
  const p1Page = await openContextPage(browser);
  const p2Page = await openContextPage(browser);
  const socketUrls: string[] = [];
  const gmTap = installIntentTap(gmPage, socketUrls);
  const p2Drop = installAckSwallow(p2Page, socketUrls);
  // Routes first: every page in this pack is routed, so Playwright's
  // WebSocket mock is what the observer's accessor must end up wrapping.
  // arm() is what starts the stall, so Movement still reaches Player 2.
  await Promise.all([
    gmTap.install(),
    p2Drop.install(),
    p1Page.routeWebSocket(
      (url) => {
        if (url.pathname !== '/api/multiplayer/socket') return false;
        socketUrls.push(url.toString());
        return true;
      },
      (route) => {
        const server = route.connectToServer();
        route.onMessage((message) => server.send(message));
        server.onMessage((message) => route.send(message));
      },
    ),
  ]);
  await Promise.all(
    [gmPage, p1Page, p2Page].map((page) => armTacticalObserver(page.context())),
  );

  const live = await launchThreeViewersToMovement({
    request,
    gmPage,
    p1Page,
    p2Page,
  });
  const { match, p2Token } = live;
  try {
    // WARM-UP. Two advances so JIT, first paint and the join replay are
    // behind us, then each healthy viewer's scoring window opens at the
    // next delivery number it has NOT yet seen. Warm-up frames are
    // excluded by delivery number, which is the exclusion under test - a
    // population that simply never saw them could not demonstrate it.
    await driveTwoMoreAdvances(gmTap, gmPage);
    const gmWarm = await readTacticalObserver(gmPage);
    const p1Warm = await readTacticalObserver(p1Page);
    const scoreFrom = {
      gm: highestDelivery(gmWarm) + 1,
      p1: highestDelivery(p1Warm) + 1,
    };
    // Post-warm-up baselines. The letter gates GROWTH above these.
    for (const page of [gmPage, p1Page, p2Page]) await heapGrowthBytes(page);
    const serverBefore = await readServerProbe(gmPage, e2eRunId());

    // SLOW PLAYER 2 through the controlled send seam.
    p2Drop.arm();
    const isolated = await driveUntilPlayer2Capped({
      gmPage,
      p2PlayerId: p2Token.playerId,
      gmTap,
    });
    const p2IssuedAtCap = isolated.byPlayer[p2Token.playerId]?.issued ?? 0;
    const gmIssuedAtCap = isolated.byPlayer[live.gmToken.playerId]?.issued ?? 0;
    const p1IssuedAtCap = isolated.byPlayer[live.p1Token.playerId]?.issued ?? 0;

    // Keep committing so the healthy pair accumulates a population while
    // Player 2 is held. Polled, never a fixed wait.
    await driveTwoMoreAdvances(gmTap, gmPage);
    await expect
      .poll(
        () => {
          const snap = readViewerBoundEvidence(match.matchId);
          return (
            (snap.byPlayer[live.gmToken.playerId]?.issued ?? 0) >
              gmIssuedAtCap &&
            (snap.byPlayer[live.p1Token.playerId]?.issued ?? 0) > p1IssuedAtCap
          );
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    const afterHold = readViewerBoundEvidence(match.matchId);
    const serverAfter = await readServerProbe(gmPage, e2eRunId());

    // CLAUSE 1 - "its queue ... SHALL remain within the declared limits".
    const p2Unacked = playerUnacked(afterHold, p2Token.playerId);
    expect(
      p2Unacked,
      'Player 2 never reached the send seam',
    ).toBeGreaterThanOrEqual(VIEWER_UNACKED_CAP);
    expect(
      p2Unacked,
      'unacked window passed the declared per-connection envelope limit',
    ).toBeLessThanOrEqual(FIXTURE.connectionQueue.maxEnvelopes);
    // Bounded means the server STOPPED issuing to Player 2 while the
    // healthy viewers kept being issued - without this, "within limits"
    // would also be satisfied by a queue that was simply never filled.
    expect(afterHold.byPlayer[p2Token.playerId]?.issued ?? 0).toBe(
      p2IssuedAtCap,
    );
    const p2Reading = await readTacticalObserver(p2Page);
    expect(
      p2Reading.peakPendingEnvelopes,
      'Player 2 inbound depth passed the declared envelope limit',
    ).toBeLessThanOrEqual(FIXTURE.connectionQueue.maxEnvelopes);
    expect(
      p2Reading.peakPendingBytes,
      'Player 2 inbound depth passed the declared byte limit',
    ).toBeLessThanOrEqual(FIXTURE.connectionQueue.maxBytes);

    // CLAUSE 2 - "... and memory SHALL remain within the declared limits".
    const p2Heap = await heapGrowthBytes(p2Page);
    expect(
      p2Heap.growth,
      `Player 2 heap grew past the per-client ceiling (baseline ${String(p2Heap.baseline)} used ${String(p2Heap.used)})`,
    ).toBeLessThanOrEqual(FIXTURE.memoryGrowthCeilingBytes.browserContext);
    expect(
      Math.max(0, serverAfter.rss - serverBefore.rss),
      'server RSS grew past the declared ceiling while a viewer was slowed',
    ).toBeLessThanOrEqual(FIXTURE.memoryGrowthCeilingBytes.server);

    // CLAUSE 3 - "each healthy GM/Player 1 sample population SHALL retain
    // nearest-rank p95 <= 250 ms and p99 <= 750 ms". Scored per viewer,
    // never pooled: a pooled population lets one healthy viewer's good
    // samples hide the other's.
    for (const healthy of [
      { role: 'GM', page: gmPage, from: scoreFrom.gm },
      { role: 'Player 1', page: p1Page, from: scoreFrom.p1 },
    ]) {
      const reading = await readTacticalObserver(healthy.page);
      const score = scoreViewerLatency(reading, serverAfter, healthy.from);
      expect(
        score.count,
        `${healthy.role} scored population too small to gate`,
      ).toBeGreaterThanOrEqual(MIN_HEALTHY_SAMPLES);
      expect(
        score.p95Ms,
        `${healthy.role} p95 over budget across ${String(score.count)} samples`,
      ).toBeLessThanOrEqual(FIXTURE.latencyBudgetsMs.p95);
      expect(
        score.p99Ms,
        `${healthy.role} p99 over budget across ${String(score.count)} samples`,
      ).toBeLessThanOrEqual(FIXTURE.latencyBudgetsMs.p99);
    }
  } finally {
    await deleteIdentities(request, live.identityIds).catch(() => undefined);
    await gmPage.context().close();
    await p1Page.context().close();
    await p2Page.context().close();
  }
});
