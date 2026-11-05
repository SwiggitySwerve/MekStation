import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

const input = (
  ids: string[],
  overrides: Partial<IAerospaceBVInput> = {},
): IAerospaceBVInput => ({
  subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 4',
  year: 3080,
  tonnage: 20,
  structuralIntegrity: 6,
  safeThrust: 6,
  maxThrust: 9,
  armorType: 'standard',
  totalArmorPoints: 20,
  equipment: ids.map((id) => ({ id, location: Arc.NOSE })),
  ...overrides,
});
// Java 48fcb2f64: BVCalculator.java:845-847,936-963,1159-1182;
// AeroBVCalculator.java:162-180. mm-data 50f7efef0c:
// convfighter/ProtoTypes/Bullet Suicide Drone.blk.
it('matches native Bullet with weapon factor, separate ammo and both summary factors', () => {
  const result = calculateAerospaceBV(
    input(['srm-2', 'isboobytrap', 'isdroneoperatingsystem', 'is-ammo-srm-2'], {
      ammo: [{ id: 'is-ammo-srm-2', weaponType: 'srm-2', bv: 3 }],
    }),
  );
  expect(result.defensive).toBeCloseTo(51.7, 8);
  expect(result.weaponFirePoolBV).toBeCloseTo(16.8, 8);
  expect(result.ammoBV).toBe(3);
  expect(result.offensive).toBeCloseTo(29.7, 8);
  expect(result).toMatchObject({ final: 73, summaryModifier: 0.9025 });
});
it('applies the weapon factor before adding the capacitor bonus and TC', () => {
  const result = calculateAerospaceOffensiveBV(
    input(
      [
        'ppc',
        'ppc-capacitor',
        'istargeting-computer',
        'isdroneoperatingsystem',
      ],
      {
        subType: AerospaceSubType.AEROSPACE_FIGHTER,
      },
    ),
  );
  expect(result.weaponFirePoolBV).toBeCloseTo((176 * 0.8 + 88) * 1.25, 8);
});
it('does not scale a physical ammunition alias in the legacy flat-input path', () => {
  const result = calculateAerospaceOffensiveBV(
    input(['srm-2', 'is-ammo-srm-2', 'isdroneoperatingsystem']),
  );
  expect(result.weaponFirePoolBV).toBeCloseTo(16.8 + 3, 8);
});
it('applies both summary factors with a small cockpit', () => {
  const result = calculateAerospaceBV(
    input(['isdroneoperatingsystem'], {
      hasSmallCockpit: true,
      totalArmorPoints: 100,
    }),
  );
  expect(result).toMatchObject({ final: 260, summaryModifier: 0.9025 });
});
it('preserves the same craft without a drone OS', () => {
  expect(calculateAerospaceBV(input(['srm-2'])).final).toBe(100);
});
