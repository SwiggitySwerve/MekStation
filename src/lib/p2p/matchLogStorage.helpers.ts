import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  MATCH_LOG_STORES,
  MatchLogStorageError,
  MatchLogStorageUnavailableError,
  type IMatchEventRecord,
  type IMatchLogFlushInfo,
  type IMatchMetadataRecord,
  type IMatchMetadataUpsert,
  type MatchLogStoreName,
} from './matchLogStorageSchema';

export interface IPendingEventWrite {
  readonly record: IMatchEventRecord;
  readonly resolve: (record: IMatchEventRecord) => void;
  readonly reject: (error: Error) => void;
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

export function persistBatchInTransaction(
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

export function mergeMatchMetadata(
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

export function matchSequenceRange(matchId: string): IDBKeyRange {
  return IDBKeyRange.bound(
    [matchId, Number.NEGATIVE_INFINITY],
    [matchId, Number.POSITIVE_INFINITY],
  );
}

export function shouldPurgeMatch(
  metadata: IMatchMetadataRecord,
  cutoff: number,
): boolean {
  if (metadata.status !== 'completed') {
    return false;
  }
  const lastActivityMs = Date.parse(metadata.lastActivity);
  return Number.isFinite(lastActivityMs) && lastActivityMs < cutoff;
}

export function requestToPromise<T>(
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

export function scheduleNextFrame(callback: () => void): void {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => callback());
    return;
  }
  globalThis.setTimeout(callback, 0);
}

export function toStorageError(message: string, cause: unknown): Error {
  if (cause instanceof MatchLogStorageUnavailableError) {
    return cause;
  }
  if (cause instanceof MatchLogStorageError) {
    return cause;
  }
  return new MatchLogStorageError(message, cause);
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

export function toEventList(
  records: readonly IMatchEventRecord[],
): IGameEvent[] {
  return records.map((record) => record.event);
}
