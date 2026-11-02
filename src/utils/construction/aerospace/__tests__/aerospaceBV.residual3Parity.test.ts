import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import { calculateAerospaceBV, type IAerospaceBVInput } from '../aerospaceBV';

const input = (
  equipment: readonly (readonly [string, string])[],
  heatCapacity?: number,
): IAerospaceBVInput => ({
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  tonnage: 50,
  structuralIntegrity: 5,
  safeThrust: 5,
  maxThrust: 8,
  armorType: 'standard',
  totalArmorPoints: 0,
  heatCapacity,
  equipment: equipment.map(([id, location]) => ({ id, location })),
  explosivePenalties: 0,
});
// MekFileParser.java:425-449; BVCalculator.java:860-872 (MegaMek 48fcb2f64).
const CASES = [
  [
    'Ogotai A',
    12,
    [
      ['clmediumpulselaser:omni', 'Nose'],
      ['clsrm6:omni', 'Nose'],
      ['clartemisiv:omni', 'Nose'],
      ['clmediumpulselaser:omni', 'Left Wing'],
      ['clsrm6:omni', 'Left Wing'],
      ['clartemisiv:omni', 'Left Wing'],
      ['clmediumpulselaser:omni', 'Right Wing'],
      ['clsrm6:omni', 'Right Wing'],
      ['clartemisiv:omni', 'Right Wing'],
      ['clcase', 'Fuselage'],
    ],
    510.0,
  ],
  [
    'Tyre 3',
    44,
    [
      ['cllrm20', 'Nose'],
      ['clartemisv', 'Nose'],
      ['clermediumlaser', 'Nose'],
      ['clermediumlaser', 'Nose'],
      ['climprovedheavylargelaser', 'Left Wing'],
      ['clcase', 'Left Wing'],
      ['climprovedheavylargelaser', 'Right Wing'],
      ['clcase', 'Right Wing'],
      ['cllaserantimissilesystem', 'Aft'],
      ['clcase', 'Fuselage'],
    ],
    1094.0,
  ],
] as const;
it.each(CASES)(
  '%s matches its pinned native weapon pool',
  (name, capacity, equipment, bv) => {
    const result = calculateAerospaceBV(input(equipment, capacity));
    expect(result.weaponFirePoolBV + result.fuselageWeaponBV).toBeCloseTo(
      bv,
      9,
    );
  },
);
it('links in source order without adjacency, across only the same physical location', () => {
  const result = calculateAerospaceBV(
    input([
      ['isartemisv', 'Nose'],
      ['isartemisiv', 'Nose'],
      ['isartemisv', 'Nose'],
      ['isartemisiv', 'Left Wing'],
      ['lrm-20', 'Nose'],
      ['lrm-20', 'Nose'],
      ['lrm-20', 'Aft'],
      ['streak-srm-2', 'Nose'],
      ['is-ammo-lrm-10', 'Fuselage'],
      ['isartemisv', 'Fuselage'],
    ]),
  );
  expect(result.arcContributions.find((a) => a.arc === 'Nose')?.rawBV).toBe(
    482.5,
  );
  expect(result.weaponFirePoolBV).toBe(573);
  expect(result.fuselageWeaponBV).toBe(11);
});
it('applies linked BV before heat sorting and leaves Streak incompatible', () => {
  const result = calculateAerospaceBV(
    input(
      [
        ['clsrm6', 'Nose'],
        ['clsrm6', 'Nose'],
        ['isermediumlaser', 'Nose'],
        ['clartemisiv', 'Nose'],
        ['clartemisiv', 'Nose'],
        ['clartemisv', 'Nose'],
      ],
      0,
    ),
  );
  expect(result.weaponFirePoolBV).toBeCloseTo(172.6, 9);
});
