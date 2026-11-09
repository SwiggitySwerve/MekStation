/**
 * Interactive running-with-damage PSR wiring (C-1a). Every interactive
 * movement commit path applies the shared running-with-damage planner once,
 * between MovementDeclared and MovementLocked, and the standalone runner
 * queues the same roll; the End-phase drain resolves it.
 *
 * MegaMek 48fcb2f64: `MovePathHandler.java` L1282-L1286, `TWRulesPSR.java`
 * L62-L77.
 *
 * @spec openspec/changes/close-combat-psr-parity-gaps/specs/piloting-skill-rolls/spec.md
 */

import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type { IWeapon } from '@/simulation/ai/types';

import {
  buildDeclareMovementIntent,
  translateIntentToEvents,
} from '@/lib/p2p/intentTranslation';
import { commitValidatedMovement } from '@/simulation/runner/phases/movementCommit';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
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
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createCriticalHitResolvedEvent } from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  resolvePendingPSRs,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import { runMovementPhase } from '../GameEngine.phases';
import { applyInteractiveSessionMovement } from '../InteractiveSession.actions';
import { runInteractiveSessionAITurn } from '../InteractiveSession.ai';

const ORIGIN = { q: 0, r: 0 };
const NEXT = { q: 1, r: 0 };
const FAR = { q: 2, r: 0 };
const WATER_1 = JSON.stringify([{ type: TerrainType.Water, level: 1 }]);

/** Damage a unit takes through real critical-hit events. */
interface IDamageSpec {
  readonly gyroHits?: number;
  readonly hip?: boolean;
}
const NO_DAMAGE: IDamageSpec = {};
const HIP: IDamageSpec = { hip: true };
const GYRO: IDamageSpec = { gyroHits: 1 };
const HIP_AND_GYRO: IDamageSpec = { gyroHits: 1, hip: true };

/**
 * Append the critical-hit events that give `unitId` the damage. State is
 * re-derived from events on every append, so do this before any direct
 * position or facing patch.
 */
function withDamage(
  session: IGameSession,
  unitId: string,
  damage: IDamageSpec,
): IGameSession {
  const crits: { componentType: string; componentName: string; at: string }[] =
    [];
  for (let hit = 0; hit < (damage.gyroHits ?? 0); hit++) {
    crits.push({
      componentType: 'gyro',
      componentName: 'gyro',
      at: 'center_torso',
    });
  }
  if (damage.hip) {
    crits.push({
      componentType: 'actuator',
      componentName: ActuatorType.HIP,
      at: 'left_leg',
    });
  }
  return crits.reduce(
    (next, crit, index) =>
      appendEvent(
        next,
        createCriticalHitResolvedEvent({
          gameId: next.id,
          sequence: next.events.length,
          turn: next.currentState.turn,
          phase: next.currentState.phase,
          unitId,
          location: crit.at,
          slotIndex: index,
          componentType: crit.componentType,
          componentName: crit.componentName,
          effect: 'damaged',
          destroyed: true,
        }),
      ),
    session,
  );
}

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

/** m1 stands at the origin facing Southeast with the given damage. */
function sessionAtMovement(
  damage: IDamageSpec,
  m1: Partial<IGameUnit> = {},
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      { ...makeUnit('m1', GameSide.Player), ...m1 },
      makeUnit('blocker', GameSide.Opponent),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session = withDamage(session, 'm1', damage);
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

function capability(): Map<string, IMovementCapability> {
  return new Map([['m1', { walkMP: 6, runMP: 9, jumpMP: 0 }]]);
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
  movementType: MovementType,
): IGameSession {
  const path: IHexCoordinate[] = [];
  for (let q = ORIGIN.q; q <= to.q; q++) path.push({ q, r: 0 });
  return applyInteractiveSessionMovement({
    session,
    grid,
    movementByUnit: capability(),
    unitId: 'm1',
    to,
    facing: Facing.Southeast,
    movementType,
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

describe('interactive running-with-damage PSR wiring', () => {
  it('R-1 a session run with a damaged hip queues one PSR between declare and lock, resolved at End', () => {
    const session = sessionAtMovement(HIP);
    const moved = move(session, makeGrid(), FAR, MovementType.Run);
    const events = appended(session, moved);

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(events[1].phase).toBe(GamePhase.Movement);
    expect(events[1].payload as IPSRTriggeredPayload).toMatchObject({
      unitId: 'm1',
      reasonCode: PSRTrigger.RunningDamagedHip,
      additionalModifier: 0,
      triggerSource: 'movement-step:1',
      basePilotingSkill: 5,
    });
    expect(moved.currentState.units.m1.pendingPSRs).toHaveLength(1);

    const passed = appended(moved, resolvePendingPSRs(moved, fixed2d6(12)));
    expect(
      passed.find((event) => event.type === GameEventType.PSRResolved)?.payload,
    ).toMatchObject({ reasonCode: PSRTrigger.RunningDamagedHip, passed: true });
    expect(passed.some((event) => event.type === GameEventType.UnitFell)).toBe(
      false,
    );

    const failed = appended(moved, resolvePendingPSRs(moved, fixed2d6(2)));
    expect(failed.some((event) => event.type === GameEventType.UnitFell)).toBe(
      true,
    );
  });

  it('R-2 a walk, an undamaged run and a hip plus gyro run queue the right number of PSRs', () => {
    const grid = makeGrid();
    const walked = move(
      sessionAtMovement(HIP_AND_GYRO),
      grid,
      FAR,
      MovementType.Walk,
    );
    expect(psrTuples(walked.events)).toEqual([]);

    const clean = move(
      sessionAtMovement(NO_DAMAGE),
      grid,
      FAR,
      MovementType.Run,
    );
    expect(psrTuples(clean.events)).toEqual([]);

    const both = sessionAtMovement(HIP_AND_GYRO);
    const bothMoved = move(both, grid, FAR, MovementType.Run);
    expect(psrTuples(appended(both, bothMoved))).toEqual([
      [PSRTrigger.RunningDamagedGyro, 0, 'movement-step:1'],
    ]);
  });

  it('R-3 interactive and runner commits queue the same PSRs for the same move', () => {
    const cases: Readonly<
      Record<string, { damage: IDamageSpec; terrain: string }>
    > = {
      hip: { damage: HIP, terrain: TerrainType.Clear },
      gyro: { damage: GYRO, terrain: TerrainType.Clear },
      'hip and gyro': { damage: HIP_AND_GYRO, terrain: TerrainType.Clear },
      'gyro into water': { damage: GYRO, terrain: WATER_1 },
      'undamaged into water': { damage: NO_DAMAGE, terrain: WATER_1 },
    };
    for (const [label, { damage, terrain }] of Object.entries(cases)) {
      const session = sessionAtMovement(damage);
      const grid = makeGrid({ '1,0': terrain });
      const movementByUnit = capability();
      const moved = move(session, grid, NEXT, MovementType.Run);
      const interactive = psrTuples(appended(session, moved));
      const declared = appended(session, moved).find(
        (event) => event.type === GameEventType.MovementDeclared,
      );

      const runnerEvents: IGameEvent[] = [];
      commitValidatedMovement({
        currentState: session.currentState,
        events: runnerEvents,
        gameId: session.id,
        grid,
        unitId: 'm1',
        unit: session.currentState.units.m1,
        payload: {
          unitId: 'm1',
          from: ORIGIN,
          to: NEXT,
          facing: Facing.Southeast,
          movementType: MovementType.Run,
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

  it('R-4 the damage roll comes before the terrain roll, as in the runner', () => {
    const session = sessionAtMovement(GYRO);
    const moved = move(
      session,
      makeGrid({ '1,0': WATER_1 }),
      NEXT,
      MovementType.Run,
    );

    expect(psrTuples(appended(session, moved))).toEqual([
      [PSRTrigger.RunningDamagedGyro, 0, 'movement-step:0'],
      [PSRTrigger.EnteringWater, -1, 'movement-step:0'],
    ]);
  });

  it('R-8 a heavy-duty gyro from the unit config ignores its first hit', () => {
    const grid = makeGrid();
    const oneHit = sessionAtMovement(GYRO, { gyroType: 'Heavy-Duty' });
    expect(
      psrTuples(appended(oneHit, move(oneHit, grid, FAR, MovementType.Run))),
    ).toEqual([]);

    const twoHits = sessionAtMovement(
      { gyroHits: 2 },
      { gyroType: 'Heavy-Duty' },
    );
    expect(
      psrTuples(appended(twoHits, move(twoHits, grid, FAR, MovementType.Run))),
    ).toEqual([[PSRTrigger.RunningDamagedGyro, 0, 'movement-step:1']]);
  });
});

describe('running-with-damage PSRs on the AI, engine and P2P paths', () => {
  const OPPONENT_ID = 'opponent-1';
  const PLAYER_ID = 'player-1';

  function aiSession(damage: IDamageSpec): IGameSession {
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
    session = advancePhase(session);
    return withDamage(session, OPPONENT_ID, damage);
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
                movementType: MovementType.Run,
                mpUsed: 1,
                heatGenerated: 2,
              },
            }
          : null,
      ),
    } as unknown as BotPlayer;
  }

  function oneHexAhead(session: IGameSession, unitId: string) {
    const unit = session.currentState.units[unitId];
    return {
      from: unit.position,
      to: { q: unit.position.q, r: unit.position.r + 1 },
      facing: unit.facing,
      grid: makeGrid(),
    };
  }

  function unitEvents(events: readonly IGameEvent[], unitId: string) {
    return events
      .filter(
        (event) => (event.payload as { unitId?: string }).unitId === unitId,
      )
      .map((event) => event.type);
  }

  it('R-5 the interactive AI turn queues the running-with-damage PSR for its run', () => {
    let session = aiSession(GYRO);
    const before = session;
    const { from, to, facing, grid } = oneHexAhead(session, OPPONENT_ID);
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
    expect(psrTuples(appended(before, session))).toEqual([
      [PSRTrigger.RunningDamagedGyro, 0, 'movement-step:0'],
    ]);
  });

  it('R-6 GameEngine movement (runToCompletion) queues the running-with-damage PSR for a bot run', () => {
    const session = aiSession(HIP);
    const { from, to, facing, grid } = oneHexAhead(session, OPPONENT_ID);
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
      [PSRTrigger.RunningDamagedHip, 0, 'movement-step:0'],
    ]);
  });

  it('R-7 P2P host translation emits the same declare, PSR, lock events as the session path', () => {
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
    session = withDamage(session, 'guest-0', HIP_AND_GYRO);
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

    const result = translateIntentToEvents(
      buildDeclareMovementIntent(GUEST, {
        unitId: 'guest-0',
        from: guest.position,
        to,
        facing: guest.facing,
        movementType: MovementType.Run,
        mpUsed: 1,
        heatGenerated: 0,
      }),
      session,
      {
        movementGrid: makeGrid(),
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
      [PSRTrigger.RunningDamagedGyro, 0, 'movement-step:0'],
    ]);

    const applied = result.events.reduce(
      (next, event) => appendEvent(next, event),
      session,
    );
    expect(applied.currentState.units['guest-0'].pendingPSRs).toHaveLength(1);
  });
});
