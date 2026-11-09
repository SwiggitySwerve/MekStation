/**
 * Interactive movement terrain PSR wiring (wire-interactive-terrain-psrs PR3).
 * Every interactive movement commit path applies the shared terrain producer
 * once, between MovementDeclared and MovementLocked; the End-phase drain
 * resolves the queued PSRs.
 *
 * @spec openspec/changes/wire-interactive-terrain-psrs/specs/piloting-skill-rolls/spec.md
 */

import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type { IWeapon } from '@/simulation/ai/types';

import {
  buildDeclareMovementIntent,
  translateIntentToEvents,
} from '@/lib/p2p/intentTranslation';
import { commitValidatedMovement } from '@/simulation/runner/phases/movementCommit';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IHex,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type IPSRTriggeredPayload,
  type IUnitStuckPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  resolvePendingPSRs,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { applyEvent } from '@/utils/gameplay/gameState';

import { runMovementPhase } from '../GameEngine.phases';
import { applyInteractiveSessionMovement } from '../InteractiveSession.actions';
import { runInteractiveSessionAITurn } from '../InteractiveSession.ai';

const ORIGIN = { q: 0, r: 0 };
const NEXT = { q: 1, r: 0 };
const FAR = { q: 2, r: 0 };
const WATER_1 = JSON.stringify([{ type: TerrainType.Water, level: 1 }]);
const WATER_3 = JSON.stringify([{ type: TerrainType.Water, level: 3 }]);

function makeGrid(terrain: Readonly<Record<string, string>> = {}): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      const key = `${q},${r}`;
      hexes.set(key, {
        coord: { q, r },
        occupantId: null,
        terrain: terrain[key] ?? TerrainType.Clear,
        elevation: 0,
      });
    }
  }
  return { config: { radius: 6 }, hexes };
}

function makeUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IGameUnit> = {},
): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

/** m1 stands at the origin facing Southeast (toward q+1); the blocker is far away. */
function sessionAtMovement(m1: Partial<IGameUnit> = {}): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      makeUnit('m1', GameSide.Player, m1),
      makeUnit('blocker', GameSide.Opponent),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session.currentState.units.m1 = {
    ...session.currentState.units.m1,
    position: ORIGIN,
    facing: Facing.Southeast,
    heat: 0,
  };
  session.currentState.units.blocker = {
    ...session.currentState.units.blocker,
    position: { q: -4, r: 4 },
    facing: Facing.North,
  };
  return session;
}

function capability(
  overrides: Partial<IMovementCapability> = {},
): Map<string, IMovementCapability> {
  return new Map([['m1', { walkMP: 6, runMP: 9, jumpMP: 0, ...overrides }]]);
}

function fixed2d6(total: number) {
  return () => ({
    dice: total >= 7 ? ([6, total - 6] as const) : ([1, total - 1] as const),
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  });
}

function move(
  session: IGameSession,
  grid: IHexGrid,
  to: IHexCoordinate,
  options: {
    movementType?: MovementType;
    movementByUnit?: Map<string, IMovementCapability>;
  } = {},
): IGameSession {
  const path: IHexCoordinate[] = [];
  for (let q = ORIGIN.q; q <= to.q; q++) path.push({ q, r: 0 });
  return applyInteractiveSessionMovement({
    session,
    grid,
    movementByUnit: options.movementByUnit ?? capability(),
    unitId: 'm1',
    to,
    facing: Facing.Southeast,
    movementType: options.movementType ?? MovementType.Walk,
    path,
  });
}

function appended(
  before: IGameSession,
  after: IGameSession,
): readonly IGameEvent[] {
  return after.events.slice(before.events.length);
}

function psrTuples(events: readonly IGameEvent[]) {
  return events
    .filter((event) => event.type === GameEventType.PSRTriggered)
    .map((event) => {
      const payload = event.payload as IPSRTriggeredPayload;
      return [
        payload.reasonCode,
        payload.additionalModifier,
        payload.triggerSource,
      ];
    });
}

describe('interactive movement terrain PSR wiring', () => {
  it('T-I1 a session walk into water queues one PSR between declare and lock, resolved at End', () => {
    const session = sessionAtMovement();
    const grid = makeGrid({ '1,0': WATER_1 });

    const moved = move(session, grid, NEXT);
    const events = appended(session, moved);

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(events[1].phase).toBe(GamePhase.Movement);
    expect(events[1].payload as IPSRTriggeredPayload).toMatchObject({
      unitId: 'm1',
      reason: 'Entering water',
      reasonCode: PSRTrigger.EnteringWater,
      additionalModifier: -1,
      triggerSource: 'movement-step:0',
      basePilotingSkill: 5,
    });
    expect(moved.currentState.units.m1.pendingPSRs).toHaveLength(1);

    const drained = resolvePendingPSRs(moved, fixed2d6(12));
    const resolved = appended(moved, drained).filter(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0].payload).toMatchObject({
      unitId: 'm1',
      reasonCode: PSRTrigger.EnteringWater,
      passed: true,
    });
  });

  it('T-I2 interactive and runner commits queue the same PSRs for the same move', () => {
    const terrains: Readonly<Record<string, string>> = {
      water1: WATER_1,
      water3: WATER_3,
      rubble: TerrainType.Rubble,
      ice: TerrainType.Ice,
      swamp: TerrainType.Swamp,
      building: JSON.stringify([
        { type: TerrainType.Building, level: 1, constructionFactor: 20 },
      ]),
    };
    for (const [label, tag] of Object.entries(terrains)) {
      const session = sessionAtMovement({ tonnage: 50 });
      const grid = makeGrid({ '1,0': tag });
      const movementByUnit = capability();
      const moved = move(session, grid, NEXT, { movementByUnit });
      const interactive = psrTuples(appended(session, moved));
      const declared = appended(session, moved).find(
        (event) => event.type === GameEventType.MovementDeclared,
      );
      expect({ label, declared: declared !== undefined }).toEqual({
        label,
        declared: true,
      });

      const runnerEvents: IGameEvent[] = [];
      const unit = session.currentState.units.m1;
      commitValidatedMovement({
        currentState: session.currentState,
        events: runnerEvents,
        gameId: session.id,
        grid,
        unitId: 'm1',
        unit,
        payload: {
          unitId: 'm1',
          from: ORIGIN,
          to: NEXT,
          facing: Facing.Southeast,
          movementType: MovementType.Walk,
          mpUsed: 0,
          heatGenerated: 0,
        },
        validationCapability: movementByUnit.get('m1')!,
        mpCost: (declared!.payload as { mpUsed: number }).mpUsed,
        heatGenerated: 0,
        d6Roller: () => 6,
      });

      expect({ label, psrs: interactive }).toEqual({
        label,
        psrs: psrTuples(runnerEvents),
      });
      expect({ label, any: interactive.length > 0 }).toEqual({
        label,
        any: true,
      });
    }
  });

  it('T-I3 a failed interactive ground bog-down sticks the unit with jump eligibility', () => {
    const session = sessionAtMovement();
    const grid = makeGrid({ '1,0': TerrainType.Swamp });
    const moved = move(session, grid, NEXT);
    expect(psrTuples(appended(session, moved))).toEqual([
      [PSRTrigger.SwampBogDown, 0, 'movement-step:0'],
    ]);

    const drained = resolvePendingPSRs(moved, fixed2d6(2));
    const stuck = appended(moved, drained).filter(
      (event) => event.type === GameEventType.UnitStuck,
    );
    expect(stuck).toHaveLength(1);
    expect(stuck[0].payload as IUnitStuckPayload).toEqual({
      unitId: 'm1',
      reason: 'Avoid bogging down',
      reasonCode: PSRTrigger.SwampBogDown,
      canUnstickByJumping: true,
    });
    expect(drained.currentState.units.m1).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
    });

    // Next activation: a walk is refused, an eligible jump frees the unit.
    const ready: IGameSession = {
      ...drained,
      currentState: {
        ...drained.currentState,
        units: {
          ...drained.currentState.units,
          m1: {
            ...drained.currentState.units.m1,
            lockState: LockState.Pending,
          },
        },
      },
    };
    const jumpCapability = capability({ jumpMP: 3 });
    const walked = applyInteractiveSessionMovement({
      session: ready,
      grid,
      movementByUnit: jumpCapability,
      unitId: 'm1',
      to: FAR,
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [NEXT, FAR],
    });
    expect(appended(ready, walked).map((event) => event.type)).toEqual([
      GameEventType.MovementInvalid,
    ]);
    const jumped = applyInteractiveSessionMovement({
      session: ready,
      grid,
      movementByUnit: jumpCapability,
      unitId: 'm1',
      to: { q: 3, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Jump,
    });
    expect(jumped.currentState.units.m1.isStuck).toBe(false);
    expect(jumped.currentState.units.m1.canUnstickByJumping).toBeUndefined();
  });

  it('T-I4 a BattleMech jumping into a swamp sticks immediately without a roll or eligibility', () => {
    const session = sessionAtMovement();
    const grid = makeGrid({ '2,0': TerrainType.Swamp });
    const moved = move(session, grid, FAR, {
      movementType: MovementType.Jump,
      movementByUnit: capability({ jumpMP: 3 }),
    });
    const events = appended(session, moved);

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.UnitStuck,
      GameEventType.MovementLocked,
    ]);
    expect(events[1].payload as IUnitStuckPayload).toEqual({
      unitId: 'm1',
      reason: 'Jumped into bog-down terrain',
      reasonCode: PSRTrigger.SwampBogDown,
    });
    expect(moved.currentState.units.m1.isStuck).toBe(true);
    expect(moved.currentState.units.m1.canUnstickByJumping).toBeUndefined();
  });

  it('T-I8 each trigger is queued once and the reducer replays the appended events to the same state', () => {
    const session = sessionAtMovement();
    const grid = makeGrid({
      '1,0': TerrainType.Rubble,
      '2,0': TerrainType.Rubble,
    });
    const moved = move(session, grid, FAR);
    const events = appended(session, moved);

    expect(psrTuples(events)).toEqual([
      [PSRTrigger.EnteringRubble, 0, 'movement-step:0'],
      [PSRTrigger.EnteringRubble, 0, 'movement-step:1'],
    ]);
    const replayed = events.reduce(
      (state, event) => applyEvent(state, event),
      session.currentState,
    );
    expect(replayed.units.m1.pendingPSRs).toEqual(
      moved.currentState.units.m1.pendingPSRs,
    );
    expect(replayed.units.m1.pendingPSRs).toHaveLength(2);
  });

  it('T-I9 a move across clear terrain appends exactly the events it did before', () => {
    const session = sessionAtMovement();
    const moved = move(session, makeGrid(), FAR);
    expect(appended(session, moved).map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.MovementLocked,
    ]);
  });
});

describe('interactive terrain PSRs on the AI, engine and P2P paths', () => {
  const OPPONENT_ID = 'opponent-1';
  const PLAYER_ID = 'player-1';

  function aiSession(): IGameSession {
    let session = createGameSession(
      {
        mapRadius: 6,
        turnLimit: 30,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      [
        makeUnit(PLAYER_ID, GameSide.Player),
        makeUnit(OPPONENT_ID, GameSide.Opponent),
      ],
    );
    session = startGame(session, GameSide.Player);
    session = rollInitiative(session, GameSide.Opponent, () => 6);
    return advancePhase(session);
  }

  function stubBot(
    unitId: string,
    to: IHexCoordinate,
    from: IHexCoordinate,
    facing: Facing,
  ): BotPlayer {
    return {
      evaluateRetreat: jest.fn(() => null),
      playMovementPhase: jest.fn((aiUnit: { unitId: string }) =>
        aiUnit.unitId === unitId
          ? {
              type: GameEventType.MovementDeclared,
              payload: {
                unitId,
                from,
                to,
                facing,
                movementType: MovementType.Walk,
                mpUsed: 1,
                heatGenerated: 1,
              },
            }
          : null,
      ),
    } as unknown as BotPlayer;
  }

  function waterOneHexAhead(session: IGameSession, unitId: string) {
    const unit = session.currentState.units[unitId];
    const to = { q: unit.position.q, r: unit.position.r + 1 };
    return {
      from: unit.position,
      to,
      facing: unit.facing,
      grid: makeGrid({ [`${to.q},${to.r}`]: WATER_1 }),
    };
  }

  function unitEvents(events: readonly IGameEvent[], unitId: string) {
    return events
      .filter(
        (event) => (event.payload as { unitId?: string }).unitId === unitId,
      )
      .map((event) => event.type);
  }

  it('T-I5 the interactive AI turn queues the terrain PSR for its move', () => {
    let session = aiSession();
    const before = session;
    const { from, to, facing, grid } = waterOneHexAhead(session, OPPONENT_ID);
    runInteractiveSessionAITurn(
      {
        side: GameSide.Opponent,
        getSession: () => session,
        setSession: (next) => {
          session = next;
        },
        appendAndPersistEvent: (event) => {
          session = appendEvent(session, event);
        },
        weaponsByUnit: new Map(),
        movementByUnit: new Map([
          [OPPONENT_ID, { walkMP: 6, runMP: 9, jumpMP: 0 }],
        ]),
        gunneryByUnit: new Map(),
        pilotingByUnit: new Map(),
        tonnageByUnit: new Map(),
        grid,
        botPlayer: stubBot(OPPONENT_ID, to, from, facing),
      },
      OPPONENT_ID,
    );

    expect(unitEvents(appended(before, session), OPPONENT_ID)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(session.currentState.units[OPPONENT_ID].pendingPSRs).toHaveLength(1);
  });

  it('T-I6 GameEngine movement (runToCompletion) queues the terrain PSR for a bot move', () => {
    const session = aiSession();
    const { from, to, facing, grid } = waterOneHexAhead(session, OPPONENT_ID);
    const moved = runMovementPhase(
      session,
      grid,
      stubBot(OPPONENT_ID, to, from, facing),
      new Map<string, readonly IWeapon[]>(),
      new Map([
        [OPPONENT_ID, { walkMP: 6, runMP: 9, jumpMP: 0 }],
        [PLAYER_ID, { walkMP: 6, runMP: 9, jumpMP: 0 }],
      ]),
      new Map(),
    );

    expect(unitEvents(appended(session, moved), OPPONENT_ID)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(psrTuples(appended(session, moved))).toEqual([
      [PSRTrigger.EnteringWater, -1, 'movement-step:0'],
    ]);
  });

  it('T-I7 P2P host translation emits declare, PSR, lock with dense sequences, queued once', () => {
    const HOST = 'host-peer';
    const GUEST = 'guest-peer';
    let session = createGameSession(
      {
        mapRadius: 8,
        turnLimit: 30,
        victoryConditions: ['destroy_all'],
        optionalRules: [],
      },
      [
        makeUnit('host-0', GameSide.Player),
        makeUnit('guest-0', GameSide.Opponent),
      ],
      {
        id: 'match-1',
        createdAt: '2026-04-30T00:00:00.000Z',
        hostPeerId: HOST,
        guestPeerId: GUEST,
        sideOwners: { [GameSide.Player]: HOST, [GameSide.Opponent]: GUEST },
      },
    );
    session = startGame(session, GameSide.Player);
    session = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.Movement,
        status: GameStatus.Active,
      },
    };
    const guest = session.currentState.units['guest-0'];
    const to = { q: guest.position.q, r: guest.position.r + 1 };
    const grid = makeGrid({ [`${to.q},${to.r}`]: WATER_1 });

    const result = translateIntentToEvents(
      buildDeclareMovementIntent(GUEST, {
        unitId: 'guest-0',
        from: guest.position,
        to,
        facing: guest.facing,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      }),
      session,
      {
        movementGrid: grid,
        movementByUnit: new Map([
          ['guest-0', { walkMP: 4, runMP: 6, jumpMP: 0 }],
        ]),
        weaponsByUnit: new Map(),
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(result.events.map((event) => event.sequence)).toEqual([
      session.events.length,
      session.events.length + 1,
      session.events.length + 2,
    ]);
    expect(psrTuples(result.events)).toEqual([
      [PSRTrigger.EnteringWater, -1, 'movement-step:0'],
    ]);

    const applied = result.events.reduce(
      (next, event) => appendEvent(next, event),
      session,
    );
    expect(applied.currentState.units['guest-0'].pendingPSRs).toHaveLength(1);
  });
});
