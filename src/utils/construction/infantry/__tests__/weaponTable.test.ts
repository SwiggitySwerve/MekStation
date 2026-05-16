/**
 * Tests for the infantry weapon table — `infantryDamage` coverage.
 *
 * Asserts every weapon entry carries a usable canonical per-trooper
 * damage value, the data input the record-sheet damage-per-trooper
 * formula consumes.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/infantry-unit-system/spec.md
 *   (Requirement: Primary Weapon Types — infantryDamage field)
 */

import { INFANTRY_WEAPON_TABLE } from '../weaponTable';

describe('INFANTRY_WEAPON_TABLE infantryDamage', () => {
  it('every weapon entry has a defined infantryDamage value', () => {
    for (const weapon of INFANTRY_WEAPON_TABLE) {
      expect(weapon.infantryDamage).toBeDefined();
      expect(typeof weapon.infantryDamage).toBe('number');
    }
  });

  it('every infantryDamage value is non-negative', () => {
    for (const weapon of INFANTRY_WEAPON_TABLE) {
      expect(weapon.infantryDamage).toBeGreaterThanOrEqual(0);
    }
  });

  it('infantryDamage is distinct from damageDivisor', () => {
    // The two fields measure different quantities — confirm the table
    // does not accidentally alias one onto the other.
    const aliased = INFANTRY_WEAPON_TABLE.filter(
      (w) => w.infantryDamage === w.damageDivisor,
    );
    expect(aliased).toHaveLength(0);
  });

  it('covers all 12 catalogued weapons', () => {
    expect(INFANTRY_WEAPON_TABLE).toHaveLength(12);
  });
});
