/**
 * ServerMatchHost journal-authority path (adopt-combat-event-journal-authority
 * task 2.3). Flag OFF is the 2.1 digest lock; this file owns flag ON.
 */

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  MovementType,
  GameEventType,
  GamePhase,
  GameSide,
  type IGameUnit,
} from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { getActivePhaseUnitId } from '@/utils/gameplay/gameSessionActivation';
import {
  appendEvent,
  hydrateGameSessionFromEvents,
} from '@/utils/gameplay/gameSessionCore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
import { COMBAT_JOURNAL_AUTHORITY_ENABLED } from '../matchJournalAuthority';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';
import { createPersistedHost } from './matchHostPersistence.test-helpers';

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
  readonly journalAuthority: boolean;
  readonly declarationFixture?: boolean;
  readonly empFixture?: boolean;
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
  const gameUnits = twoSidedRoster();
  const adaptedUnits: IAdaptedUnit[] = options.declarationFixture
    ? Object.values(
        createGameSession(
          {
            mapRadius: 7,
            turnLimit: 5,
            victoryConditions: [],
            optionalRules: [],
          },
          gameUnits,
        ).currentState.units,
      ).map((unit) => ({
        ...unit,
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        weapons: [
          {
            id: 'laser',
            name: 'Medium Laser',
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
            minRange: 0,
            damage: 5,
            heat: 3,
            ammoPerTon: -1,
            destroyed: false,
          },
        ],
      }))
    : [];
  const host = await createPersistedHost(() => {
    if (options.empFixture) {
      let session = startGame(
        createGameSession(
          {
            mapRadius: 4,
            turnLimit: 5,
            victoryConditions: [],
            optionalRules: [],
          },
          gameUnits,
          { id: matchId },
        ),
        GameSide.Player,
      );
      for (const entry of [
        {
          type: GameEventType.PhaseChanged,
          payload: {
            fromPhase: session.currentState.phase,
            toPhase: GamePhase.Heat,
          },
        },
        {
          type: GameEventType.EmpMinefieldEffectApplied,
          payload: {
            unitId: 'lock-player',
            hex: { q: 0, r: 0 },
            roll: 9,
            modifier: 0,
            modifiedRoll: 9,
            effect: 'shutdown',
            durationTurns: 2,
            source: 'minefield',
          },
        },
      ]) {
        session = appendEvent(session, {
          ...createEventBase(
            session.id,
            session.events.length,
            entry.type,
            session.currentState.turn,
            GamePhase.Heat,
            'lock-player',
          ),
          payload: entry.payload,
        });
      }
      const interactive = InteractiveSession.fromHydratedSession(session, {
        random: new SeededRandom(42),
        d6Roller: () => 6,
      });
      return new ServerMatchHost(matchId, store, interactive, undefined, {
        journalAuthority: options.journalAuthority,
        randomSeed: 42,
        diceSeed: 42,
      });
    }
    return ServerMatchHost.create(matchId, store, {
      mapRadius: options.declarationFixture ? 7 : 4,
      turnLimit: 5,
      random: new SeededRandom(42),
      randomSeed: 42,
      grid: createMinimalGrid(options.declarationFixture ? 7 : 4),
      playerUnits: adaptedUnits.filter((unit) => unit.side === GameSide.Player),
      opponentUnits: adaptedUnits.filter(
        (unit) => unit.side === GameSide.Opponent,
      ),
      gameUnits,
      diceSeed: 42,
      journalAuthority: options.journalAuthority,
    });
  });
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
  beforeEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('off');
  });

  afterEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._setApplyCommittedForTests(null);
  });

  it.each([false, true])(
    'C10 persists EMP-gated heat resolution (journal=%s)',
    async (journalAuthority) => {
      const { host, store } = await makeHost({
        journalAuthority,
        empFixture: true,
      });
      try {
        expect(host.isJournalAuthorityEnabled()).toBe(journalAuthority);
        const before = host.getSessionForTests().events.length;
        const messages = await host.handleIntent(intent('c10-heat'));
        expect(messages.filter((message) => message.kind === 'Error')).toEqual(
          [],
        );
        expect(messages.some((message) => message.kind === 'Event')).toBe(true);
        expect(
          host.getSessionForTests().currentState.units['lock-player'],
        ).toMatchObject({
          shutdown: true,
          empShutdownTurns: 2,
        });
        const events = await store.getEvents(host.matchId);
        expect(
          events
            .slice(before)
            .filter(
              (e) =>
                e.type === GameEventType.StartupAttempt ||
                e.type === GameEventType.ShutdownCheck,
            ),
        ).toEqual([]);
        expect(events.map((event) => event.type)).toEqual(
          host.getSessionForTests().events.map((event) => event.type),
        );
        expect(
          hydrateGameSessionFromEvents(host.matchId, events).currentState.units,
        ).toEqual(host.getSessionForTests().currentState.units);
        expect(host.hasDetectedDivergence()).toBe(false);
      } finally {
        await host.closeMatch();
      }
    },
  );

  it.each(
    [false, true].flatMap((journalAuthority) =>
      (['Attack', 'Physical'] as const).map((kind) => ({
        journalAuthority,
        kind,
      })),
    ),
  )(
    'refuses fresh-ID $kind without events, batches, or receipts (journal=$journalAuthority)',
    async ({ journalAuthority, kind }) => {
      const { host, store } = await makeHost({
        journalAuthority,
        declarationFixture: true,
      });
      const send = (
        intentId: string,
        payload: IIntent['intent'],
        playerId = 'host-player',
      ) =>
        host.handleIntent({ ...intent(intentId), playerId, intent: payload });
      await send('initiative', { kind: 'AdvancePhase' });
      await send('move-player', {
        kind: 'Move',
        unitId: 'lock-player',
        to: { q: -2, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Run,
      });
      await send(
        'move-opponent',
        {
          kind: 'Move',
          unitId: 'lock-opponent',
          to: { q: -2, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Run,
        },
        'guest-player',
      );
      await send('weapon-phase', { kind: 'AdvancePhase' });
      let attackerId = 'lock-player';
      let targetId = 'lock-opponent';
      if (kind === 'Physical') {
        await send('physical-phase', { kind: 'AdvancePhase' });
        expect(host.getSessionForTests().currentState.phase).toBe(
          GamePhase.PhysicalAttack,
        );
        attackerId = getActivePhaseUnitId(host.getSessionForTests())!;
        targetId =
          attackerId === 'lock-player' ? 'lock-opponent' : 'lock-player';
      }
      const playerId =
        attackerId === 'lock-player' ? 'host-player' : 'guest-player';
      const payload: IIntent['intent'] =
        kind === 'Attack'
          ? { kind, attackerId, targetId, weaponIds: ['laser'] }
          : {
              kind,
              attackerId,
              targetId,
              attackType: 'punch',
              limb: 'leftArm',
            };
      const first = await send('first-declaration', payload, playerId);
      expect(first.some((message) => message.kind === 'Error')).toBe(false);
      expect(
        host
          .getSessionForTests()
          .events.filter(
            (event) =>
              event.type ===
              (kind === 'Attack'
                ? GameEventType.AttackDeclared
                : GameEventType.PhysicalAttackDeclared),
          ),
      ).toHaveLength(1);
      const before = JSON.stringify(host.getSessionForTests());
      const storedBefore = await store.getEvents(host.matchId);
      const appendBatch = jest.spyOn(store, 'appendCommandBatch');
      const duplicate = await send('fresh-duplicate', payload, playerId);
      expect(duplicate).toEqual([
        expect.objectContaining({
          kind: 'Error',
          code: 'INVALID_INTENT',
          reason: 'Intent could not be applied.',
          intentId: 'fresh-duplicate',
        }),
      ]);
      expect(JSON.stringify(host.getSessionForTests())).toBe(before);
      expect(await store.getEvents(host.matchId)).toEqual(storedBefore);
      expect(appendBatch).not.toHaveBeenCalled();
      expect(
        await store.getCommandReceipt(host.matchId, 'fresh-duplicate'),
      ).toBeNull();
      const retry = await send('first-declaration', payload, playerId);
      if (journalAuthority)
        expect(retry.some((message) => message.kind === 'Error')).toBe(false);
      else
        expect(retry).toEqual([
          expect.objectContaining({ kind: 'Error', code: 'DUPLICATE_INTENT' }),
        ]);
      expect(await store.getEvents(host.matchId)).toEqual(storedBefore);
      appendBatch.mockRestore();
      await host.closeMatch();
    },
  );

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

  it('STARTED FACT: no command writes one; the receipts are what commit', async () => {
    // Task 1.3, sub-prefix 3 retired the marker write. This row used to
    // assert the write happened once and stayed put; it now asserts the
    // stronger successor property - it never happens - while keeping
    // the part that always mattered, that each command still commits
    // its own receipt at its own revisions.
    const { host, store } = await makeHost({
      matchId: 'match-started-once',
      journalAuthority: true,
    });
    await host.handleIntent(intent('lock-1', host.matchId));
    expect(await store.getJournalAuthorityStarted!(host.matchId)).toBeNull();
    const first = await store.getCommandReceipt!(host.matchId, 'lock-1');
    expect(first?.firstRevision).toBe(2);

    await host.handleIntent(intent('lock-2', host.matchId));
    expect(await store.getJournalAuthorityStarted!(host.matchId)).toBeNull();
    const second = await store.getCommandReceipt!(host.matchId, 'lock-2');
    expect(second?.firstRevision).toBe((first?.lastRevision ?? -1) + 1);
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
          reason: 'Unable to process the command.',
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
          reason: 'Unable to save the command.',
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
