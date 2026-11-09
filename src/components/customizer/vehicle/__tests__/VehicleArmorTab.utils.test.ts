/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  getMaxVehicleArmor,
  getMaxVehicleArmorForLocation,
  getVehicleArmorEditorFigures,
  getVehicleArmorEditorLayout,
  type IVehicleArmorProfile,
  type VehicleArmorLocation,
} from '@/utils/construction/vehicle/editorArmor';

const combat: IVehicleArmorProfile = { hasTurret: true, isVTOL: false };

describe('pinned MML vehicle armor limits (62bf193 UnitUtil.java:769-795,900-916)', () => {
  it.each([
    VehicleLocation.FRONT,
    VehicleLocation.LEFT,
    VehicleLocation.RIGHT,
    VehicleLocation.REAR,
    VehicleLocation.TURRET,
  ])('has no individual maximum for installed %s', (location) => {
    expect(
      getMaxVehicleArmorForLocation({ tonnage: 90, location, profile: combat }),
    ).toBeNull();
  });

  it('has no individual maximum on either installed turret or a six-side flank', () => {
    const profile = { ...combat, isSuperheavy: true, hasSecondaryTurret: true };
    for (const location of [
      VehicleLocation.TURRET,
      VehicleLocation.TURRET_2,
      SuperHeavyVehicleLocation.FRONT_LEFT,
      SuperHeavyVehicleLocation.REAR_RIGHT,
    ]) {
      expect(
        getMaxVehicleArmorForLocation({ tonnage: 150, location, profile }),
      ).toBeNull();
    }
  });

  it('retains zero for unavailable locations and the unarmored body', () => {
    for (const location of [
      VehicleLocation.TURRET,
      VehicleLocation.TURRET_2,
      VehicleLocation.BODY,
      VTOLLocation.ROTOR,
      SuperHeavyVehicleLocation.FRONT_LEFT,
      'Unknown' as VehicleArmorLocation,
    ]) {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: 50,
          location,
          profile: { hasTurret: false, isVTOL: false },
        }),
      ).toBe(0);
    }
  });

  it('limits combat and support VTOL rotors to two', () => {
    for (const isSupport of [false, true]) {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: 30,
          location: VTOLLocation.ROTOR,
          profile: { ...combat, isVTOL: true, isSupport },
        }),
      ).toBe(2);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: 30,
          location: VehicleLocation.FRONT,
          profile: { ...combat, isVTOL: true, isSupport },
        }),
      ).toBeNull();
    }
  });

  it('keeps the positional facade without its invented cap', () => {
    expect(
      getMaxVehicleArmorForLocation(50, VehicleLocation.TURRET, true, false),
    ).toBeNull();
    expect(getMaxVehicleArmor(50, false, false)).toBe(215);
  });

  it.each([
    [50, {}, 215],
    [90, {}, 355],
    [30, { isVTOL: true }, 145],
    [140, { isSuperheavy: true }, 530],
    [2.5, {}, 48],
  ] satisfies ReadonlyArray<
    readonly [number, Partial<IVehicleArmorProfile>, number]
  >)(
    'uses the combat total for %s tons regardless of turret layout',
    (tonnage, extra, maximum) => {
      expect(
        getMaxVehicleArmor({
          tonnage,
          profile: { ...combat, ...extra, hasSecondaryTurret: true },
        }),
      ).toBe(maximum);
      expect(
        getMaxVehicleArmor({
          tonnage,
          profile: { ...combat, ...extra, hasTurret: false },
        }),
      ).toBe(maximum);
    },
  );

  it.each([
    [GroundMotionType.TRACKED, 50, 104],
    [GroundMotionType.WHEELED, 150, 304],
    [GroundMotionType.HOVER, 30, 34],
    [GroundMotionType.VTOL, 30, 34],
    [GroundMotionType.WIGE, 3.5, 5],
    [GroundMotionType.RAIL, 50, 29],
    [GroundMotionType.MAGLEV, 50, 29],
    [GroundMotionType.SUBMARINE, 2, 4],
    [GroundMotionType.NAVAL, 300, 104],
    [GroundMotionType.NAVAL, 301, 19],
    [GroundMotionType.HYDROFOIL, 301, 19],
  ])(
    'uses TestSupportVehicle total for %s at %s tons',
    (motionType, tonnage, maximum) => {
      expect(
        getMaxVehicleArmor({
          tonnage,
          profile: {
            ...combat,
            isSupport: true,
            motionType,
            isVTOL: motionType === GroundMotionType.VTOL,
          },
        }),
      ).toBe(maximum);
    },
  );

  it('shows Ajax armor within its pinned total and preserves its purchased points', () => {
    expect(
      getVehicleArmorEditorFigures({
        tonnage: 90,
        armorType: ArmorTypeEnum.STANDARD,
        armorTonnage: 19,
        armorAllocation: {
          Front: 76,
          Left: 60,
          Right: 60,
          Rear: 40,
          Turret: 68,
        },
        profile: combat,
      }),
    ).toMatchObject({
      availablePoints: 304,
      allocatedPoints: 304,
      maxTotalArmor: 355,
      maxUsefulTonnage: 22.5,
      unallocatedPoints: 0,
      wastedPoints: 0,
    });
  });

  it('caps available points at the class total and reports purchased excess as waste', () => {
    expect(
      getVehicleArmorEditorFigures({
        tonnage: 90,
        armorType: ArmorTypeEnum.STANDARD,
        armorTonnage: 30,
        armorAllocation: {},
        profile: combat,
      }),
    ).toMatchObject({
      availablePoints: 355,
      maxTotalArmor: 355,
      wastedPoints: 125,
    });
  });

  it('allows the pinned automatic allocation on BAR and six-side vehicles', () => {
    expect(
      getVehicleArmorEditorLayout({ ...combat, usesBarArmor: true })
        .canAutoAllocate,
    ).toBe(true);
    expect(
      getVehicleArmorEditorLayout({ ...combat, isSuperheavy: true })
        .canAutoAllocate,
    ).toBe(true);
  });

  it('omits Body from combat and every support armor layout, as pinned MML', () => {
    for (const profile of [
      combat,
      { ...combat, isSupport: true },
      { ...combat, isSupport: true, isVTOL: true },
      { ...combat, isSupport: true, isSuperheavy: true },
    ]) {
      expect(
        getVehicleArmorEditorLayout(profile).locations.map(
          ({ location }) => location,
        ),
      ).not.toContain(VehicleLocation.BODY);
    }
  });
});
