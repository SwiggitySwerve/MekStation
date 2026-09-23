/**
 * After a committed GM rewind the live host must play from the
 * activated branch. Today the commit route answers 200 and leaves
 * InteractiveSession, RNG, and viewer cursors on the pre-rewind head.
 *
 * Commit is seeded the way a live match is: the play log committed as
 * one command batch with combat journal mode `enabled` (the
 * test-scoped override), so the S1 mirror writes the journal the
 * commit anchors to and the rebuild reads (U21); expected* read from
 * the live head. Driving a live host first wrote extra events, an
 * outbox row, or a 14.3 lease and the commit refused before rebuild
 * could run.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { ICorrectionLeaseHandle } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { buildGmCombatRewindCommitDeps } from '@/pages-modules/api/rewindCommitDeps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';
import type { IRewindRebuildHost } from '../ServerMatchHostRewindRebuild';

import { DurableMatchStore } from '../DurableMatchStore';
import { commitGmCombatRewind } from '../history/GmCombatRewindCommit';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import {
  nextMatchSequenceAfter,
  revisionForMatchSequence,
} from '../history/matchStoreBranchSegmentReader';
import { MATCH_BASELINE_BRANCH_ID } from '../matchAuthorityBaseline';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { recoverActiveMatches } from '../MatchRecovery';
import { foldMatchSession } from '../MatchSessionProjector';
import { SeededDiceRoller } from '../RollCapture';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const MATCH_ID = 'rewind-rebuild-1';
const AT = '2026-09-02T00:00:00.000Z';
const SEED = 42;
const TARGET_REVISION = 2;
const STREAM = matchStreamRef(MATCH_ID);

describe('ServerMatchHost rewind rebuild', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-rebuild-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
    _setCombatJournalAuthorityModeForTests('enabled');
  });

  afterEach(async () => {
    // Restored first so no later suite inherits the mode.
    _setCombatJournalAuthorityModeForTests(null);
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('live session answers revision N phase, not the pre-rewind head', async () => {
    const { host, result, expectedPhase, preRewindPhase } =
      await standUpCommittedRewind();
    expect(preRewindPhase).not.toBe(expectedPhase);

    await host.rebuildFromActivatedBranch({
      branchId: result.activatedBranchId,
      effectiveRevision: TARGET_REVISION,
      effectiveGeneration: result.effectiveGeneration,
    });

    expect(host.getSessionForTests().currentState.phase).toBe(expectedPhase);
  });

  it('next die roll matches a fresh host seeded with the same seeds', async () => {
    const { host, result } = await standUpCommittedRewind();
    host.d6ForTests();
    await host.rebuildFromActivatedBranch({
      branchId: result.activatedBranchId,
      effectiveRevision: TARGET_REVISION,
      effectiveGeneration: result.effectiveGeneration,
    });
    const fresh = new SeededDiceRoller(new SeededRandom(SEED));
    expect(host.d6ForTests()).toBe(fresh.d6());
  });

  it('viewer past N is resynced from the new head and its cursor discarded', async () => {
    const { host, result } = await standUpCommittedRewind();
    const socket = makeSocket();
    host.attachSocket(socket, 'gm-1');
    await host.handleSessionJoin(socket, 'gm-1');
    expect(host.viewerDeliveryIssuedForTests('gm-1')).toBeGreaterThan(0);

    // Snapshot before rebuild: getEvents after supersedeFrom is the
    // prefix only, so the superseded-id set has to come from the
    // pre-mark log.
    const stored = await store.getEvents(MATCH_ID);
    await host.rebuildFromActivatedBranch({
      branchId: result.activatedBranchId,
      effectiveRevision: TARGET_REVISION,
      effectiveGeneration: result.effectiveGeneration,
    });
    expect(host.viewerDeliveryIssuedForTests('gm-1')).toBe(0);

    const resync = makeSocket();
    host.attachSocket(resync, 'gm-1');
    await host.handleSessionJoin(resync, 'gm-1', 99, MATCH_ID, 99);
    const replayed = resync.sent.flatMap((frame) =>
      frame.parsed.kind === 'ReplayChunk' ? frame.parsed.events : [],
    );
    expect(replayed.length).toBeGreaterThan(0);
    // The wire strips the authority sequence (players never receive it),
    // so the bound is proven by identity: every replayed event is one of
    // the prefix events at or below the cut, and no superseded id leaks.
    const prefixIds = new Set(
      stored
        .filter(
          (event) =>
            revisionForMatchSequence(event.sequence) <= TARGET_REVISION,
        )
        .map((event) => event.id),
    );
    const supersededIds = new Set(
      stored
        .filter(
          (event) => revisionForMatchSequence(event.sequence) > TARGET_REVISION,
        )
        .map((event) => event.id),
    );
    expect(supersededIds.size).toBeGreaterThan(0);
    const replayedIds = replayed.map(
      (event) => (event as { readonly id: string }).id,
    );
    expect(replayedIds.every((id) => prefixIds.has(id))).toBe(true);
    expect(replayedIds.some((id) => supersededIds.has(id))).toBe(false);
  });

  it('rebuild lease is released only after replaceSession', async () => {
    const { host, result, expectedPhase } = await standUpCommittedRewind();
    const original =
      SQLiteEventHistoryCorrectionLeaseStore.prototype.releaseCorrectionLease;
    const releaseSpy = jest
      .spyOn(
        SQLiteEventHistoryCorrectionLeaseStore.prototype,
        'releaseCorrectionLease',
      )
      .mockImplementation(function (
        this: SQLiteEventHistoryCorrectionLeaseStore,
        stream: IEventHistoryStreamRef,
        handle: ICorrectionLeaseHandle,
      ) {
        expect(host.getSessionForTests().currentState.phase).toBe(
          expectedPhase,
        );
        return original.call(this, stream, handle);
      });

    await host.rebuildFromActivatedBranch({
      branchId: result.activatedBranchId,
      effectiveRevision: TARGET_REVISION,
      effectiveGeneration: result.effectiveGeneration,
    });
    expect(releaseSpy).toHaveBeenCalled();
    releaseSpy.mockRestore();
  });

  it('a rebuild that fails before the session is replaced claims no served branch', async () => {
    // The claim must follow replaceSession: a host whose rebuild threw
    // still serves the identity it had, so the admission keeps refusing
    // live intents on the branch it never adopted.
    const { host, result } = await standUpCommittedRewind();
    // replaceSession lives on the rebuild port the host hands out, so the
    // injection wraps that port and leaves every other member real.
    type PortHost = { rewindRebuildPort(): IRewindRebuildHost };
    const portHost = host as unknown as PortHost;
    const realPort = portHost.rewindRebuildPort();
    const replaceSpy = jest
      .spyOn(portHost, 'rewindRebuildPort')
      .mockImplementation(() => ({
        ...realPort,
        replaceSession: () => {
          throw new Error('injected: session replacement failed');
        },
      }));
    await expect(
      host.rebuildFromActivatedBranch({
        branchId: result.activatedBranchId,
        effectiveRevision: TARGET_REVISION,
        effectiveGeneration: result.effectiveGeneration,
      }),
    ).rejects.toThrow('injected');
    expect(host.servedBranchId()).toBeNull();
    replaceSpy.mockRestore();
  });

  it('no live host: commit still answers committed and boot folds the activated branch', async () => {
    const meta = await writePlayLog(store);
    const events = await store.getEvents(MATCH_ID);
    expectMirroredHead(events);
    const committed = await commitRewind(meta);
    expect(committed).toMatchObject({ kind: 'committed' });

    const recovered = await recoverActiveMatches(store);
    const host = recovered.hosts.get(MATCH_ID);
    expect(host).toBeDefined();
    const prefix = events.filter(
      (event) => revisionForMatchSequence(event.sequence) <= TARGET_REVISION,
    );
    expect(host!.getSessionForTests().currentState.phase).toBe(
      foldMatchSession(MATCH_ID, prefix).currentState.phase,
    );
    expect(host!.getSessionForTests().currentState.phase).not.toBe(
      foldMatchSession(MATCH_ID, events).currentState.phase,
    );
  });

  it('first command after a committed rewind persists and is delivered', async () => {
    const { host, result } = await standUpCommittedRewind();
    await host.rebuildFromActivatedBranch({
      branchId: result.activatedBranchId,
      effectiveRevision: TARGET_REVISION,
      effectiveGeneration: result.effectiveGeneration,
    });
    const prefix = await store.getEvents(MATCH_ID);
    const socket = makeSocket();
    host.attachSocket(socket, 'gm-1');
    const intent: IIntent = {
      kind: 'Intent',
      matchId: MATCH_ID,
      // Commit/rebuild clock, not wall nowIso(): CI date skew must
      // not reorder this command against the rewind mark.
      ts: AT,
      playerId: 'gm-1',
      intent: { kind: 'Concede', side: 'player' },
    };
    // Fresh connection key: rebuild resets the intent window; a
    // reused pre-rewind bucket can RATE_LIMITED a legal Concede.
    const broadcasts = await host.handleIntent(intent, 'conn-after-rewind');
    const after = await waitUntilFirstCommandDelivered(
      socket,
      store,
      prefix.length,
      broadcasts,
    );
    const lastError = [...socket.sent]
      .reverse()
      .find((frame) => frame.parsed.kind === 'Error');
    expect(
      lastError === undefined ? undefined : JSON.stringify(lastError.parsed),
    ).toBeUndefined();
    expect(
      broadcasts.some(
        (frame) => frame.kind === 'Error' && frame.code === 'STORE_FAILURE',
      ),
    ).toBe(false);
    expect(after.length).toBeGreaterThan(prefix.length);
    expect(after.some((event) => event.type === GameEventType.GameEnded)).toBe(
      true,
    );
    expect(
      socket.sent.some((frame) => frame.parsed.kind === 'Event') ||
        broadcasts.some((frame) => frame.kind === 'Event'),
    ).toBe(true);
  });

  async function standUpCommittedRewind(): Promise<{
    readonly host: ServerMatchHost;
    readonly result: Extract<
      Awaited<ReturnType<typeof commitGmCombatRewind>>,
      { kind: 'committed' }
    >;
    readonly expectedPhase: GamePhase;
    readonly preRewindPhase: GamePhase;
  }> {
    const meta = await writePlayLog(store);
    const events = await store.getEvents(MATCH_ID);
    expectMirroredHead(events);
    // Recovered host so create() cannot persist a second GameCreated
    // line or grab the 14.3 lease the commit module must acquire.
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
        // appendEvent play log has no journal-started fact. The
        // recovered default is blocked:recovery-selection-missing and
        // would INTERNAL_ERROR every post-rebuild command.
        rollbackReader: { kind: 'legacy-compatible' },
      },
    );
    const result = await commitRewind(meta);
    // toMatchObject prints kind/reason/detail when commit still refuses.
    expect(result).toMatchObject({ kind: 'committed' });
    if (result.kind !== 'committed') {
      throw new Error('expected committed rewind');
    }
    const prefix = events.filter(
      (event) => revisionForMatchSequence(event.sequence) <= TARGET_REVISION,
    );
    return {
      host,
      result,
      expectedPhase: foldMatchSession(MATCH_ID, prefix).currentState.phase,
      preRewindPhase: host.getSessionForTests().currentState.phase,
    };
  }

  /**
   * The journal the mirror wrote holds the whole play log on `main`:
   * its head is the log's last revision, which is also the store's next
   * sequence.
   */
  function expectMirroredHead(events: readonly IGameEvent[]): void {
    const last = events[events.length - 1];
    if (last === undefined) {
      throw new Error('play log is empty');
    }
    const headRevision = revisionForMatchSequence(last.sequence);
    // The offset, pinned where this suite depends on it: the revision
    // the mirrored head names is the store's next sequence, the number
    // the commit-time check derives (S5, task 1.5). Seeding one and
    // rewinding against the other is how a rewind targets the wrong
    // event.
    expect(headRevision).toBe(nextMatchSequenceAfter(last.sequence));
    expect(liveHead()).toMatchObject({
      branchId: MATCH_BASELINE_BRANCH_ID,
      revision: headRevision,
    });
  }

  async function commitRewind(
    meta: IMatchMeta,
  ): Promise<Awaited<ReturnType<typeof commitGmCombatRewind>>> {
    const head = liveHead();
    return commitGmCombatRewind(
      buildGmCombatRewindCommitDeps({
        store,
        meta,
        priorHeadRevision: head.revision,
        nowIso: () => AT,
      }),
      {
        actorId: meta.hostPlayerId,
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
        actor: meta.hostPlayerId,
        reason: 'authorized combat rewind',
      },
    );
  }

  function liveHead(): {
    readonly branchId: string;
    readonly revision: number;
    readonly digest: string;
    readonly generation: number;
  } {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const streamHead = readEffectiveStreamHead(db, branches, STREAM);
    const effective = branches.readEffectiveHead(STREAM);
    if (effective === null) {
      throw new Error('the mirror left no effective head');
    }
    return {
      branchId: streamHead.branchId,
      revision: streamHead.revision,
      digest: streamHead.digest,
      generation: effective.effectiveGeneration,
    };
  }
});

type ReplayFrame = { parsed: { kind: string; events?: readonly unknown[] } };

/**
 * Await persist + Event delivery instead of a fixed pause. handleIntent
 * is usually done when it returns; CI can still surface the Event on a
 * later microtask than the store write.
 */
async function waitUntilFirstCommandDelivered(
  socket: { sent: ReplayFrame[] },
  matchStore: DurableMatchStore,
  prefixLength: number,
  broadcasts: readonly { kind: string }[],
): Promise<readonly IGameEvent[]> {
  let after = await matchStore.getEvents(MATCH_ID);
  for (let i = 0; i < 200; i += 1) {
    const delivered =
      socket.sent.some((frame) => frame.parsed.kind === 'Event') ||
      broadcasts.some((frame) => frame.kind === 'Event');
    if (after.length > prefixLength && delivered) return after;
    await Promise.resolve();
    after = await matchStore.getEvents(MATCH_ID);
  }
  return after;
}

function makeSocket(): IMatchSocket & { sent: ReplayFrame[] } {
  const sent: ReplayFrame[] = [];
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as ReplayFrame['parsed'] });
    },
    close() {},
    get readyState() {
      return 1;
    },
    sent,
  } as IMatchSocket & { sent: ReplayFrame[] };
}

/** Create the match and commit its play log as one command batch. */
async function writePlayLog(store: DurableMatchStore): Promise<IMatchMeta> {
  const meta: IMatchMeta = {
    matchId: MATCH_ID,
    hostPlayerId: 'gm-1',
    playerIds: ['gm-1', 'player-2'],
    sideAssignments: [
      { playerId: 'gm-1', side: 'player' },
      { playerId: 'player-2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
  await store.createMatch(meta);
  const unit = {
    id: 'u-p1',
    name: 'u-p1',
    side: GameSide.Player,
    unitRef: 'u-p1',
    pilotRef: 'p1',
    gunnery: 4,
    piloting: 5,
  };
  let session = createGameSession(
    { mapRadius: 4, turnLimit: 5, victoryConditions: [], optionalRules: [] },
    [unit],
    { id: MATCH_ID, createdAt: AT },
  );
  session = advancePhase(advancePhase(startGame(session, GameSide.Player)));
  // One command batch, so the S1 mirror writes the journal as it does
  // for a live command at mode enabled.
  const committed = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'play-log',
    actorId: meta.hostPlayerId,
    expectedRevision: 0,
    events: session.events,
  });
  expect(committed.kind).toBe('committed');
  return meta;
}
