import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceOffensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

const input = (
  ids: string[],
  overrides: Partial<IAerospaceBVInput> = {},
): IAerospaceBVInput => ({
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 2',
  year: 3098,
  tonnage: 40,
  structuralIntegrity: 10,
  safeThrust: 10,
  maxThrust: 15,
  heatCapacity: 20,
  armorType: 'heavy-ferro-aluminum',
  totalArmorPoints: 228,
  equipment: ids.map((id) => ({ id, location: Arc.NOSE })),
  ...overrides,
});
const pool = (value: IAerospaceBVInput) =>
  calculateAerospaceOffensiveBV(value).weaponFirePoolBV;

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// MiscType.java:1322-1347; MekFileParser.java:90-93,471-497;
// BVCalculator.java:853-882; HeatTrackingBVCalculator.java:211-214.
it.each([
  ['light-ppc', 132],
  ['ppc', 264],
  ['heavy-ppc', 370],
  ['snub-nose-ppc', 252],
  ['er-ppc', 343],
  ['clan-er-ppc', 548],
])('values a linked %s by its native PPC type', (id, expected) => {
  expect(
    pool(
      input([String(id), 'ppc-capacitor'], {
        year: 3140,
        heatCapacity: undefined,
      }),
    ),
  ).toBe(expected);
});

// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985:
// fighters/TRO3145/Steiner/Sternensturm STM-OA.blk.
it('matches Sternensturm including the capacitor addition before TC', () => {
  const result = calculateAerospaceBV(
    input(['iserppc:omni', 'ppc-capacitor:omni', 'istargeting-computer:omni']),
  );
  expect(result.weaponFirePoolBV).toBe(428.75);
  expect(result.final).toBe(1692);
});

// Same mm-data pin, fighters/ProtoTypes/Umbra RF-1.blk.
it('matches Umbra with its distinct snub-PPC addition and small cockpit', () => {
  const result = calculateAerospaceBV(
    input(['issnppc', 'ppc-capacitor', 'isermediumlaser', 'isermediumlaser'], {
      sourceTechType: 'IS Level 3',
      year: 3082,
      tonnage: 30,
      armorType: 'ferro-aluminum',
      totalArmorPoints: 143,
      hasSmallCockpit: true,
    }),
  );
  expect(result.weaponFirePoolBV).toBe(376);
  expect(result.final).toBe(1250);
});

it('links the first same-location PPC once and never counts an unlinked capacitor', () => {
  expect(
    pool(
      input(['ppc', 'er-ppc', 'ppc-capacitor'], { heatCapacity: undefined }),
    ),
  ).toBe(493);
  expect(pool(input(['ppc', 'ppc-capacitor', 'ppc-capacitor']))).toBe(264);
  expect(
    pool(
      input([], {
        equipment: [
          { id: 'ppc', location: Arc.NOSE },
          { id: 'ppc-capacitor', location: Arc.AFT },
        ],
      }),
    ),
  ).toBe(176);
});

it.each([
  [3100, 412],
  [3101, 548],
])('uses the Clan ER PPC year boundary in %i', (year, expected) => {
  expect(pool(input(['clerppc', 'ppc-capacitor'], { year }))).toBe(expected);
});

it('adds five heat before the aircraft-wide heat cutoff', () => {
  expect(
    pool(input(['ppc', 'ppc-capacitor', 'medium-laser'], { heatCapacity: 9 })),
  ).toBe(287);
});

it('adds capacitor BV after rear weighting', () => {
  expect(
    pool(
      input([], {
        heatCapacity: undefined,
        equipment: [
          { id: 'clerppc', location: Arc.NOSE },
          { id: 'ppc', location: Arc.AFT },
          { id: 'ppc-capacitor', location: Arc.AFT },
        ],
      }),
    ),
  ).toBe(588);
});
