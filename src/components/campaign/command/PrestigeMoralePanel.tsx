/**
 * Prestige & Morale Panel
 *
 * The read-only Prestige & Morale command surface (CP3 —
 * `add-campaign-refit-and-prestige`, design D10). Shows the company's
 * current `MoraleState`, the recent morale transition history, and the
 * per-unit prestige scores.
 *
 * The surface is strictly read-only — morale and prestige change through
 * day processors and the post-battle prestige step, never the UI. No
 * mutation control is rendered here.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module components/campaign/command/PrestigeMoralePanel
 */

import React from 'react';

import type {
  IMoraleTransition,
  IUnitPrestige,
  MoraleState,
} from '@/types/campaign/Prestige';

import { Badge, Card } from '@/components/ui';
import { MORALE_STATE_ORDER, PRESTIGE_MAX } from '@/types/campaign/Prestige';

import { CommandEmpty } from './CommandStates';

// =============================================================================
// Morale presentation
// =============================================================================

/** Human-readable label for a morale state. */
function moraleLabel(state: MoraleState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

/** Badge colour for a morale state — worse states read warmer. */
function moraleClasses(state: MoraleState): string {
  const rank = MORALE_STATE_ORDER.indexOf(state);
  switch (rank) {
    case 0:
      return 'bg-red-500/20 text-red-400';
    case 1:
      return 'bg-amber-500/20 text-amber-400';
    case 2:
      return 'bg-slate-500/20 text-slate-300';
    case 3:
      return 'bg-sky-500/20 text-sky-400';
    default:
      return 'bg-emerald-500/20 text-emerald-400';
  }
}

// =============================================================================
// Morale card
// =============================================================================

interface MoraleCardProps {
  readonly moraleState: MoraleState;
  readonly transitions: readonly IMoraleTransition[];
}

/** The current morale state plus a recent-transition list. */
function MoraleCard({
  moraleState,
  transitions,
}: MoraleCardProps): React.ReactElement {
  // Most-recent transitions first, capped at the last eight.
  const recent = [...transitions].slice(-8).reverse();

  return (
    <Card className="p-5" data-testid="prestige-morale-card">
      <h3 className="text-text-theme-primary mb-3 text-lg font-semibold">
        Company Morale
      </h3>
      <div className="mb-4 flex items-center gap-3">
        <Badge
          className={moraleClasses(moraleState)}
          data-testid="morale-state-badge"
        >
          {moraleLabel(moraleState)}
        </Badge>
        <span className="text-text-theme-secondary text-xs">
          Current company morale state
        </span>
      </div>

      <h4 className="text-text-theme-secondary mb-2 text-xs font-semibold tracking-wider uppercase">
        Recent Transitions
      </h4>
      {recent.length === 0 ? (
        <p
          className="text-text-theme-secondary text-sm"
          data-testid="morale-transitions-empty"
        >
          No morale transitions recorded yet.
        </p>
      ) : (
        <ul className="space-y-1" data-testid="morale-transitions-list">
          {recent.map((t, i) => (
            <li
              key={`${t.occurredAt}-${i}`}
              className="text-text-theme-secondary flex items-center gap-2 text-sm"
              data-testid="morale-transition-row"
            >
              <span
                className={
                  t.direction === 'up' ? 'text-emerald-400' : 'text-red-400'
                }
              >
                {t.direction === 'up' ? '▲' : '▼'}
              </span>
              <span>
                {moraleLabel(t.from)} → {moraleLabel(t.to)}
              </span>
              <span className="text-text-theme-secondary truncate text-xs">
                {t.reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// =============================================================================
// Prestige list
// =============================================================================

interface PrestigeListProps {
  readonly unitPrestige: readonly IUnitPrestige[];
}

/** Per-unit prestige scores. */
function PrestigeList({ unitPrestige }: PrestigeListProps): React.ReactElement {
  if (unitPrestige.length === 0) {
    return (
      <CommandEmpty
        title="No prestige tracked yet"
        message="Unit prestige is recorded after a unit's first battle."
      />
    );
  }

  // Highest prestige first.
  const sorted = [...unitPrestige].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2" data-testid="prestige-list">
      {sorted.map((record) => (
        <Card
          key={record.unitId}
          className="flex items-center justify-between p-4"
          data-testid={`prestige-row-${record.unitId}`}
        >
          <span className="text-text-theme-primary truncate text-sm font-medium">
            {record.unitId}
          </span>
          <div className="flex items-center gap-3">
            <div className="bg-surface-raised h-2 w-32 overflow-hidden rounded">
              <div
                className="bg-accent h-full"
                style={{
                  width: `${(record.score / PRESTIGE_MAX) * 100}%`,
                }}
              />
            </div>
            <span
              className="text-text-theme-primary w-10 text-right font-mono text-sm"
              data-testid={`prestige-score-${record.unitId}`}
            >
              {record.score}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Panel
// =============================================================================

export interface PrestigeMoralePanelProps {
  /** The company's current morale state. */
  readonly moraleState: MoraleState;
  /** The company's morale transition history. */
  readonly moraleTransitions: readonly IMoraleTransition[];
  /** Per-unit prestige records. */
  readonly unitPrestige: readonly IUnitPrestige[];
}

/**
 * The Prestige & Morale surface — morale state + transitions, then the
 * per-unit prestige list. Read-only.
 */
export function PrestigeMoralePanel({
  moraleState,
  moraleTransitions,
  unitPrestige,
}: PrestigeMoralePanelProps): React.ReactElement {
  return (
    <div className="space-y-6" data-testid="prestige-morale-panel">
      <MoraleCard moraleState={moraleState} transitions={moraleTransitions} />
      <div>
        <h3 className="text-text-theme-primary mb-3 text-lg font-semibold">
          Unit Prestige
        </h3>
        <PrestigeList unitPrestige={unitPrestige} />
      </div>
    </div>
  );
}

export default PrestigeMoralePanel;
