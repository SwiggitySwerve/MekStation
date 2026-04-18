/**
 * PostBattleHeader
 *
 * Top-of-page header for the post-battle review surface. Shows the
 * outcome banner (Victory / Defeat / Draw), the match id, and the
 * linked contract name when present. Mirrors the visual treatment of
 * the existing victory screen so the two pages feel like siblings.
 *
 * Pure presentational — caller resolves contract name + outcome label
 * before passing them in.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 2 (Outcome Summary Header)
 * @module components/gameplay/post-battle/PostBattleHeader
 */

import React from 'react';

import {
  type ICombatOutcome,
  CombatEndReason,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

export interface PostBattleHeaderProps {
  /** Hand-off shape from the engine. */
  readonly outcome: ICombatOutcome;
  /** Side this UI player controls. Defaults to Player. */
  readonly playerSide?: GameSide;
  /** Resolved contract display name; null when standalone skirmish. */
  readonly contractName?: string | null;
}

/**
 * Map the engine's `CombatEndReason` enum onto a short, human-readable
 * label rendered in the header. The engine uses snake-case identifiers,
 * the UI uses Title Case.
 */
function endReasonLabel(reason: CombatEndReason): string {
  switch (reason) {
    case CombatEndReason.Destruction:
      return 'Destruction';
    case CombatEndReason.Concede:
      return 'Concede';
    case CombatEndReason.TurnLimit:
      return 'Turn Limit';
    case CombatEndReason.ObjectiveMet:
      return 'Objective Met';
    case CombatEndReason.Withdrawal:
      return 'Withdrawal';
    default:
      return String(reason);
  }
}

export function PostBattleHeader({
  outcome,
  playerSide = GameSide.Player,
  contractName = null,
}: PostBattleHeaderProps): React.ReactElement {
  // Outcome from the player's perspective. The composed Phase 1 report
  // carries the canonical `winner` field so we don't recompute it.
  const winner = outcome.report.winner;
  const outcomeKey: 'victory' | 'defeat' | 'draw' =
    winner === 'draw' ? 'draw' : winner === playerSide ? 'victory' : 'defeat';

  const outcomeLabel =
    outcomeKey === 'victory'
      ? 'VICTORY'
      : outcomeKey === 'defeat'
        ? 'DEFEAT'
        : 'DRAW';

  // Tailwind colors are explicit per outcome so screenreaders get the
  // semantic word AND sighted users get the visual cue.
  const outcomeColorClass =
    outcomeKey === 'victory'
      ? 'text-emerald-400'
      : outcomeKey === 'defeat'
        ? 'text-red-500'
        : 'text-gray-300';

  return (
    <div
      className="mb-8 text-center"
      data-testid="post-battle-header"
      data-outcome={outcomeKey}
    >
      <h1
        className={`text-5xl font-black tracking-tight ${outcomeColorClass}`}
        data-testid="post-battle-outcome"
      >
        {outcomeLabel}
      </h1>
      <p
        className="text-text-theme-secondary mt-2 text-base"
        data-testid="post-battle-end-reason"
      >
        {endReasonLabel(outcome.endReason)} &middot; Turn{' '}
        {outcome.report.turnCount}
      </p>
      <p
        className="text-text-theme-muted mt-1 font-mono text-xs"
        data-testid="post-battle-match-id"
      >
        Match {outcome.matchId}
      </p>
      {contractName ? (
        <p
          className="text-text-theme-secondary mt-2 text-sm"
          data-testid="post-battle-contract-name"
        >
          Contract: <span className="font-medium">{contractName}</span>
        </p>
      ) : null}
    </div>
  );
}

export default PostBattleHeader;
