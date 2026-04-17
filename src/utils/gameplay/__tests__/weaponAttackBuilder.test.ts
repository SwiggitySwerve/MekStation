/**
 * Tests for weaponAttackBuilder — ensures producers can no longer silently
 * default to Medium-Laser stats when weapon data is missing, and that real
 * weapon values flow through end-to-end.
 *
 * @spec openspec/changes/wire-real-weapon-data/proposal.md
 */

import type { IWeapon } from '@/simulation/ai/types';

import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  buildWeaponAttack,
  buildWeaponAttacks,
} from '@/utils/gameplay/weaponAttackBuilder';
import { logger } from '@/utils/logger';

const mediumLaser: IWeapon = {
  id: 'ml-1',
  name: 'Medium Laser',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 5,
  heat: 3,
  minRange: 0,
  ammoPerTon: -1,
  destroyed: false,
};

const ac20: IWeapon = {
  id: 'ac20-1',
  name: 'AC/20',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 20,
  heat: 7,
  minRange: 0,
  ammoPerTon: 5,
  destroyed: false,
};

const lrm10: IWeapon = {
  id: 'lrm10-1',
  name: 'LRM 10',
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
  damage: 10,
  heat: 4,
  minRange: 6,
  ammoPerTon: 12,
  destroyed: false,
};

describe('buildWeaponAttack', () => {
  it('returns real weapon stats when the weapon is found', () => {
    const result = buildWeaponAttack('ml-1', [mediumLaser]);
    expect(result).not.toBeNull();
    expect(result?.damage).toBe(5);
    expect(result?.heat).toBe(3);
    expect(result?.shortRange).toBe(3);
    expect(result?.mediumRange).toBe(6);
    expect(result?.longRange).toBe(9);
    expect(result?.weaponId).toBe('ml-1');
    expect(result?.weaponName).toBe('Medium Laser');
  });

  it('returns AC/20 real damage + heat (no more ?? 5 / ?? 3 fallback)', () => {
    const result = buildWeaponAttack('ac20-1', [ac20]);
    expect(result?.damage).toBe(20);
    expect(result?.heat).toBe(7);
  });

  it('returns null + warns when the weapon id is not on the unit', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    const result = buildWeaponAttack('nonexistent', [mediumLaser], 'unit-1');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Weapon "nonexistent" not found'),
    );
    warnSpy.mockRestore();
  });

  it('returns null + warns when the weapon is destroyed', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    const destroyed = { ...mediumLaser, destroyed: true };
    const result = buildWeaponAttack('ml-1', [destroyed], 'unit-1');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('is destroyed'),
    );
    warnSpy.mockRestore();
  });

  it('infers ENERGY category for energy weapons (ammoPerTon = -1)', () => {
    expect(buildWeaponAttack('ml-1', [mediumLaser])?.category).toBe(
      WeaponCategory.ENERGY,
    );
  });

  it('infers BALLISTIC category for autocannons', () => {
    expect(buildWeaponAttack('ac20-1', [ac20])?.category).toBe(
      WeaponCategory.BALLISTIC,
    );
  });

  it('infers MISSILE category for LRM/SRM', () => {
    expect(buildWeaponAttack('lrm10-1', [lrm10])?.category).toBe(
      WeaponCategory.MISSILE,
    );
  });
});

describe('buildWeaponAttacks', () => {
  it('builds all attacks for valid weapon ids in order', () => {
    const results = buildWeaponAttacks(['ml-1', 'ac20-1'], [mediumLaser, ac20]);
    expect(results).toHaveLength(2);
    expect(results[0].weaponId).toBe('ml-1');
    expect(results[1].weaponId).toBe('ac20-1');
  });

  it('filters out weapons that cannot be resolved', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    const results = buildWeaponAttacks(
      ['ml-1', 'bogus', 'ac20-1'],
      [mediumLaser, ac20],
    );
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.weaponId)).toEqual(['ml-1', 'ac20-1']);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('preserves real damage + heat for every resolved weapon', () => {
    // Per wire-real-weapon-data smoke test: 1 PPC + 2 Medium Lasers.
    // damage should be [10, 5, 5], NOT [5, 5, 5]; heat should be [10, 3, 3].
    const ppc: IWeapon = {
      id: 'ppc-1',
      name: 'PPC',
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
      damage: 10,
      heat: 10,
      minRange: 3,
      ammoPerTon: -1,
      destroyed: false,
    };
    const ml2: IWeapon = { ...mediumLaser, id: 'ml-2' };
    const results = buildWeaponAttacks(
      ['ppc-1', 'ml-1', 'ml-2'],
      [ppc, mediumLaser, ml2],
    );
    expect(results.map((r) => r.damage)).toEqual([10, 5, 5]);
    expect(results.map((r) => r.heat)).toEqual([10, 3, 3]);
    const totalHeat = results.reduce((sum, r) => sum + r.heat, 0);
    expect(totalHeat).toBe(16); // was 3*3=9 under the old weapons.length*3 bug
  });
});
