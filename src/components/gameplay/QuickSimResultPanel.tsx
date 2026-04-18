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

import React, { useCallback, useMemo, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import { Button } from '@/components/ui';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { TurnCountHistogram } from './TurnCountHistogram';

// =============================================================================
// Types
// =============================================================================

export interface QuickSimResultPanelProps {
  /** Aggregated Monte Carlo result. */
  result: IBatchResult;
  /**
   * Optional unit metadata so the casualty section can render
   * designations and split per-unit survival between Player / Opponent
   * columns. Typically the same `gameUnits` array passed to `runBatch`.
   */
  unitMeta?: readonly IGameUnit[];
  /** True when the result was assembled from a cancelled batch. */
  partial?: boolean;
  /** Optional rerun handler that mounts a "Rerun" button in the header. */
  onRerun?: () => void;
  /** Optional run handler used by the empty-state CTA (`totalRuns === 0`). */
  onRunBatch?: () => void;
  /** Optional className for the outer container. */
  className?: string;
}

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
      className="flex h-10 w-full overflow-hidden rounded-md border border-slate-700"
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
        className="flex items-center justify-center bg-slate-500 text-xs font-semibold text-white"
        style={{ width: `${drawWidth}%` }}
        data-testid="win-probability-draw"
      >
        {drawWidth >= 10 && pct(result.winProbability.draw)}
      </div>
    </div>
  );
}

// =============================================================================
// Casualty section
// =============================================================================

interface SurvivalRow {
  readonly unitId: string;
  readonly designation: string;
  readonly side: GameSide;
  readonly survival: number;
}

/**
 * Map the raw survival record into per-side rows enriched with
 * designations and sorted descending by survival rate (per spec).
 */
function buildSurvivalRows(
  result: IBatchResult,
  unitMeta: readonly IGameUnit[] | undefined,
): {
  readonly player: readonly SurvivalRow[];
  readonly opponent: readonly SurvivalRow[];
} {
  const meta = new Map<string, IGameUnit>();
  for (const u of unitMeta ?? []) meta.set(u.id, u);

  const player: SurvivalRow[] = [];
  const opponent: SurvivalRow[] = [];

  for (const [unitId, survival] of Object.entries(result.perUnitSurvival)) {
    const lookup = meta.get(unitId);
    const row: SurvivalRow = {
      unitId,
      designation: lookup?.name ?? unitId,
      // Default to Player when meta is missing — keeps the row visible
      // without a confusing "?" column. Real call sites pass unitMeta.
      side: lookup?.side ?? GameSide.Player,
      survival,
    };
    if (row.side === GameSide.Opponent) {
      opponent.push(row);
    } else {
      player.push(row);
    }
  }

  const desc = (a: SurvivalRow, b: SurvivalRow): number =>
    b.survival - a.survival;
  player.sort(desc);
  opponent.sort(desc);

  return { player, opponent };
}

interface CasualtyColumnProps {
  title: string;
  testId: string;
  destroyedFreq: number;
  shutdownFreq: number;
  rows: readonly SurvivalRow[];
}

function CasualtyColumn({
  title,
  testId,
  destroyedFreq,
  shutdownFreq,
  rows,
}: CasualtyColumnProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-900/30 p-4"
      data-testid={testId}
    >
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="flex flex-col">
          <span className="text-slate-500">Mech Destroyed</span>
          <span className="text-base font-semibold text-slate-100">
            {pct(destroyedFreq)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">Heat Shutdown</span>
          <span className="text-base font-semibold text-slate-100">
            {pct(shutdownFreq)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400">
          Per-unit survival
        </span>
        {rows.length === 0 ? (
          <span className="text-xs text-slate-500">No unit data</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li
                key={row.unitId}
                className="flex flex-col gap-0.5"
                data-testid={`survival-row-${row.unitId}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{row.designation}</span>
                  <span className="text-slate-300">{pct(row.survival)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${row.survival * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Raw data section
// =============================================================================

interface RawDataSectionProps {
  result: IBatchResult;
}

function RawDataSection({ result }: RawDataSectionProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const seed = String(result.baseSeed);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(seed).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [result.baseSeed]);

  return (
    <details
      className="rounded-md border border-slate-700 bg-slate-900/30"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      data-testid="raw-data-section"
    >
      <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-200">
        Raw Data
      </summary>
      <div className="grid grid-cols-1 gap-3 px-4 py-3 text-xs text-slate-300 sm:grid-cols-3">
        <div>
          <div className="text-slate-500">Total runs</div>
          <div className="text-base font-semibold text-slate-100">
            {result.totalRuns}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Errored runs</div>
          <div className="text-base font-semibold text-slate-100">
            {result.erroredRuns}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-500">Base seed</span>
          <div className="flex items-center gap-2">
            <code className="rounded bg-slate-800 px-2 py-0.5 font-mono text-sm text-slate-100">
              {result.baseSeed}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-700"
              data-testid="copy-seed-btn"
            >
              {copied ? 'Copied' : 'Copy seed'}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}

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
        className={`flex flex-col items-center gap-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center ${className}`}
        data-testid="quick-sim-result-panel-empty"
      >
        <p className="text-sm text-slate-400">
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
      className={`flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900/40 p-6 ${className}`}
      data-testid="quick-sim-result-panel"
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-100">
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
          className="text-base font-semibold text-slate-100"
          data-testid="quick-sim-headline"
        >
          {headline}
        </h3>
        <div className="text-xs tracking-wider text-slate-400 uppercase">
          Win Probability
        </div>
        <WinProbabilityBar result={result} />
        <div className="flex justify-between text-xs text-slate-400">
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
          className="text-base font-semibold text-slate-100"
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
          className="text-base font-semibold text-slate-100"
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

export default QuickSimResultPanel;
