/**
 * Withdraw Control
 *
 * Unit-action control that lets a human player declare withdrawal for
 * an owned unit and choose the target map edge. Wires the
 * `InteractiveSession.declareWithdrawal(unitId, edge)` engine action
 * into a real user flow: the player picks an edge, clicks "Withdraw",
 * and the unit is then routed toward that edge and exits via the
 * existing `UnitRetreated` machinery.
 *
 * Withdrawal is a sticky, one-way declaration — once a unit is
 * withdrawing the control renders a non-interactive "Withdrawing"
 * badge instead of the picker (the player cannot cancel it).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.1
 */

import React, { useCallback, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

/** The four map edges a unit can withdraw toward. */
export type WithdrawEdge = 'north' | 'south' | 'east' | 'west';

const WITHDRAW_EDGES: readonly WithdrawEdge[] = [
  'north',
  'south',
  'east',
  'west',
];

export interface WithdrawControlProps {
  /** Unit this control declares withdrawal for. */
  readonly unitId: string;
  /**
   * Whether the unit has already declared (or been forced into)
   * withdrawal. When `true` the picker is replaced by a static badge.
   */
  readonly isWithdrawing: boolean;
  /**
   * Whether the control is interactive. `false` disables the picker
   * and button — e.g. the unit is destroyed, has already retreated, or
   * it is not the player's turn to act.
   */
  readonly enabled: boolean;
  /**
   * Declares withdrawal for `unitId` toward `edge`. Wired by the host
   * to `InteractiveSession.declareWithdrawal`.
   */
  readonly onDeclareWithdrawal: (unitId: string, edge: WithdrawEdge) => void;
  /** Optional className for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders an edge picker (radio-style segmented buttons) plus a
 * "Withdraw" action button. Once `isWithdrawing` is true, the control
 * collapses to a read-only "Withdrawing — {edge}" style badge.
 */
export function WithdrawControl({
  unitId,
  isWithdrawing,
  enabled,
  onDeclareWithdrawal,
  className = '',
}: WithdrawControlProps): React.ReactElement {
  const [selectedEdge, setSelectedEdge] = useState<WithdrawEdge>('north');

  const handleDeclare = useCallback(() => {
    if (!enabled || isWithdrawing) return;
    onDeclareWithdrawal(unitId, selectedEdge);
  }, [enabled, isWithdrawing, onDeclareWithdrawal, unitId, selectedEdge]);

  if (isWithdrawing) {
    return (
      <div
        className={`flex items-center gap-2 rounded bg-amber-900/40 px-3 py-2 text-sm ${className}`}
        data-testid="withdraw-control"
      >
        <span
          className="font-medium text-amber-300"
          data-testid="withdraw-status"
        >
          Withdrawing
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-raised flex flex-col gap-2 rounded px-3 py-2 ${className}`}
      data-testid="withdraw-control"
    >
      <span className="text-text-theme-secondary text-xs font-medium uppercase">
        Withdraw toward
      </span>
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label="Withdrawal edge"
        data-testid="withdraw-edge-picker"
      >
        {WITHDRAW_EDGES.map((edge) => (
          <button
            key={edge}
            type="button"
            role="radio"
            aria-checked={selectedEdge === edge}
            disabled={!enabled}
            onClick={() => setSelectedEdge(edge)}
            data-testid={`withdraw-edge-${edge}`}
            className={`min-h-[44px] flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedEdge === edge
                ? 'bg-amber-700 text-white'
                : 'bg-surface-deep text-text-theme-secondary hover:bg-surface-deep/80'
            }`}
          >
            {edge}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!enabled}
        onClick={handleDeclare}
        data-testid="withdraw-declare-button"
        aria-label={`Withdraw unit toward ${selectedEdge} edge`}
        className="min-h-[44px] rounded bg-amber-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 focus:ring-2 focus:ring-amber-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        Withdraw
      </button>
    </div>
  );
}

export default WithdrawControl;
