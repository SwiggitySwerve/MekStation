/**
 * QuickSimResultPanel — full result display for a Quick Resolve batch.
 *
 * Renders the four sections from the spec:
 *   1. "Most Likely Outcome" headline + win-probability stacked bar
 *   2. Turn-count histogram with mean/median/p25-p75/p90 overlays
 *   3. Casualty breakdown — two columns (Player / Opponent) with
 *      mech-destroyed and heat-shutdown frequencies, plus per-unit
 *      survival rows sorted descending by survival rate
 *   4. Collapsible "Raw Data" block with totalRuns, erroredRuns,
 *      baseSeed, and a "Copy seed" button
 *
 * Optional `partial` flag renders a "Partial results (cancelled)"
 * banner above the headline. Optional `onRerun` adds a rerun button to
 * the header. Optional `unitMeta` enriches the per-unit survival rows
 * with human designations and side ownership; without it the rows fall
 * back to the unit id and merge under "Player" by default.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */
import React, { useMemo } from 'react';

import { Button } from '@/components/ui';

import type { QuickSimResultPanelProps } from './QuickSimResultPanel.types';

import {
  buildSurvivalRows,
  CasualtyColumn,
} from './QuickSimResultPanel.casualties';
import { RawDataSection } from './QuickSimResultPanel.rawData';
import {
  buildHeadline,
  WinProbabilityBar,
  pct,
} from './QuickSimResultPanel.summary';
import { TurnCountHistogram } from './TurnCountHistogram';

// =============================================================================
// Main component
// =============================================================================

/**
 * Full Quick Resolve result panel. See file-level JSDoc for behavior
 * map. Designed to be embedded in either the dedicated `sim.tsx` route
 * or the launcher modal once the batch settles.
 */
export function QuickSimResultPanel({
  result,
  unitMeta,
  partial = false,
  onRerun,
  onRunBatch,
  className = '',
}: QuickSimResultPanelProps): React.ReactElement {
  const survivalRows = useMemo(
    () => buildSurvivalRows(result, unitMeta),
    [result, unitMeta],
  );

  // ---- Empty state (totalRuns === 0) --------------------------------------
  if (result.totalRuns === 0) {
    return (
      <div
        className={`border-border-theme bg-surface-deep/20 flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center ${className}`}
        data-testid="quick-sim-result-panel-empty"
      >
        <p className="text-text-theme-secondary text-sm">
          Run a batch to see outcome distribution
        </p>
        {onRunBatch && (
          <Button
            variant="primary"
            onClick={onRunBatch}
            data-testid="quick-sim-run-batch-cta"
          >
            Run Batch
          </Button>
        )}
      </div>
    );
  }

  const successfulRuns = result.totalRuns - result.erroredRuns;
  const headline = buildHeadline(result);

  return (
    <section
      className={`border-border-theme bg-surface-deep/40 flex flex-col gap-6 rounded-lg border p-6 ${className}`}
      data-testid="quick-sim-result-panel"
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Quick Resolve: {result.totalRuns} runs
          </h2>
          {result.erroredRuns > 0 && (
            <p className="text-xs text-amber-400">
              {result.erroredRuns} errored — probabilities computed over{' '}
              {successfulRuns} successful runs
            </p>
          )}
        </div>
        {onRerun && (
          <Button
            variant="secondary"
            onClick={onRerun}
            data-testid="quick-sim-rerun-btn"
          >
            Rerun
          </Button>
        )}
      </header>

      {/* Partial banner (cancelled batch) */}
      {partial && (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-900/20 px-4 py-2 text-sm text-amber-200"
          data-testid="quick-sim-partial-banner"
          role="status"
        >
          Partial results (cancelled)
        </div>
      )}

      {/* Section 1: Most Likely Outcome + Win Probability */}
      <section
        className="flex flex-col gap-3"
        aria-labelledby="qsr-win-prob-heading"
      >
        <h3
          id="qsr-win-prob-heading"
          className="text-text-theme-primary text-base font-semibold"
          data-testid="quick-sim-headline"
        >
          {headline}
        </h3>
        <div className="text-text-theme-secondary text-xs tracking-wider uppercase">
          Win Probability
        </div>
        <WinProbabilityBar result={result} />
        <div className="text-text-theme-secondary flex justify-between text-xs">
          <span>Player {pct(result.winProbability.player)}</span>
          <span>Draw {pct(result.winProbability.draw)}</span>
          <span>Opponent {pct(result.winProbability.opponent)}</span>
        </div>
      </section>

      {/* Section 2: Turn Count */}
      <section
        className="flex flex-col gap-3"
        aria-labelledby="qsr-turn-count-heading"
      >
        <h3
          id="qsr-turn-count-heading"
          className="text-text-theme-primary text-base font-semibold"
        >
          Turn Count
        </h3>
        <TurnCountHistogram
          stats={result.turnCount}
          successfulRuns={successfulRuns}
        />
      </section>

      {/* Section 3: Casualties */}
      <section
        className="flex flex-col gap-3"
        aria-labelledby="qsr-casualties-heading"
      >
        <h3
          id="qsr-casualties-heading"
          className="text-text-theme-primary text-base font-semibold"
        >
          Casualties
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CasualtyColumn
            title="Player"
            testId="casualty-column-player"
            destroyedFreq={result.mechDestroyedFrequency.player}
            shutdownFreq={result.heatShutdownFrequency.player}
            rows={survivalRows.player}
          />
          <CasualtyColumn
            title="Opponent"
            testId="casualty-column-opponent"
            destroyedFreq={result.mechDestroyedFrequency.opponent}
            shutdownFreq={result.heatShutdownFrequency.opponent}
            rows={survivalRows.opponent}
          />
        </div>
      </section>

      {/* Section 4: Raw Data */}
      <RawDataSection result={result} />
    </section>
  );
}
