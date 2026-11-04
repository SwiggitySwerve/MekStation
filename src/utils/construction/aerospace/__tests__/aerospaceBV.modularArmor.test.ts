import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceDefensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

const input = (
  modularId: string | null = 'ismodulararmor',
): IAerospaceBVInput => ({
  subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
  techBase: 'INNER_SPHERE',
  sourceTechType: 'IS Level 4',
  year: 3073,
  tonnage: 35,
  structuralIntegrity: 6,
  safeThrust: 6,
  maxThrust: 9,
  heatCapacity: 12,
  armorType: 'stealth',
  totalArmorPoints: 32,
  equipment: [
    ...['isersmalllaser', 'ismml3', 'ismml3'].map((id) => ({
      id,
      location: Arc.NOSE,
    })),
    ...(modularId
      ? [Arc.NOSE, Arc.LEFT_WING, Arc.RIGHT_WING, Arc.AFT].map((location) => ({
          id: modularId,
          location,
        }))
      : []),
    ...['is-vehicular-stealth', 'isguardianecmsuite'].map((id) => ({
      id,
      location: Arc.AFT,
    })),
    ...['is-ammo-mml-3-lrm', 'is-ammo-mml-3-srm'].map((id) => ({
      id,
      location: Arc.FUSELAGE,
    })),
  ],
});

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// MiscType.java:2524-2543; BVCalculator.java:385-408,425-436.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985:
// convfighter/XTRs/Boondocks/Drake Medium Strike Fighter.blk.
it.each(['ismodulararmor', 'ismodulararmor:omni'])(
  'matches Drake with %s capacity before aircraft scaling',
  (id) => {
    const result = calculateAerospaceBV(input(id));
    expect(result.armorBV).toBe(180);
    expect(result.final).toBe(437);
  },
);

it('applies support BAR after modular points join the armor pool', () => {
  const result = calculateAerospaceDefensiveBV({
    ...input(),
    isSupportVehicle: true,
    barRating: 5,
    armorType: 'standard',
    totalArmorPoints: 0,
    structuralIntegrity: 0,
    equipment: [{ id: 'ismodulararmor', location: Arc.NOSE }],
  });
  expect(result.armorBV).toBe(12.5);
  expect(result.defensive).toBe(12.5);
});

it('preserves the same aircraft without modular mounts', () => {
  expect(calculateAerospaceBV(input(null)).final).toBe(297);
});
