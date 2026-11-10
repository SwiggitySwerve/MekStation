import { EngineType } from '@/types/construction/EngineType';

import {
  cockpitTons,
  heatSinkExtraTons,
  aerospaceEngineTons,
  type AerospaceEngineTonsInput,
} from '../sourceWeight';

describe('source mass helpers', () => {
  it('retains standard and unknown cockpit defaults', () => {
    expect(cockpitTons('Standard')).toBe(3);
    expect(cockpitTons('UnknownCockpit')).toBe(3);
  });

  it('retains the existing cockpit masses', () => {
    expect(cockpitTons('Small')).toBe(2);
    expect(cockpitTons('Primitive')).toBe(5);
    expect(cockpitTons('Command Console')).toBe(6);
  });

  it('retains the ten free heat sinks', () => {
    expect(heatSinkExtraTons(5)).toBe(0);
    expect(heatSinkExtraTons(10)).toBe(0);
  });

  it('retains one ton per additional heat sink', () => {
    expect(heatSinkExtraTons(11)).toBe(1);
    expect(heatSinkExtraTons(20)).toBe(10);
  });
});

// New test expectations transcribed from Engine.java:67-81 at 48fcb2f64.
const pinnedFusionTons = [
  0.5, 0.5, 0.5, 0.5, 1.0, 1.0, 1.0, 1.0, 1.5, 1.5, 1.5, 2.0, 2.0, 2.0, 2.5,
  2.5, 3.0, 3.0, 3.0, 3.5, 3.5, 4.0, 4.0, 4.0, 4.5, 4.5, 5.0, 5.0, 5.5, 5.5,
  6.0, 6.0, 6.0, 7.0, 7.0, 7.5, 7.5, 8.0, 8.5, 8.5, 9.0, 9.5, 10.0, 10.0, 10.5,
  11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.5, 16.0, 16.5, 17.5, 18.0,
  19.0, 19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5, 27.0, 28.5, 29.5, 31.5, 33.0,
  34.5, 36.5, 38.5, 41.0, 43.5, 46.0, 49.0, 52.5, 56.5, 61.0, 66.5, 72.5, 79.5,
  87.5, 97.0, 107.5, 119.5, 133.5, 150.0, 168.5, 190.0, 214.5, 243.0, 275.5,
  313.0, 356.0, 405.5, 462.5,
];

describe('aerospaceEngineTons (MegaMek 48fcb2f64)', () => {
  const fighter = (
    tonnage: number,
    engineType = EngineType.STANDARD,
    safeThrust = 3,
    primitiveCockpit = false,
  ): Extract<AerospaceEngineTonsInput, { family: 'aerospaceFighter' }> => ({
    family: 'aerospaceFighter',
    tonnage,
    safeThrust,
    engineType,
    primitiveCockpit,
  });

  it.each(pinnedFusionTons.map((tons, index) => [10 + index * 5, tons]))(
    'rating %i has Java fusion mass %s t',
    (rating, tons) => {
      expect(aerospaceEngineTons(fighter(rating))).toBe(tons);
    },
  );

  // Engine.java:409-438: type adjustment followed by upward half-ton rounding.
  it.each([
    [EngineType.STANDARD, 9.5],
    [EngineType.XL_IS, 5],
    [EngineType.XL_CLAN, 5],
    [EngineType.LIGHT, 7.5],
    [EngineType.XXL, 3.5],
    [EngineType.COMPACT, 14.5],
    [EngineType.ICE, 19],
    [EngineType.FUEL_CELL, 11.5],
  ] as const)('rating 215, %s weighs %s t', (type, tons) => {
    expect(aerospaceEngineTons(fighter(215, type))).toBe(tons);
  });

  // TestAero.java:369-387; BLKAeroSpaceFighterFile.java:133-145.
  it.each([
    [65, 6, false, 13.5],
    [45, 5, true, 6],
    [30, 8, true, 10],
    [45, 5, false, 4.5],
  ] as const)(
    'T%s/S%s primitive=%s uses the native thrust/rating rule',
    (tons, thrust, primitive, mass) => {
      expect(
        aerospaceEngineTons(
          fighter(tons, EngineType.STANDARD, thrust, primitive),
        ),
      ).toBe(mass);
    },
  );

  // BLKConvFighterFile.java:118-122; TestAero.java:510-519.
  it.each([
    [EngineType.STANDARD, 28.5],
    [EngineType.ICE, 38],
    [EngineType.XL_IS, 14.5],
  ] as const)(
    'conventional %s includes native installation shielding',
    (engineType, tons) => {
      expect(
        aerospaceEngineTons({
          family: 'conventionalFighter',
          tonnage: 50,
          safeThrust: 6,
          engineType,
        }),
      ).toBe(tons);
    },
  );

  // TestSmallCraft.java:198-208,236-253,373-378.
  it.each([
    [2500, false, 26],
    [2499, false, 31.5],
    [2500, true, 24.5],
    [2400, false, 31.5],
    [2399, false, 36.5],
  ] as const)(
    'small craft year %s Clan=%s weighs %s t',
    (originalBuildYear, clan, tons) => {
      expect(
        aerospaceEngineTons({
          family: 'smallCraft',
          tonnage: 100,
          safeThrust: 4,
          originalBuildYear,
          clan,
        }),
      ).toBe(tons);
    },
  );

  it('preserves the modern DropShip engine branch', () => {
    expect(
      aerospaceEngineTons({
        family: 'dropShip',
        tonnage: 1000,
        safeThrust: 4,
        originalBuildYear: 3000,
        clan: false,
      }),
    ).toBe(260);
    expect(
      aerospaceEngineTons({
        family: 'dropShip',
        tonnage: 1000,
        safeThrust: 4,
        originalBuildYear: 3000,
        clan: true,
      }),
    ).toBe(244);
  });

  it.each([0, 5, 505, -5, NaN, Infinity])(
    'rating %s is explicitly unsupported',
    (rating) => {
      expect(aerospaceEngineTons(fighter(rating))).toBeUndefined();
    },
  );

  it('does not invent a fixed-wing support engine mass', () => {
    expect(aerospaceEngineTons({ family: 'fixedWingSupport' })).toBeUndefined();
  });

  it('does not treat absent or unknown engines as standard fusion', () => {
    expect(
      aerospaceEngineTons({ ...fighter(100), engineType: null }),
    ).toBeUndefined();
    const unknown = fighter(100);
    Reflect.set(unknown, 'engineType', 'unrecognized');
    expect(aerospaceEngineTons(unknown)).toBeUndefined();
  });

  it.each([-1, NaN, Infinity, 1.5])(
    'invalid safe thrust %s is unsupported',
    (safeThrust) => {
      expect(
        aerospaceEngineTons(fighter(50, EngineType.STANDARD, safeThrust)),
      ).toBeUndefined();
    },
  );
});
