import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { MechLocation } from '../CriticalSlotAllocation';
import {
  AerospaceLocation,
  BattleArmorLocation,
  CapitalShipLocation,
  DropShipLocation,
  InfantryLocation,
  ProtoMechLocation,
  SmallCraftLocation,
  SupportVehicleLocation,
  VehicleLocation,
  VTOLLocation,
  getLocationsForUnitType,
  isValidLocationForUnitType,
} from '../UnitLocation';

const mechLocations = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

describe('UnitLocation helpers', () => {
  it.each([UnitType.BATTLEMECH, UnitType.OMNIMECH, UnitType.INDUSTRIALMECH])(
    'returns mech locations for %s',
    (unitType) => {
      expect(getLocationsForUnitType(unitType)).toEqual(mechLocations);
    },
  );

  it.each([
    [UnitType.VEHICLE, Object.values(VehicleLocation)],
    [UnitType.VTOL, Object.values(VTOLLocation)],
    [UnitType.AEROSPACE, Object.values(AerospaceLocation)],
    [UnitType.CONVENTIONAL_FIGHTER, Object.values(AerospaceLocation)],
    [UnitType.SMALL_CRAFT, Object.values(SmallCraftLocation)],
    [UnitType.DROPSHIP, Object.values(DropShipLocation)],
    [UnitType.JUMPSHIP, Object.values(CapitalShipLocation)],
    [UnitType.WARSHIP, Object.values(CapitalShipLocation)],
    [UnitType.SPACE_STATION, Object.values(CapitalShipLocation)],
    [UnitType.BATTLE_ARMOR, Object.values(BattleArmorLocation)],
    [UnitType.PROTOMECH, Object.values(ProtoMechLocation)],
    [UnitType.INFANTRY, Object.values(InfantryLocation)],
    [UnitType.SUPPORT_VEHICLE, Object.values(SupportVehicleLocation)],
  ])('returns unit-specific locations for %s', (unitType, locations) => {
    expect(getLocationsForUnitType(unitType)).toEqual(locations);
  });

  it('defaults unknown unit types to mech locations', () => {
    expect(getLocationsForUnitType('unknown' as UnitType)).toEqual(
      mechLocations,
    );
  });

  it('returns a defensive copy for location lists', () => {
    const locations = getLocationsForUnitType(UnitType.VEHICLE);
    locations.push('Mutated Location');

    expect(getLocationsForUnitType(UnitType.VEHICLE)).toEqual(
      Object.values(VehicleLocation),
    );
  });

  it('checks location validity against the unit type lookup', () => {
    expect(
      isValidLocationForUnitType(VehicleLocation.TURRET, UnitType.VEHICLE),
    ).toBe(true);
    expect(
      isValidLocationForUnitType(VehicleLocation.TURRET, UnitType.BATTLEMECH),
    ).toBe(false);
  });
});
