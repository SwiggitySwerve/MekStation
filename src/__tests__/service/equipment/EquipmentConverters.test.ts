/**
 * Regression tests for convertWeapon — the JSON → IWeapon load boundary.
 *
 * Physical / melee weapons (hatchet, sword, claws, …) ship in physical.json
 * with NO `ranges` block. convertWeapon used to do an unconditional
 * `ranges: raw.ranges`, producing an IWeapon whose `ranges` was `undefined`
 * while the type still claimed it was always present. That lying object
 * crashed every unguarded `.ranges` consumer (e.g. EquipmentRow.formatRange).
 *
 * These tests lock the boundary: a rangeless raw weapon must yield an IWeapon
 * with NO `ranges` key, and a ranged raw weapon must pass `ranges` through.
 */

import {
  convertWeapon,
  type IRawWeaponData,
} from '@/services/equipment/EquipmentConverters';

function makeRawWeapon(
  overrides: Partial<IRawWeaponData> = {},
): IRawWeaponData {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    category: 'Energy',
    subType: 'Laser',
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    damage: 5,
    heat: 3,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
    ...overrides,
  };
}

describe('convertWeapon — ranges boundary', () => {
  it('passes ranges through for a ranged weapon', () => {
    const weapon = convertWeapon(makeRawWeapon());
    expect(weapon.ranges).toEqual({ minimum: 0, short: 3, medium: 6, long: 9 });
  });

  it('omits the ranges key entirely for a rangeless physical weapon', () => {
    const { ranges: _omit, ...rawNoRanges } = makeRawWeapon({
      id: 'hatchet',
      name: 'Hatchet',
      category: 'Physical',
    });

    const weapon = convertWeapon(rawNoRanges);

    // The field must be absent, not set to `undefined` — the object shape
    // stays honest with the now-optional IWeapon.ranges type.
    expect(weapon.ranges).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(weapon, 'ranges')).toBe(false);
  });

  it('treats an explicit ranges:undefined the same as omitted', () => {
    const weapon = convertWeapon(
      makeRawWeapon({ id: 'sword', name: 'Sword', ranges: undefined }),
    );
    expect(weapon.ranges).toBeUndefined();
  });
});
