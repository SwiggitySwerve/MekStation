import type { IPendingOutcomePublication } from '@/engine/combatOutcomeJournal';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

import type { MatchLogStorage } from './matchLogStorage';

import { outcomePublicationKey } from './matchLogOutcomeJournal';
import {
  MATCH_LOG_STORES,
  OUTCOME_PUBLICATION_KEY_PATH,
  MatchLogStorageError,
  MatchLogStorageUnavailableError,
  type IMatchEventRecord,
  type IMatchLogFlushInfo,
  type IMatchMetadataRecord,
  type IMatchMetadataUpsert,
  type IPurgeOldMatchesResult,
  type MatchLogStoreName,
} from './matchLogStorageSchema';

export interface IPendingEventWrite {
  readonly record: IMatchEventRecord;
  readonly outcomePublication?: IPendingOutcomePublication;
  readonly resolve: (record: IMatchEventRecord) => void;
  readonly reject: (error: Error) => void;
}

/** Completion metadata must never get ahead of the persisted terminal event. */
export function persistMatchEvent(
  matchId: string,
  event: IGameEvent,
  storage: Pick<MatchLogStorage, 'appendEvent'> &
    Partial<Pick<MatchLogStorage, 'markMatchCompleted'>>,
  outcomePublication?: IPendingOutcomePublication,
): Promise<IMatchMetadataRecord | void> {
  const append =
    outcomePublication === undefined
      ? storage.appendEvent(matchId, event)
      : storage.appendEvent(matchId, event, outcomePublication);
  return append.then(() => {
    if (event.type !== GameEventType.GameEnded) return;
    return storage.markMatchCompleted?.(matchId, event.timestamp);
  });
}

export function purgeOldMatchesInDatabase(
  db: IDBDatabase,
  now: string,
  retentionMs: number,
): Promise<IPurgeOldMatchesResult> {
  const nowMs = Date.parse(now);
  const cutoff = (Number.isFinite(nowMs) ? nowMs : Date.now()) - retentionMs;
  return new Promise<IPurgeOldMatchesResult>((resolve, reject) => {
    const transaction = db.transaction(
      [
        MATCH_LOG_STORES.MATCHES,
        MATCH_LOG_STORES.MATCH_EVENTS,
        MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
      ],
      'readwrite',
    );
    const matchesStore = transaction.objectStore(MATCH_LOG_STORES.MATCHES);
    const eventsStore = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
    const purgedMatchIds: string[] = [];
    let purgedEventCount = 0;
    const cursorRequest = matchesStore.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      const metadata = cursor.value as IMatchMetadataRecord;
      if (shouldPurgeMatch(metadata, cutoff)) {
        const range = matchSequenceRange(metadata.matchId);
        purgedMatchIds.push(metadata.matchId);
        const countRequest = eventsStore.count(range);
        countRequest.onsuccess = () => {
          purgedEventCount += countRequest.result;
          eventsStore.delete(range);
        };
        transaction
          .objectStore(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS)
          .delete(
            IDBKeyRange.bound([metadata.matchId, ''], [metadata.matchId, []]),
          );
        cursor.delete();
      }
      cursor.continue();
    };
    transaction.oncomplete = () =>
      resolve({ purgedMatchIds, purgedEventCount });
    transaction.onerror = () =>
      reject(toStorageError('Failed to purge old matches', transaction.error));
    transaction.onabort = () =>
      reject(toStorageError('Old match purge aborted', transaction.error));
  });
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
  ensureObjectStore(db, transaction, MATCH_LOG_STORES.OUTCOME_PUBLICATIONS, {
    keyPath: [...OUTCOME_PUBLICATION_KEY_PATH],
  });
}

export function persistBatchInTransaction(
  db: IDBDatabase,
  batch: readonly IPendingEventWrite[],
  onFlushTransaction?: (info: IMatchLogFlushInfo) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      [
        MATCH_LOG_STORES.MATCH_EVENTS,
        MATCH_LOG_STORES.MATCHES,
        MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
      ],
      'readwrite',
    );
    const eventStore = transaction.objectStore(MATCH_LOG_STORES.MATCH_EVENTS);
    const matchStore = transaction.objectStore(MATCH_LOG_STORES.MATCHES);
    const latestSavedAtByMatch = new Map<string, string>();

    try {
      for (const write of batch) {
        const pending = write.outcomePublication;
        const previousTerminal =
          pending !== undefined
            ? eventStore.get([write.record.matchId, write.record.sequence])
            : null;
        eventStore.put(write.record);
        if (previousTerminal && pending) {
          previousTerminal.onsuccess = () => {
            const previous = previousTerminal.result as
              | IMatchEventRecord
              | undefined;
            // Replaying a historical terminal must not turn an absent receipt into pending delivery.
            if (previous?.event.id === write.record.event.id) return;
            const publications = transaction.objectStore(
              MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
            );
            const existing = publications.get(outcomePublicationKey(pending));
            existing.onsuccess = () => {
              if (existing.result === undefined) publications.put(pending);
            };
          };
        }
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
    } catch (error) {
      transaction.abort();
      reject(toStorageError('Failed to persist match event batch', error));
      return;
    }

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

export function deleteEventsForMatchInDatabase(
  db: IDBDatabase,
  matchId: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      MATCH_LOG_STORES.MATCH_EVENTS,
      'readwrite',
    );
    transaction
      .objectStore(MATCH_LOG_STORES.MATCH_EVENTS)
      .delete(matchSequenceRange(matchId));

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(
        toStorageError('Failed to delete match events', transaction.error),
      );
    };
    transaction.onabort = () => {
      reject(toStorageError('Match events delete aborted', transaction.error));
    };
  });
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
