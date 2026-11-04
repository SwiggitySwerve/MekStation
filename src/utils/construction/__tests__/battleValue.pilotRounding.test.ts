import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { UnitContract } from '@/types/contracts';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { calculateBattleValueForUnit } from '../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../contractBVUnitAdapter';

// MegaMek 48fcb2f64 BVCalculator.java:1253 rounds base before skill; :167 rounds final.
describe('vehicle and aerospace pilot BV rounding', () => {
  it.each([
    ['vehicles:weapons-carrier-a-ll', 297, 392],
    ['vehicles:ground-car', 33, 44],
    ['aerospace:guardian-fighter-b', 126, 166],
    ['aerospace:light-strike-fighter-owl-iii', 329, 434],
  ] as const)(
    '%s rounds before and after the 3/4 skill multiplier',
    (id, base, adjusted) => {
      const unit = UnitContract.parse(
        getNodeCanonicalUnitService().getByIdSync(id),
      );
      if (
        unit.unitType !== UnitType.VEHICLE &&
        unit.unitType !== UnitType.AEROSPACE &&
        unit.unitType !== UnitType.CONVENTIONAL_FIGHTER
      )
        throw new Error('Expected vehicle or fighter source');
      if (unit.tonnage === undefined || !unit.movement || !unit.armor)
        throw new Error('Missing fixture facts');
      const projected = contractUnitToBVUnit({
        ...unit,
        tonnage: unit.tonnage,
        armor: unit.armor,
        movement: unit.movement as IContractBVSource['movement'],
      });
      expect(calculateBattleValueForUnit(projected)?.breakdown.final).toBe(
        base,
      );
      expect(
        calculateBattleValueForUnit(projected, { gunnery: 3, piloting: 4 })
          ?.breakdown.final,
      ).toBe(adjusted);
    },
  );
});
