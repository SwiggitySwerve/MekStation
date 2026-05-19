/**
 * Company Morale State Machine
 *
 * Pure functions, no IO. Morale is a linearly-ordered state machine
 * (`Mutinous → Unhappy → Steady → High → Elite`). `evaluateMoraleTransition`
 * inspects the enumerated `IMoraleSignals` for one day and returns at most
 * one step transition — up, down, or none (design D8). One step per day
 * keeps morale from swinging wildly.
 *
 * The signal tally is deterministic: positive signals (victories, met pay)
 * and negative signals (defeats, missed pay, desertions) are weighed; if
 * the net is positive morale steps up, if negative it steps down, if zero
 * it holds. A single bad day cannot crater morale because the step is
 * always exactly one.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/prestige/moraleStateMachine
 */

import type {
  IMoraleSignals,
  IMoraleTransition,
} from '@/types/campaign/Prestige';

import {
  MORALE_STATE_ORDER,
  MoraleState,
  moraleRank,
} from '@/types/campaign/Prestige';

// =============================================================================
// Signal Weighting
// =============================================================================

/**
 * Net morale pressure from a day's signals. A positive score pushes
 * morale up, a negative score pushes it down, zero holds.
 *
 * - each victory: +1
 * - met pay: +1
 * - each defeat: -1
 * - missed pay: -1
 * - each desertion: -1
 */
function scoreSignals(signals: IMoraleSignals): number {
  let score = 0;
  score += signals.recentVictories;
  score -= signals.recentDefeats;
  score += signals.payMet ? 1 : -1;
  score -= signals.desertions;
  return score;
}

// =============================================================================
// Transition Evaluation
// =============================================================================

/**
 * The outcome of evaluating one day's morale signals.
 */
export interface IMoraleEvaluation {
  /** Morale state before the evaluation. */
  readonly from: MoraleState;
  /** Morale state after the evaluation (equals `from` when no transition). */
  readonly to: MoraleState;
  /** Direction of the transition, or `null` when morale held. */
  readonly direction: 'up' | 'down' | null;
  /** The transition record, or `null` when morale held. */
  readonly transition: IMoraleTransition | null;
}

/**
 * Build a short human-readable reason for a transition direction.
 */
function transitionReason(
  direction: 'up' | 'down',
  signals: IMoraleSignals,
): string {
  if (direction === 'up') {
    const parts: string[] = [];
    if (signals.recentVictories > 0) {
      parts.push(`${signals.recentVictories} recent victory(s)`);
    }
    if (signals.payMet) parts.push('pay met');
    return parts.length > 0
      ? `Morale rose: ${parts.join(', ')}`
      : 'Morale rose';
  }
  const parts: string[] = [];
  if (signals.recentDefeats > 0) {
    parts.push(`${signals.recentDefeats} recent defeat(s)`);
  }
  if (!signals.payMet) parts.push('pay missed');
  if (signals.desertions > 0) parts.push(`${signals.desertions} desertion(s)`);
  return parts.length > 0 ? `Morale fell: ${parts.join(', ')}` : 'Morale fell';
}

/**
 * Evaluate a day's morale signals and return at most one step transition.
 *
 * The net signal score decides direction; the step is always exactly one
 * rank along `MORALE_STATE_ORDER`. Morale that is already at the maximum
 * (`Elite`) cannot step up and morale at the minimum (`Mutinous`) cannot
 * step down — in those cases the state holds even when the net score
 * points further.
 *
 * @param currentState - the company's current morale state
 * @param signals - the day's enumerated morale signals
 * @param occurredAt - ISO-8601 timestamp stamped onto an emitted transition
 * @returns the morale evaluation (transition or hold)
 */
export function evaluateMoraleTransition(
  currentState: MoraleState,
  signals: IMoraleSignals,
  occurredAt: string,
): IMoraleEvaluation {
  const score = scoreSignals(signals);
  const rank = moraleRank(currentState);

  // Net-zero pressure — morale holds.
  if (score === 0) {
    return {
      from: currentState,
      to: currentState,
      direction: null,
      transition: null,
    };
  }

  const direction: 'up' | 'down' = score > 0 ? 'up' : 'down';
  const nextRank = direction === 'up' ? rank + 1 : rank - 1;

  // Already at a boundary — morale cannot step further; it holds.
  if (nextRank < 0 || nextRank >= MORALE_STATE_ORDER.length) {
    return {
      from: currentState,
      to: currentState,
      direction: null,
      transition: null,
    };
  }

  const to = MORALE_STATE_ORDER[nextRank];
  const transition: IMoraleTransition = {
    from: currentState,
    to,
    direction,
    reason: transitionReason(direction, signals),
    occurredAt,
  };

  return { from: currentState, to, direction, transition };
}
