import { describe, expect, it } from '@jest/globals';

import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON,
  GroundMotionType,
  MovementType,
  ProtoChassis,
  createAerospaceCombatState,
  createProtoMechCombatState,
  createVehicleCombatState,
  resolveRuntimeMovementCapability,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
  runtimeUnitHeightForMovement,
  type IMovementCapability,
  unitState,
} from './runtimeCapability.test-helpers';

describe('runtime movement capability', () => {
  it('projects QuadVee vehicle mode as tracked motive, height zero, and no jumping from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'tracked' }),
        capability,
      ),
    ).toMatchObject({ jumpMP: 0, movementMode: 'tracked', unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'wheeled' }),
        capability,
      ),
    ).toMatchObject({ jumpMP: 0, movementMode: 'wheeled', unitHeight: 0 });
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
        unitState({ infantryMounted: false, unitHeight: 1 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: true, infantryMountHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: true, unitHeight: 2 }),
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
