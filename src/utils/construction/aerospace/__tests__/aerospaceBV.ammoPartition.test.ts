import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import {
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

// Java 48fcb2f64: BVCalculator.java:936-963,1045-1091,1190-1247.
// mm-data 50f7efef0c: convfighter/ProtoTypes/Planetlifter Tactical Support.blk.
const native: IContractBVSource = {
  id: 'native-planetlifter',
  unitType: UnitType.CONVENTIONAL_FIGHTER,
  sourceTechType: 'IS Level 3',
  techBase: 'INNER_SPHERE',
  year: 3082,
  tonnage: 50,
  structuralIntegrity: 5,
  movement: { safeThrust: 4, maxThrust: 6 },
  heatSinks: { type: 'SINGLE', count: 0 },
  armor: {
    type: 'STEALTH',
    byArc: { NOSE: 12, LEFT_WING: 12, RIGHT_WING: 12, AFT: 12 },
  },
  equipment: [
    ...[
      'isangelecmsuite',
      'islookdownradar',
      'istankcockpitcommandconsole',
    ].map((id) => ({ id, location: 'NOSE' })),
    ...['is-vehicular-stealth', 'isarrowiv'].map((id) => ({
      id,
      location: 'AFT',
    })),
    ...['isarrowivammo', 'isarrowivammo'].map((id) => ({
      id,
      location: 'FUSELAGE',
    })),
  ],
};
it('matches native Planetlifter with full ammo value outside rear weighting', () => {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(native));
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown).toMatchObject({
    weaponFirePoolBV: 240,
    fuselageWeaponBV: 0,
    ammoBV: 60,
    final: 637,
  });
});
const input = (ammoBV: number): IAerospaceBVInput => ({
  subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
  tonnage: 20,
  structuralIntegrity: 0,
  safeThrust: 0,
  maxThrust: 0,
  armorType: 'standard',
  totalArmorPoints: 0,
  equipment: [
    { id: 'srm-2', location: Arc.AFT },
    { id: 'is-ammo-srm-2', location: Arc.NOSE },
  ],
  ammo: [{ id: 'is-ammo-srm-2', weaponType: 'srm-2', bv: ammoBV }],
});
it('separates explicit bins without counting them twice or changing direction', () => {
  const result = calculateAerospaceOffensiveBV(input(3));
  expect(result).toMatchObject({
    weaponFirePoolBV: 21,
    primaryArc: Arc.AFT,
    ammoBV: 3,
  });
});
it('caps native ammo by matching launcher type and rack', () => {
  expect(calculateAerospaceOffensiveBV(input(100)).ammoBV).toBe(21);
  expect(
    calculateAerospaceOffensiveBV({
      ...input(3),
      ammo: [{ id: 'is-ammo-lrm-10', weaponType: 'lrm-10', bv: 20 }],
    }).ammoBV,
  ).toBe(0);
});
it('preserves the legacy flat-input path when a separate ammo list is absent', () => {
  const result = calculateAerospaceOffensiveBV({
    ...input(3),
    ammo: undefined,
  });
  expect(result.weaponFirePoolBV).toBe(22.5);
  expect(result.fuselageWeaponBV).toBe(0);
  expect(result.ammoBV).toBe(0);
});
