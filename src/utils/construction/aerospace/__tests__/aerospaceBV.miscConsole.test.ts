import {
  AerospaceArc as Arc,
  AerospaceCockpitType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import {
  calculateAerospaceBV,
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

// Java 48fcb2f64: BVCalculator.java:990-1038; AeroBVCalculator.java:162-180.
// mm-data 50f7efef0c: fighters/XTRs/Gunslingers/Hellcat II HCT-213BC (Herman).blk.
const hellcat: IContractBVSource = {
  id: 'native-hellcat',
  unitType: 'Aerospace',
  subType: 'AerospaceFighter',
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 3',
  year: 2774,
  tonnage: 50,
  structuralIntegrity: 7,
  cockpit: 'COMMAND_CONSOLE',
  movement: { safeThrust: 7, maxThrust: 11 },
  heatSinks: { type: 'SINGLE', count: 10 },
  armor: {
    type: 'FERRO_ALUMINUM',
    byArc: { NOSE: 20, LEFT_WING: 20, RIGHT_WING: 20, AFT: 20 },
  },
  equipment: [
    { id: 'medium-laser', location: 'NOSE' },
    { id: 'medium-laser', location: 'NOSE' },
    { id: 'isspaceminedispenser', location: 'AFT' },
    { id: 'isspaceminedispenser', location: 'AFT' },
  ],
};
it('matches native Hellcat with both equipment partition and console summary', () => {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(hellcat));
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown).toMatchObject({
    weaponFirePoolBV: 92,
    offensiveEquipmentBV: 400,
    final: 1067,
  });
  expect(result.breakdown.offensive).toBeCloseTo(865.92, 8);
});
it('accepts the editor console enum', () => {
  const editorUnit = {
    ...contractUnitToBVUnit(hellcat),
    cockpit: undefined,
    cockpitType: AerospaceCockpitType.COMMAND_CONSOLE,
  };
  const result = calculateBattleValueForUnit(editorUnit);
  if (result?.kind !== 'aerospace') throw Error('Expected aircraft');
  expect(result.breakdown.final).toBe(1067);
});
const input = (
  ids: string[],
  overrides: Partial<IAerospaceBVInput> = {},
): IAerospaceBVInput => ({
  subType: AerospaceSubType.SMALL_CRAFT,
  tonnage: 140,
  structuralIntegrity: 8,
  safeThrust: 5,
  maxThrust: 8,
  heatCapacity: 10,
  armorType: 'ferro-aluminum',
  totalArmorPoints: 247,
  equipment: ids.map((id) => ({ id, location: Arc.AFT })),
  ...overrides,
});
it('matches native Zhen Niao without mines changing weapon direction', () => {
  const result = calculateAerospaceBV(
    input(['isermediumlaser', 'isermediumlaser'], {
      equipment: [
        { id: 'isermediumlaser', location: Arc.AFT },
        { id: 'isermediumlaser', location: Arc.AFT },
        ...[
          'beagleactiveprobe',
          'isguardianecmsuite',
          'ishypersprectralimager',
          'isspaceminedispenser',
        ].map((id) => ({ id, location: Arc.FUSELAGE })),
      ],
    }),
  );
  expect(result).toMatchObject({
    weaponFirePoolBV: 124,
    fuselageWeaponBV: 0,
    offensiveEquipmentBV: 200,
    final: 1148,
  });
});
it('honors explicit offensive equipment overrides without retaining automatic arc BV', () => {
  const result = calculateAerospaceOffensiveBV(
    input(['medium-laser', 'isspaceminedispenser'], {
      offensiveEquipmentBV: 17,
    }),
  );
  expect(result).toMatchObject({
    weaponFirePoolBV: 46,
    offensiveEquipmentBV: 17,
  });
});
it('retains Apollo and TC as controller input facts', () => {
  expect(
    calculateAerospaceOffensiveBV(input(['mrm-10', 'apollo'])).weaponFirePoolBV,
  ).toBeCloseTo(64.4, 8);
  expect(
    calculateAerospaceOffensiveBV(
      input(['medium-laser', 'istargeting-computer']),
    ).weaponFirePoolBV,
  ).toBe(57.5);
});
it('retains physical MG ammunition in its existing path before the ammo class', () => {
  const result = calculateAerospaceOffensiveBV(
    input(['clmg', 'clan-machine-gun-ammo-full']),
  );
  expect(result.offensiveEquipmentBV).toBe(0);
  expect(result.weaponFirePoolBV).toBe(6);
});
it('reports actual small-cockpit summary facts without altering either aggregate', () => {
  const result = calculateAerospaceBV(input([], { hasSmallCockpit: true }));
  expect(result).toMatchObject({
    subTypeMultiplier: 1,
    summaryModifier: 0.95,
    adjustment: 0,
  });
});
