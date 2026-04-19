/**
 * Infantry damage-divisor table tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Damage Divisor
 */

import {
  classifyInfantryWeaponCategory,
  computeEffectiveInfantryDamage,
  infantryDamageMultiplier,
} from '../damageDivisor';

describe('infantryDamageMultiplier', () => {
  it('flamer ×2', () => {
    expect(infantryDamageMultiplier('flamer')).toBe(2);
  });

  it('machine gun ×2', () => {
    expect(infantryDamageMultiplier('mg')).toBe(2);
  });

  it('burst fire ×1.5', () => {
    expect(infantryDamageMultiplier('burst_fire')).toBe(1.5);
  });

  it('inferno ×2', () => {
    expect(infantryDamageMultiplier('inferno')).toBe(2);
  });

  it('explosion ×2', () => {
    expect(infantryDamageMultiplier('explosion')).toBe(2);
  });

  it('ballistic ×1', () => {
    expect(infantryDamageMultiplier('ballistic')).toBe(1);
  });

  it('energy ×1', () => {
    expect(infantryDamageMultiplier('energy')).toBe(1);
  });

  it('missile ×1', () => {
    expect(infantryDamageMultiplier('missile')).toBe(1);
  });

  it('other ×1', () => {
    expect(infantryDamageMultiplier('other')).toBe(1);
  });
});

describe('computeEffectiveInfantryDamage', () => {
  it('Flamer: 2 raw × 2 = 4 effective', () => {
    expect(computeEffectiveInfantryDamage(2, 'flamer')).toBe(4);
  });

  it('MG: 2 raw × 2 = 4 effective', () => {
    expect(computeEffectiveInfantryDamage(2, 'mg')).toBe(4);
  });

  it('PPC: 10 raw × 1 = 10 effective (baseline)', () => {
    expect(computeEffectiveInfantryDamage(10, 'energy')).toBe(10);
  });

  it('raw ≤ 0 short-circuits to 0', () => {
    expect(computeEffectiveInfantryDamage(0, 'flamer')).toBe(0);
    expect(computeEffectiveInfantryDamage(-5, 'flamer')).toBe(0);
  });
});

describe('classifyInfantryWeaponCategory', () => {
  it('inferno keyword resolves to inferno (not missile)', () => {
    expect(classifyInfantryWeaponCategory('SRM-4 Inferno')).toBe('inferno');
  });

  it('flamer resolves to flamer', () => {
    expect(classifyInfantryWeaponCategory('Vehicle Flamer')).toBe('flamer');
  });

  it('machine gun resolves to mg', () => {
    expect(classifyInfantryWeaponCategory('Light Machine Gun')).toBe('mg');
    expect(classifyInfantryWeaponCategory('machinegun')).toBe('mg');
    expect(classifyInfantryWeaponCategory('MG')).toBe('mg');
  });

  it('autocannon resolves to ballistic', () => {
    expect(classifyInfantryWeaponCategory('AC/5')).toBe('ballistic');
    expect(classifyInfantryWeaponCategory('Ultra AC/10')).toBe('ballistic');
    expect(classifyInfantryWeaponCategory('Gauss Rifle')).toBe('ballistic');
  });

  it('laser / PPC / plasma resolves to energy', () => {
    expect(classifyInfantryWeaponCategory('Medium Laser')).toBe('energy');
    expect(classifyInfantryWeaponCategory('PPC')).toBe('energy');
    expect(classifyInfantryWeaponCategory('Plasma Cannon')).toBe('energy');
  });

  it('LRM / SRM / streak resolves to missile', () => {
    expect(classifyInfantryWeaponCategory('LRM-10')).toBe('missile');
    expect(classifyInfantryWeaponCategory('SRM-6')).toBe('missile');
    expect(classifyInfantryWeaponCategory('Streak SRM-4')).toBe('missile');
  });

  it('unknown weapons resolve to other', () => {
    expect(classifyInfantryWeaponCategory('Magic Sword')).toBe('other');
  });
});
