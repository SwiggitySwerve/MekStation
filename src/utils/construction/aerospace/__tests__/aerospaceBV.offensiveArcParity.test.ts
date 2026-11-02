import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import {
  initializeCatalog,
  resetCatalogCache,
} from '@/utils/construction/equipmentBV';

import { calculateAerospaceBV, type IAerospaceBVInput } from '../aerospaceBV';

/**
 * MegaMek 48fcb2f64: AeroBVCalculator.java:147-155;
 * BVCalculator.java:690-699,835-837. mm-data pin 50f7efef0.
 * @spec establish-all-unit-data-parity: Aerospace Offensive BV Arc Fire Pool
 */
describe('aerospace forward/rear weapon pool parity', () => {
  afterEach(resetCatalogCache);

  const base: IAerospaceBVInput = {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 25,
    structuralIntegrity: 11,
    safeThrust: 11,
    maxThrust: 17,
    armorType: 'standard',
    totalArmorPoints: 107,
    equipment: [],
  };

  it('Sabre SB-27b-EC counts all four native prototype lasers forward', () => {
    // Catalog boundary fixture only: this native prototype is still absent
    // from production data. CLERLaserMediumPrototype.java:63-80: heat 5, BV 62.
    initializeCatalog([
      {
        id: 'clermediumlaserprototype',
        name: 'Prototype ER Medium Laser (CP)',
        category: 'Energy',
        techBase: 'CLAN',
        battleValue: 62,
        heat: 5,
      },
    ]);
    const result = calculateAerospaceBV({
      ...base,
      equipment: [
        AerospaceArc.LEFT_WING,
        AerospaceArc.LEFT_WING,
        AerospaceArc.RIGHT_WING,
        AerospaceArc.RIGHT_WING,
      ].map((location) => ({
        id: 'clermediumlaserprototype',
        location,
      })),
    });
    expect(result.weaponFirePoolBV).toBe(248);
    expect(
      result.arcContributions.filter((c) => c.rawBV > 0).map((c) => c.weight),
    ).toEqual([1, 1]);
    // Isolate arcs: current speed remains 2.16. Java uses 2.58 => 639.84.
    expect(result.speedFactor).toBe(2.16);
    expect(result.offensive).toBeCloseTo(535.68, 8);
    expect(result.weaponFirePoolBV * 2.58).toBeCloseTo(639.84, 8);
  });

  it('Inseki II conventional fighter combines both wings and halves Aft', () => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'inseki-ii',
        unitType: 'Conventional Fighter',
        tonnage: 45,
        structuralIntegrity: 5,
        movement: { safeThrust: 5, maxThrust: 8 },
        armor: {
          type: 'STANDARD',
          byArc: { NOSE: 12, LEFT_WING: 10, RIGHT_WING: 10, AFT: 8 },
        },
        equipment: [
          { id: 'ppc', location: 'NOSE' },
          { id: 'lrm-10', location: 'LEFT_WING' },
          { id: 'lrm-10', location: 'RIGHT_WING' },
          { id: 'machine-gun', location: 'AFT' },
          { id: 'is-ammo-lrm-10', location: 'FUSELAGE' },
          { id: 'is-ammo-lrm-10', location: 'FUSELAGE' },
          { id: 'is-machine-gun-ammo-half', location: 'FUSELAGE' },
        ],
      }),
    );
    if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
    expect(result.breakdown.weaponFirePoolBV).toBe(176 + 90 + 90 + 5 * 0.5);
    expect(result.breakdown.fuselageWeaponBV).toBe(22);
    expect(result.breakdown.offensive).toBeCloseTo(448.99, 8);
    // Native offense 521.97 includes different speed/ammo; do not claim parity.
    expect(result.breakdown.speedFactor).toBe(1.18);
  });

  it.each([
    [
      AerospaceSubType.AEROSPACE_FIGHTER,
      AerospaceArc.LEFT_WING,
      AerospaceArc.RIGHT_WING,
    ],
    [
      AerospaceSubType.CONVENTIONAL_FIGHTER,
      AerospaceArc.LEFT_WING,
      AerospaceArc.RIGHT_WING,
    ],
    [
      AerospaceSubType.SMALL_CRAFT,
      AerospaceArc.LEFT_SIDE,
      AerospaceArc.RIGHT_SIDE,
    ],
  ] as const)(
    '%s compares the combined forward group before switching',
    (subType, left, right) => {
      const result = calculateAerospaceBV({
        ...base,
        subType,
        equipment: [
          { id: 'medium-laser', location: left },
          { id: 'medium-laser', location: right },
          { id: 'medium-laser', location: AerospaceArc.AFT },
        ],
      });
      expect(result.weaponFirePoolBV).toBe(115);
      expect(result.primaryArc).toBe(left);
      expect(
        result.arcContributions.find((c) => c.arc === AerospaceArc.AFT)?.weight,
      ).toBe(0.5);
    },
  );

  it('switches to a stronger rear group, including Fuselage in forward BV', () => {
    const result = calculateAerospaceBV({
      ...base,
      equipment: [
        { id: 'medium-laser', location: AerospaceArc.NOSE },
        { id: 'medium-laser', location: AerospaceArc.FUSELAGE },
        { id: 'ppc', location: AerospaceArc.AFT },
      ],
    });
    expect(result.primaryArc).toBe(AerospaceArc.AFT);
    expect(result.weaponFirePoolBV).toBe(176 + 23);
    expect(result.fuselageWeaponBV).toBe(23);
  });

  it('keeps the forward group at full value on a tie, including Fuselage', () => {
    const result = calculateAerospaceBV({
      ...base,
      equipment: [
        { id: 'medium-laser', location: AerospaceArc.FUSELAGE },
        { id: 'medium-laser', location: AerospaceArc.AFT },
      ],
    });
    expect(result.primaryArc).toBe(AerospaceArc.FUSELAGE);
    expect(result.weaponFirePoolBV).toBe(23);
    expect(result.fuselageWeaponBV).toBe(46);
  });

  it('keeps empty pools empty and ignores unknown locations', () => {
    const result = calculateAerospaceBV({
      ...base,
      equipment: [{ id: 'medium-laser', location: 'Unknown' }],
    });
    expect(result.primaryArc).toBeNull();
    expect(result.weaponFirePoolBV).toBe(0);
    expect(result.arcContributions.every((c) => c.weight === 0)).toBe(true);
  });
});
