/**
 * The persisted multiplayer match lifecycle: one union, one transition table.
 *
 * These three values are stored in `mp_matches.status`, in `meta_json` and on
 * the `LobbyUpdated` wire frame. Do not rename or add one without a loader
 * shim and a wire-compatibility plan.
 *
 * `completed` is the only terminal state and covers every way a match ends:
 * a finished game, a delete, an expired lobby, a failed create and a
 * reconnect timeout.
 */

export const MATCH_STATUSES = ['lobby', 'active', 'completed'] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Legal status edges. A same-status write is always legal and not listed. */
export const MATCH_STATUS_TRANSITIONS = {
  lobby: ['active', 'completed'],
  active: ['completed'],
  completed: [],
} as const satisfies Record<MatchStatus, readonly MatchStatus[]>;

/** No production path creates a finished match; a lobby or a co-op mission. */
export const MATCH_CREATE_STATUSES = [
  'lobby',
  'active',
] as const satisfies readonly MatchStatus[];

/** Domain error: the caller maps it to a response or drops the stale write. */
export class InvalidMatchStatusTransitionError extends Error {
  constructor(
    /** `null` when the refusal is for creating a match in `to`. */
    readonly from: MatchStatus | null,
    readonly to: MatchStatus,
  ) {
    super(
      from === null
        ? `Cannot create a match in status ${to}`
        : `Cannot change match status from ${from} to ${to}`,
    );
    this.name = 'InvalidMatchStatusTransitionError';
  }
}

export function canTransitionMatchStatus(
  from: MatchStatus,
  to: MatchStatus,
): boolean {
  if (from === to) return true;
  const targets: readonly MatchStatus[] = MATCH_STATUS_TRANSITIONS[from];
  return targets.includes(to);
}

export function assertMatchStatusTransition(
  from: MatchStatus,
  to: MatchStatus,
): void {
  if (!canTransitionMatchStatus(from, to)) {
    throw new InvalidMatchStatusTransitionError(from, to);
  }
}

export function assertMatchCreateStatus(status: MatchStatus): void {
  const allowed: readonly MatchStatus[] = MATCH_CREATE_STATUSES;
  if (!allowed.includes(status)) {
    throw new InvalidMatchStatusTransitionError(null, status);
  }
}
