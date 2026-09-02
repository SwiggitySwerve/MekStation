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
