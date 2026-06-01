import {
  tacticalMapInfantryMountStateCapability,
  tacticalMapInfantryMountStateDestination,
  tacticalMapInfantryMountStateGrid,
  tacticalMapInfantryMountStateUnit,
} from '@/testing/tactical-map.infantry-mount-state-scenario';
import { tacticalMapLamAirMekCommitInput } from '@/testing/tactical-map.lam-conversion-scenario';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameState,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
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
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

import { applyEvent, createInitialGameState } from '..';

function stateWithUnit(unit: IUnitGameState): IGameState {
  return {
    ...createInitialGameState('game-1'),
    units: { [unit.id]: unit },
  };
}

const BASIC_CAPABILITY: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
};

describe('runtime movement state events', () => {
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
      {
        source: 'infantry_mount_action',
        infantryMounted: false,
      },
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
    expect(dismounted).toMatchObject({
      infantryMounted: false,
      unitHeight: 1,
    });
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
    const unit: IUnitGameState = {
      id: 'lam-1',
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
      conversionMode: 'mek',
      unitHeight: 1,
    };

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
    const unit: IUnitGameState = {
      id: 'wige-1',
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
    };
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
    const unit: IUnitGameState = {
      id: 'proto-glider-1',
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
    };
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

  it('replays LAM AirMek WiGE altitude controls into movement projection state', () => {
    const lamInput = tacticalMapLamAirMekCommitInput();
    const capability = lamInput.capability;
    if (!capability) {
      throw new Error('LAM AirMek fixture must provide movement capability');
    }
    const unit: IUnitGameState = {
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
    const unit: IUnitGameState = {
      id: 'quadvee-1',
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
      conversionMode: 'mek',
    };
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

    expect(committed).toMatchObject({
      valid: true,
      mpCost: 4,
    });
  });

  it('replays LAM AirMek-to-Mek conversion as two pending zero-MP steps', () => {
    const unit: IUnitGameState = {
      id: 'lam-1',
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
      conversionMode: 'airmek',
      lamAirMekAltitude: 2,
    };
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
    const converted: IUnitGameState = {
      id: 'quadvee-1',
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
      conversionMode: 'vehicle',
      pendingConversionStepCount: 1,
      pendingConversionMpCost: 3,
    };
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
    const landed: IUnitGameState = {
      id: 'wige-1',
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
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
    };
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
