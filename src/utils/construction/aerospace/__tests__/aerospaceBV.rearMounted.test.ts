import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

const mounts = (ids: string[], location: Arc) =>
  ids.map((id) => ({ id, location }));
const input = (
  equipment: IAerospaceBVInput['equipment'],
): IAerospaceBVInput => ({
  subType: AerospaceSubType.SMALL_CRAFT,
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 2',
  year: 2515,
  tonnage: 200,
  structuralIntegrity: 8,
  safeThrust: 4,
  maxThrust: 6,
  heatCapacity: 32,
  armorType: 'aerospace',
  totalArmorPoints: 608,
  equipment,
});
const pool = (equipment: IAerospaceBVInput['equipment']) =>
  calculateAerospaceOffensiveBV({
    ...input(equipment),
    heatCapacity: undefined,
  }).weaponFirePoolBV;

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587, AeroBVCalculator.java:152-158.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985, smallcraft/TRO 3075/Aquarius Escort.blk.
it('matches native Aquarius Escort with rear-mounted side weapons before heat', () => {
  const side = [
    'lrm-10',
    'is-ammo-lrm-10',
    'srm-6',
    'is-ammo-srm-6',
    'r-medium-laser',
  ];
  const result = calculateAerospaceBV(
    input([
      ...mounts(['large-laser', 'large-laser'], Arc.NOSE),
      ...mounts(side, Arc.LEFT_SIDE),
      ...mounts(side, Arc.RIGHT_SIDE),
      ...mounts(['medium-laser', 'medium-laser'], Arc.AFT),
    ]),
  );
  expect(result.weaponFirePoolBV).toBe(649);
  expect(result.final).toBe(2233);
});

it.each([
  ['r-medium-laser', 199],
  ['medium-laser', 222],
])('uses the native rear marker on %s', (id, expected) => {
  expect(
    pool([
      ...mounts(['ppc'], Arc.NOSE),
      ...mounts([String(id)], Arc.LEFT_SIDE),
    ]),
  ).toBe(expected);
});

it('retains the physical side for controller linking while firing to the rear', () => {
  expect(
    pool([
      ...mounts(['medium-laser'], Arc.NOSE),
      ...mounts(['r-lrm-10', 'artemisiv'], Arc.LEFT_SIDE),
    ]),
  ).toBe(131);
});

it.each([
  ['medium-laser', true, 199],
  ['r-medium-laser', false, 222],
] as const)(
  'retains the explicit editor flag on %s: %s',
  (id, isRearMounted, expected) => {
    expect(
      pool([
        ...mounts(['ppc'], Arc.NOSE),
        { id, location: Arc.LEFT_SIDE, isRearMounted },
      ]),
    ).toBe(expected);
  },
);
