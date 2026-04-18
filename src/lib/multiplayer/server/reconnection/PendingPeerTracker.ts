/**
 * PendingPeerTracker — owns the per-pending-player grace timers.
 *
 * Wave 4 of Phase 4. When a socket closes, the host marks the player's
 * seat as `pending` and asks this tracker to start a 120s grace timer.
 * If the player reconnects before the timer fires, `clearPending`
 * cancels it. If the timer expires, the registered `onTimeout`
 * callback fires (the host then broadcasts `SeatTimedOut`).
 *
 * Why this is its own class:
 *   - Centralises `setTimeout`/`clearTimeout` lifetime so the host
 *     doesn't litter timer ids across its own state.
 *   - Gives the test suite a clean seam — tests can introspect via
 *     `getAllPending()` and tick `jest.useFakeTimers()` without
 *     reaching into the host.
 *
 * Lifetime: one tracker per `ServerMatchHost`. `closeMatch()` MUST
 * call `clearAll()` so dangling timers don't keep Node alive after a
 * match finishes.
 *
 * @spec openspec/changes/add-reconnection-and-session-rehydration/proposal.md
 */

import { RECONNECT_GRACE_MS } from '@/types/multiplayer/Protocol';

// =============================================================================
// Types
// =============================================================================

/**
 * Public-facing snapshot of a pending entry. Returned by
 * `getAllPending()` so callers can render banners or run integration
 * assertions without touching the timer handle.
 */
export interface IPendingPeerEntry {
  readonly playerId: string;
  readonly slotId: string;
  /** Wall-clock ms (from `Date.now()`) when this peer's grace expires. */
  readonly expiresAt: number;
}

/**
 * Callback invoked when the grace timer fires. The host uses this to
 * broadcast `SeatTimedOut`. Synchronous on purpose — async work the
 * host wants to do should be wrapped at the call site so the tracker
 * never has to track a Promise lifecycle.
 */
export type IPendingTimeoutHandler = (entry: IPendingPeerEntry) => void;

interface IInternalEntry extends IPendingPeerEntry {
  readonly timer: NodeJS.Timeout;
}

// =============================================================================
// Tracker
// =============================================================================

export class PendingPeerTracker {
  /**
   * Map keyed by `playerId` because reconnect lookup is always
   * "did this verified socket-identity have a pending seat?". A player
   * is in at most one seat per match (the lobby state machine enforces
   * uniqueness), so per-player keys are unambiguous.
   */
  private readonly entries = new Map<string, IInternalEntry>();

  /**
   * Allow injection of a custom `setTimeout`/`clearTimeout` pair so
   * tests can drive the tracker with `jest.useFakeTimers()` without
   * monkey-patching globals. Defaults to the Node globals.
   */
  constructor(
    private readonly graceMs: number = RECONNECT_GRACE_MS,
    private readonly schedule: (
      cb: () => void,
      ms: number,
    ) => NodeJS.Timeout = (cb, ms) => setTimeout(cb, ms),
    private readonly cancel: (handle: NodeJS.Timeout) => void = (h) =>
      clearTimeout(h),
  ) {}

  /**
   * Start the grace timer for a pending peer. Idempotent on the
   * `playerId` key — calling twice replaces the prior timer (this lets
   * the host call `markPending` defensively without double-scheduling).
   */
  markPending(
    playerId: string,
    slotId: string,
    onTimeout: IPendingTimeoutHandler,
  ): IPendingPeerEntry {
    const existing = this.entries.get(playerId);
    if (existing) {
      this.cancel(existing.timer);
    }
    const expiresAt = Date.now() + this.graceMs;
    const timer = this.schedule(() => {
      // Fire-and-forget the callback. We delete the entry FIRST so the
      // callback sees a clean tracker if it asks `isPending(playerId)`.
      const entry = this.entries.get(playerId);
      if (!entry) return; // raced with clearPending
      this.entries.delete(playerId);
      try {
        onTimeout({
          playerId: entry.playerId,
          slotId: entry.slotId,
          expiresAt: entry.expiresAt,
        });
      } catch {
        // The host is responsible for its own logging; we never let a
        // misbehaving handler kill the tracker.
      }
    }, this.graceMs);
    if (typeof (timer as NodeJS.Timeout).unref === 'function') {
      (timer as NodeJS.Timeout).unref();
    }
    const entry: IInternalEntry = {
      playerId,
      slotId,
      expiresAt,
      timer,
    };
    this.entries.set(playerId, entry);
    return { playerId, slotId, expiresAt };
  }

  /**
   * Cancel the grace timer for a player. Returns true if a timer was
   * actually cancelled, false if there was none. The host calls this
   * on successful reconnect AND on `MarkSeatAi`.
   */
  clearPending(playerId: string): boolean {
    const entry = this.entries.get(playerId);
    if (!entry) return false;
    this.cancel(entry.timer);
    this.entries.delete(playerId);
    return true;
  }

  /**
   * True iff this player currently has an active grace timer.
   */
  isPending(playerId: string): boolean {
    return this.entries.has(playerId);
  }

  /**
   * Snapshot the current pending set. Used by `MatchPaused` payload
   * construction and by tests.
   */
  getAllPending(): readonly IPendingPeerEntry[] {
    const out: IPendingPeerEntry[] = [];
    // `Array.from(values())` instead of `for..of` so the codebase's
    // pre-ES2015 iteration target stays happy without flipping the
    // tsconfig globally.
    for (const e of Array.from(this.entries.values())) {
      out.push({
        playerId: e.playerId,
        slotId: e.slotId,
        expiresAt: e.expiresAt,
      });
    }
    return out;
  }

  /**
   * Cancel every outstanding timer. The host MUST call this from
   * `closeMatch()` so finished-match resources don't keep Node alive.
   */
  clearAll(): void {
    for (const entry of Array.from(this.entries.values())) {
      this.cancel(entry.timer);
    }
    this.entries.clear();
  }

  /** Test/observability: total number of pending entries. */
  size(): number {
    return this.entries.size;
  }
}
