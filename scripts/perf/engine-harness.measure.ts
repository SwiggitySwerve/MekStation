/**
 * Timing, heap, call-count and CPU-profile helpers for the engine harness.
 *
 * Call counts come from V8 precise coverage (`callCount: true`), read over an
 * in-process inspector session, so no product function is wrapped or patched.
 * Counting runs in its own pass: precise coverage can slow the code it counts,
 * so no timed sample ever runs with it switched on.
 */

import { Session } from 'node:inspector/promises';
import { performance } from 'node:perf_hooks';

export type TimeUnit = 'ms' | 'us';

export interface IResultRow {
  readonly scenario: string;
  readonly action: string;
  readonly unit: TimeUnit;
  readonly count: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  readonly heapDeltaBytes: number;
  readonly stateBytes: number;
  readonly eventCount: number;
  readonly extra?: Readonly<Record<string, number | string | boolean>>;
}

export function nowMs(): number {
  return performance.now();
}

/** Nearest-rank percentile over an unsorted sample. */
export function percentile(samples: readonly number[], p: number): number {
  if (samples.length === 0) return Number.NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

function round(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : value;
}

export function collectGarbage(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (gc) gc();
}

export function heapUsed(): number {
  return process.memoryUsage().heapUsed;
}

export function summarize(
  base: {
    scenario: string;
    action: string;
    unit?: TimeUnit;
    heapDeltaBytes: number;
    stateBytes: number;
    eventCount: number;
    extra?: Readonly<Record<string, number | string | boolean>>;
  },
  samples: readonly number[],
): IResultRow {
  return {
    scenario: base.scenario,
    action: base.action,
    unit: base.unit ?? 'ms',
    count: samples.length,
    p50: round(percentile(samples, 50)),
    p95: round(percentile(samples, 95)),
    max: round(samples.length === 0 ? Number.NaN : Math.max(...samples)),
    heapDeltaBytes: base.heapDeltaBytes,
    stateBytes: base.stateBytes,
    eventCount: base.eventCount,
    ...(base.extra ? { extra: base.extra } : {}),
  };
}

let inspector: Session | null = null;

async function inspectorSession(): Promise<Session> {
  if (inspector) return inspector;
  inspector = new Session();
  inspector.connect();
  await inspector.post('Profiler.enable');
  return inspector;
}

export interface ICallTarget {
  /** Label in the output, e.g. `findPath`. */
  readonly label: string;
  /** Function name as V8 reports it. */
  readonly functionName: string;
  /** Substring of the script URL that owns the function. */
  readonly urlIncludes: string;
}

/**
 * Run `fn` once with precise coverage on and return how many times each
 * target function was invoked during it.
 */
export async function countCalls<T>(
  targets: readonly ICallTarget[],
  fn: () => T | Promise<T>,
): Promise<{ result: T; counts: Record<string, number> }> {
  const session = await inspectorSession();
  await session.post('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: false,
  });
  // Taking coverage resets the counters, so everything before `fn` is dropped.
  await session.post('Profiler.takePreciseCoverage');
  const result = await fn();
  const coverage = await session.post('Profiler.takePreciseCoverage');
  await session.post('Profiler.stopPreciseCoverage');
  const counts: Record<string, number> = {};
  for (const target of targets) counts[target.label] = 0;
  for (const script of coverage.result) {
    for (const target of targets) {
      if (!script.url.includes(target.urlIncludes)) continue;
      // The bundler's export getter (`findPath: () => findPath`) carries the
      // same inferred name and counts every cross-module access, so only the
      // widest function of that name in the script, its body, is counted.
      let body: { span: number; count: number } | null = null;
      for (const fnCoverage of script.functions) {
        if (fnCoverage.functionName !== target.functionName) continue;
        const range = fnCoverage.ranges[0];
        if (!range) continue;
        const span = range.endOffset - range.startOffset;
        if (!body || span > body.span) body = { span, count: range.count };
      }
      counts[target.label] += body?.count ?? 0;
    }
  }
  return { result, counts };
}

export async function startCpuProfile(): Promise<void> {
  const session = await inspectorSession();
  await session.post('Profiler.setSamplingInterval', { interval: 1000 });
  await session.post('Profiler.start');
}

export interface ISelfFrame {
  readonly functionName: string;
  readonly location: string;
  readonly selfMs: number;
  readonly selfPercent: number;
}

/** Stop the profiler; return the raw profile and its top self-time frames. */
export async function stopCpuProfile(top = 10): Promise<{
  profile: unknown;
  topSelf: ISelfFrame[];
}> {
  const session = await inspectorSession();
  const { profile } = await session.post('Profiler.stop');
  const intervalMs =
    (profile.endTime - profile.startTime) /
    1000 /
    Math.max(1, profile.samples?.length ?? 1);
  const byFrame = new Map<
    string,
    { name: string; loc: string; hits: number }
  >();
  let totalHits = 0;
  for (const node of profile.nodes) {
    const hits = node.hitCount ?? 0;
    if (hits === 0) continue;
    const frame = node.callFrame;
    const loc = `${frame.url.replace(/^file:\/\/\//, '')}:${frame.lineNumber + 1}`;
    const key = `${frame.functionName}@${loc}`;
    const entry = byFrame.get(key) ?? {
      name: frame.functionName || '(anonymous)',
      loc,
      hits: 0,
    };
    entry.hits += hits;
    byFrame.set(key, entry);
    totalHits += hits;
  }
  const topSelf = [...byFrame.values()]
    .sort((a, b) => b.hits - a.hits)
    .slice(0, top)
    .map((entry) => ({
      functionName: entry.name,
      location: entry.loc,
      selfMs: round(entry.hits * intervalMs),
      selfPercent: round((100 * entry.hits) / Math.max(1, totalHits)),
    }));
  return { profile, topSelf };
}
