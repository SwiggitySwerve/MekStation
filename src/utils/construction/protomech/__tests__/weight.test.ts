/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';

import { getCatalogHeatNeutralWeaponHeat } from '../../vehicle/supportPayload';
import { computeProtoWeight, getProtoMinimumWeight } from '../weight';

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

describe('native ProtoMech weight accounting', () => {
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
    ).toBe(5.6);
  });

  it('retains a known lower bound with an unsupported mount', () => {
    const equipment = [
      { equipmentId: 'not-in-catalog', location: L.TORSO },
      { equipmentId: 'ProtoMagneticClamp', location: L.TORSO },
    ];
    expect(getProtoMinimumWeight({ ...base, equipment })).toBe(1.4);
  });

  it.each([
    ['CLStreakSRM5', 3.65, 3.65],
    ['CLLRM10', 3.15, 3.15],
    ['CLERMediumLaser', 3.4, 3.4],
    ['CLMediumChemicalLaser', 2.15, 2.15],
    ['ProtoMechJumpJet', 1.2, 1.2],
    ['CLMyomerBooster', 1.275, 1.275],
    ['ProtoQuadMeleeSystem', 2.15, 2.15],
    ['ExtendedJumpJetSystem', 1.25, 1.25],
    ['ProtoMagneticClamp', 1.4, 1.4],
    ['Clan Ammo SRM-2 (10)', 1.35, 1.35],
  ])(
    'uses the same known contributions for %s',
    (equipmentId, minimum, total) => {
      const unit = {
        ...base,
        equipment: [{ equipmentId, location: L.TORSO }],
      };
      expect(getProtoMinimumWeight(unit)).toBe(minimum);
      expect(computeProtoWeight(unit)).toEqual({ total, missingEquipment: [] });
    },
  );

  it.each(['not-in-catalog'])(
    'preserves unavailable complete mass for %s',
    (equipmentId) => {
      const unit = { ...base, equipment: [{ equipmentId, location: L.TORSO }] };
      expect(getProtoMinimumWeight(unit)).toBe(1.15);
      expect(computeProtoWeight(unit)).toEqual({
        total: null,
        missingEquipment: [equipmentId],
      });
    },
  );

  it.each([
    ['Medium Chemical Laser', 'Energy', ['Requires ammo'], 0],
    ['ER Medium Laser', 'Energy', [], 5],
    ['Plasma Cannon', 'Energy', ['Requires ammo'], 5],
    ['Missile launcher', 'Missile', [], 0],
  ])(
    'preserves the extracted catalog heat adapter for %s',
    (name, category, special, heat) => {
      expect(
        getCatalogHeatNeutralWeaponHeat({
          id: 'heat-adapter-probe',
          name,
          category,
          special,
          heat: 5,
          battleValue: 0,
          techBase: 'Clan',
        }),
      ).toBe(heat);
    },
  );
});
