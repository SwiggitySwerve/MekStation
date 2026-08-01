import Database from 'better-sqlite3';

import { EVENT_JOURNAL_MIGRATION } from '@/services/persistence/SQLiteService.eventJournal.migration';

import type * as Journal from '../EventJournalContract';

import { SQLiteEventJournal } from '../SQLiteEventJournal';

type Payload = Readonly<{ value: string }>;
type CommandOptions = Readonly<{
  streamId?: string;
  expectedRevision?: number;
  count?: number;
  authorityId?: string;
  correlationId?: string;
  causationEventIds?: readonly string[];
  entityRefs?: readonly Journal.IEntityEventRef[];
}>;
const NOW = '2026-08-01T13:00:00.000Z';

describe('SQLiteEventJournal', () => {
  let db!: Database.Database;
  let journal: SQLiteEventJournal<Payload>;
  let sequence: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(EVENT_JOURNAL_MIGRATION.up);
    journal = new SQLiteEventJournal(db, () => NOW);
    sequence = 1;
  });
  afterEach(() => {
    if (db?.open) db.close();
  });

  function command(
    options: CommandOptions = {},
  ): Journal.IAppendEventBatch<Payload> {
    const commandId = `command-${sequence++}`;
    return {
      streamType: 'test',
      streamId: options.streamId ?? 'alpha',
      expectedBranchId: 'root',
      expectedRevision: options.expectedRevision ?? 0,
      commandId,
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: options.authorityId ?? 'host-1',
      },
      events: Array.from({ length: options.count ?? 1 }, (_unused, index) => ({
        eventId: `${commandId}-event-${index}`,
        eventType: 'TestEvent',
        eventVersion: 1,
        correlationId: options.correlationId ?? 'correlation-1',
        causationEventIds: options.causationEventIds ?? [
          'origin-b',
          'origin-a',
        ],
        occurredAt: NOW,
        payload: { value: `${commandId}-${index}` },
        entityRefs: options.entityRefs ?? [
          { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
          { entityType: 'unit', entityId: 'unit-2', role: 'target' },
          { entityType: 'unit', entityId: 'unit-1', role: 'observer' },
        ],
      })),
    };
  }

  async function committed(input: Journal.IAppendEventBatch<Payload>) {
    const result = await journal.append(input);
    if (result.kind !== 'committed')
      throw new Error(`Expected commit, got ${result.kind}`);
    return result;
  }

  it('reconstructs normalized events through every server-internal selector', async () => {
    const alpha = await committed(command({ count: 2 }));
    const beta = await committed(
      command({
        streamId: 'beta',
        authorityId: 'host-2',
        correlationId: 'correlation-2',
        causationEventIds: ['origin-z'],
        entityRefs: [
          { entityType: 'pilot', entityId: 'pilot-1', role: 'actor' },
        ],
      }),
    );
    const range = {
      afterCommitPosition: 0,
      throughCommitPosition: 3,
      limit: 10,
    } as const;

    const stream = await journal.readStream({
      streamType: 'test',
      streamId: 'alpha',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(stream).toEqual(alpha.events);
    expect(stream[0].causationEventIds).toEqual(['origin-a', 'origin-b']);
    expect(stream[0].entityRefs.map(({ role }) => role)).toEqual([
      'observer',
      'subject',
      'target',
    ]);
    expect(
      await journal.readEntityHistory({
        ...range,
        entityType: 'unit',
        entityId: 'unit-1',
      }),
    ).toEqual(alpha.events);
    expect(
      await journal.readEntityHistory({
        ...range,
        entityType: 'unit',
        entityId: 'unit-1',
        role: 'subject',
      }),
    ).toEqual(alpha.events);
    expect(
      await journal.readEntityHistory({
        ...range,
        entityType: 'unit',
        entityId: 'unit-1',
        role: 'missing',
      }),
    ).toEqual([]);
    expect(
      await journal.readEventHistory({
        ...range,
        selector: {
          kind: 'authority',
          authorityType: 'host',
          authorityId: 'host-1',
        },
      }),
    ).toEqual(alpha.events);
    expect(
      await journal.readEventHistory({
        ...range,
        selector: { kind: 'correlation', id: 'correlation-2' },
      }),
    ).toEqual(beta.events);
    expect(
      await journal.readEventHistory({
        ...range,
        selector: { kind: 'causation', id: 'origin-z' },
      }),
    ).toEqual(beta.events);
    expect(await journal.getCommandReceipt(alpha.receipt.commandId)).toEqual(
      alpha.receipt,
    );
  });

  it('advances bounded catch-up pages across an observation-position gap', async () => {
    const first = await committed(command({ count: 2 }));
    db.prepare(
      `UPDATE event_journal_store_state SET last_commit_position = 3 WHERE singleton_id = 1`,
    ).run();
    const last = await committed(command({ expectedRevision: 2 }));
    const highWater = await journal.captureHighWater();

    expect(first.events.map(({ commitPosition }) => commitPosition)).toEqual([
      1, 2,
    ]);
    expect(last.events[0].commitPosition).toBe(4);
    expect(highWater).toEqual({ commitPosition: 4 });
    const page = await journal.readCommitted({
      afterCommitPosition: 0,
      throughCommitPosition: highWater.commitPosition,
      limit: 2,
    });
    expect(page.events).toEqual(first.events);
    expect(page.exhausted).toBe(false);
    expect(page.nextAfterCommitPosition).toBe(2);
    const final = await journal.readCommitted({
      afterCommitPosition: page.nextAfterCommitPosition,
      throughCommitPosition: highWater.commitPosition,
      limit: 2,
    });
    expect(final.events).toEqual(last.events);
    expect(final.exhausted).toBe(true);
    expect(final.nextAfterCommitPosition).toBe(4);
  });

  it('keeps the borrowed handle open and fails closed on malformed rows', async () => {
    const alpha = await committed(command());
    const beta = await committed(command({ streamId: 'beta' }));
    expect('close' in journal).toBe(false);
    expect(db.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });

    db.prepare(
      `INSERT INTO event_journal_entity_refs (event_id, commit_position, entity_type, entity_id, role) VALUES (?, ?, 'unit', 'unit-extra', 'observer')`,
    ).run(alpha.events[0].eventId, alpha.events[0].commitPosition);
    await expect(
      journal.readStream({
        streamType: 'test',
        streamId: 'alpha',
        branchId: 'root',
        afterRevision: 0,
        limit: 10,
      }),
    ).rejects.toThrow(/digest is invalid/);

    db.exec('DROP TRIGGER event_journal_events_no_update');
    db.prepare(
      `UPDATE event_journal_events SET payload_json = '{' WHERE event_id = ?`,
    ).run(beta.events[0].eventId);
    await expect(
      journal.readStream({
        streamType: 'test',
        streamId: 'beta',
        branchId: 'root',
        afterRevision: 0,
        limit: 10,
      }),
    ).rejects.toThrow(/invalid payload JSON/);
    expect(db.open).toBe(true);
    db.close();
    await expect(journal.captureHighWater()).rejects.toThrow(/not open|closed/);
  });
});
