import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type * as Journal from '../EventJournalContract';

import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventJournalWriter } from '../SQLiteEventJournalWriter';

type Payload = Readonly<{ value: string }>;
const NOW = '2026-08-01T12:00:00.000Z';
const CANDIDATE = 'candidate-1';
const OTHER_DIGEST = 'b'.repeat(64);

describe('SQLiteEventJournalWriter', () => {
  let dir: string;
  let db: Database.Database;
  let writer: SQLiteEventJournalWriter<Payload>;
  let sequence: number;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-journal-writer-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'writer.db') }).initialize();
    db = getSQLiteService().getDatabase();
    writer = new SQLiteEventJournalWriter(db, () => NOW);
    sequence = 1;
  });
  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function command(
    expectedRevision = 0,
    count = 1,
    branchId = 'root',
  ): Journal.IAppendEventBatch<Payload> {
    const commandId = `command-${sequence++}`;
    return {
      streamType: 'test',
      streamId: 'alpha',
      expectedBranchId: branchId,
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

  /**
   * Finding #98: a candidate head is planted at the parent event, which
   * does not exist on this branch. W1/W5 are red today; W2-W4 already
   * refuse and stay that way unless the seed check is too loose.
   */
  function plantCandidateSeed(input: {
    readonly branchId?: string;
    readonly baseRevision: number;
    readonly baseEventId: string;
    readonly baseDigest: string;
    readonly headRevision: number;
    readonly headDigest: string;
  }): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('test', 'alpha', ?, 'root', 1, ?, ?, ?, 'building',
               'host-1', 'correction-rebuild:test:1:writer-seed', ?)`,
    ).run(
      input.branchId ?? CANDIDATE,
      input.baseRevision,
      input.baseEventId,
      input.baseDigest,
      NOW,
    );
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('test', 'alpha', ?, ?, ?)`,
    ).run(input.branchId ?? CANDIDATE, input.headRevision, input.headDigest);
  }

  async function seedRootThenBranchTables() {
    const first = await committed(command());
    // The production runner already applied journal, baseline, branches
    // (v23), and the SQL pin lift (v26). Genesis is backfilled from
    // live stream heads, so it has to run AFTER the first root commit.
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
    return first.events[0];
  }

  it('W1: the first append onto a seeded candidate branch commits and chains from the base digest', async () => {
    const base = await seedRootThenBranchTables();
    plantCandidateSeed({
      baseRevision: base.streamRevision,
      baseEventId: base.eventId,
      baseDigest: base.eventDigest,
      headRevision: base.streamRevision,
      headDigest: base.eventDigest,
    });
    const next = await committed(command(base.streamRevision, 1, CANDIDATE));
    expect(next.events[0].branchId).toBe(CANDIDATE);
    expect(next.events[0].streamRevision).toBe(base.streamRevision + 1);
    expect(next.events[0].previousStreamEventDigest).toBe(base.eventDigest);
  });

  it('W2: a head row with no event and NO branch record is still refused', async () => {
    await seedRootThenBranchTables();
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('test', 'alpha', 'orphan-head', 1, ?)`,
    ).run(OTHER_DIGEST);
    await expect(writer.append(command(1, 1, 'orphan-head'))).rejects.toThrow(
      'Stream head has no final committed event',
    );
  });

  it('W3: a seed whose branch record base revision differs from the head revision is refused', async () => {
    const base = await seedRootThenBranchTables();
    plantCandidateSeed({
      baseRevision: base.streamRevision + 1,
      baseEventId: base.eventId,
      baseDigest: base.eventDigest,
      headRevision: base.streamRevision,
      headDigest: base.eventDigest,
    });
    await expect(
      writer.append(command(base.streamRevision, 1, CANDIDATE)),
    ).rejects.toThrow('Stream head has no final committed event');
  });

  it('W4: a seed whose base digest differs from the head digest is refused', async () => {
    const base = await seedRootThenBranchTables();
    plantCandidateSeed({
      baseRevision: base.streamRevision,
      baseEventId: base.eventId,
      baseDigest: OTHER_DIGEST,
      headRevision: base.streamRevision,
      headDigest: base.eventDigest,
    });
    await expect(
      writer.append(command(base.streamRevision, 1, CANDIDATE)),
    ).rejects.toThrow('Stream head has no final committed event');
  });

  it('W5: a second append onto the candidate (now event-backed) still verifies against its own last event, not the seed', async () => {
    const base = await seedRootThenBranchTables();
    plantCandidateSeed({
      baseRevision: base.streamRevision,
      baseEventId: base.eventId,
      baseDigest: base.eventDigest,
      headRevision: base.streamRevision,
      headDigest: base.eventDigest,
    });
    const firstOnCandidate = await committed(
      command(base.streamRevision, 1, CANDIDATE),
    );
    const second = await committed(
      command(firstOnCandidate.events[0].streamRevision, 1, CANDIDATE),
    );
    expect(second.events[0].previousStreamEventDigest).toBe(
      firstOnCandidate.events[0].eventDigest,
    );
    expect(second.events[0].previousStreamEventDigest).not.toBe(
      base.eventDigest,
    );
    expect(second.events[0].streamRevision).toBe(
      firstOnCandidate.events[0].streamRevision + 1,
    );
  });
});
