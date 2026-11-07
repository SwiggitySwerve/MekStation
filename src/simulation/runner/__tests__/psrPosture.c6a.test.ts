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
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import { applyUnitFell } from '@/utils/gameplay/gameState/pilotingState';
import { resetPerTurnMovementState } from '@/utils/gameplay/movement/perTurnMovementState';
import {
  createDamagePSR,
  createLegDamagePSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { SeededRandom } from '../../core/SeededRandom';
import { markUnitFallenAfterDfaMiss } from '../phases/physicalAttackState';
import { runPSRPhase } from '../phases/postCombatPsr';
import { applyDamageThresholdPSR } from '../phases/weaponAttackHitResolution.helpers';
import { resetTurnState } from '../SimulationRunnerState';

function unit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'target',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { center_torso: 100 },
    structure: { center_torso: 30 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    piloting: 13,
    prone: false,
    pendingPSRs: [],
    ...overrides,
  };
}

function state(target: IUnitGameState): IGameState {
  return {
    gameId: 'c6a',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: { target, control: unit({ id: 'control' }) },
    turnEvents: [],
  };
}

describe('C6a runner PSRs and fall posture', () => {
  it('keeps the existing runner threshold dedupe and unrelated PSRs', () => {
    const original = state(
      unit({
        damageThisPhase: 19,
        pendingPSRs: [createLegDamagePSR('target')],
      }),
    );
    expect(applyDamageThresholdPSR(original, 'target')).toBe(original);
    const qualified = {
      ...original,
      units: {
        ...original.units,
        target: { ...original.units.target, damageThisPhase: 20 },
      },
    };
    const once = applyDamageThresholdPSR(qualified, 'target');
    const twice = applyDamageThresholdPSR(once, 'target');
    expect(twice).toBe(once);
    expect(
      twice.units.target.pendingPSRs?.map((psr) => psr.reasonCode),
    ).toEqual([PSRTrigger.LegDamage, PSRTrigger.PhaseDamage20Plus]);
    expect(twice.units.control.pendingPSRs).toEqual([]);
    expect(
      applyDamageThresholdPSR(
        state(unit({ destroyed: true, damageThisPhase: 20 })),
        'target',
      ).units.target.pendingPSRs,
    ).toEqual([]);
  });

  it('clears hull-down on an event-sourced fall, preserving facing and queue handling', () => {
    const original = state(
      unit({ hullDown: true, pendingPSRs: [createDamagePSR('target')] }),
    );
    const next = applyUnitFell(original, {
      unitId: 'target',
      newFacing: Facing.South,
      fallDamage: 5,
      pilotDamage: 1,
    });
    expect(next.units.target).toMatchObject({
      prone: true,
      hullDown: false,
      facing: Facing.South,
      pendingPSRs: [],
    });
    expect(next.units.control).toBe(original.units.control);
    expect(original.units.target.hullDown).toBe(true);
  });

  it('clears hull-down when a runner PSR causes a fall', () => {
    const original = state(
      unit({ hullDown: true, pendingPSRs: [createDamagePSR('target')] }),
    );
    const events: IGameEvent[] = [];
    const next = runPSRPhase({
      state: original,
      events,
      gameId: original.gameId,
      random: new SeededRandom(1),
    });
    expect(
      events.filter((event) => event.type === GameEventType.UnitFell),
    ).toHaveLength(1);
    expect(next.units.target).toMatchObject({
      prone: true,
      hullDown: false,
      pendingPSRs: [],
    });
  });

  it('clears hull-down on a runner DFA miss', () => {
    const original = state(
      unit({ hullDown: true, pendingPSRs: [createDamagePSR('target')] }),
    );
    const next = markUnitFallenAfterDfaMiss(original, 'target', Facing.South);
    expect(next.units.target).toMatchObject({
      prone: true,
      hullDown: false,
      facing: Facing.South,
      pendingPSRs: [],
    });
    expect(next.units.control).toBe(original.units.control);
  });

  it('preserves hull-down when the runner PSR passes', () => {
    const original = state(
      unit({
        hullDown: true,
        piloting: 2,
        pendingPSRs: [createDamagePSR('target')],
      }),
    );
    const events: IGameEvent[] = [];
    const next = runPSRPhase({
      state: original,
      events,
      gameId: original.gameId,
      random: new SeededRandom(1),
    });
    expect(events.some((event) => event.type === GameEventType.UnitFell)).toBe(
      false,
    );
    expect(next.units.target).toMatchObject({
      prone: false,
      hullDown: true,
      pendingPSRs: [],
    });
  });

  it('preserves C8 movement resets and persistent posture at the turn boundary', () => {
    const original = unit({
      hullDown: true,
      isStuck: true,
      movementThisTurn: MovementType.Sprint,
      hexesMovedThisTurn: 6,
      sprintedThisTurn: true,
      heat: 4,
    });
    for (const reset of [
      resetPerTurnMovementState(original),
      resetTurnState(state(original)).units.target,
    ]) {
      expect(reset).toMatchObject({
        prone: false,
        hullDown: true,
        isStuck: true,
        heat: 4,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        sprintedThisTurn: false,
      });
    }
  });
});
