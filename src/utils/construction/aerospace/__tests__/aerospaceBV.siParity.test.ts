import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceDefensiveBV } from '../aerospaceBV';

/**
 * MegaMek 48fcb2f64, AeroBVCalculator.java:64-70: SI contributes twice its value.
 * All four families use that calculator (BVCalculator.java:103-118).
 * @spec establish-all-unit-data-parity: Aerospace Structural Integrity BV
 */
describe('aerospace structural integrity BV parity', () => {
  // Pinned mm-data inputs; weapons omitted to isolate SI, not total-unit BV.
  it.each([
    [
      'Boeing Jump Bomber (Java total 64)',
      'Conventional Fighter',
      20,
      9,
      9,
      14,
      18,
    ],
    ['Sabre SB-27b-EC (Java total 987)', 'Aerospace', 25, 11, 11, 17, 22],
    [
      'Mosquito Light Fighter (Java total 111)',
      'Conventional Fighter',
      20,
      6,
      6,
      9,
      12,
    ],
    [
      'Dragonstar Assault Transport (3060) (Java total 1175)',
      'Small Craft',
      150,
      6,
      5,
      8,
      12,
    ],
  ] as const)(
    '%s uses the pinned Java SI valuation',
    (
      name,
      unitType,
      tonnage,
      structuralIntegrity,
      safeThrust,
      maxThrust,
      siBV,
    ) => {
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          id: name,
          unitType,
          tonnage,
          structuralIntegrity,
          movement: { safeThrust, maxThrust },
          armor: { type: 'STANDARD', byArc: {} },
          equipment: [],
        }),
      );
      expect(result?.kind).toBe('aerospace');
      if (result?.kind !== 'aerospace')
        throw new Error('Expected aerospace BV');
      expect(result.breakdown.siBV).toBe(siBV);
    },
  );

  it.each(Object.values(AerospaceSubType))(
    '%s values SI independently of tonnage',
    (subType) => {
      const input = {
        subType,
        tonnage: 25,
        structuralIntegrity: 11,
        safeThrust: 11,
        maxThrust: 17,
        totalArmorPoints: 100,
        armorType: 'standard',
        equipment: [],
        defensiveEquipmentBV: 10,
        explosivePenalties: 5,
      };
      const light = calculateAerospaceDefensiveBV(input);
      const heavy = calculateAerospaceDefensiveBV({ ...input, tonnage: 100 });
      expect(light.siBV).toBe(22);
      expect(heavy).toEqual(light);
      expect(light.defensive).toBe(light.armorBV + 22 + 10 - 5);
    },
  );
});
