/**
 * PendingPeerTracker unit tests.
 *
 * Drives the tracker with an injected scheduler so we can advance
 * "wall clock" without `jest.useFakeTimers()` polluting the rest of
 * the suite.
 */

import {
  PendingPeerTracker,
  type IPendingPeerEntry,
} from '../reconnection/PendingPeerTracker';

// =============================================================================
// Manual scheduler — gives tests deterministic control over timer firings.
// =============================================================================

interface IScheduledJob {
  id: number;
  fireAt: number;
  cb: () => void;
  cancelled: boolean;
}

function makeManualScheduler(graceMs: number) {
  const jobs: IScheduledJob[] = [];
  let nextId = 1;
  let now = 0;
  const schedule = (cb: () => void, ms: number): NodeJS.Timeout => {
    const id = nextId;
    nextId += 1;
    jobs.push({ id, fireAt: now + ms, cb, cancelled: false });
    // Cast through unknown so TS lets us return a fake Timeout handle.
    return id as unknown as NodeJS.Timeout;
  };
  const cancel = (handle: NodeJS.Timeout): void => {
    const id = handle as unknown as number;
    const job = jobs.find((j) => j.id === id);
    if (job) job.cancelled = true;
  };
  const advance = (ms: number): void => {
    now += ms;
    // Snapshot before iterating; callbacks may schedule new jobs.
    const due = jobs.filter((j) => !j.cancelled && j.fireAt <= now);
    for (const j of due) {
      j.cancelled = true; // one-shot
      j.cb();
    }
  };
  return { schedule, cancel, advance, graceMs };
}

// =============================================================================
// Tests
// =============================================================================

describe('PendingPeerTracker', () => {
  it('markPending registers an entry visible via isPending', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    const entry = tracker.markPending('p1', 'alpha-1', () => {});
    expect(entry.playerId).toBe('p1');
    expect(entry.slotId).toBe('alpha-1');
    expect(tracker.isPending('p1')).toBe(true);
    expect(tracker.size()).toBe(1);
  });

  it('clearPending cancels the timer and returns true', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    let fired = false;
    tracker.markPending('p1', 'alpha-1', () => {
      fired = true;
    });
    expect(tracker.clearPending('p1')).toBe(true);
    sched.advance(200);
    expect(fired).toBe(false);
    expect(tracker.isPending('p1')).toBe(false);
  });

  it('clearPending returns false when no timer is active', () => {
    const tracker = new PendingPeerTracker();
    expect(tracker.clearPending('nobody')).toBe(false);
  });

  it('timer fires onTimeout with the original entry after graceMs', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    let captured: IPendingPeerEntry | null = null;
    tracker.markPending('p1', 'alpha-1', (e) => {
      captured = e;
    });
    sched.advance(100);
    expect(captured).not.toBeNull();
    expect(captured!.playerId).toBe('p1');
    expect(captured!.slotId).toBe('alpha-1');
    // Entry was removed before the callback fired.
    expect(tracker.isPending('p1')).toBe(false);
  });

  it('markPending twice for the same player replaces the prior timer', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    const fires: string[] = [];
    tracker.markPending('p1', 'alpha-1', () => fires.push('first'));
    tracker.markPending('p1', 'alpha-1', () => fires.push('second'));
    sched.advance(200);
    expect(fires).toEqual(['second']);
  });

  it('getAllPending returns a snapshot of every active entry', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    tracker.markPending('p1', 'alpha-1', () => {});
    tracker.markPending('p2', 'bravo-1', () => {});
    const snap = tracker.getAllPending();
    expect(snap.length).toBe(2);
    expect(snap.map((e) => e.playerId).sort()).toEqual(['p1', 'p2']);
  });

  it('clearAll cancels every outstanding timer', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    let fires = 0;
    tracker.markPending('p1', 'alpha-1', () => {
      fires += 1;
    });
    tracker.markPending('p2', 'bravo-1', () => {
      fires += 1;
    });
    tracker.clearAll();
    sched.advance(200);
    expect(fires).toBe(0);
    expect(tracker.size()).toBe(0);
  });

  it('a misbehaving onTimeout handler does not poison the tracker', () => {
    const sched = makeManualScheduler(100);
    const tracker = new PendingPeerTracker(
      sched.graceMs,
      sched.schedule,
      sched.cancel,
    );
    tracker.markPending('p1', 'alpha-1', () => {
      throw new Error('listener exploded');
    });
    expect(() => sched.advance(200)).not.toThrow();
    expect(tracker.isPending('p1')).toBe(false);
  });
});
