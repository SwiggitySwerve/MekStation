/**
 * Match recovery refuses a corrupt authority by name (umbrella task 15.3
 * adoption, the combat door).
 *
 * `recoverActiveMatches` has always skipped a match it could not rebuild -
 * an empty log, or one that will not fold - with a `console.warn` and the
 * id pushed onto `failed`. That is a truthful refusal in the sense that
 * nothing partial is published, but it says NOTHING about why, so an
 * operator reading the boot log cannot tell an empty log from a broken
 * one, and no caller can branch on the difference.
 *
 * Pins: each corruption class comes back as a TYPED blocked verdict
 * naming its reason; no host is registered for a blocked match and no
 * partial session is published; the id still appears in `failed`, so the
 * existing callers keep working unchanged; and one blocked match does not
 * stop the sweep reaching the next.
 *
 * NOT covered here: a healthy match recovering alongside a blocked one.
 * Building one costs the full host fixture (grid, adapted units, sockets),
 * which `durableViewerDelivery.test.ts` already owns and proves - it
 * recovers a live host through this same function. The healthy-control
 * pairing is task 15.4's letter, and lands there rather than being
 * duplicated here.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  createGameSession,
  GameEventIdCollisionError,
  GameEventSequenceError,
} from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

import type { IMatchMeta } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { recoverActiveMatches } from '../MatchRecovery';

const NOW = '2026-09-02T00:00:00.000Z';

function activeMatch(matchId: string): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    sideAssignments: [],
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    config: { mapRadius: 6, turnLimit: 5 },
  };
}

/**
 * An event that is NOT `GameCreated`, so hydration has no session to
 * start from. The concrete shape does not matter beyond the discriminant
 * - the fold refuses before it reads anything else.
 */
function orphanEvent(matchId: string): IGameEvent {
  return {
    id: `${matchId}-evt-1`,
    gameId: matchId,
    sequence: 0,
    timestamp: NOW,
    type: GameEventType.TurnStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: { turn: 1 },
  } as IGameEvent;
}

describe('match recovery blocked verdicts', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    new GameEventIdCollisionError('injected'),
    new GameEventSequenceError(0, 1),
  ])(
    'logs an injected $name and continues recovery without publishing a partial host',
    async (error) => {
      const store = new InMemoryMatchStore();
      await store.createMatch(activeMatch('match-refused'));
      await store.createMatch(activeMatch('match-next'));
      const read = jest
        .spyOn(store, 'getEvents')
        .mockRejectedValueOnce(error)
        .mockResolvedValue([]);
      const warn = jest
        .spyOn(logger, 'warn')
        .mockImplementation(() => undefined);
      const result = await recoverActiveMatches(store);
      expect(result.hosts.size).toBe(0);
      expect(result.failed).toEqual(['match-refused', 'match-next']);
      expect(read).toHaveBeenCalledWith('match-next', expect.any(Number));
      expect(warn).toHaveBeenCalledWith(
        '[MatchRecovery] failed to rebuild match match-refused',
        error,
      );
      expect((await store.getMatchMeta('match-refused')).status).toBe('active');
    },
  );

  it.each(['collision', 'sequence'])(
    'logs and quarantines a persisted %s without changing its bytes',
    async (kind) => {
      const store = new InMemoryMatchStore();
      const meta = activeMatch('match-corrupt');
      await store.createMatch(meta);
      const seed = createGameSession(
        {
          mapRadius: 4,
          turnLimit: 5,
          victoryConditions: ['elimination'],
          optionalRules: [],
        },
        [],
        { id: meta.matchId },
      ).events[0];
      const events = [
        seed,
        {
          ...seed,
          id: kind === 'collision' ? seed.id : 'different-id',
          sequence: kind === 'collision' ? 1 : 0,
          timestamp: 'conflicting',
        },
      ];
      jest.spyOn(store, 'getEvents').mockResolvedValue(events);
      const warn = jest
        .spyOn(logger, 'warn')
        .mockImplementation(() => undefined);
      const snapshot = JSON.stringify(events);
      const quarantine = new ReplayQuarantineRegistry();
      const result = await recoverActiveMatches(store, quarantine);
      const reason =
        kind === 'collision' ? 'duplicate-receipt' : 'sequence-gap';
      expect(result.hosts.size).toBe(0);
      expect(result.failed).toEqual([meta.matchId]);
      expect(result.blocked[0]?.reason).toBe(reason);
      expect(
        quarantine.isQuarantined({
          authorityType: 'match',
          authorityId: meta.matchId,
        }),
      ).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `[MatchRecovery] match match-corrupt is not recoverable (${reason})`,
        ),
        expect.any(Array),
      );
      expect(JSON.stringify(events)).toBe(snapshot);
      expect((await store.getMatchMeta(meta.matchId)).status).toBe('active');
    },
  );

  it('an empty log is blocked by name, and nothing is registered for it', async () => {
    const store = new InMemoryMatchStore();
    await store.createMatch(activeMatch('match-empty'));

    const result = await recoverActiveMatches(store);

    expect(result.blocked).toEqual([
      {
        matchId: 'match-empty',
        reason: 'empty-history',
        evidence: ['match-empty'],
      },
    ]);
    expect(result.hosts.has('match-empty')).toBe(false);
    expect(result.hosts.size).toBe(0);
    // The pre-existing contract is untouched: callers reading `failed`
    // keep seeing the id they always saw.
    expect(result.failed).toEqual(['match-empty']);
  });

  it('a log that will not fold is blocked as a replay failure', async () => {
    const store = new InMemoryMatchStore();
    await store.createMatch(activeMatch('match-orphan'));
    await store.appendEvent('match-orphan', orphanEvent('match-orphan'));

    const result = await recoverActiveMatches(store);

    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]?.matchId).toBe('match-orphan');
    expect(result.blocked[0]?.reason).toBe('replay-failed');
    expect(result.blocked[0]?.evidence[0]).toEqual(expect.any(String));
    expect(result.hosts.size).toBe(0);
    expect(result.failed).toEqual(['match-orphan']);
  });

  it('one blocked match does not stop the sweep reaching the next', async () => {
    const store = new InMemoryMatchStore();
    await store.createMatch(activeMatch('match-empty'));
    await store.createMatch(activeMatch('match-orphan'));
    await store.appendEvent('match-orphan', orphanEvent('match-orphan'));

    const result = await recoverActiveMatches(store);

    expect(result.blocked.map((entry) => entry.reason).sort()).toEqual([
      'empty-history',
      'replay-failed',
    ]);
    expect([...result.failed].sort()).toEqual(['match-empty', 'match-orphan']);
    expect(result.hosts.size).toBe(0);
  });
});
