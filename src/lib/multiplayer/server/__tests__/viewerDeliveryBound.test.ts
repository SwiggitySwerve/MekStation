/**
 * Per-viewer unacked bound (E2E-14), cursor-only — no sockets.
 *
 * Today these methods do not exist, so both rows throw
 * `TypeError: ... is not a function` (Expected true, Received false).
 */

import {
  MAX_VIEWER_UNACKED,
  ViewerDeliveryCursors,
} from '../projection/ViewerDeliveryCursors';

describe('ViewerDeliveryCursors unacked bound', () => {
  it('discardAll drops delivered slots from the superseded history', () => {
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 20);
    cursors.discardAll();
    expect(cursors.issued('p1')).toBe(0);
    expect(cursors.deliverySequenceOf('p1', 20)).toBeNull();
    expect(cursors.assign('p1', 3)).toBe(0);
  });

  it('discardAll drops acknowledgements so the new stream enforces its own bound', () => {
    const cursors = new ViewerDeliveryCursors();
    cursors.assign('p1', 20);
    cursors.acknowledge('p1', 0);
    cursors.discardAll();
    for (let index = 0; index < MAX_VIEWER_UNACKED; index += 1) {
      cursors.assign('p1', index);
    }
    expect(cursors.unacked('p1')).toBe(MAX_VIEWER_UNACKED);
    expect(cursors.admit('p1', 99)).toBe(false);
  });

  it('discardAll drops isolation so a rebuilt stream can deliver live frames', () => {
    const cursors = new ViewerDeliveryCursors();
    for (let index = 0; index < MAX_VIEWER_UNACKED; index += 1) {
      cursors.assign('p1', index);
    }
    expect(cursors.admit('p1', 99)).toBe(false);
    cursors.discardAll();
    expect(cursors.isIsolated('p1')).toBe(false);
    expect(cursors.admit('p1', 3)).toBe(true);
  });

  it('discardAll drops the refused-event resume marker from the superseded history', () => {
    const cursors = new ViewerDeliveryCursors();
    for (let index = 0; index < MAX_VIEWER_UNACKED; index += 1) {
      cursors.assign('p1', index);
    }
    expect(cursors.admit('p1', 99)).toBe(false);
    cursors.discardAll();
    expect(cursors.firstMissedAuthoritySequence('p1', -1)).toBeNull();
  });

  it('unacked counts issued minus acked and trips the bound for that viewer only', () => {
    const cursors = new ViewerDeliveryCursors();
    for (let index = 0; index < 3; index += 1) {
      cursors.assign('p1', index);
    }
    cursors.acknowledge('p1', 2);
    for (let index = 0; index < MAX_VIEWER_UNACKED; index += 1) {
      cursors.assign('p2', index);
    }

    expect(cursors.unacked('p2')).toBe(MAX_VIEWER_UNACKED);
    expect(cursors.unacked('p1')).toBe(0);
    expect(cursors.admit('p2', 99)).toBe(false);
    expect(cursors.isIsolated('p2')).toBe(true);
    expect(cursors.admit('p1', 99)).toBe(true);
    expect(cursors.isIsolated('p1')).toBe(false);
  });

  it('a fresh ack below the bound clears the isolation', () => {
    const cursors = new ViewerDeliveryCursors();
    for (let index = 0; index < MAX_VIEWER_UNACKED; index += 1) {
      cursors.assign('p2', index);
    }
    expect(cursors.admit('p2', 80)).toBe(false);
    expect(cursors.isIsolated('p2')).toBe(true);

    cursors.acknowledge('p2', 0);
    expect(cursors.unacked('p2')).toBe(MAX_VIEWER_UNACKED - 1);
    expect(cursors.isIsolated('p2')).toBe(false);
  });
});
