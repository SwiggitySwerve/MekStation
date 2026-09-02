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
 * - `mp_match_events` sequences start at **0**
 *   (`SELECT COALESCE(MAX(sequence) + 1, 0)`).
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
import { matchStoreBranchSegmentReader } from '../matchStoreBranchSegmentReader';

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

describe('matchStoreBranchSegmentReader', () => {
  it('maps match sequence 0 onto branch revision 1', async () => {
    const read = await matchStoreBranchSegmentReader(source()).read(
      STREAM,
      segment(0, 4),
    );

    // The whole contract in one assertion. Sequence 0 is the FIRST event;
    // revision 0 is "nothing yet". Off by one, deliberately, and pinned.
    expect(read.map((event) => event.streamRevision)).toEqual([1, 2, 3, 4]);
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
