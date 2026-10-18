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
import React from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Display helpers
// =============================================================================

/** "0.624" → "62%" with no decimal. Spec uses integer percentages. */
function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Spec § Most Likely Outcome:
 *   probability > 0.8 → High, 0.6–0.8 → Moderate, < 0.6 → Low.
 */
function confidenceLabel(probability: number): 'High' | 'Moderate' | 'Low' {
  if (probability > 0.8) return 'High';
  if (probability >= 0.6) return 'Moderate';
  return 'Low';
}

function sideLabel(side: GameSide | 'draw'): string {
  if (side === 'draw') return 'Draw';
  return side === GameSide.Player ? 'Player' : 'Opponent';
}

/**
 * Build the headline string from the result. Draws never carry a
 * confidence qualifier (per spec scenario "Draw headline omits confidence").
 */
function buildHeadline(result: IBatchResult): string {
  const side = result.mostLikelyOutcome;
  if (side === 'draw') {
    return 'Most Likely Outcome: Draw';
  }
  const probability =
    side === GameSide.Player
      ? result.winProbability.player
      : result.winProbability.opponent;
  const sideName = sideLabel(side);
  return `Most Likely Outcome: ${sideName} Victory (${confidenceLabel(probability)})`;
}

/**
 * Spec a11y: bar's aria-label MUST equal "Win probabilities: Player N%, Opponent N%, Draw N%".
 */
function buildBarAriaLabel(result: IBatchResult): string {
  return `Win probabilities: Player ${pct(result.winProbability.player)}, Opponent ${pct(result.winProbability.opponent)}, Draw ${pct(result.winProbability.draw)}`;
}

// =============================================================================
// Win Probability Bar
// =============================================================================

interface WinProbabilityBarProps {
  result: IBatchResult;
}

/**
 * Stacked horizontal bar — three segments in player → opponent → draw
 * order. Each segment's width is `probability * 100%`. Inline percent
 * label is hidden for any segment narrower than 10% per spec.
 */
function WinProbabilityBar({
  result,
}: WinProbabilityBarProps): React.ReactElement {
  const playerWidth = result.winProbability.player * 100;
  const opponentWidth = result.winProbability.opponent * 100;
  const drawWidth = result.winProbability.draw * 100;

  return (
    <div
      role="img"
      aria-label={buildBarAriaLabel(result)}
      data-testid="win-probability-bar"
      className="border-border-theme flex h-10 w-full overflow-hidden rounded-md border"
    >
      <div
        className="flex items-center justify-center bg-blue-600 text-xs font-semibold text-white"
        style={{ width: `${playerWidth}%` }}
        data-testid="win-probability-player"
      >
        {playerWidth >= 10 && pct(result.winProbability.player)}
      </div>
      <div
        className="flex items-center justify-center bg-red-600 text-xs font-semibold text-white"
        style={{ width: `${opponentWidth}%` }}
        data-testid="win-probability-opponent"
      >
        {opponentWidth >= 10 && pct(result.winProbability.opponent)}
      </div>
      <div
        className="bg-surface-raised flex items-center justify-center text-xs font-semibold text-white"
        style={{ width: `${drawWidth}%` }}
        data-testid="win-probability-draw"
      >
        {drawWidth >= 10 && pct(result.winProbability.draw)}
      </div>
    </div>
  );
}

export { pct, buildHeadline, WinProbabilityBar };
