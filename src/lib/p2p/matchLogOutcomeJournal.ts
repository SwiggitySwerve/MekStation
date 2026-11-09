import {
  outcomePublicationRecordSchema,
  pendingOutcomePublicationSchema,
  type IPendingOutcomePublication,
  type IAcknowledgedOutcomePublication,
  type IOutcomePublicationRecord,
} from '@/engine/combatOutcomeJournal';
import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  MATCH_LOG_STORES,
  OUTCOME_PUBLICATION_KEY_PATH,
  MatchLogStorageError,
} from './matchLogStorageSchema';

export function outcomePublicationKey(
  record: Pick<IOutcomePublicationRecord, 'matchId' | 'terminalEventId'>,
): string[] {
  return OUTCOME_PUBLICATION_KEY_PATH.map((field) => record[field]);
}

export function validateOutcomePublicationIntent(
  matchId: string,
  event: IGameEvent,
  value: IPendingOutcomePublication,
): IPendingOutcomePublication {
  const parsed = pendingOutcomePublicationSchema.safeParse(value);
  if (
    !parsed.success ||
    event.type !== GameEventType.GameEnded ||
    parsed.data.matchId !== matchId ||
    parsed.data.terminalEventId !== event.id ||
    parsed.data.terminalSequence !== event.sequence ||
    parsed.data.createdAt !== event.timestamp
  ) {
    throw new MatchLogStorageError(
      'Outcome publication intent does not match the terminal event',
    );
  }
  return parsed.data;
}

export function readOutcomePublication(
  db: IDBDatabase,
  matchId: string,
  terminalEventId: string,
): Promise<IOutcomePublicationRecord | undefined> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS, 'readonly')
      .objectStore(MATCH_LOG_STORES.OUTCOME_PUBLICATIONS)
      .get(outcomePublicationKey({ matchId, terminalEventId }));
    request.onsuccess = () => {
      if (request.result === undefined) {
        resolve(undefined);
        return;
      }
      const parsed = outcomePublicationRecordSchema.safeParse(request.result);
      if (!parsed.success) {
        reject(
          new MatchLogStorageError('Outcome publication receipt is corrupt'),
        );
        return;
      }
      resolve(parsed.data);
    };
    request.onerror = () =>
      reject(
        new MatchLogStorageError(
          'Failed to read outcome publication receipt',
          request.error,
        ),
      );
  });
}

export function acknowledgeOutcomePublicationInDatabase(
  db: IDBDatabase,
  matchId: string,
  terminalEventId: string,
  acknowledgedAt: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
      'readwrite',
    );
    const store = transaction.objectStore(
      MATCH_LOG_STORES.OUTCOME_PUBLICATIONS,
    );
    const request = store.get(
      outcomePublicationKey({ matchId, terminalEventId }),
    );
    let failure: Error | null = null;
    request.onsuccess = () => {
      const parsed = outcomePublicationRecordSchema.safeParse(request.result);
      if (!parsed.success) {
        failure = new MatchLogStorageError(
          'Cannot acknowledge a missing or corrupt publication receipt',
        );
        transaction.abort();
        return;
      }
      if (parsed.data.state === 'acknowledged') return;
      const acknowledged: IAcknowledgedOutcomePublication = {
        ...parsed.data,
        state: 'acknowledged',
        acknowledgedAt,
      };
      store.put(acknowledged);
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        failure ??
          new MatchLogStorageError(
            'Failed to acknowledge outcome publication',
            transaction.error,
          ),
      );
    transaction.onabort = () =>
      reject(
        failure ??
          new MatchLogStorageError(
            'Outcome publication acknowledgement aborted',
            transaction.error,
          ),
      );
  });
}
