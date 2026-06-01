/**
 * Lifecycle/removal coverage for turn rotation predicates.
 *
 * Destroyed, shutdown, unconscious, retreated, and ejected units must not owe
 * normal combat actions. Retreated/ejected units also leave interactive
 * targetability.
 */

import type { IWeapon } from '@/simulation/ai/types';

import { getAvailableActionsForState } from '@/engine/InteractiveSession.queries';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';

import {
  allUnitsLocked,
  applyEvent,
  checkVictoryConditions,
  getActiveUnits,
  getUnitsAwaitingAction,
} from '../gameStateReducer';

function makeUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
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
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    ...overrides,
  };
}

function makeState(units: Record<string, IUnitGameState>): IGameState {
  return {
    gameId: 'turn-rotation-removal-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units,
    turnEvents: [],
  };
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: id,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

describe('turn rotation lifecycle removal predicates', () => {
  it('excludes destroyed, shutdown, unconscious, retreated, and ejected units from normal action queues', () => {
    const state = makeState({
      active: makeUnit('active', GameSide.Player),
      destroyed: makeUnit('destroyed', GameSide.Player, { destroyed: true }),
      shutdown: makeUnit('shutdown', GameSide.Player, { shutdown: true }),
      unconscious: makeUnit('unconscious', GameSide.Player, {
        pilotConscious: false,
      }),
      retreated: makeUnit('retreated', GameSide.Player, {
        hasRetreated: true,
      }),
      ejected: makeUnit('ejected', GameSide.Player, {
        hasEjected: true,
      }),
    });

    expect(
      getActiveUnits(state, GameSide.Player).map((unit) => unit.id),
    ).toEqual(['active']);
    expect(getUnitsAwaitingAction(state).map((unit) => unit.id)).toEqual([
      'active',
    ]);
  });

  it('treats shutdown, retreated, and ejected units as no longer blocking all-units-locked checks', () => {
    const state = makeState({
      locked: makeUnit('locked', GameSide.Player, {
        lockState: LockState.Locked,
      }),
      shutdownPending: makeUnit('shutdownPending', GameSide.Player, {
        shutdown: true,
        lockState: LockState.Pending,
      }),
      retreatedPending: makeUnit('retreatedPending', GameSide.Player, {
        hasRetreated: true,
        lockState: LockState.Pending,
      }),
      ejectedPending: makeUnit('ejectedPending', GameSide.Player, {
        hasEjected: true,
        lockState: LockState.Pending,
      }),
    });

    expect(allUnitsLocked(state)).toBe(true);
  });

  it('removes shutdown, retreated, and ejected units from interactive actions while leaving shutdown targets legal', () => {
    const state = makeState({
      actor: makeUnit('actor', GameSide.Player),
      retreatedActor: makeUnit('retreatedActor', GameSide.Player, {
        hasRetreated: true,
      }),
      ejectedActor: makeUnit('ejectedActor', GameSide.Player, {
        hasEjected: true,
      }),
      shutdownActor: makeUnit('shutdownActor', GameSide.Player, {
        shutdown: true,
      }),
      target: makeUnit('target', GameSide.Opponent),
      shutdownTarget: makeUnit('shutdownTarget', GameSide.Opponent, {
        shutdown: true,
      }),
      retreatedTarget: makeUnit('retreatedTarget', GameSide.Opponent, {
        hasRetreated: true,
      }),
      ejectedTarget: makeUnit('ejectedTarget', GameSide.Opponent, {
        hasEjected: true,
      }),
    });
    const weaponsByUnit = new Map<string, readonly IWeapon[]>([
      ['actor', [makeWeapon('medium-laser')]],
      ['retreatedActor', [makeWeapon('medium-laser')]],
      ['ejectedActor', [makeWeapon('medium-laser')]],
      ['shutdownActor', [makeWeapon('medium-laser')]],
    ]);

    expect(
      getAvailableActionsForState(state, 'actor', weaponsByUnit).validTargets,
    ).toEqual([
      { unitId: 'target', weapons: ['medium-laser'] },
      { unitId: 'shutdownTarget', weapons: ['medium-laser'] },
    ]);
    expect(
      getAvailableActionsForState(state, 'retreatedActor', weaponsByUnit),
    ).toEqual({ validMoves: [], validTargets: [] });
    expect(
      getAvailableActionsForState(state, 'ejectedActor', weaponsByUnit),
    ).toEqual({ validMoves: [], validTargets: [] });
    expect(
      getAvailableActionsForState(state, 'shutdownActor', weaponsByUnit),
    ).toEqual({ validMoves: [], validTargets: [] });
  });

  it('applies ejection as lifecycle removal without mutating mech damage state', () => {
    const state = makeState({
      ejected: makeUnit('ejected', GameSide.Player, {
        armor: { center_torso: 20 },
        structure: { center_torso: 11 },
        lockState: LockState.Pending,
      }),
      opponent: makeUnit('opponent', GameSide.Opponent),
    });
    const event = createUnitEjectedEvent(
      state.gameId,
      1,
      state.turn,
      state.phase,
      'ejected',
      'player_declared',
    );

    const next = applyEvent(state, event);
    const unit = next.units.ejected;

    expect(event.type).toBe(GameEventType.UnitEjected);
    expect(unit.hasEjected).toBe(true);
    expect(unit.destroyed).toBe(false);
    expect(unit.pilotConscious).toBe(true);
    expect(unit.armor).toEqual({ center_torso: 20 });
    expect(unit.structure).toEqual({ center_torso: 11 });
    expect(unit.lockState).toBe(LockState.Resolved);
    expect(getActiveUnits(next, GameSide.Player)).toEqual([]);
    expect(getUnitsAwaitingAction(next)).toEqual([next.units.opponent]);
  });

  it('treats ejected units as non-survivors for terminal force checks', () => {
    const state = makeState({
      ejectedPlayer: makeUnit('ejectedPlayer', GameSide.Player, {
        hasEjected: true,
      }),
      activeOpponent: makeUnit('activeOpponent', GameSide.Opponent),
    });

    expect(
      checkVictoryConditions(state, {
        mapRadius: 8,
        turnLimit: 0,
        victoryConditions: [],
        optionalRules: [],
      }),
    ).toBe(GameSide.Opponent);
  });
});
