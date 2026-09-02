/**
 * Controlled loopback performance fixture (harden-gm-two-player-campaign-sessions 23.1, 23.2).
 *
 * The umbrella's performance letter is unusual: it gates on numbers, and
 * a number is only worth gating on if the way it was produced is fixed
 * in advance. So the configuration lives HERE, committed, rather than
 * inside the browser pack that happens to run it -
 *
 *   - the warm-up size and the measured population size, so a run cannot
 *     quietly shrink its sample until the tail behaves;
 *   - the representative command mix, named as real CampaignIntent kinds
 *     the GM authority commits, so "representative" is checkable;
 *   - nearest-rank percentiles, so p95 means one thing across runs;
 *   - the chunk, queue, and memory ceilings, mirrored against the
 *     product constants they bound;
 *   - and the budgets themselves, each compared against its OWN
 *     threshold.
 *
 * Two failure modes this module exists to make impossible: a p95 quietly
 * measured against the p99 budget (which passes almost anything), and a
 * gate reading an archive some earlier run left on disk (which passes
 * everything). Both look green from the pack.
 *
 * The 2,000 ms Playwright wait that appears in the pack is a FUNCTIONAL
 * timeout - the point at which the harness gives up waiting for a frame -
 * and is never the latency gate. The gate is `evaluate` below.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md (Strict Performance UX Evidence and Hygiene Catalog)
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (23.1, 23.2)
 */

/** Campaign command kinds the controlled runner issues. */
export type ControlledCommandKind =
  | 'AdvanceDay'
  | 'AllocateSalvage'
  | 'SpendFunds';

/**
 * The committed fixture configuration.
 *
 * Frozen and compared whole by unit test: a change to any number here is
 * a deliberate edit to the acceptance contract, not a tuning knob the
 * pack can reach for when a run is close to a budget.
 */
export const CONTROLLED_LOOPBACK_FIXTURE = Object.freeze({
  /** Named runner class the evidence manifest records. */
  runnerClass: 'ControlledLoopbackPerformanceRunner',
  /** Commands issued before measurement starts (JIT, first paint, cache). */
  warmUpCommands: 20,
  /** Floor on the measured population; a shorter run cannot be reported. */
  minimumMeasuredCommands: 200,
  /**
   * The representative mix, cycled in order. Every member is a real
   * `CampaignIntent` the GM authority commits through the production
   * co-op surface - `SpendFunds` is the kind the shipped proposal pack
   * drives, `AdvanceDay` and `AllocateSalvage` are the two other
   * always-valid host intents. `RemoveParticipant` is deliberately out:
   * it would revoke the fixture's own membership mid-run.
   */
  representativeCommandMix: Object.freeze([
    'AdvanceDay',
    'AllocateSalvage',
    'SpendFunds',
  ]) as readonly ControlledCommandKind[],
  latencyBudgetsMs: Object.freeze({ p95: 250, p99: 750 }),
  coldCatchUp: Object.freeze({ events: 1_000, budgetMs: 2_000 }),
  /** Ceilings the product's replay chunking must stay inside. */
  replayChunk: Object.freeze({ maxEvents: 100, maxBytes: 512 * 1_024 }),
  /** Ceilings the per-connection outbound queue must stay inside. */
  connectionQueue: Object.freeze({
    maxEnvelopes: 256,
    maxBytes: 1_024 * 1_024,
  }),
  memoryGrowthCeilingBytes: Object.freeze({
    server: 128 * 1_024 * 1_024,
    browserContext: 64 * 1_024 * 1_024,
  }),
  /** Functional timeout only - NOT a latency budget. */
  functionalWaitMs: 2_000,
});

/** One paired clock reading: a wall stamp and a monotonic stamp. */
export interface IClockAnchor {
  readonly wallMs: number;
  readonly monotonicMs: number;
}

/** A fixed offset that maps browser monotonic time onto server monotonic time. */
export interface IClockCorrelation {
  readonly offsetMs: number;
  readonly toServerMonotonicMs: (clientMonotonicMs: number) => number;
}

/**
 * Correlates two monotonic clocks from a single paired reading.
 *
 * Neither `performance.now()` nor `process.hrtime()` is comparable
 * across processes, and wall clocks are not monotonic. So each side
 * measures ELAPSED time on its own monotonic source and exactly one
 * offset crosses the boundary: taken once, post-warm-up, from a paired
 * (wall, monotonic) reading on each side. Both processes are on the same
 * host and read the same OS wall clock, which is what makes the pairing
 * meaningful; a distributed variant of this fixture would need a real
 * clock-sync protocol instead.
 */
export function correlateClocks(
  server: IClockAnchor,
  client: IClockAnchor,
): IClockCorrelation {
  // Where the client's anchor sits on the server's monotonic timeline.
  const clientAnchorOnServer =
    server.monotonicMs + (client.wallMs - server.wallMs);
  const offsetMs = clientAnchorOnServer - client.monotonicMs;
  return {
    offsetMs,
    toServerMonotonicMs: (clientMonotonicMs) => clientMonotonicMs + offsetMs,
  };
}

/**
 * Nearest-rank percentile: the value at 1-based rank `ceil(p/100 * N)`
 * of the sorted population.
 *
 * Nearest rank rather than an interpolating definition because the
 * letter says so, and because it always returns an OBSERVED sample - an
 * interpolated p95 is a number no command actually took.
 */
export function nearestRankPercentile(
  values: readonly number[],
  percentile: number,
): number {
  if (values.length === 0) {
    throw new Error('EMPTY_POPULATION nearest-rank percentile of no samples');
  }
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((percentile / 100) * sorted.length);
  const index = Math.min(Math.max(rank, 1), sorted.length) - 1;
  // Non-null: index is clamped into [0, length - 1] and length > 0.
  return sorted[index] as number;
}

/** One measured command: what was issued, and how long it took to be seen. */
export interface IControlledLatencySample {
  /** 0-based issue order; ordinals below the warm-up size are warm-up. */
  readonly commandOrdinal: number;
  readonly intentId: string;
  readonly kind: ControlledCommandKind;
  /** Observing context, so a per-role population can be gated separately. */
  readonly role: string;
  /** Host-assigned campaign sequence this command committed. */
  readonly sequence: number;
  /** Accepted-command to eligible-render, on the correlated clocks. */
  readonly latencyMs: number;
}

/** Everything the pack measures that is not a per-command latency. */
export interface IControlledObservations {
  readonly coldCatchUpMs: number;
  readonly coldCatchUpEvents: number;
  /**
   * Server memory growth, split by WINDOW.
   *
   * The letter's ceiling is growth "above the post-warm-up baseline" for
   * a fixture of 20 warm-up plus at least 200 measured commands, and
   * E2E-73 separately requires the cold catch-up to stay within memory
   * limits. Those are the two gated windows. Building a 1,000-event log
   * needs hundreds of commands BEYOND the fixture, and that scaffolding
   * is neither window - so its growth is recorded rather than gated,
   * where it can be read as the finding it is instead of failing a
   * budget that was never written about it.
   *
   * Resident set is what the ceiling names and what is gated; heap
   * travels alongside because an RSS number alone cannot separate
   * retained state from the runtime's own arenas.
   */
  readonly serverMemory: {
    readonly measured: {
      readonly rssGrowthBytes: number;
      readonly heapGrowthBytes: number;
    };
    readonly catchUp: {
      readonly rssGrowthBytes: number;
      readonly heapGrowthBytes: number;
    };
    readonly tailBuild: {
      readonly rssGrowthBytes: number;
      readonly heapGrowthBytes: number;
    };
  };
  readonly contextMemoryGrowthBytes: Readonly<Record<string, number>>;
  /** Absolute per-context heap, so a zero growth is not a silent zero. */
  readonly contextHeapBytes: Readonly<
    Record<string, { readonly baseline: number; readonly used: number }>
  >;
  readonly peakQueueEnvelopes: number;
  readonly peakQueueBytes: number;
  readonly maxReplayChunkEvents: number;
  readonly maxReplayChunkBytes: number;
}

/** The recorded environment the budgets are declared to gate. */
export interface IControlledEnvironment {
  readonly node: string;
  readonly chromium: string;
  readonly os: string;
  readonly runnerClass: string;
}

export interface IControlledVerdict {
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly p95: number;
  readonly p99: number;
}

export interface IControlledReport {
  readonly runId: string;
  readonly fixture: typeof CONTROLLED_LOOPBACK_FIXTURE;
  readonly environment: IControlledEnvironment;
  /**
   * SAMPLES, not commands. Each command is observed once per measuring
   * context, so a 200-command measured set observed by two guests is 400
   * samples - and calling that field `measuredCommands` would overstate
   * the run by the number of contexts watching it.
   */
  readonly warmUpSamples: number;
  readonly measuredSamples: number;
  /** Contexts whose observations make up those samples. */
  readonly roles: readonly string[];
  readonly latency: {
    readonly p95: number;
    readonly p99: number;
    readonly minMs: number;
    readonly maxMs: number;
    readonly samples: readonly IControlledLatencySample[];
  };
  readonly memory: {
    readonly server: IControlledObservations['serverMemory'];
    readonly contextGrowthBytes: Readonly<Record<string, number>>;
    readonly contextHeapBytes: Readonly<
      Record<string, { readonly baseline: number; readonly used: number }>
    >;
    readonly ceilings: typeof CONTROLLED_LOOPBACK_FIXTURE.memoryGrowthCeilingBytes;
  };
  readonly coldCatchUp: {
    readonly elapsedMs: number;
    readonly events: number;
  };
  readonly queue: {
    readonly peakEnvelopes: number;
    readonly peakBytes: number;
  };
  readonly replayChunk: {
    readonly maxEvents: number;
    readonly maxBytes: number;
  };
  readonly verdict: IControlledVerdict;
}

/** Thrown when an archived report does not describe the run reading it. */
export class StalePerformanceArchiveError extends Error {
  public constructor(detail: string) {
    super(`STALE_PERFORMANCE_ARCHIVE ${detail}`);
    this.name = 'StalePerformanceArchiveError';
  }
}

/**
 * The named runner class the evidence manifest records.
 *
 * It owns the three decisions that make the gate falsifiable: which
 * samples count (measured only), which threshold each statistic is
 * compared against (its own), and whether an archived report belongs to
 * this run (checked, not assumed).
 */
export class ControlledLoopbackPerformanceRunner {
  private readonly samples: IControlledLatencySample[] = [];

  public constructor(
    public readonly runId: string,
    public readonly config = CONTROLLED_LOOPBACK_FIXTURE,
  ) {}

  /**
   * Builds one representative intent.
   *
   * Static because the pack needs the command shapes before any sample
   * exists, and because the unit suite parses each one through the
   * product's own boundary parser to prove the mix is real.
   */
  public static buildIntent(
    kind: ControlledCommandKind,
    campaignId: string,
    ordinal: number,
  ): Record<string, unknown> {
    const intentId = `perf-${kind}-${ordinal}`;
    if (kind === 'AdvanceDay') {
      return { kind, campaignId, intentId, payload: { days: 1 } };
    }
    if (kind === 'AllocateSalvage') {
      // ZERO, deliberately. `AllocateSalvage` DRAWS from the salvage
      // pool and the authority rejects `value > salvagePool`
      // ('insufficient-salvage'), so any positive draw against a
      // freshly-created campaign - whose pool is empty until a battle
      // resolves - is refused and commits nothing. MEASURED: the first
      // live run of this pack died on exactly that, at warm-up command
      // one. A zero draw is still a real accepted command committing a
      // `SalvageAllocated` event, which is what the runner times.
      return { kind, campaignId, intentId, payload: { value: 0 } };
    }
    return {
      kind,
      campaignId,
      intentId,
      payload: { amount: 1, reason: `controlled-loopback-${ordinal}` },
    };
  }

  /** The kind issued at a given 0-based ordinal, cycling the committed mix. */
  public kindForOrdinal(ordinal: number): ControlledCommandKind {
    const mix = this.config.representativeCommandMix;
    // Non-null: `mix` is non-empty and the index is a modulus of its length.
    return mix[ordinal % mix.length] as ControlledCommandKind;
  }

  /** Records one issued command's observed latency. */
  public record(sample: IControlledLatencySample): void {
    this.samples.push(sample);
  }

  /** Warm-up commands are recorded for evidence and excluded from the gate. */
  private get measured(): readonly IControlledLatencySample[] {
    return this.samples.filter(
      (sample) => sample.commandOrdinal >= this.config.warmUpCommands,
    );
  }

  public get measuredCount(): number {
    return this.measured.length;
  }

  /** Every latency including warm-up - evidence only, never the gate. */
  public get allLatencies(): readonly number[] {
    return this.samples.map((sample) => sample.latencyMs);
  }

  /**
   * Nearest-rank p95 and p99 over the MEASURED population.
   *
   * Refuses a short run rather than reporting a percentile of whatever
   * arrived: a p95 of 40 samples is not the statistic the letter gates.
   */
  public percentiles(): { readonly p95: number; readonly p99: number } {
    const latencies = this.measured.map((sample) => sample.latencyMs);
    if (latencies.length < this.config.minimumMeasuredCommands) {
      throw new Error(
        `INSUFFICIENT_MEASURED ${latencies.length} < ${this.config.minimumMeasuredCommands}`,
      );
    }
    return {
      p95: nearestRankPercentile(latencies, 95),
      p99: nearestRankPercentile(latencies, 99),
    };
  }

  /**
   * The gate. Every statistic is compared against its OWN budget and
   * every breach is named, so a failing run reports what it broke
   * instead of a bare false.
   */
  public evaluate(observations: IControlledObservations): IControlledVerdict {
    const { p95, p99 } = this.percentiles();
    const budgets = this.config.latencyBudgetsMs;
    const failures: string[] = [];
    if (p95 > budgets.p95)
      failures.push(`p95 ${p95}ms exceeds ${budgets.p95}ms`);
    if (p99 > budgets.p99)
      failures.push(`p99 ${p99}ms exceeds ${budgets.p99}ms`);
    if (observations.coldCatchUpMs > this.config.coldCatchUp.budgetMs) {
      failures.push(
        `cold catch-up ${observations.coldCatchUpMs}ms exceeds ${this.config.coldCatchUp.budgetMs}ms`,
      );
    }
    if (observations.coldCatchUpEvents < this.config.coldCatchUp.events) {
      // A catch-up measured over a short tail is fast for the wrong
      // reason; the letter names a 1,000-event tail.
      failures.push(
        `cold catch-up covered ${observations.coldCatchUpEvents} events, fewer than ${this.config.coldCatchUp.events}`,
      );
    }
    if (observations.maxReplayChunkEvents > this.config.replayChunk.maxEvents) {
      failures.push(
        `replay chunk ${observations.maxReplayChunkEvents} events exceeds ${this.config.replayChunk.maxEvents}`,
      );
    }
    if (observations.maxReplayChunkBytes > this.config.replayChunk.maxBytes) {
      failures.push(
        `replay chunk ${observations.maxReplayChunkBytes} bytes exceeds ${this.config.replayChunk.maxBytes}`,
      );
    }
    if (
      observations.peakQueueEnvelopes > this.config.connectionQueue.maxEnvelopes
    ) {
      failures.push(
        `queue ${observations.peakQueueEnvelopes} envelopes exceeds ${this.config.connectionQueue.maxEnvelopes}`,
      );
    }
    if (observations.peakQueueBytes > this.config.connectionQueue.maxBytes) {
      failures.push(
        `queue ${observations.peakQueueBytes} bytes exceeds ${this.config.connectionQueue.maxBytes}`,
      );
    }
    const ceilings = this.config.memoryGrowthCeilingBytes;
    const measuredGrowth = observations.serverMemory.measured.rssGrowthBytes;
    if (measuredGrowth > ceilings.server) {
      failures.push(
        `server memory growth ${measuredGrowth} bytes exceeds ${ceilings.server}`,
      );
    }
    // E2E-73: the catch-up itself must stay within memory limits.
    const catchUpGrowth = observations.serverMemory.catchUp.rssGrowthBytes;
    if (catchUpGrowth > ceilings.server) {
      failures.push(
        `catch-up memory growth ${catchUpGrowth} bytes exceeds ${ceilings.server}`,
      );
    }
    for (const [role, growth] of Object.entries(
      observations.contextMemoryGrowthBytes,
    )) {
      if (growth > ceilings.browserContext) {
        failures.push(
          `${role} memory growth ${growth} bytes exceeds ${ceilings.browserContext}`,
        );
      }
    }
    return { passed: failures.length === 0, failures, p95, p99 };
  }

  /** The JSON archived beside the run, carrying its own provenance. */
  public buildReport(
    observations: IControlledObservations,
    environment: IControlledEnvironment,
  ): IControlledReport {
    const measured = this.measured;
    const latencies = measured.map((sample) => sample.latencyMs);
    const { p95, p99 } = this.percentiles();
    return {
      runId: this.runId,
      fixture: this.config,
      environment,
      warmUpSamples: this.samples.length - measured.length,
      measuredSamples: measured.length,
      roles: Array.from(
        new Set(this.samples.map((sample) => sample.role)),
      ).sort(),
      latency: {
        p95,
        p99,
        minMs: Math.min(...latencies),
        maxMs: Math.max(...latencies),
        samples: [...this.samples],
      },
      memory: {
        server: observations.serverMemory,
        contextGrowthBytes: observations.contextMemoryGrowthBytes,
        contextHeapBytes: observations.contextHeapBytes,
        ceilings: this.config.memoryGrowthCeilingBytes,
      },
      coldCatchUp: {
        elapsedMs: observations.coldCatchUpMs,
        events: observations.coldCatchUpEvents,
      },
      queue: {
        peakEnvelopes: observations.peakQueueEnvelopes,
        peakBytes: observations.peakQueueBytes,
      },
      replayChunk: {
        maxEvents: observations.maxReplayChunkEvents,
        maxBytes: observations.maxReplayChunkBytes,
      },
      verdict: this.evaluate(observations),
    };
  }

  /**
   * Proves an archived report describes THIS run before anything reads
   * its verdict.
   *
   * A pack that crashes before writing leaves the previous run's report
   * in place, and every field in it is plausible. The run id and the
   * measured population size are what make the difference detectable.
   */
  public assertArchiveIsFresh(archive: unknown): true {
    if (typeof archive !== 'object' || archive === null) {
      throw new StalePerformanceArchiveError('archive is not an object');
    }
    const record = archive as Record<string, unknown>;
    if (record.runId !== this.runId) {
      throw new StalePerformanceArchiveError(
        `runId=${String(record.runId)} expected=${this.runId}`,
      );
    }
    if (record.measuredSamples !== this.measuredCount) {
      throw new StalePerformanceArchiveError(
        `measuredSamples=${String(record.measuredSamples)} expected=${this.measuredCount}`,
      );
    }
    return true;
  }
}
