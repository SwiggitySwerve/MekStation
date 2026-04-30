/**
 * Match log storage
 *
 * P2P-specific IndexedDB wrapper for locally persisted game event logs.
 * Kept separate from the generic IndexedDBService so match-log schema
 * upgrades do not force unrelated app stores through a version bump.
 *
 * @spec openspec/changes/add-game-session-persistence-for-reconnect/specs/auto-save-persistence/spec.md
 * @spec openspec/changes/add-game-session-persistence-for-reconnect/specs/multiplayer-sync/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export const MATCH_LOG_DB_NAME = 'mekstation-match-log';
export const MATCH_LOG_DB_VERSION = 2;
export const MATCH_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const MATCH_LOG_STORES = {
  MATCH_EVENTS: 'matchEvents',
  MATCHES: 'matches',
} as const;

export type MatchLogStoreName =
  (typeof MATCH_LOG_STORES)[keyof typeof MATCH_LOG_STORES];

export type MatchLogStatus = 'active' | 'completed' | 'abandoned';

export interface IMatchEventRecord {
  readonly matchId: string;
  readonly sequence: number;
  readonly event: IGameEvent;
  readonly savedAt: string;
}

export interface IMatchMetadataRecord {
  readonly matchId: string;
  readonly hostPeerId: string | null;
  readonly guestPeerId: string | null;
  readonly status: MatchLogStatus;
  readonly lastActivity: string;
}

export interface IMatchMetadataUpsert {
  readonly matchId: string;
  readonly hostPeerId?: string | null;
  readonly guestPeerId?: string | null;
  readonly status?: MatchLogStatus;
  readonly lastActivity?: string;
}

export interface IPurgeOldMatchesResult {
  readonly purgedMatchIds: readonly string[];
  readonly purgedEventCount: number;
}

export interface IMatchLogFlushInfo {
  readonly recordCount: number;
  readonly matchIds: readonly string[];
}

export interface IMatchLogStorageOptions {
  readonly dbName?: string;
  readonly dbVersion?: number;
  readonly indexedDB?: IDBFactory;
  readonly now?: () => string;
  readonly scheduleFrame?: (callback: () => void) => void;
  readonly onFlushTransaction?: (info: IMatchLogFlushInfo) => void;
}

interface IPendingEventWrite {
  readonly record: IMatchEventRecord;
  readonly resolve: (record: IMatchEventRecord) => void;
  readonly reject: (error: Error) => void;
}

export class MatchLogStorageUnavailableError extends Error {
  constructor() {
    super('IndexedDB is unavailable in this environment');
    this.name = 'MatchLogStorageUnavailableError';
  }
}

export class MatchLogStorageError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'MatchLogStorageError';
    this.originalError = originalError;
  }
}

export class MatchLogStorage {
  private readonly dbName: string;
  private readonly dbVersion: number;
  private readonly indexedDBOverride?: IDBFactory;
  private readonly now: () => string;
  private readonly scheduleFrame: (callback: () => void) => void;
  private readonly onFlushTransaction?: (info: IMatchLogFlushInfo) => void;

  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;
  private pendingEventWrites: IPendingEventWrite[] = [];
  private flushScheduled = false;
  private flushPromise: Promise<void> | null = null;

  constructor(options: IMatchLogStorageOptions = {}) {
    this.dbName = options.dbName ?? MATCH_LOG_DB_NAME;
    this.dbVersion = options.dbVersion ?? MATCH_LOG_DB_VERSION;
    this.indexedDBOverride = options.indexedDB;
    this.now = options.now ?? (() => new Date().toISOString());
    this.scheduleFrame = options.scheduleFrame ?? scheduleNextFrame;
    this.onFlushTransaction = options.onFlushTransaction;
  }

  async initialize(): Promise<void> {
    await this.openDatabase();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.openPromise = null;
  }

  appendEvent(matchId: string, event: IGameEvent): Promise<IMatchEventRecord> {
    const record: IMatchEventRecord = {
      matchId,
      sequence: event.sequence,
      event,
      savedAt: this.now(),
    };

    const promise = new Promise<IMatchEventRecord>((resolve, reject) => {
      this.pendingEventWrites.push({ record, resolve, reject });
    });

    this.schedulePendingFlush();
    return promise;
  }

  async flushPendingWrites(): Promise<void> {
    if (this.pendingEventWrites.length === 0) {
      return this.flushPromise ?? Promise.resolve();
    }

    this.flushScheduled = false;
    const batch = this.pendingEventWrites.splice(0);
    const flush = this.persistEventBatch(batch).finally(() => {
      if (this.flushPromise === flush) {
        this.flushPromise = null;
      }
      if (this.pendingEventWrites.length > 0) {
        this.schedulePendingFlush();
      }
    });
    this.flushPromise = flush;
    return flush;
  }

  async getEventsForMatch(matchId: string): Promise<IGameEvent[]> {
    const records = await this.getEventRecordsForMatch(matchId);
    return records.map((record) => record.event);
  }

  async getEventRecordsForMatch(matchId: string): Promise<IMatchEventRecord[]> {
    const db = await this.openDatabase();

    return new Promise<IMatchEventRecord[]>((resolve, reject) => {
      const transaction = db.transaction(
        MATCH_LOG_STORES.MATCH_EVENTS,
        'readonly',
      );
      const store = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
      const records: IMatchEventRecord[] = [];
      const request = store.openCursor(matchSequenceRange(matchId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          return;
        }
        records.push(cursor.value as IMatchEventRecord);
        cursor.continue();
      };

      transaction.oncomplete = () => {
        resolve(records);
      };
      transaction.onerror = () => {
        reject(
          toStorageError('Failed to read match events', transaction.error),
        );
      };
      transaction.onabort = () => {
        reject(toStorageError('Match events read aborted', transaction.error));
      };
    });
  }

  async getLastSequence(matchId: string): Promise<number | null> {
    const db = await this.openDatabase();

    return new Promise<number | null>((resolve, reject) => {
      const transaction = db.transaction(
        MATCH_LOG_STORES.MATCH_EVENTS,
        'readonly',
      );
      const store = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
      const request = store.openCursor(matchSequenceRange(matchId), 'prev');
      let lastSequence: number | null = null;

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          return;
        }
        lastSequence = (cursor.value as IMatchEventRecord).sequence;
      };

      transaction.oncomplete = () => {
        resolve(lastSequence);
      };
      transaction.onerror = () => {
        reject(
          toStorageError(
            'Failed to read last match sequence',
            transaction.error,
          ),
        );
      };
      transaction.onabort = () => {
        reject(
          toStorageError('Last match sequence read aborted', transaction.error),
        );
      };
    });
  }

  async upsertMatchMetadata(
    metadata: IMatchMetadataUpsert,
  ): Promise<IMatchMetadataRecord> {
    const db = await this.openDatabase();
    const lastActivity = metadata.lastActivity ?? this.now();

    return new Promise<IMatchMetadataRecord>((resolve, reject) => {
      const transaction = db.transaction(MATCH_LOG_STORES.MATCHES, 'readwrite');
      const store = transaction.objectStore(MATCH_LOG_STORES.MATCHES);
      const request = store.get(metadata.matchId);
      let saved: IMatchMetadataRecord | null = null;

      request.onsuccess = () => {
        const existing = request.result as IMatchMetadataRecord | undefined;
        saved = mergeMatchMetadata(existing, metadata, lastActivity);
        store.put(saved);
      };

      transaction.oncomplete = () => {
        if (!saved) {
          reject(new MatchLogStorageError('Match metadata was not saved'));
          return;
        }
        resolve(saved);
      };
      transaction.onerror = () => {
        reject(
          toStorageError('Failed to upsert match metadata', transaction.error),
        );
      };
      transaction.onabort = () => {
        reject(
          toStorageError('Match metadata upsert aborted', transaction.error),
        );
      };
    });
  }

  async getMatchMetadata(
    matchId: string,
  ): Promise<IMatchMetadataRecord | undefined> {
    const db = await this.openDatabase();
    const result = await requestToPromise(
      db
        .transaction(MATCH_LOG_STORES.MATCHES, 'readonly')
        .objectStore(MATCH_LOG_STORES.MATCHES)
        .get(matchId),
      'Failed to read match metadata',
    );
    return result as IMatchMetadataRecord | undefined;
  }

  async markMatchCompleted(
    matchId: string,
    completedAt = this.now(),
  ): Promise<IMatchMetadataRecord> {
    return this.upsertMatchMetadata({
      matchId,
      status: 'completed',
      lastActivity: completedAt,
    });
  }

  async purgeOldMatches(
    retentionMs = MATCH_LOG_RETENTION_MS,
  ): Promise<IPurgeOldMatchesResult> {
    const db = await this.openDatabase();
    const nowMs = Date.parse(this.now());
    const cutoff = (Number.isFinite(nowMs) ? nowMs : Date.now()) - retentionMs;

    return new Promise<IPurgeOldMatchesResult>((resolve, reject) => {
      const transaction = db.transaction(
        [MATCH_LOG_STORES.MATCHES, MATCH_LOG_STORES.MATCH_EVENTS],
        'readwrite',
      );
      const matchesStore = transaction.objectStore(MATCH_LOG_STORES.MATCHES);
      const eventsStore = transaction.objectStore(
        MATCH_LOG_STORES.MATCH_EVENTS,
      );
      const purgedMatchIds: string[] = [];
      let purgedEventCount = 0;

      const cursorRequest = matchesStore.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          return;
        }

        const metadata = cursor.value as IMatchMetadataRecord;
        if (shouldPurgeMatch(metadata, cutoff)) {
          const range = matchSequenceRange(metadata.matchId);
          purgedMatchIds.push(metadata.matchId);

          const countRequest = eventsStore.count(range);
          countRequest.onsuccess = () => {
            purgedEventCount += countRequest.result;
            eventsStore.delete(range);
          };

          cursor.delete();
        }

        cursor.continue();
      };

      transaction.oncomplete = () => {
        resolve({ purgedMatchIds, purgedEventCount });
      };
      transaction.onerror = () => {
        reject(
          toStorageError('Failed to purge old matches', transaction.error),
        );
      };
      transaction.onabort = () => {
        reject(toStorageError('Old match purge aborted', transaction.error));
      };
    });
  }

  private async persistEventBatch(batch: IPendingEventWrite[]): Promise<void> {
    try {
      const db = await this.openDatabase();
      await persistBatchInTransaction(db, batch, this.onFlushTransaction);
      for (const write of batch) {
        write.resolve(write.record);
      }
    } catch (error) {
      const storageError = toStorageError(
        'Failed to persist match events',
        error,
      );
      for (const write of batch) {
        write.reject(storageError);
      }
      throw storageError;
    }
  }

  private schedulePendingFlush(): void {
    if (this.flushScheduled) {
      return;
    }

    this.flushScheduled = true;
    this.scheduleFrame(() => {
      void this.flushPendingWrites().catch(() => undefined);
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    if (this.openPromise) {
      return this.openPromise;
    }

    const indexedDBFactory = this.getIndexedDBFactory();
    if (!indexedDBFactory) {
      return Promise.reject(new MatchLogStorageUnavailableError());
    }

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDBFactory.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        migrateMatchLogDatabase(request.result, request.transaction);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.close();
        };
        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(
          toStorageError('Failed to open match log database', request.error),
        );
      };

      request.onblocked = () => {
        reject(new MatchLogStorageError('Match log database upgrade blocked'));
      };
    });

    return this.openPromise;
  }

  private getIndexedDBFactory(): IDBFactory | null {
    if (this.indexedDBOverride) {
      return this.indexedDBOverride;
    }
    if (typeof globalThis === 'undefined') {
      return null;
    }
    return globalThis.indexedDB ?? null;
  }
}

export function migrateMatchLogDatabase(
  db: IDBDatabase,
  transaction: IDBTransaction | null,
): void {
  const eventStore = ensureObjectStore(
    db,
    transaction,
    MATCH_LOG_STORES.MATCH_EVENTS,
    {
      keyPath: ['matchId', 'sequence'],
    },
  );
  ensureIndex(eventStore, 'byMatchId', 'matchId');
  ensureIndex(eventStore, 'bySavedAt', 'savedAt');

  const matchStore = ensureObjectStore(
    db,
    transaction,
    MATCH_LOG_STORES.MATCHES,
    {
      keyPath: 'matchId',
    },
  );
  ensureIndex(matchStore, 'byStatus', 'status');
  ensureIndex(matchStore, 'byLastActivity', 'lastActivity');
}

const defaultMatchLogStorage = new MatchLogStorage();

export const matchLogStorage = defaultMatchLogStorage;

export function appendMatchEvent(
  matchId: string,
  event: IGameEvent,
): Promise<IMatchEventRecord> {
  return defaultMatchLogStorage.appendEvent(matchId, event);
}

export function flushMatchLogWrites(): Promise<void> {
  return defaultMatchLogStorage.flushPendingWrites();
}

export function getEventsForMatch(matchId: string): Promise<IGameEvent[]> {
  return defaultMatchLogStorage.getEventsForMatch(matchId);
}

export function getLastSequence(matchId: string): Promise<number | null> {
  return defaultMatchLogStorage.getLastSequence(matchId);
}

export function upsertMatchMetadata(
  metadata: IMatchMetadataUpsert,
): Promise<IMatchMetadataRecord> {
  return defaultMatchLogStorage.upsertMatchMetadata(metadata);
}

export function getMatchMetadata(
  matchId: string,
): Promise<IMatchMetadataRecord | undefined> {
  return defaultMatchLogStorage.getMatchMetadata(matchId);
}

export function markMatchCompleted(
  matchId: string,
  completedAt?: string,
): Promise<IMatchMetadataRecord> {
  return defaultMatchLogStorage.markMatchCompleted(matchId, completedAt);
}

export function purgeOldMatches(
  retentionMs?: number,
): Promise<IPurgeOldMatchesResult> {
  return defaultMatchLogStorage.purgeOldMatches(retentionMs);
}

function persistBatchInTransaction(
  db: IDBDatabase,
  batch: readonly IPendingEventWrite[],
  onFlushTransaction?: (info: IMatchLogFlushInfo) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      [MATCH_LOG_STORES.MATCH_EVENTS, MATCH_LOG_STORES.MATCHES],
      'readwrite',
    );
    const eventStore = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
    const matchStore = transaction.objectStore(MATCH_LOG_STORES.MATCHES);
    const latestSavedAtByMatch = new Map<string, string>();

    for (const write of batch) {
      eventStore.put(write.record);
      const current = latestSavedAtByMatch.get(write.record.matchId);
      if (!current || write.record.savedAt > current) {
        latestSavedAtByMatch.set(write.record.matchId, write.record.savedAt);
      }
    }

    for (const [matchId, lastActivity] of Array.from(
      latestSavedAtByMatch.entries(),
    )) {
      const request = matchStore.get(matchId);
      request.onsuccess = () => {
        const existing = request.result as IMatchMetadataRecord | undefined;
        matchStore.put(
          mergeMatchMetadata(
            existing,
            {
              matchId,
            },
            lastActivity,
          ),
        );
      };
    }

    onFlushTransaction?.({
      recordCount: batch.length,
      matchIds: Array.from(latestSavedAtByMatch.keys()),
    });

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(
        toStorageError('Match event transaction failed', transaction.error),
      );
    };
    transaction.onabort = () => {
      reject(
        toStorageError('Match event transaction aborted', transaction.error),
      );
    };
  });
}

function ensureObjectStore(
  db: IDBDatabase,
  transaction: IDBTransaction | null,
  storeName: MatchLogStoreName,
  options: IDBObjectStoreParameters,
): IDBObjectStore {
  if (!db.objectStoreNames.contains(storeName)) {
    return db.createObjectStore(storeName, options);
  }
  if (!transaction) {
    throw new MatchLogStorageError(
      `Cannot migrate existing object store without an upgrade transaction: ${storeName}`,
    );
  }
  return transaction.objectStore(storeName);
}

function ensureIndex(
  store: IDBObjectStore,
  indexName: string,
  keyPath: string,
): void {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, keyPath);
  }
}

function mergeMatchMetadata(
  existing: IMatchMetadataRecord | undefined,
  patch: IMatchMetadataUpsert,
  lastActivity: string,
): IMatchMetadataRecord {
  return {
    matchId: patch.matchId,
    hostPeerId:
      patch.hostPeerId === undefined
        ? (existing?.hostPeerId ?? null)
        : patch.hostPeerId,
    guestPeerId:
      patch.guestPeerId === undefined
        ? (existing?.guestPeerId ?? null)
        : patch.guestPeerId,
    status: patch.status ?? existing?.status ?? 'active',
    lastActivity,
  };
}

function matchSequenceRange(matchId: string): IDBKeyRange {
  return IDBKeyRange.bound(
    [matchId, Number.NEGATIVE_INFINITY],
    [matchId, Number.POSITIVE_INFINITY],
  );
}

function shouldPurgeMatch(
  metadata: IMatchMetadataRecord,
  cutoff: number,
): boolean {
  if (metadata.status !== 'completed') {
    return false;
  }
  const lastActivityMs = Date.parse(metadata.lastActivity);
  return Number.isFinite(lastActivityMs) && lastActivityMs < cutoff;
}

function requestToPromise<T>(
  request: IDBRequest<T>,
  errorMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(toStorageError(errorMessage, request.error));
    };
  });
}

function scheduleNextFrame(callback: () => void): void {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => callback());
    return;
  }
  globalThis.setTimeout(callback, 0);
}

function toStorageError(message: string, cause: unknown): Error {
  if (cause instanceof MatchLogStorageUnavailableError) {
    return cause;
  }
  if (cause instanceof MatchLogStorageError) {
    return cause;
  }
  return new MatchLogStorageError(message, cause);
}
