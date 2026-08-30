/**
 * Umbrella 7.1 — the live command path publishes from durable outbox
 * rows, and restart recovery drains what a dead process never sent.
 *
 * The unit suites (`commitThenPublish.test.ts`,
 * `resumePendingPublications.test.ts`) prove the passes in isolation.
 * What they could not prove — and what these rows pin — is that the
 * production intent path actually PRODUCES the durable records those
 * passes run on: before this seam the legacy path committed
 * event-at-a-time through `appendEvent`, so no outbox row ever existed,
 * the resume pass drained nothing, and a crash after commit but before
 * the socket sends lost the frames forever.
 *
 * Spec: "Commit Precedes Recipient Publication" — publish committed
 * results only from durable publication records created in the same
 * transaction as the authoritative command batch; restart recovery
 * resumes at-least-once publication from durable records and cursors
 * without re-executing the command.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-server/spec.md
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

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

import {
  DurableMatchStore,
  _setFailAtHeadUpdateForTests,
} from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';
import {
  recoverActiveMatches,
  rebuildSessionFromEvents,
} from '../MatchRecovery';
import { ServerMatchHost } from '../ServerMatchHost';

function adapted(
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
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  } as unknown as IAdaptedUnit;
}

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

function makeSocket() {
  const sent: unknown[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data));
    },
    close() {},
    readyState: 1,
    sent,
  };
}

/** Event frames actually delivered to a socket, in send order. */
function eventFrames(socket: { sent: unknown[] }): {
  id?: string;
  deliverySequence?: number;
  type?: string;
}[] {
  return (
    socket.sent as {
      kind?: string;
      event?: { sequence?: number; type?: string };
      deliverySequence?: number;
    }[]
  )
    .filter((raw) => raw?.kind === 'Event' && raw.event !== undefined)
    .map((raw) => ({
      // Player wire frames carry NO authority sequence - the projector
      // strips it - so identity is the only honest match key here.
      id: (raw.event as { id?: string }).id,
      deliverySequence: raw.deliverySequence,
      type: raw.event!.type,
    }));
}

function errorFrames(socket: { sent: unknown[] }): { code?: string }[] {
  return (socket.sent as { kind?: string; code?: string }[]).filter(
    (raw) => raw?.kind === 'Error',
  );
}

function matchMeta(matchId: string, hostPlayerId = 'pA'): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId,
    playerIds: [hostPlayerId, 'pB'],
    sideAssignments: [
      { playerId: hostPlayerId, side: 'player' },
      { playerId: 'pB', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: hostPlayerId, displayName: 'A' },
        };
      }
      if (seat.slotId === 'bravo-1') {
        return { ...seat, occupant: { playerId: 'pB', displayName: 'B' } };
      }
      return seat;
    }),
    roomCode: matchId.slice(0, 6).toUpperCase(),
  };
}

async function seatedDurableHost(matchId: string, store: DurableMatchStore) {
  await store.createMatch(matchMeta(matchId));
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 6,
    turnLimit: 5,
    random: new SeededRandom(9),
    grid: createMinimalGrid(6),
    playerUnits: [adapted('unit-A', GameSide.Player, { q: 0, r: 0 })],
    opponentUnits: [adapted('unit-foe', GameSide.Opponent, { q: 0, r: 3 })],
    gameUnits: [
      gameUnit('unit-A', GameSide.Player),
      gameUnit('unit-foe', GameSide.Opponent),
    ],
    diceSeed: 9,
  });
  await Promise.resolve();
  await Promise.resolve();
  const sockA = makeSocket();
  expect(await host.admitSocket(sockA, 'pA')).not.toBeNull();
  return { host, sockA };
}

async function advance(
  host: ServerMatchHost,
  matchId: string,
  n: number,
): Promise<void> {
  await host.handleIntent(
    {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pA',
      intentId: `adv-${matchId}-${n}`,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent,
    'conn-a',
    'pA',
  );
}

describe('live commands commit as durable publication batches (7.1)', () => {
  let store: DurableMatchStore;

  beforeEach(() => {
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(() => {
    _setFailAtHeadUpdateForTests(false);
    store.close();
  });

  it('a live command leaves a receipt whose rows are already marked published', async () => {
    const matchId = 'm-outbox-live';
    const { host, sockA } = await seatedDurableHost(matchId, store);
    await advance(host, matchId, 0);

    const delivered = eventFrames(sockA);
    expect(delivered.length).toBeGreaterThan(0);

    // Nothing left pending: rows were written by the commit and marked
    // by the publication pass.
    expect(await store.listPendingPublications(matchId)).toEqual([]);

    // The receipt probe distinguishes the batch path from the old
    // event-at-a-time path. Reusing the intent's command id with
    // DIFFERENT work must answer integrity-conflict, which requires a
    // receipt to exist at all. The old path wrote no receipt, so this
    // probe answered revision-conflict instead.
    const stored = await store.getEvents(matchId);
    const probe = await store.appendCommandBatch(matchId, {
      commandId: `adv-${matchId}-0`,
      actorId: 'pA',
      expectedRevision: stored.length,
      events: [
        {
          ...(stored[stored.length - 1] as IGameEvent),
          id: 'probe-different-work',
          sequence: stored.length,
        },
      ],
    });
    expect(probe.kind).toBe('integrity-conflict');
  });

  it('a batch a dead process committed but never sent is delivered on recovery, once', async () => {
    const matchId = 'm-outbox-crash';
    const { host, sockA } = await seatedDurableHost(matchId, store);
    await advance(host, matchId, 0);
    const liveCount = eventFrames(sockA).length;
    expect(liveCount).toBeGreaterThan(0);

    // Crash simulation: a command commits its batch (events + outbox
    // rows in one transaction) and the process dies before any socket
    // send. The store holds the rows; no frame ever went out.
    const stored = await store.getEvents(matchId);
    const template = stored[stored.length - 1] as IGameEvent;
    const orphan: IGameEvent = {
      ...template,
      id: 'orphan-committed-unsent',
      sequence: stored.length,
    };
    const appended = await store.appendCommandBatch(matchId, {
      commandId: 'cmd-crashed-run',
      actorId: 'pA',
      expectedRevision: stored.length,
      events: [orphan],
    });
    expect(appended.kind).toBe('committed');
    expect(await store.listPendingPublications(matchId)).toHaveLength(1);

    // Restart: rebuild THIS host directly (the registry bootstrap path
    // is proven separately below) so a viewer can attach before the
    // drain runs - that is the live at-least-once resume.
    const session = await rebuildSessionFromEvents(
      matchId,
      await store.getEvents(matchId),
    );
    const recovered = await ServerMatchHost.recover(matchId, store, session);
    await recovered.restorePersistedViewerDeliveries();

    const sockB = makeSocket();
    expect(await recovered.admitSocket(sockB, 'pA')).not.toBeNull();
    await recovered.resumePendingEventPublications();

    const resumed = eventFrames(sockB).filter(
      (frame) => frame.id === orphan.id,
    );
    expect(resumed).toHaveLength(1);
    expect(await store.listPendingPublications(matchId)).toEqual([]);

    // A second drain publishes nothing: the rows are marked and the
    // viewer's cursor already records the frame.
    await recovered.resumePendingEventPublications();
    expect(eventFrames(sockB).filter((f) => f.id === orphan.id)).toHaveLength(
      1,
    );
  });

  it('recovery itself leaves no pending publications behind', async () => {
    const matchId = 'm-outbox-drain';
    const { host } = await seatedDurableHost(matchId, store);
    await advance(host, matchId, 0);
    const stored = await store.getEvents(matchId);
    const template = stored[stored.length - 1] as IGameEvent;
    await store.appendCommandBatch(matchId, {
      commandId: 'cmd-crashed-run-2',
      actorId: 'pA',
      expectedRevision: stored.length,
      events: [{ ...template, id: 'orphan-2', sequence: stored.length }],
    });
    expect(await store.listPendingPublications(matchId)).toHaveLength(1);

    await recoverActiveMatches(store);
    // The registry bootstrap drains during recovery, so a restart with
    // nobody connected still settles the outbox; reconnecting clients
    // gap-fill from the SessionJoin replay, not from these rows.
    expect(await store.listPendingPublications(matchId)).toEqual([]);
  });

  it('a failed transaction yields a typed failure, no frames, and no durable rows', async () => {
    const matchId = 'm-outbox-fail';
    const { host, sockA } = await seatedDurableHost(matchId, store);
    const before = eventFrames(sockA).length;
    const storedBefore = (await store.getEvents(matchId)).length;

    _setFailAtHeadUpdateForTests(true);
    await advance(host, matchId, 0);
    _setFailAtHeadUpdateForTests(false);

    // Truthful typed failure; no committed-result frame for the intent.
    expect(
      errorFrames(sockA).some((frame) => frame.code === 'STORE_FAILURE'),
    ).toBe(true);
    expect(eventFrames(sockA).length).toBe(before);

    // Nothing durable either: the transaction rolled back events and
    // outbox rows together, so there is nothing to resume later.
    expect((await store.getEvents(matchId)).length).toBe(storedBefore);
    expect(await store.listPendingPublications(matchId)).toEqual([]);
  });
});
