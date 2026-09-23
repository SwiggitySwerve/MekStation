/**
 * U21: a GM rewind reads the history it anchors to
 * (FN-u2b-rewind-commit-verifies-through-the-match-store).
 *
 * Real boundary only. A migrated SQLite file opened through the shipped
 * `SQLiteService`, a `DurableMatchStore` whose commits the S1 mirror
 * copies into that file, and combat journal mode `enabled` through the
 * test-scoped override U15a pinned - never an environment key, never the
 * production constant. The match is seeded the way a live one is: the
 * opening events through the create path's journal seed, then three
 * command batches, every one of them landing on `main`.
 *
 * A candidate is cut at the JOURNAL's event for the target revision.
 * The rows below hold the three production readers of that history - the
 * commit's verification, the live rebuild and the boot fold - to the same
 * journal, and hold the reader itself to the prefix law: a window read
 * mid-stream is the same slice of a full read, chained to its real
 * predecessor.
 *
 * The reader is loaded inside its own rows (`loadReader`) so that, while
 * the module does not exist, only those rows fail and the commit rows
 * still show their own answer.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchJournalEnvelope } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import { type IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import { MATCH_BASELINE_BRANCH_ID } from '@/lib/multiplayer/server/matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '@/lib/multiplayer/server/matchJournalAuthority';
import { foldMatchSession } from '@/lib/multiplayer/server/MatchSessionProjector';
import { SeededDiceRoller } from '@/lib/multiplayer/server/RollCapture';
import { ServerMatchHost } from '@/lib/multiplayer/server/ServerMatchHost';
import { tryFoldActivatedRewindBranch } from '@/lib/multiplayer/server/ServerMatchHostRewindRebuild';
import {
  buildGmCombatRewindCommitDeps,
  readEffectiveRevision,
  REWIND_COMMIT_REASON,
} from '@/pages-modules/api/rewindCommitDeps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  commitGmCombatRewind,
  type GmCombatRewindCommitResult,
} from '../GmCombatRewindCommit';
import { matchStreamRef } from '../GmCombatRewindPreview';

const MATCH_ID = 'match-journal-reader';
const HOST = 'gm-1';
const AT = '2026-09-23T00:00:00.000Z';
const SEED = 42;
const STREAM = matchStreamRef(MATCH_ID);
/** GameCreated + GameStarted, seeded the way `ServerMatchHost.create` seeds them. */
const OPENING_EVENTS = 2;
/** Five phase changes, committed as three batches of 2, 2 and 1. */
const BATCH_SIZES = [2, 2, 1] as const;
const HEAD_REVISION = OPENING_EVENTS + 5;
/** The revision the rewind keeps: the opening plus the first batch. */
const TARGET_REVISION = 4;

/** Load the reader under test. A missing module fails only the rows that ask. */
async function loadReader(): Promise<
  typeof import('../matchJournalBranchSegmentReader')
> {
  return import('../matchJournalBranchSegmentReader');
}

/**
 * `'committed'` for a commit, the WHOLE result otherwise, so a refused
 * commit fails with its reason and detail printed rather than the one
 * key a subset matcher shows.
 */
function outcomeOf(result: GmCombatRewindCommitResult): unknown {
  return result.kind === 'committed' ? 'committed' : result;
}

/** The match's durable meta: the host is the GM, fog is off. */
function meta(): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: HOST,
    playerIds: [HOST, 'player-2'],
    sideAssignments: [
      { playerId: HOST, side: 'player' },
      { playerId: 'player-2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

/** A real engine play log: created, started, then five phase changes. */
function playLog(): readonly IGameEvent[] {
  let session = createGameSession(
    { mapRadius: 4, turnLimit: 5, victoryConditions: [], optionalRules: [] },
    [
      {
        id: 'u-p1',
        name: 'u-p1',
        side: GameSide.Player,
        unitRef: 'u-p1',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: MATCH_ID, createdAt: AT },
  );
  session = startGame(session, GameSide.Player);
  for (let index = 0; index < 5; index += 1) {
    session = advancePhase(session);
  }
  return session.events;
}

describe('matchJournalBranchSegmentReader (U21)', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-journal-reader-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
    db = getSQLiteService().getDatabase();
    store = new DurableMatchStore({
      path: ':memory:',
      capabilityDb: () => getSQLiteService().getDatabase(),
    });
    _setCombatJournalAuthorityModeForTests('enabled');
    _resetProcessShadowStatsForTests();
  });

  afterEach(async () => {
    // Restored first so no later suite inherits the mode.
    _setCombatJournalAuthorityModeForTests(null);
    _resetProcessShadowStatsForTests();
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /**
   * Seed the match through the mirror: the opening events through the
   * create path's journal seed, then three command batches. Returns the
   * store's events. Asserts the journal really holds them on `main`,
   * because every row below is about what the journal holds.
   */
  async function seedThroughMirror(): Promise<readonly IGameEvent[]> {
    await store.createMatch(meta());
    const events = playLog();
    expect(events).toHaveLength(HEAD_REVISION);
    const opening = events.slice(0, OPENING_EVENTS);
    for (const event of opening) {
      await store.appendEvent(MATCH_ID, event);
    }
    await store.seedJournalFromInitialEvents(MATCH_ID, opening);
    let next = OPENING_EVENTS;
    // An index loop: this tsconfig's target cannot iterate `.entries()`.
    for (let index = 0; index < BATCH_SIZES.length; index += 1) {
      const size = BATCH_SIZES[index];
      const batch = events.slice(next, next + size);
      const committed = await store.appendCommandBatch(MATCH_ID, {
        commandId: `batch-${index + 1}`,
        actorId: HOST,
        expectedRevision: next,
        events: batch,
        expectedPostStateDigest: null,
      });
      expect(committed.kind).toBe('committed');
      next += size;
    }
    const head = readEffectiveStreamHead(
      db,
      new SQLiteEventHistoryBranchStore(db),
      STREAM,
    );
    expect(head).toMatchObject({
      branchId: MATCH_BASELINE_BRANCH_ID,
      revision: HEAD_REVISION,
    });
    // A mirror refusal is recorded on the shadow tripwire, never thrown.
    expect(getProcessShadowMismatchCount()).toBe(0);
    return store.getEvents(MATCH_ID);
  }

  /** The live head the lobby would name, read the way GET /head reads it. */
  function liveHead() {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const effective = branches.requireEffectiveHead(STREAM);
    const head = readEffectiveStreamHead(db, branches, STREAM);
    return { ...head, generation: effective.effectiveGeneration };
  }

  /** Commit the GM rewind to TARGET_REVISION exactly as the route does. */
  async function commitRewind() {
    const head = liveHead();
    return commitGmCombatRewind(
      buildGmCombatRewindCommitDeps({
        store,
        meta: meta(),
        priorHeadRevision: readEffectiveRevision(STREAM, head.branchId),
        nowIso: () => AT,
      }),
      {
        actorId: HOST,
        role: 'gm',
        gameId: MATCH_ID,
        ownedStateRefs: [`game:${MATCH_ID}`],
      },
      {
        matchId: MATCH_ID,
        targetRevision: TARGET_REVISION,
        expectedBranchId: head.branchId,
        expectedRevision: head.revision,
        expectedDigest: head.digest,
        expectedGeneration: head.generation,
        actor: HOST,
        reason: REWIND_COMMIT_REASON,
      },
    );
  }

  /** Seed, stand up a recovered host, and commit; fails loudly on a refusal. */
  async function standUpCommittedRewind() {
    const events = await seedThroughMirror();
    const host = new ServerMatchHost(
      MATCH_ID,
      store,
      await InteractiveSession.fromSessionAsync(
        foldMatchSession(MATCH_ID, events),
      ),
      new SeededDiceRoller(new SeededRandom(SEED)),
      {
        recovered: true,
        randomSeed: SEED,
        diceSeed: SEED,
        rollbackReader: { kind: 'legacy-compatible' },
      },
    );
    const result = await commitRewind();
    expect(outcomeOf(result)).toBe('committed');
    if (result.kind !== 'committed') throw new Error('expected a commit');
    return { events, host, result };
  }

  describe('the rewind commit, the live rebuild and the boot fold', () => {
    it('commits a rewind whose candidate is verified against the journal it anchors to', async () => {
      await seedThroughMirror();
      const before = liveHead();

      const result = await commitRewind();

      expect(outcomeOf(result)).toBe('committed');
      expect(result).toMatchObject({
        kind: 'committed',
        priorBranchId: MATCH_BASELINE_BRANCH_ID,
        effectiveGeneration: before.generation + 1,
      });
      if (result.kind !== 'committed') throw new Error('expected a commit');
      expect(liveHead()).toMatchObject({
        branchId: result.activatedBranchId,
        revision: TARGET_REVISION,
        generation: before.generation + 1,
      });
    });

    it('rebuilds the live session from exactly the N events the candidate keeps', async () => {
      const { events, host, result } = await standUpCommittedRewind();

      await host.rebuildFromActivatedBranch({
        branchId: result.activatedBranchId,
        effectiveRevision: TARGET_REVISION,
        effectiveGeneration: result.effectiveGeneration,
      });

      const kept = events.slice(0, TARGET_REVISION).map((event) => event.id);
      expect(host.getSessionForTests().events.map((event) => event.id)).toEqual(
        kept,
      );
      expect(host.servedBranchId()).toBe(result.activatedBranchId);
      // The store tail past N moved aside, so the next command is N.
      expect(
        (await store.getEvents(MATCH_ID)).map((event) => event.id),
      ).toEqual(kept);
    });

    it('lands the next command on the candidate at N+1 and boot-folds the candidate', async () => {
      const { host, result } = await standUpCommittedRewind();
      await host.rebuildFromActivatedBranch({
        branchId: result.activatedBranchId,
        effectiveRevision: TARGET_REVISION,
        effectiveGeneration: result.effectiveGeneration,
      });
      const kept = await store.getEvents(MATCH_ID);
      const nextEvent = advancePhase(
        foldMatchSession(MATCH_ID, kept),
      ).events.at(-1);
      if (nextEvent === undefined) throw new Error('no next event');
      expect(nextEvent.sequence).toBe(TARGET_REVISION);

      const next = await store.appendCommandBatch(MATCH_ID, {
        commandId: 'after-rewind',
        actorId: HOST,
        expectedRevision: TARGET_REVISION,
        events: [nextEvent],
        expectedPostStateDigest: null,
      });

      expect(next.kind).toBe('committed');
      expect(getProcessShadowMismatchCount()).toBe(0);
      expect(liveHead()).toMatchObject({
        branchId: result.activatedBranchId,
        revision: TARGET_REVISION + 1,
      });
      const landed = db
        .prepare(
          `SELECT branch_id AS branchId, stream_revision AS revision
             FROM event_journal_events
            WHERE stream_type = ? AND stream_id = ? AND command_id = ?`,
        )
        .all(STREAM.streamType, STREAM.streamId, 'after-rewind');
      expect(landed).toEqual([
        { branchId: result.activatedBranchId, revision: TARGET_REVISION + 1 },
      ]);

      // Restart: the boot fold reads the candidate's own event too.
      const folded = await tryFoldActivatedRewindBranch(store, MATCH_ID);
      expect(folded?.branchId).toBe(result.activatedBranchId);
      expect(folded?.session.events.map((event) => event.id)).toEqual([
        ...kept.map((event) => event.id),
        nextEvent.id,
      ]);
    });
  });

  describe('the prefix law (clause b)', () => {
    it('a mid-stream window chains from its real predecessor and is the same slice of a full read', async () => {
      const { matchJournalBranchSegmentReader } = await loadReader();
      const events = await seedThroughMirror();
      const reader = matchJournalBranchSegmentReader(
        new SQLiteEventJournal<IMatchJournalEnvelope>(db, () => AT),
      );
      const segment = (fromRevision: number) => ({
        kind: 'prefix' as const,
        branchId: MATCH_BASELINE_BRANCH_ID,
        fromRevision,
        throughRevision: HEAD_REVISION,
        baseEventId: null,
        baseDigest: '0'.repeat(64),
      });

      const full = await reader.read(STREAM, segment(0));
      const window = await reader.read(STREAM, segment(TARGET_REVISION - 1));

      expect(full.map((event) => event.streamRevision)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
      expect(full[0]?.previousStreamEventDigest).toBeNull();
      // Every event is the journal's own row on the branch it was asked for.
      for (const event of full) {
        expect(event.branchId).toBe(MATCH_BASELINE_BRANCH_ID);
      }
      expect(full.map((event) => event.payload)).toEqual(
        events.map((event) => JSON.parse(JSON.stringify(event))),
      );
      expect(window).toEqual(full.slice(TARGET_REVISION - 1));
      expect(window[0]?.previousStreamEventDigest).toBe(
        full[TARGET_REVISION - 2]?.eventDigest,
      );
      expect(window[0]?.previousStreamEventDigest).not.toBeNull();
    });

    it('refuses a stored match event whose envelope carries no game event', async () => {
      const { matchJournalBranchSegmentReader } = await loadReader();
      const journal = new SQLiteEventJournal<IMatchJournalEnvelope>(
        db,
        () => AT,
      );
      const appended = await journal.append({
        streamType: 'match',
        streamId: 'match-without-envelope',
        expectedBranchId: MATCH_BASELINE_BRANCH_ID,
        expectedRevision: 0,
        commandId: 'no-envelope',
        events: [
          {
            eventId: 'no-envelope:0',
            eventType: 'phase_changed',
            eventVersion: 1,
            correlationId: 'no-envelope',
            causationEventIds: [],
            occurredAt: AT,
            payload: {
              expectedPostStateDigest: null,
            } as unknown as IMatchJournalEnvelope,
            entityRefs: [],
          },
        ],
        principal: {
          actorKind: 'human',
          actorId: HOST,
          authorityType: 'match',
          authorityId: 'match-without-envelope',
        },
      });
      expect(appended.kind).toBe('committed');

      await expect(
        matchJournalBranchSegmentReader(journal).read(
          { streamType: 'match', streamId: 'match-without-envelope' },
          {
            kind: 'prefix',
            branchId: MATCH_BASELINE_BRANCH_ID,
            fromRevision: 0,
            throughRevision: 1,
            baseEventId: null,
            baseDigest: '0'.repeat(64),
          },
        ),
      ).rejects.toMatchObject({ code: 'branch-integrity' });
    });
  });
});
