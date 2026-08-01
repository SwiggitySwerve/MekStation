import type Database from 'better-sqlite3';

import type * as Journal from '../EventJournalContract';

import { canonicalizeEventDigestV1 } from '../EventJournalCanonicalizer';
import { SQLiteEventJournalRecoveryError } from '../SQLiteEventJournalRecovery';
import { SQLiteEventJournalTestHarness } from './SQLiteEventJournalTestHarness';

type Payload = Readonly<{ value: string }>;
type Committed = Journal.ICommittedEventBatch<Payload>;
type Tamper = Readonly<{
  name: string;
  apply: (db: Database.Database, committed: Committed) => void;
}>;

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

function command(): Journal.IAppendEventBatch<Payload> {
  return {
    streamType: 'test',
    streamId: 'alpha',
    expectedBranchId: 'root',
    expectedRevision: 0,
    commandId: 'command-1',
    principal: {
      actorKind: 'human',
      actorId: 'player-1',
      authorityType: 'test-host',
      authorityId: 'host-1',
    },
    events: [0, 1].map((index) => ({
      eventId: `event-${index + 1}`,
      eventType: 'TestEvent',
      eventVersion: 1,
      correlationId: 'correlation-1',
      causationEventIds: ['origin-event'],
      occurredAt: '2026-08-01T00:00:00.000Z',
      payload: { value: `value-${index + 1}` },
      entityRefs: [{ entityType: 'unit', entityId: 'unit-1', role: 'subject' }],
    })),
  };
}

function mutateImmutable(
  db: Database.Database,
  triggerName:
    | 'event_journal_batches_no_update'
    | 'event_journal_events_no_update',
  mutation: () => void,
): void {
  const row = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?`,
    )
    .get(triggerName) as { readonly sql?: unknown } | undefined;
  if (typeof row?.sql !== 'string') throw new Error('Trigger SQL is missing');
  db.exec(`DROP TRIGGER ${triggerName}`);
  try {
    mutation();
  } finally {
    db.exec(row.sql);
  }
}

const tampers: readonly Tamper[] = [
  {
    name: 'high-water below the maximum committed position',
    apply: (db) => {
      db.prepare(
        `UPDATE event_journal_store_state SET last_commit_position = 0`,
      ).run();
    },
  },
  {
    name: 'a head that disagrees with the final stream event',
    apply: (db) => {
      db.prepare(`UPDATE event_journal_stream_heads SET event_digest = ?`).run(
        DIGEST_A,
      );
    },
  },
  {
    name: 'an altered command identity digest',
    apply: (db) => {
      mutateImmutable(db, 'event_journal_batches_no_update', () => {
        db.prepare(`UPDATE event_journal_batches SET command_digest = ?`).run(
          DIGEST_B,
        );
      });
    },
  },
  {
    name: 'a receipt whose event count and ranges omit a stored event',
    apply: (db) => {
      mutateImmutable(db, 'event_journal_batches_no_update', () => {
        db.prepare(
          `UPDATE event_journal_batches SET event_count = 1, last_stream_revision = first_stream_revision, last_commit_position = first_commit_position`,
        ).run();
      });
    },
  },
  {
    name: 'a digest-valid event whose predecessor breaks the stream chain',
    apply: (db, committed) => {
      const second = committed.events[1];
      const changed = { ...second, previousStreamEventDigest: DIGEST_A };
      const eventDigest = canonicalizeEventDigestV1(changed).digest;
      mutateImmutable(db, 'event_journal_events_no_update', () => {
        db.prepare(
          `UPDATE event_journal_events SET previous_stream_event_digest = ?, event_digest = ? WHERE event_id = ?`,
        ).run(DIGEST_A, eventDigest, second.eventId);
      });
      db.prepare(`UPDATE event_journal_stream_heads SET event_digest = ?`).run(
        eventDigest,
      );
    },
  },
  {
    name: 'an uncommitted entity membership added to a stored event',
    apply: (db, committed) => {
      const event = committed.events[0];
      db.prepare(
        `INSERT INTO event_journal_entity_refs (event_id, commit_position, entity_type, entity_id, role) VALUES (?, ?, 'unit', 'unit-extra', 'observer')`,
      ).run(event.eventId, event.commitPosition);
    },
  },
];

describe('SQLite event journal verified opening', () => {
  it.each(tampers)(
    'rejects $name after a real file restart',
    async ({ apply }) => {
      const harness = await SQLiteEventJournalTestHarness.create();
      try {
        const result = await harness.current().append(command());
        if (result.kind !== 'committed') throw new Error('Expected commit');
        apply(harness.database(), result);
        await expect(harness.restart()).rejects.toBeInstanceOf(
          SQLiteEventJournalRecoveryError,
        );
      } finally {
        await harness.dispose();
      }
    },
  );
});
