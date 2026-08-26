/**
 * A client resumes by quoting its OWN delivery cursor.
 *
 * This is what lets the authority sequence eventually leave player
 * frames. Today a resuming client quotes `lastSeq`, which is an
 * authority sequence — a number it can only have because the server
 * hands it one, and handing it one is exactly the leak
 * `viewerSequenceConcealmentLeak` measures. A client that resumes on
 * its own numbering does not need that number at all.
 *
 * The translation lives on the server, where the viewer's delivery
 * record is: cursor N means "the first authority event after the Nth
 * frame I sent you". The existing per-player replay then filters to
 * what that viewer may see, so resuming from that point returns their
 * tail and nothing they are not owed.
 */

import { ViewerDeliveryCursors } from '../projection/ViewerDeliveryCursors';

describe('ViewerDeliveryCursors resume translation', () => {
  it('maps a delivery cursor to the first authority event missed', () => {
    const cursors = new ViewerDeliveryCursors();
    // The viewer was sent authority events 2, 5 and 9 — a sparse slice,
    // because fog withheld the rest.
    expect(cursors.assign('p1', 2)).toBe(0);
    expect(cursors.assign('p1', 5)).toBe(1);
    expect(cursors.assign('p1', 9)).toBe(2);

    // Applied through delivery 0, so the next thing owed is authority 5.
    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBe(5);
    expect(cursors.firstMissedAuthoritySequence('p1', 1)).toBe(9);
  });

  it('says nothing is missed when the viewer is current', () => {
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 2);
    cursors.assign('p1', 5);

    expect(cursors.firstMissedAuthoritySequence('p1', 1)).toBeNull();
  });

  it('has no answer for a viewer it never sent anything to', () => {
    // The post-restart case. A null here is what makes the caller fall
    // back to `lastSeq` and replay in full, which is the correct answer
    // rather than a confidently wrong one.
    const cursors = new ViewerDeliveryCursors();

    expect(cursors.firstMissedAuthoritySequence('never-seen', 0)).toBeNull();
  });

  it('numbers each viewer independently', () => {
    // Two viewers, different slices, both starting at zero. A shared
    // counter would make one viewer's cursor point into the other's
    // stream.
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 2);
    cursors.assign('p2', 3);
    cursors.assign('p1', 5);

    expect(cursors.issued('p1')).toBe(2);
    expect(cursors.issued('p2')).toBe(1);
    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBe(5);
    expect(cursors.firstMissedAuthoritySequence('p2', 0)).toBeNull();
  });

  it('skips frames that carried no authority sequence', () => {
    // Not every frame is a sequenced game event. One that carries no
    // authority sequence still consumes a delivery number — the viewer
    // received it — but it cannot be a replay start.
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 2);
    cursors.assign('p1', null);
    cursors.assign('p1', 7);

    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBe(7);
  });

  it('forgets a viewer only when asked', () => {
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 2);
    expect(cursors.issued('p1')).toBe(1);

    cursors.forget('p1');

    expect(cursors.issued('p1')).toBe(0);
    expect(cursors.firstMissedAuthoritySequence('p1', 0)).toBeNull();
  });
});
