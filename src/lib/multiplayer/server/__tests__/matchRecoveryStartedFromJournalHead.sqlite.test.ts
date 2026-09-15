/**
 * S3-b of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, second
 * sub-prefix): recovery selects its rollback reader from S1's mirrored
 * journal head instead of the `mp_journal_authority_started` marker.
 *
 * THE TRANSITION RULE THESE ROWS PINNED, AND WHAT BECAME OF IT. The
 * head WINS wherever it exists, even against a marker that disagrees —
 * that half still holds and rows 4 and 5 still pin it. The other half,
 * "where no head exists the marker is still honoured", was the
 * transition arm design.md retires "once S1 is the writer", and S7-b
 * (task 1.3, sub-prefix 3) retired it: the marker is no longer a source
 * of "started" at all. Rows 1 and 6 were the two arms that honoured it
 * and are rewritten here to assert the opposite winner, which is what
 * their own S3-b comments said the cutover would do.
 *
 * WHERE THE POST-RETIREMENT RULES LIVE.
 * `matchMarkerRetirementRecovery.sqlite.test.ts` owns them, including
 * the one concession S7-b could not close (an unreadable head still
 * reads as no head, because nothing capability-db-independent records
 * that a stream was ever mirrored — S7-d's durable per-match migration
 * state is what makes that decidable).
 *
 * Real boundary only: two temp-file SQLite databases opened the way
 * production opens them (match db + campaign capability db), because
 * the capability-db-closed state this pins does not exist in a fake.
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
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchJournalAuthorityStarted } from '../matchJournalAuthority';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  MATCH_BASELINE_BRANCH_ID,
  MATCH_BASELINE_FIRST_GENERATION,
} from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '../matchJournalAuthority';
import {
  selectRecoveredMatchRollbackReader,
  ServerMatchHost,
} from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-recovery-started-head';
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
      id: 'started-player',
      name: 'started-player',
      side: GameSide.Player,
      unitRef: 'started-player',
      pilotRef: 'started-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'started-opponent',
      name: 'started-opponent',
      side: GameSide.Opponent,
      unitRef: 'started-opponent',
      pilotRef: 'started-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function event(sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
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

function sessionFrom(events: readonly IGameEvent[]): InteractiveSession {
  return InteractiveSession.fromHydratedSession(
    hydrateGameSessionFromEvents(MATCH_ID, [...events]),
    { random: new SeededRandom(42) },
  );
}

/** Rebuild the recovery session exactly as `MatchRecovery` does. */
async function recoverySession(): Promise<InteractiveSession> {
  return sessionFrom(await store.getEvents(MATCH_ID));
}

/**
 * Commit the stream's FIRST batch through the real store path.
 *
 * It has to be the first: `ServerMatchHost.create` persists a match's
 * opening events through `appendEvent`, which never mirrors, and the
 * mirror does not catch up (`MatchStreamJournalMirror` says so at its
 * head). A batch landing on top of an unmirrored log would be a
 * revision conflict on the journal side and would install no head, so
 * the opening events ride IN the batch here.
 *
 * The post-state digest is the digest of the session those events
 * hydrate into, which is what makes the refold at recovery time agree
 * with the receipt.
 */
async function commitFirstBatch(
  started?: IMatchJournalAuthorityStarted,
): Promise<void> {
  const events = await openingEvents();
  const projected = sessionFrom(events);
  const result = await store.appendCommandBatch!(MATCH_ID, {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: events[0].sequence,
    events,
    expectedPostStateDigest: digestCommandPostState(projected.getSession()),
    ...(started ? { journalAuthorityStarted: started } : {}),
  });
  expect(result.kind).toBe('committed');
}

/**
 * A real opening log (GameCreated + first phase), minted on a throwaway
 * in-memory store so the events are the host's own rather than a
 * hand-rolled shape hydration would reject.
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
  // JSON round-trip drops `undefined` members. The journal canonicalizer
  // (JCS) refuses to represent them, so the host's own opening events
  // cannot be mirrored verbatim — in the real flow they never are, since
  // `create` persists them outside the batch path.
  return JSON.parse(
    JSON.stringify(await scratch.getEvents(MATCH_ID)),
  ) as IGameEvent[];
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'recovery-started-head-'));
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

describe('recovered rollback reader selected from the mirrored journal head', () => {
  it('ignores the marker over an unreadable head, which task 1.7 flipped', async () => {
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch(startedMarker(1, 'stale-marker-branch'));
    const session = await recoverySession();
    // Reopen the match database the way production does when the
    // campaign singleton was never initialized: same rows, same ports,
    // no capability database behind them. A head EXISTS here and cannot
    // be read, so the decision falls back to the marker.
    store.close();
    resetSQLiteService();
    store = new DurableMatchStore({ path: matchDbPath });
    expect(store.isCapabilityDbAvailable()).toBe(false);

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    // S3-b honoured the marker here and said the cutover would have to
    // stop. S7-b did: a marker naming a branch the mirror never
    // installed can no longer become the served head just because the
    // capability database is closed. It is the legacy reader now, not
    // the refusal S3-b guessed at — see
    // matchMarkerRetirementRecovery.sqlite.test.ts for why the refusal
    // is not decidable until S7-d's per-match migration state exists.
    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('still selects the legacy reader when the head is unreadable and nothing claims the match started', async () => {
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch();
    const session = await recoverySession();
    store.close();
    resetSQLiteService();
    store = new DurableMatchStore({ path: matchDbPath });
    expect(store.isCapabilityDbAvailable()).toBe(false);
    expect(await store.getJournalAuthorityStarted(MATCH_ID)).toBeNull();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    // Deliberate concession, not an oversight: refusing here would
    // block every legacy match in a process that never opened the
    // campaign database.
    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('selects the journal reader with the derived head identity once the mirror has started the stream', async () => {
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch();
    const session = await recoverySession();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    // No marker was ever written here, so a journal-compatible answer
    // can only have come from the mirrored effective head.
    expect(await store.getJournalAuthorityStarted(MATCH_ID)).toBeNull();
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

  it('still selects the legacy reader for a match the mirror never started', async () => {
    await commitFirstBatch();
    const session = await recoverySession();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('follows the head, not the marker, when a head exists and the marker disagrees', async () => {
    // The discriminating row. Both signals are present and they name
    // different branches; only a decision that reads the mirrored head
    // can come back with 'main'.
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch(startedMarker(1, 'stale-marker-branch'));
    const session = await recoverySession();

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(
      (await store.getJournalAuthorityStarted(MATCH_ID))?.head.branchId,
    ).toBe('stale-marker-branch');
    expect(decision).toEqual(
      expect.objectContaining({
        kind: 'journal-compatible',
        head: expect.objectContaining({ branchId: MATCH_BASELINE_BRANCH_ID }),
      }),
    );
  });

  it('ignores the marker while no head exists, because task 1.7 removed that arm', async () => {
    // The pair to the row above: same two signals, same winner now.
    // This arm used to keep every pre-cutover journal-authority stream
    // recoverable through its marker; task 1.7 removed it, and nothing
    // writes a marker any more for it to have kept.
    await commitFirstBatch(startedMarker(1, 'marker-only-branch'));
    const session = await recoverySession();
    expect(
      (await store.getJournalAuthorityStarted(MATCH_ID))?.head.branchId,
    ).toBe('marker-only-branch');

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision).toEqual({ kind: 'legacy-compatible' });
  });

  it('refuses typed on a corrupt head instead of falling back to legacy', async () => {
    _setCombatJournalAuthorityModeForTests('enabled');
    await commitFirstBatch();
    const session = await recoverySession();
    // A head naming a non-effective branch is persisted corruption, not
    // "never started"; History B refuses this shape MATCH_QUARANTINED.
    getSQLiteService()
      .getDatabase()
      .prepare(
        `UPDATE event_history_branches SET status = 'superseded'
          WHERE stream_type = 'match' AND stream_id = ?`,
      )
      .run(MATCH_ID);

    const decision = await selectRecoveredMatchRollbackReader(
      MATCH_ID,
      store,
      session,
    );

    expect(decision.kind).not.toBe('legacy-compatible');
    expect(decision).toEqual(
      expect.objectContaining({
        kind: 'blocked',
        reason: 'recovery-fact-read-failed',
      }),
    );
  });
});
