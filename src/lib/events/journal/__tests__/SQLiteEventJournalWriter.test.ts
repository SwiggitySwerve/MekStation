import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type * as Journal from '../EventJournalContract';

import { canonicalizeCommandIdentityV1 } from '../EventJournalCommandIdentity';
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

  /** Fixture rollback error mapped by the caller after writer unwind. */
  class PreparedExtensionRollbackError extends Error {
    public constructor() {
      super('prepared-extension-rollback');
      this.name = 'PreparedExtensionRollbackError';
    }
  }

  type SnapshotContext = Readonly<{ sourceId: string }>;
  type PreparedReady = {
    readonly kind: 'ready';
    readonly context: SnapshotContext;
    readonly raw: Journal.IAppendEventBatch<Payload>;
  };
  type PreparedPrepare<TResult> = (
    db: Database.Database,
  ) => PreparedReady | { readonly kind: 'refused'; readonly result: TResult };
  type PreparedExtend<TResult> = (
    db: Database.Database,
    context: SnapshotContext,
    append: () => Journal.EventJournalAppendResult<Payload>,
  ) => TResult;
  type RelevantCounts = Readonly<{
    batches: number;
    events: number;
    refs: number;
    causations: number;
    heads: number;
    highWater: number;
    sources: number;
    extensions: number;
  }>;

  describe('appendPreparedWithExtension', () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE prepared_source_fixture (
          id TEXT PRIMARY KEY,
          body TEXT NOT NULL
        );
        CREATE TABLE prepared_extension_fixture (
          id INTEGER PRIMARY KEY,
          note TEXT NOT NULL
        );
      `);
      db.prepare(
        `INSERT INTO prepared_source_fixture (id, body) VALUES (?, ?)`,
      ).run('src-1', 'baseline-A');
    });

    function relevantCounts(): RelevantCounts {
      return db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM event_journal_batches) AS batches,
             (SELECT COUNT(*) FROM event_journal_events) AS events,
             (SELECT COUNT(*) FROM event_journal_entity_refs) AS refs,
             (SELECT COUNT(*) FROM event_journal_causations) AS causations,
             (SELECT COUNT(*) FROM event_journal_stream_heads) AS heads,
             (SELECT last_commit_position FROM event_journal_store_state WHERE singleton_id = 1) AS highWater,
             (SELECT COUNT(*) FROM prepared_source_fixture) AS sources,
             (SELECT COUNT(*) FROM prepared_extension_fixture) AS extensions`,
        )
        .get() as RelevantCounts;
    }

    async function reopenWriter(): Promise<void> {
      resetSQLiteService();
      getSQLiteService({ path: path.join(dir, 'writer.db') }).initialize();
      db = getSQLiteService().getDatabase();
      writer = new SQLiteEventJournalWriter(db, () => NOW);
    }

    function ready(raw: Journal.IAppendEventBatch<Payload>): PreparedReady {
      return { kind: 'ready', context: { sourceId: 'src-1' }, raw };
    }

    function insertExtension(handle: Database.Database, note: string): void {
      handle
        .prepare(`INSERT INTO prepared_extension_fixture (note) VALUES (?)`)
        .run(note);
    }

    function unusedExtend(reason: string): PreparedExtend<never> {
      return () => {
        throw new Error(reason);
      };
    }

    function sourceBody(): string {
      return (
        db
          .prepare(
            `SELECT body FROM prepared_source_fixture WHERE id = 'src-1'`,
          )
          .get() as { readonly body: string }
      ).body;
    }

    function extensionNotes(): readonly string[] {
      return (
        db
          .prepare(`SELECT note FROM prepared_extension_fixture ORDER BY id`)
          .all() as Array<{ readonly note: string }>
      ).map(({ note }) => note);
    }

    function requireCommitted(
      appended: Journal.EventJournalAppendResult<Payload>,
    ): Journal.ICommittedEventBatch<Payload> {
      if (appended.kind !== 'committed') {
        throw new Error(`Expected commit, got ${appended.kind}`);
      }
      return appended;
    }

    it('canonicalizes the prepare snapshot and keeps it after close/reopen', async () => {
      const first = await committed(command());
      const highWater = (await writer.captureHighWater()).commitPosition;
      let preparedRaw: Journal.IAppendEventBatch<Payload> | undefined;
      const result = await writer.appendPreparedWithExtension(
        (handle) => {
          const source = handle
            .prepare(`SELECT body FROM prepared_source_fixture WHERE id = ?`)
            .get('src-1') as { readonly body: string };
          const water = handle
            .prepare(
              `SELECT last_commit_position AS commitPosition FROM event_journal_store_state WHERE singleton_id = 1`,
            )
            .get() as { readonly commitPosition: number };
          const head = handle
            .prepare(
              `SELECT stream_revision AS streamRevision FROM event_journal_stream_heads WHERE stream_type = 'test' AND stream_id = 'alpha' AND branch_id = 'root'`,
            )
            .get() as { readonly streamRevision: number } | undefined;
          expect(source.body).toBe('baseline-A');
          expect(water.commitPosition).toBe(highWater);
          expect(head?.streamRevision).toBe(first.events[0].streamRevision);
          const raw = command(first.events[0].streamRevision);
          (raw.events as Journal.IEventToAppend<Payload>[])[0] = {
            ...raw.events[0],
            payload: {
              value: `source:${source.body}|hw:${water.commitPosition}|rev:${head?.streamRevision ?? 0}`,
            },
          };
          preparedRaw = raw;
          return ready(raw);
        },
        (handle, context, append) => {
          handle
            .prepare(`UPDATE prepared_source_fixture SET body = ? WHERE id = ?`)
            .run('mutated-B', context.sourceId);
          insertExtension(handle, 'accepted');
          return requireCommitted(append());
        },
      );
      expect(result.kind).toBe('committed');
      if (result.kind !== 'committed' || preparedRaw === undefined) {
        throw new Error('Prepared commit did not return a stored batch');
      }
      expect(result.events[0].payload.value).toBe(
        `source:baseline-A|hw:${highWater}|rev:${first.events[0].streamRevision}`,
      );
      expect(sourceBody()).toBe('mutated-B');
      expect(result.receipt.commandDigest).toBe(
        canonicalizeCommandIdentityV1(preparedRaw).digest,
      );

      await reopenWriter();
      expect(await writer.append(preparedRaw)).toEqual(result);
      expect(await writer.getCommandReceipt(preparedRaw.commandId)).toEqual(
        result.receipt,
      );
      const stored = db
        .prepare(
          `SELECT payload_json AS payloadJson FROM event_journal_events WHERE command_id = ?`,
        )
        .get(preparedRaw.commandId) as { readonly payloadJson: string };
      expect(stored.payloadJson).toContain('baseline-A');
      expect(stored.payloadJson).not.toContain('mutated-B');
      expect(sourceBody()).toBe('mutated-B');
      expect(extensionNotes()).toEqual(['accepted']);
    });

    it('returns a refused prepare without parse, extend, or table changes', async () => {
      const before = relevantCounts();
      let extendCalls = 0;
      const refused = await writer.appendPreparedWithExtension(
        () => ({ kind: 'refused', result: { status: 'blocked' as const } }),
        () => {
          extendCalls += 1;
          throw new Error('extend must not run after refuse');
        },
      );
      expect(refused).toEqual({ status: 'blocked' });
      expect(extendCalls).toBe(0);
      expect(relevantCounts()).toEqual(before);
      expect(await writer.getCommandReceipt('command-missing')).toBeNull();
    });

    it('rejects a malformed prepared batch and duplicate event IDs without publishing', async () => {
      const before = relevantCounts();
      await expect(
        writer.appendPreparedWithExtension(
          () => ready({ ...command(), events: [] }),
          (handle, _context, append) => {
            insertExtension(handle, 'malformed');
            return append();
          },
        ),
      ).rejects.toThrow();
      expect(relevantCounts()).toEqual(before);

      const repeated = command(0, 2);
      (repeated.events as Journal.IEventToAppend<Payload>[])[1] = {
        ...repeated.events[1],
        eventId: repeated.events[0].eventId,
      };
      await expect(
        writer.appendPreparedWithExtension(
          () => ready(repeated),
          (handle, _context, append) => {
            insertExtension(handle, 'duplicate');
            return append();
          },
        ),
      ).rejects.toThrow('Duplicate eventId');
      expect(relevantCounts()).toEqual(before);
    });

    it('rolls back journal and extension rows when prepare, parse, append, or extend throw', async () => {
      const before = relevantCounts();
      await expect(
        writer.appendPreparedWithExtension(() => {
          throw new Error('prepare exploded');
        }, unusedExtend('extend must not run after prepare throw')),
      ).rejects.toThrow('prepare exploded');
      expect(relevantCounts()).toEqual(before);

      await expect(
        writer.appendPreparedWithExtension(
          () => ready({ ...command(), commandId: '' }),
          (handle, _context, append) => {
            insertExtension(handle, 'parse');
            return append();
          },
        ),
      ).rejects.toThrow();
      expect(relevantCounts()).toEqual(before);

      const existing = await committed(command());
      const afterCommit = relevantCounts();
      const colliding = command(1);
      (colliding.events as Journal.IEventToAppend<Payload>[])[0] = {
        ...colliding.events[0],
        eventId: existing.events[0].eventId,
      };
      await expect(
        writer.appendPreparedWithExtension(
          () => ready(colliding),
          (handle, _context, append) => {
            insertExtension(handle, 'append-constraint');
            return append();
          },
        ),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/^SQLITE_CONSTRAINT/),
      });
      expect(relevantCounts()).toEqual(afterCommit);

      await expect(
        writer.appendPreparedWithExtension(
          () => ready(command(1)),
          (handle) => {
            insertExtension(handle, 'extend-before-append');
            throw new Error('extend exploded before append');
          },
        ),
      ).rejects.toThrow('extend exploded before append');
      expect(relevantCounts()).toEqual(afterCommit);
    });

    it('propagates a dedicated post-append rollback error for the caller to map outside the writer', async () => {
      const before = relevantCounts();
      const raw = command();
      let mapped:
        | { readonly kind: 'refused'; readonly cause: string }
        | undefined;
      try {
        await writer.appendPreparedWithExtension(
          () => ready(raw),
          (handle, _context, append) => {
            requireCommitted(append());
            insertExtension(handle, 'post-append');
            throw new PreparedExtensionRollbackError();
          },
        );
      } catch (error) {
        if (error instanceof PreparedExtensionRollbackError) {
          mapped = { kind: 'refused', cause: error.message };
        } else {
          throw error;
        }
      }
      expect(mapped).toEqual({
        kind: 'refused',
        cause: 'prepared-extension-rollback',
      });
      expect(relevantCounts()).toEqual(before);
      expect(await writer.getCommandReceipt(raw.commandId)).toBeNull();
    });

    it('rejects thenable prepare, refused-result, and extend returns before commit', async () => {
      const thenableMessage = /thenable results are rejected before commit/;
      // Prepare is a synchronous callback. Generic TResult does not
      // statically exclude Promises; the runtime guard enforces that
      // refused.result and extend returns are not thenable before commit.
      function callableThenable(value: unknown): unknown {
        return Object.assign(() => value, {
          then(
            onFulfilled?: (result: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return Promise.resolve(value).then(onFulfilled, onRejected);
          },
        });
      }
      const kinds = ['promise', 'callable'] as const;
      const seams = ['prepare', 'refused.result', 'extend'] as const;
      const outcomes: Array<{
        readonly seam: string;
        readonly rejected: boolean;
        readonly message: string;
        readonly unchanged: boolean;
        readonly receipt: Journal.ICommandReceipt | null;
      }> = [];
      for (const kind of kinds) {
        const wrap = (value: unknown): unknown =>
          kind === 'promise' ? Promise.resolve(value) : callableThenable(value);
        for (const seam of seams) {
          const raw = command();
          const snapshot = relevantCounts();
          let rejected = false;
          let message = 'resolved';
          const prepareFn = (seam === 'prepare'
            ? () => wrap(ready(raw))
            : seam === 'refused.result'
              ? () => ({
                  kind: 'refused' as const,
                  result: wrap('async-refusal'),
                })
              : () => ready(raw)) as unknown as PreparedPrepare<unknown>;
          const extendFn: PreparedExtend<unknown> =
            seam === 'extend'
              ? (handle, _context, append) => {
                  requireCommitted(append());
                  insertExtension(handle, `${kind}-thenable-extend`);
                  return wrap('async-extend');
                }
              : unusedExtend(`extend must not run after ${kind} ${seam}`);
          try {
            await writer.appendPreparedWithExtension(prepareFn, extendFn);
          } catch (error) {
            rejected = true;
            message = error instanceof Error ? error.message : String(error);
          }
          outcomes.push({
            seam: `${kind}:${seam}`,
            rejected,
            message,
            unchanged:
              JSON.stringify(relevantCounts()) === JSON.stringify(snapshot),
            receipt: await writer.getCommandReceipt(raw.commandId),
          });
        }
      }
      expect(outcomes).toEqual(
        kinds.flatMap((kind) =>
          seams.map((seam) => ({
            seam: `${kind}:${seam}`,
            rejected: true,
            message: expect.stringMatching(thenableMessage),
            unchanged: true,
            receipt: null,
          })),
        ),
      );
    });
  });

  it('keeps appendWithExtension parse-then-transaction order and typed conflicts', async () => {
    let extendCalls = 0;
    await expect(
      writer.appendWithExtension({ ...command(), events: [] }, () => {
        extendCalls += 1;
        throw new Error('extend must not run before parse');
      }),
    ).rejects.toThrow();
    expect(extendCalls).toBe(0);

    const first = await committed(command());
    expect(
      await writer.appendWithExtension(command(0), (_db, append) => append()),
    ).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 0,
      actualRevision: 1,
    });
    const replay = command(0);
    expect(
      await writer.appendWithExtension(
        { ...replay, commandId: first.receipt.commandId },
        (_db, append) => append(),
      ),
    ).toEqual({
      kind: 'command-identity-conflict',
      commandId: first.receipt.commandId,
    });
  });
});
