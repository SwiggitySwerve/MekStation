import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { createPendingOutcomePublication } from '@/engine/combatOutcomeJournal';

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
  MATCH_LOG_DB_NAME,
  MATCH_LOG_DB_VERSION,
  MATCH_LOG_RETENTION_MS,
  MATCH_LOG_STORES,
  MatchLogStorage,
  MatchLogStorageUnavailableError,
  type IMatchEventRecord,
} from '../matchLogStorage';

const BASE_TIME = '2026-04-30T00:00:00.000Z';

let dbCounter = 0;

function nextDbName(): string {
  dbCounter += 1;
  return `${MATCH_LOG_DB_NAME}-test-${dbCounter}`;
}

function installFreshIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `${matchId}-${sequence}`,
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

function openRawDatabase(
  dbName: string,
  version: number,
  upgrade?: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = globalThis.indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      upgrade?.(request.result);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open raw database'));
    };
  });
}

function getRawRecord<T>(dbName: string, storeName: string, key: IDBValidKey) {
  return openRawDatabase(dbName, MATCH_LOG_DB_VERSION).then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const request = db
          .transaction(storeName, 'readonly')
          .objectStore(storeName)
          .get(key);
        request.onsuccess = () => {
          db.close();
          resolve(request.result as T | undefined);
        };
        request.onerror = () => {
          db.close();
          reject(request.error ?? new Error('Failed to read raw record'));
        };
      }),
  );
}

describe('MatchLogStorage', () => {
  beforeEach(() => {
    installFreshIndexedDB();
  });

  it('atomically journals new terminal events as pending and preserves acknowledged receipts on duplicate appends', async () => {
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: () => undefined,
    });
    const ended: IGameEvent = {
      ...makeEvent('publication', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    const write = storage.appendEvent(
      'publication',
      ended,
      createPendingOutcomePublication('publication', ended),
    );
    await storage.flushPendingWrites();
    await write;
    expect(
      await storage.getOutcomePublication('publication', ended.id),
    ).toEqual({
      matchId: 'publication',
      terminalEventId: ended.id,
      terminalSequence: ended.sequence,
      createdAt: ended.timestamp,
      state: 'pending',
    });
    await storage.acknowledgeOutcomePublication('publication', ended.id);
    const receipt = await storage.getOutcomePublication(
      'publication',
      ended.id,
    );
    expect(receipt).toEqual(
      expect.objectContaining({
        state: 'acknowledged',
        acknowledgedAt: BASE_TIME,
      }),
    );
    const duplicate = storage.appendEvent('publication', ended);
    await storage.flushPendingWrites();
    await duplicate;
    expect(
      await storage.getOutcomePublication('publication', ended.id),
    ).toEqual(receipt);
    storage.close();
  });

  it('rolls back the terminal event and pending receipt when another append aborts its batch', async () => {
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: () => undefined,
    });
    const ended: IGameEvent = {
      ...makeEvent('rollback-publication', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    const writes = Promise.allSettled([
      storage.appendEvent(
        'rollback-publication',
        ended,
        createPendingOutcomePublication('rollback-publication', ended),
      ),
      storage.appendEvent(
        'rollback-publication',
        makeEvent('rollback-publication', Number.NaN),
      ),
    ]);
    await expect(storage.flushPendingWrites()).rejects.toThrow();
    await writes;
    expect(await storage.getEventsForMatch('rollback-publication')).toEqual([]);
    expect(
      await storage.getOutcomePublication('rollback-publication', ended.id),
    ).toBeUndefined();
    storage.close();
  });

  it('preserves legacy version-two events without inventing pending publication receipts during migration', async () => {
    const dbName = nextDbName();
    const db = await openRawDatabase(dbName, 2, (legacy) => {
      legacy.createObjectStore('matchEvents', {
        keyPath: ['matchId', 'sequence'],
      });
      legacy.createObjectStore('matches', { keyPath: 'matchId' });
    });
    const ended: IGameEvent = {
      ...makeEvent('legacy-completed', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('matchEvents', 'readwrite');
      transaction.objectStore('matchEvents').put({
        matchId: 'legacy-completed',
        sequence: ended.sequence,
        event: ended,
        savedAt: BASE_TIME,
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    const storage = new MatchLogStorage({ dbName });
    await storage.initialize();
    expect(await storage.getEventsForMatch('legacy-completed')).toEqual([
      ended,
    ]);
    expect(
      await storage.getOutcomePublication('legacy-completed', ended.id),
    ).toBeUndefined();
    const replayed = storage.appendEvent('legacy-completed', ended);
    await storage.flushPendingWrites();
    await replayed;
    expect(
      await storage.getOutcomePublication('legacy-completed', ended.id),
    ).toBeUndefined();
    storage.close();
    const migrated = await openRawDatabase(dbName, MATCH_LOG_DB_VERSION);
    expect(
      migrated.objectStoreNames.contains(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS),
    ).toBe(true);
    migrated.close();
  });

  it('purges publication receipts together with an old completed match', async () => {
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
      scheduleFrame: () => undefined,
    });
    const ended: IGameEvent = {
      ...makeEvent('purge-publication', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    const write = storage.appendEvent(
      'purge-publication',
      ended,
      createPendingOutcomePublication('purge-publication', ended),
    );
    await storage.flushPendingWrites();
    await write;
    await storage.acknowledgeOutcomePublication('purge-publication', ended.id);
    await storage.markMatchCompleted(
      'purge-publication',
      '2026-01-01T00:00:00.000Z',
    );
    expect((await storage.purgeOldMatches()).purgedMatchIds).toContain(
      'purge-publication',
    );
    expect(
      await storage.getOutcomePublication('purge-publication', ended.id),
    ).toBeUndefined();
    storage.close();
  });

  it('rejects corrupt receipts instead of treating them as absent historical delivery', async () => {
    const dbName = nextDbName();
    const storage = new MatchLogStorage({ dbName });
    await storage.initialize();
    storage.close();
    const db = await openRawDatabase(dbName, MATCH_LOG_DB_VERSION);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
        'readwrite',
      );
      transaction.objectStore(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS).put({
        matchId: 'corrupt',
        terminalEventId: 'terminal',
        state: 'pending',
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    await expect(
      storage.getOutcomePublication('corrupt', 'terminal'),
    ).rejects.toThrow('corrupt');
    await expect(
      storage.acknowledgeOutcomePublication('corrupt', 'terminal'),
    ).rejects.toThrow('corrupt');
    storage.close();
  });

  it('does not invent an acknowledgement for a missing publication record', async () => {
    const storage = new MatchLogStorage({ dbName: nextDbName() });
    await expect(
      storage.acknowledgeOutcomePublication('missing', 'terminal'),
    ).rejects.toThrow('missing');
    expect(
      await storage.getOutcomePublication('missing', 'terminal'),
    ).toBeUndefined();
    storage.close();
  });

  it('does not create publication intent for replicated terminal events', async () => {
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      scheduleFrame: () => undefined,
    });
    const ended: IGameEvent = {
      ...makeEvent('mirror-terminal', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    const write = storage.appendEvent('mirror-terminal', ended);
    await storage.flushPendingWrites();
    await write;
    expect(await storage.getEventsForMatch('mirror-terminal')).toEqual([ended]);
    expect(
      await storage.getOutcomePublication('mirror-terminal', ended.id),
    ).toBeUndefined();
    storage.close();
  });

  it('rejects publication intent that belongs to another match before writing an event', async () => {
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      scheduleFrame: () => undefined,
    });
    const ended: IGameEvent = {
      ...makeEvent('intent-owner', 1),
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'concede' },
    };
    await expect(
      storage.appendEvent(
        'intent-owner',
        ended,
        createPendingOutcomePublication('another-match', ended),
      ),
    ).rejects.toThrow('does not match');
    await storage.flushPendingWrites();
    expect(await storage.getEventsForMatch('intent-owner')).toEqual([]);
    storage.close();
  });

  it('creates matchEvents and matches stores with the compound event key during migration', async () => {
    const dbName = nextDbName();
    const legacyDb = await openRawDatabase(dbName, 1, (db) => {
      db.createObjectStore('legacy');
    });
    legacyDb.close();

    const storage = new MatchLogStorage({ dbName, now: () => BASE_TIME });
    await storage.initialize();
    storage.close();

    const db = await openRawDatabase(dbName, MATCH_LOG_DB_VERSION);
    expect(db.objectStoreNames.contains(MATCH_LOG_STORES.MATCH_EVENTS)).toBe(
      true,
    );
    expect(db.objectStoreNames.contains(MATCH_LOG_STORES.MATCHES)).toBe(true);

    const transaction = db.transaction(
      [MATCH_LOG_STORES.MATCH_EVENTS, MATCH_LOG_STORES.MATCHES],
      'readonly',
    );
    expect(
      transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS).keyPath,
    ).toEqual(['matchId', 'sequence']);
    expect(transaction.objectStore(MATCH_LOG_STORES.MATCHES).keyPath).toBe(
      'matchId',
    );
    expect(
      transaction
        .objectStore(MATCH_LOG_STORES.MATCH_EVENTS)
        .indexNames.contains('byMatchId'),
    ).toBe(true);
    expect(
      transaction
        .objectStore(MATCH_LOG_STORES.MATCHES)
        .indexNames.contains('byStatus'),
    ).toBe(true);
    db.close();
  });

  it('stores the required record shape and queries each match in ascending sequence order', async () => {
    const dbName = nextDbName();
    const storage = new MatchLogStorage({
      dbName,
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });

    await storage.appendEvent('sess_abc', makeEvent('sess_abc', 2));
    await storage.appendEvent('sess_xyz', makeEvent('sess_xyz', 0));
    await storage.appendEvent('sess_abc', makeEvent('sess_abc', 0));
    await storage.appendEvent('sess_abc', makeEvent('sess_abc', 1));

    const events = await storage.getEventsForMatch('sess_abc');
    expect(events.map((event) => event.sequence)).toEqual([0, 1, 2]);
    expect(events.every((event) => event.gameId === 'sess_abc')).toBe(true);
    expect(await storage.getLastSequence('sess_abc')).toBe(2);
    expect(await storage.getLastSequence('missing')).toBeNull();

    const rawRecord = await getRawRecord<IMatchEventRecord>(
      dbName,
      MATCH_LOG_STORES.MATCH_EVENTS,
      ['sess_abc', 0],
    );
    expect(rawRecord).toEqual({
      matchId: 'sess_abc',
      sequence: 0,
      event: makeEvent('sess_abc', 0),
      savedAt: BASE_TIME,
    });
    storage.close();
  });

  it('batches a burst of appends into one animation-frame transaction', async () => {
    const dbName = nextDbName();
    const scheduler: { callback?: () => void } = {};
    const flushes: number[] = [];
    const storage = new MatchLogStorage({
      dbName,
      now: () => BASE_TIME,
      scheduleFrame: (callback) => {
        scheduler.callback = callback;
      },
      onFlushTransaction: ({ recordCount }) => {
        flushes.push(recordCount);
      },
    });

    const writes = Array.from({ length: 20 }, (_, sequence) =>
      storage.appendEvent('burst-match', makeEvent('burst-match', sequence)),
    );

    expect(flushes).toEqual([]);
    if (!scheduler.callback) {
      throw new Error('Expected match log flush to be scheduled');
    }
    scheduler.callback();
    await Promise.all(writes);

    expect(flushes).toEqual([20]);
    expect(await storage.getLastSequence('burst-match')).toBe(19);
    expect(await storage.getEventsForMatch('burst-match')).toHaveLength(20);
    storage.close();
  });

  it('upserts metadata while preserving peer ids across activity updates', async () => {
    const dbName = nextDbName();
    let now = BASE_TIME;
    const storage = new MatchLogStorage({
      dbName,
      now: () => now,
      scheduleFrame: (callback) => callback(),
    });

    await storage.upsertMatchMetadata({
      matchId: 'meta-match',
      hostPeerId: 'host-peer',
      guestPeerId: 'guest-peer',
    });

    now = '2026-04-30T00:01:00.000Z';
    await storage.appendEvent('meta-match', makeEvent('meta-match', 0));

    expect(await storage.getMatchMetadata('meta-match')).toEqual({
      matchId: 'meta-match',
      hostPeerId: 'host-peer',
      guestPeerId: 'guest-peer',
      status: 'active',
      lastActivity: '2026-04-30T00:01:00.000Z',
    });
    storage.close();
  });

  it('marks completed matches without dropping metadata fields', async () => {
    const dbName = nextDbName();
    const storage = new MatchLogStorage({
      dbName,
      now: () => BASE_TIME,
      scheduleFrame: (callback) => callback(),
    });

    await storage.upsertMatchMetadata({
      matchId: 'completed-match',
      hostPeerId: 'host-peer',
      guestPeerId: null,
    });

    const completed = await storage.markMatchCompleted(
      'completed-match',
      '2026-04-30T00:02:00.000Z',
    );

    expect(completed).toEqual({
      matchId: 'completed-match',
      hostPeerId: 'host-peer',
      guestPeerId: null,
      status: 'completed',
      lastActivity: '2026-04-30T00:02:00.000Z',
    });
    expect(await storage.getMatchMetadata('completed-match')).toEqual(
      completed,
    );
    storage.close();
  });

  it('purges only completed match logs older than the retention window', async () => {
    const dbName = nextDbName();
    const storage = new MatchLogStorage({
      dbName,
      now: () => '2026-04-30T00:00:00.000Z',
      scheduleFrame: (callback) => callback(),
    });

    await storage.appendEvent('old-completed', makeEvent('old-completed', 0));
    await storage.appendEvent(
      'recent-completed',
      makeEvent('recent-completed', 0),
    );
    await storage.appendEvent('old-active', makeEvent('old-active', 0));
    await storage.upsertMatchMetadata({
      matchId: 'old-completed',
      status: 'completed',
      lastActivity: '2026-04-21T23:59:59.000Z',
    });
    await storage.upsertMatchMetadata({
      matchId: 'recent-completed',
      status: 'completed',
      lastActivity: '2026-04-29T00:00:00.000Z',
    });
    await storage.upsertMatchMetadata({
      matchId: 'old-active',
      status: 'active',
      lastActivity: '2026-04-01T00:00:00.000Z',
    });

    const result = await storage.purgeOldMatches(MATCH_LOG_RETENTION_MS);

    expect(result).toEqual({
      purgedMatchIds: ['old-completed'],
      purgedEventCount: 1,
    });
    expect(await storage.getEventsForMatch('old-completed')).toEqual([]);
    expect(await storage.getMatchMetadata('old-completed')).toBeUndefined();
    expect(await storage.getEventsForMatch('recent-completed')).toHaveLength(1);
    expect(await storage.getEventsForMatch('old-active')).toHaveLength(1);
    storage.close();
  });

  it('rejects with an explicit unavailable error when IndexedDB is absent', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const storage = new MatchLogStorage({
      dbName: nextDbName(),
      now: () => BASE_TIME,
    });

    await expect(
      storage.appendEvent('offline-match', makeEvent('offline-match', 0)),
    ).rejects.toThrow(MatchLogStorageUnavailableError);
  });
});
