/**
 * S7-b of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, third
 * sub-prefix): recovery has ONE source of "started", and it is the
 * mirrored journal head.
 *
 * WHAT S3-b LEFT OPEN. Sub-prefix 2 repointed the recovery decision at
 * the derived head but kept the `mp_journal_authority_started` marker
 * as a fallback wherever no head could be read, because at mode `off`
 * nothing mirrors and the marker was the only record such a stream had.
 * It also conceded that an unreadable head answers `legacy-compatible`,
 * which is a ONE-WAY boundary crossed in the wrong direction: a stream
 * that really did start on the journal is served by the legacy reader.
 * Both concessions are named in
 * `matchRecoveryStartedFromJournalHead.sqlite.test.ts`'s header as
 * things task 1.7 must flip.
 *
 * WHAT THIS SLICE DOES NOT RESTORE, AND WHY. S3-b's row 1 promised the
 * cutover would turn "unreadable head + marker" into a refusal. It
 * cannot, here: nothing capability-db-independent records that a stream
 * was ever MIRRORED. The nearest candidate,
 * `mp_journal_authority_baseline`, records ADMISSION
 * (`resolveJournalAuthorityForNewMatch`), and admission and mirroring
 * diverge in exactly the process state that makes the head unreadable —
 * `DurableMatchStore.mirrorCommittedBatch` returns early when
 * `isCapabilityDbAvailable()` is false, so a match can be admitted at
 * mode `enabled` and never journal a single row. Refusing on the
 * admission record would therefore block a configuration that is
 * legitimately legacy-readable, which task 1.7's own text protects
 * ("legacy completed matches keep their reads"). The durable per-match
 * record that WOULD carry this is the migration state S7-d owes; rows 3
 * and 5 below pin today's answer so that slice turns them red on
 * purpose, exactly as S3-b's row 1 did for this one.
 *
 * S7-a IS A PREREQUISITE. The seeded-on-create fixtures below are the
 * shape `seedJournalFromInitialEvents` (S7-a2) introduced, and the
 * opening events are mirrored verbatim because S7-a1 taught the mirror
 * to strip their explicitly-undefined properties.
 *
 * Real boundary only: two temp-file SQLite databases opened the way
 * production opens them (match db + campaign capability db), because
 * the capability-db-closed state these rows turn on does not exist in
 * a fake.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S3)
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type {
  IMatchJournalAuthorityBaseline,
  IMatchJournalAuthorityStarted,
} from '../matchJournalAuthority';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  MATCH_BASELINE_BRANCH_ID,
  MATCH_BASELINE_FIRST_GENERATION,
  digestRetainedMatchHistory,
} from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '../matchJournalAuthority';
import { MATCH_ROLLBACK_PRESERVED_FACTS } from '../matchRollbackReaderSelection';
import {
  selectRecoveredMatchRollbackReader,
  ServerMatchHost,
} from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-marker-retirement';
const AT = '2026-09-15T00:00:00.000Z';

function meta(): IMatchMeta {
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
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function twoSidedRoster(): IGameUnit[] {
  return [
    {
      id: 'retire-player',
      name: 'retire-player',
      side: GameSide.Player,
      unitRef: 'retire-player',
      pilotRef: 'retire-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'retire-opponent',
      name: 'retire-opponent',
      side: GameSide.Opponent,
      unitRef: 'retire-opponent',
      pilotRef: 'retire-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

/** The one-time fact the OLD (still-off) task-2.3/2.4 path writes. */
function startedMarker(
  lastRevision: number,
  branchId: string = MATCH_BASELINE_BRANCH_ID,
): IMatchJournalAuthorityStarted {
  return {
    matchId: MATCH_ID,
    commandId: 'cmd-1',
    firstRevision: lastRevision - 1,
    lastRevision,
    head: {
      streamType: 'match',
      streamId: MATCH_ID,
      branchId,
      revision: lastRevision,
      digest: 'd'.repeat(64),
      effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
    },
    committedAt: AT,
  };
}

/**
 * The admission record `resolveJournalAuthorityForNewMatch` inserts,
 * built over the same events the host's constructor would have seen.
 * `headFromLegacyEvents` is module-private to ServerMatchHost, so its
 * shape is reproduced here rather than exported for a test.
 */
function admissionBaseline(
  events: readonly IGameEvent[],
): IMatchJournalAuthorityBaseline {
  return {
    streamType: 'match',
    streamId: MATCH_ID,
    branchId: MATCH_BASELINE_BRANCH_ID,
    revision: events.length > 0 ? events[events.length - 1].sequence : -1,
    digest: digestRetainedMatchHistory(events),
    effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
  };
}

let dir = '';
let matchDbPath = '';
let store: DurableMatchStore;

function openCampaign(): void {
  getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
}

function openStore(): DurableMatchStore {
  return new DurableMatchStore({
    path: matchDbPath,
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
}

/** Reopen the match file with NO capability database behind it. */
function reopenWithoutCapabilityDb(): void {
  store.close();
  resetSQLiteService();
  store = new DurableMatchStore({ path: matchDbPath });
  expect(store.isCapabilityDbAvailable()).toBe(false);
}

function sessionFrom(events: readonly IGameEvent[]): InteractiveSession {
  return InteractiveSession.fromHydratedSession(
    hydrateGameSessionFromEvents(MATCH_ID, [...events]),
    { random: new SeededRandom(42) },
  );
}

async function recoverySession(): Promise<InteractiveSession> {
  return sessionFrom(await store.getEvents(MATCH_ID));
}

/**
 * A real opening log (GameCreated + first phase), minted on a throwaway
 * in-memory store so the events are the host's own rather than a
 * hand-rolled shape hydration would reject. Returned verbatim: S7-a1
 * made the mirror strip the explicitly-undefined properties these
 * carry, so no JSON round-trip workaround is needed any more.
 */
async function openingEvents(): Promise<IGameEvent[]> {
  const scratch = new InMemoryMatchStore({ quiet: true });
  await scratch.createMatch(meta());
  ServerMatchHost.create(MATCH_ID, scratch, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
    diceSeed: 42,
  });
  const deadline = Date.now() + 2000;
  while ((await scratch.getEvents(MATCH_ID)).length < 2) {
    if (Date.now() > deadline) {
      throw new Error('initial events did not persist');
    }
    await Promise.resolve();
  }
  return [...(await scratch.getEvents(MATCH_ID))];
}

/**
 * The create path exactly as production runs it: persist the opening
 * events one at a time, then seed the journal stream from them
 * (S7-a2's `seedJournalFromInitialEvents`).
 */
async function createAndSeed(): Promise<IGameEvent[]> {
  const events = await openingEvents();
  for (const event of events) await store.appendEvent(MATCH_ID, event);
  await store.seedJournalFromInitialEvents!(MATCH_ID, events);
  return events;
}

/** Commit the stream's first batch through the real store path. */
async function commitFirstBatch(
  events: readonly IGameEvent[],
  started?: IMatchJournalAuthorityStarted,
): Promise<void> {
  const projected = sessionFrom(events);
  const result = await store.appendCommandBatch!(MATCH_ID, {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: events[0].sequence,
    events: [...events],
    expectedPostStateDigest: digestCommandPostState(projected.getSession()),
    ...(started ? { journalAuthorityStarted: started } : {}),
  });
  expect(result.kind).toBe('committed');
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'marker-retirement-'));
  matchDbPath = path.join(dir, 'multiplayer-matches.db');
  resetSQLiteService();
  openCampaign();
  _resetProcessShadowStatsForTests();
  _setCombatJournalAuthorityModeForTests('off');
  store = openStore();
  await store.createMatch(meta());
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store.close();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('recovery has one source of started after the marker retires', () => {
  it('ignores the marker when the head is unreadable, rather than starting from it', async () => {
    // The literal flip of S3-b's row 1. A marker naming a branch the
    // mirror never installed used to become the served head the moment
    // the capability database was closed; after the retirement it is
    // not a source of started at all.
    _setCombatJournalAuthorityModeForTests('enabled');
    const events = await openingEvents();
    await commitFirstBatch(events, startedMarker(events.length - 1, 'stale'));
    const session = await recoverySession();
    reopenWithoutCapabilityDb();
    expect(
      (await store.getJournalAuthorityStarted(MATCH_ID))?.head.branchId,
    ).toBe('stale');

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('still selects the legacy reader for an admitted match whose head is unreadable', async () => {
    // The bound on this slice, and the row S7-d turns red. Admission is
    // not mirroring: this match was admitted at mode enabled and then
    // recovered with no campaign database, so it has an admission
    // record and no readable journal state of any kind. Refusing here
    // would block a legitimately legacy-readable configuration, so the
    // legacy answer stands until a durable per-match migration state
    // can tell "admitted and mirrored" from "admitted and never
    // journalled".
    _setCombatJournalAuthorityModeForTests('enabled');
    const events = await createAndSeed();
    store.insertJournalAuthorityBaseline(admissionBaseline(events));
    const session = await recoverySession();
    reopenWithoutCapabilityDb();
    expect(store.getJournalAuthorityBaseline(MATCH_ID)).not.toBeNull();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('ignores the marker when no head exists, because the marker is not a source of started', async () => {
    // The pair to S3-b's row 6, with the opposite winner. Nothing
    // mirrored (mode off), the marker is the only record claiming this
    // stream started, and after the retirement it no longer counts.
    const events = await openingEvents();
    await commitFirstBatch(events, startedMarker(events.length - 1));
    const session = await recoverySession();
    expect(await store.getJournalAuthorityStarted(MATCH_ID)).not.toBeNull();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('still selects the journal reader from the mirrored head it can read', async () => {
    // The guard that keeps the retirement from being "refuse, or fall
    // back to legacy, everywhere": a readable head is still the answer,
    // and it is reached with no marker written anywhere.
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch(await openingEvents());
    const session = await recoverySession();
    expect(await store.getJournalAuthorityStarted(MATCH_ID)).toBeNull();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual(
      expect.objectContaining({
        kind: 'journal-compatible',
        head: expect.objectContaining({
          streamType: 'match',
          streamId: MATCH_ID,
          branchId: MATCH_BASELINE_BRANCH_ID,
          effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
        }),
      }),
    );
  });

  it('refuses a seeded match that has committed no command, rather than serving it', async () => {
    // Pinned here because S7-a2 made the shape reachable and this suite
    // is where the started question is decided. A create-path seed
    // installs a head but no command receipt, so recovery has a started
    // fact and no recorded head to check a refold against. That is
    // `missing-journal-head` — fail-closed, and NOT legacy-compatible.
    // Unchanged by this slice; it is the pre-existing answer, recorded
    // so a later slice cannot quietly turn it into a legacy fallback.
    _setCombatJournalAuthorityModeForTests('enabled');
    const events = await createAndSeed();
    store.insertJournalAuthorityBaseline(admissionBaseline(events));
    const session = await recoverySession();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({
      kind: 'blocked',
      reason: 'missing-journal-head',
      preserved: MATCH_ROLLBACK_PRESERVED_FACTS,
    });
  });
});
