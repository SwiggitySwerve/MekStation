import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import {
  getMaxVehicleArmor,
  getMaxVehicleArmorForLocation,
  type VehicleArmorLocation,
} from '../VehicleArmorTab.utils';

const TONNAGE = 50;

describe('VehicleArmorTab utils', () => {
  describe('getMaxVehicleArmorForLocation', () => {
    it.each([
      [VehicleLocation.FRONT, 24],
      [VehicleLocation.LEFT, 18],
      [VehicleLocation.RIGHT, 18],
      [VehicleLocation.REAR, 12],
    ])('resolves %s armor cap from base structure', (location, expected) => {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location,
          profile: { hasTurret: false, isVTOL: false },
        }),
      ).toBe(expected);
    });

    it('resolves primary and secondary turret caps only when configured', () => {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VehicleLocation.TURRET,
          profile: { hasTurret: true, isVTOL: false },
        }),
      ).toBe(12);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VehicleLocation.TURRET,
          profile: { hasTurret: false, isVTOL: false },
        }),
      ).toBe(0);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VehicleLocation.TURRET_2,
          profile: {
            hasTurret: true,
            isVTOL: false,
            hasSecondaryTurret: true,
          },
        }),
      ).toBe(12);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VehicleLocation.TURRET_2,
          profile: { hasTurret: true, isVTOL: false },
        }),
      ).toBe(0);
    });

    it('resolves rotor armor only for VTOL profiles', () => {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VTOLLocation.ROTOR,
          profile: { hasTurret: false, isVTOL: true },
        }),
      ).toBe(2);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VTOLLocation.ROTOR,
          profile: { hasTurret: false, isVTOL: false },
        }),
      ).toBe(0);
    });

    it('preserves zero fallback for unmapped locations', () => {
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: VehicleLocation.BODY,
          profile: { hasTurret: true, isVTOL: true, hasSecondaryTurret: true },
        }),
      ).toBe(0);
      expect(
        getMaxVehicleArmorForLocation({
          tonnage: TONNAGE,
          location: 'Unmapped' as VehicleArmorLocation,
          profile: { hasTurret: true, isVTOL: true, hasSecondaryTurret: true },
        }),
      ).toBe(0);
    });

    it('preserves the legacy positional call shape', () => {
      expect(
        getMaxVehicleArmorForLocation(
          TONNAGE,
          VehicleLocation.TURRET,
          true,
          false,
        ),
      ).toBe(12);
    });
  });

  describe('getMaxVehicleArmor', () => {
    it('sums active vehicle, turret, secondary turret, and VTOL caps', () => {
      expect(
        getMaxVehicleArmor({
          tonnage: TONNAGE,
          profile: { hasTurret: true, isVTOL: true, hasSecondaryTurret: true },
        }),
      ).toBe(98);
    });

    it('preserves the legacy positional total call shape', () => {
      expect(getMaxVehicleArmor(TONNAGE, false, false)).toBe(72);
    });
  });
});
