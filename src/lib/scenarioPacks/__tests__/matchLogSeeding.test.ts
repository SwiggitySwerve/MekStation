import 'fake-indexeddb/auto';
import type { Page } from '@playwright/test';

import { IDBFactory } from 'fake-indexeddb';

import {
  MATCH_LOG_DB_NAME,
  MATCH_LOG_DB_VERSION,
  MATCH_LOG_STORES,
  OUTCOME_PUBLICATION_KEY_PATH,
} from '@/lib/p2p/matchLogStorageSchema';

import {
  seedMatchLog,
  type SeededGameEvent,
} from '../../../../e2e/helpers/matchLogSeeding';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    configurable: true,
  });
}

function openDatabase(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MATCH_LOG_DB_NAME, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(MATCH_LOG_STORES.MATCH_EVENTS, {
        keyPath: ['matchId', 'sequence'],
      });
      db.createObjectStore(MATCH_LOG_STORES.MATCHES, { keyPath: 'matchId' });
      if (version === MATCH_LOG_DB_VERSION) {
        db.createObjectStore(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS, {
          keyPath: [...OUTCOME_PUBLICATION_KEY_PATH],
        });
      }
    };
  });
}

/** Execute the real browser callback against IndexedDB, without mocking it. */
function callbackPage(): Page {
  const page: Pick<Page, 'goto' | 'evaluate'> = {
    goto: jest.fn().mockResolvedValue(null),
    evaluate: jest
      .fn()
      .mockImplementation(
        async (
          callback: (argument: unknown) => Promise<unknown>,
          argument: unknown,
        ) => callback(argument),
      ),
  };
  return page as Page;
}

function event(matchId: string): SeededGameEvent {
  return {
    id: `${matchId}-created`,
    gameId: matchId,
    sequence: 0,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: 'game_created',
    turn: 0,
    phase: 'initiative',
    visibility: 'public',
    payload: {},
  };
}

function readRecord<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    configurable: true,
  });
});

it('seeds an existing live-version database without requesting the old v2 version', async () => {
  const existing = await openDatabase(MATCH_LOG_DB_VERSION);
  existing.close();
  const created = event('existing-v3');

  await seedMatchLog(callbackPage(), created.gameId, [created]);

  const db = await openDatabase();
  try {
    const record = await readRecord<{ event: SeededGameEvent }>(
      db
        .transaction(MATCH_LOG_STORES.MATCH_EVENTS)
        .objectStore(MATCH_LOG_STORES.MATCH_EVENTS),
      [created.gameId, created.sequence],
    );
    expect(record.event).toEqual(created);
    expect(db.version).toBe(MATCH_LOG_DB_VERSION);
  } finally {
    db.close();
  }
});

it('creates the complete live schema on a fresh database without inventing outcome receipts', async () => {
  await seedMatchLog(callbackPage(), 'fresh', [event('fresh')]);

  const db = await openDatabase();
  try {
    expect(db.version).toBe(MATCH_LOG_DB_VERSION);
    expect(Array.from(db.objectStoreNames)).toEqual(
      Object.values(MATCH_LOG_STORES).sort(),
    );
    const journal = db
      .transaction(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS)
      .objectStore(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS);
    expect(journal.keyPath).toEqual([...OUTCOME_PUBLICATION_KEY_PATH]);
    const receiptCount = await new Promise<number>((resolve, reject) => {
      const request = journal.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(receiptCount).toBe(0);
  } finally {
    db.close();
  }
});

it('upgrades a v2 database and preserves a previously seeded match when seeding another', async () => {
  const legacy = await openDatabase(2);
  legacy.close();
  await seedMatchLog(callbackPage(), 'first', [event('first')]);
  await seedMatchLog(callbackPage(), 'second', [event('second')]);

  const db = await openDatabase();
  try {
    expect(db.version).toBe(MATCH_LOG_DB_VERSION);
    expect(
      db.objectStoreNames.contains(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS),
    ).toBe(true);
    const transaction = db.transaction(MATCH_LOG_STORES.MATCH_EVENTS);
    const store = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
    const [first, second] = await Promise.all([
      readRecord<{ event: SeededGameEvent }>(store, ['first', 0]),
      readRecord<{ event: SeededGameEvent }>(store, ['second', 0]),
    ]);
    expect(first.event).toEqual(event('first'));
    expect(second.event).toEqual(event('second'));
  } finally {
    db.close();
  }
});
