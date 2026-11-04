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
  overrides: Partial<IAerospaceBVInput> = {},
): IAerospaceBVInput => ({
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  tonnage: 40,
  structuralIntegrity: 9,
  safeThrust: 9,
  maxThrust: 14,
  totalArmorPoints: 153,
  armorType: 'ferro-aluminum',
  heatCapacity: 24,
  equipment: [
    { id: 'clerlargelaser:omni', location: Arc.NOSE },
    { id: 'cltargeting-computer:omni', location: Arc.NOSE },
    ...Array.from({ length: 2 }, () => ({
      id: 'clmediumpulselaser:omni',
      location: Arc.LEFT_WING,
    })),
    ...Array.from({ length: 2 }, () => ({
      id: 'clmediumpulselaser:omni',
      location: Arc.RIGHT_WING,
    })),
    { id: 'clermediumlaser:omni', location: Arc.AFT },
  ],
  ...overrides,
});

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// BVCalculator.java:880-891; HeatTrackingBVCalculator.java:108-147.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985, fighters/TRO3055U/Batu Prime.blk.
it('matches Batu Prime weapon, offensive and total Java values, including rear and heat', () => {
  const result = calculateAerospaceBV(input());
  expect(result.weaponFirePoolBV + result.fuselageWeaponBV).toBe(932.5);
  expect(result.defensive).toBeCloseTo(480.6, 9);
  expect(result.offensive).toBeCloseTo(2014.2, 9);
  expect(result.final).toBe(2495);
});

it.each(['istargeting-computer', 'cltargeting-computer:omni'])(
  '%s boosts direct-fire weapons without boosting missiles, ammo or miscellaneous mounts',
  (computer) => {
    const equipment = [
      { id: 'medium-laser', location: Arc.NOSE },
      { id: 'lrm-10', location: Arc.NOSE },
      { id: 'is-ammo-lrm-10', location: Arc.FUSELAGE },
      { id: 'machine-gun', location: Arc.NOSE },
      { id: 'ppc-capacitor', location: Arc.NOSE },
    ];
    const plain = calculateAerospaceOffensiveBV(
      input({ equipment, heatCapacity: undefined }),
    );
    const targeted = calculateAerospaceOffensiveBV(
      input({
        equipment: [...equipment, { id: computer, location: Arc.AFT }],
        heatCapacity: undefined,
      }),
    );
    expect(targeted.weaponFirePoolBV - plain.weaponFirePoolBV).toBe(11.5);
    expect(targeted.fuselageWeaponBV).toBe(plain.fuselageWeaponBV);
  },
);

it('sorts the TC-adjusted weapon value before spending the heat budget', () => {
  const result = calculateAerospaceOffensiveBV(
    input({
      heatCapacity: 4,
      equipment: [
        { id: 'ppc', location: Arc.NOSE },
        { id: 'lrm-20', location: Arc.NOSE },
        { id: 'istargeting-computer', location: Arc.FUSELAGE },
      ],
    }),
  );
  // The PPC crosses heat efficiency 10 at full BV; the missile follows at half.
  expect(result.weaponFirePoolBV).toBe(310.5);
});

it('uses TC-adjusted values to choose the dominant forward/rear group', () => {
  const result = calculateAerospaceOffensiveBV(
    input({
      heatCapacity: undefined,
      equipment: [
        { id: 'ppc', location: Arc.NOSE },
        { id: 'lrm-20', location: Arc.AFT },
        { id: 'istargeting-computer', location: Arc.FUSELAGE },
      ],
    }),
  );
  expect(result.primaryArc).toBe(Arc.NOSE);
  expect(result.weaponFirePoolBV).toBe(310.5);
});
