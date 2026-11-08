import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IHexCoordinate,
  type IUnitGameState,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import { validateCommitReadiness } from '@/utils/gameplay/movement/commitValidationContext';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';

const CAPABILITY = { walkMP: 4, runMP: 6, jumpMP: 4 };
const ORIGIN = { q: 0, r: 0 };
const WALK_TARGET = { q: 1, r: 0 };
const JUMP_TARGET = { q: 2, r: 0 };

function unit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'mech-1',
    side: GameSide.Player,
    position: ORIGIN,
    facing: Facing.Southeast,
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
    ...overrides,
  };
}

function commit(
  mover: IUnitGameState,
  movementType: MovementType,
  to: IHexCoordinate,
) {
  return validateCommittedMovement({
    grid: createHexGrid({ radius: 3 }),
    unit: mover,
    to,
    facing: Facing.Southeast,
    movementType,
    capability: CAPABILITY,
  });
}

function project(
  mover: IUnitGameState,
  movementType: MovementType,
  to: IHexCoordinate,
) {
  return deriveMovementRangeHexForDestination(
    mover,
    movementType,
    createHexGrid({ radius: 3 }),
    CAPABILITY,
    to,
  );
}

const STUCK_REFUSAL = {
  valid: false,
  reason: 'UnitImmobile',
  details: 'Unit is stuck',
  mpCost: 0,
  heatGenerated: 0,
};

describe('C6b interactive stuck commit and projection', () => {
  it('T-C1: commit refuses every stuck move except an eligible jump', () => {
    const stuck = unit({ isStuck: true });
    const eligible = unit({ isStuck: true, canUnstickByJumping: true });

    expect(commit(stuck, MovementType.Walk, WALK_TARGET)).toEqual(
      STUCK_REFUSAL,
    );
    expect(commit(stuck, MovementType.Stationary, ORIGIN)).toEqual(
      STUCK_REFUSAL,
    );
    expect(commit(stuck, MovementType.Jump, JUMP_TARGET)).toEqual(
      STUCK_REFUSAL,
    );
    expect(commit(eligible, MovementType.Walk, WALK_TARGET)).toEqual(
      STUCK_REFUSAL,
    );
    expect(commit(eligible, MovementType.Jump, JUMP_TARGET)).toMatchObject({
      valid: true,
    });
    expect(commit(unit(), MovementType.Walk, WALK_TARGET)).toMatchObject({
      valid: true,
    });
  });

  it('T-C1: commit readiness gates stuck units before the projection runs', () => {
    const stuck = unit({ isStuck: true });
    const eligible = unit({ isStuck: true, canUnstickByJumping: true });

    expect(
      validateCommitReadiness({ unit: stuck, movementType: MovementType.Walk }),
    ).toEqual(STUCK_REFUSAL);
    expect(
      validateCommitReadiness({
        unit: eligible,
        movementType: MovementType.Jump,
      }),
    ).toBeNull();
    expect(
      validateCommitReadiness({
        unit: unit(),
        movementType: MovementType.Walk,
      }),
    ).toBeNull();
  });

  it('T-C2: the projection shows a stuck unit nothing reachable except eligible jumps', () => {
    const stuck = unit({ isStuck: true });
    const eligible = unit({ isStuck: true, canUnstickByJumping: true });

    for (const [mover, movementType, to] of [
      [stuck, MovementType.Walk, WALK_TARGET],
      [stuck, MovementType.Run, WALK_TARGET],
      [stuck, MovementType.Jump, JUMP_TARGET],
      [eligible, MovementType.Walk, WALK_TARGET],
    ] as const) {
      expect(project(mover, movementType, to)).toMatchObject({
        reachable: false,
        blockedReason: 'Unit is stuck',
        movementInvalidReason: 'UnitImmobile',
      });
    }
    expect(project(eligible, MovementType.Jump, JUMP_TARGET)).toMatchObject({
      reachable: true,
    });
    expect(project(unit(), MovementType.Walk, WALK_TARGET)).toMatchObject({
      reachable: true,
    });
  });
});
