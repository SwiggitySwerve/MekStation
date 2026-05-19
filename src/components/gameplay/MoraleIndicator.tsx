/**
 * Morale Indicator
 *
 * Per-side in-battle morale readout for the gameplay HUD. Renders the
 * current `MoraleLevel` for each side from the session's `battleMorale`
 * state, with a color and label that scale with the seven-level
 * ordinal scale (`ROUTED` … `OVERWHELMING`).
 *
 * This shows IN-BATTLE morale only — it is independent of campaign-layer
 * `Contract Morale Tracking` (design D3).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.3
 */

import React from 'react';

import { GameSide, MORALE_LEVELS, type MoraleLevel } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface MoraleIndicatorProps {
  /** Per-side in-battle morale, from `IGameState.battleMorale`. */
  readonly battleMorale: Record<GameSide, MoraleLevel>;
  /** Optional className for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Tailwind text color for a morale level — red at the broken end,
 * green at the inspired end, neutral at `STEADY`.
 */
function moraleColorClass(level: MoraleLevel): string {
  const ordinal = MORALE_LEVELS.indexOf(level);
  const steady = MORALE_LEVELS.indexOf('STEADY');
  if (ordinal <= MORALE_LEVELS.indexOf('BROKEN')) return 'text-red-400';
  if (ordinal < steady) return 'text-amber-400';
  if (ordinal === steady) return 'text-text-theme-secondary';
  if (ordinal < MORALE_LEVELS.indexOf('OVERWHELMING')) {
    return 'text-emerald-400';
  }
  return 'text-emerald-300';
}

/** Title-case a morale level for display (`ROUTED` → `Routed`). */
function moraleLabel(level: MoraleLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/** Display name for a side. */
function sideLabel(side: GameSide): string {
  return side === GameSide.Player ? 'Player' : 'Opponent';
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders one row per side: `{Side}: {MoraleLevel}` with a color cue.
 * Reads from `battleMorale` directly so the indicator stays in lockstep
 * with the event-sourced morale state.
 */
export function MoraleIndicator({
  battleMorale,
  className = '',
}: MoraleIndicatorProps): React.ReactElement {
  return (
    <div
      className={`bg-surface-raised flex flex-col gap-1 rounded px-3 py-2 ${className}`}
      data-testid="morale-indicator"
      aria-label="Per-side combat morale"
    >
      <span className="text-text-theme-secondary text-xs font-medium uppercase">
        Morale
      </span>
      {[GameSide.Player, GameSide.Opponent].map((side) => {
        const level = battleMorale[side];
        return (
          <div
            key={side}
            className="flex items-center justify-between gap-3 text-sm"
            data-testid={`morale-row-${side}`}
          >
            <span className="text-text-theme-secondary">{sideLabel(side)}</span>
            <span
              className={`font-semibold ${moraleColorClass(level)}`}
              data-testid={`morale-level-${side}`}
            >
              {moraleLabel(level)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default MoraleIndicator;
