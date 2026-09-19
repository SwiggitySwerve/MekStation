/**
 * Reading a match's events as a branch segment
 * (add-authoritative-history-branches; umbrella 13.5).
 *
 * FINDING #48: combat is journal-authority-CAPABLE - baseline, branches,
 * leases and the 3a command admission all key on `('match', matchId)` -
 * while its EVENTS live in `mp_match_events`. Nothing writes match events
 * to `event_journal_events`, so the journal side is nominal until a
 * combat cutover. This reader is what lets the branch machinery answer
 * about a real match in the meantime.
 *
 * THE PINNING CONTRACT, and it is not an identity:
 *
 * - `mp_match_events` sequences start at **0** (the store reads
 *   `SELECT MAX(sequence)` over the LIVE rows and derives the next
 *   sequence through `nextMatchSequenceAfter`).
 * - Branch revision **0 means "nothing has happened yet"** - it is the
 *   root's `baseRevision` and what a stream with no head row reads as.
 * - Therefore **`revision = sequence + 1`**, the same off-by-one the
 *   campaign side already documents ("`ICampaignEvent.sequence` N lives
 *   at journal `streamRevision` N + 1").
 * - Segments are **`(fromRevision, throughRevision]`** - low exclusive,
 *   high inclusive.
 *
 * A reader that used `revision = sequence` would silently drop every
 * match's first event and shift every truncation target by one against
 * the lease guard and the checkpoint read. That is why it gets a row of
 * its own rather than a comment.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IBranchPathSegment } from '@/lib/events/journal/EventHistoryBranchResolver';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { materializeBranchPath } from '@/lib/events/journal/EventHistoryBranchResolver';
import { resolveBranchPath } from '@/lib/events/journal/EventHistoryBranchResolver';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { MATCH_BASELINE_BRANCH_ID } from '@/lib/multiplayer/server/matchAuthorityBaseline';
import { combatViewerProbe } from '@/lib/multiplayer/server/projection/combatViewerProbe';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import { previewGmCombatRewind } from '../GmCombatRewindPreview';
import {
  journalHeadRevisionForNextMatchSequence,
  matchStoreBranchSegmentReader,
  nextMatchSequenceAfter,
  revisionForMatchSequence,
} from '../matchStoreBranchSegmentReader';

const MATCH_ID = 'match-1';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;

function gameEvent(sequence: number): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: MATCH_ID,
    sequence,
    timestamp: '2026-09-02T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: { index: sequence },
  } as unknown as IGameEvent;
}

/** Four real events at sequences 0..3 - the shape a live match has. */
const EVENTS = [0, 1, 2, 3].map(gameEvent);

function source(events: readonly IGameEvent[] = EVENTS) {
  return {
    getEvents: async (
      matchId: string,
      fromSeq = 0,
    ): Promise<readonly IGameEvent[]> => {
      if (matchId !== MATCH_ID) return [];
      return events.filter((event) => event.sequence >= fromSeq);
    },
  };
}

function segment(
  fromRevision: number,
  throughRevision: number,
  branchId = 'root',
): IBranchPathSegment {
  return {
    kind: 'suffix',
    branchId,
    fromRevision,
    throughRevision,
    baseEventId: null,
    baseDigest: 'g'.repeat(64),
  };
}

/**
 * The offset used to be three different statements in three files (an
 * exported function here, a comment in the mirror, bare SQL in the
 * store). S5 (task 1.5) gave the other two a name; this row is where
 * the three names are pinned together, so moving one of them without
 * the others fails here rather than in production.
 */
describe('the named sequence-versus-revision derivations', () => {
  it('places sequences 0, 1 and N at revision N + 1', () => {
    expect([0, 1, 7].map(revisionForMatchSequence)).toEqual([1, 2, 8]);
  });

  it('starts the next sequence at 0 and otherwise reuses the same offset', () => {
    expect(nextMatchSequenceAfter(null)).toBe(0);
    expect([0, 1, 7].map((last) => nextMatchSequenceAfter(last))).toEqual(
      [0, 1, 7].map(revisionForMatchSequence),
    );
  });

  it('equates the next sequence with the journal head revision', () => {
    // Identity by arithmetic, invariant by the live-path guard: the
    // mirror refuses a rewound stream rather than trusting this.
    for (const next of [0, 1, 8]) {
      expect(journalHeadRevisionForNextMatchSequence(next)).toBe(next);
    }
  });
});

describe('matchStoreBranchSegmentReader', () => {
  it('maps match sequence 0 onto branch revision 1', async () => {
    const read = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );

    // The whole contract in one assertion. Sequence 0 is the FIRST event;
    // revision 0 is "nothing yet". Off by one, deliberately, and pinned.
    expect(read.map((event) => event.streamRevision)).toEqual([1, 2, 3, 4]);
    // ... and through the named derivation, so a reader that stopped
    // calling it cannot keep this row green on a literal.
    expect(read.map((event) => event.streamRevision)).toEqual(
      [0, 1, 2, 3].map(revisionForMatchSequence),
    );
    expect(read.map((event) => event.eventId)).toEqual([
      'event-0',
      'event-1',
      'event-2',
      'event-3',
    ]);
  });

  it('reads the window low-exclusive and high-inclusive', async () => {
    const read = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(1, 3),
    );

    // `(1, 3]` is revisions 2 and 3 - sequences 1 and 2. A reader that
    // treated `fromRevision` as inclusive would return one event too many
    // and `verifySegment`'s count check would refuse the whole path.
    expect(read.map((event) => event.streamRevision)).toEqual([2, 3]);
    expect(read.map((event) => event.eventId)).toEqual(['event-1', 'event-2']);
  });

  it('chains digests so a truncation verifies as real history', async () => {
    const full = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );
    const truncated = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 2),
    );

    // The first event chains from nothing, every later one from its
    // predecessor - the shape `verifySegment` requires.
    expect(full[0].previousStreamEventDigest).toBe(null);
    for (let index = 1; index < full.length; index += 1) {
      expect(full[index].previousStreamEventDigest).toBe(
        full[index - 1].eventDigest,
      );
    }
    // And a shorter window yields the SAME digests, not a rechained set:
    // a truncation must be a prefix of the history, not a rewrite of it.
    expect(truncated.map((event) => event.eventDigest)).toEqual(
      full.slice(0, 2).map((event) => event.eventDigest),
    );
  });

  it('refuses a branch a match store cannot hold', async () => {
    // The match store keeps exactly one line of history. Answering a
    // candidate's name with root events would be the same lie the
    // journal reader refuses to tell.
    await expect(
      matchStoreBranchSegmentReader(source()).read(
        STREAM,
        segment(0, 4, 'candidate-1'),
      ),
    ).rejects.toBeInstanceOf(EventHistoryBranchError);
  });

  it('materialises a real match path through the shipped resolver', async () => {
    // End to end through `materializeBranchPath`, which runs
    // `verifySegment` - count, ordering, identity, version and digest
    // chain. If the revision mapping were wrong this refuses.
    const branches = {
      requireBranch: () => ({
        streamType: 'match',
        streamId: MATCH_ID,
        branchId: 'root',
        parentBranchId: null,
        ancestorDepth: 0,
        baseRevision: 0,
        baseEventId: null,
        baseDigest: 'g'.repeat(64),
        status: 'effective' as const,
        createdBy: 'host-1',
        reason: 'genesis',
        createdAt: '2026-09-02T00:00:00.000Z',
      }),
    };
    const path = resolveBranchPath(
      branches as unknown as Parameters<typeof resolveBranchPath>[0],
      STREAM,
      'root',
      2,
    );

    const events = await materializeBranchPath(
      matchStoreBranchSegmentReader(source()),
      path,
    );

    expect(events.map((event) => event.streamRevision)).toEqual([1, 2]);
  });
});

/**
 * One line of history, two names.
 *
 * `LIVE_PATH_BRANCH_IDS` (matchAuthorityBaseline) already declares that an
 * un-rewound match answers on BOTH `root` - the journal's genesis id - and
 * `MATCH_BASELINE_BRANCH_ID`, the id `MatchStreamJournalMirror` writes onto
 * when no effective head exists yet. The reader used to serve only the
 * first of those two names, so a head that legitimately sat on the baseline
 * id was refused as an unknown branch rather than read. These rows pin the
 * repair, and they pin it as an EQUALITY against the root read: serving the
 * second name must not become a second line of history.
 *
 * The branch id each returned event carries is NOT a free choice.
 * `verifySegment` refuses an event whose `branchId` is not the segment's
 * own (EventHistoryBranchResolver: "Event ... belongs to branch 'x', not
 * 'y'"), so a reader that served the baseline segment while stamping root
 * would only trade `unknown-branch` for `branch-integrity`. The reader
 * therefore echoes the id the segment named.
 */
describe('matchStoreBranchSegmentReader on the baseline branch id', () => {
  /** A genesis branch record, under whichever of its two names. */
  function genesisBranches(branchId: string) {
    return {
      requireBranch: () => ({
        streamType: 'match',
        streamId: MATCH_ID,
        branchId,
        parentBranchId: null,
        ancestorDepth: 0,
        baseRevision: 0,
        baseEventId: null,
        baseDigest: 'g'.repeat(64),
        status: 'effective' as const,
        createdBy: 'host-1',
        reason: 'genesis',
        createdAt: '2026-09-02T00:00:00.000Z',
      }),
    };
  }

  it('answers the baseline id with the same events, revisions and digests as root', async () => {
    const onRoot = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );
    const onBaseline = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4, MATCH_BASELINE_BRANCH_ID),
    );

    // Same events, same order, same revisions, same chain. Anything less
    // and the two names would describe two histories, which is the lie
    // the single-name refusal existed to prevent.
    expect(onBaseline.map((event) => event.eventId)).toEqual(
      onRoot.map((event) => event.eventId),
    );
    expect(onBaseline.map((event) => event.streamRevision)).toEqual(
      onRoot.map((event) => event.streamRevision),
    );
    expect(onBaseline.map((event) => event.eventDigest)).toEqual(
      onRoot.map((event) => event.eventDigest),
    );
    expect(onBaseline.map((event) => event.previousStreamEventDigest)).toEqual(
      onRoot.map((event) => event.previousStreamEventDigest),
    );
    // ... and non-empty, so the equality above cannot be satisfied by two
    // empty reads.
    expect(onBaseline).toHaveLength(4);
  });

  it('stamps every returned event with the branch id the segment named', async () => {
    const onBaseline = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4, MATCH_BASELINE_BRANCH_ID),
    );
    const onRoot = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );

    // The contract `verifySegment` enforces, pinned directly rather than
    // only through the resolver: the stamp follows the question, not the
    // reader's own idea of which name is canonical.
    expect(new Set(onBaseline.map((event) => event.branchId))).toEqual(
      new Set([MATCH_BASELINE_BRANCH_ID]),
    );
    expect(new Set(onRoot.map((event) => event.branchId))).toEqual(
      new Set(['root']),
    );
  });

  it('materialises a baseline-headed match path through the shipped resolver', async () => {
    // The same end-to-end row the root case already has, asked under the
    // other live-path name. `materializeBranchPath` runs `verifySegment`,
    // so this refuses on a wrong count, a wrong revision, a broken chain
    // OR a mis-stamped branch id.
    const path = resolveBranchPath(
      genesisBranches(MATCH_BASELINE_BRANCH_ID) as unknown as Parameters<
        typeof resolveBranchPath
      >[0],
      STREAM,
      MATCH_BASELINE_BRANCH_ID,
      2,
    );

    const events = await materializeBranchPath(
      matchStoreBranchSegmentReader(source()),
      path,
    );

    expect(events.map((event) => event.streamRevision)).toEqual([1, 2]);
    expect(events.map((event) => event.branchId)).toEqual([
      MATCH_BASELINE_BRANCH_ID,
      MATCH_BASELINE_BRANCH_ID,
    ]);
  });

  it('slices a baseline window out of the one chain rather than rechaining it', async () => {
    const full = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );
    const prefix = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 2, MATCH_BASELINE_BRANCH_ID),
    );
    const middle = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(1, 3, MATCH_BASELINE_BRANCH_ID),
    );

    // A truncated baseline read is a PREFIX of the full root read, digest
    // for digest - the same law the root rows pin, under the other name.
    expect(prefix.map((event) => event.eventDigest)).toEqual(
      full.slice(0, 2).map((event) => event.eventDigest),
    );
    // And a window that does not start at the stream start still chains
    // from what precedes it. A reader that rechained from the window
    // start would answer `null` here and digest every event differently
    // depending on how much of the history was asked for.
    expect(middle.map((event) => event.eventDigest)).toEqual(
      full.slice(1, 3).map((event) => event.eventDigest),
    );
    expect(middle[0].previousStreamEventDigest).toBe(full[0].eventDigest);
    expect(middle[0].previousStreamEventDigest).not.toBe(null);
  });

  it('still refuses a branch id that is not on the live path', async () => {
    // The guard the widening must not dissolve. Serving two names is not
    // serving every name: a candidate branch has no events in a match
    // store, and saying otherwise would answer a rewind question with the
    // history the rewind was meant to supersede.
    await expect(
      matchStoreBranchSegmentReader(source()).read(
        STREAM,
        segment(0, 4, 'candidate-1'),
      ),
    ).rejects.toMatchObject({
      name: 'EventHistoryBranchError',
      code: 'unknown-branch',
    });
  });
});

/**
 * The composition, over a real match: reader + probe + preview.
 *
 * This is the row that says the GM's answer is honest. Rows above prove
 * the reader maps revisions and the probe separates classes; only this
 * one proves the three compose into a NON-EMPTY, correct answer - which
 * is exactly what was missing when the route was deferred.
 */
describe('a rewind preview over a real match', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'combat-probe-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'probe.db') });
    service.initialize();
    db = service.getDatabase();
    // FINDING #48's practical consequence: nothing writes match events to
    // the journal, so a real match has no stream-head row and therefore
    // no genesis branch. This seed stands in for what a combat cutover
    // will write - and is the reason the route needs it (see the module
    // header). The head revision is the LAST event's revision, i.e.
    // sequence 3 + 1.
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', 4, ?)`,
    ).run(MATCH_ID, 'd'.repeat(64));
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('names the viewers a truncation actually moves', async () => {
    const audience = {
      gmPlayerId: 'pid_gm',
      playerIds: ['pid_one'],
      config: { fogOfWar: false },
      sideAssignments: [{ playerId: 'pid_one', side: 'player' }],
    };
    const result = await previewGmCombatRewind(
      {
        db,
        branches: new SQLiteEventHistoryBranchStore(db),
        reader: matchStoreBranchSegmentReader(source()),
        priorHeadRevision: 4,
        viewerIds: ['gm', 'player:pid_one'],
        probe: combatViewerProbe({
          state: {} as unknown as IGameState,
          audience,
        }),
        readOutcomeId: async () => null,
      },
      {
        actorId: 'gm-1',
        role: 'gm',
        gameId: MATCH_ID,
        ownedStateRefs: [`game:${MATCH_ID}`],
      },
      {
        matchId: MATCH_ID,
        targetRevision: 2,
        expectedBranchId: 'root',
        expectedRevision: 4,
        expectedDigest: 'd'.repeat(64),
        expectedGeneration: 1,
      },
    );

    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    // NON-EMPTY is the whole point. Dropping two of four events changes
    // what both audiences see, and a preview that answered `[]` here -
    // the answer an empty journal stream would have produced - is the
    // false "nothing changes" the route was deferred to avoid.
    expect([...result.changedViewerIds].sort()).toEqual([
      'gm',
      'player:pid_one',
    ]);
  });
});
