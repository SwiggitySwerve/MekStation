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
  /**
   * Per viewer, the AUTHORITY sequence behind each frame they were
   * sent, in delivery order. The index IS the delivery sequence.
   *
   * Kept so a resuming client can name where it got to using only its
   * own numbering - it has no authority sequence to quote, which is the
   * whole point - while the server can still find what it missed.
   */
  private readonly delivered = new Map<string, number[]>();

  /**
   * Take this viewer's next delivery sequence, recording which
   * authority event it carried. Call once per frame actually sent.
   */
  assign(playerId: string, authoritySequence: number | null): number {
    const list = this.delivered.get(playerId) ?? [];
    list.push(authoritySequence ?? -1);
    this.delivered.set(playerId, list);
    return list.length - 1;
  }

  /**
   * The delivery index already issued for this authority sequence, or
   * null when this viewer has never been sent that event.
   *
   * Replay uses this to reuse a number rather than call `assign` again:
   * a second assign for an event already in the record is the same
   * double-numbering defect as #1406 (two sockets splitting one
   * viewer's stream).
   */
  deliverySequenceOf(
    playerId: string,
    authoritySequence: number,
  ): number | null {
    const list = this.delivered.get(playerId);
    if (list === undefined) return null;
    const index = list.indexOf(authoritySequence);
    return index >= 0 ? index : null;
  }

  /**
   * The authority sequence of the FIRST frame this viewer missed after
   * `cursor`, or null when they are already current.
   *
   * A replay START rather than a list, because the existing per-player
   * replay already filters to what this viewer may see - resuming from
   * that point gives them their tail and nothing they are not owed.
   */
  firstMissedAuthoritySequence(
    playerId: string,
    cursor: number,
  ): number | null {
    const list = this.delivered.get(playerId);
    if (list === undefined) return null;
    for (let index = cursor + 1; index < list.length; index += 1) {
      if (list[index] >= 0) return list[index];
    }
    return null;
  }

  /** How many frames this viewer has been sent. Test/observability. */
  issued(playerId: string): number {
    return (this.delivered.get(playerId) ?? []).length;
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
    this.delivered.delete(playerId);
  }
}
