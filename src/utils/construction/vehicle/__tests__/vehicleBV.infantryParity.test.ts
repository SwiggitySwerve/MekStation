import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

import { calculateUnitBV } from '../../bvAdapter';
import { hasNativeWeaponBVFlag } from '../../equipmentBV/nativeWeaponFlags';
import { calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

// MegaMek 48fcb2f6 BVCalculator.java:883-887 excludes F_INFANTRY from FCS;
// InfantryWeapon.java:83-87 sets the inherited flag. Source pins in RULES.md.
it('native Outrider keeps Java 17 BV without a caller-supplied infantry flag', () => {
  const unit = getNodeCanonicalUnitService().getByIdSync('vehicles:outrider');
  expect(unit).not.toBeNull();
  expect(calculateUnitBV(unit)).toBe(17);
});

it.each<[string[]]>([
  [[]],
  [['basic-fire-control']],
  [['advanced-fire-control']],
])('native infantry MG skips support fire control %s', (chassisEquipment) => {
  expect(
    calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        chassisEquipment,
        weapons: [{ id: 'machine-gun-supportpt:size:1.0', location: 'Right' }],
      }),
    ).weaponBV,
  ).toBe(4.8);
});

it('the same-name BA light MG retains support FCS scaling', () => {
  expect(
    calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        weapons: [{ id: 'balightmg', location: 'Front' }],
      }),
    ).weaponBV,
  ).toBe(4);
});

it('native flags distinguish inherited infantry weapons and BA weapons', () => {
  expect(
    hasNativeWeaponBVFlag('machine-gun-support-registry', 'infantry'),
  ).toBe(true);
  expect(hasNativeWeaponBVFlag('InfantrySupportMG', 'infantry')).toBe(true);
  expect(hasNativeWeaponBVFlag('CLBALightMG', 'infantry')).toBe(false);
  expect(hasNativeWeaponBVFlag('legacy-custom', 'infantry')).toBeUndefined();
});

it('unrepresented legacy mounts keep their supplied infantry fact', () => {
  const weapon = { id: 'legacy-custom', location: 'Front', bvOverride: 10 };
  expect(
    calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        weapons: [weapon],
      }),
    ).weaponBV,
  ).toBe(8);
  expect(
    calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        weapons: [{ ...weapon, isInfantry: true }],
      }),
    ).weaponBV,
  ).toBe(10);
});
