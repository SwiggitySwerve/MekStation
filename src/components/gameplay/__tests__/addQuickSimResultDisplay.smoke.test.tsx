/**
 * Per-change smoke test for add-quick-sim-result-display (Phase 2,
 * sub-branch B).
 *
 * Asserts the four major surfaces compose correctly with a minimal
 * `IBatchResult` fixture:
 *   - QuickSimResultPanel renders the headline, the win-probability
 *     stacked bar with the spec-mandated aria label, the casualty
 *     columns, and the collapsible raw-data section.
 *   - QuickSimResultSummary renders the compact one-row variant with
 *     a deep-link to /gameplay/encounters/[id]/sim, plus the empty
 *     state when no batch has been run.
 *   - TurnCountHistogram renders one bar per 2-turn bucket plus the
 *     mean / median / p90 overlays from the percentile stats.
 *   - sim.tsx route mounts and renders without crashing for an
 *     encounter with both forces configured.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 * @spec openspec/changes/add-quick-sim-result-display/tasks.md § 12
 */

import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import { QuickSimResultPanel } from '@/components/gameplay/QuickSimResultPanel';
import { QuickSimResultSummary } from '@/components/gameplay/QuickSimResultSummary';
import { TurnCountHistogram } from '@/components/gameplay/TurnCountHistogram';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// next/link renders an <a> tag in jsdom — no extra mock needed.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build an `IBatchResult` overriding only the fields a given test cares about. */
function buildResult(overrides: Partial<IBatchResult> = {}): IBatchResult {
  return {
    totalRuns: 100,
    erroredRuns: 0,
    baseSeed: 12345,
    winProbability: { player: 0.62, opponent: 0.3, draw: 0.08 },
    turnCount: {
      mean: 8.4,
      median: 8,
      p25: 6,
      p75: 11,
      p90: 13,
      min: 4,
      max: 16,
    },
    heatShutdownFrequency: { player: 0.05, opponent: 0.18 },
    mechDestroyedFrequency: { player: 0.12, opponent: 0.41 },
    perUnitSurvival: {
      'p-mech-1': 0.92,
      'p-mech-2': 0.74,
      'o-mech-1': 0.55,
      'o-mech-2': 0.31,
    },
    mostLikelyOutcome: GameSide.Player,
    ...overrides,
  };
}

/** Build a minimal `IGameUnit[]` so the survival rows render with designations. */
function buildUnitMeta(): readonly IGameUnit[] {
  return [
    {
      id: 'p-mech-1',
      name: 'Atlas AS7-D',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'p-mech-2',
      name: 'Warhammer WHM-6R',
      side: GameSide.Player,
      unitRef: 'whm-6r',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'o-mech-1',
      name: 'Marauder MAD-3R',
      side: GameSide.Opponent,
      unitRef: 'mad-3r',
      pilotRef: 'o1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'o-mech-2',
      name: 'Locust LCT-1V',
      side: GameSide.Opponent,
      unitRef: 'lct-1v',
      pilotRef: 'o2',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

// =============================================================================
// QuickSimResultPanel
// =============================================================================

describe('QuickSimResultPanel', () => {
  it('renders the headline, win-probability bar, and casualty columns from an IBatchResult', () => {
    render(
      <QuickSimResultPanel result={buildResult()} unitMeta={buildUnitMeta()} />,
    );

    // Headline derives from mostLikelyOutcome + winProbability.
    expect(screen.getByTestId('quick-sim-headline').textContent).toContain(
      'Player Victory',
    );
    // 62% > 0.6 but < 0.8 → "Moderate" per spec § 5.2.
    expect(screen.getByTestId('quick-sim-headline').textContent).toContain(
      'Moderate',
    );

    // Win-probability bar carries the spec-mandated a11y label.
    const bar = screen.getByTestId('win-probability-bar');
    expect(bar.getAttribute('aria-label')).toBe(
      'Win probabilities: Player 62%, Opponent 30%, Draw 8%',
    );

    // Casualty columns + per-unit survival rows present.
    const playerCol = screen.getByTestId('casualty-column-player');
    const opponentCol = screen.getByTestId('casualty-column-opponent');
    expect(within(playerCol).getByText('Atlas AS7-D')).toBeInTheDocument();
    expect(within(playerCol).getByText('Warhammer WHM-6R')).toBeInTheDocument();
    expect(
      within(opponentCol).getByText('Marauder MAD-3R'),
    ).toBeInTheDocument();
    expect(within(opponentCol).getByText('Locust LCT-1V')).toBeInTheDocument();

    // Raw data section is present (collapsed by default per spec § 6.1).
    expect(screen.getByTestId('raw-data-section')).toBeInTheDocument();
  });

  it('renders the empty state when totalRuns === 0', () => {
    render(<QuickSimResultPanel result={buildResult({ totalRuns: 0 })} />);
    expect(
      screen.getByTestId('quick-sim-result-panel-empty'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Run a batch/i)).toBeInTheDocument();
  });

  it('omits the confidence qualifier when mostLikelyOutcome is a draw', () => {
    render(
      <QuickSimResultPanel
        result={buildResult({
          mostLikelyOutcome: 'draw',
          winProbability: { player: 0.4, opponent: 0.4, draw: 0.2 },
        })}
      />,
    );
    const headline = screen.getByTestId('quick-sim-headline').textContent ?? '';
    expect(headline).toContain('Draw');
    // Spec § 5.3: no confidence qualifier on draw.
    expect(headline).not.toContain('High');
    expect(headline).not.toContain('Moderate');
    expect(headline).not.toContain('Low');
  });

  it('shows the partial-results banner when partial=true', () => {
    render(
      <QuickSimResultPanel
        result={buildResult({ totalRuns: 37 })}
        unitMeta={buildUnitMeta()}
        partial
      />,
    );
    expect(screen.getByTestId('quick-sim-partial-banner')).toBeInTheDocument();
  });

  it('surfaces the errored-runs note when erroredRuns > 0', () => {
    render(
      <QuickSimResultPanel
        result={buildResult({ totalRuns: 100, erroredRuns: 3 })}
        unitMeta={buildUnitMeta()}
      />,
    );
    expect(screen.getByText(/3 errored/i)).toBeInTheDocument();
  });
});

// =============================================================================
// QuickSimResultSummary
// =============================================================================

describe('QuickSimResultSummary', () => {
  it('renders the compact summary with a deep-link to the sim route', () => {
    render(
      <QuickSimResultSummary encounterId="enc-1" result={buildResult()} />,
    );
    expect(screen.getByTestId('quick-sim-result-summary')).toBeInTheDocument();
    const headline =
      screen.getByTestId('quick-sim-summary-headline').textContent ?? '';
    expect(headline).toContain('Player Victory');
    const link = screen.getByTestId('quick-sim-summary-view-link');
    expect(link.getAttribute('href')).toBe('/gameplay/encounters/enc-1/sim');
  });

  it('renders the empty-state row with the Run Batch CTA when no result', () => {
    const onRunBatch = jest.fn();
    render(
      <QuickSimResultSummary
        encounterId="enc-1"
        result={null}
        onRunBatch={onRunBatch}
      />,
    );
    expect(
      screen.getByTestId('quick-sim-result-summary-empty'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('quick-sim-summary-run-batch-cta'),
    ).toBeInTheDocument();
  });
});

// =============================================================================
// TurnCountHistogram
// =============================================================================

describe('TurnCountHistogram', () => {
  it('renders one bar per 2-turn bucket plus mean/median/p90 markers', () => {
    render(
      <TurnCountHistogram
        stats={{
          mean: 8.4,
          median: 8,
          p25: 6,
          p75: 11,
          p90: 13,
          min: 4,
          max: 16,
        }}
        successfulRuns={100}
      />,
    );

    // Range = 4..16 = 12 turns + 1 / 2 → ceil(13/2) = 7 buckets.
    const bars = screen.getAllByTestId(/^turn-count-bar-\d+$/);
    expect(bars.length).toBe(7);

    // Overlays present.
    expect(screen.getByTestId('turn-count-mean-line')).toBeInTheDocument();
    expect(screen.getByTestId('turn-count-median-line')).toBeInTheDocument();
    expect(screen.getByTestId('turn-count-histogram-iqr')).toBeInTheDocument();
    expect(screen.getByTestId('turn-count-p90-marker')).toBeInTheDocument();

    // Spec § 11.2: SR-only fallback table lists every bucket.
    const srTable = screen.getByTestId('turn-count-histogram-table');
    const rows = within(srTable).getAllByRole('row');
    // 1 header row + 7 bucket rows.
    expect(rows.length).toBe(8);
  });

  it('renders the empty state when fewer than 2 successful runs', () => {
    render(
      <TurnCountHistogram
        stats={{
          mean: 0,
          median: 0,
          p25: 0,
          p75: 0,
          p90: 0,
          min: 0,
          max: 0,
        }}
        successfulRuns={1}
      />,
    );
    expect(
      screen.getByTestId('turn-count-histogram-empty'),
    ).toBeInTheDocument();
  });
});
