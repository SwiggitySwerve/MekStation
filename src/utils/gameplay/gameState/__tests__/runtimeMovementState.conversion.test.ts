import { tacticalMapLamAirMekCommitInput } from '@/testing/tactical-map.lam-conversion-scenario';
import { Facing, MovementType } from '@/types/gameplay';
import {
  createMovementDeclaredEvent,
  createRuntimeMovementStateChangedEvent,
} from '@/utils/gameplay/gameEvents';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
} from '@/utils/gameplay/movement/runtimeCapability';

import { applyEvent } from '..';
import {
  BASIC_CAPABILITY,
  runtimeMovementUnit,
  stateWithUnit,
} from './runtimeMovementState.helpers';

describe('runtime movement conversion replay', () => {
  it('replays LAM AirMek WiGE altitude controls into movement projection state', () => {
    const lamInput = tacticalMapLamAirMekCommitInput();
    const capability = lamInput.capability;
    if (!capability) {
      throw new Error('LAM AirMek fixture must provide movement capability');
    }
    const unit = {
      ...lamInput.unit,
      lamAirMekAltitude: 1,
    };

    expect(
      runtimeMovementProjectionBlockedReason(unit, capability, 'wige'),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(unit)).toMatchObject({
      altitudeControlMode: 'wige',
      altitudeControlAltitude: 1,
      blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });

    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 1,
        lamAirMekLandingControlModifierDetails: [
          'Left Leg Foot Actuator destroyed +1',
        ],
      },
    );
    const nextState = applyEvent(stateWithUnit(unit), event);
    const landed = nextState.units[unit.id];

    expect(event.payload).toMatchObject({
      lamAirMekLandingControlRequired: true,
      lamAirMekLandingControlReason: 'landing with gyro or leg damage',
      lamAirMekLandingControlModifier: 1,
      lamAirMekLandingControlModifierDetails: [
        'Left Leg Foot Actuator destroyed +1',
      ],
    });

    expect(landed).toMatchObject({
      conversionMode: 'airmek',
      lamAirMekAltitude: 0,
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
    });
    expect(
      runtimeMovementProjectionBlockedReason(landed, capability, 'wige'),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(landed)).toBeUndefined();

    const projection = deriveMovementRangeHexForDestination(
      landed,
      lamInput.movementType,
      lamInput.grid,
      capability,
      lamInput.to,
    );

    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 4,
      altitudeControlStepCount: 1,
      altitudeControlMpCost: 1,
    });
  });

  it('replays conversion MP as pending movement cost consumed by projection and commit validation', () => {
    const unit = runtimeMovementUnit({
      id: 'quadvee-1',
      conversionMode: 'mek',
    });
    const conversion = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'conversion_action',
        conversionMode: 'vehicle',
        conversionStepCount: 1,
        conversionMpCost: 3,
      },
    );

    const converted = applyEvent(stateWithUnit(unit), conversion).units[
      unit.id
    ];
    expect(converted).toMatchObject({
      conversionMode: 'vehicle',
      pendingConversionStepCount: 1,
      pendingConversionMpCost: 3,
    });

    const grid = createHexGrid({ radius: 2 });
    const destination = { q: 1, r: 0 };
    const projection = deriveMovementRangeHexForDestination(
      converted,
      MovementType.Walk,
      grid,
      BASIC_CAPABILITY,
      destination,
    );

    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 4,
      conversionStepCount: 1,
      conversionMpCost: 3,
    });

    const committed = validateCommittedMovement({
      grid,
      unit: converted,
      to: destination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability: BASIC_CAPABILITY,
      path: projection?.path,
    });

    expect(committed).toMatchObject({ valid: true, mpCost: 4 });
  });

  it('replays LAM AirMek-to-Mek conversion as two pending zero-MP steps', () => {
    const unit = runtimeMovementUnit({
      id: 'lam-1',
      conversionMode: 'airmek',
      lamAirMekAltitude: 2,
    });
    const conversion = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'conversion_action',
        conversionMode: 'mek',
        lamAirMekAltitude: 0,
        conversionStepCount: 2,
        conversionMpCost: 0,
      },
    );

    const converted = applyEvent(stateWithUnit(unit), conversion).units[
      unit.id
    ];
    expect(converted).toMatchObject({
      conversionMode: 'mek',
      lamAirMekAltitude: 0,
      pendingConversionStepCount: 2,
      pendingConversionMpCost: 0,
    });

    const grid = createHexGrid({ radius: 2 });
    const destination = { q: 1, r: 0 };
    const projection = deriveMovementRangeHexForDestination(
      converted,
      MovementType.Walk,
      grid,
      BASIC_CAPABILITY,
      destination,
    );

    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 1,
      conversionStepCount: 2,
      conversionMpCost: 0,
    });
    expect(
      runtimeMovementProjectionBlockedReason(
        converted,
        {
          ...BASIC_CAPABILITY,
          movementMode: 'wige',
          unitHeightProfile: { kind: 'lam', standingHeight: 1 },
        },
        'wige',
      ),
    ).toBeUndefined();
  });

  it('clears pending conversion cost after committed movement replay', () => {
    const converted = runtimeMovementUnit({
      id: 'quadvee-1',
      conversionMode: 'vehicle',
      pendingConversionStepCount: 1,
      pendingConversionMpCost: 3,
    });
    const movement = createMovementDeclaredEvent(
      'game-1',
      2,
      1,
      converted.id,
      converted.position,
      { q: 1, r: 0 },
      Facing.Northeast,
      MovementType.Walk,
      4,
      0,
      [converted.position, { q: 1, r: 0 }],
      { conversionStepCount: 1, conversionMpCost: 3 },
    );

    const moved = applyEvent(stateWithUnit(converted), movement).units[
      converted.id
    ];

    expect(moved).toMatchObject({
      position: { q: 1, r: 0 },
      hexesMovedThisTurn: 4,
    });
    expect(moved).not.toHaveProperty('pendingConversionStepCount');
    expect(moved).not.toHaveProperty('pendingConversionMpCost');
  });

  it('clears pending altitude-control cost after committed movement replay', () => {
    const landed = runtimeMovementUnit({
      id: 'wige-1',
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
    });
    const movement = createMovementDeclaredEvent(
      'game-1',
      2,
      1,
      landed.id,
      landed.position,
      { q: 1, r: 0 },
      Facing.Northeast,
      MovementType.Walk,
      2,
      0,
      [landed.position, { q: 1, r: 0 }],
      { altitudeControlStepCount: 1, altitudeControlMpCost: 1 },
    );

    const moved = applyEvent(stateWithUnit(landed), movement).units[landed.id];

    expect(moved).toMatchObject({
      position: { q: 1, r: 0 },
      hexesMovedThisTurn: 2,
    });
    expect(moved).not.toHaveProperty('pendingAltitudeControlStepCount');
    expect(moved).not.toHaveProperty('pendingAltitudeControlMpCost');
  });
});
