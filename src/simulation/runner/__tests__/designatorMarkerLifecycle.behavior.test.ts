import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';

import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { markTargetINarcPod } from '../phases/weaponAttackDesignatorMarkers';
import { resetTurnState } from '../SimulationRunnerState';

function createUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'opponent-1',
    side: GameSide.Opponent,
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
    lockState: LockState.Pending,
    damageThisPhase: 7,
    weaponsFiredThisTurn: ['tag-0'],
    pendingPSRs: [],
    ...overrides,
  };
}

function createState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'designator-marker-lifecycle',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.End,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

describe('runner designator marker lifecycle', () => {
  it('clears transient turn state while preserving persistent NARC and iNARC carrier markers', () => {
    const state = createState(
      createUnit({
        tagDesignated: true,
        sprintedThisTurn: true,
        externalHeatThisTurn: 15,
        narcedBy: [GameSide.Player],
        iNarcPods: [
          {
            teamId: GameSide.Player,
            podType: 'homing',
            location: 'Center Torso',
          },
        ],
      }),
    );

    const result = resetTurnState(state);

    expect(result.units['opponent-1'].tagDesignated).toBe(false);
    expect(result.units['opponent-1'].sprintedThisTurn).toBe(false);
    expect(result.units['opponent-1'].externalHeatThisTurn).toBe(0);
    expect(result.units['opponent-1'].narcedBy).toEqual([GameSide.Player]);
    expect(result.units['opponent-1'].iNarcPods).toEqual([
      {
        teamId: GameSide.Player,
        podType: 'homing',
        location: 'Center Torso',
      },
    ]);
    expect(result.units['opponent-1'].damageThisPhase).toBe(0);
    expect(result.units['opponent-1'].weaponsFiredThisTurn).toEqual([]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-turn-reset-lifecycle'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('turn-boundary cleanup'),
    });
  });

  it('deduplicates same-team same-type iNARC pods while preserving original hit location', () => {
    const state = createState(
      createUnit({
        iNarcPods: [
          {
            teamId: GameSide.Player,
            podType: 'homing',
            location: 'Center Torso',
          },
        ],
      }),
    );

    const result = markTargetINarcPod({
      currentState: state,
      targetId: 'opponent-1',
      attackerTeamId: GameSide.Player,
      podType: 'homing',
      location: 'Left Torso',
    });

    expect(result.units['opponent-1'].iNarcPods).toEqual([
      {
        teamId: GameSide.Player,
        podType: 'homing',
        location: 'Center Torso',
      },
    ]);
  });
});
