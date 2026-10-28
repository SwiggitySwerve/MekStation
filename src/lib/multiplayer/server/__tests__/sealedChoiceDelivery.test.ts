import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay';
import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import spectateHandler from '@/pages/api/multiplayer/matches/[id]/spectate';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '../authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { getMatchHostRegistry } from '../MatchHostRegistry';
import {
  MATCH_WIRE_PUBLICATION_BOUNDARY,
  createMatchWireSealedChoiceAudienceContext,
} from '../projection';
import { sealedDeclarationsRevealedBy } from '../projection/MatchWireSealedChoices';
import { PendingPeerTracker } from '../reconnection/PendingPeerTracker';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import {
  handleLobbyIntent,
  type IServerMatchHostLobbyContext,
} from '../ServerMatchHostLobbyIntents';
import {
  handleGraceTimeout,
  type IServerMatchHostReconnectContext,
} from '../ServerMatchHostReconnectLifecycle';
import { sideOfPlayer } from '../sideAssignments';
import { fixtureIdentity } from './coopMissionCreate.fixture';
import {
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

const MATCH_ID = 'sealed-choice-delivery';

interface IRecordedSocket extends IMatchSocket {
  readonly sent: IServerMessage[];
}

function socket(): IRecordedSocket {
  const sent: IServerMessage[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data) as IServerMessage);
    },
    close() {},
    readyState: 1,
    sent,
  } as IRecordedSocket;
}

function adaptedUnit(
  id: string,
  side: GameSide,
  position: { readonly q: number; readonly r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  } as IAdaptedUnit;
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  } as IGameUnit;
}

function eventFrames(socketValue: IRecordedSocket): Array<{
  readonly deliverySequence?: number;
  readonly event?: {
    readonly id?: string;
    readonly payload?: unknown;
    readonly type?: string;
  };
}> {
  return socketValue.sent.filter(
    (
      message,
    ): message is IServerMessage & {
      readonly deliverySequence?: number;
      readonly event?: {
        readonly id?: string;
        readonly payload?: unknown;
        readonly type?: string;
      };
    } => message.kind === 'Event',
  );
}

function isMovementFinalization(event: {
  readonly type: GameEventType;
  readonly payload: unknown;
}): boolean {
  if (event.type !== GameEventType.PhaseChanged) return false;
  if (
    typeof event.payload !== 'object' ||
    event.payload === null ||
    Array.isArray(event.payload)
  ) {
    return false;
  }
  return Object.entries(event.payload).some(
    ([key, value]) => key === 'fromPhase' && value === GamePhase.Movement,
  );
}

async function intent(
  host: ServerMatchHost,
  playerId: string,
  intentId: string,
  action: IIntent['intent'],
): Promise<readonly IServerMessage[]> {
  return host.handleIntent(
    {
      kind: 'Intent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId,
      intentId,
      intent: action,
    },
    `connection-${playerId}`,
    playerId,
  );
}

/**
 * Every event a replay bundle delivered to one socket, flattened out of
 * its `ReplayChunk` pages. Replay is the surface that serves the
 * COMMITTED rows, so this is what a reveal has to agree with.
 */
function replayedEvents(socketValue: IRecordedSocket): Array<{
  readonly id?: string;
  readonly payload?: unknown;
  readonly type?: string;
}> {
  const out: Array<{
    readonly id?: string;
    readonly payload?: unknown;
    readonly type?: string;
  }> = [];
  for (const message of socketValue.sent as Array<{
    readonly kind?: string;
    readonly events?: Array<{
      readonly id?: string;
      readonly payload?: unknown;
      readonly type?: string;
    }>;
  }>) {
    if (message.kind !== 'ReplayChunk' || !Array.isArray(message.events)) {
      continue;
    }
    out.push(...message.events);
  }
  return out;
}

/** `spectator` adds a current spectator seat for `watcher` (B10). */
async function makeHost(
  options: {
    readonly spectator?: 'player' | 'gm';
    readonly teammates?: boolean;
  } = {},
): Promise<{
  readonly host: ServerMatchHost;
  readonly playerOne: IRecordedSocket;
  readonly playerTwo: IRecordedSocket;
  readonly store: InMemoryMatchStore;
  readonly watcher?: IRecordedSocket;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-08-30T00:00:00.000Z';
  const campaignId = 'camp-sealed-choice-delivery';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'player-one',
    playerIds: [
      'player-one',
      'player-two',
      ...(options.teammates ? ['ally-one', 'ally-two'] : []),
    ],
    sideAssignments: [
      ...(options.teammates
        ? [
            { playerId: 'ally-one', side: GameSide.Player },
            { playerId: 'ally-two', side: GameSide.Opponent },
          ]
        : []),
      { playerId: 'player-one', side: GameSide.Player },
      { playerId: 'player-two', side: GameSide.Opponent },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 5, fogOfWar: false },
    layout: '1v1',
    seats: defaultSeats(options.teammates ? '2v2' : '1v1').map((seat) => {
      if (seat.slotId === 'alpha-2' || seat.slotId === 'bravo-2')
        return {
          ...seat,
          occupant: {
            playerId: seat.slotId === 'alpha-2' ? 'ally-one' : 'ally-two',
            displayName: 'Ally',
          },
        };
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: 'player-one', displayName: 'Player one' },
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: 'player-two', displayName: 'Player two' },
        };
      }
      return seat;
    }),
    ...(options.spectator === 'gm'
      ? {
          coopCampaign: {
            campaignId,
            state: createEmptyCampaignState(campaignId),
          },
        }
      : {}),
  });
  if (options.spectator !== undefined) {
    const meta = await store.getMatchMeta(MATCH_ID);
    await store.updateMatchMeta(MATCH_ID, {
      seats: addSpectatorSeat(meta.seats ?? [], {
        playerId: 'watcher',
        displayName: 'Watcher',
      }),
    });
  }
  if (options.spectator === 'gm') {
    store.bindCampaignSessionParticipant({
      campaignId,
      sessionId: MATCH_ID,
      participantId: 'watcher',
      seat: 'gm',
      boundAt: now,
    });
  }
  const host = ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 6,
    turnLimit: 5,
    random: new SeededRandom(11),
    grid: createMinimalGrid(6),
    playerUnits: [adaptedUnit('unit-one', GameSide.Player, { q: 0, r: 0 })],
    opponentUnits: [adaptedUnit('unit-two', GameSide.Opponent, { q: 0, r: 3 })],
    gameUnits: [
      gameUnit('unit-one', GameSide.Player),
      gameUnit('unit-two', GameSide.Opponent),
    ],
    diceSeed: 11,
  });
  await Promise.resolve();
  await Promise.resolve();
  const playerOne = socket();
  const playerTwo = socket();
  host.attachSocket(playerOne, 'player-one');
  host.attachSocket(playerTwo, 'player-two');
  if (options.spectator === undefined) {
    return { host, playerOne, playerTwo, store };
  }
  const watcher = socket();
  host.attachSocket(watcher, 'watcher');
  return { host, playerOne, playerTwo, store, watcher };
}

/**
 * Drive a fresh host to the instant just after the movement phase
 * closes: player one declares (the sealed choice under test), player
 * two declares, and an `AdvancePhase` finalizes the phase - which is
 * the event that triggers the reveal. Returns the declaration as the
 * in-memory SESSION holds it, which is deliberately not asserted to be
 * the committed copy; that is what the caller is measuring.
 */
async function driveToMovementReveal(
  host: ServerMatchHost,
  beforeFinalize: () => void | Promise<void> = () => undefined,
): Promise<{
  readonly move: {
    readonly id: string;
    readonly payload: unknown;
    readonly sequence: number;
  };
}> {
  for (let step = 0; step < 3; step += 1) {
    if (host.getSessionForTests().currentState.phase === GamePhase.Movement) {
      break;
    }
    await intent(host, 'player-one', `to-movement-${step}`, {
      kind: 'AdvancePhase',
    });
  }
  const playerOnePosition =
    host.getSessionForTests().currentState.units['unit-one']?.position;
  if (playerOnePosition === undefined) {
    throw new Error('player one has no position');
  }
  await intent(host, 'player-one', 'move-one', {
    kind: 'Move',
    unitId: 'unit-one',
    to: { q: playerOnePosition.q, r: playerOnePosition.r - 1 },
    facing: Facing.North,
    movementType: 'walk',
  });
  const playerTwoPosition =
    host.getSessionForTests().currentState.units['unit-two']?.position;
  if (playerTwoPosition === undefined) {
    throw new Error('player two has no position');
  }
  await intent(host, 'player-two', 'move-two', {
    kind: 'Move',
    unitId: 'unit-two',
    to: { q: playerTwoPosition.q, r: playerTwoPosition.r + 1 },
    facing: Facing.South,
    movementType: 'walk',
  });
  // The caller's last chance to arrange the world before the event
  // that triggers the reveal commits.
  await beforeFinalize();
  await intent(host, 'player-one', 'finalize-movement', {
    kind: 'AdvancePhase',
  });
  const move = host
    .getSessionForTests()
    .events.find((event) => event.type === GameEventType.MovementDeclared);
  if (move === undefined) throw new Error('no movement declaration committed');
  return { move };
}

describe('sealed two-player tactical choices', () => {
  it('withholds a committed move without a delivery gap, then delivers its original after movement finalization', async () => {
    const { host, playerOne, playerTwo, store } = await makeHost();

    for (let step = 0; step < 3; step += 1) {
      if (host.getSessionForTests().currentState.phase === GamePhase.Movement) {
        break;
      }
      await intent(host, 'player-one', `to-movement-${step}`, {
        kind: 'AdvancePhase',
      });
    }
    expect(host.getSessionForTests().currentState.phase).toBe(
      GamePhase.Movement,
    );
    playerOne.sent.length = 0;
    playerTwo.sent.length = 0;
    const playerOnePosition =
      host.getSessionForTests().currentState.units['unit-one']?.position;
    expect(playerOnePosition).toBeDefined();
    if (playerOnePosition === undefined) return;

    const moveMessages = await intent(host, 'player-one', 'move-one', {
      kind: 'Move',
      unitId: 'unit-one',
      to: { q: playerOnePosition.q, r: playerOnePosition.r - 1 },
      facing: Facing.North,
      movementType: 'walk',
    });
    expect(moveMessages.filter((message) => message.kind === 'Error')).toEqual(
      [],
    );
    const committed = host.getSessionForTests().events;
    expect(committed.map((event) => event.type)).toContain(
      GameEventType.MovementDeclared,
    );
    const move = committed.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(move).toBeDefined();
    if (move === undefined) return;

    const actorFrames = eventFrames(playerOne);
    expect(actorFrames.map((frame) => frame.event?.id)).toContain(move.id);

    const preReveal = eventFrames(playerTwo);
    expect(preReveal.map((frame) => frame.event?.id)).not.toContain(move.id);
    expect(JSON.stringify(preReveal)).not.toContain('"q":0,"r":-1');
    const preRevealDelivery = preReveal.map((frame) => frame.deliverySequence);
    expect(preRevealDelivery).toEqual(
      preRevealDelivery.map(
        (_delivery, index) => (preRevealDelivery[0] ?? 0) + index,
      ),
    );

    const playerTwoPosition =
      host.getSessionForTests().currentState.units['unit-two']?.position;
    expect(playerTwoPosition).toBeDefined();
    if (playerTwoPosition === undefined) return;

    await intent(host, 'player-two', 'move-two', {
      kind: 'Move',
      unitId: 'unit-two',
      to: { q: playerTwoPosition.q, r: playerTwoPosition.r + 1 },
      facing: Facing.South,
      movementType: 'walk',
    });
    await intent(host, 'player-one', 'finalize-movement', {
      kind: 'AdvancePhase',
    });
    expect(host.getSessionForTests().currentState.phase).toBe(
      GamePhase.WeaponAttack,
    );
    const finalization = host
      .getSessionForTests()
      .events.findLast((event) => isMovementFinalization(event));
    expect(finalization).toBeDefined();
    if (finalization === undefined) return;
    expect(
      sealedDeclarationsRevealedBy(
        host.getSessionForTests().events,
        finalization,
      ).map((event) => event.id),
    ).toContain(move.id);

    const postReveal = eventFrames(playerTwo);
    expect(postReveal.map((frame) => frame.event?.id)).toContain(move.id);
    const revealed = postReveal.filter((frame) => frame.event?.id === move.id);
    expect(revealed).toHaveLength(1);
    // The yardstick is the COMMITTED row, not the session's copy of it.
    // The two differ by the fields the commit path stamps onto its copy
    // (`intentId`, captured `rolls`), so comparing the reveal against
    // the session made this row blind to a reveal that republished an
    // event the authority never wrote down.
    const committedMove = (await store.getEvents(MATCH_ID)).find(
      (event) => event.id === move.id,
    );
    expect(committedMove).toBeDefined();
    expect(revealed[0]?.event?.payload).toEqual(committedMove?.payload);
    expect(
      postReveal.some(
        (frame) => frame.event?.type === GameEventType.PhaseChanged,
      ),
    ).toBe(true);
    const postRevealDelivery = postReveal.map(
      (frame) => frame.deliverySequence,
    );
    expect(postRevealDelivery).toEqual(
      postRevealDelivery.map(
        (_delivery, index) => (postRevealDelivery[0] ?? 0) + index,
      ),
    );
  });

  it('reveals the COMMITTED declaration, byte-identical to what replay serves the same viewer', async () => {
    const { host, playerTwo, store } = await makeHost();
    const { move } = await driveToMovementReveal(host);

    // The committed record is the store row, not the session's copy:
    // `commitThenPublish` persists the stamped batch while the engine's
    // in-memory log keeps the pre-stamp original.
    const committedRow = (await store.getEvents(MATCH_ID)).find(
      (event) => event.id === move.id,
    );
    expect(committedRow).toBeDefined();
    if (committedRow === undefined) return;
    // Pinned so the row below cannot go green by the stamp vanishing:
    // the committed fact genuinely carries the accepted intent id.
    expect(committedRow.payload).toMatchObject({ intentId: 'move-one' });

    const revealed = eventFrames(playerTwo).filter(
      (frame) => frame.event?.id === move.id,
    );
    expect(revealed).toHaveLength(1);
    // The letter of E2E-22: the reveal is the COMMITTED event, not a
    // copy the authority never wrote down.
    expect(revealed[0]?.event?.payload).toEqual(committedRow.payload);

    // The letter of E2E-26: replay of the same event for the same
    // viewer carries the same payload fields the live reveal did.
    const rejoin = socket();
    host.attachSocket(rejoin, 'player-two');
    await host.handleSessionJoin(rejoin, 'player-two', undefined, MATCH_ID, 0);
    const replayedMove = replayedEvents(rejoin).filter(
      (event) => event.id === move.id,
    );
    expect(replayedMove).toHaveLength(1);
    expect(replayedMove[0]?.payload).toEqual(revealed[0]?.event?.payload);
  });

  it('withholds the reveal entirely when no committed row answers for it', async () => {
    const { host, playerTwo, store } = await makeHost();
    const warned = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const realGetEvents = store.getEvents;
      const { move } = await driveToMovementReveal(host, () => {
        // The commit path is untouched; only the reveal's lookup of the
        // committed row comes up empty. Fail-closed means the opponent
        // gets NO copy - never the session's uncommitted one.
        jest
          .spyOn(store, 'getEvents')
          .mockImplementation(async (matchId, fromSeq) =>
            (await realGetEvents(matchId, fromSeq)).filter(
              (event) => event.type !== GameEventType.MovementDeclared,
            ),
          );
      });

      const opponentFrames = eventFrames(playerTwo);
      expect(opponentFrames.map((frame) => frame.event?.id)).not.toContain(
        move.id,
      );
      // The trigger itself still published, so the row is measuring a
      // withheld reveal and not a dead run that published nothing.
      expect(
        opponentFrames.some(
          (frame) => frame.event?.type === GameEventType.PhaseChanged,
        ),
      ).toBe(true);
      expect(warned).toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });
});

// B10 (P2CG1S), real intents: a current spectator seat - player brand, or
// gm brand from a real campaign-session gm row (the co-op host shape) - is
// held to the reveal like any non-actor, then gets the COMMITTED row once
// with a gapless delivery number, and replay agrees with live.
describe('sealed choices to a current spectator seat', () => {
  it.each(['player', 'gm'] as const)(
    '%s-branded spectator: live withholds the move until the reveal, then delivers the committed row',
    async (brand) => {
      const { host, playerOne, store, watcher } = await makeHost({
        spectator: brand,
      });
      if (watcher === undefined) throw new Error('no spectator socket');
      let preReveal: string[] = [];
      const { move } = await driveToMovementReveal(host, () => {
        preReveal = eventFrames(watcher).map((frame) => frame.event?.id ?? '');
      });
      expect(eventFrames(playerOne).map((frame) => frame.event?.id)).toContain(
        move.id,
      );
      expect(preReveal.length).toBeGreaterThan(0);
      expect(preReveal).not.toContain(move.id);

      const committed = (await store.getEvents(MATCH_ID)).find(
        (event) => event.id === move.id,
      );
      const frames = eventFrames(watcher);
      const revealed = frames.filter((frame) => frame.event?.id === move.id);
      expect(revealed).toHaveLength(1);
      expect(revealed[0]?.event?.payload).toEqual(committed?.payload);
      const delivery = frames.map((frame) => frame.deliverySequence);
      expect(delivery).toEqual(
        delivery.map((_value, index) => (delivery[0] ?? 0) + index),
      );

      const rejoin = socket();
      host.attachSocket(rejoin, 'watcher');
      await host.handleSessionJoin(rejoin, 'watcher', undefined, MATCH_ID, 0);
      expect(
        replayedEvents(rejoin)
          .filter((event) => event.id === move.id)
          .map((event) => event.payload),
      ).toEqual([revealed[0]?.event?.payload]);
    },
  );

  it.each(['player', 'gm'] as const)(
    '%s-branded spectator: replay before the reveal withholds the committed move',
    async (brand) => {
      const { host } = await makeHost({ spectator: brand });
      const early = socket();
      const { move } = await driveToMovementReveal(host, async () => {
        await host.sendReplay(early, 0, 'watcher');
      });
      const ids = replayedEvents(early).map((event) => event.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).not.toContain(move.id);
      expect(JSON.stringify(early.sent)).not.toContain(
        JSON.stringify((move.payload as { readonly to?: unknown }).to),
      );
    },
  );
});

// MISSION-MATCH-1: real route/SQLite admission and live publication regressions.
describe('mission match membership after spectating', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;
  beforeEach(async () => {
    fixture = await openRouteFixture();
  });
  afterEach(async () => {
    await fixture.close();
  });
  async function spectate(
    matchId: string,
    who: ReturnType<typeof fixtureIdentity>,
  ) {
    _resetRateLimitBucketsForTests();
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: matchId },
      headers: {
        host: '127.0.0.1:3639',
        authorization: `Bearer ${who.wireToken}`,
      },
    });
    await spectateHandler(req, res);
    return res;
  }
  it('keeps host and guest admitted, acting and current when a stranger spectates', async () => {
    const { matchId } = MissionReplySchema.parse(
      (await post(fixture.request, fixture.host)).body,
    );
    const host = getMatchHostRegistry().get(matchId);
    if (!host) throw new Error('missing host');
    const source = new MatchSeatMembershipSource(fixture.store);
    const resolver = new AuthorizedViewerResolver(source);
    const before = await resolver.resolve(
      mintVerifiedPrincipal(fixture.guest.playerId),
      matchId,
    );
    const watcher = fixtureIdentity();
    expect((await spectate(matchId, watcher)).statusCode).toBe(201);
    const epoch = await source.currentMembershipRevision(matchId);
    expect(epoch).not.toBe(before.membershipRevision);
    expect(
      await new MatchSeatMembershipSource(
        fixture.store,
      ).currentMembershipRevision(matchId),
    ).toBe(epoch);
    const renewed = await resolver.resolve(
      mintVerifiedPrincipal(fixture.guest.playerId),
      matchId,
    );
    expect(renewed.membershipRevision).toBe(epoch);
    expect(renewed).not.toBe(before);
    const liveWatcher = socket();
    expect(
      await host.admitSocket(liveWatcher, watcher.playerId),
    ).not.toBeNull();
    const livePlayerSockets = [socket(), socket()];
    for (const [index, actor] of [fixture.host, fixture.guest].entries()) {
      const close = jest.spyOn(livePlayerSockets[index], 'close');
      expect(
        await host.admitSocket(livePlayerSockets[index], actor.playerId),
      ).not.toBeNull();
      await host.revalidateAttachedViewers();
      expect(close).not.toHaveBeenCalled();
      expect(await host.admitSocket(socket(), actor.playerId)).not.toBeNull();
      const result = await host.handleIntent(
        {
          kind: 'Intent',
          matchId,
          ts: nowIso(),
          playerId: actor.playerId,
          intentId: `after-spectate-${actor.playerId}`,
          intent: { kind: 'AdvancePhase' },
        },
        'test',
        actor.playerId,
      );
      expect(result.filter((m) => m.kind === 'Error')).toEqual([]);
      expect(result.some((m) => m.kind === 'Event')).toBe(true);
    }
    expect(eventFrames(liveWatcher).length).toBeGreaterThan(0);
    const result = await host.handleIntent(
      {
        kind: 'Intent',
        matchId,
        ts: nowIso(),
        playerId: watcher.playerId,
        intentId: 'watcher-act',
        intent: { kind: 'AdvancePhase' },
      },
      'watcher',
      watcher.playerId,
    );
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'spectator-cannot-act' }),
      ]),
    );
    expect(
      await host.admitSocket(socket(), fixtureIdentity().playerId),
    ).toBeNull();
    expect((await spectate(matchId, watcher)).statusCode).toBe(201);
    expect(await source.currentMembershipRevision(matchId)).toBe(epoch);
    expect((await spectate(matchId, fixture.guest)).statusCode).toBe(409);
    expect((await spectate(matchId, fixtureIdentity())).statusCode).toBe(201);
    const secondEpoch = await source.currentMembershipRevision(matchId);
    expect(secondEpoch).not.toBe(epoch);
    await fixture.store.updateMatchMeta(matchId, {
      playerIds: [fixture.host.playerId],
    });
    expect(await source.currentMembershipRevision(matchId)).not.toBe(
      secondEpoch,
    );
    expect(
      await source.lookupMembership(fixture.guest.playerId, matchId),
    ).toBeNull();
  });
  it('refuses a rostered self-spectator before any spectator seats exist', async () => {
    const { matchId } = MissionReplySchema.parse(
      (await post(fixture.request, fixture.host)).body,
    );
    expect((await spectate(matchId, fixture.guest)).statusCode).toBe(409);
    expect((await fixture.store.getMatchMeta(matchId)).seats).toBeUndefined();
  });
});

describe('same-side sealed declaration delivery', () => {
  it('delivers a real non-first player move live to both teammates only', async () => {
    const { host, playerOne, playerTwo, watcher } = await makeHost({
      teammates: true,
      spectator: 'player',
    });
    const ally = socket();
    const opponentAlly = socket();
    expect(await host.admitSocket(ally, 'ally-one')).not.toBeNull();
    expect(await host.admitSocket(opponentAlly, 'ally-two')).not.toBeNull();
    for (
      let step = 0;
      host.getSessionForTests().currentState.phase !== GamePhase.Movement &&
      step < 3;
      step++
    )
      await intent(host, 'player-one', `advance-${step}`, {
        kind: 'AdvancePhase',
      });
    const position =
      host.getSessionForTests().currentState.units['unit-one'].position;
    const result = await intent(host, 'player-one', 'team-move', {
      kind: 'Move',
      unitId: 'unit-one',
      to: { q: position.q, r: position.r - 1 },
      facing: Facing.North,
      movementType: 'walk',
    });
    expect(result.filter((m) => m.kind === 'Error')).toEqual([]);
    const row = host
      .getSessionForTests()
      .events.find((e) => e.type === GameEventType.MovementDeclared);
    expect({
      row,
      result,
      phase: host.getSessionForTests().currentState.phase,
    }).toMatchObject({ row: expect.any(Object) });
    for (const receiver of [playerOne, ally])
      expect(eventFrames(receiver).map((f) => f.event?.id)).toContain(row?.id);
    if (!watcher) throw new Error('missing watcher');
    for (const receiver of [playerTwo, opponentAlly, watcher])
      expect(eventFrames(receiver).map((f) => f.event?.id)).not.toContain(
        row?.id,
      );
  });
  it.each([
    GameEventType.MovementDeclared,
    GameEventType.AttackDeclared,
    GameEventType.PhysicalAttackDeclared,
  ])('%s uses the viewer side at the live boundary', async (type) => {
    const { host, store } = await makeHost({
      teammates: true,
      spectator: 'player',
    });
    const meta = await store.getMatchMeta(MATCH_ID);
    const resolver = new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(store),
    );
    const state = {
      ...host.getSessionForTests().currentState,
      sideAssignments: [
        { playerId: 'watcher', side: GameSide.Player },
        ...meta.sideAssignments,
      ],
    };
    const context = createMatchWireSealedChoiceAudienceContext(
      [],
      state,
      10,
      meta.seats,
    );
    for (const [actorId, owners, others] of [
      [
        'unit-one',
        ['player-one', 'ally-one'],
        ['player-two', 'ally-two', 'watcher'],
      ],
      [
        'unit-two',
        ['player-two', 'ally-two'],
        ['player-one', 'ally-one', 'watcher'],
      ],
    ] as const) {
      const event = {
        type,
        turn: 1,
        sequence: 10,
        actorId,
        payload: { unitId: actorId, attackerId: actorId, secret: 'sealed' },
      };
      for (const playerId of [...owners, ...others]) {
        const viewer = await resolver.resolve(
          mintVerifiedPrincipal(playerId),
          MATCH_ID,
        );
        const result = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
          viewer,
          { kind: 'Event', matchId: MATCH_ID, ts: nowIso(), event },
          context,
        );
        expect(result.kind).toBe(
          owners.some((owner) => owner === playerId) ? 'send' : 'omit',
        );
      }
    }
  });
});

describe('first player assignment compatibility', () => {
  it('finds both teammates independently and preserves the first match for duplicate players', () => {
    const assignments = [
      { playerId: 'a', side: 'player' },
      { playerId: 'b', side: 'player' },
      { playerId: 'b', side: 'opponent' },
    ];
    expect(sideOfPlayer(assignments, 'a')).toBe('player');
    expect(sideOfPlayer(assignments, 'b')).toBe('player');
    expect(sideOfPlayer(assignments, 'missing')).toBeUndefined();
    expect(sideOfPlayer(undefined, 'a')).toBeUndefined();
    expect(sideOfPlayer(null, 'a')).toBeUndefined();
    expect(sideOfPlayer([], 'a')).toBeUndefined();
  });
  it('preserves per-player command, forfeit and grace-expiry selections for every ordering', () => {
    for (const assignments of [
      [
        { playerId: 'a', side: 'opponent' },
        { playerId: 'b', side: 'player' },
      ],
      [
        { playerId: 'b', side: 'player' },
        { playerId: 'a', side: 'opponent' },
      ],
    ]) {
      for (const player of ['a', 'b', 'missing'])
        expect(sideOfPlayer(assignments, player)).toBe(
          assignments.find((a) => a.playerId === player)?.side,
        );
    }
  });
});
describe('mission membership modes', () => {
  it.each(['empty', 'spectator-only', 'human'] as const)(
    '%s preserves the matching membership contract',
    async (mode) => {
      const { store } = await makeHost();
      const seats =
        mode === 'empty'
          ? []
          : mode === 'human'
            ? defaultSeats('1v1')
            : addSpectatorSeat([], {
                playerId: 'watcher',
                displayName: 'Watcher',
              });
      await store.updateMatchMeta(MATCH_ID, { seats });
      const source = new MatchSeatMembershipSource(store);
      if (mode === 'human')
        expect(
          await source.lookupMembership('player-one', MATCH_ID),
        ).toBeNull();
      else {
        expect(
          await source.lookupMembership('player-one', MATCH_ID),
        ).toMatchObject({ participantId: 'player-one', ownedForceIds: [] });
        expect(
          await source.lookupMembership('player-two', MATCH_ID),
        ).not.toBeNull();
      }
      expect(await source.lookupMembership('stranger', MATCH_ID)).toBeNull();
      if (mode === 'spectator-only')
        expect(
          await source.lookupMembership('watcher', MATCH_ID),
        ).toMatchObject({ participantId: 'spectator-1', ownedForceIds: [] });
    },
  );
  it('the pure spectator owner rejects roster membership before idempotent rejoin', () => {
    const watcher = { playerId: 'watcher', displayName: 'Watcher' };
    // Typed with the roster parameter so the row compiles before it exists.
    const withRoster: (
      seats: Parameters<typeof addSpectatorSeat>[0],
      player: Parameters<typeof addSpectatorSeat>[1],
      roster: readonly string[],
    ) => unknown = addSpectatorSeat;
    const seats = addSpectatorSeat([], watcher);
    expect(() => withRoster([], watcher, ['watcher'])).toThrow();
    expect(() => withRoster(seats, watcher, ['watcher'])).toThrow();
  });
});

describe('concession side selection compatibility', () => {
  it.each([
    ['player', GameSide.Opponent],
    ['opponent', GameSide.Player],
  ] as const)(
    'forfeit by %s host concedes the existing opposite side',
    async (side, expected) => {
      const { store } = await makeHost();
      await store.updateMatchMeta(MATCH_ID, {
        sideAssignments: [
          { playerId: 'ally', side },
          { playerId: 'player-one', side },
        ],
      });
      const session = new InteractiveSession(
        6,
        5,
        new SeededRandom(11),
        createMinimalGrid(6),
        [],
        [],
        [],
      );
      const concede = jest
        .spyOn(session, 'concede')
        .mockImplementation(() => undefined);
      const ctx: IServerMatchHostLobbyContext = {
        matchId: MATCH_ID,
        store,
        session,
        playerRefs: new Map(),
        pendingPeers: new PendingPeerTracker(),
        broadcast: jest.fn(),
        broadcastEvent: async () => undefined,
        maybeResume: jest.fn(),
        installFreshCapture: jest.fn(),
        drainNewEvents: () => [],
        stampRollsOnNewEvents: (e) => e,
      };
      await handleLobbyIntent(ctx, {
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'player-one',
        intent: { kind: 'ForfeitMatch' },
      });
      expect(concede).toHaveBeenCalledWith(expected);
    },
  );
  it.each([
    ['player', GameSide.Player],
    ['opponent', GameSide.Opponent],
  ] as const)(
    'grace expiry for a non-first %s player concedes its own side',
    async (side, expected) => {
      const { store } = await makeHost();
      await store.updateMatchMeta(MATCH_ID, {
        sideAssignments: [
          { playerId: 'ally', side },
          { playerId: 'player-one', side },
        ],
      });
      const session = new InteractiveSession(
        6,
        5,
        new SeededRandom(11),
        createMinimalGrid(6),
        [],
        [],
        [],
      );
      const concede = jest
        .spyOn(session, 'concede')
        .mockImplementation(() => undefined);
      let closed: () => void = () => undefined;
      const completion = new Promise<void>((resolve) => {
        closed = resolve;
      });
      const ctx: IServerMatchHostReconnectContext = {
        matchId: MATCH_ID,
        store,
        session,
        pendingPeers: new PendingPeerTracker(),
        closed: false,
        isPaused: true,
        setPaused: jest.fn(),
        broadcast: jest.fn(),
        broadcastEvent: async () => undefined,
        closeMatch: async () => {
          closed();
        },
        tryPublishOutcome: jest.fn(),
        installFreshCapture: jest.fn(),
        drainNewEvents: () => [],
        stampRollsOnNewEvents: (e) => e,
      };
      handleGraceTimeout(ctx, {
        playerId: 'player-one',
        slotId: 'alpha-1',
        expiresAt: 1,
      });
      await completion;
      expect(concede).toHaveBeenCalledWith(expected);
    },
  );
});

// MISSION-MATCH-1 MM5 (admission resolutions.R2): replay and reconnect apply
// the live owner rule. player-one is the NON-first Player-side teammate
// (ally-one is listed first); an opposing player and a spectator seat, even
// one with a stale first side assignment, get only the public frames until
// the reveal.
describe('same-side sealed declarations on replay and reconnect', () => {
  async function viewFor(
    host: ServerMatchHost,
    path: 'replay' | 'reconnect',
    playerId: string,
  ): Promise<IRecordedSocket> {
    const viewer = socket();
    if (path === 'reconnect') {
      host.attachSocket(viewer, playerId);
      await host.handleSessionJoin(viewer, playerId, undefined, MATCH_ID, 0);
    } else {
      await host.sendReplay(viewer, 0, playerId);
    }
    return viewer;
  }

  it.each([
    ['replay', 'listed-last'],
    ['reconnect', 'listed-last'],
    ['replay', 'stale-first'],
    ['reconnect', 'stale-first'],
  ] as const)(
    '%s with the watcher %s: both teammates get the declaration, opponents and the spectator seat do not, until the reveal',
    async (path, order) => {
      const { host, store } = await makeHost({
        teammates: true,
        spectator: 'player',
      });
      if (order === 'stale-first') {
        const meta = await store.getMatchMeta(MATCH_ID);
        await store.updateMatchMeta(MATCH_ID, {
          sideAssignments: [
            { playerId: 'watcher', side: GameSide.Player },
            ...meta.sideAssignments,
          ],
        });
      }
      // Snapshot before the reveal: a reconnected socket stays attached and
      // legitimately receives the declaration live once it is revealed.
      const seen = new Map<
        string,
        { readonly ids: (string | undefined)[]; readonly wire: string }
      >();
      const { move } = await driveToMovementReveal(host, async () => {
        for (const playerId of [
          'player-one',
          'ally-one',
          'player-two',
          'ally-two',
          'watcher',
        ]) {
          const viewer = await viewFor(host, path, playerId);
          seen.set(playerId, {
            ids: replayedEvents(viewer).map((event) => event.id),
            wire: JSON.stringify(viewer.sent),
          });
        }
      });
      const destination = JSON.stringify(
        (move.payload as { readonly to?: unknown }).to,
      );
      for (const playerId of ['player-one', 'ally-one'])
        expect(seen.get(playerId)?.ids).toContain(move.id);
      for (const playerId of ['player-two', 'ally-two', 'watcher']) {
        expect(seen.get(playerId)?.ids.length).toBeGreaterThan(0);
        expect(seen.get(playerId)?.ids).not.toContain(move.id);
        expect(seen.get(playerId)?.wire).not.toContain(destination);
      }
    },
  );

  it('after the reveal every viewer replays the committed declaration once', async () => {
    const { host } = await makeHost({ teammates: true, spectator: 'player' });
    const { move } = await driveToMovementReveal(host);
    for (const playerId of [
      'player-one',
      'ally-one',
      'player-two',
      'ally-two',
      'watcher',
    ])
      expect(
        replayedEvents(await viewFor(host, 'replay', playerId)).filter(
          (event) => event.id === move.id,
        ),
      ).toHaveLength(1);
  });
});
