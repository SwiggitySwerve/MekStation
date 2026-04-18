/**
 * Force Comparison Panel
 *
 * Pre-battle two-column side-by-side display of player vs opponent
 * force statistics (BV, tonnage, heat dissipation, pilot skill, weapon
 * DPT, SPAs). Uses `compareForces` to compute deltas and severity, and
 * `getDecisionHint` to surface a single one-line summary above the
 * table.
 *
 * The panel is collapsible and supports four states:
 *   1. Both sides empty            → placeholder "Configure forces…"
 *   2. Only one side configured    → per-side summary, deltas hidden
 *   3. Both sides configured       → full comparison
 *   4. Side has invalid units      → warning chip + best-effort summary
 *
 * The component is fully presentational — derivation runs in the
 * parent so the panel can be reused by post-battle / campaign
 * surfaces in later phases.
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
 */

import React, { useMemo, useState } from 'react';

import type { IForceSummary } from '@/utils/gameplay/forceSummary';

import {
  FORCE_COMPARISON_METRIC_LABEL,
  FORCE_COMPARISON_METRIC_ORDER,
  type DeltaSeverity,
  type ForceComparisonMetric,
  compareForces,
  formatDelta,
  formatMetricValue,
  getDecisionHint,
  getHighestSeverity,
  isPlayerAdvantage,
} from '@/utils/gameplay/forceComparison';

// =============================================================================
// Types
// =============================================================================

export interface ForceComparisonPanelProps {
  /**
   * Player-side summary. Pass `null` when no units are configured —
   * the panel renders the partial-state UI.
   */
  readonly player: IForceSummary | null;
  /** Opponent-side summary. Same null convention as `player`. */
  readonly opponent: IForceSummary | null;
  /**
   * When `true`, the panel starts collapsed. Default behavior is to
   * expand when both sides are configured (per spec § 7.2).
   */
  readonly defaultCollapsed?: boolean;
  /** Optional class name for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Style Helpers
// =============================================================================

/**
 * Tailwind color classes per severity tier. Low → neutral gray;
 * moderate → amber; high → red. Color is paired with the signed text in
 * `formatDelta` so color-blind users still parse severity (spec § 11.1).
 */
const SEVERITY_BG: Record<DeltaSeverity, string> = {
  low: 'bg-gray-700/40 text-gray-200',
  moderate: 'bg-amber-500/20 text-amber-300',
  high: 'bg-red-500/20 text-red-300',
};

/**
 * Sign-aware accent for delta badges. Once the panel knows which side
 * benefits, low-severity deltas stay neutral (regardless of sign) and
 * non-low deltas pick green (player advantage) or red (opponent
 * advantage). Per spec § 5.2.
 */
function deltaBadgeClass(
  severity: DeltaSeverity,
  playerAdv: boolean | null,
): string {
  if (severity === 'low' || playerAdv === null) {
    return SEVERITY_BG.low;
  }
  return playerAdv
    ? 'bg-emerald-500/20 text-emerald-300'
    : 'bg-red-500/20 text-red-300';
}

// =============================================================================
// Sub-Components
// =============================================================================

interface MetricRowProps {
  metric: ForceComparisonMetric;
  player: IForceSummary | null;
  opponent: IForceSummary | null;
  showDelta: boolean;
}

/**
 * Single comparison row. Renders both side values, the centered delta
 * badge (when both sides are configured), and an aria-label that
 * spells out the comparison for screen readers.
 */
function MetricRow({
  metric,
  player,
  opponent,
  showDelta,
}: MetricRowProps): React.ReactElement {
  const label = FORCE_COMPARISON_METRIC_LABEL[metric];
  const playerValue = player ? player[metric] : 0;
  const opponentValue = opponent ? opponent[metric] : 0;
  const playerCell = player ? formatMetricValue(metric, playerValue) : '—';
  const opponentCell = opponent
    ? formatMetricValue(metric, opponentValue)
    : '—';

  let badgeContent: React.ReactNode = null;
  let badgeAriaLabel = '';
  if (showDelta && player && opponent) {
    const cmp = compareForces(player, opponent);
    const delta = cmp.deltas[metric];
    const playerAdv = isPlayerAdvantage(metric, delta.value);
    const text = formatDelta(metric, delta.value);
    const cls = deltaBadgeClass(delta.severity, playerAdv);
    const advCopy =
      playerAdv === null
        ? 'no advantage'
        : playerAdv
          ? `player advantage ${formatDelta(metric, Math.abs(delta.value))}`
          : `opponent advantage ${formatDelta(metric, Math.abs(delta.value))}`;
    badgeAriaLabel = `Player ${label} ${playerCell}, Opponent ${label} ${opponentCell}, ${advCopy}`;
    badgeContent = (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
        data-testid={`force-comparison-delta-${metric}`}
        data-severity={delta.severity}
        aria-label={badgeAriaLabel}
      >
        {text}
      </span>
    );
  }

  return (
    <tr
      className="border-border-theme-subtle border-b last:border-b-0"
      data-testid={`force-comparison-row-${metric}`}
    >
      <th
        scope="row"
        className="text-text-theme-secondary px-3 py-2 text-left text-xs font-medium"
      >
        {label}
      </th>
      <td
        className="text-text-theme-primary px-3 py-2 text-right text-sm tabular-nums"
        data-testid={`force-comparison-player-${metric}`}
      >
        {playerCell}
      </td>
      <td className="px-3 py-2 text-center">{badgeContent}</td>
      <td
        className="text-text-theme-primary px-3 py-2 text-right text-sm tabular-nums"
        data-testid={`force-comparison-opponent-${metric}`}
      >
        {opponentCell}
      </td>
    </tr>
  );
}

interface SpaListProps {
  side: 'player' | 'opponent';
  summary: IForceSummary | null;
}

/**
 * SPA roster sub-section (spec § 6). Shows count chips with hover/tap
 * tooltips listing the unit IDs holding each ability. Empty state
 * shows "No active SPAs". Chips are keyboard-focusable for tooltip
 * access.
 */
function SpaList({ side, summary }: SpaListProps): React.ReactElement {
  if (!summary || summary.spaSummary.length === 0) {
    return (
      <p
        className="text-text-theme-muted text-xs italic"
        data-testid={`force-comparison-spas-${side}-empty`}
      >
        No active SPAs
      </p>
    );
  }
  return (
    <ul
      className="flex flex-wrap gap-1"
      data-testid={`force-comparison-spas-${side}`}
    >
      {summary.spaSummary.map((entry) => (
        <li key={entry.spaId}>
          <button
            type="button"
            tabIndex={0}
            title={`Held by: ${entry.unitIds.join(', ')}`}
            aria-label={`${entry.name}, ${entry.unitIds.length} unit${entry.unitIds.length === 1 ? '' : 's'} (${entry.unitIds.join(', ')})`}
            className="bg-surface-raised border-border-theme-subtle text-text-theme-primary focus:ring-accent inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs focus:ring-1 focus:outline-none"
            data-testid={`force-comparison-spa-${side}-${entry.spaId}`}
          >
            <span>{entry.name}</span>
            <span className="text-text-theme-muted">
              × {entry.unitIds.length}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Renders the pre-battle force comparison.
 *
 * Empty / partial states (per spec § 9):
 * - both null → placeholder "Configure forces to begin"
 * - one null  → show populated side, hide delta column
 * - both set  → full comparison + decision hint
 */
export function ForceComparisonPanel({
  player,
  opponent,
  defaultCollapsed,
  className = '',
}: ForceComparisonPanelProps): React.ReactElement {
  const bothConfigured = player !== null && opponent !== null;
  // Default expanded when both sides have units; collapsed otherwise so
  // a fresh encounter doesn't dominate the sidebar (spec § 7.2).
  const initiallyCollapsed =
    defaultCollapsed !== undefined ? defaultCollapsed : !bothConfigured;
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  // Memoize the comparison so re-renders skip the work when neither
  // summary changed. Only computed when both sides are present.
  const comparison = useMemo(() => {
    if (!player || !opponent) return null;
    return compareForces(player, opponent);
  }, [player, opponent]);

  const hint = comparison ? getDecisionHint(comparison) : null;
  const highestSeverity = comparison ? getHighestSeverity(comparison) : 'low';
  const showWarningIcon = highestSeverity === 'high';

  // Empty state — neither side configured.
  if (!player && !opponent) {
    return (
      <section
        className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
        data-testid="force-comparison-panel"
        data-state="empty"
      >
        <header className="mb-2">
          <h3 className="text-text-theme-secondary text-sm font-medium tracking-wider uppercase">
            Force Comparison
          </h3>
        </header>
        <p className="text-text-theme-muted text-sm">
          Configure forces to begin
        </p>
      </section>
    );
  }

  return (
    <section
      className={`bg-surface-base border-border-theme-subtle rounded-lg border ${className}`}
      data-testid="force-comparison-panel"
      data-state={bothConfigured ? 'comparison' : 'partial'}
    >
      <header className="border-border-theme-subtle flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {showWarningIcon && (
            <span
              role="img"
              aria-label="High imbalance warning"
              className="text-amber-400"
              data-testid="force-comparison-warning-icon"
            >
              ⚠
            </span>
          )}
          <h3 className="text-text-theme-secondary text-sm font-medium tracking-wider uppercase">
            Force Comparison
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-text-theme-muted hover:text-text-theme-primary text-xs"
          data-testid="force-comparison-toggle"
          aria-expanded={!collapsed}
          aria-controls="force-comparison-body"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </header>

      {!collapsed && (
        <div id="force-comparison-body" className="px-4 py-3">
          {!bothConfigured && (
            <p
              className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300"
              data-testid="force-comparison-partial-notice"
            >
              Configure both sides to see comparison
            </p>
          )}

          {hint && (
            <p
              className="text-text-theme-secondary mb-3 text-sm"
              data-testid="force-comparison-hint"
            >
              {hint}
            </p>
          )}

          {(player?.warnings.length ?? 0) > 0 && (
            <ul
              className="mb-3 list-disc rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-xs text-amber-300"
              data-testid="force-comparison-player-warnings"
            >
              {player!.warnings.map((w) => (
                <li key={`p-${w}`}>Player: {w}</li>
              ))}
            </ul>
          )}
          {(opponent?.warnings.length ?? 0) > 0 && (
            <ul
              className="mb-3 list-disc rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-xs text-amber-300"
              data-testid="force-comparison-opponent-warnings"
            >
              {opponent!.warnings.map((w) => (
                <li key={`o-${w}`}>Opponent: {w}</li>
              ))}
            </ul>
          )}

          <table
            className="w-full table-auto"
            data-testid="force-comparison-table"
          >
            <caption className="sr-only">
              Pre-battle force comparison: player vs opponent statistics
            </caption>
            <thead>
              <tr className="border-border-theme-subtle border-b text-xs">
                <th
                  scope="col"
                  className="text-text-theme-muted px-3 py-2 text-left font-medium"
                >
                  Metric
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-cyan-400"
                >
                  Player
                </th>
                <th
                  scope="col"
                  className="text-text-theme-muted px-3 py-2 text-center font-medium"
                >
                  Δ
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-red-400"
                >
                  Opponent
                </th>
              </tr>
            </thead>
            <tbody>
              {FORCE_COMPARISON_METRIC_ORDER.map((metric) => (
                <MetricRow
                  key={metric}
                  metric={metric}
                  player={player}
                  opponent={opponent}
                  showDelta={bothConfigured}
                />
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-text-theme-muted mb-1 text-xs font-medium tracking-wider uppercase">
                Player SPAs
              </h4>
              <SpaList side="player" summary={player} />
            </div>
            <div>
              <h4 className="text-text-theme-muted mb-1 text-xs font-medium tracking-wider uppercase">
                Opponent SPAs
              </h4>
              <SpaList side="opponent" summary={opponent} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
