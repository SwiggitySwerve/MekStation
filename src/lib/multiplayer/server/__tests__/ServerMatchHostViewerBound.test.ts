/**
 * Per-viewer unacked bound on the host assign/send path (E2E-14).
 *
 * Player 2 withholds acks; GM and Player 1 ack so only P2 isolates.
 * Resume after one ack uses firstMissedAuthoritySequence, not the live
 * head — the same path a reconnect uses.
 */

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IViewerDeliveryAcknowledgement } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MAX_VIEWER_UNACKED } from '../projection/ViewerDeliveryCursors';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH = 'm-viewer-unacked-bound';
const GM = 'gm';
const P1 = 'p1';
const P2 = 'p2';

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

/**
 * Living units far apart, no weapons, enough sinks that Heat is a
 * no-op. Session units come from the roster; these splice armor and
 * structure onto it so elimination cannot fire while both sides sit
 * still. The 49-frame stall was not this roster dying — see advance().
 */
function lastingUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    heatSinks: 12,
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

function makeSocket() {
  const socket = {
    sent: [] as unknown[],
    send(data: string) {
      socket.sent.push(JSON.parse(data));
    },
    close() {},
    readyState: 1,
  };
  return socket;
}

function ackingStore() {
  const store = new InMemoryMatchStore({ quiet: true });
  const acks = new Map<string, number>();
  const withAck = store as InMemoryMatchStore & {
    acknowledgeViewerDelivery(
      ack: IViewerDeliveryAcknowledgement,
    ): Promise<void>;
    getViewerDeliveryAcknowledgement(
      matchId: string,
      playerId: string,
    ): Promise<IViewerDeliveryAcknowledgement | null>;
  };
  withAck.acknowledgeViewerDelivery = async (ack) => {
    const key = `${ack.matchId}:${ack.playerId}`;
    const previous = acks.get(key);
    if (previous !== undefined && ack.deliverySequence < previous) return;
    acks.set(key, ack.deliverySequence);
  };
  withAck.getViewerDeliveryAcknowledgement = async (matchId, playerId) => {
    const deliverySequence = acks.get(`${matchId}:${playerId}`);
    if (deliverySequence === undefined) return null;
    return { matchId, playerId, deliverySequence };
  };
  return withAck;
}

async function seatedHost() {
  const store = ackingStore();
  const now = new Date().toISOString();
  await store.createMatch({
    matchId: MATCH,
    hostPlayerId: GM,
    playerIds: [GM, P1, P2],
    sideAssignments: [
      { playerId: GM, side: 'player' },
      { playerId: P1, side: 'player' },
      { playerId: P2, side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    // turnLimit 0 is the long-running host convention: isGameEnded
    // treats turn >= turnLimit as over when the limit is positive, so
    // a finite limit can complete the match before unacked hits 64.
    config: { mapRadius: 12, turnLimit: 0 },
    layout: '2v2',
    seats: defaultSeats('2v2').map((seat) => {
      if (seat.slotId === 'alpha-1')
        return { ...seat, occupant: { playerId: GM, displayName: 'GM' } };
      if (seat.slotId === 'alpha-2')
        return { ...seat, occupant: { playerId: P1, displayName: 'P1' } };
      if (seat.slotId === 'bravo-1')
        return { ...seat, occupant: { playerId: P2, displayName: 'P2' } };
      return seat;
    }),
    roomCode: 'VBOUND',
  });

  const host = ServerMatchHost.create(MATCH, store, {
    mapRadius: 12,
    turnLimit: 0,
    random: new SeededRandom(9),
    grid: createMinimalGrid(12),
    playerUnits: [lastingUnit('unit-A', GameSide.Player, { q: 0, r: 0 })],
    opponentUnits: [lastingUnit('unit-foe', GameSide.Opponent, { q: 0, r: 5 })],
    gameUnits: [
      gameUnit('unit-A', GameSide.Player),
      gameUnit('unit-foe', GameSide.Opponent),
    ],
    diceSeed: 9,
  });
  await Promise.resolve();
  await Promise.resolve();

  const sockGm = makeSocket();
  const sockP1 = makeSocket();
  const sockP2 = makeSocket();
  expect(await host.admitSocket(sockGm, GM)).not.toBeNull();
  expect(await host.admitSocket(sockP1, P1)).not.toBeNull();
  expect(await host.admitSocket(sockP2, P2)).not.toBeNull();
  return { host, sockGm, sockP1, sockP2 };
}

/**
 * Last authority event type on the live session. Named in the isolate
 * stall error so a silent no-op (game_ended vs a rate-limit freeze)
 * is obvious without another probe.
 */
function lastFrameKind(host: ServerMatchHost): string {
  const events = host.getSessionForTests().events;
  const last = events[events.length - 1];
  return last?.type ?? 'none';
}

/**
 * One AdvancePhase from the GM. Connection key is per-step because
 * IntentRateLimiter is a 20-token bucket per connection: the old
 * shared `conn-gm` accepted ~20 advances (~49 frames including the
 * boot GameCreated/GameStarted pair) and RATE_LIMITED the rest, which
 * is why issued froze at 49 with lastBurst 0. A new key is how a
 * real reconnect gets a fresh bucket; the match stays on AdvancePhase.
 */
async function advance(host: ServerMatchHost, step: number): Promise<void> {
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId: MATCH,
      ts: nowIso(),
      playerId: GM,
      intentId: `adv-${step}`,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    `conn-gm-${step}`,
    GM,
  );
}

async function ackHealthy(host: ServerMatchHost): Promise<void> {
  const gmLast = host.viewerIssued(GM) - 1;
  const p1Last = host.viewerIssued(P1) - 1;
  if (gmLast >= 0) await host.handleDeliveryAck(GM, gmLast);
  if (p1Last >= 0) await host.handleDeliveryAck(P1, p1Last);
}

type IsolationDrive = {
  readonly step: number;
  readonly lastBurst: number;
};

/**
 * Drive until admit() isolates P2, not until issued hits an exact
 * count. One AdvancePhase assigns a burst; the bound is unacked
 * frames, so isolation can flip mid-burst (issued then sits at the
 * cap, not necessarily equal to it if a later refused frame is not
 * counted). lastBurst is the assigned frames of the step that
 * crossed — or the previous positive burst when the isolating step
 * assigns nothing because the cap was already reached.
 */
async function isolateP2(host: ServerMatchHost): Promise<IsolationDrive> {
  let step = 0;
  let lastBurst = 0;
  let lastPositiveBurst = 0;
  let stalledSteps = 0;
  while (!host.viewerIsolated(P2) && step < 400) {
    const issuedBefore = host.viewerIssued(P2);
    await advance(host, step);
    // A viewer that acks every frame must never trip the bound, not even
    // for the instant before its next ack: the window is unacked frames,
    // and a check against total issued would isolate the healthy seats here.
    if (host.viewerIsolated(P1) || host.viewerIsolated(GM)) {
      throw new Error('a healthy viewer was isolated by the bound');
    }
    await ackHealthy(host);
    const burst = host.viewerIssued(P2) - issuedBefore;
    if (burst > 0) {
      lastPositiveBurst = burst;
      stalledSteps = 0;
    } else {
      stalledSteps += 1;
      if (stalledSteps >= 5) {
        throw new Error(
          `isolateP2 drive stopped issuing after ${String(step)} steps; last frame kind=${lastFrameKind(host)}`,
        );
      }
    }
    if (host.viewerIsolated(P2)) {
      lastBurst = burst > 0 ? burst : lastPositiveBurst;
    }
    step += 1;
  }
  return { step, lastBurst };
}

describe('ServerMatchHost per-viewer unacked bound', () => {
  it('withholding Player 2\'s acks for MAX_VIEWER_UNACKED frames isolates Player 2 while Player 1\'s issued keeps growing', async () => {
    const { host } = await seatedHost();
    const { step, lastBurst } = await isolateP2(host);
    expect(host.viewerIsolated(P2)).toBe(true);
    // Issued is not always exactly 64: admit refuses the overflowing
    // frame so it is not counted, and a multi-event AdvancePhase can
    // cross the cap mid-burst. The bound is unacked, not issued.
    const unacked = host.viewerUnacked(P2);
    expect(unacked).toBeGreaterThanOrEqual(MAX_VIEWER_UNACKED);
    expect(unacked - lastBurst).toBeLessThan(MAX_VIEWER_UNACKED);
    const isolatedIssued = host.viewerIssued(P2);

    await advance(host, step);
    await advance(host, step + 1);
    await ackHealthy(host);

    expect(host.viewerIssued(P2)).toBe(isolatedIssued);
    expect(host.viewerIssued(P1)).toBeGreaterThan(isolatedIssued);
  });

  it('one ack from the isolated viewer resumes it from firstMissedAuthoritySequence, not from the live head', async () => {
    const { host, sockP2 } = await seatedHost();
    const { step } = await isolateP2(host);
    await advance(host, step);
    await advance(host, step + 1);
    await ackHealthy(host);

    const lastHeld = host.viewerIssued(P2) - 1;
    // Returns number | null. typeof null === 'object', which is what
    // the old row reported when isolation never flipped and the
    // isolationResume pointer was absent. After isolation it is the
    // first refused authority sequence, not a cursor object.
    const firstMissed = host.viewerFirstMissedAuthority(P2, lastHeld);
    const liveHead = host.highestSeq();
    expect(firstMissed).not.toBeNull();
    expect(typeof firstMissed).toBe('number');
    expect(firstMissed).not.toBe(liveHead);

    const sentBefore = sockP2.sent.length;
    await host.handleDeliveryAck(P2, lastHeld);
    const replayStart = sockP2.sent.slice(sentBefore).find((raw) => {
      return (raw as { kind?: string }).kind === 'ReplayStart';
    }) as
      | { fromSeq?: number; fromDeliverySequence?: number; totalEvents?: number }
      | undefined;

    expect(replayStart).toBeDefined();
    // Player projections strip authority fromSeq; the resume start we
    // can read is the host mapping (firstMissed) plus the event tail.
    expect(typeof firstMissed).toBe('number');
    if (typeof firstMissed === 'number') {
      const missedTail = await host.getEventsFromSeq(firstMissed);
      const liveOnly = await host.getEventsFromSeq(liveHead);
      expect(missedTail.length).toBeGreaterThan(liveOnly.length);
      expect(missedTail[0]?.sequence).toBe(firstMissed);
      expect(missedTail[0]?.sequence).not.toBe(liveHead);
    }
  });

  it('the GM is never isolated by another viewer\'s backlog', async () => {
    const { host } = await seatedHost();
    const { step } = await isolateP2(host);
    const gmAtIsolation = host.viewerIssued(GM);
    const p2AtIsolation = host.viewerIssued(P2);
    expect(host.viewerIsolated(P2)).toBe(true);
    expect(host.viewerIsolated(GM)).toBe(false);
    expect(host.viewerIsolated(P1)).toBe(false);

    await advance(host, step);
    await ackHealthy(host);
    expect(host.viewerIsolated(GM)).toBe(false);
    expect(host.viewerIsolated(P1)).toBe(false);
    expect(host.viewerIssued(GM)).toBeGreaterThan(gmAtIsolation);
    // P2 stays frozen at whatever issued the isolating burst left;
    // that is not always exactly MAX_VIEWER_UNACKED (refused frame
    // is not assigned).
    expect(host.viewerIssued(P2)).toBe(p2AtIsolation);
  });
});
