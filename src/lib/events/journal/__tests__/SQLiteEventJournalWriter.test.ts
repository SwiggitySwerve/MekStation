import Database from 'better-sqlite3';

import { EVENT_JOURNAL_MIGRATION } from '@/services/persistence/SQLiteService.eventJournal.migration';

import type * as Journal from '../EventJournalContract';

import { SQLiteEventJournalWriter } from '../SQLiteEventJournalWriter';

type Payload = Readonly<{ value: string }>;
const NOW = '2026-08-01T12:00:00.000Z';

describe('SQLiteEventJournalWriter', () => {
  let db: Database.Database;
  let writer: SQLiteEventJournalWriter<Payload>;
  let sequence: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(EVENT_JOURNAL_MIGRATION.up);
    writer = new SQLiteEventJournalWriter(db, () => NOW);
    sequence = 1;
  });
  afterEach(() => db.close());

  function command(
    expectedRevision = 0,
    count = 1,
  ): Journal.IAppendEventBatch<Payload> {
    const commandId = `command-${sequence++}`;
    return {
      streamType: 'test',
      streamId: 'alpha',
      expectedBranchId: 'root',
      expectedRevision,
      commandId,
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: Array.from({ length: count }, (_unused, index) => ({
        eventId: `${commandId}-event-${index}`,
        eventType: 'TestEvent',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: ['origin-b', 'origin-a'],
        occurredAt: NOW,
        payload: { value: `${commandId}-${index}` },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-2', role: 'target' },
          { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
        ],
      })),
    };
  }

  async function committed(input: Journal.IAppendEventBatch<Payload>) {
    const result = await writer.append(input);
    if (result.kind !== 'committed')
      throw new Error(`Expected commit, got ${result.kind}`);
    return result;
  }

  it('atomically appends a normalized batch and reconstructs exact retries and receipts', async () => {
    const input = command(0, 2);
    const first = await committed(input);
    expect(first.receipt.eventCount).toBe(2);
    expect(first.events[1].previousStreamEventDigest).toBe(
      first.events[0].eventDigest,
    );
    expect(first.events[0].entityRefs[0].entityId).toBe('unit-1');
    expect(await writer.captureHighWater()).toEqual({ commitPosition: 2 });
    expect(await writer.getCommandReceipt(input.commandId)).toEqual(
      first.receipt,
    );

    expect(await writer.append(input)).toEqual(first);
    const changed = {
      ...input,
      events: [{ ...input.events[0], payload: { value: 'changed' } }],
    };
    expect(await writer.append(changed)).toEqual({
      kind: 'command-identity-conflict',
      commandId: input.commandId,
    });
    const head = first.events[1];
    db.prepare(
      `INSERT INTO event_journal_entity_refs (event_id, commit_position, entity_type, entity_id, role) VALUES (?, ?, 'unit', 'unit-extra', 'observer')`,
    ).run(head.eventId, head.commitPosition);
    await expect(writer.append(input)).rejects.toThrow(/integrity/);
    await expect(writer.append(command(2))).rejects.toThrow(/integrity/);
    expect(await writer.captureHighWater()).toEqual({ commitPosition: 2 });
    expect(
      db
        .prepare(
          'SELECT stream_revision, event_digest FROM event_journal_stream_heads',
        )
        .get(),
    ).toEqual({ stream_revision: 2, event_digest: head.eventDigest });
  });

  it('rejects stale revisions and duplicate event identities without publishing state', async () => {
    const first = await committed(command());
    const stale = command(0);
    expect(await writer.append(stale)).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 0,
      actualRevision: 1,
    });
    const duplicate = command(1);
    (duplicate.events as Journal.IEventToAppend<Payload>[])[0] = {
      ...duplicate.events[0],
      eventId: first.events[0].eventId,
    };
    await expect(writer.append(duplicate)).rejects.toMatchObject({
      code: expect.stringMatching(/^SQLITE_CONSTRAINT/),
    });
    const repeated = command(1, 2);
    (repeated.events as Journal.IEventToAppend<Payload>[])[1] = {
      ...repeated.events[1],
      eventId: repeated.events[0].eventId,
    };
    await expect(writer.append(repeated)).rejects.toThrow('Duplicate eventId');
    expect(await writer.captureHighWater()).toEqual({ commitPosition: 1 });
    expect(await writer.getCommandReceipt(duplicate.commandId)).toBeNull();
  });

  it('rejects position overflow and rolls back writes when the final head publication fails', async () => {
    db.prepare(
      'UPDATE event_journal_store_state SET last_commit_position = ?',
    ).run(Number.MAX_SAFE_INTEGER - 1);
    await expect(writer.append(command(0, 2))).rejects.toThrow(
      'Commit position space exhausted',
    );
    expect(await writer.captureHighWater()).toEqual({
      commitPosition: Number.MAX_SAFE_INTEGER - 1,
    });
    db.prepare(
      'UPDATE event_journal_store_state SET last_commit_position = 0',
    ).run();
    db.exec(
      `CREATE TEMP TRIGGER fail_head BEFORE INSERT ON event_journal_stream_heads BEGIN SELECT RAISE(ABORT, 'injected final-head failure'); END`,
    );
    const failed = command();
    await expect(writer.append(failed)).rejects.toMatchObject({
      code: 'SQLITE_CONSTRAINT_TRIGGER',
    });
    expect(
      db
        .prepare(
          `SELECT (SELECT COUNT(*) FROM event_journal_batches) + (SELECT COUNT(*) FROM event_journal_events) + (SELECT COUNT(*) FROM event_journal_entity_refs) + (SELECT COUNT(*) FROM event_journal_causations) + (SELECT COUNT(*) FROM event_journal_stream_heads) AS count`,
        )
        .get(),
    ).toEqual({ count: 0 });
    expect(await writer.captureHighWater()).toEqual({ commitPosition: 0 });
    expect(await writer.getCommandReceipt(failed.commandId)).toBeNull();
    db.exec('DROP TRIGGER fail_head');
    expect((await committed(command())).events[0].commitPosition).toBe(1);
  });
});
