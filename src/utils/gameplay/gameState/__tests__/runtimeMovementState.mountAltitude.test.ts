import {
  tacticalMapInfantryMountStateCapability,
  tacticalMapInfantryMountStateDestination,
  tacticalMapInfantryMountStateGrid,
  tacticalMapInfantryMountStateUnit,
} from '@/testing/tactical-map.infantry-mount-state-scenario';
import {
  Facing,
  GameEventType,
  MovementType,
  type IMovementCapability,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { createRuntimeMovementStateChangedEvent } from '@/utils/gameplay/gameEvents';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import {
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
} from '@/utils/gameplay/movement/runtimeCapability';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

import { applyEvent } from '..';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from './runtimeMovementState.helpers';

describe('runtime movement mount and altitude replay', () => {
  it('replays infantry dismount state into projection and commit validation', () => {
    const mountedUnit = {
      ...tacticalMapInfantryMountStateUnit(true),
      unitHeight: 1,
    };
    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      mountedUnit.id,
      { source: 'infantry_mount_action', infantryMounted: false },
    );

    const nextState = applyEvent(stateWithUnit(mountedUnit), event);
    const dismounted = nextState.units[mountedUnit.id];
    const capability = tacticalMapInfantryMountStateCapability();
    const grid = tacticalMapInfantryMountStateGrid();
    const destination = tacticalMapInfantryMountStateDestination;
    const projection = deriveMovementRangeHexForDestination(
      dismounted,
      MovementType.Walk,
      grid,
      capability,
      destination,
    );

    expect(event.type).toBe(GameEventType.RuntimeMovementStateChanged);
    expect(dismounted).toMatchObject({ infantryMounted: false, unitHeight: 1 });
    expect(projection).toMatchObject({
      reachable: true,
      movementType: 'walk',
      movementMode: 'naval',
      mpCost: 1,
    });

    const committed = validateCommittedMovement({
      grid,
      unit: dismounted,
      to: destination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: projection?.path,
    });

    expect(committed.valid).toBe(true);
    if (!committed.valid) {
      throw new Error(committed.details);
    }
    expect(committed.mpCost).toBe(projection?.mpCost);
    expect(committed.path).toEqual(projection?.path);
  });

  it('can clear stale runtime height when replaying conversion state', () => {
    const unit = runtimeMovementUnit({
      id: 'lam-1',
      conversionMode: 'mek',
      unitHeight: 1,
    });
    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'conversion_action',
        conversionMode: 'fighter',
        unitHeight: null,
      },
    );

    const nextState = applyEvent(stateWithUnit(unit), event);
    const converted = nextState.units[unit.id];

    expect(converted.conversionMode).toBe('fighter');
    expect(converted).not.toHaveProperty('unitHeight');
  });

  it('replays represented vehicle altitude controls into movement projection state', () => {
    const unit = runtimeMovementUnit({
      id: 'wige-1',
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'wige-1',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 4,
          armor: {},
          structure: {},
          altitude: 1,
        }),
      },
    });
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'wige',
    };

    expect(
      runtimeMovementProjectionBlockedReason(unit, capability, 'wige'),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(unit)).toMatchObject({
      altitudeControlMode: 'wige',
      altitudeControlAltitude: 1,
    });

    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'altitude_control_action',
        vehicleAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    );
    const nextState = applyEvent(stateWithUnit(unit), event);
    const landed = nextState.units[unit.id];

    expect(landed.combatState).toMatchObject({
      kind: 'vehicle',
      state: { altitude: 0, motionType: GroundMotionType.WIGE },
    });
    expect(landed).toMatchObject({
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
    });
    expect(
      runtimeMovementProjectionBlockedReason(landed, capability, 'wige'),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(landed)).toBeUndefined();

    const grid = createHexGrid({ radius: 2 });
    const destination = { q: 1, r: 0 };
    const projection = deriveMovementRangeHexForDestination(
      landed,
      MovementType.Walk,
      grid,
      capability,
      destination,
    );
    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 2,
      altitudeControlStepCount: 1,
      altitudeControlMpCost: 1,
    });

    const committed = validateCommittedMovement({
      grid,
      unit: landed,
      to: destination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: projection?.path,
    });
    expect(committed).toMatchObject({ valid: true, mpCost: 2 });
  });

  it('replays ProtoMek Glider altitude controls into movement projection state', () => {
    const unit = runtimeMovementUnit({
      id: 'proto-glider-1',
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'proto-glider-1',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 1,
        }),
      },
    });
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'wige',
    };

    expect(
      runtimeMovementProjectionBlockedReason(unit, capability, 'wige'),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(unit)).toMatchObject({
      altitudeControlMode: 'wige',
      altitudeControlAltitude: 1,
    });

    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'altitude_control_action',
        protoAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    );
    const nextState = applyEvent(stateWithUnit(unit), event);
    const landed = nextState.units[unit.id];

    expect(landed.combatState).toMatchObject({
      kind: 'proto',
      state: { altitude: 0, chassisType: ProtoChassis.GLIDER },
    });
    expect(landed).toMatchObject({
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
    });
    expect(
      runtimeMovementProjectionBlockedReason(landed, capability, 'wige'),
    ).toBeUndefined();

    const grid = createHexGrid({ radius: 2 });
    const destination = { q: 1, r: 0 };
    const projection = deriveMovementRangeHexForDestination(
      landed,
      MovementType.Walk,
      grid,
      capability,
      destination,
    );
    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 2,
      altitudeControlStepCount: 1,
      altitudeControlMpCost: 1,
    });
  });
});
