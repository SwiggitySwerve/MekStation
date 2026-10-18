/**
 * ServerMatchHost spectator integration tests — M3.
 *
 * Covers design D5 (spectator connection + intent rejection) and D6
 * (spectator fog-of-war scope): a spectator receives the replay then
 * live events, never an event about a unit hidden from a participant,
 * and any intent from a spectator seat is rejected.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';

import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  parsed: IServerMessage;
  raw: string;
}

function makeSocket(): IMatchSocket & { sent: IRecordedSend[] } {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage, raw: data });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
  } as IMatchSocket & { sent: IRecordedSend[] };
}

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function movementLockedEvent(unitId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${unitId}-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: GameEventType.MovementLocked,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: unitId,
    visibility: 'observer-visible',
    payload: { unitId },
  };
}

function publicPhaseEvent(sequence: number): IGameEvent {
  return {
    id: `evt-phase-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    visibility: 'public',
    payload: { phase: GamePhase.Movement } as never,
  } as IGameEvent;
}

/** B10 fixture knobs; the defaults reproduce the original D5/D6 match. */
interface ISpectatorFixture {
  /** Watcher brand; `gm` binds a real campaign-session gm row. */
  readonly brand?: 'player' | 'gm';
  /** Opponent seat empty; sideAssignments still names the watcher there. */
  readonly stale?: boolean;
  /** The seated host also holds a campaign-session gm row. */
  readonly gmHost?: boolean;
}

/**
 * Build an `active` host whose seat roster has a spectator appended.
 */
async function makeHostWithSpectator(
  fogOfWar: boolean,
  options: ISpectatorFixture = {},
) {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-spectator';
  const now = '2026-05-01T00:00:00.000Z';
  const opponentId = options.stale === true ? 'pid_watcher' : 'pid_opp';
  const campaignId = 'camp-spectator';
  const gmIds = [
    ...(options.brand === 'gm' ? ['pid_watcher'] : []),
    ...(options.gmHost === true ? ['pid_host'] : []),
  ];
  let seats: IMatchSeat[] = defaultSeats('1v1');
  seats = seats.map((s, i) =>
    i === 0
      ? { ...s, occupant: { playerId: 'pid_host', displayName: 'Host' } }
      : options.stale === true
        ? s
        : { ...s, occupant: { playerId: 'pid_opp', displayName: 'Opp' } },
  );
  seats = addSpectatorSeat(seats, {
    playerId: 'pid_watcher',
    displayName: 'Watcher',
  });
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', opponentId],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: opponentId, side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 25, turnLimit: 5, fogOfWar },
    layout: '1v1',
    seats,
    ...(gmIds.length > 0
      ? {
          coopCampaign: {
            campaignId,
            state: createEmptyCampaignState(campaignId),
          },
        }
      : {}),
  });
  for (const participantId of gmIds) {
    store.bindCampaignSessionParticipant({
      campaignId,
      sessionId: matchId,
      participantId,
      seat: 'gm',
      boundAt: now,
    });
  }
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 25,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(25),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      makeUnit('player-scout', GameSide.Player),
      ...Array.from({ length: 4 }, (_, i) =>
        makeUnit(`opp-${i}`, GameSide.Opponent),
      ),
    ],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function broadcast(host: ServerMatchHost, event: IGameEvent): Promise<void> {
  const fn = (
    host as unknown as {
      broadcastEvent(message: IEventMessage): Promise<void>;
    }
  ).broadcastEvent.bind(host);
  return fn({
    kind: 'Event',
    matchId: 'match-spectator',
    ts: '2026-05-01T00:00:00.000Z',
    event,
  });
}

describe('ServerMatchHost spectator connection — design D5', () => {
  it('streams the replay then live events to a connecting spectator', async () => {
    // Scenario: Spectator joins and receives the stream.
    const { host } = await makeHostWithSpectator(false);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_watcher');
    await host.handleSessionJoin(sock, 'pid_watcher', undefined);

    expect(sock.sent.some((s) => s.parsed.kind === 'ReplayStart')).toBe(true);
    expect(sock.sent.some((s) => s.parsed.kind === 'ReplayEnd')).toBe(true);

    await broadcast(host, publicPhaseEvent(host.highestSeq() + 1));
    expect(sock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
  });

  it('rejects an Intent from a spectator with spectator-cannot-act', async () => {
    // Scenario: Spectator intent rejected.
    const { host, store, matchId } = await makeHostWithSpectator(false);
    const before = (await store.getEvents(matchId, 0)).length;

    const result = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: '2026-05-01T00:00:00.000Z',
      playerId: 'pid_watcher',
      intentId: 'intent-spec-1',
      intent: { kind: 'AdvancePhase' },
    });

    expect(result).toHaveLength(1);
    const err = result[0];
    expect(err.kind).toBe('Error');
    if (err.kind === 'Error') {
      expect(err.code).toBe('INVALID_INTENT');
      expect(err.reason).toBe('spectator-cannot-act');
    }
    // No event appended.
    expect((await store.getEvents(matchId, 0)).length).toBe(before);
  });

  it('still accepts a participant intent in the same match', async () => {
    const { host, matchId } = await makeHostWithSpectator(false);
    const result = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: '2026-05-01T00:00:00.000Z',
      playerId: 'pid_host',
      intentId: 'intent-host-1',
      intent: { kind: 'AdvancePhase' },
    });
    // A participant intent is NOT rejected with spectator-cannot-act.
    const rejectedAsSpectator = result.some(
      (m) => m.kind === 'Error' && m.reason === 'spectator-cannot-act',
    );
    expect(rejectedAsSpectator).toBe(false);
  });
});

describe('ServerMatchHost spectator fog-of-war scope — design D6', () => {
  it('a fog-on spectator never receives a hidden-unit event', async () => {
    // Scenario: Spectator of a fog-on match sees no hidden units.
    const { host } = await makeHostWithSpectator(true);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    // An opponent-owned unit hidden from the host participant: a
    // spectator must NOT receive this event.
    await broadcast(host, movementLockedEvent('opp-3', host.highestSeq() + 1));

    const watcherEvents = watcherSock.sent.filter(
      (s) => s.parsed.kind === 'Event',
    );
    expect(watcherEvents).toHaveLength(0);
  });

  it('a fog-on spectator still receives public events', async () => {
    const { host } = await makeHostWithSpectator(true);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    await broadcast(host, publicPhaseEvent(host.highestSeq() + 1));

    expect(watcherSock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
  });

  it('a fog-off spectator receives every event unredacted', async () => {
    // Scenario: Spectator of a fog-off match sees everything.
    const { host } = await makeHostWithSpectator(false);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    const event = movementLockedEvent('opp-3', host.highestSeq() + 1);
    await broadcast(host, event);

    const received = watcherSock.sent.find(
      (s) => s.parsed.kind === 'Event',
    )?.parsed;
    expect(received).toBeDefined();
    if (received?.kind === 'Event') {
      expect((received.event as IGameEvent).payload).toMatchObject({
        unitId: 'opp-3',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// B10 (P2CG1S): a CURRENT spectator seat never owns a sealed declaration,
// whatever its brand or a stale side assignment says. With `stale`, the
// watcher used to play the opponent side and sideAssignments still names it
// there. A gm brand is a real campaign-session `gm` row read back through
// MatchSeatMembershipSource. Ownership and the publication boundary are not
// mocked; rows read the strings handed to `socket.send`. All three types
// use real payload shapes through the host's own broadcast seam plus a
// stored row served by the real replay call (real intents for movement are
// in sealedChoiceDelivery.test.ts).
// ---------------------------------------------------------------------------

const SEALED_CASES = [
  {
    type: GameEventType.MovementDeclared,
    phase: GamePhase.Movement,
    marker: '"q":11,"r":-4',
    payload: (unitId: string) => ({
      unitId,
      from: { q: 0, r: 0 },
      to: { q: 11, r: -4 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 3,
      heatGenerated: 1,
    }),
  },
  {
    type: GameEventType.AttackDeclared,
    phase: GamePhase.WeaponAttack,
    marker: 'sealed-weapon-mark',
    payload: (attackerId: string) => ({
      attackerId,
      targetId: 'player-scout',
      weapons: ['sealed-weapon-mark'],
      toHitNumber: 8,
      modifiers: [],
    }),
  },
  {
    type: GameEventType.PhysicalAttackDeclared,
    phase: GamePhase.PhysicalAttack,
    marker: '"limb":"leftLeg"',
    payload: (attackerId: string) => ({
      attackerId,
      targetId: 'player-scout',
      attackType: 'kick',
      toHitNumber: 7,
      limb: 'leftLeg',
    }),
  },
];

type SealedCase = (typeof SEALED_CASES)[number];

function sealedEvent(
  kind: SealedCase,
  unitId: string,
  sequence: number,
): IGameEvent {
  return {
    id: `evt-sealed-${kind.type}-${unitId}-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: kind.type,
    turn: 1,
    phase: kind.phase,
    actorId: unitId,
    visibility: 'actor-only',
    payload: kind.payload(unitId),
  } as IGameEvent;
}

/** The fixture brand is the brand the real membership source derives. */
async function expectBrand(
  store: InMemoryMatchStore,
  principalId: string,
  brand: 'player' | 'gm',
): Promise<void> {
  const source = new MatchSeatMembershipSource(store);
  const membership = await source.lookupMembership(
    principalId,
    'match-spectator',
  );
  expect(membership?.role).toBe(brand);
}

async function nextSeq(
  host: ServerMatchHost,
  store: InMemoryMatchStore,
): Promise<number> {
  const stored = await store.getEvents('match-spectator');
  return Math.max(host.highestSeq(), ...stored.map((e) => e.sequence)) + 1;
}

function wireOf(socket: { sent: IRecordedSend[] }): string {
  return socket.sent.map((row) => row.raw).join('\n');
}

function replayedIds(socket: { sent: IRecordedSend[] }): string[] {
  return socket.sent.flatMap((row) =>
    row.parsed.kind === 'ReplayChunk'
      ? (row.parsed.events as readonly { readonly id?: string }[]).map(
          (event) => event.id ?? '',
        )
      : [],
  );
}

/** A public control then the declaration live; then a real replay. */
async function deliver(
  host: ServerMatchHost,
  store: InMemoryMatchStore,
  viewerId: string,
  kind: SealedCase,
) {
  const live = makeSocket();
  host.attachSocket(live, viewerId);
  const control = publicPhaseEvent(await nextSeq(host, store));
  const declaration = sealedEvent(kind, 'opp-0', control.sequence + 1);
  await broadcast(host, control);
  await broadcast(host, declaration);
  await store.appendEvent('match-spectator', declaration);
  const replay = makeSocket();
  await host.sendReplay(replay, 0, viewerId);
  return { live, replay, control, declaration };
}

const WITHHELD = [
  ...[true, false].flatMap((fogOfWar) =>
    (['player', 'gm'] as const).map((brand) => ({
      fogOfWar,
      brand,
      stale: true,
    })),
  ),
  // No assignment at all: only the gm shortcut could leak it.
  { fogOfWar: true, brand: 'gm' as const, stale: false },
  { fogOfWar: false, brand: 'gm' as const, stale: false },
];

describe.each(SEALED_CASES)('B10 sealed $type', (kind) => {
  it.each(WITHHELD)(
    'spectator, fog $fogOfWar, $brand brand, stale $stale: live and replay withhold it',
    async (row) => {
      const { host, store } = await makeHostWithSpectator(row.fogOfWar, row);
      await expectBrand(store, 'pid_watcher', row.brand);
      const sent = await deliver(host, store, 'pid_watcher', kind);
      // Public facts still flow: the row measures withholding, not silence.
      expect(wireOf(sent.live)).toContain(sent.control.id);
      expect(replayedIds(sent.replay).length).toBeGreaterThan(0);
      for (const wire of [wireOf(sent.live), wireOf(sent.replay)]) {
        expect(wire).not.toContain(sent.declaration.id);
        expect(wire).not.toContain(kind.marker);
      }
    },
  );

  it.each([true, false])(
    'fog %s: the human actor and a seated gm keep it',
    async (fogOfWar) => {
      const { host, store } = await makeHostWithSpectator(fogOfWar, {
        gmHost: true,
      });
      await expectBrand(store, 'pid_host', 'gm');
      await expectBrand(store, 'pid_opp', 'player');
      const actor = makeSocket();
      host.attachSocket(actor, 'pid_opp');
      const sent = await deliver(host, store, 'pid_host', kind);
      const actorReplay = makeSocket();
      await host.sendReplay(actorReplay, 0, 'pid_opp');
      for (const socket of [sent.live, actor]) {
        expect(wireOf(socket)).toContain(sent.declaration.id);
      }
      for (const socket of [sent.replay, actorReplay]) {
        expect(replayedIds(socket)).toContain(sent.declaration.id);
      }
    },
  );
});

describe('B10 current seats govern, not a snapshot', () => {
  it('SessionJoin replay withholds it from a stale-assignment spectator', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(false, {
      stale: true,
    });
    const kind = SEALED_CASES[1]!;
    const declaration = sealedEvent(kind, 'opp-0', await nextSeq(host, store));
    await store.appendEvent(matchId, declaration);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_watcher');
    await host.handleSessionJoin(sock, 'pid_watcher', undefined, matchId, 0);
    expect(sock.sent.some((row) => row.parsed.kind === 'ReplayEnd')).toBe(true);
    expect(wireOf(sock)).not.toContain(declaration.id);
    expect(wireOf(sock)).not.toContain(kind.marker);
  });

  it.each([true, false])(
    'fog %s: a player reseated to spectator loses ownership between deliveries',
    async (fogOfWar) => {
      const { host, store, matchId } = await makeHostWithSpectator(fogOfWar, {
        stale: true,
      });
      const before = await store.getMatchMeta(matchId);
      // The watcher PLAYS the opponent seat first.
      const playing = (before.seats ?? [])
        .filter((seat) => seat.kind !== 'spectator')
        .map((seat) =>
          seat.slotId === 'bravo-1'
            ? {
                ...seat,
                occupant: { playerId: 'pid_watcher', displayName: 'W' },
              }
            : seat,
        );
      await store.updateMatchMeta(matchId, { seats: playing });
      const kind = SEALED_CASES[0]!;
      const live = makeSocket();
      host.attachSocket(live, 'pid_watcher');
      const first = sealedEvent(kind, 'opp-0', await nextSeq(host, store));
      await broadcast(host, first);
      await store.appendEvent(matchId, first);
      expect(wireOf(live)).toContain(first.id);

      // Reseat to spectator; the side assignment is left exactly as it was.
      const reseated = addSpectatorSeat(
        playing.map((seat) =>
          seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
        ),
        { playerId: 'pid_watcher', displayName: 'W' },
      );
      await store.updateMatchMeta(matchId, { seats: reseated });
      expect((await store.getMatchMeta(matchId)).sideAssignments).toEqual(
        before.sideAssignments,
      );
      const second = sealedEvent(kind, 'opp-1', await nextSeq(host, store));
      await broadcast(host, second);
      await store.appendEvent(matchId, second);
      expect(wireOf(live)).not.toContain(second.id);

      const replay = makeSocket();
      await host.sendReplay(replay, 0, 'pid_watcher');
      expect(replayedIds(replay).length).toBeGreaterThan(0);
      expect(replayedIds(replay)).not.toContain(first.id);
      expect(replayedIds(replay)).not.toContain(second.id);
    },
  );

  it('a removed principal gets no viewer and no data', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(false, {
      stale: true,
    });
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: (meta.seats ?? []).filter((seat) => seat.kind !== 'spectator'),
    });
    const sent = await deliver(host, store, 'pid_watcher', SEALED_CASES[2]!);
    expect(sent.live.sent.some((row) => row.parsed.kind === 'Event')).toBe(
      false,
    );
    expect(replayedIds(sent.replay)).toEqual([]);
  });
});
