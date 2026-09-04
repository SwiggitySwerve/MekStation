import React from 'react';

/**
 * WHAT: Renders the server's recoveryAction string with no local wording.
 * WHY: A stale-branch block is only actionable if the player sees the
 * instruction the authority already named; paraphrasing it would drift.
 */
export function BranchRecoveryInstruction({
  recoveryAction,
}: {
  readonly recoveryAction: string | null;
}): React.ReactElement | null {
  if (recoveryAction === null) return null;
  return (
    <span
      data-testid="tactical-branch-recovery-action"
      className="text-xs text-slate-400"
    >
      {recoveryAction}
    </span>
  );
}
