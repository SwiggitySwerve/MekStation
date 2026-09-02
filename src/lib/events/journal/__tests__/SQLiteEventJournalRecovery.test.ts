import type Database from 'better-sqlite3';

import type * as Journal from '../EventJournalContract';

import { _branchCreationSeamForTests } from '../EventHistoryBranchContract';
import { canonicalizeEventDigestV1 } from '../EventJournalCanonicalizer';
import { canonicalizeCommandIdentityV1 } from '../EventJournalCommandIdentity';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import {
  openVerifiedSQLiteEventJournal,
  SQLiteEventJournalRecoveryError,
} from '../SQLiteEventJournalRecovery';
import { SQLiteEventJournalTestHarness } from './SQLiteEventJournalTestHarness';

type Payload = Readonly<{ value: string }>;
type Committed = Journal.ICommittedEventBatch<Payload>;
type Tamper = Readonly<{
  name: string;
  apply: (db: Database.Database, committed: Committed) => void;
}>;

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const CANDIDATE_A = 'candidate-1';
const CANDIDATE_B = 'candidate-2';
const STREAM = { streamType: 'test', streamId: 'alpha' } as const;

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

function suffixCommand(
  sequence: number,
  expectedRevision: number,
): Journal.IAppendEventBatch<Payload> {
  return {
    ...command(),
    expectedRevision,
    commandId: `command-${sequence}`,
    events: [
      {
        ...command().events[0],
        eventId: `event-${sequence + 1}`,
        payload: { value: `value-${sequence + 1}` },
      },
    ],
  };
}

/** Last event of a committed root batch. C1a's seed copies this pair. */
async function commitRoot(
  harness: SQLiteEventJournalTestHarness,
): Promise<Journal.IStoredEvent<Payload>> {
  const result = await harness.current().append(command());
  if (result.kind !== 'committed') throw new Error('Expected commit');
  return result.events[result.events.length - 1];
}

function installGenesis(db: Database.Database): void {
  new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
}

function insertCandidateBranch(
  db: Database.Database,
  branchId: string,
  base: Journal.IStoredEvent<Payload>,
): void {
  new SQLiteEventHistoryBranchStore(
    db,
    _branchCreationSeamForTests(),
  ).createBranch({
    ...STREAM,
    branchId,
    parentBranchId: 'root',
    ancestorDepth: 1,
    baseRevision: base.streamRevision,
    baseEventId: base.eventId,
    baseDigest: base.eventDigest,
    status: 'building',
    createdBy: 'gm-1',
    reason: 'authorized rewind',
    createdAt: '2026-09-02T00:00:00.000Z',
  });
}

/** The same INSERT C1a's seedCandidateJournalHead writes. */
function insertCandidateHead(
  db: Database.Database,
  branchId: string,
  streamRevision: number,
  eventDigest: string,
): void {
  db.prepare(
    `INSERT INTO event_journal_stream_heads
       (stream_type, stream_id, branch_id, stream_revision, event_digest)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    STREAM.streamType,
    STREAM.streamId,
    branchId,
    streamRevision,
    eventDigest,
  );
}

async function seedCandidate(
  harness: SQLiteEventJournalTestHarness,
  branchId: string,
): Promise<Journal.IStoredEvent<Payload>> {
  const base = await commitRoot(harness);
  const db = harness.database();
  installGenesis(db);
  insertCandidateBranch(db, branchId, base);
  insertCandidateHead(db, branchId, base.streamRevision, base.eventDigest);
  return base;
}

/**
 * The writer will not append onto a C1a seed head: verifyHead looks
 * for an event on THIS branch at the base, and the base event lives
 * on the parent. Commit from genesis first (the writer can do that),
 * then retarget the row to the chain the writer would have written
 * had the seed been honored — revision base+1, predecessor = digest.
 */
async function commitCandidateFromGenesis(
  harness: SQLiteEventJournalTestHarness,
  branchId: string,
): Promise<{
  readonly base: Journal.IStoredEvent<Payload>;
  readonly event: Journal.IStoredEvent<Payload>;
  readonly command: Journal.IAppendEventBatch<Payload>;
}> {
  const base = await commitRoot(harness);
  const db = harness.database();
  installGenesis(db);
  insertCandidateBranch(db, branchId, base);
  const command = {
    ...suffixCommand(2, 0),
    expectedBranchId: branchId,
  };
  const result = await harness.current().append(command);
  if (result.kind !== 'committed') {
    throw new Error('Expected candidate commit');
  }
  return { base, event: result.events[0], command };
}

function rewireCandidateOnto(
  db: Database.Database,
  event: Journal.IStoredEvent<Payload>,
  streamRevision: number,
  previousDigest: string,
  command: Journal.IAppendEventBatch<Payload>,
): void {
  const rewritten = {
    ...event,
    streamRevision,
    previousStreamEventDigest: previousDigest,
  };
  const eventDigest = canonicalizeEventDigestV1(rewritten).digest;
  mutateImmutable(db, 'event_journal_events_no_update', () => {
    db.prepare(
      `UPDATE event_journal_events
       SET stream_revision = ?, previous_stream_event_digest = ?, event_digest = ?
       WHERE event_id = ?`,
    ).run(streamRevision, previousDigest, eventDigest, event.eventId);
  });
  db.prepare(
    `UPDATE event_journal_stream_heads
     SET stream_revision = ?, event_digest = ?
     WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
  ).run(
    streamRevision,
    eventDigest,
    event.streamType,
    event.streamId,
    event.branchId,
  );
  const commandDigest = canonicalizeCommandIdentityV1({
    ...command,
    expectedRevision: streamRevision - 1,
  }).digest;
  mutateImmutable(db, 'event_journal_batches_no_update', () => {
    db.prepare(
      `UPDATE event_journal_batches
       SET first_stream_revision = ?, last_stream_revision = ?, command_digest = ?
       WHERE command_id = ?`,
    ).run(streamRevision, streamRevision, commandDigest, event.commandId);
  });
}

/** Pre-migration-23 shape: lineage tables gone, journal rows untouched. */
function dropHistoryBranchTables(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS event_history_supersessions;
    DROP TABLE IF EXISTS event_history_effective_heads;
    DROP TABLE IF EXISTS event_history_branches;
  `);
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
        expect(harness.database().inTransaction).toBe(false);
      } finally {
        await harness.dispose();
      }
    },
  );

  it('keeps one pre-commit snapshot while another WAL connection commits', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    const writerService = harness.openAdditionalService();
    const readerDb = harness.database();
    const originalPrepare = readerDb.prepare.bind(readerDb);
    let interleavings = 0;
    let writerCommit: Promise<
      Journal.EventJournalAppendResult<Payload>
    > | null = null;
    try {
      await harness.current().append(command());
      const writer = await openVerifiedSQLiteEventJournal<Payload>(
        writerService.getDatabase(),
      );
      readerDb.prepare = ((source: string) => {
        const statement = originalPrepare(source);
        if (
          source.replace(/\s+/g, ' ').trim() !==
          'SELECT last_commit_position AS commitPosition FROM event_journal_store_state WHERE singleton_id = 1'
        ) {
          return statement;
        }
        const originalGet = statement.get.bind(statement);
        statement.get = ((...parameters: unknown[]) => {
          const row = originalGet(...parameters);
          if (interleavings === 0) {
            interleavings += 1;
            writerCommit = writer.append(suffixCommand(2, 2));
          }
          return row;
        }) as typeof statement.get;
        return statement;
      }) as typeof readerDb.prepare;

      await expect(
        openVerifiedSQLiteEventJournal<Payload>(readerDb),
      ).resolves.toBeDefined();
      expect(interleavings).toBe(1);
      await expect(writerCommit).resolves.toMatchObject({ kind: 'committed' });
      expect(readerDb.inTransaction).toBe(false);

      readerDb.prepare = originalPrepare;
      const postCommit =
        await openVerifiedSQLiteEventJournal<Payload>(readerDb);
      await expect(postCommit.captureHighWater()).resolves.toEqual({
        commitPosition: 3,
      });
      await expect(postCommit.getCommandReceipt('command-2')).resolves.toEqual(
        expect.objectContaining({
          commandId: 'command-2',
          firstCommitPosition: 3,
          lastCommitPosition: 3,
        }),
      );
      await expect(writer.append(suffixCommand(3, 3))).resolves.toMatchObject({
        kind: 'committed',
      });
    } finally {
      readerDb.prepare = originalPrepare;
      writerService.close();
      await harness.dispose();
    }
  });

  it.failing(
    'finding #86-adjacent: a C1a candidate head with no events is not journal corruption',
    async () => {
      // WHY THIS IS FAILING RATHER THAN FIXED. C1a seeds a candidate
      // `event_journal_stream_heads` row at the base revision with no
      // events on that branch yet. Recovery scans every head row and
      // compares the count to distinct (stream, branch) event chains, so
      // the extra head is reported as 'Stream head count differs'. The
      // recovery module is out of this seam; do not change it here.
      const harness = await SQLiteEventJournalTestHarness.create();
      try {
        const result = await harness.current().append(command());
        if (result.kind !== 'committed') throw new Error('Expected commit');
        harness
          .database()
          .prepare(
            `INSERT INTO event_journal_stream_heads
               (stream_type, stream_id, branch_id, stream_revision, event_digest)
             VALUES ('test', 'alpha', 'candidate-1', 2, ?)`,
          )
          .run(DIGEST_B);
        await expect(
          openVerifiedSQLiteEventJournal(harness.database()),
        ).resolves.toBeDefined();
      } finally {
        await harness.dispose();
      }
    },
  );

  it('rejects an active caller transaction without ending it', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const db = harness.database();
      let verifiedOpen: ReturnType<typeof openVerifiedSQLiteEventJournal>;
      db.transaction(() => {
        expect(db.inTransaction).toBe(true);
        verifiedOpen = openVerifiedSQLiteEventJournal(db);
        expect(db.inTransaction).toBe(true);
        expect(db.prepare(`SELECT 1 AS value`).pluck().get()).toBe(1);
      })();
      await expect(verifiedOpen!).rejects.toBeInstanceOf(
        SQLiteEventJournalRecoveryError,
      );
      expect(db.inTransaction).toBe(false);
    } finally {
      await harness.dispose();
    }
  });
});

describe('SQLite event journal candidate seed recovery', () => {
  it('finding #86-adjacent: a C1a candidate head with no events is not journal corruption', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      await seedCandidate(harness, CANDIDATE_A);
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(harness.database()),
      ).resolves.toBeDefined();
    } finally {
      await harness.dispose();
    }
  });

  it('finding #96: an event-less head on a branch that does not exist is still corruption', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const base = await commitRoot(harness);
      installGenesis(harness.database());
      insertCandidateHead(
        harness.database(),
        CANDIDATE_A,
        base.streamRevision,
        base.eventDigest,
      );
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(harness.database()),
      ).rejects.toThrow('Stream head count differs');
    } finally {
      await harness.dispose();
    }
  });

  it('finding #96: a seed whose revision disagrees with its branch record is refused', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const base = await commitRoot(harness);
      const db = harness.database();
      installGenesis(db);
      insertCandidateBranch(db, CANDIDATE_A, base);
      insertCandidateHead(
        db,
        CANDIDATE_A,
        base.streamRevision - 1,
        base.eventDigest,
      );
      await expect(openVerifiedSQLiteEventJournal<Payload>(db)).rejects.toThrow(
        'Candidate seed disagrees with its branch record',
      );
    } finally {
      await harness.dispose();
    }
  });

  it('finding #96: a seed whose digest disagrees with its branch record is refused', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const base = await commitRoot(harness);
      const db = harness.database();
      installGenesis(db);
      insertCandidateBranch(db, CANDIDATE_A, base);
      insertCandidateHead(db, CANDIDATE_A, base.streamRevision, DIGEST_A);
      await expect(openVerifiedSQLiteEventJournal<Payload>(db)).rejects.toThrow(
        'Candidate seed disagrees with its branch record',
      );
    } finally {
      await harness.dispose();
    }
  });

  it('finding #96: two seeds on two candidates of the same stream are both admitted', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const base = await commitRoot(harness);
      const db = harness.database();
      installGenesis(db);
      insertCandidateBranch(db, CANDIDATE_A, base);
      insertCandidateBranch(db, CANDIDATE_B, base);
      insertCandidateHead(
        db,
        CANDIDATE_A,
        base.streamRevision,
        base.eventDigest,
      );
      insertCandidateHead(
        db,
        CANDIDATE_B,
        base.streamRevision,
        base.eventDigest,
      );
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(db),
      ).resolves.toBeDefined();
    } finally {
      await harness.dispose();
    }
  });

  it('finding #96: a candidate branch that later has events is treated as event-backed', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const { base, event, command } = await commitCandidateFromGenesis(
        harness,
        CANDIDATE_A,
      );
      const db = harness.database();
      rewireCandidateOnto(
        db,
        event,
        base.streamRevision + 1,
        base.eventDigest,
        command,
      );
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(db),
      ).resolves.toBeDefined();
      // Resetting the head to the branch seed must fail as a chain
      // disagreement, not pass as a seed: events exist on this branch.
      db.prepare(
        `UPDATE event_journal_stream_heads
         SET stream_revision = ?, event_digest = ?
         WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
      ).run(
        base.streamRevision,
        base.eventDigest,
        STREAM.streamType,
        STREAM.streamId,
        CANDIDATE_A,
      );
      await expect(openVerifiedSQLiteEventJournal<Payload>(db)).rejects.toThrow(
        'Stored stream head disagrees with its final event',
      );
    } finally {
      await harness.dispose();
    }
  });

  it('finding #97: a candidate whose first event claims revision 1 is refused', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const { event } = await commitCandidateFromGenesis(harness, CANDIDATE_A);
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(harness.database()),
      ).rejects.toThrow(`Stream chain is invalid at event ${event.eventId}`);
    } finally {
      await harness.dispose();
    }
  });

  it('finding #97: a candidate whose first event chains from the wrong digest is refused', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      const { base, event, command } = await commitCandidateFromGenesis(
        harness,
        CANDIDATE_A,
      );
      rewireCandidateOnto(
        harness.database(),
        event,
        base.streamRevision + 1,
        DIGEST_A,
        command,
      );
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(harness.database()),
      ).rejects.toThrow(`Stream chain is invalid at event ${event.eventId}`);
    } finally {
      await harness.dispose();
    }
  });

  it('finding #97: root chain still starts at genesis', async () => {
    const harness = await SQLiteEventJournalTestHarness.create();
    try {
      await commitRoot(harness);
      installGenesis(harness.database());
      await expect(
        openVerifiedSQLiteEventJournal<Payload>(harness.database()),
      ).resolves.toBeDefined();
    } finally {
      await harness.dispose();
    }
  });

  // A row for a database from before migration 23 (no branch table) was tried
  // and withdrawn: dropping the table under its foreign-key children is not
  // how an older database looks, and there is no honest fixture for one in
  // this harness. The guard stays a table-existence check in the module.
});
