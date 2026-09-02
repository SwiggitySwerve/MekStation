import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay';
import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
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

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { sealedDeclarationsRevealedBy } from '../projection/MatchWireSealedChoices';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

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

async function makeHost(): Promise<{
  readonly host: ServerMatchHost;
  readonly playerOne: IRecordedSocket;
  readonly playerTwo: IRecordedSocket;
  readonly store: InMemoryMatchStore;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-08-30T00:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'player-one',
    playerIds: ['player-one', 'player-two'],
    sideAssignments: [
      { playerId: 'player-one', side: GameSide.Player },
      { playerId: 'player-two', side: GameSide.Opponent },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 5, fogOfWar: false },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
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
  });
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
  return { host, playerOne, playerTwo, store };
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
  beforeFinalize: () => void = () => undefined,
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
  beforeFinalize();
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
