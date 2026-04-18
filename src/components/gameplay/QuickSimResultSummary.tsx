/**
 * QuickSimResultSummary — compact one-row variant of the Quick Resolve
 * result, designed for the encounter detail page sidebar.
 *
 * Layout: a small win-probability bar on the left, the "Most Likely
 * Outcome" headline in the middle, and a "View Full Results" link on
 * the right. When no batch has been run yet (no `result` prop), shows
 * the empty-state row with a "Run Batch" CTA.
 *
 * Navigation target is `/gameplay/encounters/[encounterId]/sim` per the
 * spec scenario "Summary navigates to full panel".
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */

import Link from 'next/link';
import React from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';

import { Button } from '@/components/ui';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Types
// =============================================================================

export interface QuickSimResultSummaryProps {
  /** Encounter id used to construct the deep-link URL. */
  encounterId: string;
  /** Aggregated Monte Carlo result; undefined for the empty state. */
  result?: IBatchResult | null;
  /** CTA handler for the empty state — kicks off `useQuickResolve()` with default runs. */
  onRunBatch?: () => void;
  /** Disables the "Run Batch" CTA in the empty state. */
  runBatchDisabled?: boolean;
  /** Optional className for layout containers. */
  className?: string;
}

// =============================================================================
// Helpers (mirror QuickSimResultPanel — kept local so the summary is
// importable without dragging the full panel into the bundle.)
// =============================================================================

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function confidenceLabel(probability: number): 'High' | 'Moderate' | 'Low' {
  if (probability > 0.8) return 'High';
  if (probability >= 0.6) return 'Moderate';
  return 'Low';
}

function buildHeadline(result: IBatchResult): string {
  const side = result.mostLikelyOutcome;
  if (side === 'draw') return 'Most Likely Outcome: Draw';
  const probability =
    side === GameSide.Player
      ? result.winProbability.player
      : result.winProbability.opponent;
  const sideName = side === GameSide.Player ? 'Player' : 'Opponent';
  return `Most Likely Outcome: ${sideName} Victory (${confidenceLabel(probability)})`;
}

function buildBarAriaLabel(result: IBatchResult): string {
  return `Win probabilities: Player ${pct(result.winProbability.player)}, Opponent ${pct(result.winProbability.opponent)}, Draw ${pct(result.winProbability.draw)}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Compact summary bar. Renders empty-state CTA when `result` is null /
 * undefined / has zero runs.
 */
export function QuickSimResultSummary({
  encounterId,
  result,
  onRunBatch,
  runBatchDisabled = false,
  className = '',
}: QuickSimResultSummaryProps): React.ReactElement {
  const hasResult = !!result && result.totalRuns > 0;

  if (!hasResult) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-slate-700 bg-slate-900/30 px-4 py-3 ${className}`}
        data-testid="quick-sim-result-summary-empty"
      >
        <span className="text-sm text-slate-400">
          No quick resolve data yet
        </span>
        {onRunBatch && (
          <Button
            variant="secondary"
            disabled={runBatchDisabled}
            onClick={onRunBatch}
            data-testid="quick-sim-summary-run-batch-cta"
          >
            Run Batch
          </Button>
        )}
      </div>
    );
  }

  // result is non-null and has runs at this point.
  const r = result as IBatchResult;
  const playerWidth = r.winProbability.player * 100;
  const opponentWidth = r.winProbability.opponent * 100;
  const drawWidth = r.winProbability.draw * 100;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-md border border-slate-700 bg-slate-900/30 px-4 py-3 ${className}`}
      data-testid="quick-sim-result-summary"
    >
      <div
        role="img"
        aria-label={buildBarAriaLabel(r)}
        className="flex h-2.5 w-32 flex-shrink-0 overflow-hidden rounded-full border border-slate-700"
      >
        <div className="bg-blue-600" style={{ width: `${playerWidth}%` }} />
        <div className="bg-red-600" style={{ width: `${opponentWidth}%` }} />
        <div className="bg-slate-500" style={{ width: `${drawWidth}%` }} />
      </div>
      <span
        className="flex-1 truncate text-sm font-semibold text-slate-100"
        data-testid="quick-sim-summary-headline"
      >
        {buildHeadline(r)}
      </span>
      <Link
        href={`/gameplay/encounters/${encounterId}/sim`}
        className="text-sm font-medium text-blue-400 hover:text-blue-300"
        data-testid="quick-sim-summary-view-link"
      >
        View Full Results
      </Link>
    </div>
  );
}

export default QuickSimResultSummary;
