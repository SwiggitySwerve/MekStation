/**
 * P9: the fog join replay folds its state forward instead of re-deriving
 * it per event. This suite proves the per-socket message stream did not
 * change.
 *
 * THE REFERENCE. Before P9 the loop in `getReplayEventsForPlayer`
 * (ServerMatchHostReplay.ts, base f88904a17) filtered each event against
 * `withVisibilityAssignments(deriveState(gameId, prefix), meta)`, where
 * `prefix` is every replay-log event up to and including this one. P9
 * changes only that expression; the rest of the loop is unchanged text. So
 * the reference run is the real join with the filter's state argument
 * swapped, at the `fogOfWar` seam, for that frozen base expression
 * (`frozenBaseState` below). Everything else on the wire - viewer
 * resolution, the publication boundary, delivery stamping, the lobby
 * baseline - is the real code in both runs.
 *
 * THE FIXTURE. A real host mints the opening log (GameCreated with unit
 * positions); seeded turns then move units across the default 10-hex
 * sensor range, so units drop in and out of sight event by event. Sealed
 * declarations are revealed by phase changes and AttacksRevealed. The
 * rewind shape is what the replay path can see of a rewind: superseded rows
 * past `rewindReplayCeiling` that the gather must drop.
 *
 * NON-VACUITY. Every case also proves the fixture discriminates: the same
 * join with the state taken one event too early ('lag') or one too late
 * ('lead') must produce a DIFFERENT stream for the participants.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameState,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';
import { deriveState } from '@/utils/gameplay/gameState';

import type { ISideAssignment } from '../IMatchStore';
import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { AuthorizedViewerResolver } from '../authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ViewerDeliveryCursors } from '../projection/ViewerDeliveryCursors';
import { ServerMatchHost } from '../ServerMatchHost';
import {
  handleSessionJoin,
  type IServerMatchHostReplayContext,
} from '../ServerMatchHostReplay';

// B14 seam: this suite pins the existing per-viewer fog filter beneath the
// B14 refusal. Production has no per-viewer reveal projection and refuses.
jest.mock('@/lib/multiplayer/server/fogMatchAdmission', () => ({
  ...jest.requireActual<
    typeof import('@/lib/multiplayer/server/fogMatchAdmission')
  >('@/lib/multiplayer/server/fogMatchAdmission'),
  noPerViewerRevealProjection: () => false,
  matchLacksRevealProjection: async () => false,
}));

type StateMode = 'live' | 'base' | 'lag' | 'lead';

interface IMockReference {
  mode: StateMode;
  gameId: string;
  /** The rows the store returned for the replay gather (seq 0). */
  rows: readonly IGameEvent[];
  ceiling: number | null;
  sideAssignments: readonly ISideAssignment[];
}

let mockReference: IMockReference = {
  mode: 'live',
  gameId: '',
  rows: [],
  ceiling: null,
  sideAssignments: [],
};

jest.mock('@/lib/multiplayer/server/fogOfWar', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/multiplayer/server/fogOfWar')
  >('@/lib/multiplayer/server/fogOfWar');
  const gameState = jest.requireActual<
    typeof import('@/utils/gameplay/gameState')
  >('@/utils/gameplay/gameState');

  /**
   * FROZEN from base f88904a17, ServerMatchHostReplay.ts:491 and :509:
   *   const allEvents = await getEventsFromSeq(ctx, 0);   // ceiling filter
   *   prefix.push(event) ...
   *   withVisibilityAssignments(deriveState(gameId, prefix), meta)
   * 'lag' and 'lead' move the prefix end by one event (non-vacuity only).
   */
  function frozenBaseState(event: unknown, state: IGameState): IGameState {
    const ref = mockReference;
    if (ref.mode === 'live') return state;
    const ceiling = ref.ceiling;
    const allEvents =
      ceiling == null
        ? ref.rows
        : ref.rows.filter((row) => row.sequence <= ceiling);
    const index = allEvents.indexOf(event as IGameEvent);
    if (index < 0) throw new Error('reference: event is not a replay row');
    const end =
      ref.mode === 'lag' ? index : ref.mode === 'lead' ? index + 2 : index + 1;
    return {
      ...gameState.deriveState(ref.gameId, allEvents.slice(0, end)),
      sideAssignments: ref.sideAssignments,
    } as IGameState;
  }

  return {
    ...actual,
    filterEventForPlayer: (
      event: IGameEvent,
      playerId: string,
      state: IGameState,
      options?: Parameters<typeof actual.filterEventForPlayer>[3],
    ) =>
      actual.filterEventForPlayer(
        event,
        playerId,
        frozenBaseState(event, state),
        options,
      ),
    filterEventForSpectator: (
      event: IGameEvent,
      state: IGameState,
      options?: Parameters<typeof actual.filterEventForSpectator>[2],
    ) =>
      actual.filterEventForSpectator(
        event,
        frozenBaseState(event, state),
        options,
      ),
  };
});

const MATCH_ID = 'match-p9';
const NOW = '2026-05-01T00:00:00.000Z';
const SIDE_ASSIGNMENTS: readonly ISideAssignment[] = [
  { playerId: 'pid_host', side: 'player' },
  { playerId: 'pid_opp', side: 'opponent' },
];
const PLAYER_UNITS = ['p1', 'p2'];
const OPPONENT_UNITS = ['o1', 'o2', 'o3'];
/** Alternating sides, as initiative orders real movement. */
const ALL_UNITS = ['p1', 'o1', 'p2', 'o2', 'o3'];
/** Construction secrets fog strips for non-owners (one per side). */
const MANIFEST_UNITS = new Set(['p1', 'o1']);
const JOINERS = ['pid_host', 'pid_opp', 'pid_watcher'] as const;
const TURNS = 10;

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    ...(MANIFEST_UNITS.has(id)
      ? {
          criticalSlotManifest: {
            center_torso: [
              {
                slotIndex: 0,
                componentType: 'engine' as const,
                componentName: `${id}-secret-engine`,
                destroyed: false,
              },
            ],
          },
        }
      : {}),
  };
}

async function createFogMatch(): Promise<{
  store: InMemoryMatchStore;
  opening: readonly IGameEvent[];
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  let seats: IMatchSeat[] = defaultSeats('1v1').map((seat, i) => ({
    ...seat,
    occupant:
      i === 0
        ? { playerId: 'pid_host', displayName: 'Host' }
        : { playerId: 'pid_opp', displayName: 'Opp' },
  }));
  seats = addSpectatorSeat(seats, {
    playerId: 'pid_watcher',
    displayName: 'Watcher',
  });
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: SIDE_ASSIGNMENTS,
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    config: { mapRadius: 12, turnLimit: 99, fogOfWar: true },
    layout: '1v1',
    seats,
  });
  // The real host mints and persists the opening log (GameCreated with
  // deployed positions, GameStarted); it is not used after that.
  ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 12,
    turnLimit: 99,
    random: new SeededRandom(7),
    grid: createMinimalGrid(12),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      ...PLAYER_UNITS.map((id) => makeUnit(id, GameSide.Player)),
      ...OPPONENT_UNITS.map((id) => makeUnit(id, GameSide.Opponent)),
    ],
  });
  await Promise.resolve();
  await Promise.resolve();
  const opening = await store.getEvents(MATCH_ID);
  expect(opening.map((event) => event.type)).toEqual([
    GameEventType.GameCreated,
    GameEventType.GameStarted,
  ]);
  return { store, opening };
}

/**
 * Seeded turns in real payload shapes (taken from a played harness log).
 * Units walk in bands where the opposing sides sit 8-16 hexes apart, so
 * visibility under the 10-hex default sensor range flips often.
 */
function seededTurns(
  opening: readonly IGameEvent[],
  seed: number,
  firstTurn: number,
  turns: number,
): IGameEvent[] {
  const random = new SeededRandom(seed);
  const gameId = opening[0].gameId;
  let sequence = opening[opening.length - 1].sequence;
  const positions = new Map<string, { q: number; r: number }>(
    Object.entries(deriveState(gameId, opening).units).map(([id, unit]) => [
      id,
      unit.position,
    ]),
  );
  const out: IGameEvent[] = [];
  const push = (
    type: GameEventType,
    turn: number,
    phase: GamePhase,
    visibility: IGameEvent['visibility'],
    payload: unknown,
    actorId?: string,
  ) => {
    sequence += 1;
    out.push({
      id: `p9-${seed}-${sequence}`,
      gameId,
      sequence,
      timestamp: NOW,
      type,
      turn,
      phase,
      visibility,
      ...(actorId !== undefined ? { actorId } : {}),
      payload,
    } as IGameEvent);
  };
  const enemiesOf = (id: string) =>
    PLAYER_UNITS.includes(id) ? OPPONENT_UNITS : PLAYER_UNITS;

  for (let turn = firstTurn; turn < firstTurn + turns; turn += 1) {
    push(GameEventType.PhaseChanged, turn, GamePhase.Movement, 'public', {
      fromPhase: GamePhase.Initiative,
      toPhase: GamePhase.Movement,
    });
    for (const unitId of ALL_UNITS) {
      const from = positions.get(unitId)!;
      const band = PLAYER_UNITS.includes(unitId) ? 6 : -6;
      const to = {
        q: random.nextInt(5) - 2,
        r: band + random.nextInt(5) - 2,
      };
      positions.set(unitId, to);
      push(
        GameEventType.MovementDeclared,
        turn,
        GamePhase.Movement,
        'actor-only',
        {
          unitId,
          from,
          to,
          facing: 0,
          movementType: 'walk',
          mode: 'walk',
          path: [from, to],
          mpUsed: 2,
          heatGenerated: 1,
        },
        unitId,
      );
      push(
        GameEventType.MovementLocked,
        turn,
        GamePhase.Movement,
        'observer-visible',
        { unitId },
        unitId,
      );
    }
    push(GameEventType.PhaseChanged, turn, GamePhase.WeaponAttack, 'public', {
      fromPhase: GamePhase.Movement,
      toPhase: GamePhase.WeaponAttack,
    });
    const attacks = ALL_UNITS.filter(() => random.next() < 0.5).map(
      (attackerId) => {
        const enemies = enemiesOf(attackerId);
        return {
          attackerId,
          targetId: enemies[random.nextInt(enemies.length)],
        };
      },
    );
    for (const { attackerId, targetId } of attacks) {
      push(
        GameEventType.AttackDeclared,
        turn,
        GamePhase.WeaponAttack,
        'actor-only',
        {
          attackerId,
          targetId,
          weapons: [`${attackerId}-laser`],
          toHitNumber: 7,
          modifiers: [],
        },
        attackerId,
      );
      push(
        GameEventType.AttackLocked,
        turn,
        GamePhase.WeaponAttack,
        'actor-only',
        { unitId: attackerId },
        attackerId,
      );
    }
    push(
      GameEventType.AttacksRevealed,
      turn,
      GamePhase.WeaponAttack,
      'public',
      { unitIds: [...ALL_UNITS].sort(), attackCount: attacks.length },
    );
    for (const { attackerId, targetId } of attacks) {
      const hit = random.next() < 0.6;
      push(
        GameEventType.AttackResolved,
        turn,
        GamePhase.WeaponAttack,
        'target-visible',
        {
          attackerId,
          targetId,
          weaponId: `${attackerId}-laser`,
          roll: 2 + random.nextInt(11),
          toHitNumber: 7,
          hit,
          heat: 3,
          attackerArc: 'front',
        },
        attackerId,
      );
      if (hit) {
        push(
          GameEventType.DamageApplied,
          turn,
          GamePhase.WeaponAttack,
          'target-visible',
          {
            unitId: targetId,
            location: 'right_torso',
            damage: 5,
            armorRemaining: 10,
            structureRemaining: 12,
            locationDestroyed: false,
          },
          targetId,
        );
      }
    }
    for (const unitId of ALL_UNITS) {
      push(
        GameEventType.HeatGenerated,
        turn,
        GamePhase.Heat,
        'observer-visible',
        { unitId, amount: 1, source: 'movement', newTotal: 1 },
        unitId,
      );
    }
    if (turn === firstTurn + Math.floor(turns / 2)) {
      push(
        GameEventType.UnitDestroyed,
        turn,
        GamePhase.Heat,
        'observer-visible',
        { unitId: 'o3', cause: 'ct_destroyed' },
        'o3',
      );
    }
  }
  return out;
}

interface ILogShape {
  readonly name: string;
  readonly store: InMemoryMatchStore;
  readonly gameId: string;
  /** What the rebuilt host session holds (the effective log). */
  readonly sessionEvents: readonly IGameEvent[];
  readonly ceiling: number | null;
}

async function plainFogLog(): Promise<ILogShape> {
  const { store, opening } = await createFogMatch();
  const turns = seededTurns(opening, 11, 1, TURNS);
  for (const event of turns) await store.appendEvent(MATCH_ID, event);
  return {
    name: 'fog log',
    store,
    gameId: opening[0].gameId,
    sessionEvents: [...opening, ...turns],
    ceiling: null,
  };
}

/**
 * A rewind as the replay path sees it: the store still holds superseded
 * rows past the activated cut, and `rewindReplayCeiling` must drop them.
 */
async function rewoundFogLog(): Promise<ILogShape> {
  const { store, opening } = await createFogMatch();
  const kept = seededTurns(opening, 23, 1, TURNS);
  for (const event of kept) await store.appendEvent(MATCH_ID, event);
  const ceiling = kept[kept.length - 1].sequence;
  const superseded = seededTurns([...opening, ...kept], 99, 1 + TURNS, 3);
  for (const event of superseded) await store.appendEvent(MATCH_ID, event);
  return {
    name: 'rewound fog log',
    store,
    gameId: opening[0].gameId,
    sessionEvents: [...opening, ...kept],
    ceiling,
  };
}

/** Rows the gather reads, captured so the reference indexes the same objects. */
function capturingStore(store: InMemoryMatchStore): {
  store: InMemoryMatchStore;
  rows: () => readonly IGameEvent[];
} {
  let rows: readonly IGameEvent[] = [];
  const wrapped = Object.create(store) as InMemoryMatchStore;
  wrapped.getEvents = async (matchId: string, fromSeq?: number) => {
    const events = await store.getEvents(matchId, fromSeq);
    if ((fromSeq ?? 0) === 0) rows = events;
    return events;
  };
  return { store: wrapped, rows: () => rows };
}

/**
 * One join through the real `handleSessionJoin`, recording every frame the
 * socket is sent. The context carries the fields `buildReplayContext`
 * (ServerMatchHostContexts.ts) copies from a host; the session exposes
 * the `id`/`events`/`currentState` of `InteractiveSession.getSession()`.
 * A fresh cursor record per join so the two runs number from the same start.
 */
async function joinStream(
  shape: ILogShape,
  playerId: string,
  fromSeq: number,
  mode: StateMode,
): Promise<IServerMessage[]> {
  const sent: IServerMessage[] = [];
  const captured = capturingStore(shape.store);
  const session = {
    id: shape.gameId,
    events: shape.sessionEvents,
    currentState: deriveState(shape.gameId, shape.sessionEvents),
  };
  const ctx: IServerMatchHostReplayContext = {
    matchId: MATCH_ID,
    store: captured.store,
    session: {
      getSession: () => session,
    } as unknown as IServerMatchHostReplayContext['session'],
    safeSend: (_socket, message) => {
      const wire = JSON.parse(JSON.stringify(message)) as Record<
        string,
        unknown
      >;
      delete wire.ts;
      sent.push(wire as unknown as IServerMessage);
    },
    maybeResume: () => false,
    pauseSnapshot: () => null,
    viewerResolver: new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(shape.store),
    ),
    deliveryCursors: new ViewerDeliveryCursors(),
    rewindReplayCeiling: shape.ceiling,
  };
  const socket: IMatchSocket = { send() {}, close() {}, readyState: 1 };
  mockReference = {
    mode,
    gameId: shape.gameId,
    get rows() {
      return captured.rows();
    },
    ceiling: shape.ceiling,
    sideAssignments: SIDE_ASSIGNMENTS,
  };
  try {
    const joined = await handleSessionJoin(ctx, socket, playerId, fromSeq);
    expect(joined).toBe(true);
  } finally {
    mockReference = { ...mockReference, mode: 'live' };
  }
  return sent;
}

function replayedItems(stream: readonly IServerMessage[]): unknown[] {
  return stream.flatMap((message) =>
    message.kind === 'ReplayChunk' ? [...message.events] : [],
  );
}

describe('P9 fog join replay: fold forward == frozen base derivation', () => {
  const tally = { cases: 0, frames: 0, discriminated: 0 };

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log(`P9 equivalence ${JSON.stringify(tally)}`);
  });

  for (const build of [plainFogLog, rewoundFogLog]) {
    it(`${build.name}: every joiner at every join point gets the base stream`, async () => {
      const shape = await build();
      const effective = shape.sessionEvents;
      const mid = effective[Math.floor(effective.length / 2)].sequence;
      const last = effective[effective.length - 1].sequence;
      const joinPoints = [0, mid, last, last + 1];

      for (const playerId of JOINERS) {
        for (const fromSeq of joinPoints) {
          const folded = await joinStream(shape, playerId, fromSeq, 'live');
          const base = await joinStream(shape, playerId, fromSeq, 'base');
          expect(folded).toEqual(base);
          tally.cases += 1;
          tally.frames += folded.length;
        }
      }

      // Superseded rows never surface (the ceiling is honoured).
      if (shape.ceiling !== null) {
        const ceiling = shape.ceiling;
        const stream = await joinStream(shape, 'pid_host', 0, 'live');
        const ids = new Set(
          replayedItems(stream).map((item) => (item as { id?: string }).id),
        );
        const rows = await shape.store.getEvents(MATCH_ID);
        for (const row of rows.filter((r) => r.sequence > ceiling)) {
          expect(ids.has(row.id)).toBe(false);
        }
      }

      // Fog really conceals here: participants get different subsets,
      // and each is denied something.
      const host = replayedItems(
        await joinStream(shape, 'pid_host', 0, 'live'),
      );
      const opp = replayedItems(await joinStream(shape, 'pid_opp', 0, 'live'));
      expect(host).not.toEqual(opp);
      expect(host.length).toBeLessThan(effective.length);
      expect(opp.length).toBeLessThan(effective.length);

      // Non-vacuity: a state one event early or late changes the stream.
      for (const playerId of ['pid_host', 'pid_opp']) {
        for (const wrong of ['lag', 'lead'] as const) {
          const base = await joinStream(shape, playerId, 0, 'base');
          const shifted = await joinStream(shape, playerId, 0, wrong);
          expect(shifted).not.toEqual(base);
          tally.discriminated += 1;
        }
      }
    });
  }

  it('late joins on a growing match, then after a rewind, get the base stream', async () => {
    const { store, opening } = await createFogMatch();
    const gameId = opening[0].gameId;
    const first = seededTurns(opening, 31, 1, TURNS / 2);
    for (const event of first) await store.appendEvent(MATCH_ID, event);
    const early: ILogShape = {
      name: 'early',
      store,
      gameId,
      sessionEvents: [...opening, ...first],
      ceiling: null,
    };
    const more = seededTurns(early.sessionEvents, 37, 1 + TURNS / 2, TURNS / 2);
    for (const event of more) await store.appendEvent(MATCH_ID, event);
    const grown: ILogShape = {
      ...early,
      name: 'grown',
      sessionEvents: [...early.sessionEvents, ...more],
    };
    const cut = first[first.length - 1].sequence;
    const rewound: ILogShape = {
      ...early,
      name: 'rewound',
      ceiling: cut,
    };
    const resume = cut + 1;
    const steps: readonly (readonly [ILogShape, readonly number[]])[] = [
      [early, [0]],
      [grown, [0, resume, more[more.length - 1].sequence]],
      [rewound, [0, first[Math.floor(first.length / 2)].sequence]],
    ];

    for (const [shape, joinPoints] of steps) {
      for (const playerId of JOINERS) {
        for (const fromSeq of joinPoints) {
          const folded = await joinStream(shape, playerId, fromSeq, 'live');
          const base = await joinStream(shape, playerId, fromSeq, 'base');
          expect(folded).toEqual(base);
          tally.cases += 1;
          tally.frames += folded.length;
        }
      }
    }
  });
});
