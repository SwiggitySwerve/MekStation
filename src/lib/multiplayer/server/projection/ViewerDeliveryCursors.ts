/**
 * Per-viewer delivery sequence (umbrella task 11.1, first slice).
 *
 * `multiplayer-sync` requires the server to "assign a gapless delivery
 * sequence independently for each viewer projection stream". Today the
 * wire carries the global AUTHORITY sequence instead, and under fog a
 * viewer's slice of it is full of holes — holes that both leak how many
 * events were concealed (see `viewerSequenceConcealmentLeak`) and make
 * client-side gap detection impossible, because a hole is
 * indistinguishable from a legitimately withheld event.
 *
 * This assigns the other number: one counter per viewer, incremented
 * once per frame actually sent to them, with no relationship to the
 * authority sequence at all.
 *
 * WHY IT IS ASSIGNED AT SEND TIME, not at filter time. A frame that the
 * publication boundary omits, or that fog withholds, never reaches the
 * viewer and never consumes one of their numbers — that is what makes
 * the sequence gapless for them. Conversely a send that FAILS does
 * consume its number, and that is deliberate: the resulting hole is a
 * true signal that something was lost, which is precisely the signal
 * the authority sequence could never give.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 */

export class ViewerDeliveryCursors {
  /** Next sequence to hand out, per viewer. Absent means zero. */
  private readonly next = new Map<string, number>();

  /**
   * Take this viewer's next delivery sequence. Call once per frame that
   * is actually being sent to them.
   */
  assign(playerId: string): number {
    const value = this.next.get(playerId) ?? 0;
    this.next.set(playerId, value + 1);
    return value;
  }

  /** How many frames this viewer has been sent. Test/observability. */
  issued(playerId: string): number {
    return this.next.get(playerId) ?? 0;
  }

  /**
   * Drop a viewer's counter.
   *
   * NOT called on disconnect: a reconnecting participant must not have
   * their stream renumbered from zero, or their cursor would point into
   * a different stream than the one they resume against. Reserved for
   * match teardown.
   */
  forget(playerId: string): void {
    this.next.delete(playerId);
  }
}
