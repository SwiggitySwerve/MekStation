import type { SeededRandom } from '@/simulation/core/SeededRandom';

import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitGameState,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { applyEvent } from '@/utils/gameplay/gameState';
import { createSwampBogDownPSR } from '@/utils/gameplay/pilotingSkillRolls';

import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runMovementPhase } from '../phases/movement';
import { runPSRPhase } from '../phases/postCombatPsr';
import { resetTurnState } from '../SimulationRunnerState';
import {
  createMinimalGrid,
  createMinimalUnitState,
} from '../SimulationRunnerSupport';
import {
  ScriptedMovePlayer,
  fixedRandom,
  setTerrain,
  setTerrainFeatures,
} from './movementPhase.behavior.test-helpers';

// d6 = floor(next * 6) + 1, so these force every die to 6 or to 1.
const ALWAYS_SIX = 0.99;
const ALWAYS_ONE = 0;
const JUMP_CAPABILITY = { walkMP: 4, runMP: 6, jumpMP: 4 };
const ORIGIN = { q: 0, r: 0 };

function stuckUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    ...createMinimalUnitState('player-1', GameSide.Player, ORIGIN),
    isStuck: true,
    ...overrides,
  };
}

function gameState(
  unit: IUnitGameState,
  phase = GamePhase.Movement,
): IGameState {
  return {
    gameId: 'c6b-stuck-lifecycle',
    status: GameStatus.Active,
    turn: 2,
    phase,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

function swampGrid(level = 1): IHexGrid {
  const grid = createMinimalGrid(5);
  return level === 1
    ? setTerrain(grid, ORIGIN, TerrainType.Swamp)
    : setTerrainFeatures(grid, ORIGIN, [{ type: TerrainType.Swamp, level }]);
}

function runMovement(options: {
  readonly state: IGameState;
  readonly grid: IHexGrid;
  readonly random: SeededRandom;
  readonly target: IHexCoordinate;
  readonly movementType: MovementType;
}): { readonly next: IGameState; readonly events: IGameEvent[] } {
  const events: IGameEvent[] = [];
  const next = runMovementPhase({
    state: options.state,
    botPlayer: new ScriptedMovePlayer(
      'player-1',
      options.target,
      options.movementType,
    ),
    grid: options.grid,
    movementCapabilitiesByUnit: new Map([['player-1', JUMP_CAPABILITY]]),
    invariantRunner: new InvariantRunner(),
    violations: [],
    events,
    gameId: options.state.gameId,
    random: options.random,
  });
  return { next, events };
}

function recoveryEvents(events: readonly IGameEvent[]) {
  const triggered = events
    .filter((event) => event.type === GameEventType.PSRTriggered)
    .map((event) => event.payload as IPSRTriggeredPayload)
    .filter((payload) => payload.reasonCode === PSRTrigger.SwampUnstuck);
  const resolved = events
    .filter((event) => event.type === GameEventType.PSRResolved)
    .map((event) => event.payload as IPSRResolvedPayload)
    .filter((payload) => payload.reasonCode === PSRTrigger.SwampUnstuck);
  return { triggered, resolved };
}

function eventTypes(events: readonly IGameEvent[]): readonly GameEventType[] {
  return events.map((event) => event.type);
}

function replay(initial: IGameState, events: readonly IGameEvent[]) {
  return events.reduce(applyEvent, initial);
}

describe('C6b runner stuck lifecycle', () => {
  it('T-S1: a failed ground-movement bog-down grants jump eligibility', () => {
    const state = gameState(
      stuckUnit({
        isStuck: false,
        pendingPSRs: [createSwampBogDownPSR('player-1', 0)],
      }),
      GamePhase.PhysicalAttack,
    );
    const events: IGameEvent[] = [];
    const next = runPSRPhase({
      state,
      events,
      gameId: state.gameId,
      random: fixedRandom(ALWAYS_ONE),
    });

    expect(next.units['player-1']).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
      prone: false,
      pendingPSRs: [],
    });
    expect(
      events.find((event) => event.type === GameEventType.UnitStuck)?.payload,
    ).toMatchObject({ unitId: 'player-1', canUnstickByJumping: true });
  });

  it('T-S2: a passing movement-start recovery roll frees the unit before it moves', () => {
    const { next, events } = runMovement({
      state: gameState(stuckUnit({ canUnstickByJumping: true })),
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_SIX),
      target: { q: 1, r: 0 },
      movementType: MovementType.Walk,
    });

    const { triggered, resolved } = recoveryEvents(events);
    expect(triggered).toEqual([
      expect.objectContaining({ unitId: 'player-1', additionalModifier: 1 }),
    ]);
    // Base piloting 5, +1 swamp terrain, +0 swamp unstuck modifier.
    expect(resolved).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        targetNumber: 6,
        roll: 12,
        passed: true,
      }),
    ]);
    expect(eventTypes(events).indexOf(GameEventType.PSRResolved)).toBeLessThan(
      eventTypes(events).indexOf(GameEventType.MovementDeclared),
    );
    expect(next.units['player-1'].isStuck).toBe(false);
    expect(next.units['player-1']).not.toHaveProperty('canUnstickByJumping');
    expect(next.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('T-S2: quicksand adds +3 to the recovery roll', () => {
    const { events } = runMovement({
      state: gameState(stuckUnit()),
      grid: swampGrid(2),
      random: fixedRandom(ALWAYS_SIX),
      target: ORIGIN,
      movementType: MovementType.Stationary,
    });

    expect(recoveryEvents(events).resolved).toEqual([
      expect.objectContaining({ targetNumber: 9, passed: true }),
    ]);
  });

  it('T-S3: a failed recovery roll keeps the unit stuck with no fall or pilot damage', () => {
    const { next, events } = runMovement({
      state: gameState(stuckUnit()),
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_ONE),
      target: { q: 1, r: 0 },
      movementType: MovementType.Walk,
    });

    expect(recoveryEvents(events).resolved).toEqual([
      expect.objectContaining({ roll: 2, passed: false }),
    ]);
    expect(eventTypes(events)).not.toContain(GameEventType.UnitFell);
    expect(eventTypes(events)).not.toContain(GameEventType.PilotHit);
    expect(eventTypes(events)).toContain(GameEventType.MovementInvalid);
    expect(next.units['player-1']).toMatchObject({
      isStuck: true,
      prone: false,
      pilotWounds: 0,
      position: ORIGIN,
    });
  });

  it('T-S4: stuck persists across the turn reset, and an unconscious pilot does not roll', () => {
    const carried = resetTurnState(gameState(stuckUnit())).units['player-1'];
    expect(carried.isStuck).toBe(true);

    const { next, events } = runMovement({
      state: gameState(stuckUnit({ pilotConscious: false })),
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_SIX),
      target: { q: 1, r: 0 },
      movementType: MovementType.Walk,
    });
    expect(recoveryEvents(events).triggered).toEqual([]);
    expect(recoveryEvents(events).resolved).toEqual([]);
    expect(next.units['player-1'].isStuck).toBe(true);
  });

  it('T-S5: an eligible stuck unit jumps free after a failed recovery roll', () => {
    const { next, events } = runMovement({
      state: gameState(stuckUnit({ canUnstickByJumping: true })),
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_ONE),
      target: { q: 2, r: 0 },
      movementType: MovementType.Jump,
    });

    expect(recoveryEvents(events).resolved).toEqual([
      expect.objectContaining({ passed: false }),
    ]);
    expect(eventTypes(events)).toContain(GameEventType.MovementDeclared);
    expect(next.units['player-1'].position).toEqual({ q: 2, r: 0 });
    expect(next.units['player-1'].isStuck).toBe(false);
    expect(next.units['player-1']).not.toHaveProperty('canUnstickByJumping');
  });

  it('T-S5: a stuck unit without jump eligibility cannot jump', () => {
    const { next, events } = runMovement({
      state: gameState(stuckUnit()),
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_ONE),
      target: { q: 2, r: 0 },
      movementType: MovementType.Jump,
    });

    expect(eventTypes(events)).toContain(GameEventType.MovementInvalid);
    expect(eventTypes(events)).not.toContain(GameEventType.MovementDeclared);
    expect(next.units['player-1']).toMatchObject({
      isStuck: true,
      position: ORIGIN,
    });
  });

  it('T-S6: jump-in and displacement bog-down never grant jump eligibility', () => {
    const jumpIn = runMovement({
      state: gameState({
        ...createMinimalUnitState('player-1', GameSide.Player, ORIGIN),
        isStuck: false,
      }),
      grid: setTerrain(createMinimalGrid(5), { q: 1, r: 0 }, TerrainType.Swamp),
      random: fixedRandom(ALWAYS_SIX),
      target: { q: 1, r: 0 },
      movementType: MovementType.Jump,
    });
    expect(jumpIn.next.units['player-1'].isStuck).toBe(true);
    expect(jumpIn.next.units['player-1']).not.toHaveProperty(
      'canUnstickByJumping',
    );
    expect(
      jumpIn.events.find((event) => event.type === GameEventType.UnitStuck)
        ?.payload,
    ).not.toHaveProperty('canUnstickByJumping');

    const displaced = gameState(
      stuckUnit({
        isStuck: false,
        pendingPSRs: [createSwampBogDownPSR('player-1')],
      }),
      GamePhase.PhysicalAttack,
    );
    const events: IGameEvent[] = [];
    const next = runPSRPhase({
      state: displaced,
      events,
      gameId: displaced.gameId,
      random: fixedRandom(ALWAYS_ONE),
    });
    expect(next.units['player-1'].isStuck).toBe(true);
    expect(next.units['player-1']).not.toHaveProperty('canUnstickByJumping');
    expect(
      events.find((event) => event.type === GameEventType.UnitStuck)?.payload,
    ).not.toHaveProperty('canUnstickByJumping');
  });

  it('T-S7: replaying the runner events through the reducer reaches the same stuck state', () => {
    const bogged = gameState(
      stuckUnit({
        isStuck: false,
        pendingPSRs: [createSwampBogDownPSR('player-1', 0)],
      }),
      GamePhase.PhysicalAttack,
    );
    const events: IGameEvent[] = [];
    const afterBogDown = runPSRPhase({
      state: bogged,
      events,
      gameId: bogged.gameId,
      random: fixedRandom(ALWAYS_ONE),
    });
    const failedRecovery = runMovement({
      state: { ...afterBogDown, phase: GamePhase.Movement },
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_ONE),
      target: { q: 1, r: 0 },
      movementType: MovementType.Walk,
    });
    const jumpedFree = runMovement({
      state: failedRecovery.next,
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_ONE),
      target: { q: 2, r: 0 },
      movementType: MovementType.Jump,
    });

    const runnerStages = [
      afterBogDown,
      failedRecovery.next,
      jumpedFree.next,
    ].map((stage) => stage.units['player-1']);
    const replayedStages = [
      events,
      [...events, ...failedRecovery.events],
      [...events, ...failedRecovery.events, ...jumpedFree.events],
    ].map((prefix) => replay(bogged, prefix).units['player-1']);

    for (const [index, runnerUnit] of runnerStages.entries()) {
      const replayed = replayedStages[index];
      expect(replayed.isStuck).toBe(runnerUnit.isStuck);
      expect(Object.hasOwn(replayed, 'canUnstickByJumping')).toBe(
        Object.hasOwn(runnerUnit, 'canUnstickByJumping'),
      );
      expect(replayed.canUnstickByJumping).toBe(runnerUnit.canUnstickByJumping);
    }
    expect(runnerStages.map((unit) => unit.isStuck)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('T-S7: a passing recovery replays to the same freed state', () => {
    const initial = gameState(stuckUnit({ canUnstickByJumping: true }));
    const { next, events } = runMovement({
      state: initial,
      grid: swampGrid(),
      random: fixedRandom(ALWAYS_SIX),
      target: ORIGIN,
      movementType: MovementType.Stationary,
    });
    const replayed = replay(initial, events).units['player-1'];

    expect(next.units['player-1'].isStuck).toBe(false);
    expect(replayed.isStuck).toBe(false);
    expect(replayed).not.toHaveProperty('canUnstickByJumping');
    expect(replayed.pendingPSRs ?? []).toEqual([]);
  });
});
