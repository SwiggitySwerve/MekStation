import { GameSide, type IUnitGameState, MovementType } from '@/types/gameplay';

import {
  EVADE_HEAT_BONUS,
  JUMP_HEAT,
  RUN_HEAT,
  SPRINT_HEAT,
  WALK_HEAT,
} from '../../SimulationRunnerConstants';
import { createMinimalUnitState } from '../../SimulationRunnerSupport';
import { computeMovementHeat } from '../heatPhaseCalculations';

function createUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    ...createMinimalUnitState('unit-1', GameSide.Player, { q: 0, r: 0 }),
    ...overrides,
  };
}

describe('computeMovementHeat', () => {
  it('keeps core movement heat for stationary, walk, run, and jump states', () => {
    expect(
      computeMovementHeat(
        createUnit({ movementThisTurn: MovementType.Stationary }),
      ),
    ).toBe(0);
    expect(
      computeMovementHeat(createUnit({ movementThisTurn: MovementType.Walk })),
    ).toBe(WALK_HEAT);
    expect(
      computeMovementHeat(createUnit({ movementThisTurn: MovementType.Run })),
    ).toBe(RUN_HEAT);
    expect(
      computeMovementHeat(
        createUnit({
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: JUMP_HEAT + 2,
        }),
      ),
    ).toBe(JUMP_HEAT + 2);
  });

  it('uses explicit sprint state for source-backed normal-engine sprint heat', () => {
    expect(
      computeMovementHeat(
        createUnit({
          movementThisTurn: MovementType.Run,
          sprintedThisTurn: true,
        }),
      ),
    ).toBe(SPRINT_HEAT);
  });

  it('maps explicit evade state to running heat plus the evasion surcharge', () => {
    expect(
      computeMovementHeat(
        createUnit({
          movementThisTurn: MovementType.Run,
          isEvading: true,
        }),
      ),
    ).toBe(RUN_HEAT + EVADE_HEAT_BONUS);
  });
});
