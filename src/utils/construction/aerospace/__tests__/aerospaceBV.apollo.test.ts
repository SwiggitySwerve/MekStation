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
  equipment: IAerospaceBVInput['equipment'],
): IAerospaceBVInput => ({
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 3',
  year: 3078,
  tonnage: 55,
  structuralIntegrity: 7,
  safeThrust: 7,
  maxThrust: 11,
  heatCapacity: 26,
  armorType: 'ferro-aluminum',
  totalArmorPoints: 125,
  equipment,
});
const mounts = (ids: string[], location = Arc.NOSE) =>
  ids.map((id) => ({ id, location }));
const pool = (value: IAerospaceBVInput) =>
  calculateAerospaceOffensiveBV(value).weaponFirePoolBV;

it('links a rear-marked MRM and controller at their physical wing', () => {
  expect(
    pool(
      input([
        { id: 'medium-laser', location: Arc.NOSE },
        { id: 'mrm-10', location: Arc.LEFT_WING, isRearMounted: true },
        { id: 'isapollo', location: Arc.LEFT_WING, isRearMounted: true },
      ]),
    ),
  ).toBeCloseTo(87.4, 8);
});

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// MekFileParser.java:499-528; BVCalculator.java:860-876;
// HeatTrackingBVCalculator.java:81-86,111-145.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985, fighters/TRO3067/IS/Oni ON-2.blk.
it('matches native Oni ON-2 including linked BV before heat', () => {
  const result = calculateAerospaceBV(
    input([
      ...mounts(['mrm-40', 'isapollo']),
      ...mounts(
        Array.from({ length: 3 }, () => 'isermediumlaser'),
        Arc.LEFT_WING,
      ),
      ...mounts(
        Array.from({ length: 3 }, () => 'isermediumlaser'),
        Arc.RIGHT_WING,
      ),
      ...mounts(['isguardianecmsuite'], Arc.AFT),
      ...mounts(['is-mrm-40-ammo', 'is-mrm-40-ammo'], Arc.FUSELAGE),
    ]),
  );
  expect(result.weaponFirePoolBV).toBeCloseTo(567.6, 8);
  expect(result.defensive).toBe(447);
  expect(result.final).toBe(1545);
});

it.each(['isapollo', 'isapollo:omni'])(
  'links %s only to the first eligible MRM once',
  (controller) => {
    expect(pool(input(mounts(['mrm-20', 'mrm-30', controller])))).toBeCloseTo(
      296.8,
      8,
    );
    expect(pool(input(mounts(['mrm-20', controller, controller])))).toBeCloseTo(
      128.8,
      8,
    );
  },
);

it('does not link LRM/SRM or a different physical location', () => {
  expect(pool(input(mounts(['lrm-20', 'isapollo'])))).toBe(181);
  expect(pool(input(mounts(['srm-6', 'isapollo'])))).toBe(59);
  expect(
    pool(input([...mounts(['mrm-20']), ...mounts(['isapollo'], Arc.AFT)])),
  ).toBe(112);
});

it('sorts Apollo-modified MRM BV ahead of a larger unmodified laser', () => {
  expect(
    pool({
      ...input(mounts(['mrm-20', 'isapollo', 'large-laser'])),
      heatCapacity: 0,
    }),
  ).toBeCloseTo(190.3, 8);
});

it('uses linked MRM BV before choosing forward/rear dominance', () => {
  expect(
    pool({
      ...input([
        ...mounts(['iserppc']),
        ...mounts(['mrm-40', 'isapollo'], Arc.AFT),
      ]),
      heatCapacity: undefined,
    }),
  ).toBeCloseTo(372.1, 8);
});
