import type * as Journal from './EventJournalContract';

import * as Schemas from './EventJournalSchemas';
import {
  SQLITE_EVENT_JOURNAL_EVENT_COLUMNS,
  SQLiteEventJournalWriter,
  type SQLiteEventRow,
} from './SQLiteEventJournalWriter';

/** Complete borrowed-handle adapter. It remains unwired from production authority. */
export class SQLiteEventJournal<TPayload = unknown>
  extends SQLiteEventJournalWriter<TPayload>
  implements Journal.IEventJournal<TPayload>
{
  public async readStream(
    input: Journal.IReadStreamQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadStreamQuerySchema.parse(input);
    return this.readRows(
      `WHERE stream_type = ? AND stream_id = ? AND branch_id = ? AND stream_revision > ? ORDER BY stream_revision LIMIT ?`,
      [
        query.streamType,
        query.streamId,
        query.branchId,
        query.afterRevision,
        query.limit,
      ],
    );
  }

  public async readEntityHistory(
    input: Journal.IReadEntityHistoryQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadEntityHistoryQuerySchema.parse(input);
    const roleClause = query.role === undefined ? '' : ' AND ref.role = ?';
    const selector = [query.entityType, query.entityId];
    if (query.role !== undefined) selector.push(query.role);
    return this.readRows(
      `WHERE commit_position > ? AND commit_position <= ? AND EXISTS (SELECT 1 FROM event_journal_entity_refs AS ref WHERE ref.event_id = event_journal_events.event_id AND ref.entity_type = ? AND ref.entity_id = ?${roleClause}) ORDER BY commit_position LIMIT ?`,
      [
        query.afterCommitPosition,
        query.throughCommitPosition,
        ...selector,
        query.limit,
      ],
    );
  }

  public async readEventHistory(
    input: Journal.IReadEventHistoryQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadEventHistoryQuerySchema.parse(input);
    const selector = query.selector;
    const [clause, parameters] =
      selector.kind === 'authority'
        ? [
            'authority_type = ? AND authority_id = ?',
            [selector.authorityType, selector.authorityId],
          ]
        : selector.kind === 'correlation'
          ? ['correlation_id = ?', [selector.id]]
          : [
              `EXISTS (SELECT 1 FROM event_journal_causations AS cause WHERE cause.event_id = event_journal_events.event_id AND cause.causation_event_id = ?)`,
              [selector.id],
            ];
    return this.readRows(
      `WHERE commit_position > ? AND commit_position <= ? AND ${clause} ORDER BY commit_position LIMIT ?`,
      [
        query.afterCommitPosition,
        query.throughCommitPosition,
        ...parameters,
        query.limit,
      ],
    );
  }

  public async readCommitted(
    input: Journal.IReadCommittedQuery,
  ): Promise<Journal.ICommittedReadPage<TPayload>> {
    const query = Schemas.ReadCommittedQuerySchema.parse(input);
    const rows = this.selectRows(
      `WHERE commit_position > ? AND commit_position <= ? ORDER BY commit_position LIMIT ?`,
      [query.afterCommitPosition, query.throughCommitPosition, query.limit + 1],
    );
    const exhausted = rows.length <= query.limit;
    const events = rows
      .slice(0, query.limit)
      .map((row) => this.hydrateEvent(row));
    return {
      events,
      exhausted,
      nextAfterCommitPosition: exhausted
        ? query.throughCommitPosition
        : events[events.length - 1].commitPosition,
    };
  }

  private readRows(
    suffix: string,
    parameters: readonly unknown[],
  ): readonly Journal.IStoredEvent<TPayload>[] {
    return this.selectRows(suffix, parameters).map((row) =>
      this.hydrateEvent(row),
    );
  }

  private selectRows(
    suffix: string,
    parameters: readonly unknown[],
  ): SQLiteEventRow[] {
    return this.db
      .prepare(
        `SELECT ${SQLITE_EVENT_JOURNAL_EVENT_COLUMNS} FROM event_journal_events ${suffix}`,
      )
      .all(...parameters) as SQLiteEventRow[];
  }
}
