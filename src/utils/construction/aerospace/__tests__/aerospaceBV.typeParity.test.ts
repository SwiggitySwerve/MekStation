import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceDefensiveBV } from '../aerospaceBV';

/**
 * MegaMek 48fcb2f64, AeroBVCalculator.java:118-134 and Entity.java:16132-16136.
 * @spec establish-all-unit-data-parity: Aerospace Defensive BV
 */
describe('aerospace aircraft type defensive modifier', () => {
  it.each([
    ['Sabre SB-27b-EC', 'Aerospace', 'AerospaceFighter', 25, 11, 107, 347.4],
    [
      'Boeing Jump Bomber',
      'Conventional Fighter',
      'ConventionalFighter',
      20,
      9,
      16,
      63.8,
    ],
    [
      'Boomerang Spotter Plane',
      'Conventional Fighter',
      'FixedWingSupport',
      4.999,
      4,
      0,
      8,
    ],
  ] as const)(
    '%s has the pinned Java defensive value through contract dispatch',
    (id, unitType, subType, tonnage, structuralIntegrity, armor, defense) => {
      // Pinned mm-data values; no weapons needed to assert the defensive term.
      const source = {
        id,
        unitType,
        subType,
        tonnage,
        structuralIntegrity,
        movement: { safeThrust: 9, maxThrust: 14 },
        armor: { type: 'STANDARD', byArc: { NOSE: armor } },
        equipment: [],
      };
      const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
      if (result?.kind !== 'aerospace')
        throw new Error('Expected aerospace BV');
      expect(result.breakdown.defensive).toBeCloseTo(defense, 10);
      expect(result.breakdown.defensiveFactor).toBe(1);
    },
  );

  it('Saroyan Jump Bomber applies stealth to its armor and SI pool', () => {
    // Pinned convfighter/3145/Liao/Saroyan Jump Bomber.blk: vehicle stealth
    // armor code 22, 24 points, SI 8. Java defense 191.8 also includes 61 BV
    // of defensive equipment, which this contract adapter does not yet value.
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'saroyan-jump-bomber',
        unitType: 'Conventional Fighter',
        tonnage: 25,
        structuralIntegrity: 8,
        movement: { safeThrust: 8, maxThrust: 12 },
        armor: {
          type: 'STEALTH',
          byArc: { NOSE: 8, LEFT_WING: 6, RIGHT_WING: 6, AFT: 4 },
        },
        equipment: [],
      }),
    );
    if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
    expect(result.breakdown.defensive).toBeCloseTo(106.4, 10);
  });

  // Synthetic cases cover every Java classification, both stealth keys and patchwork.
  it.each([
    [AerospaceSubType.AEROSPACE_FIGHTER, false, 'standard', 1.2],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, false, 'standard', 1.1],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, true, 'standard', 1],
    [AerospaceSubType.SMALL_CRAFT, false, 'standard', 1],
    [AerospaceSubType.AEROSPACE_FIGHTER, false, 'stealth', 1.5],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, false, 'stealth', 1.4],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, false, 'stealth-vehicle', 1.4],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, true, 'stealth', 1.3],
    [AerospaceSubType.SMALL_CRAFT, false, 'stealth', 1.3],
    [AerospaceSubType.AEROSPACE_FIGHTER, false, 'patchwork', 1.2],
  ] as const)(
    '%s support=%s armor=%s scales the entire defensive pool by %s',
    (subType, isSupportVehicle, armorType, modifier) => {
      const input = {
        subType,
        isSupportVehicle,
        armorType,
        tonnage: 50,
        structuralIntegrity: 5,
        safeThrust: 5,
        maxThrust: 8,
        totalArmorPoints: 40,
        equipment: [],
        defensiveEquipmentBV: 20,
        explosivePenalties: 5,
      };
      const result = calculateAerospaceDefensiveBV(input);
      const armorBV = subType === AerospaceSubType.SMALL_CRAFT ? 120 : 100;
      expect(result.armorBV).toBe(armorBV);
      expect(result.siBV).toBe(10);
      expect(result.defensive).toBeCloseTo(
        (armorBV + 10 + 20 - 5) * modifier,
        10,
      );
    },
  );

  it('preserves stealth armor through the contract adapter', () => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'synthetic-stealth-asf',
        unitType: 'Aerospace',
        tonnage: 50,
        structuralIntegrity: 5,
        movement: { safeThrust: 5, maxThrust: 8 },
        armor: { type: 'STEALTH', byArc: { NOSE: 40 } },
        equipment: [],
      }),
    );
    if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
    expect(result.breakdown.defensive).toBe(165);
  });
});
