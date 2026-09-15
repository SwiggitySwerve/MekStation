/**
 * S7-c of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.7
 * preparation): the JOURNAL arm of restart recovery goes through
 * `checkpointRecoveryPort`, the same door the legacy arm goes through.
 *
 * THE GAP THIS CLOSES. S4 gave `recoverActiveMatches` a journal-head
 * consult and then let a `journal` verdict jump straight to
 * `registerRecoveredHost`, over the whole checkpoint block. The S4
 * review named the four properties that jump loses
 * (`evidence/r4-s4-restart-recovery-review-20260915.json`, finding
 * S4-R4): the `emptyHistory: 'corrupt'` refusal, the `integrityOf`
 * event-identity check, quarantine eligibility, and the checkpoint
 * cache refresh. Inert while the journal arm was unreachable; live for
 * every match the moment a stream is seeded — which S7-a now does on
 * the create path.
 *
 * WHY THESE MATCHES ARE REAL. Each row seeds a real journal stream
 * through S7-a's own `seedJournalFromInitialEvents` on a real
 * `DurableMatchStore` over temp-file SQLite, so the consult answers
 * `journal` for the same reason a seeded production match would. No
 * hand-built consult, no stubbed head.
 *
 * No cutover: `COMBAT_JOURNAL_AUTHORITY_MODE` stays 'off' and every
 * mode here is a `_setCombatJournalAuthorityModeForTests` override.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S4)
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { BranchCheckpointCache } from '@/lib/events/checkpoints/BranchCheckpointCache';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  lockMovement,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import { revisionForMatchSequence } from '../history/matchStoreBranchSegmentReader';
import { matchStoreHistoryReader } from '../MatchCheckpointHistory';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { deriveMatchJournalAuthorityStartedHead } from '../matchJournalAuthorityStartedDerived';
import { recoverActiveMatches } from '../MatchRecovery';
import { consultMatchRecoveryJournalHead } from '../MatchRecoveryJournalHead';
import {
  createMatchSessionProjector,
  foldMatchSession,
  matchAuthoritativePipeline,
} from '../MatchSessionProjector';

const MATCH_ID = 'match-journal-arm-door';
const STREAM = matchStreamRef(MATCH_ID);
const AT = '2026-09-15T00:00:00.000Z';
const SCOPE = { authorityType: 'match', authorityId: MATCH_ID } as const;

function unit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

/** The same engine-built log the legacy door fixture uses. */
function buildLog(): readonly IGameEvent[] {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 5,
      victoryConditions: [],
      optionalRules: [],
      fogOfWar: true,
    },
    [unit('u-p1', GameSide.Player), unit('u-p2', GameSide.Opponent)],
    { id: MATCH_ID, createdAt: AT },
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session = lockMovement(session, 'u-p1');
  session = lockMovement(session, 'u-p2');
  session = advancePhase(session);
  return session.events;
}

// The store only ever hands back parsed JSON, so the fixture holds the
// same round-tripped shape the recovery read would see.
const EVENTS: readonly IGameEvent[] = JSON.parse(
  JSON.stringify(buildLog()),
) as readonly IGameEvent[];
const HEAD_REVISION = revisionForMatchSequence(
  EVENTS[EVENTS.length - 1]!.sequence,
);
const FULL_DIGEST = digestReplayCheckpointState(
  foldMatchSession(MATCH_ID, EVENTS),
);

const META: IMatchMeta = {
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
  config: { mapRadius: 6, turnLimit: 5, fogOfWar: true },
};

let dir = '';
let store: DurableMatchStore | undefined;

function primary() {
  return getSQLiteService().getDatabase();
}

function pipeline() {
  return matchAuthoritativePipeline(
    MATCH_ID,
    createMatchSessionProjector(MATCH_ID),
  );
}

/**
 * Put a match on the journal path the way a seeded production match
 * gets there: a real log, then S7-a's create-path seed under a mode
 * override, which installs the stream head and the effective-head row
 * in the mirror's own transaction.
 */
async function seedJournalPathMatch(
  events: readonly IGameEvent[],
): Promise<void> {
  await store!.createMatch(META);
  for (const event of events) await store!.appendEvent(MATCH_ID, event);
  _setCombatJournalAuthorityModeForTests('shadow');
  await store!.seedJournalFromInitialEvents!(MATCH_ID, events);
  _setCombatJournalAuthorityModeForTests('off');
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'match-journal-arm-door-'));
  resetSQLiteService();
  getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
  store = new DurableMatchStore({
    path: path.join(dir, 'multiplayer-matches.db'),
    capabilityDb: primary,
  });
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  store?.close();
  store = undefined;
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('the journal recovery arm goes through the checkpoint door', () => {
  it('takes the journal arm for a seeded match', async () => {
    await seedJournalPathMatch(EVENTS);

    expect(deriveMatchJournalAuthorityStartedHead(store!, MATCH_ID).kind).toBe(
      'started',
    );
    expect(
      await consultMatchRecoveryJournalHead(store!, MATCH_ID),
    ).toMatchObject({ kind: 'journal', headRevision: HEAD_REVISION });
  });

  it('rebuilds a healthy journal-path match unchanged', async () => {
    await seedJournalPathMatch(EVENTS);

    const result = await recoverActiveMatches(store!);
    const host = result.hosts.get(MATCH_ID);

    expect(result.failed).toStrictEqual([]);
    expect(result.blocked).toStrictEqual([]);
    expect(host).toBeDefined();
    expect(
      digestReplayCheckpointState(host!.getSessionForTests()),
    ).toStrictEqual(FULL_DIGEST);
  });

  /**
   * (a) S4-R4's first lost property. The legacy arm declares
   * `emptyHistory: 'corrupt'` because an ACTIVE match holding no events
   * is malformed, not fresh. The journal arm folded an empty list and
   * registered a servable, empty host.
   *
   * The shape the reviewer named, built rather than asserted: an
   * effective-head row whose `event_journal_stream_heads` row is
   * missing, which is exactly when `readEffectiveStreamHead` falls back
   * to revision 0 — so head 0 meets a 0-event log and the consult
   * answers `journal` with nothing in it.
   */
  it('refuses an active journal-path match that holds no events', async () => {
    await store!.createMatch(META);
    const db = primary();
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES (?, ?, 'root', 1, ?)`,
    ).run(STREAM.streamType, STREAM.streamId, 'b'.repeat(64));
    expect(
      new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches(),
    ).toBe(1);
    db.prepare(
      `DELETE FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ?`,
    ).run(STREAM.streamType, STREAM.streamId);

    expect(
      await consultMatchRecoveryJournalHead(store!, MATCH_ID),
    ).toStrictEqual({
      kind: 'journal',
      branchId: 'root',
      headRevision: 0,
      events: [],
    });

    const result = await recoverActiveMatches(store!);

    expect(result.hosts.size).toBe(0);
    expect(result.failed).toStrictEqual([MATCH_ID]);
    expect(result.blocked).toStrictEqual([
      { matchId: MATCH_ID, reason: 'empty-history', evidence: [MATCH_ID] },
    ]);
  });

  /**
   * (b) S4-R4's second lost property. The divergence gate recovers
   * sequence continuity (count and max revision together force
   * {0..N-1}) but says nothing about event IDENTITY: two events sharing
   * an id at distinct sequences pass it, and `detectAuthorityCorruption`
   * is the only thing that calls that duplicate-receipt.
   */
  it('refuses a journal-path match whose event identity repeats', async () => {
    const duplicated = EVENTS.map((event, index) =>
      index === 1 ? { ...event, id: EVENTS[0]!.id } : event,
    );
    await seedJournalPathMatch(duplicated);

    // Still the journal arm, and still contiguous: only identity is wrong.
    expect(
      await consultMatchRecoveryJournalHead(store!, MATCH_ID),
    ).toMatchObject({ kind: 'journal', headRevision: HEAD_REVISION });

    const result = await recoverActiveMatches(store!);

    expect(result.hosts.size).toBe(0);
    expect(result.failed).toStrictEqual([MATCH_ID]);
    expect(result.blocked).toStrictEqual([
      {
        matchId: MATCH_ID,
        reason: 'duplicate-receipt',
        evidence: [
          `${EVENTS[0]!.id} appears at revisions ${EVENTS[0]!.sequence} and ${EVENTS[1]!.sequence}`,
        ],
      },
    ]);
  });

  /**
   * (d) S4-R4's third lost property. `quarantineAuthorityCorruption`
   * was never invoked on the journal arm, so a corruption shape the
   * legacy arm quarantines left a journal-path match merely `failed`.
   * The events being validated are the MATCH LOG's own (the consult
   * reads them from the store and only bounds them by the head), so the
   * QUARANTINABLE vocabulary means here exactly what it means there.
   */
  it('quarantines the corrupt journal-path match, and only it', async () => {
    const duplicated = EVENTS.map((event, index) =>
      index === 1 ? { ...event, id: EVENTS[0]!.id } : event,
    );
    await seedJournalPathMatch(duplicated);
    const quarantine = new ReplayQuarantineRegistry();

    await recoverActiveMatches(store!, quarantine);

    expect(quarantine.recordFor(SCOPE)).toMatchObject({
      scope: SCOPE,
      reason: 'duplicate-receipt',
    });
    expect(
      quarantine.isQuarantined({
        authorityType: 'match',
        authorityId: 'other',
      }),
    ).toBe(false);
  });

  /**
   * (c) S4-R4's fourth lost property, and the only one S4-R2 disclosed.
   * The legacy arm records a checkpoint at the live head after a
   * successful rebuild; the journal arm never reached that line, so
   * every boot re-read the whole log.
   */
  it('refreshes the checkpoint cache at the journal head', async () => {
    await seedJournalPathMatch(EVENTS);

    const result = await recoverActiveMatches(store!);
    expect(result.hosts.has(MATCH_ID)).toBe(true);

    const offer = await new BranchCheckpointCache(primary()).offer(
      pipeline(),
      HEAD_REVISION,
      matchStoreHistoryReader(store!, MATCH_ID),
    );

    expect(offer).not.toBeNull();
    expect(offer!.metadata.revision).toBe(HEAD_REVISION);
  });
});
