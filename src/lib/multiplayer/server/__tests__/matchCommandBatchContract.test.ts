/**
 * The command-batch contract rules (adopt-combat-event-journal-authority
 * PR 1a; umbrella section 3 `Atomic Command Event Batches`).
 *
 * These are the two decisions a store must not be free to make
 * differently: what makes two batches the SAME work, and what makes a
 * batch internally well-formed. Both are pure, so every adapter that
 * implements the contract answers them identically rather than each
 * inventing its own idea of "same command".
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  firstNonContiguousSequence,
  matchCommandFingerprint,
  type IMatchCommandBatch,
} from '../matchCommandBatch';

function event(sequence: number, overrides: Partial<IGameEvent> = {}) {
  return {
    id: `evt-${sequence}`,
    gameId: 'match-1',
    sequence,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
    ...overrides,
  } as IGameEvent;
}

function batch(
  overrides: Partial<IMatchCommandBatch> = {},
): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    ...overrides,
  };
}

describe('command identity', () => {
  it('gives an identical retry an identical fingerprint', () => {
    // The whole point of the identity: a client that never saw its
    // acknowledgement resends the same work, and the store must be able
    // to recognise it rather than apply it a second time.
    expect(matchCommandFingerprint(batch())).toBe(
      matchCommandFingerprint(batch()),
    );
  });

  it('separates the same id issued by a different actor', () => {
    // Treating this as a retry would let one player's command be
    // silently attributed to another's.
    expect(matchCommandFingerprint(batch({ actorId: 'p2' }))).not.toBe(
      matchCommandFingerprint(batch()),
    );
  });

  it('separates the same id carrying different events', () => {
    expect(
      matchCommandFingerprint(
        batch({ events: [event(0), event(1, { id: 'other' })] }),
      ),
    ).not.toBe(matchCommandFingerprint(batch()));
  });

  it('separates the same id claiming a different starting revision', () => {
    // Same events, different place in history is different work: the
    // resulting state is not the same.
    expect(
      matchCommandFingerprint(
        batch({ expectedRevision: 5, events: [event(5), event(6)] }),
      ),
    ).not.toBe(matchCommandFingerprint(batch()));
  });

  it('separates two events that differ only by type', () => {
    // A fingerprint over ids alone would call these the same command.
    expect(
      matchCommandFingerprint(
        batch({
          events: [event(0), event(1, { type: GameEventType.GameEnded })],
        }),
      ),
    ).not.toBe(matchCommandFingerprint(batch()));
  });
});

describe('batch contiguity', () => {
  it('accepts an unbroken run from the expected revision', () => {
    expect(firstNonContiguousSequence(batch())).toBeNull();
  });

  it('accepts a run starting anywhere, not just zero', () => {
    expect(
      firstNonContiguousSequence(
        batch({ expectedRevision: 7, events: [event(7), event(8)] }),
      ),
    ).toBeNull();
  });

  it('names the revision that broke the run rather than just failing', () => {
    // "Somewhere in this batch" is not something an operator can act on.
    expect(
      firstNonContiguousSequence(batch({ events: [event(0), event(2)] })),
    ).toBe(2);
  });

  it('rejects a batch that does not start at the expected revision', () => {
    expect(firstNonContiguousSequence(batch({ expectedRevision: 3 }))).toBe(0);
  });

  it('rejects a repeated revision, not only a skipped one', () => {
    // A duplicate revision is as unreadable as a gap: two events claim
    // the same place in history.
    expect(
      firstNonContiguousSequence(batch({ events: [event(0), event(0)] })),
    ).toBe(0);
  });

  it('treats an empty batch as trivially contiguous', () => {
    // Emptiness is the store's decision to reject, not the contiguity
    // rule's - keeping them separate means the store can report WHICH
    // thing was wrong.
    expect(firstNonContiguousSequence(batch({ events: [] }))).toBeNull();
  });
});
