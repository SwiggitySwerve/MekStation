import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  automaticWigeLandingContext,
  automaticWigeLandingRuntimePatch,
} from '@/utils/gameplay/movement/automaticWigeLanding';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

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

describe('automatic WiGE landing', () => {
  it('projects and patches short positive-altitude WiGE vehicle movement', () => {
    const unit = unitState({
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'unit',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 5,
          armor: {},
          structure: {},
          altitude: 2,
        }),
      },
    });
    const path = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ];

    expect(
      automaticWigeLandingContext(unit, MovementType.Walk, path, {
        q: 2,
        r: 0,
      }),
    ).toMatchObject({
      automaticLandingRequired: true,
      automaticLandingMode: 'wige',
      automaticLandingDistance: 2,
      automaticLandingMinimumDistance: 5,
    });
    expect(
      automaticWigeLandingRuntimePatch(unit, MovementType.Walk, path, {
        q: 2,
        r: 0,
      }),
    ).toEqual({ source: 'automatic_wige_landing', vehicleAltitude: 0 });
  });

  it('uses the Glider ProtoMek four-hex threshold', () => {
    const unit = unitState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'unit',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 1,
        }),
      },
    });

    expect(
      automaticWigeLandingContext(unit, MovementType.Walk, undefined, {
        q: 3,
        r: 0,
      }),
    ).toMatchObject({
      automaticLandingDistance: 3,
      automaticLandingMinimumDistance: 4,
    });
    expect(
      automaticWigeLandingContext(unit, MovementType.Walk, undefined, {
        q: 4,
        r: 0,
      }),
    ).toBeUndefined();
  });

  it('counts represented hexes already moved this turn', () => {
    const unit = unitState({
      hexesMovedThisTurn: 3,
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'unit',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 5,
          armor: {},
          structure: {},
          altitude: 2,
        }),
      },
    });
    const twoHexPath = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ];

    expect(
      automaticWigeLandingContext(unit, MovementType.Walk, twoHexPath, {
        q: 2,
        r: 0,
      }),
    ).toBeUndefined();
    expect(
      automaticWigeLandingContext(
        { ...unit, hexesMovedThisTurn: 2 },
        MovementType.Walk,
        twoHexPath,
        { q: 2, r: 0 },
      ),
    ).toMatchObject({
      automaticLandingDistance: 4,
      automaticLandingMinimumDistance: 5,
    });
  });

  it('preserves represented hover movement exemptions', () => {
    const unit = unitState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'unit',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 1,
        }),
      },
    });
    const destination = { q: 1, r: 0 };

    expect(
      automaticWigeLandingContext(
        unit,
        MovementType.Walk,
        undefined,
        destination,
        { movementMode: 'hover' },
      ),
    ).toBeUndefined();
    expect(
      automaticWigeLandingRuntimePatch(
        unit,
        MovementType.Walk,
        undefined,
        destination,
        { movementMode: 'hover' },
      ),
    ).toBeUndefined();
    expect(
      automaticWigeLandingRuntimePatch(
        unit,
        MovementType.Walk,
        undefined,
        destination,
        { movementMode: 'wige' },
      ),
    ).toEqual({ source: 'automatic_wige_landing', protoAltitude: 0 });
  });

  it('preserves jump and represented altitude-control exemptions', () => {
    const unit = unitState({
      pendingAltitudeControlStepCount: 1,
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'unit',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 5,
          armor: {},
          structure: {},
          altitude: 1,
        }),
      },
    });
    const destination = { q: 1, r: 0 };

    expect(
      automaticWigeLandingContext(
        { ...unit, pendingAltitudeControlStepCount: undefined },
        MovementType.Jump,
        undefined,
        destination,
      ),
    ).toBeUndefined();
    expect(
      automaticWigeLandingContext(
        unit,
        MovementType.Walk,
        undefined,
        destination,
      ),
    ).toBeUndefined();
  });

  it('patches represented LAM AirMek WiGE elevation', () => {
    const unit = unitState({
      conversionMode: 'airmek',
      lamAirMekAltitude: 2,
    });

    expect(
      automaticWigeLandingRuntimePatch(unit, MovementType.Walk, undefined, {
        q: 1,
        r: 0,
      }),
    ).toEqual({ source: 'automatic_wige_landing', lamAirMekAltitude: 0 });
  });
});
