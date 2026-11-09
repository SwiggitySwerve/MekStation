import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { SuperHeavyVehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { createVehicleStore } from '../useVehicleStore';
import { createDefaultVehicleState, type VehicleState } from '../vehicleState';

function makeStore(overrides: Partial<VehicleState> = {}) {
  return createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Pinned armor',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    armorType: ArmorTypeEnum.STANDARD,
    armorTonnage: 5,
    ...overrides,
  });
}
const turret = { type: TurretType.SINGLE, rotationArc: 360 };
const total = (allocation: Record<string, number>) =>
  Object.values(allocation).reduce((sum, points) => sum + points, 0);
const allocate = (overrides: Partial<VehicleState> = {}) => {
  const store = makeStore(overrides);
  store.getState().autoAllocateArmor();
  return store.getState().armorAllocation;
};

describe('real vehicle store follows MML CVStructureTab:877 and SVArmorTab:286', () => {
  it('distributes eighty points over four locations, favoring front over rear', () => {
    expect(allocate()).toMatchObject({
      Front: 24,
      Left: 20,
      Right: 20,
      Rear: 16,
      Turret: 0,
      'Turret 2': 0,
      Body: 0,
    });
  });

  it('gives the turret the same share as a side and puts rounding remainder on front', () => {
    const armor = allocate({ turret });
    expect(armor).toMatchObject({
      Front: 20,
      Left: 16,
      Right: 16,
      Rear: 12,
      Turret: 16,
    });
    expect(total(armor)).toBe(80);
  });

  it('counts both turrets in the same budget instead of preserving old secondary armor', () => {
    const armor = allocate({
      turret,
      secondaryTurret: turret,
      armorAllocation: {
        ...makeStore().getState().armorAllocation,
        'Turret 2': 99,
      },
    });
    expect(armor).toMatchObject({
      Front: 18,
      Left: 13,
      Right: 13,
      Rear: 10,
      Turret: 13,
      'Turret 2': 13,
    });
    expect(total(armor)).toBe(80);
  });

  it('clears armor on an absent secondary turret', () => {
    const armor = allocate({
      armorAllocation: {
        ...makeStore().getState().armorAllocation,
        'Turret 2': 99,
      },
    });
    expect(armor['Turret 2']).toBe(0);
    expect(total(armor)).toBe(80);
  });

  it('uses armor type points per ton rather than hardcoded standard armor', () => {
    const armor = allocate({ armorType: ArmorTypeEnum.FERRO_FIBROUS_IS });
    expect(total(armor)).toBe(89);
    expect(armor).toMatchObject({ Front: 28, Left: 22, Right: 22, Rear: 17 });
  });

  it('caps allocation at the combat vehicle total', () => {
    expect(total(allocate({ armorTonnage: 40 }))).toBe(215);
  });

  it('reserves exactly two rotor points before distributing the remaining VTOL budget', () => {
    const armor = allocate({
      tonnage: 30,
      unitType: UnitType.VTOL,
      motionType: GroundMotionType.VTOL,
      armorTonnage: 40,
    });
    expect(armor).toMatchObject({
      Front: 45,
      Left: 35,
      Right: 35,
      Rear: 28,
      Rotor: 2,
    });
    expect(total(armor)).toBe(145);
  });

  it.each([0, 1])(
    'never creates negative hull armor with only %s point for a rotor',
    (points) => {
      const armor = allocate({
        motionType: GroundMotionType.VTOL,
        unitType: UnitType.VTOL,
        armorTonnage: points / 16,
      });
      expect(armor.Rotor).toBe(points);
      expect(total(armor)).toBe(points);
      expect(
        Object.values(armor).every(
          (value) => Number.isInteger(value) && value >= 0,
        ),
      ).toBe(true);
    },
  );

  it('uses BAR points and the support class total', () => {
    const armor = allocate({
      unitType: UnitType.SUPPORT_VEHICLE,
      usesBarArmor: true,
      barRating: 10,
      armorTechRating: 5,
      armorTonnage: 1,
    });
    expect(armor).toMatchObject({
      Front: 8,
      Left: 4,
      Right: 4,
      Rear: 3,
      Body: 0,
    });
    expect(total(armor)).toBe(19);
    expect(
      total(allocate({ unitType: UnitType.SUPPORT_VEHICLE, armorTonnage: 40 })),
    ).toBe(104);
  });

  it.each([UnitType.VEHICLE, UnitType.SUPPORT_VEHICLE] as const)(
    'allocates all six hull faces for %s',
    (unitType) => {
      const armor = allocate({
        unitType,
        tonnage: 150,
        motionType: GroundMotionType.WHEELED,
        isSuperheavy: true,
      });
      expect(armor.Front).toBe(18);
      expect(armor.Rear).toBe(10);
      for (const location of [
        SuperHeavyVehicleLocation.FRONT_LEFT,
        SuperHeavyVehicleLocation.FRONT_RIGHT,
        SuperHeavyVehicleLocation.REAR_LEFT,
        SuperHeavyVehicleLocation.REAR_RIGHT,
      ])
        expect(armor[location]).toBe(13);
      expect(total(armor)).toBe(80);
      expect(armor.Left).toBe(0);
      expect(armor.Right).toBe(0);
    },
  );
});
