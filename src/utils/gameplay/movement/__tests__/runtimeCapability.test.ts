import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  resolveRuntimeMovementCapability,
  runtimeUnitHeightForMovement,
} from '@/utils/gameplay/movement/runtimeCapability';

function unitState(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'unit',
    side: GameSide.Player,
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
    ...overrides,
  };
}

describe('runtime movement capability', () => {
  it('projects LAM conversion mode height from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    expect(
      runtimeUnitHeightForMovement(
        unitState({ conversionMode: 'airmek' }),
        capability,
      ),
    ).toBe(0);
    expect(
      runtimeUnitHeightForMovement(
        unitState({ conversionMode: 'mek' }),
        capability,
      ),
    ).toBe(1);
  });

  it('projects QuadVee vehicle mode as height zero from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      unitHeight: 1,
      unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'tracked' }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 0 }),
        capability,
      ),
    ).toBe(capability);
  });

  it('lets runtime infantry mount and dismount state override imported height', () => {
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 3,
      jumpMP: 0,
      unitHeight: 1,
      unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: false }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: true, infantryMountHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
  });

  it('uses explicit runtime unit height before conversion or mount profiles', () => {
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      unitHeight: 0,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'fighter', unitHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
  });
});
