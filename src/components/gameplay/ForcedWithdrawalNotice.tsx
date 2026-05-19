/**
 * Forced Withdrawal Notice
 *
 * Transient banner shown when the Forced Withdrawal rule auto-withdraws
 * one or more of the player's units — a unit whose side morale broke,
 * or that was crippled. Surfaces the engine's `ForcedWithdrawalTriggered`
 * events so the player understands a unit they did not declare is now
 * heading off the map.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.2
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

/** A single forced-withdrawal entry the notice reports. */
export interface ForcedWithdrawalEntry {
  /** Unit forced to withdraw. */
  readonly unitId: string;
  /** Display name for the unit (falls back to the id when absent). */
  readonly unitName?: string;
  /** Why the unit was withdrawn. */
  readonly reason: 'morale-broken' | 'crippled';
}

export interface ForcedWithdrawalNoticeProps {
  /**
   * Units forced to withdraw this turn. When empty the notice renders
   * nothing — callers may mount it unconditionally.
   */
  readonly entries: readonly ForcedWithdrawalEntry[];
  /** Optional className for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Human-readable phrase for a forced-withdrawal reason. */
function reasonPhrase(reason: ForcedWithdrawalEntry['reason']): string {
  return reason === 'morale-broken'
    ? 'side morale broke'
    : 'crippled in combat';
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders an amber banner listing each forced withdrawal. Returns
 * `null` when there is nothing to report so the host can mount it
 * unconditionally without layout churn.
 */
export function ForcedWithdrawalNotice({
  entries,
  className = '',
}: ForcedWithdrawalNoticeProps): React.ReactElement | null {
  if (entries.length === 0) return null;

  return (
    <div
      className={`rounded border border-amber-600 bg-amber-900/40 px-3 py-2 ${className}`}
      role="status"
      data-testid="forced-withdrawal-notice"
    >
      <p className="text-sm font-semibold text-amber-300">Forced Withdrawal</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {entries.map((entry) => (
          <li
            key={entry.unitId}
            className="text-xs text-amber-200"
            data-testid={`forced-withdrawal-entry-${entry.unitId}`}
          >
            {entry.unitName ?? entry.unitId} is withdrawing —{' '}
            {reasonPhrase(entry.reason)}.
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ForcedWithdrawalNotice;
