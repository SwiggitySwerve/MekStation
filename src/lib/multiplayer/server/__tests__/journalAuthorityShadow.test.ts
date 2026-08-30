/**
 * Journal-authority shadow comparison (adopt-combat-event-journal-authority
 * task 4.1). Legacy remains the sole author; the decide path is compare-only.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GameSide,
  MovementType,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  compareJournalAuthorityShadow,
  _setShadowAudienceStateForTests,
  _setShadowDecideForTests,
  _setShadowReplayRollsForTests,
} from '../journalAuthorityShadow';
import * as matchJournalAuthority from '../matchJournalAuthority';
import {
  COMBAT_JOURNAL_AUTHORITY_ENABLED,
  COMBAT_JOURNAL_AUTHORITY_MODE,
} from '../matchJournalAuthority';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { buildHostSession } from '../ServerMatchHostBootstrap';
import {
  decideCommandBatch,
  digestCommandPostState,
  type IDecideCommandBatchDeps,
} from '../ServerMatchHostDecision';
import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

const MATCH_ID = 'match-journal-shadow';

const ADVANCE: IIntent['intent'] = { kind: 'AdvancePhase' };
const CONCEDE: IIntent['intent'] = { kind: 'Concede', side: GameSide.Player };

const DEPS: IDecideCommandBatchDeps = {
  randomSeed: 42,
  diceSeed: 42,
};

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
    intent: ADVANCE,
  } as unknown as IIntent;
}

function concedeIntent(intentId: string, matchId = MATCH_ID): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: CONCEDE,
  } as unknown as IIntent;
}

async function makeHost(options: {
  readonly matchId?: string;
  readonly journalAuthority?: boolean;
  readonly fogOfWar?: boolean;
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
    config: {
      mapRadius: 4,
      turnLimit: 5,
      ...(options.fogOfWar === true ? { fogOfWar: true } : {}),
    },
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
    journalAuthority: options.journalAuthority,
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

async function drive(host: ServerMatchHost): Promise<void> {
  await host.handleIntent(intent('lock-1', host.matchId));
  await host.handleIntent(intent('lock-2', host.matchId));
  await host.handleIntent(intent('lock-3', host.matchId));
}

function makeLive() {
  return buildHostSession({
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
    diceSeed: 42,
  });
}

function snapshot(session: ReturnType<typeof makeLive>['session']) {
  const live = session.getSession();
  return {
    eventCount: live.events.length,
    digest: digestCommandPostState(live),
    eventIds: live.events.map((event) => event.id),
    sessionObject: live,
  };
}

function makeRecordingSocket(): IMatchSocket & { sent: unknown[] } {
  const sent: unknown[] = [];
  const socket = {
    send(data: string) {
      sent.push(JSON.parse(data) as unknown);
    },
    close() {},
    readyState: 1,
    sent,
  };
  return socket as IMatchSocket & { sent: unknown[] };
}

/**
 * Envelope ts, event id/timestamp, and gameId are minted per host;
 * they cannot be byte-equal across two matches. Strip those mint
 * fields, keep the rest of the outbound list.
 */
function canonicalizeOutbound(messages: readonly unknown[]): string {
  return JSON.stringify(messages.map((message) => stripMintFields(message)));
}

function stripMintFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripMintFields);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (
        key === 'ts' ||
        key === 'id' ||
        key === 'timestamp' ||
        key === 'gameId'
      ) {
        continue;
      }
      out[key] = stripMintFields(entry);
    }
    return out;
  }
  return value;
}

describe('combat journal-authority shadow', () => {
  afterEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    _setShadowReplayRollsForTests(null);
    _setShadowDecideForTests(null);
    _setShadowAudienceStateForTests(null);
  });

  it('FLAG: process-wide mode is off and enabled is derived false', () => {
    // Falsification: expect(COMBAT_JOURNAL_AUTHORITY_MODE).toBe('shadow')
    expect(COMBAT_JOURNAL_AUTHORITY_MODE).toBe('off');
    // Falsification: expect(COMBAT_JOURNAL_AUTHORITY_ENABLED).toBe(true)
    expect(COMBAT_JOURNAL_AUTHORITY_ENABLED).toBe(false);
  });

  it('SANDBOX EQUAL: fog-on shadow comparison matches GM and both player projections', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    const { host } = await makeHost({
      matchId: 'match-shadow-equal',
      fogOfWar: true,
    });
    await host.handleIntent(intent('lock-1', host.matchId));

    const record = host.getLastShadowComparison();
    expect(record).not.toBeNull();
    // Falsification: expect(record?.equal).toBe(false)
    expect(record?.equal).toBe(true);
    expect(record?.eventCountLive).toBe(record?.eventCountShadow);
    expect(record?.liveDigest).toBe(record?.shadowDigest);
    expect(record?.liveDigest).toMatch(/^[0-9a-f]{64}$/);
    // Production sandbox deployment is the separate mode flip to `enabled`.
    // Falsification: remove an audience from the comparison loop.
    expect(record?.audienceDigests?.map((digest) => digest.audience)).toEqual([
      'gm',
      'player:host-player',
      'player:guest-player',
    ]);
    expect(record?.audienceDigests?.every((digest) => digest.equal)).toBe(true);
    expect(host.getShadowComparisonStats()).toEqual({
      comparisons: 1,
      mismatches: 0,
    });
  });

  it('FOG STATE: equal event and authority digests still reject a changed player projection', () => {
    const { session } = makeLive();
    dispatchToEngine(session, ADVANCE);
    const headIndex = session.getSession().events.length;
    expect(Object.keys(session.getSession().currentState.units)).toContain(
      'lock-player',
    );
    const liveDigest = digestCommandPostState(session.getSession());
    const movement: IGameEvent = {
      id: 'shadow-fog-event',
      gameId: session.getSession().id,
      sequence: 1,
      timestamp: '2026-06-30T12:00:00.000Z',
      turn: session.getSession().currentState.turn,
      phase: session.getSession().currentState.phase,
      type: GameEventType.MovementDeclared,
      actorId: 'lock-player',
      payload: {
        unitId: 'lock-player',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        movementType: MovementType.Walk,
        mpUsed: 1,
        steps: [],
      },
    };
    _setShadowDecideForTests(() => ({
      events: [movement],
      postStateDigest: liveDigest,
    }));
    _setShadowAudienceStateForTests((state) => ({
      ...state,
      // This seam corrupts scratch-only visibility ownership. Events and
      // authority state digest still match, but Player 1 must no longer see
      // their actor-only movement event.
      sideAssignments: [
        { playerId: 'guest-player', side: 'player' },
        { playerId: 'host-player', side: 'opponent' },
      ],
    }));

    const record = compareJournalAuthorityShadow({
      liveSession: session,
      headIndex,
      liveEvents: [movement],
      intent: ADVANCE,
      intentId: 'lock-fog-state',
      decideDeps: DEPS,
      audience: {
        gmPlayerId: 'gm-player',
        playerIds: ['host-player', 'guest-player'],
        config: { fogOfWar: true },
        sideAssignments: [
          { playerId: 'host-player', side: 'player' },
          { playerId: 'guest-player', side: 'opponent' },
        ],
      },
    });

    // Falsification: make audienceDigest ignore its state argument.
    expect(record.liveDigest).toBe(record.shadowDigest);
    expect(record.equal).toBe(false);
    expect(record.reason).toBe('audience-digest-mismatch:player:host-player');
    expect(
      record.audienceDigests?.find(
        (digest) => digest.audience === 'player:host-player',
      )?.equal,
    ).toBe(false);
  });

  it('MISMATCH: corrupt decide is recorded and does not alter the command', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    _setShadowDecideForTests(() => ({
      events: [],
      postStateDigest:
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    }));
    const { host, store } = await makeHost({
      matchId: 'match-shadow-mismatch',
    });
    const socket = makeRecordingSocket();
    host.attachSocket(socket, 'host-player');
    const eventsBefore = (await store.getEvents(host.matchId)).length;

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

    const record = host.getLastShadowComparison();
    // Falsification: expect(record?.equal).toBe(true)  (or compare liveDigest to itself)
    expect(record?.equal).toBe(false);
    expect(record?.reason).toEqual(expect.any(String));
    expect(host.getShadowComparisonStats().mismatches).toBe(1);
    expect(messages.some((message) => message.kind === 'Event')).toBe(true);
    expect(messages.some((message) => message.kind === 'Error')).toBe(false);
    expect((await store.getEvents(host.matchId)).length).toBeGreaterThan(
      eventsBefore,
    );
    expect(host.hasDetectedDivergence()).toBe(false);
  });

  it('ROLL-EXHAUSTION: extra scratch d6 is a recorded divergence, not a throw', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    _setShadowReplayRollsForTests([]);
    _setShadowDecideForTests((_session, _intent, deps) => {
      deps.d6Roller!();
      return {
        events: [],
        postStateDigest:
          '0000000000000000000000000000000000000000000000000000000000000000',
      };
    });
    const { host } = await makeHost({ matchId: 'match-shadow-exhaust' });

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

    const record = host.getLastShadowComparison();
    // Falsification: omit the catch and let the roller throw out of handleIntent
    expect(record?.equal).toBe(false);
    expect(record?.reason).toBe('roll-exhaustion');
    expect(messages.some((message) => message.kind === 'Error')).toBe(false);
    expect(messages.some((message) => message.kind === 'Event')).toBe(true);
  });

  it('NO DUAL-AUTHORING: shadowed command does not write journal artifacts', async () => {
    const off = await makeHost({ matchId: 'match-shadow-append-off' });
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    const shadow = await makeHost({ matchId: 'match-shadow-append-on' });
    const batchSpy = jest.spyOn(shadow.store, 'appendCommandBatch');

    await drive(off.host);
    await drive(shadow.host);

    // Falsification: append the decided batch inside the shadow compare
    expect(batchSpy).not.toHaveBeenCalled();
    expect(
      await shadow.store.getJournalAuthorityStarted!(shadow.host.matchId),
    ).toBeNull();
    expect(
      await shadow.store.getCommandReceipt!(shadow.host.matchId, 'lock-1'),
    ).toBeNull();
    expect(
      await shadow.store.listPendingPublications(shadow.host.matchId),
    ).toEqual([]);
    expect((await shadow.store.getEvents(shadow.host.matchId)).length).toBe(
      (await off.store.getEvents(off.host.matchId)).length,
    );
  });

  it('NO TERMINAL OUTBOX: shadow-only terminal comparison leaves no authority row', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    const { host, store } = await makeHost({
      matchId: 'match-shadow-terminal-outbox',
    });

    await host.handleIntent(concedeIntent('shadow-terminal', host.matchId));

    // Falsification: route shadow's decided terminal outcome into the batch.
    expect(await store.getCombatOutcomeOutbox(host.matchId)).toBeNull();
  });

  it('NO LIVE MUTATION: compare leaves live digest, log, identity, and capture', () => {
    const { session, captureRef } = makeLive();
    const headIndex = session.getSession().events.length;
    dispatchToEngine(session, ADVANCE);
    const liveEvents = session.getSession().events.slice(headIndex);
    const before = snapshot(session);
    const captureBefore = captureRef.current;
    const capturedRolls = captureBefore.getCaptured();

    const record = compareJournalAuthorityShadow({
      liveSession: session,
      headIndex,
      liveEvents,
      intent: ADVANCE,
      intentId: 'lock-iso',
      decideDeps: DEPS,
    });

    const after = snapshot(session);
    // Falsification: pass `session` into dispatchToEngine inside compare
    expect(after.eventCount).toBe(before.eventCount);
    expect(after.digest).toBe(before.digest);
    expect(after.eventIds).toEqual(before.eventIds);
    expect(after.sessionObject).toBe(before.sessionObject);
    expect(captureRef.current).toBe(captureBefore);
    expect(captureRef.current.getCaptured()).toEqual(capturedRolls);
    expect(record.intentId).toBe('lock-iso');
  });

  it('NO WIRE CHANGE: shadow outbound list matches mode off', async () => {
    const off = await makeHost({ matchId: 'match-shadow-wire' });
    const offSocket = makeRecordingSocket();
    off.host.attachSocket(offSocket, 'host-player');
    const offMessages: unknown[] = [];
    for (const id of ['lock-1', 'lock-2', 'lock-3']) {
      offMessages.push(
        ...(await off.host.handleIntent(intent(id, off.host.matchId))),
      );
    }

    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    const shadow = await makeHost({ matchId: 'match-shadow-wire' });
    const shadowSocket = makeRecordingSocket();
    shadow.host.attachSocket(shadowSocket, 'host-player');
    const shadowMessages: unknown[] = [];
    for (const id of ['lock-1', 'lock-2', 'lock-3']) {
      shadowMessages.push(
        ...(await shadow.host.handleIntent(intent(id, shadow.host.matchId))),
      );
    }

    // Falsification: broadcast a shadow diagnostic frame onto the wire
    expect(canonicalizeOutbound(shadowMessages)).toBe(
      canonicalizeOutbound(offMessages),
    );
    expect(canonicalizeOutbound(shadowSocket.sent)).toBe(
      canonicalizeOutbound(offSocket.sent),
    );
    expect(shadow.host.getShadowComparisonStats().comparisons).toBe(3);
    expect(off.host.getLastShadowComparison()).toBeNull();
  });

  it('decideCommandBatch is still used for the equal path (sanity)', () => {
    const { session } = makeLive();
    const decided = decideCommandBatch(session, ADVANCE, DEPS);
    expect(decided.events.length).toBeGreaterThan(0);
    expect(decided.postStateDigest).toMatch(/^[0-9a-f]{64}$/);
  });
});
