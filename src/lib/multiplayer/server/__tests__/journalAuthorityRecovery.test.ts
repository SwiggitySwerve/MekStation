/**
 * Journal-authority recovery contract (adopt-combat-event-journal-authority
 * task 2.4). 2.3's path suite and the digest lock stay in their own
 * files; this file owns the typed recovery result and the three faults.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
import { rebuildSessionFromEvents } from '../MatchRecovery';
import { selectMatchRollbackReader } from '../matchRollbackReaderSelection';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-journal-recovery';

function twoSidedRoster(): IGameUnit[] {
  return [
    {
      id: 'lock-player',
      name: 'lock-player',
      side: GameSide.Player,
      unitRef: 'lock-player',
      pilotRef: 'lock-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'lock-opponent',
      name: 'lock-opponent',
      side: GameSide.Opponent,
      unitRef: 'lock-opponent',
      pilotRef: 'lock-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function intent(intentId: string, matchId = MATCH_ID): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

async function makeHost(options: {
  readonly matchId?: string;
}): Promise<{ host: ServerMatchHost; store: InMemoryMatchStore }> {
  const matchId = options.matchId ?? MATCH_ID;
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' },
      { playerId: 'guest-player', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
    diceSeed: 42,
    journalAuthority: true,
  });
  const deadline = Date.now() + 1000;
  while ((await store.getEvents(matchId)).length < 2) {
    if (Date.now() > deadline) {
      throw new Error('initial events did not persist');
    }
    await Promise.resolve();
  }
  return { host, store };
}

function postStateDigest(host: ServerMatchHost): string {
  return digestCommandPostState(host.getSessionForTests());
}

function makeMockSocket(): IMatchSocket & { sent: { kind: string }[] } {
  const sent: { kind: string }[] = [];
  const socket = {
    send(data: string) {
      sent.push(JSON.parse(data) as { kind: string });
    },
    close() {},
    readyState: 1,
    sent,
  };
  return socket as IMatchSocket & { sent: { kind: string }[] };
}

function initiativeRolls(host: ServerMatchHost): {
  playerRoll: number | undefined;
  opponentRoll: number | undefined;
} {
  const rolled = host
    .getSessionForTests()
    .events.find((event) => event.type === 'initiative_rolled');
  const payload = rolled?.payload as {
    playerRoll?: number;
    opponentRoll?: number;
  };
  return {
    playerRoll: payload?.playerRoll,
    opponentRoll: payload?.opponentRoll,
  };
}

async function rebuildHost(
  store: InMemoryMatchStore,
  matchId: string,
): Promise<ServerMatchHost> {
  const events = await store.getEvents(matchId);
  const session = InteractiveSession.fromHydratedSession(
    hydrateGameSessionFromEvents(matchId, [...events]),
    { random: new SeededRandom(42) },
  );
  return ServerMatchHost.recover(matchId, store, session);
}

async function dumpRollbackFacts(
  store: InMemoryMatchStore,
  matchId: string,
  commandId: string,
): Promise<string> {
  return JSON.stringify({
    events: await store.getEvents(matchId),
    receipt: await store.getCommandReceipt(matchId, commandId),
    baseline: store.getJournalAuthorityBaseline(matchId),
    started: await store.getJournalAuthorityStarted(matchId),
    meta: await store.getMatchMeta(matchId),
  });
}

function failNextAppend(store: InMemoryMatchStore, reason: string): void {
  const original = store.appendCommandBatch.bind(store);
  let failed = false;
  store.appendCommandBatch = async (matchId, batch) => {
    if (!failed) {
      failed = true;
      throw new Error(reason);
    }
    return original(matchId, batch);
  };
}

describe('combat journal-authority recovery', () => {
  beforeEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._setApplyCommittedForTests(null);
    matchJournalAuthority._setSkipPublishForTests(false);
  });
  afterEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._setApplyCommittedForTests(null);
    matchJournalAuthority._setSkipPublishForTests(false);
  });

  it('PERSISTENCE: store throw after decide is typed, no frame, live untouched, retry commits', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-persist-fail',
    });
    const socket = makeMockSocket();
    host.attachSocket(socket, 'host-player');
    const before = postStateDigest(host);
    const liveEvents = host.getSessionForTests().events.length;
    failNextAppend(store, 'disk full');

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

    expect(host.getLastJournalRecovery()).toEqual({
      kind: 'persistence-failure',
      reason: 'disk full',
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'Error',
          code: 'STORE_FAILURE',
          reason: 'disk full',
        }),
      ]),
    );
    expect(messages.some((message) => message.kind === 'Event')).toBe(false);
    expect(socket.sent.some((frame) => frame.kind === 'Event')).toBe(false);
    expect(postStateDigest(host)).toBe(before);
    expect(host.getSessionForTests().events.length).toBe(liveEvents);
    expect(await store.getCommandReceipt(host.matchId, 'lock-1')).toBeNull();

    const retry = await host.handleIntent(intent('lock-1', host.matchId));

    expect(host.getLastJournalRecovery()).toBeNull();
    expect(retry.some((message) => message.kind === 'Event')).toBe(true);
    expect(
      await store.getCommandReceipt(host.matchId, 'lock-1'),
    ).not.toBeNull();
  });

  it('DICE: a persistence-failure retry is a new decision; rolls are stamped in the committed batch', async () => {
    // 2.3 recorded that decide consumes the live capture, so the shared
    // roller has already advanced when append fails. This row MEASURES
    // whether a retry then produces a different (but internally
    // consistent, stamped) batch than a clean first attempt.
    //
    // Truth: the retry's committed initiative rolls differ from a clean
    // first-attempt host with the same seed. That is acceptable-by-design:
    // rolls are stamped in the committed batch; a persistence-failure
    // never became a fact; the retry is a NEW decision. Live engine
    // state is untouched across the failed decide, so the new decision
    // is internally consistent. Idempotent retry (return the prior
    // receipt) applies only after a commit (1.1 / Combat Command Retry
    // Is Idempotent). Resetting the cursor here would violate 2.2's L1
    // law that decide continues the match dice cursor.
    const failing = await makeHost({ matchId: 'match-dice-fail' });
    failNextAppend(failing.store, 'disk full');
    await failing.host.handleIntent(intent('lock-1', failing.host.matchId));
    await failing.host.handleIntent(intent('lock-1', failing.host.matchId));

    const clean = await makeHost({ matchId: 'match-dice-clean' });
    await clean.host.handleIntent(intent('lock-1', clean.host.matchId));

    const failRetryRolls = initiativeRolls(failing.host);
    const cleanRolls = initiativeRolls(clean.host);
    expect(failRetryRolls).not.toEqual(cleanRolls);

    const receipt = await failing.store.getCommandReceipt(
      failing.host.matchId,
      'lock-1',
    );
    expect(receipt?.expectedPostStateDigest).toBe(
      postStateDigest(failing.host),
    );
    const initiative = failing.host
      .getSessionForTests()
      .events.find((event) => event.type === 'initiative_rolled');
    expect(initiative?.payload).toEqual(
      expect.objectContaining({
        rolls: expect.any(Array),
        playerRoll: failRetryRolls.playerRoll,
        opponentRoll: failRetryRolls.opponentRoll,
      }),
    );
  });

  it('CRASH: commit then die before publish; retry returns prior receipt and resumes delivery', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-crash-publish',
    });
    matchJournalAuthority._setSkipPublishForTests(true);
    await host.handleIntent(intent('lock-1', host.matchId));
    matchJournalAuthority._setSkipPublishForTests(false);

    const receipt = await store.getCommandReceipt(host.matchId, 'lock-1');
    expect(receipt).not.toBeNull();
    const eventsAfterCommit = await store.getEvents(host.matchId);
    const pending = await store.listPendingPublications(host.matchId);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.map((row) => row.commandId)).toEqual(
      expect.arrayContaining(['lock-1']),
    );

    const rebuilt = await rebuildHost(store, host.matchId);
    const socket = makeMockSocket();
    rebuilt.attachSocket(socket, 'host-player');

    const retry = await rebuilt.handleIntent(intent('lock-1', host.matchId));

    expect(await store.getCommandReceipt(host.matchId, 'lock-1')).toEqual(
      receipt,
    );
    expect(await store.getEvents(host.matchId)).toHaveLength(
      eventsAfterCommit.length,
    );
    const eventFrames = retry.filter((message) => message.kind === 'Event');
    expect({
      kinds: retry.map((message) => message.kind),
      codes: retry.map((message) =>
        'code' in message ? message.code : undefined,
      ),
      reasons: retry.map((message) =>
        'reason' in message ? message.reason : undefined,
      ),
      recovery: rebuilt.getLastJournalRecovery(),
    }).toEqual({
      kinds: pending.map(() => 'Event'),
      codes: pending.map(() => undefined),
      reasons: pending.map(() => undefined),
      recovery: null,
    });
    expect(eventFrames).toHaveLength(pending.length);
    expect(socket.sent.filter((frame) => frame.kind === 'Event')).toHaveLength(
      pending.length,
    );
    expect(await store.listPendingPublications(host.matchId)).toEqual([]);
    const sequences = eventFrames.map(
      (message) => (message as { event: { sequence: number } }).event.sequence,
    );
    expect(new Set(sequences).size).toBe(sequences.length);
  });

  it('POST-RECOVERY: a new command after crash-rebuild still decide/commit/publishes', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-post-recovery-cmd',
    });
    matchJournalAuthority._setSkipPublishForTests(true);
    await host.handleIntent(intent('lock-1', host.matchId));
    matchJournalAuthority._setSkipPublishForTests(false);

    const rebuilt = await rebuildHost(store, host.matchId);
    const socket = makeMockSocket();
    rebuilt.attachSocket(socket, 'host-player');
    await rebuilt.handleIntent(intent('lock-1', host.matchId));

    socket.sent.length = 0;
    const next = await rebuilt.handleIntent(intent('lock-2', host.matchId));

    expect(rebuilt.getLastJournalRecovery()).toBeNull();
    expect(next.some((message) => message.kind === 'Event')).toBe(true);
    expect(
      await store.getCommandReceipt(host.matchId, 'lock-2'),
    ).not.toBeNull();
    expect(socket.sent.some((frame) => frame.kind === 'Event')).toBe(true);
  });

  it.each(['off', 'shadow', 'enabled'] as const)(
    'ROLLBACK: %s mode cannot override a started fact or mutate durable facts',
    async (mode) => {
      const { host, store } = await makeHost({
        matchId: 'match-rollback-mode-off',
      });
      await host.handleIntent(intent('lock-1', host.matchId));
      const before = await dumpRollbackFacts(store, host.matchId, 'lock-1');
      const session = await rebuildSessionFromEvents(
        host.matchId,
        await store.getEvents(host.matchId),
      );

      matchJournalAuthority._setCombatJournalAuthorityModeForTests(mode);
      const recovered = await ServerMatchHost.recover(
        host.matchId,
        store,
        session,
      );

      expect(recovered.isJournalAuthorityEnabled()).toBe(true);
      expect(await dumpRollbackFacts(store, host.matchId, 'lock-1')).toBe(
        before,
      );
    },
  );

  it('ROLLBACK: a blocked recovery host returns a typed error and appends no command or effect', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-rollback-blocked',
    });
    const session = await rebuildSessionFromEvents(
      host.matchId,
      await store.getEvents(host.matchId),
    );
    const blocked = selectMatchRollbackReader({
      baseline: null,
      started: {
        matchId: host.matchId,
        commandId: 'lock-0',
        firstRevision: 0,
        lastRevision: 1,
        head: {
          streamType: 'match',
          streamId: host.matchId,
          branchId: 'main',
          revision: 1,
          digest: 'recorded-digest',
          effectiveGeneration: 1,
        },
        committedAt: '2026-08-29T00:00:00.000Z',
      },
      recordedHead: {
        streamType: 'match',
        streamId: host.matchId,
        branchId: 'main',
        revision: 1,
        digest: 'recorded-digest',
        effectiveGeneration: 1,
      },
      refoldedHead: {
        streamType: 'match',
        streamId: host.matchId,
        branchId: 'main',
        revision: 1,
        digest: 'refolded-digest',
        effectiveGeneration: 1,
      },
      supportedEffectiveGeneration: 1,
    });
    if (blocked.kind !== 'blocked') {
      throw new Error('expected a blocked rollback decision');
    }
    const recovered = new ServerMatchHost(
      host.matchId,
      store,
      session,
      undefined,
      {
        recovered: true,
        rollbackReader: blocked,
      },
    );
    const before = await store.getEvents(host.matchId);

    const messages = await recovered.handleIntent(
      intent('lock-blocked', host.matchId),
    );

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'Error',
          code: 'INTERNAL_ERROR',
          reason: 'rollback-reader-blocked:digest-mismatch',
        }),
      ]),
    );
    expect(await store.getEvents(host.matchId)).toEqual(before);
    expect(
      await store.getCommandReceipt(host.matchId, 'lock-blocked'),
    ).toBeNull();
  });

  it('DIVERGENCE: union carries both digests; publication still blocked and the commit stays', async () => {
    matchJournalAuthority._setApplyCommittedForTests(
      (live, committed, deps) => {
        const applied = matchJournalAuthority.foldCommittedEvents(
          live,
          committed,
          deps,
        );
        applied.applyCorrectedState({
          ...applied.getState(),
          turn: applied.getState().turn + 99,
        });
        return applied;
      },
    );

    const { host, store } = await makeHost({
      matchId: 'match-diverge-union',
    });
    const socket = makeMockSocket();
    host.attachSocket(socket, 'host-player');
    const eventsBefore = (await store.getEvents(host.matchId)).length;

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

    const recovery = host.getLastJournalRecovery();
    expect(recovery).toEqual(
      expect.objectContaining({
        kind: 'digest-divergence',
        rebuilt: true,
      }),
    );
    if (recovery?.kind !== 'digest-divergence') {
      throw new Error('expected digest-divergence');
    }
    expect(recovery.expectedDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(recovery.appliedDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(recovery.appliedDigest).not.toBe(recovery.expectedDigest);
    expect(host.hasDetectedDivergence()).toBe(true);
    expect(messages.some((message) => message.kind === 'Event')).toBe(false);
    expect(socket.sent.some((frame) => frame.kind === 'Event')).toBe(false);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'Error',
          code: 'INTERNAL_ERROR',
          reason: 'projection-divergence',
        }),
      ]),
    );
    expect((await store.getEvents(host.matchId)).length).toBeGreaterThan(
      eventsBefore,
    );
    expect(
      await store.getCommandReceipt(host.matchId, 'lock-1'),
    ).not.toBeNull();
    expect(host.getSessionForTests().currentState.turn).toBeLessThan(90);
  });

  it('CONFLICT: union carries the store revisions; live state untouched', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-conflict-union',
    });
    const socket = makeMockSocket();
    host.attachSocket(socket, 'host-player');
    const before = postStateDigest(host);
    const liveEvents = host.getSessionForTests().events.length;
    const stored = await store.getEvents(host.matchId);
    const extra = {
      ...stored[stored.length - 1],
      id: 'evt-stale-head',
      sequence: stored[stored.length - 1].sequence + 1,
    };
    await store.appendEvent(host.matchId, extra);

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

    expect(host.getLastJournalRecovery()).toEqual({
      kind: 'revision-conflict',
      expectedRevision: extra.sequence,
      actualRevision: extra.sequence + 1,
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'Error',
          code: 'STORE_FAILURE',
          reason: 'sequence-conflict',
        }),
      ]),
    );
    expect(messages.some((message) => message.kind === 'Event')).toBe(false);
    expect(socket.sent.some((frame) => frame.kind === 'Event')).toBe(false);
    expect(postStateDigest(host)).toBe(before);
    expect(host.getSessionForTests().events.length).toBe(liveEvents);
    expect(host.hasDetectedDivergence()).toBe(false);
  });
});
