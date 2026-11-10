import { vehicleBVTerms } from '../bvTrace';
import { calculateVehicleBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

// MegaMek 48fcb2f64: ISSRM2.java:76 (21); BVCalculator.java:1230-1231
// excludes F_ONE_SHOT/F_INFANTRY, independent of the synthetic BV-100 bins.
test('retains a normal SRM-2 cap without matching vehicle ammunition', () => {
  const result = calculateVehicleBV(
    baseInput({ weapons: [{ id: 'srm-2', location: 'front' }], ammo: [] }),
  );
  expect(vehicleBVTerms(result)).toHaveProperty(['ammo.cap.SRM:2'], 21);
  expect(result.ammoBV).toBe(0);
});

test.each([
  ['issrm2ios-registry', 'ammo-srm-2', 'SRM:2'],
  ['vehicular-grenade-launcher', 'ammo-vgl', 'VGL:1'],
  ['plasma-rifle-man-portable-registry', 'ammo-plasma-rifle', 'PLASMA:1'],
])(
  'omits excluded native %s cap even with matching ammunition',
  (id, bin, group) => {
    const result = calculateVehicleBV(
      baseInput({
        weapons: [{ id, location: 'front' }],
        ammo: [{ id: bin, location: 'front', bvOverride: 100 }],
      }),
    );
    const terms = vehicleBVTerms(result);
    expect(terms).toHaveProperty([`ammo.available.${group}`], 100);
    expect(terms).not.toHaveProperty([`ammo.cap.${group}`]);
  },
);
