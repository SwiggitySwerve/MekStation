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
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { pct } from './QuickSimResultPanel.summary';

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
      className="border-border-theme bg-surface-deep/30 flex flex-col gap-3 rounded-md border p-4"
      data-testid={testId}
    >
      <h4 className="text-text-theme-primary text-sm font-semibold">{title}</h4>
      <div className="text-text-theme-secondary grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-text-theme-muted">Mech Destroyed</span>
          <span className="text-text-theme-primary text-base font-semibold">
            {pct(destroyedFreq)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-text-theme-muted">Heat Shutdown</span>
          <span className="text-text-theme-primary text-base font-semibold">
            {pct(shutdownFreq)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-text-theme-secondary text-xs font-semibold">
          Per-unit survival
        </span>
        {rows.length === 0 ? (
          <span className="text-text-theme-muted text-xs">No unit data</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li
                key={row.unitId}
                className="flex flex-col gap-0.5"
                data-testid={`survival-row-${row.unitId}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-theme-primary">
                    {row.designation}
                  </span>
                  <span className="text-text-theme-secondary">
                    {pct(row.survival)}
                  </span>
                </div>
                <div className="bg-surface-base h-1.5 w-full overflow-hidden rounded-full">
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

export { buildSurvivalRows, CasualtyColumn };
