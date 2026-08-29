/**
 * ServerMatchHost journal-authority path (adopt-combat-event-journal-authority
 * task 2.3). Flag OFF is the 2.1 digest lock; this file owns flag ON.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
import { COMBAT_JOURNAL_AUTHORITY_ENABLED } from '../matchJournalAuthority';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const MATCH_ID = 'match-journal-authority';

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
  readonly journalAuthority?: boolean;
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
    journalAuthority: options.journalAuthority,
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store };
}

async function drive(host: ServerMatchHost): Promise<void> {
  await host.handleIntent(intent('lock-1', host.matchId));
  await host.handleIntent(intent('lock-2', host.matchId));
  await host.handleIntent(intent('lock-3', host.matchId));
}

async function eventSignature(host: ServerMatchHost): Promise<string[]> {
  const events = await host.getEventsFromSeq(0);
  return events.map((event) => `${event.sequence}:${event.type}`);
}

function postStateDigest(host: ServerMatchHost): string {
  return digestCommandPostState(host.getSessionForTests());
}

const LOCK_SIGNATURE = [
  '0:game_created',
  '1:game_started',
  '2:initiative_rolled',
  '3:initiative_order_set',
  '4:phase_changed',
  '5:movement_locked',
  '6:movement_locked',
  '7:phase_changed',
  '8:attack_locked',
  '9:attack_locked',
  '10:attacks_revealed',
  '11:phase_changed',
];

const LOCK_DIGEST =
  '164f29962e280bee5b09130ed0ff5b37475df5a2afe4d267aca665e76c4b5262';

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

describe('combat journal-authority path', () => {
  afterEach(() => {
    matchJournalAuthority._setApplyCommittedForTests(null);
  });

  it('FLAG: the process-wide switch is off', () => {
    expect(COMBAT_JOURNAL_AUTHORITY_ENABLED).toBe(false);
  });

  it('FLAG ON happy path: lock signature, digest, and receipt expected digest', async () => {
    const { host, store } = await makeHost({ journalAuthority: true });
    await drive(host);

    expect(await eventSignature(host)).toEqual(LOCK_SIGNATURE);
    expect(postStateDigest(host)).toBe(LOCK_DIGEST);
    const receipt = await store.getCommandReceipt!(host.matchId, 'lock-1');
    expect(receipt?.expectedPostStateDigest).toEqual(expect.any(String));
    expect(receipt?.expectedPostStateDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.getCommandReceipt!(host.matchId, 'lock-3')).toEqual(
      expect.objectContaining({
        commandId: 'lock-3',
        expectedPostStateDigest: LOCK_DIGEST,
      }),
    );
  });

  it('STARTED FACT: written once on the first commit; later commands leave it', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-started-once',
      journalAuthority: true,
    });
    await host.handleIntent(intent('lock-1', host.matchId));
    const first = await store.getJournalAuthorityStarted!(host.matchId);
    expect(first).not.toBeNull();
    expect(first?.commandId).toBe('lock-1');
    expect(first?.firstRevision).toBe(2);
    expect(first?.head.digest).toEqual(expect.any(String));

    await host.handleIntent(intent('lock-2', host.matchId));
    const second = await store.getJournalAuthorityStarted!(host.matchId);
    expect(second).toEqual(first);
  });

  it('CONSUME-NOT-REDISPATCH: flag-on dice stream matches flag-off', async () => {
    const off = await makeHost({
      matchId: 'match-dice-off',
      journalAuthority: false,
    });
    const on = await makeHost({
      matchId: 'match-dice-on',
      journalAuthority: true,
    });
    await drive(off.host);
    await drive(on.host);

    expect(await eventSignature(on.host)).toEqual(
      await eventSignature(off.host),
    );
    expect(postStateDigest(on.host)).toBe(postStateDigest(off.host));
    const offInitiative = off.host
      .getSessionForTests()
      .events.find((event) => event.type === 'initiative_rolled');
    const onInitiative = on.host
      .getSessionForTests()
      .events.find((event) => event.type === 'initiative_rolled');
    const offRolls = offInitiative?.payload as {
      playerRoll?: number;
      opponentRoll?: number;
    };
    const onRolls = onInitiative?.payload as {
      playerRoll?: number;
      opponentRoll?: number;
    };
    expect(on.host.hasDetectedDivergence()).toBe(false);
    expect(onRolls.playerRoll).toBe(offRolls.playerRoll);
    expect(onRolls.opponentRoll).toBe(offRolls.opponentRoll);
  });

  it('DIVERGENCE: corrupt apply blocks publication, trips diagnostic, keeps batch', async () => {
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
      matchId: 'match-diverge',
      journalAuthority: true,
    });
    const socket = makeMockSocket();
    host.attachSocket(socket, 'host-player');
    const eventsBefore = (await store.getEvents(host.matchId)).length;

    const messages = await host.handleIntent(intent('lock-1', host.matchId));

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
      await store.getCommandReceipt!(host.matchId, 'lock-1'),
    ).not.toBeNull();
    expect(host.getSessionForTests().currentState.turn).toBeLessThan(90);
  });

  it('CONFLICT: stale store head is a sequence-conflict; live state untouched', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-conflict',
      journalAuthority: true,
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
