/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';

import { getProtoMinimumWeight } from '../weight';

const base = {
  weightPerUnit: 5,
  engineRating: 0,
  armorType: 42,
  hasMainGun: false,
  armorByLocation: {
    [L.HEAD]: 3,
    [L.TORSO]: 0,
    [L.LEFT_ARM]: 0,
    [L.RIGHT_ARM]: 0,
    [L.LEGS]: 0,
    [L.MAIN_GUN]: 0,
  },
  equipment: [],
};

describe('minimum-weight extraction preserves existing admission and arithmetic', () => {
  it('includes structure, controls and odd-count Standard armor', () => {
    expect(getProtoMinimumWeight(base)).toBe(1.15);
    expect(getProtoMinimumWeight({ ...base, weightPerUnit: 10 })).toBe(1.9);
  });

  it.each([99])('retains the existing armor guard for %s', (armorType) => {
    expect(getProtoMinimumWeight({ ...base, armorType })).toBeUndefined();
  });

  it('does not invent an engine mass outside the supported table', () => {
    expect(
      getProtoMinimumWeight({ ...base, engineRating: 501 }),
    ).toBeUndefined();
  });

  it('retains native LRM and per-shot ammunition mass and absent-gun exclusion', () => {
    const equipment = [
      { equipmentId: 'CLLRM10', location: L.TORSO },
      { equipmentId: 'Clan Ammo SRM-2 (10)', location: L.TORSO },
      { equipmentId: 'CLERMediumLaser', location: L.MAIN_GUN },
    ];
    expect(getProtoMinimumWeight({ ...base, equipment })).toBe(3.35);
    expect(
      getProtoMinimumWeight({ ...base, equipment, hasMainGun: true }),
    ).toBe(4.35);
  });

  it('retains omission of unknown and variable miscellaneous mass', () => {
    const equipment = [
      { equipmentId: 'not-in-catalog', location: L.TORSO },
      { equipmentId: 'ProtoMagneticClamp', location: L.TORSO },
    ];
    expect(getProtoMinimumWeight({ ...base, equipment })).toBe(1.15);
  });
});
