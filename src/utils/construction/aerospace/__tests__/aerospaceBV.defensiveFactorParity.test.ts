import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceDefensiveBV } from '../aerospaceBV';

/**
 * MegaMek 48fcb2f64, AeroBVCalculator.java:137-138: no defensive thrust factor.
 * Aircraft type scaling is a separate Java stage and a later parity term.
 * @spec establish-all-unit-data-parity: Aerospace Defensive Thrust Factor
 */
describe('aerospace defensive thrust factor parity', () => {
  it('Boeing Jump Bomber (Java total 64) has no defensive thrust multiplier', () => {
    // Pinned mm-data convfighter/3039u/Boeing Jump Bomber.blk.
    // Assert this term: remaining aircraft type terms prevent total parity.
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'boeing-jump-bomber',
        unitType: 'Conventional Fighter',
        tonnage: 20,
        structuralIntegrity: 9,
        movement: { safeThrust: 9, maxThrust: 14 },
        armor: {
          type: 'STANDARD',
          byArc: { NOSE: 7, LEFT_WING: 3, RIGHT_WING: 3, AFT: 3 },
        },
        equipment: [],
      }),
    );
    expect(result?.kind).toBe('aerospace');
    if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
    expect(result.breakdown.defensiveFactor).toBe(1);
    expect(result.breakdown.armorBV).toBe(40);
    expect(result.breakdown.siBV).toBe(18);
    expect(result.breakdown.defensive).toBe(58);
  });

  it.each(Object.values(AerospaceSubType))(
    '%s keeps the defensive pool independent of maximum thrust',
    (subType) => {
      const input = {
        subType,
        tonnage: 25,
        structuralIntegrity: 11,
        safeThrust: 11,
        maxThrust: 17,
        totalArmorPoints: 107,
        armorType: 'standard',
        equipment: [],
        defensiveEquipmentBV: 10,
        explosivePenalties: 5,
      };
      const fast = calculateAerospaceDefensiveBV(input);
      const slow = calculateAerospaceDefensiveBV({ ...input, maxThrust: 2 });
      expect(fast.defensiveFactor).toBe(1);
      expect(fast).toEqual(slow);
      expect(fast.defensive).toBe(
        fast.armorBV +
          fast.siBV +
          fast.defensiveEquipmentBV -
          fast.explosivePenalties,
      );
    },
  );
});
