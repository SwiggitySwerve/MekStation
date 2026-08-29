import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  reconcileMatchLogMirror,
  verifyMatchLogPrefix,
} from '../matchLogPrefix';
import { MATCH_LOG_DB_NAME, MatchLogStorage } from '../matchLogStorage';

const BASE_TIME = '2026-04-30T00:00:00.000Z';

let dbCounter = 0;

function nextDbName(): string {
  dbCounter += 1;
  return `${MATCH_LOG_DB_NAME}-prefix-${dbCounter}`;
}

function installFreshIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

function makeEvent(
  matchId: string,
  sequence: number,
  id = `${matchId}-${sequence}`,
): IGameEvent {
  return {
    id,
    gameId: matchId,
    sequence,
    timestamp: BASE_TIME,
    type: GameEventType.GameStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {
      firstSide: GameSide.Player,
    },
  };
}

function withoutSequence(event: IGameEvent): {
  readonly id: string;
  readonly type: IGameEvent['type'];
} {
  return { id: event.id, type: event.type };
}

async function persistEvents(
  storage: MatchLogStorage,
  matchId: string,
  events: readonly IGameEvent[],
): Promise<void> {
  for (const event of events) {
    await storage.appendEvent(matchId, event);
  }
  await storage.upsertMatchMetadata({
    matchId,
    hostPeerId: 'host-peer',
    guestPeerId: 'guest-peer',
  });
}

describe('verifyMatchLogPrefix', () => {
  it('MATCH: mirror prefix equals stream prefix', () => {
    const stored = [makeEvent('m', 0), makeEvent('m', 1)];
    const received = [makeEvent('m', 0), makeEvent('m', 1), makeEvent('m', 2)];
    expect(verifyMatchLogPrefix(stored, received)).toEqual({ kind: 'match' });
    expect(verifyMatchLogPrefix(stored, stored)).toEqual({ kind: 'match' });
  });

  it('REPLACED: stream id differs at position k (M1: skip id equality, compare lengths only)', () => {
    const stored = [
      makeEvent('m', 0, 'id-a'),
      makeEvent('m', 1, 'id-b'),
      makeEvent('m', 2, 'id-c'),
    ];
    const received = [
      makeEvent('m', 0, 'id-a'),
      makeEvent('m', 1, 'id-x'),
      makeEvent('m', 2, 'id-c'),
    ];
    expect(verifyMatchLogPrefix(stored, received)).toEqual({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
  });

  it('TRUNCATED: stream shorter than mirror (M2: treat shorter-stream as match)', () => {
    const stored = [
      makeEvent('m', 0, 'id-a'),
      makeEvent('m', 1, 'id-b'),
      makeEvent('m', 2, 'id-c'),
    ];
    const received = [makeEvent('m', 0, 'id-a'), makeEvent('m', 1, 'id-b')];
    expect(verifyMatchLogPrefix(stored, received)).toEqual({
      kind: 'truncated',
      position: 2,
    });
  });

  it('SEQUENCE-FREE: detection keys on ids, not event.sequence (M3: key comparator on event.sequence)', () => {
    const stored = [
      withoutSequence(makeEvent('m', 0, 'id-a')),
      withoutSequence(makeEvent('m', 1, 'id-b')),
      withoutSequence(makeEvent('m', 2, 'id-c')),
    ];
    const received = [
      withoutSequence(makeEvent('m', 0, 'id-a')),
      withoutSequence(makeEvent('m', 1, 'id-x')),
      withoutSequence(makeEvent('m', 2, 'id-c')),
    ];
    expect(verifyMatchLogPrefix(stored, received)).toEqual({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
  });

  it('NO MIRROR: absent stored events are a match', () => {
    expect(verifyMatchLogPrefix([], [makeEvent('m', 0)])).toEqual({
      kind: 'match',
    });
  });
});

describe('reconcileMatchLogMirror', () => {
  beforeEach(() => {
    installFreshIndexedDB();
  });

  it('MATCH: keeps mirror rows and leaves rehydration input unchanged', async () => {
    const matchId = 'prefix-match';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    const stored = [makeEvent(matchId, 0), makeEvent(matchId, 1)];
    await persistEvents(storage, matchId, stored);
    const before = await storage.getEventsForMatch(matchId);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [...stored, makeEvent(matchId, 2)],
      storage,
    });

    expect(verdict).toEqual({ kind: 'match' });
    expect(await storage.getEventsForMatch(matchId)).toEqual(before);
    expect(await storage.getMatchMetadata(matchId)).toEqual({
      matchId,
      hostPeerId: 'host-peer',
      guestPeerId: 'guest-peer',
      status: 'active',
      lastActivity: BASE_TIME,
    });
    storage.close();
  });

  it('REPLACED: deletes the match event rows (M1)', async () => {
    const matchId = 'prefix-replaced';
    const otherId = 'prefix-other';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    await persistEvents(storage, matchId, [
      makeEvent(matchId, 0, 'id-a'),
      makeEvent(matchId, 1, 'id-b'),
      makeEvent(matchId, 2, 'id-c'),
    ]);
    await persistEvents(storage, otherId, [makeEvent(otherId, 0, 'keep-me')]);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [
        makeEvent(matchId, 0, 'id-a'),
        makeEvent(matchId, 1, 'id-x'),
        makeEvent(matchId, 2, 'id-c'),
      ],
      storage,
    });

    expect(verdict).toEqual({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
    expect(await storage.getEventsForMatch(matchId)).toEqual([]);
    expect(await storage.getLastSequence(matchId)).toBeNull();
    expect(await storage.getEventsForMatch(otherId)).toHaveLength(1);
    storage.close();
  });

  it('TRUNCATED: deletes the match event rows (M2)', async () => {
    const matchId = 'prefix-truncated';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    await persistEvents(storage, matchId, [
      makeEvent(matchId, 0, 'id-a'),
      makeEvent(matchId, 1, 'id-b'),
      makeEvent(matchId, 2, 'id-c'),
    ]);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [
        makeEvent(matchId, 0, 'id-a'),
        makeEvent(matchId, 1, 'id-b'),
      ],
      storage,
    });

    expect(verdict).toEqual({ kind: 'truncated', position: 2 });
    expect(await storage.getEventsForMatch(matchId)).toEqual([]);
    storage.close();
  });

  it('SEQUENCE-FREE: received events without sequence still discard on id mismatch (M3)', async () => {
    const matchId = 'prefix-seq-free';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    await persistEvents(storage, matchId, [
      makeEvent(matchId, 0, 'id-a'),
      makeEvent(matchId, 1, 'id-b'),
      makeEvent(matchId, 2, 'id-c'),
    ]);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [
        withoutSequence(makeEvent(matchId, 0, 'id-a')),
        withoutSequence(makeEvent(matchId, 1, 'id-x')),
        withoutSequence(makeEvent(matchId, 2, 'id-c')),
      ],
      storage,
    });

    expect(verdict).toEqual({
      kind: 'replaced',
      position: 1,
      storedId: 'id-b',
      receivedId: 'id-x',
    });
    expect(await storage.getEventsForMatch(matchId)).toEqual([]);
    storage.close();
  });

  it('NO MIRROR: leaves storage untouched', async () => {
    const matchId = 'prefix-absent';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [makeEvent(matchId, 0)],
      storage,
    });

    expect(verdict).toEqual({ kind: 'match' });
    expect(await storage.getEventsForMatch(matchId)).toEqual([]);
    storage.close();
  });

  it('keeps the mirror when the stream is a suffix, not a prefix snapshot', async () => {
    const matchId = 'prefix-suffix';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    const stored = [
      makeEvent(matchId, 0, 'id-a'),
      makeEvent(matchId, 1, 'id-b'),
      makeEvent(matchId, 2, 'id-c'),
    ];
    await persistEvents(storage, matchId, stored);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [makeEvent(matchId, 3, 'id-d')],
      storage,
    });

    expect(verdict).toEqual({ kind: 'match' });
    expect(await storage.getEventsForMatch(matchId)).toEqual(stored);
    storage.close();
  });

  it('REPLACED-AT-0: a prefix snapshot with a rewritten head discards', async () => {
    const matchId = 'prefix-replaced-at-0';
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });
    await persistEvents(storage, matchId, [
      makeEvent(matchId, 0, 'id-old'),
      makeEvent(matchId, 1, 'id-b'),
    ]);

    const verdict = await reconcileMatchLogMirror({
      matchId,
      receivedEvents: [
        makeEvent(matchId, 0, 'id-new'),
        makeEvent(matchId, 1, 'id-x'),
      ],
      storage,
      assumePrefixSnapshot: true,
    });

    expect(verdict).toEqual({
      kind: 'replaced',
      position: 0,
      storedId: 'id-old',
      receivedId: 'id-new',
    });
    expect(await storage.getEventsForMatch(matchId)).toEqual([]);
    storage.close();
  });
});
