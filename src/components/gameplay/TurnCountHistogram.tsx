/**
 * TurnCountHistogram — bar chart of Monte Carlo turn-count distribution.
 *
 * Buckets `samples` into 2-turn bins across `[stats.min, stats.max]` and
 * draws a row of bars. Overlays:
 *   - solid vertical line at `stats.mean`
 *   - dashed vertical line at `stats.median`
 *   - shaded band between `stats.p25` and `stats.p75`
 *   - labeled marker at `stats.p90`
 *
 * The component never receives the raw turn samples (those are not on
 * `IBatchResult` per spec). Instead it derives a deterministic, evenly
 * weighted bucket profile from the percentile stats — sufficient for a
 * "shape-of-distribution" cue without inflating the result payload. A
 * visually hidden `<table>` lists the bucket counts as a screen-reader
 * fallback.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */

import React, { useMemo } from 'react';

import type { IBatchTurnCount } from '@/simulation/batchOutcome';

// =============================================================================
// Types
// =============================================================================

export interface TurnCountHistogramProps {
  /** Stats reduced from a Quick Resolve batch. */
  stats: IBatchTurnCount;
  /** Number of successful runs that produced these stats. */
  successfulRuns: number;
  /** Optional className for layout containers. */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build 2-turn buckets from the percentile stats.
 *
 * We have `min, p25, median (p50), p75, p90, max` — six anchor points
 * spanning the distribution. Map each anchor back to its target
 * cumulative count, then derive per-bucket counts so the bars roughly
 * trace the implied CDF. This is intentionally an approximation — the
 * result panel docs callout that the histogram is a shape cue, not a
 * raw-sample chart.
 */
function buildBuckets(
  stats: IBatchTurnCount,
  successfulRuns: number,
): readonly {
  readonly start: number;
  readonly end: number;
  readonly count: number;
}[] {
  const span = stats.max - stats.min;
  if (span <= 0 || successfulRuns < 2) {
    return [{ start: stats.min, end: stats.min + 2, count: successfulRuns }];
  }

  // 2-turn-wide buckets, inclusive of `min` and stretching to cover `max`.
  const bucketSize = 2;
  const bucketCount = Math.max(1, Math.ceil((span + 1) / bucketSize));

  // Anchor points (turn → cumulative-count fraction). p25 is the 25th
  // percentile, etc. We include min (0) and max (1.0) explicitly.
  const anchors: readonly { readonly turn: number; readonly cum: number }[] = [
    { turn: stats.min, cum: 0 },
    { turn: stats.p25, cum: 0.25 },
    { turn: stats.median, cum: 0.5 },
    { turn: stats.p75, cum: 0.75 },
    { turn: stats.p90, cum: 0.9 },
    { turn: stats.max, cum: 1 },
  ];

  // Linear interpolation between the surrounding anchors at any turn x.
  function cdfAt(turn: number): number {
    if (turn <= anchors[0]!.turn) return 0;
    if (turn >= anchors[anchors.length - 1]!.turn) return 1;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1]!;
      const b = anchors[i]!;
      if (turn <= b.turn) {
        const denom = b.turn - a.turn;
        const t = denom === 0 ? 0 : (turn - a.turn) / denom;
        return a.cum + (b.cum - a.cum) * t;
      }
    }
    return 1;
  }

  // Derive per-bucket counts: bucket count = (CDF(end) - CDF(start)) * N.
  // Round to integers but reconcile residuals so totals equal successfulRuns.
  const buckets: { start: number; end: number; count: number }[] = [];
  let runningRoundedTotal = 0;
  for (let b = 0; b < bucketCount; b++) {
    const start = stats.min + b * bucketSize;
    const end = start + bucketSize;
    const fraction = cdfAt(end) - cdfAt(start);
    // Last bucket absorbs the residual to guarantee totals match.
    let count = Math.round(fraction * successfulRuns);
    if (b === bucketCount - 1) {
      count = successfulRuns - runningRoundedTotal;
    } else {
      runningRoundedTotal += count;
    }
    buckets.push({ start, end, count: Math.max(0, count) });
  }

  return buckets;
}

/** Convert a turn value to a 0-100 horizontal position % within the chart. */
function turnToPercent(turn: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  const pct = ((turn - min) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}

// =============================================================================
// Component
// =============================================================================

/**
 * Histogram + percentile overlay for the Quick Resolve result panel.
 */
export function TurnCountHistogram({
  stats,
  successfulRuns,
  className = '',
}: TurnCountHistogramProps): React.ReactElement {
  const buckets = useMemo(
    () => buildBuckets(stats, successfulRuns),
    [stats, successfulRuns],
  );

  if (successfulRuns < 2) {
    return (
      <div
        className={`rounded-md border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400 ${className}`}
        data-testid="turn-count-histogram-empty"
      >
        Not enough data
      </div>
    );
  }

  const maxBucketCount = Math.max(...buckets.map((b) => b.count), 1);
  const meanPct = turnToPercent(stats.mean, stats.min, stats.max);
  const medianPct = turnToPercent(stats.median, stats.min, stats.max);
  const p25Pct = turnToPercent(stats.p25, stats.min, stats.max);
  const p75Pct = turnToPercent(stats.p75, stats.min, stats.max);
  const p90Pct = turnToPercent(stats.p90, stats.min, stats.max);

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      data-testid="turn-count-histogram"
    >
      <div
        className="relative h-32 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900/40"
        role="img"
        aria-label={`Turn count distribution: mean ${stats.mean.toFixed(1)}, median ${stats.median.toFixed(1)}, range ${stats.min}-${stats.max}`}
      >
        {/* p25-p75 shaded band */}
        <div
          className="absolute inset-y-0 bg-blue-500/15"
          style={{
            left: `${p25Pct}%`,
            width: `${Math.max(0, p75Pct - p25Pct)}%`,
          }}
          data-testid="turn-count-histogram-iqr"
        />

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-px px-1 pb-1">
          {buckets.map((bucket, i) => {
            const heightPct = (bucket.count / maxBucketCount) * 100;
            return (
              <div
                key={`${bucket.start}-${i}`}
                className="flex-1 rounded-sm bg-blue-500/70"
                style={{ height: `${heightPct}%` }}
                title={`Turns ${bucket.start}-${bucket.end - 1}: ${bucket.count}`}
                data-testid={`turn-count-bar-${i}`}
              />
            );
          })}
        </div>

        {/* Mean — solid vertical line */}
        <div
          className="absolute inset-y-0 w-px bg-amber-400"
          style={{ left: `${meanPct}%` }}
          data-testid="turn-count-mean-line"
          aria-hidden
        />

        {/* Median — dashed vertical line (built via repeating gradient) */}
        <div
          className="absolute inset-y-0 w-px"
          style={{
            left: `${medianPct}%`,
            backgroundImage:
              'repeating-linear-gradient(to bottom, #22d3ee 0, #22d3ee 4px, transparent 4px, transparent 8px)',
          }}
          data-testid="turn-count-median-line"
          aria-hidden
        />

        {/* p90 marker — small notch + label above the chart */}
        <div
          className="absolute -top-1 flex flex-col items-center"
          style={{ left: `${p90Pct}%`, transform: 'translateX(-50%)' }}
          data-testid="turn-count-p90-marker"
        >
          <span className="rounded bg-purple-600 px-1 py-0.5 text-[10px] font-semibold text-white">
            p90
          </span>
        </div>
      </div>

      {/* Legend + axis labels */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Turn {stats.min}</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-amber-400" /> Mean{' '}
            {stats.mean.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-cyan-400" /> Median{' '}
            {stats.median.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-blue-400/40" /> p25-p75
          </span>
        </div>
        <span>Turn {stats.max}</span>
      </div>

      {/* Screen-reader-only table fallback per spec § Histogram a11y */}
      <table className="sr-only" data-testid="turn-count-histogram-table">
        <caption>Turn count distribution buckets</caption>
        <thead>
          <tr>
            <th scope="col">Turn range</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket, i) => (
            <tr key={`sr-${bucket.start}-${i}`}>
              <td>
                {bucket.start}-{bucket.end - 1}
              </td>
              <td>{bucket.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TurnCountHistogram;
