/**
 * The immutable match authority baseline (leaf task 1.3; design D4).
 *
 * Two properties carry the weight, and both are about refusing to lie:
 * a missing prefix is LABELLED rather than filled in, and a baseline
 * once written is never moved.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  type IMatchAuthorityBaseline,
  digestRetainedMatchHistory,
  importMatchAuthorityBaseline,
} from '../matchAuthorityBaseline';

function event(sequence: number, type = 'UnitMoved'): IGameEvent {
  return { sequence, type } as unknown as IGameEvent;
}

/** In-memory store with the same insert-once refusal as the real one. */
function memoryStore() {
  const rows = new Map<string, IMatchAuthorityBaseline>();
  return {
    rows,
    read: (streamId: string) => rows.get(streamId) ?? null,
    insert: (baseline: IMatchAuthorityBaseline) => {
      if (rows.has(baseline.streamId)) {
        throw new Error('baseline already exists');
      }
      rows.set(baseline.streamId, baseline);
    },
  };
}

const NOW = '2026-08-25T00:00:00.000Z';

describe('importMatchAuthorityBaseline', () => {
  it('records the D4 tuple from a complete retained log', () => {
    const store = memoryStore();

    const result = importMatchAuthorityBaseline({
      matchId: 'match-1',
      retained: [event(0), event(1), event(2)],
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('imported');
    expect(result.kind === 'imported' && result.baseline).toEqual({
      streamType: 'match',
      streamId: 'match-1',
      branchId: 'main',
      revision: 2,
      digest: expect.any(String),
      effectiveGeneration: 1,
      source: 'retained-log',
      firstRetainedRevision: 0,
      importedAt: NOW,
    });
  });

  it('labels a missing prefix instead of inventing one', () => {
    // The retained log starts at 5. Filling 0-4 would put events into
    // history that nobody committed, and every later digest would then
    // agree with a past that never happened.
    const store = memoryStore();

    const result = importMatchAuthorityBaseline({
      matchId: 'match-2',
      retained: [event(5), event(6)],
      store,
      nowIso: () => NOW,
    });

    expect(result.kind === 'imported' && result.baseline.source).toBe(
      'legacy-baseline',
    );
    expect(
      result.kind === 'imported' && result.baseline.firstRetainedRevision,
    ).toBe(5);
    expect(result.kind === 'imported' && result.baseline.revision).toBe(6);
  });

  it('never moves a baseline that was already imported', () => {
    // A retry after an ambiguous failure must not rewrite history. The
    // second call reads the stored tuple and hands it back unchanged,
    // even though the log it is offered now says something different.
    const store = memoryStore();
    const first = importMatchAuthorityBaseline({
      matchId: 'match-3',
      retained: [event(0), event(1)],
      store,
      nowIso: () => NOW,
    });

    const second = importMatchAuthorityBaseline({
      matchId: 'match-3',
      retained: [event(0), event(1), event(2), event(3)],
      store,
      nowIso: () => '2026-09-01T00:00:00.000Z',
    });

    expect(second.kind).toBe('already-imported');
    expect(second.kind === 'already-imported' && second.baseline).toEqual(
      first.kind === 'imported' ? first.baseline : null,
    );
    expect(store.rows.get('match-3')?.revision).toBe(1);
  });

  it('writes nothing when there is no retained history', () => {
    // Not an error, and deliberately not a revision-0 baseline: there is
    // no history to be the baseline OF, and recording one would claim a
    // revision that was never committed.
    const store = memoryStore();

    const result = importMatchAuthorityBaseline({
      matchId: 'match-4',
      retained: [],
      store,
      nowIso: () => NOW,
    });

    expect(result.kind).toBe('empty-log');
    expect(store.rows.size).toBe(0);
  });

  it('refuses an event that cannot be placed in the stream', () => {
    // Treating a missing sequence as 0 would silently claim the event is
    // the first one, which is how a baseline ends up describing a
    // history nobody has.
    const store = memoryStore();

    expect(() =>
      importMatchAuthorityBaseline({
        matchId: 'match-5',
        retained: [{ type: 'UnitMoved' } as unknown as IGameEvent],
        store,
        nowIso: () => NOW,
      }),
    ).toThrow(/no integer sequence/);
    expect(store.rows.size).toBe(0);
  });
});

describe('digestRetainedMatchHistory', () => {
  it('agrees for the same retained facts', () => {
    expect(digestRetainedMatchHistory([event(0), event(1)])).toBe(
      digestRetainedMatchHistory([event(0), event(1)]),
    );
  });

  it('differs when the history differs', () => {
    // Both length and content: a digest that ignored either would let a
    // truncated or altered log pass as the imported one.
    const base = digestRetainedMatchHistory([event(0), event(1)]);
    expect(digestRetainedMatchHistory([event(0)])).not.toBe(base);
    expect(
      digestRetainedMatchHistory([event(0), event(1, 'UnitFell')]),
    ).not.toBe(base);
  });
});
