import {
  AerospaceCockpitType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceBV, type IAerospaceBVInput } from '../aerospaceBV';

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// AeroBVCalculator.java:162-180; BVCalculator.java:1159-1182.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985:
// fighters/ProtoTypes/Cheetah OF-17A-R.blk, Java BV 310.
const cheetah: IContractBVSource = {
  id: 'cheetah-of-17a-r',
  unitType: 'Aerospace',
  subType: 'AerospaceFighter',
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 4',
  year: 3080,
  tonnage: 25,
  structuralIntegrity: 12,
  cockpit: 'SMALL',
  movement: { safeThrust: 12, maxThrust: 18 },
  heatSinks: { type: 'SINGLE', count: 10 },
  armor: {
    type: 'STEALTH',
    byArc: { NOSE: 11, LEFT_WING: 11, RIGHT_WING: 11, AFT: 7 },
  },
  equipment: [
    { id: 'isguardianecmsuite', location: 'NOSE' },
    { id: 'ishypersprectralimager', location: 'NOSE' },
    { id: 'is-vehicular-stealth', location: 'AFT' },
    { id: 'small-laser', location: 'AFT' },
    { id: 'small-laser', location: 'AFT' },
  ],
};

it('retains the native small cockpit through contract dispatch and matches Cheetah', () => {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(cheetah));
  if (result?.kind !== 'aerospace') throw new Error('Expected aircraft BV');
  expect(result.breakdown.final).toBe(310);
});

it('accepts the editor small-cockpit enum through unit dispatch', () => {
  const unit = contractUnitToBVUnit(cheetah);
  if (unit.unitType !== 'Aerospace') throw new Error('Expected aircraft');
  const editorUnit = {
    ...unit,
    cockpit: undefined,
    cockpitType: AerospaceCockpitType.SMALL,
  };
  const result = calculateBattleValueForUnit(editorUnit);
  if (result?.kind !== 'aerospace') throw new Error('Expected aircraft BV');
  expect(result.breakdown.final).toBe(310);
});

it.each(['STANDARD', 'PRIMITIVE', undefined])(
  'preserves the %s cockpit path',
  (cockpit) => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({ ...cheetah, cockpit }),
    );
    if (result?.kind !== 'aerospace') throw new Error('Expected aircraft BV');
    expect(result.breakdown.final).toBe(326);
  },
);

it('rounds the small-cockpit base before pilot adjustment, leaving both pools unscaled', () => {
  const input: IAerospaceBVInput = {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 25,
    structuralIntegrity: 0,
    safeThrust: 0,
    maxThrust: 0,
    armorType: 'standard',
    totalArmorPoints: 5,
    equipment: [],
    hasSmallCockpit: true,
    pilotGunnery: 3,
    pilotPiloting: 4,
  };
  const result = calculateAerospaceBV(input);
  expect(result.defensive).toBe(15);
  expect(result.offensive).toBe(0);
  expect(result.final).toBe(18); // round(15 * .95) = 14, then round(14 * 1.32).
});
