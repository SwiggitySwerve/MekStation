/**
 * Unit proof for the committed controlled-loopback performance fixture
 * (harden-gm-two-player-campaign-sessions 23.1 / 23.2).
 *
 * The browser pack that runs this fixture costs minutes and needs a live
 * server, so the ARITHMETIC that decides pass or fail is settled here,
 * cheaply, against a hand-computed table. A percentile that is off by
 * one rank, a gate that reads the wrong threshold, or a report that is
 * re-read from a previous run all produce a green pack while measuring
 * nothing - and none of those failures are visible from the pack itself.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (23.1, 23.2)
 */

import { parseCampaignIntent } from '@/types/campaign/campaignSyncSchemas';
import { REPLAY_CHUNK_SIZE } from '@/types/multiplayer/Protocol';

import { MAX_BUFFERED_BYTES } from '../../server/ServerMatchBroadcaster';
import {
  CONTROLLED_LOOPBACK_FIXTURE,
  ControlledLoopbackPerformanceRunner,
  StalePerformanceArchiveError,
  correlateClocks,
  nearestRankPercentile,
} from '../controlledLoopbackFixture';

/** Ascending 1..count, the simplest population to hand-rank. */
function ascending(count: number): number[] {
  return Array.from({ length: count }, (_value, index) => index + 1);
}

/** Shuffled deterministically, so the helper cannot rely on input order. */
function rotated(count: number): number[] {
  const values = ascending(count);
  return [...values.slice(count / 2), ...values.slice(0, count / 2)];
}

describe('nearest-rank percentile', () => {
  // HAND-COMPUTED. Nearest rank of p over N sorted samples is the
  // element at 1-based rank ceil(p / 100 * N):
  //   N=10 p50 -> ceil(5)   = 5  -> 5
  //   N=10 p95 -> ceil(9.5) = 10 -> 10
  //   N=20 p95 -> ceil(19)  = 19 -> 19   (the off-by-one killer)
  //   N=200 p95 -> ceil(190) = 190 -> 190
  //   N=200 p99 -> ceil(198) = 198 -> 198
  //   N=1 p99  -> ceil(0.99) = 1  -> 1
  //   N=7 p100 -> ceil(7)   = 7  -> 7
  it.each([
    [10, 50, 5],
    [10, 95, 10],
    [20, 95, 19],
    [200, 95, 190],
    [200, 99, 198],
    [1, 99, 1],
    [7, 100, 7],
  ])(
    'ranks p%2$s of %1$s ascending samples at %3$s',
    (count: number, percentile: number, expected: number) => {
      expect(nearestRankPercentile(ascending(count), percentile)).toBe(
        expected,
      );
      // Same answer from an unsorted population: the helper sorts, and a
      // helper that indexed the caller's order would pass the row above
      // and fail this one.
      expect(nearestRankPercentile(rotated(count), percentile)).toBe(expected);
    },
  );

  it('refuses an empty population instead of inventing a percentile', () => {
    expect(() => nearestRankPercentile([], 95)).toThrow(/EMPTY_POPULATION/);
  });
});

describe('committed fixture configuration', () => {
  it('commits the letter of task 23.1', () => {
    expect(CONTROLLED_LOOPBACK_FIXTURE).toEqual({
      runnerClass: 'ControlledLoopbackPerformanceRunner',
      warmUpCommands: 20,
      minimumMeasuredCommands: 200,
      representativeCommandMix: ['AdvanceDay', 'AllocateSalvage', 'SpendFunds'],
      latencyBudgetsMs: { p95: 250, p99: 750 },
      coldCatchUp: { events: 1_000, budgetMs: 2_000 },
      replayChunk: { maxEvents: 100, maxBytes: 524_288 },
      connectionQueue: { maxEnvelopes: 256, maxBytes: 1_048_576 },
      memoryGrowthCeilingBytes: {
        server: 134_217_728,
        browserContext: 67_108_864,
      },
      functionalWaitMs: 2_000,
    });
  });

  it('mirrors product constants rather than restating numbers', () => {
    // The fixture declares CEILINGS; the product picks the values it
    // ships. A product that widened past a ceiling must fail here, in a
    // one-second unit, and not silently in a browser pack that never
    // reaches the bound.
    expect(REPLAY_CHUNK_SIZE).toBeLessThanOrEqual(
      CONTROLLED_LOOPBACK_FIXTURE.replayChunk.maxEvents,
    );
    expect(MAX_BUFFERED_BYTES).toBeLessThanOrEqual(
      CONTROLLED_LOOPBACK_FIXTURE.connectionQueue.maxBytes,
    );
  });

  it('draws its representative mix from commands the authority accepts', () => {
    // "Representative" is not a word: every mix member is a real
    // CampaignIntent the GM authority commits, checked against the
    // product's own boundary parser. RemoveParticipant is deliberately
    // absent - it would revoke the fixture's own membership mid-run.
    for (const kind of CONTROLLED_LOOPBACK_FIXTURE.representativeCommandMix) {
      const intent = ControlledLoopbackPerformanceRunner.buildIntent(
        kind,
        'campaign-1',
        7,
      );
      expect([kind, parseCampaignIntent(intent)]).not.toEqual([kind, null]);
    }
    expect(CONTROLLED_LOOPBACK_FIXTURE.representativeCommandMix).not.toContain(
      'RemoveParticipant',
    );
  });
});

describe('clock correlation', () => {
  it('offsets the browser monotonic clock onto the server monotonic clock', () => {
    // Both anchors are read as a pair; each side then measures ELAPSED
    // time on its own monotonic source, and only this single offset
    // crosses the process boundary.
    const correlation = correlateClocks(
      { wallMs: 1_000_000, monotonicMs: 500 },
      { wallMs: 1_000_010, monotonicMs: 90 },
    );
    // Client monotonic 90 was read 10 wall-ms after server monotonic 500,
    // so client monotonic 90 corresponds to server monotonic 510.
    expect(correlation.offsetMs).toBe(420);
    expect(correlation.toServerMonotonicMs(90)).toBe(510);
    expect(correlation.toServerMonotonicMs(140)).toBe(560);
  });
});

describe('ControlledLoopbackPerformanceRunner', () => {
  const environment = {
    node: 'v22.22.0',
    chromium: '140.0.0.0',
    os: 'win32 10.0.26200',
    runnerClass: 'controlled-loopback-local',
  };

  /**
   * A runner fed `warmUp` slow commands and `measured` fast ones, in
   * ordinal order, exactly as the pack feeds it.
   */
  function seeded(
    runId: string,
    warmUpLatencyMs: number,
    measuredLatencies: readonly number[],
  ): ControlledLoopbackPerformanceRunner {
    const runner = new ControlledLoopbackPerformanceRunner(runId);
    for (let ordinal = 0; ordinal < 20; ordinal += 1) {
      runner.record({
        commandOrdinal: ordinal,
        intentId: `warm-${ordinal}`,
        kind: 'AdvanceDay',
        role: 'future-player-1',
        sequence: ordinal + 1,
        latencyMs: warmUpLatencyMs,
      });
    }
    measuredLatencies.forEach((latencyMs, index) => {
      runner.record({
        commandOrdinal: 20 + index,
        intentId: `measured-${index}`,
        kind: 'AdvanceDay',
        role: 'future-player-1',
        sequence: 21 + index,
        latencyMs,
      });
    });
    return runner;
  }

  const healthyObservations = {
    coldCatchUpMs: 900,
    coldCatchUpEvents: 1_000,
    serverMemory: {
      measured: { rssGrowthBytes: 10_000_000, heapGrowthBytes: 4_000_000 },
      catchUp: { rssGrowthBytes: 2_000_000, heapGrowthBytes: 1_000_000 },
      tailBuild: { rssGrowthBytes: 900_000_000, heapGrowthBytes: 500_000_000 },
    },
    contextMemoryGrowthBytes: { 'future-gm': 1_000, 'future-player-1': 2_000 },
    contextHeapBytes: { 'future-gm': { baseline: 5_000, used: 6_000 } },
    peakQueueEnvelopes: 3,
    peakQueueBytes: 4_096,
    maxReplayChunkEvents: 64,
    maxReplayChunkBytes: 100_000,
  };

  it('excludes warm-up commands from the measured population', () => {
    const runner = seeded('run-a', 5_000, new Array(200).fill(10));
    expect(runner.measuredCount).toBe(200);
    expect(runner.percentiles()).toEqual({ p95: 10, p99: 10 });
    expect(runner.evaluate(healthyObservations).passed).toBe(true);
  });

  it('refuses to report on fewer than the committed measured commands', () => {
    const runner = seeded('run-b', 10, new Array(199).fill(10));
    expect(() => runner.percentiles()).toThrow(/INSUFFICIENT_MEASURED/);
  });

  it('fails p95 on its own budget, never on the p99 budget', () => {
    // 400 ms sits between the two budgets. A gate that compared p95
    // against 750 passes this; the letter says p95 is gated at 250.
    const latencies = new Array(200).fill(50);
    latencies.fill(400, 180); // top 10% at 400 ms -> p95 = 400, p99 = 400
    const runner = seeded('run-c', 10, latencies);
    expect(runner.percentiles()).toEqual({ p95: 400, p99: 400 });
    const verdict = runner.evaluate(healthyObservations);
    expect(verdict.passed).toBe(false);
    expect(verdict.failures).toEqual([
      'p95 400ms exceeds 250ms',
      // p99 400ms is inside 750ms and must NOT be reported as a failure.
    ]);
  });

  it('ranks p99 deeper into the tail than p95', () => {
    // EVERY other runner row here feeds a flat distribution, where the
    // 95th and 99th ranks land on the same value - so a percentiles()
    // that computed p99 at the 95th rank would answer correctly by
    // accident in all of them. This row is the one that cannot: the
    // slow tail is five samples wide, which p99 reaches and p95 does
    // not.
    //
    // HAND-COMPUTED over 195 samples at 10 ms then 5 at 900 ms:
    //   p95 -> ceil(0.95 * 200) = rank 190 -> index 189 -> 10
    //   p99 -> ceil(0.99 * 200) = rank 198 -> index 197 -> 900
    const latencies = new Array(200).fill(10);
    latencies.fill(900, 195);
    const runner = seeded('run-tail', 10, latencies);
    expect(runner.percentiles()).toEqual({ p95: 10, p99: 900 });
  });

  it('fails p99 on its own budget while p95 passes', () => {
    // The mirror of the row above it: there, p95 breaks alone; here,
    // p99 does. A gate that read one statistic for both would have to
    // fail both rows or neither.
    //
    // HAND-COMPUTED over 190 samples at 100 ms then 10 at 800 ms:
    //   p95 -> rank 190 -> index 189 -> 100  (inside the 250 ms budget)
    //   p99 -> rank 198 -> index 197 -> 800  (outside the 750 ms budget)
    const latencies = new Array(200).fill(100);
    latencies.fill(800, 190);
    const runner = seeded('run-tail-gate', 10, latencies);
    expect(runner.percentiles()).toEqual({ p95: 100, p99: 800 });
    const verdict = runner.evaluate(healthyObservations);
    expect(verdict.passed).toBe(false);
    expect(verdict.failures).toEqual([
      // p95 100ms is inside 250ms and must NOT be reported as a failure.
      'p99 800ms exceeds 750ms',
    ]);
  });

  it('names every budget it breaks', () => {
    const runner = seeded('run-d', 10, new Array(200).fill(900));
    const verdict = runner.evaluate({
      ...healthyObservations,
      coldCatchUpMs: 2_500,
      serverMemory: {
        measured: {
          rssGrowthBytes: 200_000_000,
          heapGrowthBytes: 100_000_000,
        },
        catchUp: { rssGrowthBytes: 300_000_000, heapGrowthBytes: 1 },
        tailBuild: { rssGrowthBytes: 0, heapGrowthBytes: 0 },
      },
      contextMemoryGrowthBytes: { 'future-gm': 100_000_000 },
      peakQueueEnvelopes: 300,
      peakQueueBytes: 2_000_000,
      maxReplayChunkEvents: 101,
      maxReplayChunkBytes: 600_000,
    });
    expect(verdict.failures).toEqual([
      'p95 900ms exceeds 250ms',
      'p99 900ms exceeds 750ms',
      'cold catch-up 2500ms exceeds 2000ms',
      'replay chunk 101 events exceeds 100',
      'replay chunk 600000 bytes exceeds 524288',
      'queue 300 envelopes exceeds 256',
      'queue 2000000 bytes exceeds 1048576',
      'server memory growth 200000000 bytes exceeds 134217728',
      'catch-up memory growth 300000000 bytes exceeds 134217728',
      'future-gm memory growth 100000000 bytes exceeds 67108864',
    ]);
  });

  it('refuses a cold catch-up measured over too short a tail', () => {
    const runner = seeded('run-e', 10, new Array(200).fill(10));
    const verdict = runner.evaluate({
      ...healthyObservations,
      coldCatchUpEvents: 999,
    });
    expect(verdict.failures).toEqual([
      'cold catch-up covered 999 events, fewer than 1000',
    ]);
  });

  it('archives a report the gate can prove is this run', () => {
    const runner = seeded('run-f', 10, new Array(200).fill(10));
    const report = runner.buildReport(healthyObservations, environment);
    expect(report.runId).toBe('run-f');
    expect(report.measuredSamples).toBe(200);
    expect(report.warmUpSamples).toBe(20);
    expect(report.roles).toEqual(['future-player-1']);
    expect(report.environment).toEqual(environment);
    expect(report.verdict.passed).toBe(true);
    expect(report.memory).toEqual({
      // The tail-build window is nine hundred megabytes and the run
      // still passes: that window is scaffolding beyond the letter's
      // fixture, recorded so it can be read, never gated.
      server: healthyObservations.serverMemory,
      contextGrowthBytes: healthyObservations.contextMemoryGrowthBytes,
      contextHeapBytes: healthyObservations.contextHeapBytes,
      ceilings: CONTROLLED_LOOPBACK_FIXTURE.memoryGrowthCeilingBytes,
    });
    // Round-trips through JSON, because that is what gets archived.
    const parsed: unknown = JSON.parse(JSON.stringify(report));
    expect(runner.assertArchiveIsFresh(parsed)).toBe(true);
  });

  it('rejects an archive left over from another run', () => {
    const stale = seeded('run-old', 10, new Array(200).fill(10)).buildReport(
      healthyObservations,
      environment,
    );
    const current = seeded('run-new', 10, new Array(200).fill(10));
    expect(() =>
      current.assertArchiveIsFresh(JSON.parse(JSON.stringify(stale))),
    ).toThrow(StalePerformanceArchiveError);
  });

  it('rejects an archive that does not describe this run population', () => {
    const runner = seeded('run-g', 10, new Array(200).fill(10));
    const report = runner.buildReport(healthyObservations, environment);
    expect(() =>
      runner.assertArchiveIsFresh({ ...report, measuredSamples: 199 }),
    ).toThrow(/STALE_PERFORMANCE_ARCHIVE/);
  });
});

/**
 * Mutant matrix.
 *
 * Each row is a deliberately wrong implementation of one decision this
 * module makes, plus the named row that kills it. The assertion is
 * two-sided: the real code answers the hand-computed value AND the
 * mutant answers something else, so a row that could not tell them
 * apart is itself a failure.
 */
describe('mutants', () => {
  const environment = {
    node: 'v22.22.0',
    chromium: '140.0.0.0',
    os: 'win32',
    runnerClass: 'controlled-loopback-local',
  };
  const observations = {
    coldCatchUpMs: 900,
    coldCatchUpEvents: 1_000,
    serverMemory: {
      measured: { rssGrowthBytes: 1_000, heapGrowthBytes: 500 },
      catchUp: { rssGrowthBytes: 250, heapGrowthBytes: 125 },
      tailBuild: { rssGrowthBytes: 0, heapGrowthBytes: 0 },
    },
    contextMemoryGrowthBytes: {},
    contextHeapBytes: {},
    peakQueueEnvelopes: 1,
    peakQueueBytes: 1,
    maxReplayChunkEvents: 64,
    maxReplayChunkBytes: 1_000,
  };

  function runnerWith(
    runId: string,
    warmUpLatencyMs: number,
    measured: readonly number[],
  ): ControlledLoopbackPerformanceRunner {
    const runner = new ControlledLoopbackPerformanceRunner(runId);
    for (let ordinal = 0; ordinal < 20; ordinal += 1) {
      runner.record({
        commandOrdinal: ordinal,
        intentId: `w${ordinal}`,
        kind: 'SpendFunds',
        role: 'future-player-2',
        sequence: ordinal + 1,
        latencyMs: warmUpLatencyMs,
      });
    }
    measured.forEach((latencyMs, index) =>
      runner.record({
        commandOrdinal: 20 + index,
        intentId: `m${index}`,
        kind: 'SpendFunds',
        role: 'future-player-2',
        sequence: 21 + index,
        latencyMs,
      }),
    );
    return runner;
  }

  it('MUTANT 1 nearest rank off by one dies on N=20 p95', () => {
    // Mutant: 0-based index floor(p / 100 * N) instead of rank ceil(...).
    const mutant = (values: readonly number[], percentile: number): number => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor((percentile / 100) * sorted.length)] ?? 0;
    };
    expect(nearestRankPercentile(ascending(20), 95)).toBe(19);
    expect(mutant(ascending(20), 95)).toBe(20);
  });

  it('MUTANT 2 warm-up counted as measured dies on 20 slow warm-ups', () => {
    // Mutant: percentiles over every recorded sample. The 20 warm-up
    // commands at 5000 ms are 9% of a 220-sample population, so they own
    // p95 outright and the gate fails a run that is actually healthy.
    const runner = runnerWith('mutant-2', 5_000, new Array(200).fill(10));
    expect(runner.percentiles().p95).toBe(10);
    expect(nearestRankPercentile(runner.allLatencies, 95)).toBe(5_000);
    expect(runner.evaluate(observations).passed).toBe(true);
  });

  it('MUTANT 3 p95 gated on the p99 budget dies on a 400 ms p95', () => {
    const runner = runnerWith('mutant-3', 10, new Array(200).fill(400));
    const { p95 } = runner.percentiles();
    expect(runner.evaluate(observations).passed).toBe(false);
    // The mutant's comparison, spelled out: 400 <= 750 would have passed.
    expect(p95).toBeLessThanOrEqual(
      CONTROLLED_LOOPBACK_FIXTURE.latencyBudgetsMs.p99,
    );
    expect(p95).toBeGreaterThan(
      CONTROLLED_LOOPBACK_FIXTURE.latencyBudgetsMs.p95,
    );
  });

  it('MUTANT 5 p99 computed at the 95th rank dies on a five-sample tail', () => {
    // Mutant: `p99: nearestRankPercentile(latencies, 95)` inside
    // percentiles(). The helper stays correct and every flat-distribution
    // row still passes, because a flat population has the same value at
    // both ranks - which is exactly why this suite needed a population
    // where they differ.
    const latencies = new Array(200).fill(10);
    latencies.fill(900, 195);
    const runner = runnerWith('mutant-5', 10, latencies);
    const { p95, p99 } = runner.percentiles();
    expect([p95, p99]).toEqual([10, 900]);
    // The mutant's answer, spelled out: p99 would have been the p95 value.
    expect(nearestRankPercentile(latencies, 95)).toBe(10);
    expect(p99).not.toBe(nearestRankPercentile(latencies, 95));
    // ...and the budget it would then have passed.
    expect(p99).toBeGreaterThan(
      CONTROLLED_LOOPBACK_FIXTURE.latencyBudgetsMs.p99,
    );
    expect(nearestRankPercentile(latencies, 95)).toBeLessThanOrEqual(
      CONTROLLED_LOOPBACK_FIXTURE.latencyBudgetsMs.p99,
    );
  });

  it('MUTANT 4 gate reads a stale archive dies on a previous run report', () => {
    // Mutant: read the archived JSON and trust it. A run whose pack
    // crashed before writing leaves the PREVIOUS run's green report on
    // disk, and the gate reports that run's numbers as this run's.
    const previous = runnerWith(
      'mutant-4-previous',
      10,
      new Array(200).fill(10),
    );
    const previousReport: unknown = JSON.parse(
      JSON.stringify(previous.buildReport(observations, environment)),
    );
    const current = runnerWith(
      'mutant-4-current',
      10,
      new Array(200).fill(900),
    );
    // The mutant: trusting the file's own verdict.
    expect(
      (previousReport as { verdict: { passed: boolean } }).verdict.passed,
    ).toBe(true);
    // The real check: this run refuses to accept it.
    expect(() => current.assertArchiveIsFresh(previousReport)).toThrow(
      StalePerformanceArchiveError,
    );
  });
});
