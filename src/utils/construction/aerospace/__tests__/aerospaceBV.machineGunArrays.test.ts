import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

const mounts = (ids: string[], location = Arc.NOSE) =>
  ids.map((id) => ({ id, location }));
const input = (
  equipment: IAerospaceBVInput['equipment'],
): IAerospaceBVInput => ({
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  techBase: 'CLAN',
  sourceTechType: 'Clan Level 2',
  year: 3071,
  tonnage: 20,
  structuralIntegrity: 13,
  safeThrust: 13,
  maxThrust: 20,
  heatCapacity: 22,
  armorType: 'ferro-aluminum',
  totalArmorPoints: 67,
  equipment,
});
const pool = (equipment: IAerospaceBVInput['equipment']) =>
  calculateAerospaceOffensiveBV({
    ...input(equipment),
    heatCapacity: undefined,
  }).weaponFirePoolBV;

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// MekFileParser.java:928-944; BVCalculator.java:807-816.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985, fighters/TRO3055U/Bashkir E.blk.
it('matches native Bashkir E with derived array BV and separate MGs', () => {
  const lasers = Array.from({ length: 3 }, () => 'clersmalllaser:omni');
  const result = calculateAerospaceBV(
    input([
      ...mounts(['clmg:omni', 'clmg:omni', 'clmg:omni', 'clmga:omni']),
      ...mounts(lasers, Arc.LEFT_WING),
      ...mounts(lasers, Arc.RIGHT_WING),
      ...mounts(['clan-machine-gun-ammo-half:omni', 'clcase'], Arc.FUSELAGE),
    ]),
  );
  expect(result.weaponFirePoolBV).toBeCloseTo(211.05, 8);
  expect(result.final).toBe(867);
});

const arrayCases: [string[], number][] = [
  [['clmg', 'clmg', 'clmg', 'clmg', 'clmg', 'clmga'], 38.4],
  [['clmg', 'clmg', 'clmg', 'clmg', 'clmg', 'clmg', 'clmga', 'clmga'], 50.1],
  [
    ['clheavymg', 'clheavymg', 'clheavymg', 'clan-heavy-machine-gun-array'],
    30.06,
  ],
  [['clan-light-machine-gun', 'clan-light-machine-gun', 'lmga'], 16.7],
];
it.each(arrayCases)(
  'caps groups at four, never reuses guns, and respects caliber: %j',
  (ids, expected) => {
    expect(pool(mounts(ids))).toBeCloseTo(expected, 8);
  },
);

it('does not link a different caliber or physical location', () => {
  expect(pool(mounts(['clmg', 'clheavymg', 'clmga']))).toBeCloseTo(14.35, 8);
  expect(
    pool([...mounts(['clmg', 'clmga']), ...mounts(['clmg'], Arc.LEFT_WING)]),
  ).toBeCloseTo(13.35, 8);
  expect(
    pool(mounts(['clmg', 'clmga', 'clan-machine-gun-ammo-full'])),
  ).toBeCloseTo(9.35, 8);
});

it('does not grant TC to an array', () => {
  expect(
    pool(mounts(['clmg', 'clmg', 'clmg', 'clmga', 'cltargeting-computer'])),
  ).toBeCloseTo(25.05, 8);
});

it('keeps an unmatched zero-base array at zero', () => {
  expect(pool(mounts(['clmga']))).toBe(0);
});
