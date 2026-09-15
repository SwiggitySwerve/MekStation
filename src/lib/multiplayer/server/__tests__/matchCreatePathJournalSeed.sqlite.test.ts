/**
 * S7-a2 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.7
 * preparation): a match's journal stream is seeded on the CREATE path,
 * so a head exists before any command batch commits.
 *
 * THE GAP THIS CLOSES. `ServerMatchHost.create` persists the engine's
 * opening events (`GameCreated` + `GameStarted`) through
 * `store.appendEvent`, which is not the batch boundary the mirror hooks
 * — so the journal stayed empty until the first COMMAND batch, and that
 * batch then declared a revision derived from a match log that had
 * already run two events ahead of the head. S6's own receipt names the
 * consequence as an ordering constraint (`riskFlaggedForTheOwner`
 * S6-R1, `evidence/r4-s6-journal-head-revision-local-20260915.json`):
 * at mode 'enabled' the consult answers the head UNCONDITIONALLY, so
 * without seeding the first enabled process would build every match's
 * journal history from wherever the mirror happened to be, with no
 * record that a prefix is missing. Seeding must precede any flip.
 *
 * WHAT IS NOT DONE HERE. Nothing retro-seeds a match that already
 * exists. A stream created before this change has no journal row of any
 * kind, and S3-a's derivation is what reports that honestly rather than
 * inventing a prefix — `matchJournalAuthorityStartedDerived.ts` says so
 * in its own words ("BEFORE THE FIRST BATCH THE ANSWER IS FALSE,
 * INCLUDING FOR A LIVE MATCH"), and the last row below pins it.
 *
 * No cutover: `COMBAT_JOURNAL_AUTHORITY_MODE` stays 'off' and every
 * mode here is a test override.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1, S5, S6)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import { type IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';
import type { CombatJournalAuthorityMode } from '../matchJournalAuthority';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { DurableMatchStore } from '../DurableMatchStore';
import { journalHeadRevisionForNextMatchSequence } from '../history/matchStoreBranchSegmentReader';
import { MATCH_BASELINE_BRANCH_ID } from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { deriveMatchJournalAuthorityStartedHead } from '../matchJournalAuthorityStartedDerived';
import { buildMatchHostBootstrapFromMeta } from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH_ID = 'match-create-path-seed';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '3025-09-15T00:00:00.000Z';
const MAP_RADIUS = 4;
/** `GameCreated` + `GameStarted`: the engine's whole opening log. */
const OPENING_EVENT_COUNT = 2;

/** The launch unit, persisted the way the R2.combat residual fixture
 * does — catalog refs are not resolvable inside a jest process. */
function persistCustomUnit(): string {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'AS7-CREATE-SEED',
    data: { ...atlas, id: 'ignored-inner-id', variant: 'Create Seed' },
    notes: 'create-path seed fixture',
  });
  if (!created.success || !created.data) {
    throw new Error(
      `custom unit create failed: ${created.error?.message ?? 'unknown'}`,
    );
  }
  return created.data.id;
}

function matchMeta(unitRef: string): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: MAP_RADIUS, turnLimit: 5 },
    unitBootstrap: [
      {
        unitId: 'player-1-seed',
        unitRef,
        side: 'player',
        pilotRef: 'pilot-player',
        gunnery: 3,
        piloting: 4,
        startHex: { q: -2, r: 0 },
      },
      {
        unitId: 'opponent-1-seed',
        unitRef,
        side: 'opponent',
        pilotRef: 'pilot-opponent',
        gunnery: 4,
        piloting: 5,
        startHex: { q: 2, r: 0 },
      },
    ],
  };
}

let sqliteDir = '';
let campaignPath = '';
let unitRef = '';
let store: DurableMatchStore | undefined;

function primary(): Database.Database {
  return getSQLiteService().getDatabase();
}

/** Let the host's fire-and-forget `persistInitialEvents` finish. The
 * whole chain is synchronous better-sqlite3 work behind resolved
 * promises, so a bounded number of microtask turns drains it. */
async function drain(): Promise<void> {
  for (let turn = 0; turn < 50; turn += 1) await Promise.resolve();
}

/** The production create path: the real host factory on a real store. */
async function createHost(mode: CombatJournalAuthorityMode) {
  _setCombatJournalAuthorityModeForTests(mode);
  const bootstrap = await buildMatchHostBootstrapFromMeta(matchMeta(unitRef));
  const host = ServerMatchHost.create(MATCH_ID, store!, bootstrap);
  await drain();
  return host;
}

function head() {
  const db = primary();
  return readEffectiveStreamHead(
    db,
    new SQLiteEventHistoryBranchStore(db),
    STREAM,
  );
}

function journalEventIds(): readonly string[] {
  const db = new Database(campaignPath, { fileMustExist: true });
  try {
    return (
      db
        .prepare(
          `SELECT event_id AS eventId FROM event_journal_events
            WHERE stream_type = ? AND stream_id = ?
            ORDER BY commit_position`,
        )
        .all(STREAM.streamType, STREAM.streamId) as readonly {
        eventId: string;
      }[]
    ).map((row) => row.eventId);
  } finally {
    db.close();
  }
}

/** The head the match LOG implies, through S5's named translation. */
async function storeDerivedHeadRevision(): Promise<number> {
  const events = await store!.getEvents(MATCH_ID);
  return journalHeadRevisionForNextMatchSequence(events.length);
}

beforeEach(async () => {
  sqliteDir = await mkdtemp(path.join(tmpdir(), 'match-create-seed-'));
  campaignPath = path.join(sqliteDir, 'mekstation.db');
  resetSQLiteService();
  resetUnitRepository();
  getSQLiteService({ path: campaignPath }).initialize();
  _resetProcessShadowStatsForTests();
  unitRef = persistCustomUnit();
  store = new DurableMatchStore({
    path: path.join(sqliteDir, 'multiplayer-matches.db'),
    capabilityDb: primary,
  });
  await store.createMatch(matchMeta(unitRef));
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store?.close();
  store = undefined;
  resetUnitRepository();
  resetSQLiteService();
  await rm(sqliteDir, { recursive: true, force: true });
});

describe('the create path seeds the match journal stream', () => {
  it('leaves the journal head equal to the store-derived head', async () => {
    await createHost('shadow');

    expect(await storeDerivedHeadRevision()).toBe(OPENING_EVENT_COUNT);
    expect(head()).toMatchObject({
      branchId: MATCH_BASELINE_BRANCH_ID,
      revision: OPENING_EVENT_COUNT,
    });
    expect(journalEventIds()).toEqual([
      `create:${MATCH_ID}:0`,
      `create:${MATCH_ID}:1`,
    ]);
    // A seeded stream is not a mismatch; the counter S6 consults before
    // any promotion has to stay clean through creation.
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('lets the enabled consult accept the first commit with no missing prefix', async () => {
    await createHost('enabled');
    const [opening] = await store!.getEvents(MATCH_ID);

    // At 'enabled' the expected revision comes from the head, not from
    // the match log. Without the seed the head is 0 while the log is
    // already at 2, and the batch would land at revision 1 with the
    // opening prefix silently absent (S6-R1).
    const committed = await store!.appendCommandBatch!(MATCH_ID, {
      commandId: 'cmd-first',
      actorId: 'p1',
      expectedRevision: OPENING_EVENT_COUNT,
      events: [
        { ...opening, id: 'evt-first', sequence: OPENING_EVENT_COUNT },
      ] as readonly IGameEvent[],
      expectedPostStateDigest: 'first-digest',
    });

    expect(committed.kind).toBe('committed');
    expect(journalEventIds()).toEqual([
      `create:${MATCH_ID}:0`,
      `create:${MATCH_ID}:1`,
      'cmd-first:0',
    ]);
    expect(head().revision).toBe(OPENING_EVENT_COUNT + 1);
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('seeds nothing at all while the cutover mode is off', async () => {
    await createHost('off');

    expect((await store!.getEvents(MATCH_ID)).length).toBe(OPENING_EVENT_COUNT);
    expect(journalEventIds()).toEqual([]);
    expect(deriveMatchJournalAuthorityStartedHead(store!, MATCH_ID)).toEqual({
      kind: 'not-started',
    });
  });

  it('reports a match created before this change rather than seeding it', async () => {
    // The pre-change create path, reproduced exactly: the opening events
    // appended one at a time through `appendEvent`, never through the
    // batch boundary the mirror hooks. This is the shape every match
    // already in a deployed database has.
    _setCombatJournalAuthorityModeForTests('shadow');
    for (let sequence = 0; sequence < OPENING_EVENT_COUNT; sequence += 1) {
      await store!.appendEvent(MATCH_ID, {
        id: `legacy-${sequence}`,
        sequence,
        type: 'phase_changed',
        timestamp: AT,
        payload: {},
      } as unknown as IGameEvent);
    }

    expect(await storeDerivedHeadRevision()).toBe(OPENING_EVENT_COUNT);
    // Not seeded, and not silently seeded by any later read: S3-a's
    // derivation answers about the STREAM, and the stream has no row.
    expect(journalEventIds()).toEqual([]);
    expect(deriveMatchJournalAuthorityStartedHead(store!, MATCH_ID)).toEqual({
      kind: 'not-started',
    });
    // The disagreement stays VISIBLE - head 0 against a log at 2 -
    // rather than being papered over with an invented prefix.
    expect(head().revision).toBe(0);
  });
});
