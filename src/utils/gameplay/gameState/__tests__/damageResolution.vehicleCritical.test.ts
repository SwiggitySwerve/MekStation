/**
 * applyCriticalHitResolved — vehicle critical replay tests
 *
 * Per `align-vehicle-critical-location-tables` game-state-management delta
 * ("Representable Vehicle Critical Replay Effects"): replaying a
 * `CriticalHitResolved` event against a unit with a vehicle combat-state
 * envelope SHALL mirror the critical effect into that envelope.
 *   - `fuel_tank` destroys the vehicle with cause `fuel_tank_explosion`
 *     (MegaMek TWGameManager Tank.CRIT_FUEL_TANK → destroyEntity
 *     "fuel explosion").
 *   - `rotor_damage` adds 1 MP penalty per hit and immobilizes once the
 *     accumulated penalty reaches the original cruise MP (MegaMek
 *     TWGameManager VTOL.CRIT_ROTOR_DAMAGE → setMotiveDamage + immobilize
 *     at originalWalkMP).
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  type ICriticalHitResolvedPayload,
  type IGameState,
  type IGameUnit,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { applyCriticalHitResolved } from '../damageResolution';
import { createInitialUnitState } from '../initialization';

// =============================================================================
// Fixtures
// =============================================================================

/** Builds a VTOL game unit whose initial state seeds a vehicle combat envelope. */
function makeVTOLUnit(): IGameUnit {
  return {
    id: 'vtol-1',
    name: 'Test VTOL',
    side: GameSide.Player,
    unitRef: 'test-vtol',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    unitType: UnitType.VTOL,
    vehicleInit: {
      motionType: GroundMotionType.VTOL,
      originalCruiseMP: 2,
      armor: { [VTOLLocation.ROTOR]: 2, [VTOLLocation.FRONT]: 8 } as Partial<
        Record<VehicleLocation | VTOLLocation, number>
      >,
      structure: {
        [VTOLLocation.ROTOR]: 1,
        [VTOLLocation.FRONT]: 4,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      altitude: 1,
    },
  };
}

/** Wraps a single seeded vehicle unit in a minimal replayable game state. */
function makeGameState(): IGameState {
  const unit = makeVTOLUnit();
  const unitState = createInitialUnitState(unit, { q: 0, r: 0 }, Facing.North);
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: { [unit.id]: unitState },
    turnEvents: [],
  };
}

/** Builds a vehicle CriticalHitResolved payload for the fixture VTOL. */
function makeCritPayload(
  effect: string,
  componentType: string,
  componentName: string,
): ICriticalHitResolvedPayload {
  return {
    unitId: 'vtol-1',
    location: VTOLLocation.ROTOR,
    slotIndex: 0,
    componentType,
    componentName,
    effect,
    destroyed: false,
  };
}

/** Narrows a unit's combat state to the vehicle envelope or fails the test. */
function vehicleStateOf(state: IGameState, unitId: string) {
  const combatState = state.units[unitId]?.combatState;
  if (combatState?.kind !== 'vehicle') {
    throw new Error(`expected vehicle combat state for ${unitId}`);
  }
  return combatState.state;
}

// =============================================================================
// Tests
// =============================================================================

describe('applyCriticalHitResolved — vehicle critical replay', () => {
  it('fuel_tank critical destroys the vehicle with fuel_tank_explosion cause', () => {
    const state = makeGameState();

    const next = applyCriticalHitResolved(
      state,
      makeCritPayload('fuel_tank', 'engine', 'Fuel Tank'),
    );

    const vehicle = vehicleStateOf(next, 'vtol-1');
    expect(vehicle.destroyed).toBe(true);
    expect(vehicle.destructionCause).toBe('fuel_tank_explosion');
  });

  it('rotor_damage adds an MP penalty per hit and immobilizes at the cruise-MP threshold', () => {
    const state = makeGameState();
    const payload = makeCritPayload('rotor_damage', 'rotor', 'Rotor damage');

    const afterFirst = applyCriticalHitResolved(state, payload);
    const firstVehicle = vehicleStateOf(afterFirst, 'vtol-1');
    expect(firstVehicle.motive.penaltyMP).toBe(1);
    expect(firstVehicle.motive.immobilized).toBe(false);

    const afterSecond = applyCriticalHitResolved(afterFirst, payload);
    const secondVehicle = vehicleStateOf(afterSecond, 'vtol-1');
    expect(secondVehicle.motive.penaltyMP).toBe(2);
    expect(secondVehicle.motive.immobilized).toBe(true);
  });

  it('rotor_destroyed critical immobilizes the VTOL envelope', () => {
    const state = makeGameState();

    const next = applyCriticalHitResolved(
      state,
      makeCritPayload('rotor_destroyed', 'rotor', 'Rotor destroyed'),
    );

    const vehicle = vehicleStateOf(next, 'vtol-1');
    expect(vehicle.motive.immobilized).toBe(true);
  });

  it('engine_hit criticals immobilize without destroying on replay', () => {
    const state = makeGameState();
    const payload = makeCritPayload('engine_hit', 'engine', 'Fusion Engine');

    const afterFirst = applyCriticalHitResolved(state, payload);
    const firstVehicle = vehicleStateOf(afterFirst, 'vtol-1');
    expect(firstVehicle.motive.engineHits).toBe(1);
    expect(firstVehicle.motive.immobilized).toBe(true);
    expect(firstVehicle.destroyed).toBe(false);

    const afterSecond = applyCriticalHitResolved(afterFirst, payload);
    const secondVehicle = vehicleStateOf(afterSecond, 'vtol-1');
    expect(secondVehicle.motive.engineHits).toBe(2);
    expect(secondVehicle.motive.immobilized).toBe(true);
    expect(secondVehicle.destroyed).toBe(false);
    expect(secondVehicle.destructionCause).toBeUndefined();
  });

  it.each(['commander_hit', 'copilot_hit'])(
    '%s critical replays as commander damage with crew stun',
    (effect) => {
      const state = makeGameState();

      const next = applyCriticalHitResolved(
        state,
        makeCritPayload(effect, 'crew', effect),
      );

      const vehicle = vehicleStateOf(next, 'vtol-1');
      expect(vehicle.motive.commanderHits).toBe(1);
      expect(vehicle.motive.driverHits).toBe(0);
      expect(vehicle.motive.crewStunnedPhases).toBe(2);
      expect(vehicle.destroyed).toBe(false);
    },
  );
});
