/**
 * M-H3: the pause snapshot names the highest-precedence active cause and
 * always lists the pending seats; grace fields ride only with a pending
 * seat. The refusal text names the cause.
 */

import {
  buildPauseSnapshot,
  pauseRefusalReason,
} from '../ServerMatchHostReconnectLifecycle';

const pending = [
  { playerId: 'guest', slotId: 'bravo-1', expiresAt: 61_000 },
  { playerId: 'ally', slotId: 'alpha-2', expiresAt: 31_000 },
];

describe('buildPauseSnapshot', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(1_000));
  afterEach(() => jest.useRealTimers());

  it('is null when no cause is active', () => {
    expect(
      buildPauseSnapshot({
        matchId: 'm',
        pending: [],
        gmAbsent: false,
        opponentFaulted: false,
      }),
    ).toBeNull();
  });

  it.each([
    [true, true, 'opponent-fault'],
    [false, true, 'gm-absent'],
    [false, false, 'peer-pending'],
  ] as const)(
    'fault=%s gmAbsent=%s with a pending seat reports %s',
    (opponentFaulted, gmAbsent, reason) => {
      expect(
        buildPauseSnapshot({
          matchId: 'm',
          pending,
          gmAbsent,
          opponentFaulted,
        }),
      ).toEqual({
        kind: 'MatchPaused',
        matchId: 'm',
        ts: expect.any(String),
        reason,
        pendingSlots: ['bravo-1', 'alpha-2'],
        graceRemainingMs: 30_000,
        pendingExpiresAtMs: 31_000,
      });
    },
  );

  it.each([
    [true, false, 'opponent-fault'],
    [false, true, 'gm-absent'],
  ] as const)(
    'fault=%s gmAbsent=%s without a pending seat carries no grace',
    (opponentFaulted, gmAbsent, reason) => {
      expect(
        buildPauseSnapshot({
          matchId: 'm',
          pending: [],
          gmAbsent,
          opponentFaulted,
        }),
      ).toEqual({
        kind: 'MatchPaused',
        matchId: 'm',
        ts: expect.any(String),
        reason,
        pendingSlots: [],
      });
    },
  );
});

describe('pauseRefusalReason', () => {
  it.each([
    [null, 'Match is paused waiting for a peer to reconnect'],
    ['peer-pending', 'Match is paused waiting for a peer to reconnect'],
    ['gm-absent', 'Match is paused until the campaign GM returns'],
    ['opponent-fault', 'Match is paused after a server opponent fault'],
  ] as const)('names %s', (reason, text) => {
    expect(pauseRefusalReason(reason)).toBe(text);
  });
});
