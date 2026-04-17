/**
 * Regression guards — Weapon Specialist, Sniper, Range Master, Gunnery
 * Specialist SPA modifiers.
 *
 * Bugs #5 and #6 from `fix-combat-rule-accuracy`:
 * - Weapon Specialist originally returned -1 (should be -2 per TechManual).
 * - Sniper originally zeroed the medium-range modifier only; the canonical
 *   rule halves (floor) ALL positive range modifiers.
 *
 * Both fixes are in place; this suite guards against silent re-regression.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/spa-combat-integration/spec.md
 */

import { RangeBracket } from '@/types/gameplay';
import {
  calculateGunnerySpecialistModifier,
  calculateRangeMasterModifier,
  calculateSniperModifier,
  calculateWeaponSpecialistModifier,
} from '@/utils/gameplay/spaModifiers/weaponSpecialists';

describe('Weapon Specialist SPA — regression guard', () => {
  it('returns -2 when SPA is present and weapon type matches', () => {
    const mod = calculateWeaponSpecialistModifier(
      ['weapon_specialist'],
      'PPC',
      'PPC',
    );
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(-2);
    expect(mod?.name).toBe('Weapon Specialist');
  });

  it('matches case-insensitively', () => {
    const mod = calculateWeaponSpecialistModifier(
      ['weapon_specialist'],
      'ppc',
      'PPC',
    );
    expect(mod?.value).toBe(-2);
  });

  it('returns null when weapon type does NOT match designation', () => {
    const mod = calculateWeaponSpecialistModifier(
      ['weapon_specialist'],
      'AC20',
      'PPC',
    );
    expect(mod).toBeNull();
  });

  it('returns null when SPA is absent', () => {
    const mod = calculateWeaponSpecialistModifier([], 'PPC', 'PPC');
    expect(mod).toBeNull();
  });

  it('returns null when weapon type is undefined', () => {
    const mod = calculateWeaponSpecialistModifier(
      ['weapon_specialist'],
      undefined,
      'PPC',
    );
    expect(mod).toBeNull();
  });
});

describe('Sniper SPA — halves positive range modifiers (regression guard)', () => {
  it('short range (modifier 0) returns null (no reduction possible)', () => {
    expect(calculateSniperModifier(['sniper'], 0)).toBeNull();
  });

  it('medium range (modifier +2) returns -1 (halved down)', () => {
    const mod = calculateSniperModifier(['sniper'], 2);
    expect(mod?.value).toBe(-1);
  });

  it('long range (modifier +4) returns -2 (halved)', () => {
    const mod = calculateSniperModifier(['sniper'], 4);
    expect(mod?.value).toBe(-2);
  });

  it('extreme range (modifier +6) returns -3 (halved)', () => {
    const mod = calculateSniperModifier(['sniper'], 6);
    expect(mod?.value).toBe(-3);
  });

  it('odd modifier (+3) uses floor division → -1', () => {
    const mod = calculateSniperModifier(['sniper'], 3);
    expect(mod?.value).toBe(-1);
  });

  it('returns null when SPA is absent', () => {
    expect(calculateSniperModifier([], 4)).toBeNull();
  });

  it('returns null when current range modifier is undefined', () => {
    expect(calculateSniperModifier(['sniper'], undefined)).toBeNull();
  });

  it('returns null when current range modifier is 0 (no reduction)', () => {
    expect(calculateSniperModifier(['sniper'], 0)).toBeNull();
  });

  it('does NOT halve negative modifiers (safety)', () => {
    // Sniper only affects positive range penalties.
    expect(calculateSniperModifier(['sniper'], -1)).toBeNull();
  });
});

describe('Range Master SPA — zeroes one bracket (spot-check)', () => {
  it('zeroes the designated bracket by returning negation of current mod', () => {
    const mod = calculateRangeMasterModifier(
      ['range_master'],
      RangeBracket.Long,
      RangeBracket.Long,
      4,
    );
    expect(mod?.value).toBe(-4);
  });

  it('returns null when bracket does not match designation', () => {
    const mod = calculateRangeMasterModifier(
      ['range_master'],
      RangeBracket.Short,
      RangeBracket.Long,
      4,
    );
    expect(mod).toBeNull();
  });
});

describe('Gunnery Specialist SPA — designated vs non-designated (spot-check)', () => {
  it('designated category returns -1', () => {
    const mod = calculateGunnerySpecialistModifier(
      ['specialist'],
      'energy',
      'energy',
    );
    expect(mod?.value).toBe(-1);
  });

  it('non-designated category returns +1 (penalty)', () => {
    const mod = calculateGunnerySpecialistModifier(
      ['specialist'],
      'ballistic',
      'energy',
    );
    expect(mod?.value).toBe(1);
  });
});
