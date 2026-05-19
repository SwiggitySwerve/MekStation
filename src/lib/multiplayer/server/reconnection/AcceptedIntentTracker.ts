/**
 * AcceptedIntentTracker — per-match bounded set of accepted intent ids
 * for replay-attack protection.
 *
 * Per `harden-multiplayer-transport` design D7: every `Intent` envelope
 * carries a unique `intentId`. The authoritative server records the id
 * of every intent it accepts. An inbound intent whose id is already in
 * the set is rejected with `Error {code: 'DUPLICATE_INTENT'}` and
 * produces no event — a replayed envelope cannot re-trigger a movement
 * or attack.
 *
 * Bounding: the set only needs to cover the window an attacker could
 * realistically replay within (`INTENT_REPLAY_WINDOW`). Once it grows
 * past that bound the oldest ids are evicted in insertion order — a
 * replay older than the window is no longer a meaningful attack because
 * the game state has moved far past it. Insertion order is preserved by
 * the `Set`'s iteration guarantee.
 *
 * Recovery: when a match is rebuilt from the durable store on server
 * restart, the tracker is reconstructed by scanning the persisted event
 * log for stamped `intentId`s (the host stamps the accepted intent id
 * onto the first event of each engine-mutating intent — see
 * `ServerMatchHostEvents.stampIntentIdOnNewEvents`). This closes the
 * replay window across a restart so a previously-accepted intent cannot
 * be re-sent after recovery.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { INTENT_REPLAY_WINDOW } from '@/types/multiplayer/Protocol';

export class AcceptedIntentTracker {
  /**
   * Insertion-ordered set of accepted intent ids. A `Set` preserves
   * insertion order, so eviction of the oldest id is just deleting the
   * first key the iterator yields.
   */
  private readonly accepted = new Set<string>();

  constructor(private readonly maxSize: number = INTENT_REPLAY_WINDOW) {}

  /**
   * True iff this intent id has already been accepted for the match —
   * i.e. the inbound envelope is a replay and must be rejected.
   */
  isDuplicate(intentId: string): boolean {
    return this.accepted.has(intentId);
  }

  /**
   * Record an intent id as accepted. Evicts the oldest id if the set
   * exceeds its bound. Idempotent — recording an id already present is
   * a no-op (it does not refresh recency, which keeps eviction stable).
   */
  record(intentId: string): void {
    if (this.accepted.has(intentId)) return;
    this.accepted.add(intentId);
    while (this.accepted.size > this.maxSize) {
      const oldest = this.accepted.values().next().value;
      if (oldest === undefined) break;
      this.accepted.delete(oldest);
    }
  }

  /** Number of accepted ids currently retained. */
  size(): number {
    return this.accepted.size;
  }

  /**
   * Reconstruct the tracker's accepted-id set from a persisted event
   * log. Used by the server-startup recovery routine (design D3) so a
   * restart does not reopen the replay window. Each event's payload may
   * carry a stamped `intentId` (the host stamps it onto the first event
   * of each accepted engine-mutating intent); we replay those in
   * sequence order so the bounded-set eviction matches live behavior.
   */
  static fromEventLog(
    events: readonly IGameEvent[],
    maxSize: number = INTENT_REPLAY_WINDOW,
  ): AcceptedIntentTracker {
    const tracker = new AcceptedIntentTracker(maxSize);
    const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
    for (const event of ordered) {
      const payload = event.payload as
        | { readonly intentId?: unknown }
        | undefined
        | null;
      const intentId = payload?.intentId;
      if (typeof intentId === 'string' && intentId.length > 0) {
        tracker.record(intentId);
      }
    }
    return tracker;
  }
}
