import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import { calculateHeatTrackedWeapons } from '../../battleValueHeatTracking';
import { calculateAerospaceBV } from '../aerospaceBV';

// MegaMek 48fcb2f64, BVCalculator.java:461-463: ordinary armor is 2.5 BV/point.
// Pinned mm-data SmallCraft values; weapons omitted to isolate defensive armor.
describe('SmallCraft armor residuals', () => {
  it.each([
    ['Ares Attack Craft Mark IX', 476, 11, 1190, 1212],
    ['Zhen Niao', 247, 8, 617.5, 633.5],
    ['Wurger Assault Craft', 412, 9, 1030, 1048],
    ['Mowang Courier', 64, 6, 160, 172],
    ['S7-P Scarab', 160, 6, 400, 412],
  ] as const)(
    '%s uses the inherited armor factor',
    (id, armor, si, armorBV, defense) => {
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          id,
          unitType: 'Small Craft',
          tonnage: 200,
          structuralIntegrity: si,
          movement: { safeThrust: 4, maxThrust: 6 },
          armor: { type: 'AEROSPACE', byArc: { NOSE: armor } },
          equipment: [],
        }),
      );
      if (result?.kind !== 'aerospace')
        throw new Error('Expected aerospace BV');
      expect(result.breakdown.armorBV).toBe(armorBV);
      expect(result.breakdown.defensive).toBe(defense);
    },
  );
});

const CASES = [
  [
    'MM-1 Dragonfly',
    'Aerospace',
    18,
    [
      ['medium-laser', 'NOSE'],
      ['large-laser', 'LEFT_WING'],
      ['medium-laser', 'LEFT_WING'],
      ['medium-laser', 'LEFT_WING'],
      ['large-laser', 'RIGHT_WING'],
      ['medium-laser', 'RIGHT_WING'],
      ['medium-laser', 'RIGHT_WING'],
    ],
    430,
  ],
  [
    'Goth B',
    'Aerospace',
    21,
    [
      ['clactiveprobe:omni', 'NOSE'],
      ['cllargepulselaser:omni', 'LEFT_WING'],
      ['clerlargelaser:omni', 'LEFT_WING'],
      ['cllargepulselaser:omni', 'RIGHT_WING'],
      ['clerlargelaser:omni', 'RIGHT_WING'],
    ],
    902,
  ],
  [
    'Dragonstar Assault Transport (3060)',
    'Small Craft',
    20,
    [
      ['islargepulselaser', 'NOSE'],
      ['isermediumlaser', 'NOSE'],
      ['ismediumpulselaser', 'LEFT_SIDE'],
      ['ismediumpulselaser', 'RIGHT_SIDE'],
      ['isermediumlaser', 'AFT'],
      ['isermediumlaser', 'AFT'],
    ],
    323.5,
  ],
] as const;

function aircraft(
  index: number,
  type = 'SINGLE',
  count: number = CASES[index][2],
) {
  const [id, unitType, , equipment] = CASES[index];
  return {
    id,
    unitType,
    tonnage: 100,
    structuralIntegrity: 5,
    movement: { safeThrust: 5, maxThrust: 8 },
    armor: { type: 'STANDARD', byArc: { NOSE: 0 } },
    heatSinks: { type, count },
    equipment: equipment.map(([id, location]) => ({ id, location })),
  };
}
function pool(source: IContractBVSource) {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
  if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
  return result.breakdown.weaponFirePoolBV + result.breakdown.fuselageWeaponBV;
}

// AeroBVCalculator.java:141-144; HeatTrackingBVCalculator.java:59-61,108-147.
describe('aircraft heat residuals', () => {
  it.each([0, 1, 2])(
    'fixture %s has the pinned Java heat-limited weapon pool',
    (index) => {
      expect(pool(aircraft(index))).toBe(CASES[index][4]);
    },
  );
  it.each(['ConventionalFighter', 'FixedWingSupport'])(
    '%s bypasses heat even with zero sinks',
    (subType) => {
      expect(
        pool({
          ...aircraft(0, 'SINGLE', 0),
          unitType: 'Conventional Fighter',
          subType,
        }),
      ).toBe(476);
    },
  );
  it('doubles cooling for double sinks', () => {
    expect(pool(aircraft(0, 'DOUBLE', 18))).toBe(476);
  });
  it('sorts after arc weighting and shares the heat budget with fuselage', () => {
    const input = {
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      tonnage: 50,
      structuralIntegrity: 5,
      safeThrust: 5,
      maxThrust: 8,
      armorType: 'standard',
      totalArmorPoints: 0,
      heatCapacity: 0,
      equipment: [
        { id: 'large-laser', location: 'Nose' },
        { id: 'medium-laser', location: 'Left Wing' },
        { id: 'medium-laser', location: 'Fuselage' },
        { id: 'ppc', location: 'Aft' },
      ],
    };
    const result = calculateAerospaceBV(input);
    expect(result.weaponFirePoolBV + result.fuselageWeaponBV).toBe(213);
    expect(result.fuselageWeaponBV).toBe(23);
    expect(result.arcContributions.find((a) => a.arc === 'Aft')?.rawBV).toBe(
      176,
    );
    const legacy = calculateAerospaceBV({ ...input, heatCapacity: undefined });
    expect(legacy.weaponFirePoolBV + legacy.fuselageWeaponBV).toBe(303);
  });
  it('orders zero heat first, then BV and lower heat; crossing stays full', () => {
    const rows = calculateHeatTrackedWeapons(
      [
        { bv: 100, heat: 8 },
        { bv: 100, heat: 3 },
        { bv: 80, heat: 1 },
        { bv: 10, heat: 0 },
      ],
      6,
    );
    expect(rows.map((r) => [r.weapon.heat, r.adjustedBV])).toEqual([
      [0, 10],
      [3, 100],
      [8, 100],
      [1, 40],
    ]);
    expect(
      calculateHeatTrackedWeapons(
        [
          { bv: 100, heat: 6 },
          { bv: 80, heat: 1 },
        ],
        6,
      ).map((r) => r.adjustedBV),
    ).toEqual([100, 40]);
  });
});
