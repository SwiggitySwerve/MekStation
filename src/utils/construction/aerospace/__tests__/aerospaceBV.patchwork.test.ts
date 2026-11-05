import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import {
  calculateAerospaceDefensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

// MegaMek 48fcb2f64: BVCalculator.java:350-420.
// mm-data 50f7efef0c: fighters/XTRs/Boondocks/Sangihe Shrike-Thrush Nanook.blk.
const native: IContractBVSource = {
  id: 'native-nanook',
  unitType: 'Aerospace',
  techBase: 'MIXED',
  sourceTechType: 'Mixed (IS Chassis) Experimental',
  year: 3068,
  tonnage: 25,
  structuralIntegrity: 12,
  movement: { safeThrust: 12, maxThrust: 18 },
  heatSinks: { type: 'DOUBLE', count: 10 },
  armor: {
    type: 'PATCHWORK',
    byArc: { NOSE: 32, LEFT_WING: 20, RIGHT_WING: 20, AFT: 14 },
    typeByArc: { NOSE: 0, LEFT_WING: 3, RIGHT_WING: 3, AFT: 2 },
  },
  equipment: [
    ...['clmediumpulselaser', 'clmediumpulselaser'].map((id) => ({
      id,
      location: 'NOSE',
    })),
    { id: 'clermediumlaser', location: 'LEFT_WING' },
    { id: 'clermediumlaser', location: 'RIGHT_WING' },
    { id: 'small-laser', location: 'AFT' },
  ],
};
it('retains native per-arc armor codes through dispatch and matches Nanook', () => {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(native));
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown.armorBV).toBe(282.5);
  expect(result.breakdown.final).toBe(1571);
});
const input: IAerospaceBVInput = {
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  tonnage: 25,
  structuralIntegrity: 0,
  safeThrust: 0,
  maxThrust: 0,
  armorType: 'patchwork',
  totalArmorPoints: 20,
  armorByArc: { [Arc.NOSE]: 10, [Arc.AFT]: 10 },
  armorTypeByArc: { [Arc.NOSE]: 4, [Arc.AFT]: 0 },
  equipment: [],
};
it('uses upstream numeric codes rather than editor enum ordinals', () => {
  expect(calculateAerospaceDefensiveBV(input).armorBV).toBe(75);
});
it('adds modular capacity only at its physical arc before local multipliers and BAR', () => {
  const result = calculateAerospaceDefensiveBV({
    ...input,
    isSupportVehicle: true,
    barRating: 5,
    equipment: [{ id: 'ismodulararmor', location: Arc.NOSE }],
  });
  expect(result.armorBV).toBe(62.5);
});
it('retains the existing total-armor path without represented per-arc facts', () => {
  expect(
    calculateAerospaceDefensiveBV({ ...input, armorByArc: undefined }).armorBV,
  ).toBe(50);
});
it('counts modular capacity where the physical arc has no base armor entry', () => {
  const result = calculateAerospaceDefensiveBV({
    ...input,
    armorTypeByArc: { ...input.armorTypeByArc, [Arc.FUSELAGE]: 0 },
    equipment: [{ id: 'ismodulararmor', location: Arc.FUSELAGE }],
  });
  expect(result.armorBV).toBe(100);
});

it('ignores negative current armor at a represented location, matching Java', () => {
  expect(
    calculateAerospaceDefensiveBV({
      ...input,
      armorByArc: { [Arc.NOSE]: -4, [Arc.AFT]: 10 },
    }).armorBV,
  ).toBe(25);
});
it('consumes editor current armor allocation without restoring native points', () => {
  const editorUnit = {
    ...contractUnitToBVUnit(native),
    armorByArc: undefined,
    armorAllocation: { Nose: 10, 'Left Wing': 20, 'Right Wing': 20, Aft: 14 },
    armorTypeByArc: { NOSE: 0, LEFT_WING: 3, RIGHT_WING: 3, AFT: 2 },
  };
  const result = calculateBattleValueForUnit(editorUnit);
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown.armorBV).toBe(227.5);
});

it('preserves global armor for handler-shaped lowercase arc facts without patchwork codes', () => {
  const unit = {
    ...contractUnitToBVUnit(native),
    armorType: 'standard',
    armorTypeByArc: undefined,
    armorByArc: { nose: 32, leftWing: 20, rightWing: 20, aft: 14 },
  };
  const result = calculateBattleValueForUnit(unit);
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown.armorBV).toBe(215);
});

it('preserves the exact global armor multiplication order outside patchwork', () => {
  expect(
    calculateAerospaceDefensiveBV({
      ...input,
      armorType: 'ferro-lamellor',
      totalArmorPoints: 273,
      armorByArc: undefined,
      armorTypeByArc: undefined,
    }).armorBV,
  ).toBe(819);
});
