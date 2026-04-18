/**
 * InMemoryMatchStore unit tests.
 *
 * Covers: create, append (incl. sequence collision), get, getMatchMeta,
 * updateMatchMeta, closeMatch idempotency, MatchNotFoundError surfacing.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
} from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

function makeMeta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

describe('InMemoryMatchStore', () => {
  let store: InMemoryMatchStore;

  beforeEach(() => {
    store = new InMemoryMatchStore({ quiet: true });
  });

  it('creates a match and exposes meta', async () => {
    const meta = makeMeta('m-1');
    await store.createMatch(meta);
    const got = await store.getMatchMeta('m-1');
    expect(got.matchId).toBe('m-1');
    expect(store.size()).toBe(1);
  });

  it('rejects duplicate createMatch with the same id', async () => {
    await store.createMatch(makeMeta('dup'));
    await expect(store.createMatch(makeMeta('dup'))).rejects.toThrow(
      /already exists/,
    );
  });

  it('appends events in order', async () => {
    await store.createMatch(makeMeta('m-2'));
    await store.appendEvent('m-2', makeEvent('m-2', 0));
    await store.appendEvent('m-2', makeEvent('m-2', 1));
    await store.appendEvent('m-2', makeEvent('m-2', 2));
    const events = await store.getEvents('m-2');
    expect(events.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('rejects sequence collisions', async () => {
    await store.createMatch(makeMeta('m-3'));
    await store.appendEvent('m-3', makeEvent('m-3', 0));
    await expect(
      store.appendEvent('m-3', makeEvent('m-3', 0)),
    ).rejects.toBeInstanceOf(MatchStoreSequenceCollisionError);
  });

  it('returns events filtered by fromSeq', async () => {
    await store.createMatch(makeMeta('m-4'));
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('m-4', makeEvent('m-4', i));
    }
    const tail = await store.getEvents('m-4', 3);
    expect(tail.map((e) => e.sequence)).toEqual([3, 4]);
  });

  it('throws MatchNotFoundError for unknown match', async () => {
    await expect(store.getEvents('nope')).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
    await expect(store.getMatchMeta('nope')).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
    await expect(
      store.appendEvent('nope', makeEvent('nope', 0)),
    ).rejects.toBeInstanceOf(MatchNotFoundError);
  });

  it('updateMatchMeta merges patch + bumps updatedAt', async () => {
    await store.createMatch(makeMeta('m-5'));
    const before = await store.getMatchMeta('m-5');
    await new Promise((r) => setTimeout(r, 10));
    await store.updateMatchMeta('m-5', { status: 'active' });
    const after = await store.getMatchMeta('m-5');
    expect(after.status).toBe('active');
    expect(after.updatedAt >= before.updatedAt).toBe(true);
  });

  it('closeMatch is idempotent and flips status to completed', async () => {
    await store.createMatch(makeMeta('m-6'));
    await store.closeMatch('m-6');
    await store.closeMatch('m-6'); // should not throw
    const meta = await store.getMatchMeta('m-6');
    expect(meta.status).toBe('completed');
  });

  it('closeMatch on unknown match is a no-op', async () => {
    await expect(store.closeMatch('ghost')).resolves.toBeUndefined();
  });
});
