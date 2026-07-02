import type { IWeapon } from '@/simulation/ai/types';

import {
  VehicleLocation,
  type VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { IAdaptedUnit } from '../types';

import {
  buildInteractiveSessionUnitMaps,
  gameUnitsWithAdaptedCombatSeeds,
} from '../InteractiveSession.setup';

function vehicleGameUnit(
  vehicleInitOverrides: Partial<IGameUnit['vehicleInit']> = {},
): IGameUnit {
  return {
    id: 'target',
    name: 'Target Tank',
    side: GameSide.Opponent,
    unitRef: 'target',
    pilotRef: 'target-pilot',
    unitType: UnitType.VEHICLE,
    gunnery: 4,
    piloting: 5,
    vehicleInit: {
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
        [VehicleLocation.REAR]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
        [VehicleLocation.REAR]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      ...vehicleInitOverrides,
    },
  };
}

function weaponAt(location: VehicleLocation, destroyed = false): IWeapon {
  return {
    id: `weapon-${location}`,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed,
    vehicleMountLocation: location,
  };
}

function adaptedVehicle(weapons: readonly IWeapon[]): IAdaptedUnit {
  return {
    id: 'target',
    side: GameSide.Opponent,
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
    tonnage: 80,
    weapons,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

describe('buildInteractiveSessionUnitMaps', () => {
  it('carries adapted catalog tonnage into resolver lookup maps', () => {
    const maps = buildInteractiveSessionUnitMaps(
      [adaptedVehicle([])],
      [],
      [vehicleGameUnit()],
    );

    expect(maps.tonnageByUnit.get('target')).toBe(80);
  });
});

describe('gameUnitsWithAdaptedCombatSeeds', () => {
  it('derives represented vehicle weapon locations for crit availability', () => {
    const [unit] = gameUnitsWithAdaptedCombatSeeds(
      [vehicleGameUnit()],
      [adaptedVehicle([weaponAt(VehicleLocation.FRONT)])],
      [],
    );

    expect(unit.vehicleInit?.criticalAvailability).toEqual({
      weaponLocations: [VehicleLocation.FRONT],
      weaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
      jammableWeaponLocations: [VehicleLocation.FRONT],
      jammableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
      destroyableWeaponLocations: [VehicleLocation.FRONT],
      destroyableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
    });
  });

  it('keeps destroyed vehicle weapons unavailable for weapon crits but available for stabilizers', () => {
    const [unit] = gameUnitsWithAdaptedCombatSeeds(
      [vehicleGameUnit()],
      [adaptedVehicle([weaponAt(VehicleLocation.REAR, true)])],
      [],
    );

    expect(unit.vehicleInit?.criticalAvailability).toEqual({
      weaponLocations: [VehicleLocation.REAR],
      weaponLocationCounts: { [VehicleLocation.REAR]: 1 },
      jammableWeaponLocations: [],
      jammableWeaponLocationCounts: {},
      destroyableWeaponLocations: [],
      destroyableWeaponLocationCounts: {},
    });
  });

  it('splices adapted armor/structure/heat sinks onto bare game units', () => {
    const adapted = {
      ...adaptedVehicle([]),
      armor: { head: 9, center_torso: 47, center_torso_rear: 14 },
      structure: { head: 3, center_torso: 31 },
      heatSinks: 20,
      heatSinkType: 'single' as const,
    };
    const bareUnit: IGameUnit = {
      id: 'target',
      name: 'Probe Mech',
      side: GameSide.Opponent,
      unitRef: 'probe-mech',
      pilotRef: 'probe-pilot',
      gunnery: 4,
      piloting: 5,
    };

    const [unit] = gameUnitsWithAdaptedCombatSeeds([bareUnit], [], [adapted]);

    expect(unit.armorByLocation).toEqual({
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
    });
    expect(unit.structureByLocation).toEqual({ head: 3, center_torso: 31 });
    expect(unit.heatSinks).toBe(20);
    expect(unit.heatSinkType).toBe('single');
  });

  it('leaves explicit producer-supplied seeds and empty adapted maps alone', () => {
    const bareUnit: IGameUnit = {
      id: 'target',
      name: 'Probe Mech',
      side: GameSide.Opponent,
      unitRef: 'probe-mech',
      pilotRef: 'probe-pilot',
      gunnery: 4,
      piloting: 5,
      armorByLocation: { head: 1 },
      heatSinks: 13,
    };

    // Adapted maps empty (synthetic fixture) -> no armor/structure splice;
    // explicit producer values win over adapted ones.
    const [unit] = gameUnitsWithAdaptedCombatSeeds(
      [bareUnit],
      [],
      [{ ...adaptedVehicle([]), heatSinks: 20 }],
    );

    expect(unit.armorByLocation).toEqual({ head: 1 });
    expect(unit.structureByLocation).toBeUndefined();
    expect(unit.heatSinks).toBe(13);
  });

  it('preserves explicit cargo and stabilizer availability fields', () => {
    const [unit] = gameUnitsWithAdaptedCombatSeeds(
      [
        vehicleGameUnit({
          criticalAvailability: {
            cargoLoaded: false,
            stabilizerHitLocations: [VehicleLocation.FRONT],
          },
        }),
      ],
      [adaptedVehicle([weaponAt(VehicleLocation.FRONT)])],
      [],
    );

    expect(unit.vehicleInit?.criticalAvailability).toEqual({
      weaponLocations: [VehicleLocation.FRONT],
      weaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
      jammableWeaponLocations: [VehicleLocation.FRONT],
      jammableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
      destroyableWeaponLocations: [VehicleLocation.FRONT],
      destroyableWeaponLocationCounts: { [VehicleLocation.FRONT]: 1 },
      cargoLoaded: false,
      stabilizerHitLocations: [VehicleLocation.FRONT],
    });
  });
});
