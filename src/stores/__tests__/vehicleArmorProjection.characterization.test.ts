/**
 * Characterization of installed vehicle armor totals through the store's
 * compatibility export. The arithmetic moved from `vehicleState` to the
 * construction armor owner without changing; these figures held before the
 * move and must hold after it.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import {
  createEmptyVehicleArmorAllocation,
  getTotalVehicleArmor,
} from '../vehicleState';

const allocation = {
  ...createEmptyVehicleArmorAllocation(),
  [VehicleLocation.FRONT]: 10,
  [VehicleLocation.LEFT]: 6,
  [VehicleLocation.RIGHT]: 5,
  [VehicleLocation.REAR]: 4,
  [VehicleLocation.TURRET]: 8,
  [VehicleLocation.TURRET_2]: 3,
  [VehicleLocation.BODY]: 99,
};

describe('getTotalVehicleArmor — characterization', () => {
  it.each([
    [false, false, 25],
    [true, false, 33],
    [false, true, 28],
    [true, true, 36],
  ])('turret=%s secondary=%s totals %d', (turret, secondary, expected) => {
    expect(getTotalVehicleArmor(allocation, turret, secondary)).toBe(expected);
  });

  it('defaults to neither turret and never counts the body location', () => {
    expect(getTotalVehicleArmor(allocation)).toBe(25);
  });

  it('counts the VTOL rotor whenever the allocation carries one', () => {
    const vtol = { ...allocation, [VTOLLocation.ROTOR]: 2 };
    expect(getTotalVehicleArmor(vtol, false, false)).toBe(27);
    expect(getTotalVehicleArmor(vtol, true, true)).toBe(38);
  });

  it('treats missing and non-numeric locations as zero', () => {
    expect(
      getTotalVehicleArmor({ Front: 7, Left: NaN } as never, true, true),
    ).toBe(7);
  });
});
