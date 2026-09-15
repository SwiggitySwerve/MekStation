/**
 * S4 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.4): the
 * ORDINARY restart-recovery path consults the journal head.
 *
 * Until this seam `recoverActiveMatches` had exactly two paths: a
 * rewound stream (`tryFoldActivatedRewindBranch`) and everything else,
 * rebuilt from `mp_match_events` with no journal read at all. That
 * second path is the one design.md's S4 says must stop being "the
 * legacy event table alone".
 *
 * WHAT THIS SLICE READS FROM THE JOURNAL, AND WHAT IT DOES NOT. The
 * head decides whether the stream is journal-started, which branch
 * identity it answers on, and the revision the rebuild stops at. The
 * EVENT BYTES still come from the match store, because that is where a
 * live-path branch's events live: `matchStoreBranchSegmentReader`
 * refuses any branch but `root` by name, and the journal tail cannot be
 * complete for a match whose opening events `ServerMatchHost.create`
 * persisted through `appendEvent` (row 4 pins that, and the seeding it
 * would take is owed by task 1.7 — see `r4-s2-live-head-admission-review`).
 *
 * Real boundary only: two temp-file SQLite databases opened the way
 * production opens them (match db + campaign capability db), and every
 * recovery row runs after a COLD REOPEN of both.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S4)
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
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

import { DurableMatchStore } from '../DurableMatchStore';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import { type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MATCH_BASELINE_BRANCH_ID } from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { recoverActiveMatches } from '../MatchRecovery';
import { foldMatchSession } from '../MatchSessionProjector';
import { ServerMatchHost } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-recovery-journal-head';
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
      id: 'journal-head-player',
      name: 'journal-head-player',
      side: GameSide.Player,
      unitRef: 'journal-head-player',
      pilotRef: 'journal-head-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'journal-head-opponent',
      name: 'journal-head-opponent',
      side: GameSide.Opponent,
      unitRef: 'journal-head-opponent',
      pilotRef: 'journal-head-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

/** A legacy-only append, i.e. the shape that never reaches the mirror. */
function unmirroredEvent(sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
}

let dir = '';
let matchDbPath = '';
let campaignDbPath = '';
let store: DurableMatchStore;

function openCampaign(): void {
  getSQLiteService({ path: campaignDbPath }).initialize();
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

/**
 * A real opening log (GameCreated + first phase), minted on a throwaway
 * in-memory store so the events are the host's own rather than a
 * hand-rolled shape hydration would reject. The JSON round-trip drops
 * `undefined` members, which the journal canonicalizer (JCS) refuses to
 * represent — the same round-trip the S3-b and checkpoint-door fixtures
 * take, and the reason `create`'s own events cannot be mirrored verbatim.
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
  return JSON.parse(
    JSON.stringify(await scratch.getEvents(MATCH_ID)),
  ) as IGameEvent[];
}

/**
 * Commit the stream's FIRST batch through the real store path, so S1's
 * mirror installs a genuine head. It has to be the first batch on an
 * empty log: a batch landing on top of unmirrored events is a revision
 * conflict on the journal side and installs no head (row 4).
 */
async function commitFirstBatch(): Promise<readonly IGameEvent[]> {
  const events = await openingEvents();
  const projected = sessionFrom(events);
  const result = await store.appendCommandBatch!(MATCH_ID, {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: events[0].sequence,
    events,
    expectedPostStateDigest: digestCommandPostState(projected.getSession()),
  });
  expect(result.kind).toBe('committed');
  return events;
}

/** Close both databases and reopen them on the same files. */
function coldReopen(): void {
  store.close();
  resetSQLiteService();
  openCampaign();
  store = openStore();
}

function effectiveHeadBranchId(): string | null {
  const db = getSQLiteService().getDatabase();
  return (
    new SQLiteEventHistoryBranchStore(db).readEffectiveHead(
      matchStreamRef(MATCH_ID),
    )?.branchId ?? null
  );
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'recovery-journal-head-'));
  matchDbPath = path.join(dir, 'multiplayer-matches.db');
  campaignDbPath = path.join(dir, 'mekstation.db');
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

describe('restart recovery rebuilds the live host from the journal head', () => {
  it('rebuilds a mirrored stream through its journal head, matching the pre-restart state', async () => {
    _setCombatJournalAuthorityModeForTests('shadow');
    const events = await commitFirstBatch();
    const before = digestReplayCheckpointState(
      foldMatchSession(MATCH_ID, events),
    );
    coldReopen();
    // The mirror installed the baseline head, so this match is exactly
    // the case the ordinary path never consulted before this seam.
    expect(effectiveHeadBranchId()).toBe(MATCH_BASELINE_BRANCH_ID);

    const result = await recoverActiveMatches(store);

    expect(result.failed).toStrictEqual([]);
    expect(result.blocked).toStrictEqual([]);
    const host = result.hosts.get(MATCH_ID);
    expect(host).toBeDefined();
    expect(digestReplayCheckpointState(host!.getSessionForTests())).toBe(
      before,
    );
  });

  it('leaves the legacy rebuild unchanged for a stream the mirror never started', async () => {
    // Mode off: nothing mirrors, so no journal row of any kind exists
    // and recovery must behave exactly as it did before this seam.
    const events = await openingEvents();
    for (const event of events) {
      await store.appendEvent(MATCH_ID, event);
    }
    const before = digestReplayCheckpointState(
      foldMatchSession(MATCH_ID, events),
    );
    coldReopen();
    expect(effectiveHeadBranchId()).toBeNull();

    const result = await recoverActiveMatches(store);

    expect(result.failed).toStrictEqual([]);
    expect(result.blocked).toStrictEqual([]);
    const host = result.hosts.get(MATCH_ID);
    expect(host).toBeDefined();
    expect(digestReplayCheckpointState(host!.getSessionForTests())).toBe(
      before,
    );
  });

  it('refuses typed when the journal head and the legacy log disagree, and serves nothing', async () => {
    _setCombatJournalAuthorityModeForTests('shadow');
    const events = await commitFirstBatch();
    // One append straight past the batch boundary: the mirror never
    // sees it, so the legacy log now runs one revision past the head.
    // This is S1's disclosed no-catch-up (and RR-1's SQLITE_BUSY drop)
    // reproduced at the store boundary where it actually happens.
    await store.appendEvent(MATCH_ID, unmirroredEvent(events.length));
    coldReopen();

    const result = await recoverActiveMatches(store);

    expect(result.hosts.has(MATCH_ID)).toBe(false);
    expect(result.failed).toStrictEqual([MATCH_ID]);
    expect(result.blocked).toStrictEqual([
      {
        matchId: MATCH_ID,
        reason: 'partial-history',
        evidence: [
          `journal head '${MATCH_BASELINE_BRANCH_ID}' at revision ${events.length}; match log holds ${events.length + 1} events through revision ${events.length + 1}`,
        ],
      },
    ]);
  });

  it('stays on the legacy path for a created match, because its opening events never reach the mirror', async () => {
    // The create path at the store boundary: `ServerMatchHost.create`
    // persists opening events through `appendEvent`
    // (`ServerMatchHostEvents`), which is not the batch path S1's mirror
    // hooks. The first real command batch therefore lands on a journal
    // that is already behind and mirrors `revision-conflict`, installing
    // NO head. THE OWED GAP: closing it means seeding the mirror at
    // creation, which task 1.7 (S6) owns because shadow parity is the
    // promise it falsifies. S4 is correct without it precisely because
    // "no head" is the legacy path, byte-identical to before.
    _setCombatJournalAuthorityModeForTests('shadow');
    const events = await openingEvents();
    for (const event of events) {
      await store.appendEvent(MATCH_ID, event);
    }
    const followUp = unmirroredEvent(events.length);
    const result = await store.appendCommandBatch!(MATCH_ID, {
      commandId: 'cmd-after-create',
      actorId: 'p1',
      expectedRevision: followUp.sequence,
      events: [followUp],
      expectedPostStateDigest: null,
    });
    expect(result.kind).toBe('committed');
    // The mirror ran and refused; the tripwire is how S6 finds out.
    expect(getProcessShadowMismatchCount()).toBe(1);
    expect(effectiveHeadBranchId()).toBeNull();

    coldReopen();
    const recovered = await recoverActiveMatches(store);

    expect(recovered.blocked).toStrictEqual([]);
    expect(recovered.hosts.has(MATCH_ID)).toBe(true);
  });
});
