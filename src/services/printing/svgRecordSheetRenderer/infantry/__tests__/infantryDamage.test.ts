/**
 * Tests for the infantry damage-per-trooper formula module.
 *
 * Verifies the verbatim reproduction of MegaMek
 * `Infantry.getDamagePerTrooper()` — including the 0.6 primary-weapon
 * damage cap — and the `DAMAGE+j` row generator.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry Damage-Per-Trooper Formula)
 */

import {
  INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP,
  generateDamageRow,
  getDamagePerTrooper,
  isPrimaryWeaponDamageCapped,
} from '../infantryDamage';

describe('getDamagePerTrooper', () => {
  it('returns 0 when there is no primary weapon (Java null guard)', () => {
    expect(
      getDamagePerTrooper({
        primaryWeaponDamage: undefined,
        squadSize: 7,
        secondaryWeaponsPerSquad: 0,
      }),
    ).toBe(0);
  });

  it('returns 0 when squadSize is zero (defensive divide-by-zero guard)', () => {
    expect(
      getDamagePerTrooper({
        primaryWeaponDamage: 0.28,
        squadSize: 0,
        secondaryWeaponsPerSquad: 0,
      }),
    ).toBe(0);
  });

  it('reproduces the MegaMek formula for a primary-only squad', () => {
    // adjusted = min(0.6, 0.28) = 0.28
    // damage   = 0.28 * (7 - 0) = 1.96
    // perTrooper = 1.96 / 7 = 0.28
    const result = getDamagePerTrooper({
      primaryWeaponDamage: 0.28,
      squadSize: 7,
      secondaryWeaponsPerSquad: 0,
    });
    expect(result).toBeCloseTo(0.28, 10);
  });

  it('adds the uncapped secondary-weapon contribution', () => {
    // adjusted = min(0.6, 0.28) = 0.28
    // damage   = 0.28 * (7 - 2) = 1.4
    // damage  += 0.57 * 2 = 1.14  ->  damage = 2.54
    // perTrooper = 2.54 / 7
    const result = getDamagePerTrooper({
      primaryWeaponDamage: 0.28,
      secondaryWeaponDamage: 0.57,
      squadSize: 7,
      secondaryWeaponsPerSquad: 2,
    });
    expect(result).toBeCloseTo(2.54 / 7, 10);
  });

  it('caps the primary weapon contribution at 0.6 (09/2021 errata)', () => {
    // primary damage 1.58 exceeds the 0.6 cap.
    // capped:   adjusted = min(0.6, 1.58) = 0.6
    //           damage = 0.6 * (7 - 0) = 4.2 -> perTrooper = 0.6
    const capped = getDamagePerTrooper({
      primaryWeaponDamage: 1.58,
      squadSize: 7,
      secondaryWeaponsPerSquad: 0,
    });
    expect(capped).toBeCloseTo(0.6, 10);

    // uncapped (hypothetical) would be 1.58 — prove the cap actually bites.
    const uncappedHypothetical = (1.58 * 7) / 7;
    expect(capped).toBeLessThan(uncappedHypothetical);
  });

  it('does NOT cap the secondary weapon contribution', () => {
    // secondary damage 1.58 is above 0.6 but is NOT capped.
    // damage = min(0.6, 0.28) * (7 - 3) + 1.58 * 3
    //        = 0.28 * 4 + 4.74 = 1.12 + 4.74 = 5.86
    const result = getDamagePerTrooper({
      primaryWeaponDamage: 0.28,
      secondaryWeaponDamage: 1.58,
      squadSize: 7,
      secondaryWeaponsPerSquad: 3,
    });
    expect(result).toBeCloseTo(5.86 / 7, 10);
  });

  it('uses 0.6 as the cap constant', () => {
    expect(INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP).toBe(0.6);
  });
});

describe('isPrimaryWeaponDamageCapped', () => {
  it('is true when primary damage exceeds 0.6', () => {
    expect(isPrimaryWeaponDamageCapped(1.58)).toBe(true);
    expect(isPrimaryWeaponDamageCapped(0.84)).toBe(true);
  });

  it('is false when primary damage is at or below 0.6', () => {
    expect(isPrimaryWeaponDamageCapped(0.6)).toBe(false);
    expect(isPrimaryWeaponDamageCapped(0.28)).toBe(false);
    expect(isPrimaryWeaponDamageCapped(undefined)).toBe(false);
  });
});

describe('generateDamageRow', () => {
  it('emits exactly 30 values', () => {
    expect(generateDamageRow(0.28)).toHaveLength(30);
  });

  it('computes DAMAGE+j = round(perTrooper * j)', () => {
    const row = generateDamageRow(0.28);
    // j=1 -> round(0.28 * 1) = 0
    expect(row[0]).toBe(0);
    // j=30 -> round(0.28 * 30) = round(8.4) = 8
    expect(row[29]).toBe(8);
    // spot-check a mid value: j=10 -> round(2.8) = 3
    expect(row[9]).toBe(3);
  });

  it('rounds half-up consistently with Java Math.round', () => {
    // perTrooper 0.5 -> j=1 gives round(0.5) = 1 (half-up)
    const row = generateDamageRow(0.5);
    expect(row[0]).toBe(1);
    // j=3 -> round(1.5) = 2
    expect(row[2]).toBe(2);
  });

  it('handles a zero per-trooper damage (all-zero row)', () => {
    const row = generateDamageRow(0);
    expect(row.every((v) => v === 0)).toBe(true);
  });
});
