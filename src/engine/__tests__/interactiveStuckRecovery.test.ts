/**
 * Movement-start stuck recovery in the session and engine paths
 * (wire-interactive-terrain-psrs PR4). MegaMek 48fcb2f64 rolls doTryUnstuck
 * (TWGameManager L31368-L31419) when the movement phase is prepared, before
 * anyone moves.
 *
 * @spec openspec/changes/wire-interactive-terrain-psrs/specs/piloting-skill-rolls/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IWeapon } from '@/simulation/ai/types';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IHex,
  type IHexGrid,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createUnitStuckEvent } from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  createGameSession,
  hydrateGameSessionFromEvents,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';
import {
  advanceInteractiveSessionPhase,
  type IInteractiveSessionPhaseContext,
} from '../InteractiveSession.phases';

const QUICKSAND = JSON.stringify([{ type: TerrainType.Swamp, level: 2 }]);

function makeGrid(terrainAt: (q: number, r: number) => string): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -7; q <= 7; q++) {
    for (let r = -7; r <= 7; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: terrainAt(q, r),
        elevation: 0,
      });
    }
  }
  return { config: { radius: 7 }, hexes };
}

function unit(id: string, side: GameSide): IGameUnit {
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

/** Turn 1 Initiative with m1 stuck (optionally eligible to jump free). */
function stuckSessionAtInitiative(canUnstickByJumping = false): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 7,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [unit('m1', GameSide.Player), unit('o1', GameSide.Opponent)],
  );
  session = startGame(session, GameSide.Player);
  return appendEvent(
    session,
    createUnitStuckEvent({
      gameId: session.id,
      sequence: session.events.length,
      turn: session.currentState.turn,
      phase: session.currentState.phase,
      unitId: 'm1',
      reason: 'Avoid bogging down',
      reasonCode: PSRTrigger.SwampBogDown,
      ...(canUnstickByJumping ? { canUnstickByJumping: true as const } : {}),
    }),
  );
}

/** Initiative takes four d6 (player 6+6, opponent 1+1); then the scripted rolls. */
function scriptedD6(...after: number[]) {
  const queue = [6, 6, 1, 1, ...after];
  const roller = (): number => {
    calls.count++;
    const next = queue.shift();
    if (next === undefined) throw new Error('unexpected extra d6 draw');
    return next;
  };
  const calls = { count: 0 };
  return { roller, calls };
}

function advanceFromInitiative(
  session: IGameSession,
  grid: IHexGrid,
  d6: () => number,
): IGameSession {
  let current = session;
  const context: IInteractiveSessionPhaseContext = {
    getSession: () => current,
    setSession: (next) => {
      current = next;
    },
    d6RollerForResolvers: () => d6,
    diceRollerForResolvers: () => undefined,
    physicalContextByUnit: () => new Map(),
    grid: () => grid,
    waterDepthAt: () => 0,
    environmentHeatEffectAt: () => 0,
    isGameOver: () => false,
  };
  advanceInteractiveSessionPhase(context);
  return current;
}

function gridWithTerrainUnder(
  session: IGameSession,
  unitId: string,
  tag: string,
): IHexGrid {
  const { q, r } = session.currentState.units[unitId].position;
  return makeGrid((hq, hr) => (hq === q && hr === r ? tag : TerrainType.Clear));
}

function recoveryEvents(events: readonly IGameEvent[]) {
  return events.filter(
    (event) =>
      (event.type === GameEventType.PSRTriggered ||
        event.type === GameEventType.PSRResolved) &&
      (event.payload as { reasonCode?: string }).reasonCode ===
        PSRTrigger.SwampUnstuck,
  );
}

describe('movement-start stuck recovery in the interactive session', () => {
  it('T-R1 rolls before any movement with TN base +1 in swamp and +4 in quicksand', () => {
    for (const [tag, targetNumber] of [
      [TerrainType.Swamp, 6],
      [QUICKSAND, 9],
    ] as const) {
      const session = stuckSessionAtInitiative();
      const grid = gridWithTerrainUnder(session, 'm1', tag);
      const { roller } = scriptedD6(6, 6);

      const advanced = advanceFromInitiative(session, grid, roller);
      const appended = advanced.events.slice(session.events.length);

      expect(advanced.currentState.phase).toBe(GamePhase.Movement);
      const phaseChange = appended.findIndex(
        (event) => event.type === GameEventType.PhaseChanged,
      );
      const recovery = recoveryEvents(appended);
      expect(recovery.map((event) => event.type)).toEqual([
        GameEventType.PSRTriggered,
        GameEventType.PSRResolved,
      ]);
      expect(appended.indexOf(recovery[0])).toBeGreaterThan(phaseChange);
      expect(
        recovery.every((event) => event.phase === GamePhase.Movement),
      ).toBe(true);
      expect(recovery[0].payload as IPSRTriggeredPayload).toMatchObject({
        unitId: 'm1',
        reason: 'Break free of swamp',
        triggerSource: PSRTrigger.SwampUnstuck,
        basePilotingSkill: 5,
      });
      expect(recovery[1].payload as IPSRResolvedPayload).toMatchObject({
        unitId: 'm1',
        targetNumber,
        roll: 12,
        passed: true,
      });
    }
  });

  it('T-R2 a pass frees the unit and drops eligibility; a failure keeps it stuck without a fall', () => {
    const passedSession = stuckSessionAtInitiative(true);
    const grid = gridWithTerrainUnder(passedSession, 'm1', TerrainType.Swamp);
    const passed = advanceFromInitiative(
      passedSession,
      grid,
      scriptedD6(3, 3).roller,
    );
    expect(passed.currentState.units.m1.isStuck).toBe(false);
    expect(passed.currentState.units.m1.canUnstickByJumping).toBeUndefined();
    expect(passed.currentState.units.m1.pendingPSRs ?? []).toEqual([]);

    const failedSession = stuckSessionAtInitiative(true);
    const failed = advanceFromInitiative(
      failedSession,
      grid,
      scriptedD6(2, 3).roller,
    );
    const appended = failed.events.slice(failedSession.events.length);
    expect(
      recoveryEvents(appended)[1].payload as IPSRResolvedPayload,
    ).toMatchObject({
      targetNumber: 6,
      roll: 5,
      passed: false,
    });
    expect(failed.currentState.units.m1).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
    });
    expect(failed.currentState.units.m1.pendingPSRs ?? []).toEqual([]);
    expect(
      appended.filter(
        (event) =>
          event.type === GameEventType.UnitFell ||
          event.type === GameEventType.PilotHit,
      ),
    ).toEqual([]);
  });

  it('T-R5 the journal replays the recovery outcome without drawing dice', () => {
    const session = stuckSessionAtInitiative();
    const grid = gridWithTerrainUnder(session, 'm1', TerrainType.Swamp);
    const advanced = advanceFromInitiative(
      session,
      grid,
      scriptedD6(3, 3).roller,
    );

    const rebuilt = hydrateGameSessionFromEvents(advanced.id, advanced.events);
    expect(rebuilt.events).toHaveLength(advanced.events.length);
    expect(rebuilt.currentState.units.m1).toEqual(
      advanced.currentState.units.m1,
    );
  });

  it('T-R6 with no stuck unit nothing is emitted and no extra die is drawn', () => {
    let session = createGameSession(
      {
        mapRadius: 7,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      [unit('m1', GameSide.Player), unit('o1', GameSide.Opponent)],
    );
    session = startGame(session, GameSide.Player);
    const grid = gridWithTerrainUnder(session, 'm1', TerrainType.Swamp);
    const { roller, calls } = scriptedD6();

    const advanced = advanceFromInitiative(session, grid, roller);

    expect(calls.count).toBe(4);
    expect(recoveryEvents(advanced.events)).toEqual([]);
  });
});

describe('movement-start stuck recovery in GameEngine.runToCompletion', () => {
  function weapon(id: string): IWeapon {
    return {
      id,
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 1,
      heat: 0,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    };
  }

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
      weapons: [weapon(`${id}-ml`)],
      walkMP: 4,
      runMP: 6,
      jumpMP: 4,
    };
  }

  /** Swamp on every other column, so jumps from clear ground land in swamp. */
  const SWAMPY = makeGrid((q) =>
    Math.abs(q) % 2 === 1 ? TerrainType.Swamp : TerrainType.Clear,
  );

  function play(seed: number): IGameSession {
    const players = [
      adapted('p1', GameSide.Player, { q: 0, r: 4 }),
      adapted('p2', GameSide.Player, { q: 2, r: 4 }),
    ];
    const opponents = [
      adapted('o1', GameSide.Opponent, { q: 0, r: -4 }),
      adapted('o2', GameSide.Opponent, { q: -2, r: -4 }),
    ];
    return new GameEngine({
      seed,
      turnLimit: 8,
      mapRadius: 7,
      grid: SWAMPY,
    }).runToCompletion(
      players,
      opponents,
      [...players, ...opponents].map((entry) => unit(entry.id, entry.side)),
    );
  }

  /** Every recovery pair sits in Movement, before that turn's first MovementDeclared, for a stuck unit. */
  function recoveryRolls(session: IGameSession): number {
    const stuck = new Set<string>();
    let rolls = 0;
    let declaredThisTurn = false;
    let turn = -1;
    for (const event of session.events) {
      if (event.turn !== turn) {
        turn = event.turn;
        declaredThisTurn = false;
      }
      const payload = event.payload as {
        unitId?: string;
        reasonCode?: string;
        passed?: boolean;
      };
      if (event.type === GameEventType.MovementDeclared)
        declaredThisTurn = true;
      if (event.type === GameEventType.UnitStuck && payload.unitId)
        stuck.add(payload.unitId);
      if (payload.reasonCode === PSRTrigger.SwampUnstuck) {
        expect({
          phase: event.phase,
          declaredThisTurn,
          stuck: stuck.has(payload.unitId!),
        }).toEqual({
          phase: GamePhase.Movement,
          declaredThisTurn: false,
          stuck: true,
        });
        if (event.type === GameEventType.PSRResolved) {
          rolls++;
          if (payload.passed) stuck.delete(payload.unitId!);
        }
      }
    }
    return rolls;
  }

  it('T-R4 a stuck unit rolls at the start of auto-resolved movement, seeded and repeatable', () => {
    // Seeds 3 and 5 each leave units stuck after jumping into swamp.
    for (const seed of [3, 5]) {
      const first = play(seed);
      expect({ seed, rolled: recoveryRolls(first) > 0 }).toEqual({
        seed,
        rolled: true,
      });
      const second = play(seed);
      expect(
        recoveryEvents(second.events).map((event) => event.payload),
      ).toEqual(recoveryEvents(first.events).map((event) => event.payload));
    }
  });
});
