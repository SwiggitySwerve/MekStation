/**
 * Records that this client's match log disagreed with the peer's
 * (umbrella 19.2, findings #62 and #79).
 *
 * WHY A DEDICATED STORE RATHER THAN A `localMatchStatus` ARM. The
 * peer-presence detector writes that field every second while the peer
 * is present (`deriveLocalMatchStatusFromAwareness` answers `live` on
 * presence, not on a transition), and a divergence is detected in
 * exactly that state - it arrives on a replay the peer just streamed.
 * An arm there would be erased within a second of being set, and the two
 * facts genuinely coexist: the peer can drop immediately afterwards.
 *
 * WHY IT IS KEYED BY MATCH. The flag is sticky for the session, and a
 * session outlives a match. Without the match id a player who diverged
 * in one battle would find the next one refused before it began.
 *
 * WHY THERE IS NO `clear`. E4c-B1 ships the refusal, not the recovery.
 * After a divergence `reconcileMatchLogMirror` has deleted the durable
 * log and the in-memory session still holds events the peer's history
 * replaced, so the board really is wrong until it is rebuilt from the
 * peer's log - that rebuild is E4c-B2. A `clear()` the UI could call
 * would be a button that lies. Note especially that recording a later
 * `match` verdict must NOT clear it: with the log deleted the very next
 * reconcile returns `match` trivially, so treating that as recovery
 * would clear the flag immediately and falsely.
 */

import { create } from 'zustand';

import type { MatchLogPrefixVerdict } from './matchLogPrefix';

/** What the gate needs to know: which shape, and where it broke. */
export interface IP2PMirrorDivergence {
  readonly kind: 'replaced' | 'truncated';
  readonly position: number;
}

interface IP2PMirrorState {
  /** The diverged match id, or `null` when no divergence is recorded. */
  readonly matchId: string | null;
  readonly divergence: IP2PMirrorDivergence | null;
  /** Record a verdict for a match. A `match` verdict records nothing. */
  recordDivergence(matchId: string, verdict: MatchLogPrefixVerdict): void;
  /** The divergence for this match, or `null`. */
  divergenceFor(matchId: string | null): IP2PMirrorDivergence | null;
  /** Session-level reset. Not a recovery path - see the module header. */
  reset(): void;
}

export const useP2PMirrorStore = create<IP2PMirrorState>((set, get) => ({
  matchId: null,
  divergence: null,
  recordDivergence: (matchId, verdict) => {
    if (verdict.kind === 'match') return;
    set({
      matchId,
      divergence: { kind: verdict.kind, position: verdict.position },
    });
  },
  divergenceFor: (matchId) => {
    if (matchId === null) return null;
    const state = get();
    return state.matchId === matchId ? state.divergence : null;
  },
  reset: () => set({ matchId: null, divergence: null }),
}));
