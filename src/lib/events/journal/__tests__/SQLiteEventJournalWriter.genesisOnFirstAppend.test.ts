/**
 * U19: a stream's first journal append installs its genesis
 * `event_history_branches` row and its effective head in the SAME
 * transaction as the append (FN-genesis-branch-row-is-a-mirror-side-effect).
 *
 * Real SQLite, freshly migrated through `SQLiteService`, the journal's own
 * test style. A campaign stream appends on `root`; a mirrored match stream
 * appends on `main` (the mirror's baseline branch), so both genesis shapes
 * the backfill would produce are exercised.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type * as Journal from '../EventJournalContract';

import { EVENT_HISTORY_GENESIS_DIGEST } from '../EventHistoryBranchContract';
import { readEffectiveStreamHead } from '../EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventJournalWriter } from '../SQLiteEventJournalWriter';

type Payload = Readonly<{ value: string }>;
const NOW = '2026-09-22T12:00:00.000Z';
const CAMPAIGN = { streamType: 'campaign', streamId: 'campaign-1' } as const;
const MATCH = { streamType: 'match', streamId: 'match-1' } as const;

interface IStreamRef {
  readonly streamType: string;
  readonly streamId: string;
}

interface IGenesisCensus {
  readonly branches: readonly Record<string, unknown>[];
  readonly effectiveHeads: readonly Record<string, unknown>[];
}

describe('SQLiteEventJournalWriter genesis branch on first append (U19)', () => {
  let dir: string;
  let service: SQLiteService;
  let extra: SQLiteService | null;
  let db: Database.Database;
  let writer: SQLiteEventJournalWriter<Payload>;
  let sequence: number;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-journal-genesis-'));
    service = new SQLiteService({ path: path.join(dir, 'journal.db') });
    service.initialize();
    extra = null;
    db = service.getDatabase();
    writer = new SQLiteEventJournalWriter(db, () => NOW);
    sequence = 1;
  });

  afterEach(async () => {
    extra?.close();
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** One single-event batch for `stream` on `branchId` at `expectedRevision`. */
  function batch(
    stream: IStreamRef,
    expectedRevision: number,
    branchId = 'root',
  ): Journal.IAppendEventBatch<Payload> {
    const commandId = `command-${sequence++}`;
    return {
      streamType: stream.streamType,
      streamId: stream.streamId,
      expectedBranchId: branchId,
      expectedRevision,
      commandId,
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [
        {
          eventId: `${commandId}-event-0`,
          eventType: 'TestEvent',
          eventVersion: 1,
          correlationId: 'correlation-1',
          causationEventIds: [],
          occurredAt: NOW,
          payload: { value: commandId },
          entityRefs: [],
        },
      ],
    };
  }

  /** Append through `using` and fail the test unless it committed. */
  async function committed(
    input: Journal.IAppendEventBatch<Payload>,
    using: SQLiteEventJournalWriter<Payload> = writer,
  ): Promise<Journal.ICommittedEventBatch<Payload>> {
    const result = await using.append(input);
    if (result.kind !== 'committed') {
      throw new Error(`Expected commit, got ${result.kind}`);
    }
    return result;
  }

  /** Every branch and effective-head row of one stream, as plain objects. */
  function census(stream: IStreamRef): IGenesisCensus {
    const plain = (rows: unknown[]) =>
      rows.map((row) => Object.assign({}, row as Record<string, unknown>));
    return {
      branches: plain(
        db
          .prepare(
            `SELECT stream_type, stream_id, branch_id, parent_branch_id,
                    ancestor_depth, base_revision, base_event_id, base_digest,
                    status, created_by, reason, created_at
               FROM event_history_branches
              WHERE stream_type = ? AND stream_id = ?
              ORDER BY branch_id`,
          )
          .all(stream.streamType, stream.streamId),
      ),
      effectiveHeads: plain(
        db
          .prepare(
            `SELECT stream_type, stream_id, branch_id, effective_generation,
                    installed_at
               FROM event_history_effective_heads
              WHERE stream_type = ? AND stream_id = ?`,
          )
          .all(stream.streamType, stream.streamId),
      ),
    };
  }

  /** Row counts across every stream, for the "nothing landed" assertions. */
  function totals(): Readonly<Record<string, number>> {
    return Object.assign(
      {},
      db
        .prepare(
          `SELECT (SELECT COUNT(*) FROM event_history_branches) AS branches,
                  (SELECT COUNT(*) FROM event_history_effective_heads) AS effectiveHeads,
                  (SELECT COUNT(*) FROM event_journal_stream_heads) AS journalHeads,
                  (SELECT COUNT(*) FROM event_journal_events) AS events`,
        )
        .get() as Record<string, number>,
    );
  }

  /** The root-shaped effective genesis row the backfill would write. */
  function expectGenesisShape(
    stream: IStreamRef,
    branchId: string,
    generation: number,
  ): void {
    const rows = census(stream);
    expect(rows.branches).toHaveLength(1);
    expect(rows.branches[0]).toMatchObject({
      stream_type: stream.streamType,
      stream_id: stream.streamId,
      branch_id: branchId,
      parent_branch_id: null,
      ancestor_depth: 0,
      base_revision: 0,
      base_event_id: null,
      base_digest: EVENT_HISTORY_GENESIS_DIGEST,
      status: 'effective',
    });
    expect(rows.effectiveHeads).toEqual([
      {
        stream_type: stream.streamType,
        stream_id: stream.streamId,
        branch_id: branchId,
        effective_generation: generation,
        installed_at: NOW,
      },
    ]);
  }

  it('(a) a campaign stream first append installs one effective genesis row and an effective head', async () => {
    expect(census(CAMPAIGN)).toEqual({ branches: [], effectiveHeads: [] });
    const first = await committed(batch(CAMPAIGN, 0));

    expectGenesisShape(CAMPAIGN, 'root', 1);
    const branches = new SQLiteEventHistoryBranchStore(db);
    expect(branches.readEffectiveHead(CAMPAIGN)).toMatchObject({
      branchId: 'root',
      effectiveGeneration: 1,
    });
    expect(readEffectiveStreamHead(db, branches, CAMPAIGN)).toEqual({
      branchId: 'root',
      revision: 1,
      digest: first.events[0].eventDigest,
    });
  });

  it('(b) a second append leaves exactly the one genesis row, byte for byte', async () => {
    await committed(batch(CAMPAIGN, 0));
    const afterFirst = census(CAMPAIGN);
    expect(afterFirst.branches).toHaveLength(1);

    const second = await committed(batch(CAMPAIGN, 1));
    expect(census(CAMPAIGN)).toEqual(afterFirst);
    expect(
      readEffectiveStreamHead(
        db,
        new SQLiteEventHistoryBranchStore(db),
        CAMPAIGN,
      ),
    ).toEqual({
      branchId: 'root',
      revision: 2,
      digest: second.events[0].eventDigest,
    });
  });

  it("(c) a match stream first append on the mirror's 'main' branch behaves the same", async () => {
    await committed(batch(MATCH, 0, 'main'));
    expectGenesisShape(MATCH, 'main', 1);
    await committed(batch(MATCH, 1, 'main'));
    expectGenesisShape(MATCH, 'main', 1);
  });

  it("(c2) a match stream's genesis generation is read from its stored baseline, as the backfill reads it", async () => {
    db.prepare(
      `INSERT INTO match_authority_baseline
         (stream_id, stream_type, branch_id, revision, digest,
          effective_generation, source, first_retained_revision, imported_at)
       VALUES (?, 'match', 'main', 0, ?, 3, 'retained-log', 0, ?)`,
    ).run(MATCH.streamId, EVENT_HISTORY_GENESIS_DIGEST, NOW);
    await committed(batch(MATCH, 0, 'main'));
    expectGenesisShape(MATCH, 'main', 3);
  });

  it('(d) the global backfill run after the appends adds nothing', async () => {
    await committed(batch(CAMPAIGN, 0));
    await committed(batch(MATCH, 0, 'main'));
    // Both rows exist before any backfill runs: the appends installed them.
    expectGenesisShape(CAMPAIGN, 'root', 1);
    expectGenesisShape(MATCH, 'main', 1);
    const before = { campaign: census(CAMPAIGN), match: census(MATCH) };

    expect(
      new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches(),
    ).toBe(0);
    expect({ campaign: census(CAMPAIGN), match: census(MATCH) }).toEqual(
      before,
    );
  });

  it('(e) an append that throws after its writes leaves no genesis row', async () => {
    await expect(
      writer.appendWithExtension(batch(CAMPAIGN, 0), (_db, append) => {
        const appended = append();
        expect(appended.kind).toBe('committed');
        expect(census(CAMPAIGN).branches).toHaveLength(1);
        throw new Error('extension failed after the append');
      }),
    ).rejects.toThrow('extension failed after the append');
    expect(totals()).toEqual({
      branches: 0,
      effectiveHeads: 0,
      journalHeads: 0,
      events: 0,
    });
  });

  it('(e2) a refused first append (revision conflict) leaves no genesis row', async () => {
    expect(await writer.append(batch(CAMPAIGN, 1))).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 1,
      actualRevision: 0,
    });
    expect(totals()).toEqual({
      branches: 0,
      effectiveHeads: 0,
      journalHeads: 0,
      events: 0,
    });
  });

  it('(f) two writers racing a first append end with one genesis row; the loser is refused as today', async () => {
    extra = new SQLiteService({ path: path.join(dir, 'journal.db') });
    extra.initialize();
    const other = new SQLiteEventJournalWriter<Payload>(
      extra.getDatabase(),
      () => NOW,
    );
    // Both writers built their batch against revision 0. The IMMEDIATE
    // transaction serializes them: whichever runs second sees the head.
    const mine = batch(CAMPAIGN, 0);
    const theirs = batch(CAMPAIGN, 0);
    await committed(mine);
    expect(await other.append(theirs)).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 0,
      actualRevision: 1,
    });
    expectGenesisShape(CAMPAIGN, 'root', 1);
    await committed(batch(CAMPAIGN, 1), other);
    expectGenesisShape(CAMPAIGN, 'root', 1);
  });

  it('(g) a stream that already has its genesis row is left untouched by its first append', async () => {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES (?, ?, 'root', NULL, 0, 0, NULL, ?, 'effective', 'fixture',
               'pre-installed genesis', '2026-01-01T00:00:00.000Z')`,
    ).run(CAMPAIGN.streamType, CAMPAIGN.streamId, EVENT_HISTORY_GENESIS_DIGEST);
    db.prepare(
      `INSERT INTO event_history_effective_heads
         (stream_type, stream_id, branch_id, effective_generation, installed_at)
       VALUES (?, ?, 'root', 2, '2026-01-01T00:00:00.000Z')`,
    ).run(CAMPAIGN.streamType, CAMPAIGN.streamId);
    const before = census(CAMPAIGN);

    await committed(batch(CAMPAIGN, 0));
    expect(census(CAMPAIGN)).toEqual(before);
  });

  it("(h) the install is per stream: another stream's missing genesis is not backfilled by it", async () => {
    // A legacy stream that holds a journal head but no branch row.
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('campaign', 'legacy', 'root', 4, ?)`,
    ).run('c'.repeat(64));
    await committed(batch(CAMPAIGN, 0));
    expectGenesisShape(CAMPAIGN, 'root', 1);
    expect(census({ streamType: 'campaign', streamId: 'legacy' })).toEqual({
      branches: [],
      effectiveHeads: [],
    });
  });
});
