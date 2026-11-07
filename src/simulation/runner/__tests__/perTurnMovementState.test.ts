import { GamePhase, MovementType, RangeBracket } from '@/types/gameplay';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from '@/utils/gameplay/gameState/__tests__/runtimeMovementState.helpers';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
} from '@/utils/gameplay/toHit';

import { runHeatPhase } from '../phases/postCombatHeat';
import { resetTurnState } from '../SimulationRunnerState';

describe('runner per-turn movement reset', () => {
  it.each([
    MovementType.Run,
    MovementType.Jump,
    MovementType.Sprint,
    MovementType.Evade,
  ])(
    '%s generates heat only in turn one and no movement modifiers in turn two',
    (mode) => {
      const unit = runtimeMovementUnit({
        id: 'player-1',
        movementThisTurn: mode,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
        usedMechanicalJumpBoosterThisTurn: true,
        sprintedThisTurn: mode === MovementType.Sprint,
        isEvading: mode === MovementType.Evade,
        evasionBonus: 2,
        pendingConversionStepCount: 2,
        pendingConversionMpCost: 3,
        pendingAltitudeControlStepCount: 1,
        pendingAltitudeControlMpCost: 2,
        heatSinks: 0,
        hasMASC: true,
        activeMASC: true,
        mascTurnsUsed: 1,
        hasSupercharger: true,
        activeSupercharger: true,
        superchargerTurnsUsed: 2,
      });
      const first = runHeatPhase({
        state: { ...stateWithUnit(unit), turn: 1, phase: GamePhase.Heat },
      });
      const firstHeat = first.units[unit.id].heat;
      expect(firstHeat).toBeGreaterThan(0);
      const second = resetTurnState({ ...first, turn: 2 });
      const reset = second.units[unit.id];
      expect(reset).toMatchObject({
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        movedBackwardThisTurn: false,
        usedMechanicalJumpBoosterThisTurn: false,
        sprintedThisTurn: false,
        isEvading: false,
        activeMASC: false,
        activeSupercharger: false,
        mascTurnsUsed: 2,
        superchargerTurnsUsed: 3,
        heat: firstHeat,
      });
      expect(reset.evasionBonus).toBeUndefined();
      expect(reset).not.toHaveProperty('pendingConversionStepCount');
      expect(reset).not.toHaveProperty('pendingConversionMpCost');
      expect(reset).not.toHaveProperty('pendingAltitudeControlStepCount');
      expect(reset).not.toHaveProperty('pendingAltitudeControlMpCost');
      expect(runHeatPhase({ state: second }).units[unit.id].heat).toBe(
        firstHeat,
      );
      expect(
        calculateToHit(
          buildWeaponAttackAttackerToHitState(reset, 4),
          buildWeaponAttackTargetToHitState(reset, false),
          RangeBracket.Short,
          3,
        ).finalToHit,
      ).toBe(4);
    },
  );

  it('preserves independent escalation and the first-idle-turn extra decay', () => {
    const unit = runtimeMovementUnit({
      id: 'player-1',
      activeMASC: true,
      mascTurnsUsed: 2,
      activeSupercharger: false,
      superchargerTurnsUsed: 3,
    });
    const second = resetTurnState({ ...stateWithUnit(unit), turn: 2 });
    expect(second.units[unit.id]).toMatchObject({
      mascTurnsUsed: 3,
      superchargerTurnsUsed: 2,
      activeMASC: false,
      activeSupercharger: false,
      mascFailureLevelIncreasedLastTurn: true,
      superchargerFailureLevelIncreasedLastTurn: false,
    });
    const third = resetTurnState({ ...second, turn: 3 });
    expect(third.units[unit.id]).toMatchObject({
      mascTurnsUsed: 1,
      superchargerTurnsUsed: 1,
      mascFailureLevelIncreasedLastTurn: false,
      superchargerFailureLevelIncreasedLastTurn: false,
    });
  });
});
