/**
 * Unit Prestige and Company Morale Models
 *
 * Two campaign business-state types added by
 * `add-campaign-refit-and-prestige`:
 *
 * - **`IUnitPrestige`** — a per-unit cohesion / reputation score, a bounded
 *   integer adjusted by battle outcomes (victories raise, heavy damage and
 *   crew loss lower it). See design D7.
 * - **`MoraleState`** — the company-level morale state of an explicit,
 *   linearly-ordered state machine. The morale processor applies at most
 *   one step transition per day. See design D8.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module types/campaign/Prestige
 */

// =============================================================================
// Unit Prestige
// =============================================================================

/** Inclusive lower bound of a unit's prestige score. */
export const PRESTIGE_MIN = 0;

/** Inclusive upper bound of a unit's prestige score. */
export const PRESTIGE_MAX = 100;

/** Prestige score a unit starts at before its first battle. */
export const PRESTIGE_DEFAULT = 50;

/**
 * One entry in a unit's prestige history — a single applied adjustment.
 * Lets the UI surface "recent prestige changes" without re-deriving them.
 */
export interface IUnitPrestigeHistoryEntry {
  /** Match the adjustment was derived from. */
  readonly matchId: string;
  /** Signed delta applied to the score (post-clamp magnitude may differ). */
  readonly delta: number;
  /** Score after the adjustment was applied and clamped. */
  readonly scoreAfter: number;
  /** Short human-readable reason (e.g. "Victory", "Heavy damage"). */
  readonly reason: string;
  /** ISO-8601 timestamp the adjustment was applied. */
  readonly appliedAt: string;
}

/**
 * Per-unit prestige record. `score` is a bounded integer in
 * `[PRESTIGE_MIN, PRESTIGE_MAX]`; `history` is the ordered list of
 * adjustments, oldest first.
 */
export interface IUnitPrestige {
  /** Unit this prestige record describes. */
  readonly unitId: string;
  /** Current bounded prestige score. */
  readonly score: number;
  /** Ordered adjustment history, oldest first. */
  readonly history: readonly IUnitPrestigeHistoryEntry[];
}

// =============================================================================
// Company Morale
// =============================================================================

/**
 * Company morale states, linearly ordered worst-to-best. The morale
 * processor moves the company at most one step per day along this order.
 */
export enum MoraleState {
  Mutinous = 'mutinous',
  Unhappy = 'unhappy',
  Steady = 'steady',
  High = 'high',
  Elite = 'elite',
}

/**
 * Morale states in worst-to-best order. The index of a state in this
 * array is its ordinal rank — used to apply a one-step transition.
 */
export const MORALE_STATE_ORDER: readonly MoraleState[] = [
  MoraleState.Mutinous,
  MoraleState.Unhappy,
  MoraleState.Steady,
  MoraleState.High,
  MoraleState.Elite,
];

/** Default morale state for a new campaign (design D8 / open question). */
export const MORALE_DEFAULT: MoraleState = MoraleState.Steady;

/**
 * One recorded company-morale transition. Persisted on the campaign so the
 * Prestige & Morale UI can list recent transitions.
 */
export interface IMoraleTransition {
  /** Morale state before the transition. */
  readonly from: MoraleState;
  /** Morale state after the transition. */
  readonly to: MoraleState;
  /** Direction of the transition. */
  readonly direction: 'up' | 'down';
  /** Short human-readable reason. */
  readonly reason: string;
  /** ISO-8601 timestamp of the transition. */
  readonly occurredAt: string;
}

/**
 * The enumerated morale-affecting signal set the morale processor consumes
 * for one day. Every field is a deterministic, named input — there is no
 * hidden randomness (design D8).
 */
export interface IMoraleSignals {
  /** Player victories recorded since the last morale evaluation. */
  readonly recentVictories: number;
  /** Player defeats recorded since the last morale evaluation. */
  readonly recentDefeats: number;
  /** True if the company met its pay obligations this period. */
  readonly payMet: boolean;
  /** Count of personnel who deserted since the last evaluation. */
  readonly desertions: number;
}

/**
 * Get the ordinal rank of a morale state (0 = worst, 4 = best).
 */
export function moraleRank(state: MoraleState): number {
  return MORALE_STATE_ORDER.indexOf(state);
}
